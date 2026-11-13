<?php
declare(strict_types=1);

/**
 * Zero-PII File-based IP Rate Limiter & 15-Min Penalty Box (OWASP ASVS / RODO).
 *
 * Gwarancje bezpieczeństwa:
 * 1. Zero-PII na dysku: adres IP nigdy nie jest zapisywany w nazwie pliku ani w treści JSON.
 *    Kluczem jest wyłącznie nieskorelowany skrót `hash_hmac('sha256', $ip . '|' . $action, $salt)`.
 * 2. 15-Minutowy IP Penalty Box: wywołanie `ban_client_ip($action, 900)` blokuje IP na 15 minut
 *    po wykryciu ataku WAF L7 (XSS, SQLi, Path Traversal, Prompt Injection) lub Honeypot.
 * 3. Atomowość I/O: wszystkie odczyty i zapisy używają wyłącznej blokady `flock($fp, LOCK_EX)`.
 */

const RATE_LIMIT_PENALTY_SECONDS = 900; // 15 minut

foreach (['phar', 'ftp', 'ftps', 'expect'] as $__tswWrapper) {
    if (in_array($__tswWrapper, stream_get_wrappers(), true)) {
        @stream_wrapper_unregister($__tswWrapper);
    }
}
unset($__tswWrapper);

/**
 * Zwraca adres IP klienta z uwzględnieniem nagłówka Cloudflare Zero Trust / Proxy.
 */
function get_client_ip(): string
{
    $candidates = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? null,
        $_SERVER['REMOTE_ADDR'] ?? null,
    ];

    foreach ($candidates as $ip) {
        if (is_string($ip) && $ip !== '') {
            $clean = trim(explode(',', $ip)[0]);
            if (filter_var($clean, FILTER_VALIDATE_IP)) {
                return $clean;
            }
        }
    }

    return '0.0.0.0';
}

/**
 * Alias dla kompatybilności wstecznej.
 */
function resolve_client_ip(): string
{
    return get_client_ip();
}

/**
 * Maskuje ostatni oktet IPv4 lub końcówkę IPv6 (zgodność z RODO w logach pamięciowych).
 */
function mask_ip(string $ip): string
{
    if (str_contains($ip, ':')) {
        $parts = explode(':', $ip);
        return implode(':', array_slice($parts, 0, 3)) . '::xxxx';
    }
    $parts = explode('.', $ip);
    if (count($parts) === 4) {
        return "{$parts[0]}.{$parts[1]}.{$parts[2]}.xxx";
    }
    return '0.0.0.0';
}

/**
 * Wylicza deterministyczny skrót Zero-PII SHA-256 z solą dla pary (akcja, IP).
 */
function compute_zero_pii_ip_hash(string $action, ?string $ip = null): string
{
    $clientIp = $ip ?? get_client_ip();
    $envSalt = getenv('RATE_LIMIT_SALT');
    $salt = (is_string($envSalt) && strlen($envSalt) >= 16)
        ? $envSalt
        : hash('sha256', __DIR__ . '|tsw-zero-pii-rate-limit-salt-v2');

    return hash_hmac('sha256', $action . '|' . $clientIp, $salt);
}

/**
 * Zwraca ścieżkę do pliku licznika Rate Limit dla danej akcji i skrótu IP.
 */
function resolve_rate_limit_file(string $action, ?string $ip = null, ?string $storageDir = null): string
{
    $dir = $storageDir ?? (getenv('TSW_RATE_LIMIT_DIR') ?: (sys_get_temp_dir() . '/tsw_ratelimits'));
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $action = preg_replace('/[^a-zA-Z0-9_-]/', '', $action) ?: 'default';
    $digest = compute_zero_pii_ip_hash($action, $ip);

    return rtrim($dir, '/\\') . '/rate_' . $action . '_' . $digest . '.json';
}

/**
 * Sprawdza, czy dany adres IP znajduje się obecnie w 15-minutowym Penalty Boxie.
 */
function is_ip_banned_in_penalty_box(string $action = 'contact', ?string $storageDir = null, ?string $ip = null): bool
{
    $file = resolve_rate_limit_file($action, $ip, $storageDir);
    if (!is_file($file)) {
        return false;
    }

    $fp = @fopen($file, 'rb');
    if ($fp === false) {
        return false;
    }

    $banned = false;
    if (@flock($fp, LOCK_SH)) {
        $raw = (string)stream_get_contents($fp);
        $decoded = json_decode($raw, true, 16);
        if (is_array($decoded)) {
            $bannedUntil = (int)($decoded['banned_until'] ?? 0);
            if ($bannedUntil > time()) {
                $banned = true;
            }
        }
        @flock($fp, LOCK_UN);
    }
    @fclose($fp);

    return $banned;
}

/**
 * Alias dla kompatybilności z api/contact.php oraz testami jednostkowymi.
 */
function is_client_ip_banned(string $action = 'contact', ?string $ip = null): bool
{
    return is_ip_banned_in_penalty_box($action, null, $ip);
}

/**
 * Nakłada natychmiastową blokadę IP (domyślnie 15 minut = 900s) w Penalty Boxie.
 * Zero-PII: w pliku zapisywane są wyłącznie znaczniki czasu i licznik naruszeń.
 */
function ban_client_ip(string $action = 'contact', int $banSeconds = RATE_LIMIT_PENALTY_SECONDS, ?string $storageDir = null, ?string $ip = null): void
{
    $file = resolve_rate_limit_file($action, $ip, $storageDir);
    $now = time();
    $banUntil = $now + max(60, $banSeconds);

    $fp = @fopen($file, 'c+b');
    if ($fp === false) {
        return;
    }

    if (@flock($fp, LOCK_EX)) {
        $raw = (string)stream_get_contents($fp);
        $decoded = json_decode($raw, true, 16);
        $hits = (is_array($decoded) && isset($decoded['hits']) && is_array($decoded['hits']))
            ? array_values(array_filter($decoded['hits'], static fn($ts): bool => is_int($ts) && ($now - $ts) < 3600))
            : [];
        $violations = (is_array($decoded) && isset($decoded['violations']) && is_int($decoded['violations']))
            ? $decoded['violations'] + 1
            : 1;

        $payload = [
            'banned_until' => $banUntil,
            'violations'   => $violations,
            'hits'         => $hits,
            'updated_at'   => $now,
        ];

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, (string)json_encode($payload));
        fflush($fp);
        @flock($fp, LOCK_UN);
    }
    @fclose($fp);
}

/**
 * Sprawdza i inkrementuje licznik zapytań w oknie czasowym.
 * Jeśli przekroczono limit `$maxRequests` w `$windowSeconds`, automatycznie nakłada
 * 15-minutowy ban w Penalty Boxie (`RATE_LIMIT_PENALTY_SECONDS`).
 */
function check_rate_limit(
    string $action,
    int $maxRequests = 5,
    int $windowSeconds = 60,
    ?string $storageDir = null,
    ?string $ip = null
): bool {
    $file = resolve_rate_limit_file($action, $ip, $storageDir);
    $now = time();

    $fp = @fopen($file, 'c+b');
    if ($fp === false) {
        return true; // Fail-open w przypadku braku uprawnień do katalogu tymczasowego
    }

    $allowed = true;

    if (@flock($fp, LOCK_EX)) {
        $raw = (string)stream_get_contents($fp);
        $decoded = json_decode($raw, true, 16);

        $bannedUntil = is_array($decoded) ? (int)($decoded['banned_until'] ?? 0) : 0;
        $violations = is_array($decoded) ? (int)($decoded['violations'] ?? 0) : 0;

        if ($bannedUntil > $now) {
            @flock($fp, LOCK_UN);
            @fclose($fp);
            return false;
        }

        $hits = [];
        if (is_array($decoded) && isset($decoded['hits']) && is_array($decoded['hits'])) {
            $hits = array_values(array_filter(
                $decoded['hits'],
                static fn($ts): bool => is_int($ts) && ($now - $ts) < $windowSeconds
            ));
        } elseif (is_array($decoded)) {
            $hits = array_values(array_filter(
                $decoded,
                static fn($ts): bool => is_int($ts) && ($now - $ts) < $windowSeconds
            ));
        }

        if (count($hits) >= $maxRequests) {
            $allowed = false;
            $bannedUntil = $now + RATE_LIMIT_PENALTY_SECONDS;
            $violations++;
        } else {
            $hits[] = $now;
            $bannedUntil = 0;
        }

        $payload = [
            'banned_until' => $bannedUntil,
            'violations'   => $violations,
            'hits'         => $hits,
            'updated_at'   => $now,
        ];

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, (string)json_encode($payload));
        fflush($fp);
        @flock($fp, LOCK_UN);
    }

    @fclose($fp);
    return $allowed;
}

/**
 * Alias kompatybilny wstecznie.
 */
function rate_limit_check(string $action = 'default', int $maxAttempts = 5, int $windowSeconds = 60): bool
{
    return check_rate_limit($action, $maxAttempts, $windowSeconds);
}

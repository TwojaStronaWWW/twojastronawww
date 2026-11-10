<?php
declare(strict_types=1);

// [REF-05 / OWASP PHP2Shell Guard]: Wyrejestrowanie niebezpiecznych wrapperów strumieniowych i blokada CGI injection
foreach (['phar', 'ftp', 'ftps', 'expect'] as $__unsafeWrapper) {
    if (in_array($__unsafeWrapper, stream_get_wrappers(), true)) {
        @stream_wrapper_unregister($__unsafeWrapper);
    }
}
$__rawQs = (string)($_SERVER['QUERY_STRING'] ?? '');
if ($__rawQs !== '' && preg_match('/(^|&)(%2d|%ad|-)(d|n|s|w)\b|allow_url_include|auto_prepend_file|auto_append_file|php:\/\/|phar:\/\/|expect:\/\//i', $__rawQs)) {
    http_response_code(403);
    exit('Forbidden');
}

/**
 * Zwraca zweryfikowany adres IP klienta (ochrona przed spoofingiem HTTP_CF_CONNECTING_IP poza Cloudflare).
 */
if (!function_exists('get_client_ip')) {
    function get_client_ip(): string {
        $remoteAddr = trim((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
        $cfIp = trim((string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ''));

        if ($cfIp !== '' && filter_var($cfIp, FILTER_VALIDATE_IP)) {
            if (!empty($_SERVER['HTTP_CF_RAY']) || $remoteAddr === '' || $remoteAddr === '127.0.0.1' || $remoteAddr === '::1') {
                return $cfIp;
            }
        }

        return filter_var($remoteAddr, FILTER_VALIDATE_IP) ? $remoteAddr : '0.0.0.0';
    }
}

/**
 * Anonimizacja adresu IP zgodna z RODO (maskowanie ostatniego oktetu IPv4 lub sufiksu /48 IPv6).
 */
if (!function_exists('mask_ip')) {
    function mask_ip(string $ip): string {
        $trimmed = trim($ip);
        if (filter_var($trimmed, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return (string)preg_replace('/\.\d+$/', '.0', $trimmed);
        }
        if (filter_var($trimmed, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $packed = @inet_pton($trimmed);
            if ($packed !== false && strlen($packed) === 16) {
                $masked = substr($packed, 0, 6) . str_repeat("\x00", 10);
                $unpacked = @inet_ntop($masked);
                if ($unpacked !== false) {
                    return $unpacked;
                }
            }
        }
        return '0.0.0.0';
    }
}

/**
 * Zwraca ścieżkę do chronionego katalogu liczników rate-limit i Penalty Box.
 */
function rate_limits_storage_dir(): string {
    $dir = __DIR__ . '/rate_limits';
    if (!file_exists($dir)) {
        if (!@mkdir($dir, 0755, true)) {
            return sys_get_temp_dir();
        }
        @file_put_contents($dir . '/.htaccess', "Deny from all\n");
        @file_put_contents($dir . '/index.html', '');
    }
    return $dir;
}

/**
 * 15-minutowy IP Penalty Box (blokada agresywnych adresów IP po wykryciu ataku WAF L7 lub brute-force).
 */
function ban_client_ip(string $ip, int $ttlSeconds = 900, string $reason = 'security_blocked'): void {
    $dir = rate_limits_storage_dir();
    $cleanIp = filter_var(trim($ip), FILTER_VALIDATE_IP) ? trim($ip) : '0.0.0.0';
    $file = $dir . '/rate_penalty_' . hash('sha256', 'penalty|' . $cleanIp) . '.json';

    $fp = @fopen($file, 'c+b');
    if (!$fp) {
        return;
    }

    if (@flock($fp, LOCK_EX)) {
        $payload = [
            'banned_until' => time() + max(60, $ttlSeconds),
            'reason' => substr((string)preg_replace('/[^a-zA-Z0-9_-]/', '', $reason), 0, 48),
            'created_at' => time(),
        ];
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, (string)json_encode($payload));
        fflush($fp);
        @flock($fp, LOCK_UN);
    }
    fclose($fp);
}

/**
 * Sprawdza, czy dany adres IP znajduje się obecnie w aktywnym 15-minutowym IP Penalty Box.
 */
function is_client_ip_banned(string $ip): bool {
    $dir = rate_limits_storage_dir();
    $cleanIp = filter_var(trim($ip), FILTER_VALIDATE_IP) ? trim($ip) : '0.0.0.0';
    $file = $dir . '/rate_penalty_' . hash('sha256', 'penalty|' . $cleanIp) . '.json';

    if (!file_exists($file)) {
        return false;
    }

    $fp = @fopen($file, 'rb');
    if (!$fp) {
        return false;
    }

    $isBanned = false;
    if (@flock($fp, LOCK_SH)) {
        $content = stream_get_contents($fp);
        if (is_string($content) && $content !== '') {
            $decoded = json_decode($content, true, 8);
            if (is_array($decoded) && isset($decoded['banned_until']) && (int)$decoded['banned_until'] > time()) {
                $isBanned = true;
            }
        }
        @flock($fp, LOCK_UN);
    }
    fclose($fp);

    if (!$isBanned) {
        @unlink($file);
    }

    return $isBanned;
}

/**
 * Mechanizm Rate Limiting oparty na blokadzie plikowej i Garbage Collectorze (ISO 27001 / Zero-PII).
 * Nazwa pliku ma postać: rate_<akcja>_<sha256>.json (brak oktetów IP na dysku — 100% RODO).
 */
function rate_limit(string $key, int $limit, int $seconds): bool {
    $dir = rate_limits_storage_dir();

    $action = 'req';
    if (preg_match('/^([a-zA-Z]+(?:_[a-zA-Z]+)*)/', $key, $matches)) {
        $action = strtolower(substr($matches[1], 0, 24));
    }
    $file = $dir . '/rate_' . $action . '_' . hash('sha256', $key) . '.json';

    // Garbage Collector (1% prawdopodobieństwa, bezpieczne usuwanie z LOCK_EX | LOCK_NB)
    if (random_int(1, 100) === 1) {
        $files = glob($dir . '/rate_*.json');
        if (is_array($files)) {
            $now = time();
            foreach ($files as $f) {
                if ($now - (int)@filemtime($f) > 3600) {
                    $gcFp = @fopen($f, 'c+b');
                    if ($gcFp) {
                        if (@flock($gcFp, LOCK_EX | LOCK_NB)) {
                            @flock($gcFp, LOCK_UN);
                            fclose($gcFp);
                            @unlink($f);
                        } else {
                            fclose($gcFp);
                        }
                    }
                }
            }
        }
    }

    $fp = @fopen($file, 'c+b');
    if (!$fp) {
        return true;
    }

    if (!@flock($fp, LOCK_EX)) {
        fclose($fp);
        return true;
    }

    $current = [];
    $content = stream_get_contents($fp);
    if ($content !== false && $content !== '') {
        $decoded = json_decode($content, true, 8);
        if (is_array($decoded)) {
            $current = $decoded;
        }
    }

    $now = time();

    if (!isset($current['start_time']) || ($now - (int)$current['start_time'] > $seconds)) {
        $current = [
            'start_time' => $now,
            'count' => 0,
        ];
    }

    if ((int)$current['count'] >= $limit) {
        @flock($fp, LOCK_UN);
        fclose($fp);
        return false;
    }

    $current['count'] = (int)$current['count'] + 1;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, (string)json_encode($current));
    fflush($fp);

    @flock($fp, LOCK_UN);
    fclose($fp);

    return true;
}

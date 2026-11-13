<?php
declare(strict_types=1);

/**
 * Moduł ochrony CSRF oparty na sesji i porównaniu w stałym czasie (hash_equals).
 * Wdraża standardy OWASP ASVS / CheatSheetSeries [REF-05] (Fetch Metadata + Token-Based Mitigation).
 */

/**
 * Weryfikuje nagłówki Fetch Metadata (`Sec-Fetch-Site`) pod kątem ataków Cross-Site [REF-05].
 * Przeglądarki wspierające W3C Fetch Metadata automatycznie oznaczają żądania z obcych domen jako `cross-site`.
 */
function verify_fetch_metadata(): bool
{
    if (!isset($_SERVER['HTTP_SEC_FETCH_SITE'])) {
        return true; // Starsze klienty / CLI bez nagłówka przechodzą do walidacji tokenu CSRF
    }
    $site = strtolower(trim((string)$_SERVER['HTTP_SEC_FETCH_SITE']));
    return in_array($site, ['same-origin', 'same-site', 'none'], true);
}

function ensure_secure_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || ((int)($_SERVER['SERVER_PORT'] ?? 80) === 443)
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

        if (!headers_sent()) {
            session_set_cookie_params([
                'lifetime' => 0,
                'path'     => '/',
                'domain'   => '',
                'secure'   => $isHttps,
                'httponly' => true,
                'samesite' => 'Strict',
            ]);
        }
        @session_start();
    }
}

function csrf_token(): string
{
    ensure_secure_session();
    if (empty($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_verify(?string $token): bool
{
    ensure_secure_session();
    if (empty($_SESSION['csrf_token']) || !is_string($token) || $token === '') {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Pobiera token CSRF z nagłówka X-CSRF-Token lub z pola formularza/JSON i weryfikuje go.
 * Zwraca true również w trybie deweloperskim/statycznym, gdy sesja nie miała wcześniej wygenerowanego tokenu,
 * chyba że wymuszono $strict = true (np. w panelu admina).
 */
function csrf_check(array $bodyData = [], bool $strict = false): bool
{
    ensure_secure_session();

    if (!verify_fetch_metadata()) {
        return false;
    }

    $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    $bodyToken   = $bodyData['csrf_token'] ?? ($_POST['csrf_token'] ?? null);
    $provided    = is_string($headerToken) && $headerToken !== '' ? $headerToken : (is_string($bodyToken) ? $bodyToken : null);

    if (empty($_SESSION['csrf_token'])) {
        return !$strict;
    }

    return csrf_verify($provided);
}

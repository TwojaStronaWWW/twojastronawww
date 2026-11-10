<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// [REF-05] Ochrona przed atakami OOM DoS — maksymalny rozmiar żądania API: 64 KB (HTTP 413)
$__contentLength = isset($_SERVER['CONTENT_LENGTH'])
    ? (int)$_SERVER['CONTENT_LENGTH']
    : (isset($_SERVER['HTTP_CONTENT_LENGTH']) ? (int)$_SERVER['HTTP_CONTENT_LENGTH'] : 0);
if ($__contentLength > 65536) {
    http_response_code(413);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Payload Too Large (max 64 KB).']);
    exit;
}

// Konfiguracja sesji (własny katalog sesji chroniony przez .htaccess)
$sessionDir = __DIR__ . '/sessions';
if (!file_exists($sessionDir)) {
    @mkdir($sessionDir, 0700, true);
}

$__isHttps = (
    (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') ||
    ((int)($_SERVER['SERVER_PORT'] ?? 0) === 443) ||
    (strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https') ||
    (strpos((string)($_SERVER['HTTP_CF_VISITOR'] ?? ''), '"scheme":"https"') !== false)
);

ini_set('session.save_path', $sessionDir);
ini_set('session.gc_probability', '1');
ini_set('session.gc_divisor', '100');
ini_set('session.gc_maxlifetime', '3600');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.cookie_secure', $__isHttps ? '1' : '0');
ini_set('session.use_strict_mode', '1');

if (session_status() === PHP_SESSION_NONE) {
    @session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $__isHttps,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    @session_start();
}

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

require_once __DIR__ . '/rate-limit.php';
require_once __DIR__ . '/leads-store.php';
require_once __DIR__ . '/csrf.php';

// Stała TTL sesji panelu administracyjnego (30 minut)
if (!defined('SESSION_TTL')) {
    define('SESSION_TTL', 1800);
}

// Stała PIN pobierana bezpiecznie ze środowiska .env poza Git (ISO 27001 — Zero Secrets in Git)
if (!defined('APP_PIN')) {
    define('APP_PIN', get_env_secret('ADMIN_PIN', ''));
}

function get_json_request(): array {
    $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
    if ($contentLength > 65536) {
        @session_write_close();
        http_response_code(413);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Payload Too Large (max 64 KB).']);
        exit;
    }

    $rawBody = file_get_contents('php://input', false, null, 0, 65536);
    $data = is_string($rawBody) && $rawBody !== '' ? json_decode($rawBody, true, 16) : null;
    if (!is_array($data)) {
        $data = $_POST;
    }

    // Global Honeypot check
    if (!empty($data['website_url'])) {
        @session_write_close();
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['status' => 'success', 'success' => true]);
        exit;
    }

    return $data;
}

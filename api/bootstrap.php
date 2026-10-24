<?php
declare(strict_types=1);

// Konfiguracja sesji (własny katalog sesji chroniony przez .htaccess)
$sessionDir = __DIR__ . '/sessions';
if (!file_exists($sessionDir)) {
    @mkdir($sessionDir, 0700, true);
}
ini_set('session.save_path', $sessionDir);
ini_set('session.gc_probability', '1');
ini_set('session.gc_divisor', '100');
ini_set('session.gc_maxlifetime', '3600');

@session_start();

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

require_once __DIR__ . '/rate-limit.php';
require_once __DIR__ . '/leads-store.php';
require_once __DIR__ . '/csrf.php';

// Stała PIN pobierana bezpiecznie ze środowiska .env poza Git (ISO 27001 — Zero Secrets in Git)
if (!defined('APP_PIN')) {
    define('APP_PIN', get_env_secret('ADMIN_PIN', ''));
}

function get_json_request(): array {
    $data = json_decode((string)file_get_contents("php://input"), true);
    if (!is_array($data)) {
        $data = $_POST;
    }

    // Global Honeypot check
    if (!empty($data['website_url'])) {
        @session_write_close();
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(["status" => "success", "success" => true]);
        exit;
    }

    return $data;
}

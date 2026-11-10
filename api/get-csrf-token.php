<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && strtolower(trim((string)$_SERVER['HTTP_SEC_FETCH_SITE'])) === 'cross-site') {
    @session_write_close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Cross-Site Request Blocked']);
    exit;
}

$ip = get_client_ip();
if (is_client_ip_banned($ip)) {
    @session_write_close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'IP temporarily blocked']);
    exit;
}

if (!rate_limit('csrf_' . mask_ip($ip), 30, 3600)) {
    @session_write_close();
    http_response_code(429);
    echo json_encode(['status' => 'error', 'message' => 'Rate limit exceeded']);
    exit;
}

$token = csrf_token();
@session_write_close();

echo json_encode([
    'token' => $token,
]);

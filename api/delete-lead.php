<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    @session_write_close();
    http_response_code(405);
    header('Allow: POST');
    exit('Method Not Allowed');
}

if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && strtolower(trim((string)$_SERVER['HTTP_SEC_FETCH_SITE'])) === 'cross-site') {
    @session_write_close();
    http_response_code(403);
    exit('Niedozwolone żądanie międzywitrynowe (Cross-Site Request Blocked).');
}

$clientIp = get_client_ip();
if (is_client_ip_banned($clientIp)) {
    @session_write_close();
    http_response_code(403);
    exit('Dostęp tymczasowo zablokowany.');
}

if (!rate_limit('delete_lead_' . mask_ip($clientIp), 20, 300)) {
    @session_write_close();
    http_response_code(429);
    exit('Zbyt wiele żądań.');
}

$authAt = isset($_SESSION['auth_at']) ? (int)$_SESSION['auth_at'] : 0;
if (
    empty($_SESSION['auth']) ||
    $_SESSION['auth'] !== true ||
    $authAt <= 0 ||
    (time() - $authAt) > SESSION_TTL
) {
    $_SESSION = [];
    @session_destroy();
    @session_write_close();
    http_response_code(403);
    exit('Brak dostępu lub sesja wygasła.');
}

if (!csrf_check((string)($_POST['csrf_token'] ?? ''))) {
    @session_write_close();
    http_response_code(403);
    exit('CSRF Invalid');
}

$_SESSION['auth_at'] = time();

// Zwalniamy blokadę sesji PHP przed operacją plikową LOCK_EX
@session_write_close();

$id = trim((string)($_POST['id'] ?? ''));
if ($id === '' || !preg_match('/^[a-f0-9]{64}$/', $id)) {
    http_response_code(400);
    exit('Nieprawidłowy identyfikator zgłoszenia.');
}

delete_lead_by_id($id);

header('Location: admin.php');
exit;

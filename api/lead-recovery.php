<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
@session_write_close();

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$secFetchSite = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
if ($secFetchSite === 'cross-site') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => ' Cross-site request blocked']);
    exit;
}

// Zgodnie z RODO (art. 5 i 6) szkice formularza przed kliknięciem "Wyślij"
// są przechowywane wyłącznie lokalnie w przeglądarce użytkownika (localStorage).
// Endpoint zwraca status OK dla zachowania kompatybilności wstecznej bez zapisu PII na serwerze.
echo json_encode(['status' => 'ok', 'rodo_mode' => 'client_local_storage']);

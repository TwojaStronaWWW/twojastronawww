<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
header('Content-Type: application/json; charset=UTF-8');

// Zgodnie z RODO (art. 5 i 6) szkice formularza przed kliknięciem "Wyślij"
// są przechowywane wyłącznie lokalnie w przeglądarce użytkownika (localStorage).
// Endpoint zwraca status OK dla zachowania kompatybilności wstecznej bez zapisu PII na serwerze.
echo json_encode(['status' => 'ok', 'rodo_mode' => 'client_local_storage']);

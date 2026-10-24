<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (empty($_SESSION['auth']) || $_SESSION['auth'] !== true) {
    @session_write_close();
    http_response_code(403);
    exit('Brak dostępu');
}

if (!csrf_check($_POST['csrf_token'] ?? '')) {
    @session_write_close();
    http_response_code(403);
    exit('CSRF Invalid');
}

// Zwalniamy blokadę sesji PHP przed operacją plikową LOCK_EX
@session_write_close();

$id = trim((string)($_POST['id'] ?? ''));
if ($id === '') {
    exit('Brak ID');
}

delete_lead_by_id($id);

header('Location: admin.php');
exit;

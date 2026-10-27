<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/* ========= AUTORYZACJA ========= */
$clientIp = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if (!rate_limit('export_leads_' . md5((string)$clientIp), 10, 300)) {
    http_response_code(429);
    exit('Zbyt wiele żądań. Spróbuj ponownie później.');
}

if (APP_PIN !== '' && isset($_GET['pin']) && $_GET['pin'] !== '' && hash_equals(APP_PIN, (string)$_GET['pin'])) {
    $_SESSION['auth_pin'] = APP_PIN;
    unset($_GET['pin']);
    @session_write_close();
    header("Location: export-leads.php");
    exit;
}

$isPinAuthed = (APP_PIN !== '' && isset($_SESSION['auth_pin']) && $_SESSION['auth_pin'] !== '' && hash_equals(APP_PIN, (string)$_SESSION['auth_pin']));
$isAdminSessionAuthed = (!empty($_SESSION['auth']) && $_SESSION['auth'] === true);

if (!$isPinAuthed && !$isAdminSessionAuthed) {
    @session_write_close();
    http_response_code(403);
    exit('Brak dostępu');
}
@session_write_close();

$onlyNewsletter = isset($_GET['newsletter']) && $_GET['newsletter'] === '1';
$files = glob(__DIR__ . '/leads_*.csv') ?: [];
sort($files);

$filenamePrefix = $onlyNewsletter ? 'newsletter_subscribers_' : 'all_leads_';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filenamePrefix . date('Y-m-d') . '.csv"');

$out = fopen('php://output', 'w');
fputcsv($out, ['date', 'time', 'name', 'email', 'message', 'ip_hash', 'phone', 'newsletter']);

foreach ($files as $file) {
    if (strpos(basename($file), '_draft_') !== false) {
        continue;
    }

    if (($handle = fopen($file, "r")) !== false) {
        if (@flock($handle, LOCK_SH)) {
            fgetcsv($handle); // Pomiń nagłówek
            while (($data = fgetcsv($handle)) !== false) {
                $normalized = normalize_lead_row($data);
                if ($normalized === null) {
                    continue;
                }
                if ($onlyNewsletter && ($normalized[7] ?? 'NIE') !== 'TAK') {
                    continue;
                }
                fputcsv($out, $normalized);
            }
            @flock($handle, LOCK_UN);
        }
        fclose($handle);
    }
}

fclose($out);

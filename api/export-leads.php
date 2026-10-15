<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/* ========= AUTORYZACJA ========= */
if (isset($_GET['pin']) && hash_equals(APP_PIN, (string)$_GET['pin'])) {
    $_SESSION['auth_pin'] = APP_PIN;
    unset($_GET['pin']);
    header("Location: export-leads.php");
    exit;
}

if (!isset($_SESSION['auth_pin']) || !hash_equals(APP_PIN, (string)$_SESSION['auth_pin'])) {
    http_response_code(403);
    exit('Brak dostępu');
}

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
        fclose($handle);
    }
}

fclose($out);

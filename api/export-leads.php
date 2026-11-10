<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

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

if (!rate_limit('export_leads_' . mask_ip($clientIp), 10, 300)) {
    @session_write_close();
    http_response_code(429);
    exit('Zbyt wiele żądań. Spróbuj ponownie później.');
}

// Autoryzacja wyłącznie na podstawie aktywnej sesji administratora z kontrolą SESSION_TTL (brak PIN-u w URL)
$authAt = isset($_SESSION['auth_at']) ? (int)$_SESSION['auth_at'] : 0;
$isAdminSessionAuthed = (
    !empty($_SESSION['auth']) &&
    $_SESSION['auth'] === true &&
    $authAt > 0 &&
    (time() - $authAt) <= SESSION_TTL
);

if (!$isAdminSessionAuthed) {
    if (!empty($_SESSION['auth'])) {
        $_SESSION = [];
        @session_destroy();
    }
    @session_write_close();
    http_response_code(403);
    exit('Brak dostępu lub sesja wygasła.');
}

$_SESSION['auth_at'] = time();
@session_write_close();

$onlyNewsletter = isset($_GET['newsletter']) && $_GET['newsletter'] === '1';
$files = glob(__DIR__ . '/leads_*.csv') ?: [];
sort($files);

$filenamePrefix = $onlyNewsletter ? 'newsletter_subscribers_' : 'all_leads_';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filenamePrefix . date('Y-m-d') . '.csv"');

$out = fopen('php://output', 'w');
if ($out === false) {
    http_response_code(500);
    exit('Błąd strumienia wyjściowego.');
}

fputcsv($out, ['date', 'time', 'name', 'email', 'message', 'ip_hash', 'phone', 'newsletter'], ',', '"', '');

foreach ($files as $file) {
    if (strpos(basename($file), '_draft_') !== false) {
        continue;
    }

    if (($handle = @fopen($file, 'rb')) !== false) {
        if (@flock($handle, LOCK_SH)) {
            fgetcsv($handle, 0, ',', '"', ''); // Pomiń nagłówek
            while (($data = fgetcsv($handle, 0, ',', '"', '')) !== false) {
                $normalized = normalize_lead_row($data);
                if ($normalized === null) {
                    continue;
                }
                if ($onlyNewsletter && ($normalized[7] ?? 'NIE') !== 'TAK') {
                    continue;
                }
                // Ochrona przed CSV Formula Injection (OWASP DDE) na każdej eksportowanej komórce
                $safeRow = array_map(static function ($cell): string {
                    return sanitize_csv_cell((string)$cell);
                }, $normalized);
                fputcsv($out, $safeRow, ',', '"', '');
            }
            @flock($handle, LOCK_UN);
        }
        fclose($handle);
    }
}

fclose($out);

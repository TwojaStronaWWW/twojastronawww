<?php
declare(strict_types=1);

/**
 * Lekki magazyn leadów oparty o plik CSV oraz powiadomienia Push (Ntfy.sh).
 * Zawiera zabezpieczenie przed CSV Formula Injection (OWASP) oraz obsługę pliku .env.
 *
 * UWAGA ARCHITEKTONICZNA (Separation of Concerns):
 * Niniejszy moduł odpowiada wyłącznie za formularz kontaktowy (zapis CSV + Ntfy.sh).
 * Jest całkowicie niezależny od opcjonalnego modułu czatbota AI (`assets/js/ai-widget.js`),
 * dzięki czemu wyłączenie lub usunięcie czatu AI nigdy nie wpływa na odbieranie leadów z formularza.
 */

const MAX_LEADS_STORAGE_BYTES = 10485760; // 10 MB

/**
 * Wczytuje zmienne środowiskowe z pliku .env (jeśli istnieje w katalogu głównym projektu).
 *
 * @return array<string, string>
 */
function parse_dotenv_file(?string $envFilePath = null): array
{
    static $cachedEnv = null;
    if ($cachedEnv !== null && $envFilePath === null) {
        return $cachedEnv;
    }

    $path = $envFilePath ?? (dirname(__DIR__) . '/.env');
    if (!is_file($path) || !is_readable($path)) {
        if ($envFilePath === null) {
            $cachedEnv = [];
        }
        return [];
    }

    $vars = [];
    $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return [];
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }
        $eqPos = strpos($trimmed, '=');
        if ($eqPos === false) {
            continue;
        }
        $key = trim(substr($trimmed, 0, $eqPos));
        $val = trim(substr($trimmed, $eqPos + 1));
        if ($key === '') {
            continue;
        }
        if (
            (str_starts_with($val, '"') && str_ends_with($val, '"')) ||
            (str_starts_with($val, "'") && str_ends_with($val, "'"))
        ) {
            $val = substr($val, 1, -1);
        }
        $vars[$key] = $val;
    }

    if ($envFilePath === null) {
        $cachedEnv = $vars;
    }

    return $vars;
}

/**
 * Pobiera sekret konfiguracyjny ze zmiennych środowiskowych lub pliku .env.
 */
function get_env_secret(string $key, string $default = ''): string
{
    $envVal = getenv($key);
    if (is_string($envVal) && $envVal !== '') {
        return $envVal;
    }
    if (!empty($_ENV[$key]) && is_string($_ENV[$key])) {
        return $_ENV[$key];
    }
    $dotEnv = parse_dotenv_file();
    if (isset($dotEnv[$key]) && $dotEnv[$key] !== '') {
        return $dotEnv[$key];
    }
    return $default;
}

/**
 * Neutralizuje potencjalne formuły arkuszy kalkulacyjnych (CSV Injection / DDE):
 * poprzedza apostrofem ciągi zaczynające się od =, +, -, @, tabulatora lub znaku powrotu karetki,
 * w tym poprzedzone białymi znakami.
 */
function sanitize_csv_field(string $value): string
{
    $clean = str_replace(["\r\n", "\r", "\n"], ' ', trim($value));
    if ($clean !== '' && preg_match('/^[\s\x00-\x20]*[=+\-@|\t]/', $clean) === 1) {
        return "'" . $clean;
    }
    return $clean;
}

/**
 * Alias kompatybilny z api/export-leads.php oraz testami higieny repozytorium.
 */
function sanitize_csv_cell(string $value): string
{
    return sanitize_csv_field($value);
}

/**
 * Zwraca ścieżkę do pliku CSV z leadami (poza publicznym webrootem lub w chronionym katalogu).
 */
function get_leads_csv_path(): string
{
    $customPath = getenv('LEADS_CSV_PATH');
    if (is_string($customPath) && $customPath !== '') {
        return $customPath;
    }
    return dirname(__DIR__) . '/storage/leads/leady.csv';
}

/**
 * Tworzy chroniony katalog dla pliku CSV (z blokadą .htaccess).
 */
function ensure_leads_storage(string $csvPath): bool
{
    $dir = dirname($csvPath);
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0750, true) && !is_dir($dir)) {
            return false;
        }
    }

    $htaccess = $dir . '/.htaccess';
    if (!file_exists($htaccess)) {
        @file_put_contents(
            $htaccess,
            "# Blokada bezposredniego dostepu HTTP do bazy leadow (RODO / ISO 27001)\n"
            . "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n"
            . "<IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n</IfModule>\n",
            LOCK_EX
        );
    }

    return is_writable($dir);
}

/**
 * Wysyła natychmiastowe powiadomienie Push (Ntfy.sh) z przyciskami akcji 1-Klik ("Zadzwoń teraz" / "Odpisz e-mail").
 *
 * @param array{name?: string, email?: string, phone?: string, subject?: string, message?: string, site?: string} $lead
 */
function send_ntfy_lead_alert(array $lead): bool
{
    $topic = trim(get_env_secret('NTFY_TOPIC'));
    if ($topic === '' || !function_exists('curl_init')) {
        return false;
    }

    $server = rtrim(get_env_secret('NTFY_SERVER', 'https://ntfy.sh'), '/');
    $token = trim(get_env_secret('NTFY_TOKEN'));

    // [REF-05] SSRF Guard — wymuszamy wyłącznie protokół HTTPS i blokujemy adresy lokalne/metadanych
    $parsedUrl = parse_url($server);
    $scheme = strtolower((string)($parsedUrl['scheme'] ?? ''));
    $host = strtolower((string)($parsedUrl['host'] ?? ''));
    if (
        $scheme !== 'https' ||
        $host === '' ||
        $host === 'localhost' ||
        str_starts_with($host, '127.') ||
        str_starts_with($host, '10.') ||
        str_starts_with($host, '192.168.') ||
        str_starts_with($host, '169.254.')
    ) {
        return false;
    }

    $name = trim((string)($lead['name'] ?? 'Klient'));
    $email = trim((string)($lead['email'] ?? ''));
    $phone = trim((string)($lead['phone'] ?? ''));
    $subject = trim((string)($lead['subject'] ?? 'Zapytanie z formularza'));
    $message = trim((string)($lead['message'] ?? ''));
    $site = trim((string)($lead['site'] ?? ($_SERVER['HTTP_HOST'] ?? 'TwojaStronaWWW')));

    $cleanPhoneDial = preg_replace('/[^0-9+]/', '', $phone) ?: '';
    $contactQuick = $phone !== '' && $email !== ''
        ? "{$phone} | {$email}"
        : ($phone !== '' ? $phone : ($email !== '' ? $email : 'Brak'));

    $titleHeader = "Lead ({$site}): {$name}" . ($phone !== '' ? " [{$phone}]" : '');
    $titleHeader = preg_replace('/[\r\n]+/', ' ', $titleHeader) ?: 'Nowy Lead';

    $lines = [
        '📞 TELEFON: ' . ($phone !== '' ? $phone : 'Nie podano'),
        '✉️ E-MAIL: ' . ($email !== '' ? $email : 'Nie podano'),
        '👤 Imię: ' . $name,
        '📋 Temat: ' . $subject,
        '🌐 Strona: ' . $site,
        '---',
        mb_substr($message, 0, 600),
    ];
    $body = implode("\n", $lines);

    $actions = [];
    if ($cleanPhoneDial !== '') {
        $actions[] = "view, Zadzwoń ({$cleanPhoneDial}), tel:{$cleanPhoneDial}, clear=true";
    }
    if ($email !== '') {
        $replySubject = rawurlencode("Re: {$subject} ({$site})");
        $actions[] = "view, Napisz e-mail, mailto:{$email}?subject={$replySubject}, clear=true";
    }

    $headers = [
        'Title: ' . $titleHeader,
        'Priority: high',
        'Tags: incoming_envelope,telephone_receiver,sparkles',
    ];
    if ($actions !== []) {
        $headers[] = 'Actions: ' . implode('; ', $actions);
    }
    if ($token !== '') {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        @session_write_close();
    }

    $url = $server . '/' . rawurlencode($topic);
    $ch = curl_init($url);
    if ($ch === false) {
        return false;
    }

    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_MAXREDIRS      => 0,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    if (defined('CURLPROTO_HTTPS')) {
        curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        curl_setopt($ch, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
    }

    curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    unset($ch);

    return $code >= 200 && $code < 300;
}

/**
 * Dopisuje nowego leada do pliku CSV z użyciem blokady wyłącznej (flock LOCK_EX).
 * Automatycznie tworzy plik .htaccess blokujący dostęp z sieci.
 *
 * @param array{name: string, email: string, phone?: string, subject?: string, message: string, ip_masked?: string} $lead
 */
function append_lead_csv(array $lead, ?string $customPath = null): bool
{
    $csvPath = $customPath ?? get_leads_csv_path();
    if (!ensure_leads_storage($csvPath)) {
        return false;
    }

    if (file_exists($csvPath)) {
        $currentSize = @filesize($csvPath);
        if (is_int($currentSize) && $currentSize >= MAX_LEADS_STORAGE_BYTES) {
            return false;
        }
    }

    $isNew = !file_exists($csvPath) || filesize($csvPath) === 0;
    $fp = @fopen($csvPath, 'ab');
    if ($fp === false) {
        return false;
    }

    $written = false;
    if (flock($fp, LOCK_EX)) {
        $stat = fstat($fp);
        if (is_array($stat) && isset($stat['size']) && (int)$stat['size'] === 0) {
            fwrite($fp, "\xEF\xBB\xBF");
            fputcsv($fp, ['Data', 'Imie_Nazwisko', 'Email', 'Telefon', 'Temat', 'Wiadomosc', 'IP_Masked'], ';');
        }

        $row = [
            date('Y-m-d H:i:s'),
            sanitize_csv_field((string)($lead['name'] ?? '')),
            sanitize_csv_field((string)($lead['email'] ?? '')),
            sanitize_csv_field((string)($lead['phone'] ?? '')),
            sanitize_csv_field((string)($lead['subject'] ?? '')),
            sanitize_csv_field((string)($lead['message'] ?? '')),
            sanitize_csv_field((string)($lead['ip_masked'] ?? '')),
        ];

        $written = fputcsv($fp, $row, ';') !== false;
        fflush($fp);
        flock($fp, LOCK_UN);
    }

    fclose($fp);
    return $written;
}

/**
 * Dopisuje nowego leada do pliku CSV (z limitem 10 MB i nagłówkiem UTF-8 BOM) — kompatybilność z api/contact.php.
 *
 * @param array{name: string, email?: string, phone?: string, contact?: string, message: string, ip_masked?: string, user_agent?: string} $lead
 */
function append_lead(array $lead, ?string $customPath = null): bool
{
    $csvPath = $customPath ?? get_leads_csv_path();
    if (!ensure_leads_storage($csvPath)) {
        return false;
    }

    if (file_exists($csvPath)) {
        $currentSize = @filesize($csvPath);
        if (is_int($currentSize) && $currentSize >= MAX_LEADS_STORAGE_BYTES) {
            return false;
        }
    }

    $isNewFile = !file_exists($csvPath) || (int)@filesize($csvPath) === 0;
    $fp = @fopen($csvPath, 'ab');
    if ($fp === false) {
        return false;
    }

    $success = false;
    if (@flock($fp, LOCK_EX)) {
        if ($isNewFile) {
            fwrite($fp, "\xEF\xBB\xBF");
            fputcsv($fp, ['ID', 'Data_UTC', 'Imie', 'Kontakt', 'Telefon', 'Email', 'Wiadomosc', 'IP_Maskowane'], ';');
        }

        $id = bin2hex(random_bytes(6));
        $row = [
            $id,
            gmdate('Y-m-d H:i:s'),
            sanitize_csv_field((string)($lead['name'] ?? '')),
            sanitize_csv_field((string)($lead['contact'] ?? '')),
            sanitize_csv_field((string)($lead['phone'] ?? '')),
            sanitize_csv_field((string)($lead['email'] ?? '')),
            sanitize_csv_field((string)($lead['message'] ?? '')),
            sanitize_csv_field((string)($lead['ip_masked'] ?? '0.0.0.xxx')),
        ];

        $res = fputcsv($fp, $row, ';');
        fflush($fp);
        @flock($fp, LOCK_UN);
        $success = ($res !== false);
    }

    @fclose($fp);
    return $success;
}

/**
 * Odczytuje listę leadów z pliku CSV (od najnowszych) — kompatybilność z api/admin.php.
 *
 * @return array<int, array<string, string>>
 */
function read_all_leads(?string $customPath = null, int $limit = 200): array
{
    $csvPath = $customPath ?? get_leads_csv_path();
    if (!file_exists($csvPath) || !is_readable($csvPath)) {
        return [];
    }

    $fp = @fopen($csvPath, 'rb');
    if ($fp === false) {
        return [];
    }

    $rows = [];
    if (@flock($fp, LOCK_SH)) {
        $header = fgetcsv($fp, 4096, ';');
        if (is_array($header)) {
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string)$header[0]);
            while (($line = fgetcsv($fp, 8192, ';')) !== false) {
                if (count($line) < 2) {
                    continue;
                }
                $item = [];
                foreach ($header as $idx => $colName) {
                    $item[(string)$colName] = isset($line[$idx]) ? (string)$line[$idx] : '';
                }
                $rows[] = $item;
            }
        }
        @flock($fp, LOCK_UN);
    }
    @fclose($fp);

    $rows = array_reverse($rows);
    return array_slice($rows, 0, max(1, $limit));
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
header('Content-Type: application/json; charset=UTF-8');

/**
 * Pobiera zmienną środowiskową z getenv(), $_ENV lub pliku .env poza webrootem.
 */
function get_tsw_env(string $key, string $default = ''): string {
    if (function_exists('get_env_secret')) {
        $secret = get_env_secret($key, '');
        if ($secret !== '') {
            return $secret;
        }
    }
    $envPath = __DIR__ . '/.env';
    if (@is_readable($envPath)) {
        $lines = @file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                    continue;
                }
                [$k, $v] = explode('=', $line, 2);
                if (trim($k) === $key) {
                    return trim($v, " \t\n\r\0\x0B\"'");
                }
            }
        }
    }
    return $default;
}

/**
 * Koduje temat wiadomości e-mail zgodnie ze standardem RFC 2047 (UTF-8 Base64) i usuwa CRLF.
 */
function encode_rfc2047_subject(string $subject): string {
    $clean = trim((string)preg_replace('/[\r\n\x00-\x1F]+/', ' ', $subject));
    return '=?UTF-8?B?' . base64_encode($clean) . '?=';
}

/**
 * Sanityzacja wartości nagłówków HTTP Ntfy (ochrona przed CRLF Header Injection).
 */
function sanitize_ntfy_header_value(string $value): string {
    return trim((string)preg_replace('/[\r\n\x00-\x1F]+/', ' ', $value));
}

/**
 * Sanityzacja parametrów akcji Ntfy (usuwa separatory akcji ';', ',' oraz cudzysłowy i CRLF).
 */
function sanitize_ntfy_action_token(string $value): string {
    return trim((string)preg_replace('/[\r\n\x00-\x1F;,"]+/', ' ', $value));
}

/**
 * Filtr WAF Warstwy 7 (SQLi, XSS, Path Traversal, Stream Wrapper RCE, Null-Byte, Prompt Injection).
 */
function detect_waf_l7_attack(array $fields): bool {
    $patterns = [
        '/\x00/',
        '/<\s*script\b/i',
        '/javascript\s*:/i',
        '/\bon(?:error|load|click|mouseover|focus|submit|toggle)\s*=/i',
        '/<\s*(?:iframe|object|embed|applet|meta|base)\b/i',
        '/\b(?:union\s+(?:all\s+)?select|select\s+.+\s+from\s+information_schema|drop\s+table|insert\s+into\s+\w+\s+values|sleep\s*\(\s*\d+\s*\)|benchmark\s*\()\b/i',
        '/(?:\.\.\/|\.\.\\\\|\/etc\/passwd|\/proc\/self\/environ|(?:php|phar|expect|file|gopher|dict):\/\/)/i',
        '/\b(?:ignore\s+(?:all\s+)?previous\s+instructions|system\s+prompt\s+override)\b/i',
    ];

    foreach ($fields as $value) {
        if (!is_scalar($value)) {
            continue;
        }
        $str = (string)$value;
        if ($str === '') {
            continue;
        }
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $str) === 1) {
                return true;
            }
        }
    }
    return false;
}

// 0a. [REF-05] Zabezpieczenie OWASP Fetch Metadata (Sec-Fetch-Site) przed żądaniami Cross-Site
if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && strtolower(trim((string)$_SERVER['HTTP_SEC_FETCH_SITE'])) === 'cross-site') {
    @session_write_close();
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'success' => false,
        'message' => 'Niedozwolone żądanie międzywitrynowe (Cross-Site Request Blocked).',
    ]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'POST') !== 'POST') {
    @session_write_close();
    http_response_code(405);
    header('Allow: POST');
    echo json_encode([
        'status' => 'error',
        'success' => false,
        'message' => 'Method Not Allowed',
    ]);
    exit;
}

// Rzeczywiste IP klienta (z ochroną przed spoofingiem poza Cloudflare) oraz maska RODO
$ip = get_client_ip();
$maskedIp = mask_ip($ip);

// 0b. Sprawdzenie 15-minutowego IP Penalty Box
if (is_client_ip_banned($ip)) {
    @session_write_close();
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'success' => false,
        'message' => 'Adres IP jest tymczasowo zablokowany ze względów bezpieczeństwa (15 min).',
    ]);
    exit;
}

// 0c. Zabezpieczenie Rate Limiting (ISO 27001 / Zero-PII): maks. 5 prób wysyłki na 5 minut
if (!rate_limit('contact_' . $maskedIp, 5, 300)) {
    @session_write_close();
    http_response_code(429);
    echo json_encode([
        'status' => 'error',
        'success' => false,
        'message' => 'Zbyt wiele prób wysłania wiadomości. Odczekaj chwilę przed kolejną próbą.',
    ]);
    exit;
}

$data = get_json_request();

// 0d. Filtr WAF Warstwy 7 -> 15-minutowy IP Penalty Box (HTTP 403)
if (detect_waf_l7_attack([
    $data['name'] ?? '',
    $data['email'] ?? '',
    $data['phone'] ?? '',
    $data['message'] ?? '',
])) {
    ban_client_ip($ip, 900, 'waf_l7_blocked');
    @session_write_close();
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'success' => false,
        'message' => 'Żądanie zostało zablokowane przez zaporę bezpieczeństwa aplikacji (WAF).',
    ]);
    exit;
}

// 1. Zabezpieczenie Anty-Bot: Wielopolowy Honeypot (pola pułapki ukryte CSS-em dla ludzi)
$honeypots = ['website_url', 'hp_chk', 'website', 'company_name', 'phone_extra'];
foreach ($honeypots as $hp) {
    if (!empty($data[$hp])) {
        @session_write_close();
        echo json_encode([
            'status' => 'success',
            'success' => true,
            'message' => 'Dziękujemy! Twoja wiadomość została wysłana pomyślnie.',
        ]);
        exit;
    }
}

// 2. Zabezpieczenie Anty-Bot: Pomiar czasu interakcji (minimalny czas wypełniania >= 2.0s, odrzucenie bool/NaN/Infinity)
if (isset($data['submission_seconds'])) {
    $rawSubSec = $data['submission_seconds'];
    $subSecFloat = (is_numeric($rawSubSec) && !is_bool($rawSubSec)) ? (float)$rawSubSec : 0.0;
    if (!is_finite($subSecFloat) || $subSecFloat < 2.0) {
        @session_write_close();
        echo json_encode([
            'status' => 'success',
            'success' => true,
            'message' => 'Dziękujemy! Twoja wiadomość została wysłana pomyślnie.',
        ]);
        exit;
    }
}

// 3. Strict Origin / Referer check
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';

if (!$origin && !$referer) {
    @session_write_close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Forbidden (Missing Origin/Referer)']);
    exit;
}

$allowedDomains = ['twojastronawww.pl', 'www.twojastronawww.pl', 'localhost', '127.0.0.1'];
$isAllowed = false;

$sourceUrl = $origin ?: $referer;
$parsedHost = strtolower((string)parse_url($sourceUrl, PHP_URL_HOST));
if ($parsedHost !== '' && in_array($parsedHost, $allowedDomains, true)) {
    $isAllowed = true;
}

if (!$isAllowed) {
    @session_write_close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Forbidden Origin']);
    exit;
}

// 4. Jednorazowy token CSRF (hash_equals) + natychmiastowy zapis i zamknięcie sesji przed I/O i cURL
if (!csrf_check(isset($data['csrf_token']) ? (string)$data['csrf_token'] : '')) {
    @session_write_close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Błąd zabezpieczeń (CSRF). Odśwież stronę.']);
    exit;
}

if (session_status() === PHP_SESSION_ACTIVE) {
    @session_write_close();
}

// 5. Oczyszczenie i normalizacja danych wejściowych (brak \s w telefonie — ochrona przed CRLF Injection)
$name = isset($data['name']) ? htmlspecialchars(strip_tags(trim((string)$data['name'])), ENT_QUOTES, 'UTF-8') : '';
$emailRaw = isset($data['email']) ? (string)preg_replace('/[\r\n\x00-\x1F]+/', '', trim((string)$data['email'])) : '';
$email = $emailRaw !== '' ? (string)filter_var($emailRaw, FILTER_SANITIZE_EMAIL) : '';
$phoneRaw = isset($data['phone']) ? trim(strip_tags((string)$data['phone'])) : '';
$phone = preg_replace('/[^0-9+\- ()]/', '', $phoneRaw) ?: '-';
$messageRaw = isset($data['message']) ? htmlspecialchars(strip_tags(trim((string)$data['message'])), ENT_QUOTES, 'UTF-8') : '';
$message = $messageRaw !== '' ? $messageRaw : '[Szybki kontakt — klient prosi o rozmowę bez opisu tekstowego]';
$newsletterConsent = !empty($data['newsletter_consent']) && $data['newsletter_consent'] !== 'false' && $data['newsletter_consent'] !== '0' ? 'TAK' : 'NIE';

$hasPhone = ($phone !== '-' && strlen((string)preg_replace('/\D/', '', $phone)) >= 7);
$hasEmail = ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false);

if (!$name || (!$hasPhone && !$hasEmail)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'success' => false,
        'message' => 'Podaj imię oraz numer telefonu lub poprawny adres e-mail.',
    ]);
    exit;
}

if ($email !== '' && !$hasEmail) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Nieprawidłowy adres e-mail.']);
    exit;
}

// 6. Zabezpieczenie Anty-Spam: Wykrywanie cyrylicy oraz nadmiernej ilości odnośników URL
if (preg_match('/\p{Cyrillic}/u', $message) || preg_match_all('/https?:\/\//i', $message) > 2) {
    echo json_encode([
        'status' => 'success',
        'success' => true,
        'message' => 'Dziękujemy! Twoja wiadomość została wysłana pomyślnie.',
    ]);
    exit;
}

// 7. Zapis finalnego leada przed wysyłką (Zero-Data-Loss, zanonimizowany hash IP RODO)
save_lead([
    date('Y-m-d'),
    date('H:i:s'),
    $name,
    $hasEmail ? $email : '-',
    $message,
    hash('sha256', $maskedIp . '|' . date('Y-m-d')),
    $phone,
    $newsletterConsent,
], false);

$plainName = html_entity_decode($name, ENT_QUOTES, 'UTF-8');
$plainMessage = html_entity_decode($message, ENT_QUOTES, 'UTF-8');

$baseSubject = $messageRaw === ''
    ? "[TwojaStronaWWW.pl] SZYBKI TELEFON: {$plainName} ({$phone})"
    : "[TwojaStronaWWW.pl] Nowe zapytanie: {$plainName}";

// 8. Rejestracja zgłoszenia w centralnym systemie ticketowym osTicket (wyłącznie HTTPS: https://hd.twojastronawww.pl/ticket_hook.php)
$osTicketApiKey = get_tsw_env('OSTICKET_API_KEY');
$osTicketUrl = get_tsw_env('OSTICKET_URL', 'https://hd.twojastronawww.pl/ticket_hook.php');
if (!filter_var($osTicketUrl, FILTER_VALIDATE_URL) || strpos($osTicketUrl, 'https://') !== 0) {
    $osTicketUrl = 'https://hd.twojastronawww.pl/ticket_hook.php';
}

$ticketCreated = false;
$ticketNum = 'BRAK';

if ($osTicketApiKey !== '' && function_exists('curl_init')) {
    $digits = preg_replace('/\D+/', '', $phone) ?: date('YmdHis');
    $ticketEmail = $hasEmail ? $email : "tel-{$digits}@twojastronawww.pl";
    $ticketPayload = [
        'site'        => 'twojastronawww',
        'name'        => $plainName,
        'email'       => $ticketEmail,
        'phone'       => $hasPhone ? $phone : '',
        'subject'     => $baseSubject,
        'message'     => "Imię i nazwisko: {$plainName}\n"
                       . "Telefon: " . ($hasPhone ? $phone : '-') . "\n"
                       . "E-mail: " . ($hasEmail ? $email : '-') . "\n"
                       . "Newsletter: {$newsletterConsent}\n"
                       . "-----------------------------------------\n"
                       . $plainMessage,
        'topicId'     => 10,
        'ip'          => $maskedIp,
        'source'      => 'Web',
        'autorespond' => false,
        'send_email'  => false,
    ];

    $ch = curl_init($osTicketUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => [
            'X-API-Key: ' . sanitize_ntfy_header_value($osTicketApiKey),
            'Content-Type: application/json',
            'Expect:',
        ],
        CURLOPT_USERAGENT      => 'TwojaStronaWWW-HelpdeskClient/2.1',
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => (string)json_encode($ticketPayload, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_MAXREDIRS      => 0,
    ]);
    if (defined('CURLPROTO_HTTPS')) {
        curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        curl_setopt($ch, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
    }

    $apiResponse = @curl_exec($ch);
    if (is_string($apiResponse) && strlen($apiResponse) > 65536) {
        $apiResponse = substr($apiResponse, 0, 65536);
    }
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    unset($ch);

    $resArr = is_string($apiResponse) ? json_decode($apiResponse, true, 8) : null;
    if (($httpCode === 200 || $httpCode === 201) && !empty($resArr['success'])) {
        $ticketCreated = true;
        $ticketNum = (string)preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($resArr['number'] ?? 'OK'));
    }
}

// 9. Wysyłka scentralizowanego powiadomienia e-mail z kodowaniem tematu RFC 2047
$centralEmail = get_tsw_env('CENTRAL_LEAD_EMAIL', 'poczatek.krzysztof@gmail.com');
$fromSender   = 'kontakt@twojastronawww.pl';
$subject      = encode_rfc2047_subject($baseSubject . ($ticketCreated ? " [Ticket #{$ticketNum}]" : ''));

$body  = "Nowe zgłoszenie z formularza kontaktowego (TwojaStronaWWW.pl):\n";
$body .= "=========================================\n";
$body .= "Imię i nazwisko: {$plainName}\n";
$body .= "Telefon:         {$phone}\n";
$body .= "E-mail:          " . ($hasEmail ? $email : '-') . "\n";
$body .= "Ticket osTicket: " . ($ticketCreated ? "#{$ticketNum} (https://hd.twojastronawww.pl/scp/)" : 'Brak') . "\n";
$body .= "Newsletter:      {$newsletterConsent}\n";
$body .= "IP (RODO):       {$maskedIp}\n";
$body .= "Data:            " . date('Y-m-d H:i:s') . "\n";
$body .= "-----------------------------------------\n";
$body .= "Treść wiadomości:\n{$plainMessage}\n";

$headers  = "From: TwojaStronaWWW <{$fromSender}>\r\n";
if ($hasEmail) {
    $safeReplyEmail = (string)preg_replace('/[\r\n\x00-\x1F]+/', '', $email);
    $headers .= "Reply-To: {$safeReplyEmail}\r\n";
}
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

@mail($centralEmail, $subject, $body, $headers, "-f{$fromSender}");

// 10. Powiadomienie Push Ntfy (wsparcie self-hosted NTFY_BASE_URL + NTFY_TOKEN + sanityzacja Title/Actions)
$ntfyTopic = (string)preg_replace('/[^a-zA-Z0-9_-]/', '', get_tsw_env('NTFY_TOPIC'));
$ntfyBaseUrl = rtrim(get_tsw_env('NTFY_BASE_URL', 'https://ntfy.sh'), '/');
if (!filter_var($ntfyBaseUrl, FILTER_VALIDATE_URL) || strpos($ntfyBaseUrl, 'https://') !== 0) {
    $ntfyBaseUrl = 'https://ntfy.sh';
}
$ntfyToken = sanitize_ntfy_header_value(get_tsw_env('NTFY_TOKEN'));

if ($ntfyTopic !== '' && function_exists('curl_init')) {
    $safeTitleName = sanitize_ntfy_action_token(mb_substr($plainName, 0, 60));
    $ntfyLines = [];
    $ntfyActions = [];
    $titleParts = [$safeTitleName];

    $ntfyLines[] = "IMIĘ: {$plainName}";
    if ($hasPhone) {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        $dial = (strlen($digits) === 9) ? '+48' . $digits : '+' . $digits;
        $safePhoneLabel = sanitize_ntfy_action_token($phone);
        $ntfyLines[]   = "TELEFON: {$phone}";
        $titleParts[]  = "TEL: {$safePhoneLabel}";
        $ntfyActions[] = "view, Zadzwon ({$safePhoneLabel}), tel:{$dial}";
    }
    if ($hasEmail) {
        $safeEmailToken = sanitize_ntfy_action_token($email);
        $ntfyLines[]   = "E-MAIL: {$email}";
        $titleParts[]  = "EMAIL: {$safeEmailToken}";
        $ntfyActions[] = "view, Napisz e-mail ({$safeEmailToken}), mailto:{$safeEmailToken}";
    }
    $ntfyLines[] = 'TICKET: ' . ($ticketCreated ? "#{$ticketNum}" : 'brak');
    $ntfyLines[] = 'ŹRÓDŁO: Formularz twojastronawww.pl';
    $ntfyLines[] = '------------------------';
    $ntfyLines[] = 'Wiadomość:';
    $ntfyLines[] = $plainMessage;

    $ntfyActions[] = 'view, Otworz Helpdesk, https://hd.twojastronawww.pl/scp/';

    $rawNtfyTitle = 'Formularz (twojastronawww) - ' . implode(' | ', $titleParts);
    $ntfyHeaders = [
        'Title: ' . encode_rfc2047_subject($rawNtfyTitle),
        'Priority: high',
        'Tags: incoming_envelope,telephone_receiver',
        'Actions: ' . sanitize_ntfy_header_value(implode('; ', array_slice($ntfyActions, 0, 3))),
    ];
    if ($ntfyToken !== '') {
        $ntfyHeaders[] = 'Authorization: Bearer ' . $ntfyToken;
    }

    $chNtfy = curl_init("{$ntfyBaseUrl}/{$ntfyTopic}");
    curl_setopt_array($chNtfy, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => implode("\n", $ntfyLines),
        CURLOPT_HTTPHEADER     => $ntfyHeaders,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 3,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_MAXREDIRS      => 0,
    ]);
    if (defined('CURLPROTO_HTTPS')) {
        curl_setopt($chNtfy, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        curl_setopt($chNtfy, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
    }
    @curl_exec($chNtfy);
    unset($chNtfy);
}

// 11. Profesjonalny Autoresponder dla klienta (kodowanie Subject RFC 2047)
if ($hasEmail) {
    $autoSubject = encode_rfc2047_subject('Potwierdzenie otrzymania zgłoszenia — TwojaStronaWWW.pl');
    $autoBody  = "Cześć {$plainName},\n\n";
    $autoBody .= "Dziękuję za kontakt z TwojaStronaWWW.pl!\n";
    $autoBody .= "Twoje zgłoszenie dotarło do mnie bezpiecznie. Odezwę się najpóźniej w ciągu 24 godzin.\n\n";
    $autoBody .= "Podsumowanie Twojego zgłoszenia:\n";
    $autoBody .= "-----------------------------------------\n";
    if ($ticketCreated) {
        $autoBody .= "Numer zgłoszenia: #{$ticketNum}\n";
    }
    $autoBody .= "Telefon kontaktowy: {$phone}\n";
    $autoBody .= "Twoja wiadomość:\n{$plainMessage}\n";
    $autoBody .= "-----------------------------------------\n\n";
    if ($newsletterConsent === 'TAK') {
        $autoBody .= "PS. Odnotowałem również Twoją zgodę na otrzymywanie praktycznych wskazówek o automatyzacji i nowościach (możesz zrezygnować w każdej chwili, odpowiadając na tę wiadomość).\n\n";
    }
    $autoBody .= "Pozdrawiam serdecznie,\n";
    $autoBody .= "Krzysztof | TwojaStronaWWW.pl\n";
    $autoBody .= "https://twojastronawww.pl\n";

    $autoHeaders  = "From: TwojaStronaWWW <{$fromSender}>\r\n";
    $autoHeaders .= "Reply-To: {$fromSender}\r\n";
    $autoHeaders .= "MIME-Version: 1.0\r\n";
    $autoHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $safeRecipientEmail = (string)preg_replace('/[\r\n\x00-\x1F]+/', '', $email);
    @mail($safeRecipientEmail, $autoSubject, $autoBody, $autoHeaders, "-f{$fromSender}");
}

echo json_encode([
    'status' => 'success',
    'success' => true,
    'ticket' => $ticketCreated ? $ticketNum : null,
    'message' => $hasEmail
        ? 'Dziękujemy! Zgłoszenie wysłane. Sprawdź potwierdzenie na swojej skrzynce e-mail.'
        : 'Dziękujemy! Twój numer został przekazany — oddzwonię najszybciej jak to możliwe.',
]);

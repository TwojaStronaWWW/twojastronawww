<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
header("Content-Type: application/json; charset=UTF-8");

/**
 * Pobiera zmienną środowiskową z getenv(), $_ENV lub pliku .env poza webrootem
 */
function get_tsw_env(string $key, string $default = ''): string {
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return (string)$val;
    }
    if (!empty($_ENV[$key])) {
        return (string)$_ENV[$key];
    }
    $envPaths = [
        __DIR__ . '/../.env',
        __DIR__ . '/.env',
    ];
    foreach ($envPaths as $envPath) {
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
    }
    return $default;
}

// 0a. [REF-05] Zabezpieczenie OWASP Fetch Metadata (Sec-Fetch-Site) przed żądaniami Cross-Site
if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && strtolower(trim((string)$_SERVER['HTTP_SEC_FETCH_SITE'])) === 'cross-site') {
    http_response_code(403);
    echo json_encode([
        "status" => "error",
        "success" => false,
        "message" => "Niedozwolone żądanie międzywitrynowe (Cross-Site Request Blocked)."
    ]);
    exit;
}

// Rzeczywiste IP klienta (uwzględnienie Cloudflare Proxy Anycast)
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

// 0. Zabezpieczenie Rate Limiting (ISO 27001): maks. 5 prób wysyłki na 5 minut
if (!rate_limit('contact_' . md5($ip), 5, 300)) {
    http_response_code(429);
    echo json_encode([
        "status" => "error",
        "success" => false,
        "message" => "Zbyt wiele prób wysłania wiadomości. Odczekaj chwilę przed kolejną próbą."
    ]);
    exit;
}

$data = get_json_request();

// 1. Zabezpieczenie Anty-Bot: Wielopolowy Honeypot (pola pułapki ukryte CSS-em dla ludzi)
$honeypots = ['website_url', 'hp_chk', 'website', 'company_name', 'phone_extra'];
foreach ($honeypots as $hp) {
    if (!empty($data[$hp])) {
        echo json_encode([
            "status" => "success",
            "success" => true,
            "message" => "Dziękujemy! Twoja wiadomość została wysłana pomyślnie."
        ]);
        exit;
    }
}

// 2. Zabezpieczenie Anty-Bot: Pomiar czasu interakcji (minimalny czas wypełniania >= 2.0s, odrzucenie bool/NaN/Infinity)
if (isset($data['submission_seconds'])) {
    $rawSubSec = $data['submission_seconds'];
    $subSecFloat = (is_numeric($rawSubSec) && !is_bool($rawSubSec)) ? (float)$rawSubSec : 0.0;
    if (!is_finite($subSecFloat) || $subSecFloat < 2.0) {
        echo json_encode([
            "status" => "success",
            "success" => true,
            "message" => "Dziękujemy! Twoja wiadomość została wysłana pomyślnie."
        ]);
        exit;
    }
}

// 3. Strict Origin / Referer check
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';

if (!$origin && !$referer) {
    http_response_code(403);
    echo json_encode(["status" => "error", "success" => false, "message" => "Forbidden (Missing Origin/Referer)"]);
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
    http_response_code(403);
    echo json_encode(["status" => "error", "success" => false, "message" => "Forbidden Origin"]);
    exit;
}

// 4. CSRF Check
if (!csrf_check($data['csrf_token'] ?? '')) {
    @session_write_close();
    http_response_code(403);
    echo json_encode(["status" => "error", "success" => false, "message" => "Błąd zabezpieczeń (CSRF). Odśwież stronę."]);
    exit;
}

if (session_status() === PHP_SESSION_ACTIVE) {
    @session_write_close();
}

// Wczesne zwolnienie sesji PHP przed operacjami plikowymi i cURL (osTicket / Ntfy)
@session_write_close();

// 5. Oczyszczenie i normalizacja danych wejściowych
$name = isset($data['name']) ? htmlspecialchars(strip_tags(trim((string)$data['name'])), ENT_QUOTES, 'UTF-8') : '';
$email = isset($data['email']) ? filter_var(trim((string)$data['email']), FILTER_SANITIZE_EMAIL) : '';
$phoneRaw = isset($data['phone']) ? trim(strip_tags((string)$data['phone'])) : '';
$phone = preg_replace('/[^0-9+\-\s()]/', '', $phoneRaw) ?: '-';
$messageRaw = isset($data['message']) ? htmlspecialchars(strip_tags(trim((string)$data['message'])), ENT_QUOTES, 'UTF-8') : '';
$message = $messageRaw !== '' ? $messageRaw : '[Szybki kontakt — klient prosi o rozmowę bez opisu tekstowego]';
$newsletterConsent = !empty($data['newsletter_consent']) && $data['newsletter_consent'] !== 'false' && $data['newsletter_consent'] !== '0' ? 'TAK' : 'NIE';

$hasPhone = ($phone !== '-' && strlen(preg_replace('/\D/', '', $phone)) >= 7);
$hasEmail = ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false);

if (!$name || (!$hasPhone && !$hasEmail)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "success" => false,
        "message" => "Podaj imię oraz numer telefonu lub poprawny adres e-mail."
    ]);
    exit;
}

if ($email !== '' && !$hasEmail) {
    http_response_code(400);
    echo json_encode(["status" => "error", "success" => false, "message" => "Nieprawidłowy adres e-mail."]);
    exit;
}

// 6. Zabezpieczenie Anty-Spam: Wykrywanie cyrylicy oraz nadmiernej ilości odnośników URL
if (preg_match('/\p{Cyrillic}/u', $message) || preg_match_all('/https?:\/\//i', $message) > 2) {
    echo json_encode([
        "status" => "success",
        "success" => true,
        "message" => "Dziękujemy! Twoja wiadomość została wysłana pomyślnie."
    ]);
    exit;
}

// 7. Zapis finalnego leada przed wysyłką (Zero-Data-Loss)
save_lead([
    date('Y-m-d'),
    date('H:i:s'),
    $name,
    $hasEmail ? $email : '-',
    $message,
    hash('sha256', $ip),
    $phone,
    $newsletterConsent
], false);

$baseSubject = $messageRaw === ''
    ? "[TwojaStronaWWW.pl] SZYBKI TELEFON: $name ($phone)"
    : "[TwojaStronaWWW.pl] Nowe zapytanie: $name";

// 8. Rejestracja zgłoszenia w centralnym systemie ticketowym osTicket (hd.twojastronawww.pl)
$osTicketApiKey = get_tsw_env('OSTICKET_API_KEY');
$ticketCreated  = false;
$ticketNum      = 'BRAK';

if (!empty($osTicketApiKey) && function_exists('curl_init')) {
    $digits = preg_replace('/\D+/', '', $phone) ?: date('YmdHis');
    $ticketEmail = $hasEmail ? $email : "tel-{$digits}@twojastronawww.pl";
    $ticketPayload = [
        'name'        => html_entity_decode($name, ENT_QUOTES, 'UTF-8'),
        'email'       => $ticketEmail,
        'phone'       => $hasPhone ? $phone : '',
        'subject'     => html_entity_decode($baseSubject, ENT_QUOTES, 'UTF-8'),
        'message'     => "Imię i nazwisko: " . html_entity_decode($name, ENT_QUOTES, 'UTF-8') . "\n"
                       . "Telefon: " . ($hasPhone ? $phone : '-') . "\n"
                       . "E-mail: " . ($hasEmail ? $email : '-') . "\n"
                       . "Newsletter: $newsletterConsent\n"
                       . "-----------------------------------------\n"
                       . html_entity_decode($message, ENT_QUOTES, 'UTF-8'),
        'topicId'     => 10,
        'ip'          => $ip,
        'source'      => 'Web',
        'autorespond' => false,
        'send_email'  => false,
    ];

    $endpoints = [
        ['url' => 'http://hd.twojastronawww.pl:8080/ticket_hook.php', 'resolve' => ['hd.twojastronawww.pl:8080:127.0.0.1']],
        ['url' => 'https://hd.twojastronawww.pl/ticket_hook.php',     'resolve' => []],
    ];

    foreach ($endpoints as $ep) {
        $ch = curl_init($ep['url']);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Key: ' . $osTicketApiKey,
            'Content-Type: application/json',
            'Expect:'
        ]);
        if (!empty($ep['resolve'])) {
            curl_setopt($ch, CURLOPT_RESOLVE, $ep['resolve']);
        }
        curl_setopt($ch, CURLOPT_USERAGENT, 'TwojaStronaWWW-HelpdeskClient/2.0');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($ticketPayload, JSON_UNESCAPED_UNICODE));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 0);
        if (defined('CURLPROTO_HTTPS') && defined('CURLPROTO_HTTP')) {
            curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS | CURLPROTO_HTTP);
        }

        $apiResponse = @curl_exec($ch);
        if (is_string($apiResponse) && strlen($apiResponse) > 65536) {
            $apiResponse = substr($apiResponse, 0, 65536);
        }
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $resArr = is_string($apiResponse) ? json_decode($apiResponse, true) : null;
        if ($httpCode === 201 && !empty($resArr['success'])) {
            $ticketCreated = true;
            $ticketNum = (string)($resArr['number'] ?? 'OK');
            break;
        }
    }
}

// 9. Wysyłka scentralizowanego powiadomienia e-mail na poczatek.krzysztof@gmail.com
$centralEmail = get_tsw_env('CENTRAL_LEAD_EMAIL', 'poczatek.krzysztof@gmail.com');
$fromSender   = "kontakt@twojastronawww.pl";
$subject      = $baseSubject . ($ticketCreated ? " [Ticket #$ticketNum]" : "");

$body  = "Nowe zgłoszenie z formularza kontaktowego (TwojaStronaWWW.pl):\n";
$body .= "=========================================\n";
$body .= "Imię i nazwisko: " . html_entity_decode($name, ENT_QUOTES, 'UTF-8') . "\n";
$body .= "Telefon:         $phone\n";
$body .= "E-mail:          " . ($hasEmail ? $email : '-') . "\n";
$body .= "Ticket osTicket: " . ($ticketCreated ? "#$ticketNum (https://hd.twojastronawww.pl/scp/)" : "Brak") . "\n";
$body .= "Newsletter:      $newsletterConsent\n";
$body .= "Data:            " . date('Y-m-d H:i:s') . "\n";
$body .= "-----------------------------------------\n";
$body .= "Treść wiadomości:\n" . html_entity_decode($message, ENT_QUOTES, 'UTF-8') . "\n";

$headers  = "From: TwojaStronaWWW <$fromSender>\r\n";
if ($hasEmail) {
    $headers .= "Reply-To: $email\r\n";
}
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

@mail($centralEmail, $subject, $body, $headers, "-f$fromSender");

// 10. Powiadomienie Push na Ntfy.sh (z przyciskami akcji 1-Klik)
$ntfyTopic = get_tsw_env('NTFY_TOPIC');
if ($ntfyTopic !== '' && function_exists('curl_init')) {
    $cleanName = html_entity_decode($name, ENT_QUOTES, 'UTF-8');
    $cleanMsg  = html_entity_decode($message, ENT_QUOTES, 'UTF-8');
    $ntfyLines = [];
    $ntfyActions = [];
    $titleParts = [$cleanName];

    $ntfyLines[] = "👤 IMIĘ: {$cleanName}";
    if ($hasPhone) {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        $dial = (strlen($digits) === 9) ? '+48' . $digits : '+' . $digits;
        $ntfyLines[]   = "📞 TELEFON: {$phone}";
        $titleParts[]  = "TEL: {$phone}";
        $ntfyActions[] = "view, Zadzwon ({$phone}), tel:{$dial}";
    }
    if ($hasEmail) {
        $ntfyLines[]   = "✉️ E-MAIL: {$email}";
        $titleParts[]  = "EMAIL: {$email}";
        $ntfyActions[] = "view, Napisz e-mail ({$email}), mailto:{$email}";
    }
    $ntfyLines[] = "🎫 TICKET: " . ($ticketCreated ? "#{$ticketNum}" : "brak");
    $ntfyLines[] = "🌐 ŹRÓDŁO: Formularz twojastronawww.pl";
    $ntfyLines[] = "────────────────────────";
    $ntfyLines[] = "💬 Wiadomość:";
    $ntfyLines[] = $cleanMsg;

    $ntfyActions[] = "view, Otworz Helpdesk, https://hd.twojastronawww.pl/scp/";

    $ntfyHeaders = [
        'Title: Formularz (twojastronawww) - ' . implode(' | ', $titleParts),
        'Priority: high',
        'Tags: incoming_envelope,telephone_receiver',
        'Actions: ' . implode('; ', array_slice($ntfyActions, 0, 3))
    ];

    $chNtfy = curl_init("https://ntfy.sh/{$ntfyTopic}");
    curl_setopt_array($chNtfy, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => implode("\n", $ntfyLines),
        CURLOPT_HTTPHEADER     => $ntfyHeaders,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 3,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_MAXREDIRS      => 0
    ]);
    if (defined('CURLPROTO_HTTPS')) {
        curl_setopt($chNtfy, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
    }
    @curl_exec($chNtfy);
    curl_close($chNtfy);
}

// 11. Profesjonalny Autoresponder dla klienta (gdy podał e-mail)
if ($hasEmail) {
    $autoSubject = "Potwierdzenie otrzymania zgłoszenia — TwojaStronaWWW.pl";
    $autoBody  = "Cześć " . html_entity_decode($name, ENT_QUOTES, 'UTF-8') . ",\n\n";
    $autoBody .= "Dziękuję za kontakt z TwojaStronaWWW.pl!\n";
    $autoBody .= "Twoje zgłoszenie dotarło do mnie bezpiecznie. Odezwę się najpóźniej w ciągu 24 godzin.\n\n";
    $autoBody .= "Podsumowanie Twojego zgłoszenia:\n";
    $autoBody .= "-----------------------------------------\n";
    if ($ticketCreated) {
        $autoBody .= "Numer zgłoszenia: #$ticketNum\n";
    }
    $autoBody .= "Telefon kontaktowy: $phone\n";
    $autoBody .= "Twoja wiadomość:\n" . html_entity_decode($message, ENT_QUOTES, 'UTF-8') . "\n";
    $autoBody .= "-----------------------------------------\n\n";
    if ($newsletterConsent === 'TAK') {
        $autoBody .= "PS. Odnotowałem również Twoją zgodę na otrzymywanie praktycznych wskazówek o automatyzacji i nowościach (możesz zrezygnować w każdej chwili, odpowiadając na tę wiadomość).\n\n";
    }
    $autoBody .= "Pozdrawiam serdecznie,\n";
    $autoBody .= "Krzysztof | TwojaStronaWWW.pl\n";
    $autoBody .= "https://twojastronawww.pl\n";

    $autoHeaders  = "From: TwojaStronaWWW <$fromSender>\r\n";
    $autoHeaders .= "Reply-To: $fromSender\r\n";
    $autoHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";

    @mail($email, $autoSubject, $autoBody, $autoHeaders, "-f$fromSender");
}

echo json_encode([
    "status" => "success",
    "success" => true,
    "ticket" => $ticketCreated ? $ticketNum : null,
    "message" => $hasEmail
        ? "Dziękujemy! Zgłoszenie wysłane. Sprawdź potwierdzenie na swojej skrzynce e-mail."
        : "Dziękujemy! Twój numer został przekazany — oddzwonię najszybciej jak to możliwe."
]);

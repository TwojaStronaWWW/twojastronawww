<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
header("Content-Type: application/json; charset=UTF-8");

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

// 2. Zabezpieczenie Anty-Bot: Pomiar czasu interakcji (minimalny czas wypełniania >= 2.0s)
if (isset($data['submission_seconds']) && (float)$data['submission_seconds'] < 2.0) {
    echo json_encode([
        "status" => "success",
        "success" => true,
        "message" => "Dziękujemy! Twoja wiadomość została wysłana pomyślnie."
    ]);
    exit;
}

// 3. Strict Origin / Referer check
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';

if (!$origin && !$referer) {
    http_response_code(403);
    echo json_encode(["status" => "error", "success" => false, "message" => "Forbidden (Missing Origin/Referer)"]);
    exit;
}

$allowedDomains = ['twojastronawww.pl', 'localhost', '127.0.0.1'];
$isAllowed = false;

$sourceUrl = $origin ?: $referer;
foreach ($allowedDomains as $domain) {
    if (strpos($sourceUrl, $domain) !== false) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(["status" => "error", "success" => false, "message" => "Forbidden Origin"]);
    exit;
}

// 4. CSRF Check
if (!csrf_check($data['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(["status" => "error", "success" => false, "message" => "Błąd zabezpieczeń (CSRF). Odśwież stronę."]);
    exit;
}

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

$to = "kontakt@twojastronawww.pl";
$subject = $messageRaw === '' ? "SZYBKI TELEFON z TwojaStronaWWW: $name ($phone)" : "Nowe zapytanie z TwojaStronaWWW: $name";

$body  = "Nowe zgłoszenie z formularza kontaktowego:\n";
$body .= "=========================================\n";
$body .= "Imię i nazwisko: $name\n";
$body .= "Telefon:         $phone\n";
$body .= "E-mail:          " . ($hasEmail ? $email : '-') . "\n";
$body .= "Newsletter:      $newsletterConsent\n";
$body .= "Data:            " . date('Y-m-d H:i:s') . "\n";
$body .= "-----------------------------------------\n";
$body .= "Treść wiadomości:\n$message\n";

$headers  = "From: TwojaStronaWWW <$to>\r\n";
if ($hasEmail) {
    $headers .= "Reply-To: $email\r\n";
}
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

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

@mail($to, $subject, $body, $headers);

// 8. Profesjonalny Autoresponder dla klienta (gdy podał e-mail)
if ($hasEmail) {
    $autoSubject = "Potwierdzenie otrzymania zgłoszenia — TwojaStronaWWW.pl";
    $autoBody  = "Cześć $name,\n\n";
    $autoBody .= "Dziękuję za kontakt z TwojaStronaWWW.pl!\n";
    $autoBody .= "Twoje zgłoszenie dotarło do mnie bezpiecznie. Odezwę się najpóźniej w ciągu 24 godzin.\n\n";
    $autoBody .= "Podsumowanie Twojego zgłoszenia:\n";
    $autoBody .= "-----------------------------------------\n";
    $autoBody .= "Telefon kontaktowy: $phone\n";
    $autoBody .= "Twoja wiadomość:\n$message\n";
    $autoBody .= "-----------------------------------------\n\n";
    if ($newsletterConsent === 'TAK') {
        $autoBody .= "PS. Odnotowałem również Twoją zgodę na otrzymywanie praktycznych wskazówek o automatyzacji i nowościach (możesz zrezygnować w każdej chwili, odpowiadając na tę wiadomość).\n\n";
    }
    $autoBody .= "Pozdrawiam serdecznie,\n";
    $autoBody .= "Krzysztof | TwojaStronaWWW.pl\n";
    $autoBody .= "https://twojastronawww.pl\n";

    $autoHeaders  = "From: TwojaStronaWWW <$to>\r\n";
    $autoHeaders .= "Reply-To: $to\r\n";
    $autoHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";

    @mail($email, $autoSubject, $autoBody, $autoHeaders);
}

echo json_encode([
    "status" => "success",
    "success" => true,
    "message" => $hasEmail
        ? "Dziękujemy! Zgłoszenie wysłane. Sprawdź potwierdzenie na swojej skrzynce e-mail."
        : "Dziękujemy! Twój numer został przekazany — oddzwonię najszybciej jak to możliwe."
]);

<?php
declare(strict_types=1);

/**
 * Endpoint-Pułapka na Złośliwe Boty i Skanery Podatności (Active Bot Trap / Honeypot Link).
 *
 * Działanie:
 * - Ścieżka `/api/bot-trap.php` jest jawnie zakazana w `/robots.txt` (`Disallow: /api/bot-trap.php`)
 *   oraz ukryta dla ludzi i czytników ekranu (`aria-hidden="true"`, `tabindex="-1"`, `data-bot-trap`).
 * - Uczciwe przeglądarki użytkowników oraz boty przestrzegające `robots.txt` nigdy tu nie wchodzą.
 * - Agresywne skanery i scrapery ignorujące `robots.txt` po wejściu w pułapkę otrzymują
 *   natychmiastowego bana IP na 15 minut w `api/rate-limit.php` (Zero-PII SHA-256 Penalty Box).
 */

require_once __DIR__ . '/rate-limit.php';

@session_write_close();

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: no-store, no-cache, must-revalidate');

// Ignoruj automatyczne żądania prefetch/prerender przeglądarek, jeśli jakimś cudem ominęły regułę Speculation Rules
$secPurpose = strtolower((string)($_SERVER['HTTP_SEC_PURPOSE'] ?? $_SERVER['HTTP_PURPOSE'] ?? ''));
if (str_contains($secPurpose, 'prefetch') || str_contains($secPurpose, 'prerender')) {
    http_response_code(204);
    exit;
}

// Nałóż 15-minutową blokadę IP (900s) we wszystkich akcjach chronionych przez Penalty Box
ban_client_ip('bot_trap', 900);
ban_client_ip('contact', 900);

http_response_code(403);
echo json_encode([
    'status' => 'error',
    'code' => 'BOT_TRAP_TRIGGERED',
    'message' => 'Automated scanner detected. IP placed in 15-minute Penalty Box.',
], JSON_UNESCAPED_UNICODE);

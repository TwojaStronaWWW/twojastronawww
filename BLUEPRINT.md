# BLUEPRINT INŻYNIERYJNY — TWOJASTRONAWWW.PL (WERSJA 2.3.1 / 2026)

Niniejszy dokument definiuje architekturę referencyjną serwisu **TwojaStronaWWW.pl** zsynchronizowaną z warstwą **Platform Core (`_site-template` v2.3.1)**, zaprojektowaną z myślą o błyskawicznym wdrożeniu (PageSpeed 98–100/100), odporności na awarie (Zero-Downtime), zgodności z normami **ISO/IEC 27001**, **OWASP ASVS v4.0.3**, **RODO (GDPR)** oraz **WCAG 2.2 AA / EAA 2025**.

---

## 1. Filozofia Architektoniczna: Platform-First, Zero-Bloat & Separation of Concerns

1. **Brak ciężkich frameworków i baz danych SQL (Benchmark Nolana Lawsona 2026):**
   - Zamiast ociężałych systemów CMS (WordPress) i frameworków SPA (Next.js / React), serwis wykorzystuje czysty **HTML5**, nowoczesny **CSS3** (zmienne CSS, `clamp()`, Grid/Flexbox) oraz natywny **JavaScript ES6+ (`type="module"`)**.
   - **Twardy dowód wydajnościowy (Nolan Lawson, 2026):** Architektura Vanilla JS generuje zaledwie ok. **`7 KiB` JS i `0 ms` Total Blocking Time (TBT)**, w porównaniu do ok. **`142 KiB` JS oraz `2 090 ms` LCP** w aplikacjach Next.js.
   - Brak bazy danych MySQL/PostgreSQL na froncie eliminuje całą klasę ataków *SQL Injection*, wycieków poświadczeń bazy oraz przestojów spowodowanych przeciążeniem puli połączeń.
2. **100% Analityka Cookieless RODO Zero-PII vs GA4 (Raport Moz 2026):**
   - **Twardy dowód biznesowy (Moz, 2026):** Standardowe instalacje Google Analytics 4 (GA4) tracą średnio **`63,8%` sesji oraz `72,7%` konwersji** z powodu odrzucania banerów cookies.
   - Nasza bezciasteczkowa telemetria RODO Zero-PII (`POST /analytics` w `assets/js/ai-widget.js`) nie używa plików cookies ani nie zapisuje adresów IP na dysku (dzienny skrót SHA-256 z solą w RAM), dzięki czemu rejestruje **`100%` sesji i konwersji** bez wyświetlenia banerów zgody.
3. **Ścisłe Rozdzielenie Odpowiedzialności (Strict Separation of Concerns):**
   - **Formularz Kontaktowy (`api/contact.php` + `api/leads-store.php` + `assets/js/contact.js`):** odpowiada za walidację, ochronę anty-spamową, zapis leadów do chronionego pliku CSV (`flock LOCK_EX`) oraz wysyłkę e-mail / powiadomienia Push (Ntfy.sh). Działa w 100% niezależnie od modułu AI.
   - **Uniwersalny Asystent AI (`assets/js/ai-widget.js`):** samowystarczalny komponent ES6 (Single Source of Truth) komunikujący się z centralnym routerem AI na VPS (`https://ai.twojastronawww.pl/chat-router.php`) z kaskadą 15 modeli LLM u 7 dostawców oraz dwupoziomowym Response Cache (`< 5 ms`).
   - **Izolacja Konfiguracji Tenanta (`assets/data/ai-config.json`):** wszystkie parametry klienta (`enabled`, `siteId`, `title`, `quickPrompts`, `theme`, `fallbackFaq`) są odseparowane od silnika JS.

---

## 2. Mapa Warstw Bezpieczeństwa (Defense-in-Depth — ISO 27001 & OWASP)

| Warstwa | Mechanizm Ochronny | Plik / Lokalizacja | Cel i Mitygacja Ryzyka |
| :--- | :--- | :--- | :--- |
| **L1: Sieć i Serwer HTTP** | Wymuszenie HTTPS + HSTS (`max-age=63072000; includeSubDomains; preload`) | `.htaccess` | Ochrona przed podsłuchem (MITM) i SSL Stripping. |
| **L2: Izolacja Przeglądarki** | `Content-Security-Policy` (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` | `.htaccess` | Blokada wstrzyknięć XSS, Clickjackingu, MIME Sniffingu i nieautoryzowanego dostępu do kamery/mikrofonu. |
| **L3: Ochrona Plików Wrażliwych** | Reguła `FilesMatch` blokująca `.env`, `.csv`, `.log`, `.md`, `.json`, `.sh`, `.yml`, `.lock`, `composer.*`, `package*.json` | `.htaccess` + `storage/.htaccess` | Uniemożliwienie pobrania bazy leadów, logów, konfiguracji lub kluczy z zewnątrz (HTTP 403/404). |
| **L4: Ochrona Formularza, WAF L7 & Bot Trap** | Token CSRF (`hash_equals` w stałym czasie) + `Sec-Fetch-Site` + Honeypot (`website_url`) + Czas wypełniania (`>= 2s`) + WAF L7 (`<iframe srcdoc=...>`, `mathlive#virtual-keyboard-message`) + Zero-PII Rate Limiter (`5 req/min` + 15-min Penalty Box) + `/api/bot-trap.php` | `api/csrf.php`, `api/rate-limit.php`, `api/bot-trap.php`, `api/contact.php`, `api/pii-guard.php` | Eliminacja botów spamujących, skanerów podatności, ataków CSRF, XSS/SQLi/Prompt Injection, wycieku PESEL/adresów oraz przeciążenia zasobów (DoS). |
| **L5: Integralność Zapisu Danych** | Wyłączna blokada plikowa `flock($fp, LOCK_EX)` + neutralizacja CSV Injection (`sanitize_csv_field`) + Off-Site Backup do prywatnego R2 | `api/leads-store.php`, `api/PrivateStorageService.php`, `api/R2Client.php` | Ochrona przed uszkodzeniem pliku przy równoległych zapisach (Race Condition) oraz przed wykonaniem makr w programie Excel/LibreCalc. |
| **L6: Kontrola Jakości (CI/CD & Git Hooks)** | Lokalny `pre-commit` (blokada sekretów + `npm test`), `commit-msg` (Conventional Commits) oraz potok GitHub Actions | `.githooks/*`, `.github/workflows/ci.yml`, `tests/lint_php.php` | Żaden kod z błędem składniowym, wyciekiem klucza API lub niedziałającym testem nie trafi na produkcję. |

---

## 3. Standardy SEO, GEO i W3C WebMCP (`[REF-07]` & `[REF-08]`)

1. **Plik `/llms.txt` i `<link rel="alternate" type="text/markdown">`:** ustrukturyzowany opis oferty, cennika, benchmarków (Nolan Lawson 2026, Moz 2026) i przewag technologicznych dla zewnętrznych wyszukiwarek AI (ChatGPT Search, Perplexity, Claude, Google AI Overviews).
2. **Dwuwarstwowy Standard W3C WebMCP (`https://webmachinelearning.github.io/webmcp/`):**
   - **Warstwa imperatywna (`document.modelContext`):** rejestracja narzędzia `ask_site_assistant` w `assets/js/ai-widget.js` (`registerWebMcpTools`), pozwalająca natywnym agentom przeglądarkowym (Chrome 149+) zadawać pytania asystentowi AI serwisu.
   - **Warstwa deklaratywna (`<form id="contactForm" toolname="send_contact_inquiry">`):** opisanie pól formularza atrybutami `toolparamdescription` (bez `toolautosubmit`, aby przeglądarka zawsze wymagała potwierdzenia użytkownika) oraz obsługa `SubmitEvent.agentInvoked` i `e.respondWith(...)` w `assets/js/contact.js` i `assets/js/main.js`.
3. **Speculation Rules API (`[REF-02]`):** natychmiastowa nawigacja (`0 ms`) pomiędzy podstronami z wykluczeniem `/api/*`, `/admin/*` oraz selektorów `[aria-hidden="true"], [data-bot-trap]`.

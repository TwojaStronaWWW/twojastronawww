# SYSTEM PROMPT & WYTYCZNE PROJEKTU: TWOJASTRONAWWW.PL

## 1. KONTEKST I PRZEZNACZENIE PROJEKTU
**TwojaStronaWWW.pl** — oficjalny serwis firmowy marki **TwojaStronaWWW (Krzysztof Początek)** oraz silnik pozyskiwania leadów B2B (CRM Flat-File).
- Łączy ultra-lekki front-end (Vanilla JS ES6+, Vanilla CSS Tokens, semantyczny HTML5) z utwardzonym backendem PHP (`api/contact.php`, `api/csrf.php`, `api/rate-limit.php`, `api/pii-guard.php`, `api/bot-trap.php`, `api/leads-store.php`, `api/R2Client.php`, `api/MediaService.php`, `api/PrivateStorageService.php`) i centralnym Asystentem AI (`site_id: twojastronawww`).

---

## 2. STRUKTURA KLUCZOWYCH PLIKÓW PROJEKTU
- **Widoki HTML5:** `index.html` (prezentacja oferty, cennik, porównanie z WordPressem i formularz leadów `#contactForm` z deklaratywnym WebMCP `toolname="send_contact_inquiry"`) oraz `jak-pracuje.html` (proces współpracy, SLA i gwarancje).
- **Warstwa UI i Backend:** `assets/css/style.css`, `assets/js/main.js`, `assets/js/contact.js`, `assets/js/ai-widget.js`, `api/contact.php` (zapis leadów CSV z `flock(LOCK_EX)`, jednorazowy token CSRF, walidacja `Origin`/`Referer`/`Sec-Fetch-Site`, Zero-PII rate-limiting IP, WAF L7 blokujący `<iframe srcdoc=...>` i `mathlive#virtual-keyboard-message`).
- **Testy i Jakość:** `tests/lint_php.php`, `tests/unit/contact-js.test.js`, `tests/unit/html-integrity.test.js`, `tests/unit/repo-hygiene.test.js`, `tests/unit/security-hardening.test.js`, `tests/unit/ai-widget.test.js` (`npm run check`).

---

## 3. REGUŁY GLOBALNE I EVERGREEN WEB STANDARDS (`[REF-01]` do `[REF-08]`)
Obowiązują globalne reguły inżynieryjne pakietu `tsw-enterprise` (`rules/AGENTS.md`: SoC Zero-Inline, ISO 27001 KeePass-First, `LOCK_EX`, `node:test`, zasada Anti-Jargon w treściach dla klientów, język polski, Tabela Analizy, Conventional Commits) oraz rejestr `docs/WEB_STANDARDS_RADAR.md`:
- **`[REF-01]` Server & `.htaccess` (`h5bp/server-configs-apache`):** kompresja `mod_brotli` + `mod_deflate`, nagłówki `COOP` (`same-origin-allow-popups`), `CORP` (`same-site`), `CSP`, `HSTS` oraz typy MIME (`avif`, `webp`, `md`, `webmanifest`).
- **`[REF-02]` Kolejność `<head>` i Nawigacja `0 ms` (`rviscomi/capo.js` & `web.dev/baseline`):** `charset` -> `viewport` -> `title` -> `preconnect` -> `stylesheet` przed meta SEO/JSON-LD oraz deklaratywne `<script type="speculationrules">` (prerender z wykluczeniem `/api/*` oraz selektorów `[aria-hidden="true"], [data-bot-trap]`).
- **`[REF-03]` Vanilla CSS Baseline (`argyleink/open-props` & `web.dev/baseline`):** `color-scheme: dark light` w `:root`, `scrollbar-gutter: stable` na `html`, `@view-transition { navigation: auto; }`, `text-wrap: balance` i `text-wrap: pretty`.
- **`[REF-04]` Dostępność WCAG 2.2 (`w3c/aria-practices` & `alphagov/govuk-frontend`):** `.skip-link`, role ARIA (`alert`, `status`), pełna obsługa klawiatury.
- **`[REF-05]` Bezpieczeństwo Aplikacji (`OWASP/ASVS` & `OWASP/CheatSheetSeries`):** walidacja nagłówka `Sec-Fetch-Site`, tokeny CSRF `hash_equals`, `flock(LOCK_EX)`, `@session_write_close()`, `CURLOPT_FOLLOWLOCATION => false`, `CURLPROTO_HTTPS`, WAF L7 (`<iframe srcdoc=...>`, `mathlive#virtual-keyboard-message`), `api/pii-guard.php` oraz aktywny Bot Trap (`api/bot-trap.php`, zakazany w `robots.txt`).
- **`[REF-06]` Polityka Podatności RFC 9116 (`securitytxt.org`):** plik `/.well-known/security.txt` z aktywną datą `Expires:`.
- **`[REF-07]` Optymalizacja dla Wyszukiwarek i Agentów AI – GEO & WebMCP (`llmstxt.org` & `webmachinelearning.github.io/webmcp/`):** plik `/llms.txt` podpięty w `<head>` (`rel="alternate" type="text/markdown"`) i dozwolony w `robots.txt` (`Allow: /llms.txt`), oraz dwuwarstwowa obsługa **W3C WebMCP** (`document.modelContext` -> `ask_site_assistant` w `assets/js/ai-widget.js` i deklaratywne `toolname="send_contact_inquiry"` na `<form id="contactForm">` z obsługą `SubmitEvent.agentInvoked` i `e.respondWith(...)`).
- **`[REF-08]` SEO On-Page & Schema.org (`schema.org` & `indexnow.org`):** pełny graf `@graph` JSON-LD, przekierowanie `301` non-www oraz `data-nosnippet` na widgecie AI.

---

## 4. TWARDE DANE RYNKOWE I BENCHMARKI B2B (2026)
- **Benchmark Wydajności Frameworków (Nolan Lawson, 2026):** Czysty kod Vanilla JS dostarcza zaledwie ok. **`7 KiB` JS i `0 ms` Total Blocking Time (TBT)**, podczas gdy aplikacje oparte na ciężkich frameworkach pokroju Next.js / React generują ok. **`142 KiB` JS oraz `2 090 ms` LCP** na starcie.
- **Utrata Danych w GA4 przez Banery Cookies (Raport Moz, 2026):** Standardowe wdrożenia Google Analytics 4 (GA4) tracą średnio **`63,8%` sesji oraz `72,7%` konwersji** na skutek odrzucania banerów cookies i blokerów śledzenia. Nasza bezciasteczkowa analityka **Cookieless RODO Zero-PII** mierzy **`100%` realnego ruchu i konwersji** bez banerów zasłaniających ekran.

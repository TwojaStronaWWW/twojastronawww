# SYSTEM PROMPT & WYTYCZNE PROJEKTU: TWOJASTRONAWWW.PL

## 1. KONTEKST I PRZEZNACZENIE PROJEKTU
**TwojaStronaWWW.pl** — oficjalny serwis firmowy marki **TwojaStronaWWW (Krzysztof Początek)** oraz silnik pozyskiwania leadów B2B (CRM Flat-File).
- Łączy ultra-lekki front-end (Vanilla JS ES6+, Vanilla CSS Tokens, semantyczny HTML5) z utwardzonym backendem PHP (`api/contact.php`, `api/csrf.php`, `api/get-csrf-token.php`, `api/config.php`) i centralnym Asystentem AI (`site_id: twojastronawww`).

---

## 2. STRUKTURA KLUCZOWYCH PLIKÓW PROJEKTU
- **Widoki HTML5:** `index.html` (prezentacja oferty, cennik, porównanie z WordPressem i formularz leadów) oraz `jak-pracuje.html` (proces współpracy, SLA i gwarancje).
- **Warstwa UI i Backend:** `assets/css/style.css`, `assets/js/main.js`, `assets/js/contact.js`, `api/contact.php` (zapis leadów CSV z `flock(LOCK_EX)`, jednorazowy token CSRF, walidacja `Origin`/`Referer`/`Sec-Fetch-Site`, rate-limiting IP).
- **Testy i Jakość:** `tests/unit/contact-flow.test.js`, `tests/unit/html-integrity.test.js`, `tests/unit/repo-hygiene.test.js` (`npm run check`).

---

## 3. REGUŁY GLOBALNE I EVERGREEN WEB STANDARDS (`[REF-01]` do `[REF-08]`)
Obowiązują globalne reguły inżynieryjne pakietu `tsw-enterprise` (`rules/AGENTS.md`: SoC Zero-Inline, ISO 27001 KeePass-First, `LOCK_EX`, `node:test`, zasada Anti-Jargon w treściach dla klientów, język polski, Tabela Analizy, Conventional Commits) oraz rejestr `docs/WEB_STANDARDS_RADAR.md`:
- **`[REF-01]` Server & `.htaccess` (`h5bp/server-configs-apache`):** kompresja `mod_brotli` + `mod_deflate`, nagłówki `COOP` (`same-origin-allow-popups`), `CORP` (`same-site`), `CSP`, `HSTS` oraz typy MIME (`avif`, `webp`, `md`, `webmanifest`).
- **`[REF-02]` Kolejność `<head>` i Nawigacja `0 ms` (`rviscomi/capo.js` & `web.dev/baseline`):** `charset` -> `viewport` -> `title` -> `preconnect` -> `stylesheet` przed meta SEO/JSON-LD oraz deklaratywne `<script type="speculationrules">` (prerender z wykluczeniem `/api/*`).
- **`[REF-03]` Vanilla CSS Baseline (`argyleink/open-props` & `web.dev/baseline`):** `color-scheme: dark light` w `:root`, `scrollbar-gutter: stable` na `html`, `@view-transition { navigation: auto; }`, `text-wrap: balance` i `text-wrap: pretty`.
- **`[REF-04]` Dostępność WCAG 2.2 (`w3c/aria-practices` & `alphagov/govuk-frontend`):** `.skip-link`, role ARIA (`alert`, `status`), pełna obsługa klawiatury.
- **`[REF-05]` Bezpieczeństwo Aplikacji (`OWASP/ASVS` & `OWASP/CheatSheetSeries`):** walidacja nagłówka `Sec-Fetch-Site`, tokeny CSRF `hash_equals`, `flock(LOCK_EX)`, `@session_write_close()`, `CURLOPT_FOLLOWLOCATION => false`, `CURLPROTO_HTTPS`.
- **`[REF-06]` Polityka Podatności RFC 9116 (`securitytxt.org`):** plik `/.well-known/security.txt` z aktywną datą `Expires:`.
- **`[REF-07]` Optymalizacja dla Wyszukiwarek AI – GEO (`llmstxt.org`):** plik `/llms.txt` podpięty w `<head>` (`rel="alternate" type="text/markdown"`) i dozwolony w `robots.txt` (`Allow: /llms.txt`).
- **`[REF-08]` SEO On-Page & Schema.org (`schema.org` & `indexnow.org`):** pełny graf `@graph` JSON-LD, przekierowanie `301` non-www oraz `data-nosnippet` na widgecie AI.

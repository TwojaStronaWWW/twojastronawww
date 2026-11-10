# Polityka Bezpieczeństwa (ISO/IEC 27001, OWASP ASVS & RFC 9116)

Projekt **TwojaStronaWWW.pl** utrzymywany jest w reżimie bezpieczeństwa **Zero-Bloat & Defense-in-Depth** zgodnym z wytycznymi **ISO/IEC 27001**, **OWASP ASVS v4.0** oraz **RODO (GDPR)**.

## Zgłaszanie Podatności (Responsible Disclosure — RFC 9116)

Jeśli odkryjesz potencjalną lukę w zabezpieczeniach serwisu lub jego modułów API:
1. **Nie publikuj zgłoszenia w publicznym Issue na GitHubie.**
2. Prześlij opis techniczny i kroki reprodukcji bezpośrednio na adres: **kontakt@twojastronawww.pl** (szczegóły w pliku [`/.well-known/security.txt`](./.well-known/security.txt)).
3. Potwierdzamy odbiór zgłoszenia w ciągu **24 godzin** i wdrażamy łatkę bezpieczeństwa dla błędów krytycznych (P0/P1) w trybie priorytetowym.

## Architektura Zabezpieczeń (Threat Protection)

- **Zero-SQL & Flat-File Isolation:** Brak bazy SQL eliminuje klasę ataków SQL Injection. Magazyny danych (`api/leads_*.csv`, `api/sessions/`, `api/rate_limits/`) chronione są blokadami plikowymi `flock(LOCK_EX / LOCK_SH)`, wczesnym zwalnianiem sesji `@session_write_close()` oraz regułami Apache (`Require all denied`).
- **WAF Warstwy 7 & 15-Minutowy IP Penalty Box:** Żądania zawierające wektory XSS, SQLi, Path Traversal, Null-Byte lub Wrapper Injection (`phar://`, `php://`, `expect://`) są natychmiast odrzucane (`HTTP 403`), a adres IP trafia na 15 minut do `ban_client_ip()`.
- **Ochrona Panelu Admina i Endpointów Leadów (`api/`):**
  - Logowanie chronione przez `password_verify()` (Bcrypt), opcjonalny `ADMIN_PIN` z `.env` (`hash_equals()`), limit prób oraz 15-minutowy IP Penalty Box.
  - Wylogowanie i usuwanie leadów wymagają metody `POST`, nagłówka `Sec-Fetch-Site` (blokada `cross-site`) oraz jednorazowego lub sesyjnego tokena CSRF (`hash_equals()`).
  - Eksport CSV wymaga aktywnej sesji z kontrolą `SESSION_TTL` (brak przekazywania sekretów w URL) i neutralizuje CSV Formula Injection (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **RODO & Zero-PII Telemetry:** Adresy IP w licznikach rate-limit, logach i zgłoszeniach są maskowane (`mask_ip()`), a nazwy plików liczników używają skrótu `rate_<akcja>_<sha256>.json` bez zapisywania oktetów IP na dysku.
- **Supply Chain Security:** Wyłączone skrypty instalacyjne npm (`.npmrc`: `ignore-scripts=true`, `min-release-age=7`), automatyczny skaner sekretów Gitleaks w pre-commit i CI oraz niezależna bramka audytu PR (`AI Security Review Gate` z weryfikacją `author_association`).

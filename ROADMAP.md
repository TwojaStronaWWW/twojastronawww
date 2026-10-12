# 🗺️ ROADMAP: TwojaStronaWWW.pl

## 🎯 Wizja Projektu
Nowoczesna, bezkompromisowo szybka strona firmowa oraz niezawodny, bezpieczny silnik zbierania leadów z automatyzacją procesów.

---

## 🚀 Sprint 1: Enterprise Blueprint & Higiena Bezpieczeństwa (Status: Zrealizowany)
- [x] Oczyszczenie indeksu git z plików tymczasowych sesji PHP (`api/sessions`) i liczników rate-limitera.
- [x] Wdrożenie reguł `.gitignore` oraz `.gitattributes` (normalizacja LF).
- [x] Utworzenie `AGENTS.md` i `GEMINI.md` z wytycznymi bezpieczeństwa ISO 27001.
- [x] Wdrożenie git hooks (`.githooks/pre-commit` i `commit-msg`).
- [x] Konfiguracja package.json z bezbibliotecznymi testami `node:test` oraz serwerem `scripts/serve.js`.
- [x] Wdrożenie potoku GitHub Actions CI/CD (`.github/workflows/deploy.yml`) z Quality Gate (`test`, `audit`, `deploy`, `concurrency`).
- [x] Wdrożenie testów integralności HTML5 oraz higieny repozytorium.
- [x] Dodanie odznak statusowych w `README.md` (Pipeline, Tests, Coverage, Lighthouse, Dependabot, ISO 27001).
- [x] Dodanie szablonów zgłoszeń GitHub (`.github/ISSUE_TEMPLATE`) i Dependabot.

---

## 🛡️ Sprint 2: SEO, PWA & Wydajność (Status: W trakcie / Etap 1 Zrealizowany)
- [x] Dodanie dedykowanych plików `robots.txt`, `sitemap.xml` oraz manifestu PWA (`site.webmanifest`).
- [x] Wdrożenie ustrukturyzowanych danych Schema.org (WebSite, ProfessionalService, WebPage) w `index.html` i `jak-pracuje.html`.
- [ ] Optymalizacja Web Vitals pod kątem wyników Lighthouse > 95 we wszystkich kategoriach.

---

## 🔒 Sprint 3: Panel Administracyjny & Content Security Policy (CSP)
- [ ] Wdrożenie pełnych nagłówków Content-Security-Policy (CSP) w `bootstrap.php`.
- [ ] Bezpieczny moduł rotacji klucza PIN panelu administracyjnego.
- [ ] Integracja powiadomień webhook (np. Telegram / E-mail via SMTP z fallbackiem).

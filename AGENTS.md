# SYSTEM PROMPT & WYTYCZNE PROJEKTU: TWOJASTRONAWWW.PL

## 1. ROLA I KONTEKST
Repozytorium to oficjalna witryna firmowa oraz silnik leadów TwojaStronaWWW.pl.
Łączy nowoczesny, lekki front-end (Vanilla JS, CSS, semantyczny HTML5) z bezpiecznym backendem API w PHP (ochrona CSRF, strict Origin/Referer, rate-limiting, deterministyczny CRM leadów CSV chroniony LOCK_EX).

---

## 2. STANDARDY ARCHITEKTURY I BEZPIECZEŃSTWA (ISO 27001)
1. **Bezpieczeństwo sesji i danych**:
   - Sesje PHP i liczniki rate-limitera NIGDY nie mogą być śledzone przez git (reguły w `.gitignore`).
   - Katalogi `api/sessions` oraz `api/rate_limits` muszą posiadać regułę Apache `Deny from all` w pliku `.htaccess`.
   - Żadne dane wrażliwe klientów (pliki `leads_*.csv`) nie mogą trafić do publicznego repozytorium.
2. **CSRF i Walidacja żądań**:
   - Każde żądanie POST musi przejść restrykcyjną weryfikację nagłówka `Origin`/`Referer` oraz jednorazowego tokenu CSRF.
   - Pomiędzy operacjami na plikach stosować blokowanie atomowe (`LOCK_EX`).
3. **Higiena repozytorium**:
   - Testy jednostkowe bez zewnętrznych zależności (`node:test`) ze 100% pokryciem logiki.
   - Konfiguracja `.gitattributes` z normalizacją LF.
   - Pre-commit hook (`.githooks/pre-commit`) uruchamiający `npm run check`.
   - Czystość kodu: zakaz pozostawiania wiszących komentarzy roboczych lub testowych.

---

## 3. FORMATKA POTOKU CI/CD (GITHUB ACTIONS QUALITY GATE)
Każde repozytorium z tej rodziny musi posiadać zautomatyzowany potok CI/CD w `.github/workflows/deploy.yml` realizujący 3-etapową architekturę bramek jakości (Quality Gates):

1. **Współbieżność (`concurrency`)**:
   - Ochrona przed nadpisywaniem wdrożeń: `group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` (dla gałęzi poza main).
2. **Etap 1: `Quality Gate & Testy Jednostkowe` (`test`)**:
   - `actions/checkout@v4` + Node.js 22.
   - Weryfikacja syntaktyczna: `npm run check:syntax`.
   - Testy jednostkowe i raport pokrycia: `npm run test:coverage`.
3. **Etap 2: `Audyt jakościowy Lighthouse CI` (`audit`)**:
   - Zależny od `needs: [test]`.
   - Uruchamia `treosh/lighthouse-ci-action@v12` w oparciu o reguły w `.lighthouserc.json` (wymóg min. 90% w SEO, a11y, best-practices).
4. **Etap 3: `Wdrożenie produkcyjne SFTP` (`deploy`)**:
   - Bezwzględnie zablokowane w przypadku niepowodzenia testów: `needs: [test, audit]`.
   - Uruchamiane wyłącznie na gałęzi `main`: `if: github.ref == 'refs/heads/main'`.
   - Wykluczenie z transferu plików deweloperskich (`.git*`, `.github/**`, `tests/**`, `scripts/**`, `.lighthouserc.json`, `package*.json`).

---

## 4. STANDARD PREZENTACJI JAKOŚCI (README BADGES)
W nagłówku pliku `README.md` musi znajdować się ustandaryzowany zestaw odznak statusowych (Badges):
- `CI/CD Pipeline` (linkujący do `.github/workflows/deploy.yml`)
- `Unit Tests` (liczba zaliczonych testów)
- `Coverage` (raport pokrycia kodu testami)
- `Lighthouse CI` (status walidacji metryk)
- `Dependabot` (aktywność skanera bezpieczeństwa)
- `Standards` (ISO 27001 / RODO linkujący do `AGENTS.md`)

---

## 5. STANDARD JĘZYKA BIZNESOWEGO (ZASADA ANTI-AI / ANTI-JARGON)
Treści na witrynie (zwłaszcza na podstronach ofertowych i procesowych jak `jak-pracuje.html`):
1. **Język korzyści dla klienta:** Komunikacja musi być prowadzona z perspektywy wartości biznesowej (szybkość ładowania, oszczędność czasu, brak abonamentów, gwarancja wdrożenia).
2. **Zakaz deweloperskiego slangu:** Zabrania się umieszczania technicznych stałych, funkcji i flag systemowych (np. `LOCK_EX`, `flock`, nazw zmiennych) w publicznych boksach marketingowych i statystykach.
3. **Zakaz sztucznych szablonów AI:** Unikać generycznych etykiet („Architektura Zero-Bloat”, symulowane terminale linuksowe z komendami basha) – design i treści muszą brzmieć naturalnie, elegancko i profesjonalnie.

---

## 6. PROCEDURA COMMITTOWANIA
Wszystkie commity muszą realizować format Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).
Przed commitem należy bezwzględnie uruchomić `npm run check`.

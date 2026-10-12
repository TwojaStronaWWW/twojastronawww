# SYSTEM PROMPT & WYTYCZNE PROJEKTU: TWOJASTRONAWWW.PL

## 1. ROLA I KONTEKST
Repozytorium to oficjalna witryna firmowa oraz silnik leadów TwojaStronaWWW.pl.
Łączy nowoczesny, lekki front-end (Vanilla JS, CSS, semantyczny HTML5) z bezpiecznym backendem API w PHP (ochrona CSRF, strict Origin/Referer, rate-limiting, deterministyczny CRM leadów CSV chroniony LOCK_EX).

## 2. STANDARDY ARCHITEKTURY I BEZPIECZEŃSTWA (ISO 27001)
1. **Bezpieczeństwo sesji i danych**:
   - Sesje PHP i liczniki rate-limitera NIGDY nie mogą być śledzone przez git (reguły w `.gitignore`).
   - Katalogi `api/sessions` oraz `api/rate_limits` muszą posiadać regułę Apache `Deny from all` w pliku `.htaccess`.
   - Żadne dane wrażliwe klientów (pliki `leads_*.csv`) nie mogą trafić do publicznego repozytorium.
2. **CSRF i Walidacja żądań**:
   - Każde żądanie POST musi przejść restrykcyjną weryfikację nagłówka `Origin`/`Referer` oraz jednorazowego tokenu CSRF.
   - Pomiędzy operacjami na plikach stosować blokowanie atomowe (`LOCK_EX`).
3. **Higiena repozytorium**:
   - Testy jednostkowe bez zewnętrznych zależności (`node:test`).
   - Konfiguracja `.gitattributes` z normalizacją LF.
   - Pre-commit hook uruchamiający `npm run check`.

## 3. PROCEDURA COMMITTOWANIA
Wszystkie commity muszą realizować format Conventional Commits (np. `feat:`, `fix:`, `docs:`, `test:`, `chore:`).

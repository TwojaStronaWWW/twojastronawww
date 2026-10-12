# Twoja Strona WWW – https://twojastronawww.pl/

> **Oficjalny serwis firmy Twoja Strona WWW – platforma usług IT, web developmentu, hostingu i audytów bezpieczeństwa informacji.**  
> Projekt zoptymalizowany pod kątem bezkompromisowej wydajności (Zero-Dependency Vanilla Stack), odporności na ataki (Strict CSRF, File-Locking Anti-Spam) oraz zgodności z normami **ISO/IEC 27001:2023** i **RODO**.

<p align="center">
  <img src="https://img.shields.io/badge/Serwis-Twoja%20Strona%20WWW-005b82?logo=firefox&logoColor=white" alt="Twoja Strona WWW">
  <img src="https://img.shields.io/badge/Stack-PHP%20%7C%20Vanilla%20JS%20%7C%20HTML5-777bb4?logo=php&logoColor=white" alt="PHP Vanilla Stack">
  <img src="https://img.shields.io/badge/Security-Strict%20CSRF%20%7C%20Anti--Spam%20Rate%20Limit-success?logo=shield&logoColor=white" alt="Security">
  <img src="https://img.shields.io/badge/Storage-Flat--File%20SHA--256%20Vault-blueviolet?logo=databricks&logoColor=white" alt="Storage">
  <img src="https://img.shields.io/badge/CDN%20%26%20WAF-Cloudflare%20Edge%20SSL-orange?logo=cloudflare&logoColor=white" alt="Cloudflare">
  <img src="https://img.shields.io/badge/Standard-ISO%2FIEC%2027001%20%7C%20RODO-red" alt="ISO 27001 RODO">
</p>

<p align="center">
  <a href="https://twojastronawww.pl/" target="_blank">
    <img src="https://img.shields.io/badge/%F0%9F%8C%90_ODWIED%C5%B9_TWOJASTRONAWWW.PL-005b82?style=for-the-badge" alt="Odwiedź TwojaStronaWWW.pl" />
  </a>
</p>

---

## 🎯 Architektura i Założenia Inżynieryjne

Projekt powstał w paradygmacie **Ultra-Lightweight & Secure Architecture**:
- **Brak podatności SQL Injection:** Całość systemu oparta jest na izolowanym silniku bazodanowym Flat-File (struktury CSV z unikalnymi identyfikatorami SHA-256), eliminując konieczność utrzymywania bazy relacyjnej i podatności bazodanowe.
- **Odporność na boty i automatyczne skanery:** Wielowarstwowa ochrona formularza kontaktowego łącząca techniki Honeypot, jednorazowe tokeny sesyjne (Single-Use CSRF) oraz blokady czasowe oparte na blokadach plików systemowych (`flock`).
- **Autonomia i wysoka dostępność:** Zerowa zależność od zewnętrznych bibliotek (No npm bloat na produkcji, No external dependencies w PHP).

---

## 🛠️ Stack Technologiczny

| Warstwa | Technologia / Narzędzie | Zastosowanie |
| :--- | :--- | :--- |
| **Frontend** | Semantyczny HTML5, CSS BEM, Vanilla JS | Lekki interfejs użytkownika, walidacja asynchroniczna, auto-save wersji roboczych formularza |
| **Backend API** | PHP 8.x (Modular Architecture) | Bezpieczne endpointy obsługi leadów, uwierzytelniania i audytu |
| **Bezpieczeństwo Danych** | Strict CSRF & Hash ID Engine | Jednorazowa rotacja tokenów w sesji serwera, haszowanie adresów IP i leadów (SHA-256) |
| **Ochrona Anti-Spam** | Atomic File-Locking Rate Limiter | Własny mechanizm ograniczania zapytań oparty na `flock()` odporny na wyścigi (Race Conditions) |
| **Infrastruktura & Sieć** | Cloudflare (Edge SSL, DNS, WAF) | Buforowanie zasobów statycznych, certyfikaty SSL Full Strict, ochrona przed atakami DDoS |

---

## 🛡️ Architektura Bezpieczeństwa (ISO/IEC 27001 & RODO)

### 1. Panel Administratora (`api/admin.php`)
- **Bezpieczne logowanie:** Dedykowany formularz POST z zabezpieczeniem przed enumeracją (kod PIN nie występuje w adresach URL).
- **Zarządzanie sesją:** Ograniczony czas życia sesji (**TTL = 30 minut**) z automatycznym unieważnieniem po okresie bezczynności administratora.
- **Fizyczna modyfikacja:** Operacje usuwania rekordów wymagają aktywnej autoryzacji oraz poprawnego tokena CSRF, po czym fizycznie usuwają wpis z magazynu CSV.

### 2. Ochrona CSRF (Strict Session Verification)
- **One-Time Token:** Token sesyjny jest ważny wyłącznie na jedno użycie i rotowany po każdym zapytaniu (eliminacja ataków Replay).
- **Przechowywanie po stronie serwera:** Brak wystawiania tokenów w niezabezpieczonych plikach cookie.
- **Origin & Referer Whitelisting:** Każde żądanie weryfikuje nagłówki przeglądarki pod kątem dozwolonych domen produkcyjnych.

### 3. Mechanizm Rate Limiting (Odporny na Race Conditions)
- Katalog liczników `api/rate_limits` zabezpieczony restrykcyjnymi uprawnieniami serwera (`.htaccess`).
- Wykorzystanie blokad plików (`LOCK_EX` w `flock`) gwarantujące atomowość zliczeń nawet przy współbieżnych uderzeniach botów.
- Limity:
  - **Wysyłka formularza:** Maksymalnie 5 prób w oknie 5 minut.
  - **Zapis wersji roboczej (Auto-Draft):** Maksymalnie 20 żądań na godzinę.

---

## 🚀 Struktura Katalogów Projektu

```plaintext
twojastronawww/
├── api/                        # Moduły backendowe (PHP)
│   ├── admin.php               # Panel administracyjny (Zarządzanie leadami i sesją)
│   ├── bootstrap.php           # Globalna inicjalizacja (stałe, sesje, nagłówki bezpieczeństwa)
│   ├── contact.php             # Endpoint odbioru i weryfikacji zapytań ofertowych
│   ├── csrf.php                # Mechanizm generowania i weryfikacji tokenów jednorazowych
│   ├── delete-lead.php         # Bezpieczne usuwanie zgłoszeń (wymaga autoryzacji)
│   ├── export-leads.php        # Eksport bazy leadów do pliku CSV
│   ├── get-csrf-token.php      # Asynchroniczne pobieranie tokena sesyjnego
│   ├── leads-store.php         # Silnik bazy Flat-File z hashowaniem SHA-256
│   ├── lead-recovery.php       # Odzyskiwanie i wersjonowanie draftów formularza
│   ├── rate-limit.php          # Atomowy silnik ochrony przed przeciążeniem i spamem
│   ├── rate_limits/            # Rejestr liczników żądań (chroniony regułami serwera)
│   └── sessions/               # Bezpieczny magazyn sesji administratora
├── assets/
│   ├── css/                    # Modularne style i tokeny wizualne
│   └── js/
│       └── contact.js          # Dynamiczna obsługa formularza, walidacja i auto-save
├── tests/                      # Skrypty audytowe i testy integralności backendu
├── index.html                  # Strona główna z prezentacją oferty
├── jak-pracuje.html            # Standardy procesowe, metodyka wdrożeń i SLA
├── dokumentacja_systemu.md     # Szczegółowa specyfikacja modułów backendowych
└── README.md                   # Niniejsza dokumentacja techniczna
```

---

## 👤 Autor i Kontakt

- **Inżynieria & Wdrożenie:** Krzysztof Początek
- **Profil GitHub:** [@kpoczatek-dev](https://github.com/kpoczatek-dev)
- **Organizacja:** [Twoja Strona WWW](https://github.com/TwojaStronaWWW)
- **Serwis Produkcyjny:** [https://twojastronawww.pl/](https://twojastronawww.pl/)
- **LinkedIn:** [Krzysztof Początek](https://linkedin.com/in/krzysztof-początek-a94a06166)

/**
 * TwojaStronaWWW.pl – Główny skrypt interfejsu użytkownika (Vanilla JS)
 * Zero zewnętrznych bibliotek, wysoka wydajność, pełna dostępność (a11y).
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initTechStackExplorer();
    initSmoothScroll();
    initServiceWorker();
});

function initServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !navigator.serviceWorker) return;
    const port = typeof location !== 'undefined' ? location.port : '';
    if (port === '5500' || port === '5501') {
        navigator.serviceWorker.getRegistrations?.().then(regs => {
            for (const r of regs) r.unregister();
        }).catch(() => {});
        return;
    }
    navigator.serviceWorker.register?.('/sw.js', { updateViaCache: 'none' }).catch(() => {});
}

/**
 * Obsługa mobilnego menu nawigacji
 */
function initMobileNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (!navToggle || !navLinks) return;

    navToggle.setAttribute('aria-expanded', 'false');

    function toggleMenu() {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!isExpanded));
        navLinks.classList.toggle('nav-links--open');
        navToggle.classList.toggle('is-active');
        navToggle.textContent = isExpanded ? '☰' : '✕';
    }

    function closeMenu() {
        navToggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('nav-links--open');
        navToggle.classList.remove('is-active');
        navToggle.textContent = '☰';
    }

    navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Zamknij menu po kliknięciu w dowolny link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    // Zamknij menu po kliknięciu poza obszar nawigacji
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // Zamknij menu klawiszem Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });
}

/**
 * Baza wiedzy o stosowanych technologiach i ich korzyściach dla klienta
 */
const TECH_DATABASE = {
    html_css: {
        title: 'HTML5 & Nowoczesny CSS3 (Grid / Flexbox)',
        role: 'Lekka architektura wizualna i semantyka',
        highlights: [
            'Semantyczny kod HTML5, który roboty Google i wyszukiwarki indeksują bez żadnych przeszkód',
            'Nowoczesne arkusze stylów bez ciężkich bibliotek (jak Bootstrap czy Tailwind) – strona waży ułamek tego, co typowy szablon',
            'Perfekcyjny dark mode, subtelny glassmorphism i płynne animacje działające z pełną prędkością na każdym telefonie'
        ],
        benefit: 'Strona ładuje się niemal natychmiast, a Twoi klienci nie czekają na załadowanie ciężkich bibliotek.'
    },
    vanilla_js: {
        title: 'Czysty JavaScript (Vanilla JS)',
        role: 'Szybkie interakcje bez spowalniających wtyczek',
        highlights: [
            'Brak ociężałych frameworków i zbędnych paczek kodu – tylko czysty, przetestowany JavaScript',
            'Płynna, asynchroniczna komunikacja w tle (szybkie formularze bez przeładowywania strony)',
            'Mechanizm Lead Recovery – automatyczne zabezpieczenie danych kontaktowych wpisywanych przez klienta'
        ],
        benefit: 'Maksymalna responsywność interfejsu i brak zacięć nawet na starszych urządzeniach mobilnych.'
    },
    php_flatfile: {
        title: 'PHP 8+ & Autorski CMS Flat-File',
        role: 'Bezpieczny panel zarządzania bez bazy SQL',
        highlights: [
            'Brak relacyjnej bazy danych (MySQL/PostgreSQL) oznacza całkowite wyeliminowanie ryzyka ataków SQL Injection',
            'Proste pliki danych chronione kryptograficznie sumami SHA-256 i restrykcyjnymi uprawnieniami serwera',
            'Błyskawiczne kopie zapasowe – do pełnego backupu wystarczy skopiowanie jednego katalogu'
        ],
        benefit: 'Zero awarii bazy danych, bezproblemowy hosting i prosty panel edycji bez zbędnych komplikacji.'
    },
    automation: {
        title: 'Automatyzacja procesów & Lead Recovery',
        role: 'Oszczędność czasu i ochrona przed utratą klientów',
        highlights: [
            'Formularze z zapisem wersji roboczych – kontakt nie przepada, nawet gdy klient zamknie kartę w trakcie pisania',
            'Automatyczne powiadomienia i wstępna selekcja zapytań eliminująca powtarzalną, ręczną pracę',
            'Możliwość integracji z Twoim kalendarzem, skrzynką pocztową lub systemem CRM'
        ],
        benefit: 'Zyskujesz więcej zapytań ofertowych i przestajesz tracić czas na powtarzalne czynności.'
    },
    seo_vitals: {
        title: 'Optymalizacja SEO & Core Web Vitals',
        role: 'Wysoka widoczność w wyszukiwarkach od pierwszego dnia',
        highlights: [
            'Rygorystycznie zoptymalizowane wskaźniki LCP, FID/INP oraz CLS pod wytyczne Google',
            'Pełne dane strukturalne Schema.org (JSON-LD), ułatwiające robotom zrozumienie Twojej oferty',
            'Czysta struktura nagłówków, semantyczne tagi oraz zoptymalizowane metadane Open Graph'
        ],
        benefit: 'Twoja strona ma znakomity start w wynikach wyszukiwania i jest faworyzowana przez algorytmy Google.'
    },
    git_security: {
        title: 'Git Versioning & Bezpieczeństwo ISO 27001',
        role: '100% własności kodu, wersjonowanie i spokój',
        highlights: [
            'Każda zmiana w kodzie jest udokumentowana i bezpiecznie wersjonowana w prywatnym repozytorium Git',
            'Ochrona formularzy jednorazowymi tokenami CSRF oraz atomowym mechanizmem blokady plików przed botami',
            'Brak jakiegokolwiek uzależnienia od agencji (vendor lock-in) – cały kod źródłowy należy do Ciebie'
        ],
        benefit: 'Pełna niezależność, bezpieczne dane Twoich klientów i brak ukrytych opłat licencyjnych.'
    }
};

/**
 * Interaktywny panel prezentacji technologii
 */
function initTechStackExplorer() {
    const techButtons = document.querySelectorAll('.tech-item[data-tech]');
    const cardTitle = document.getElementById('tech-card-title');
    const cardRole = document.getElementById('tech-card-role');
    const cardList = document.getElementById('tech-card-list');
    const cardBenefit = document.getElementById('tech-card-benefit');

    if (!techButtons.length || !cardTitle) return;

    function renderTech(techKey) {
        const item = TECH_DATABASE[techKey];
        if (!item) return;

        // Aktualizuj stan przycisków
        techButtons.forEach(btn => {
            const isActive = btn.dataset.tech === techKey;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        // Wypełnij zawartość karty
        cardTitle.textContent = item.title;
        if (cardRole) cardRole.textContent = item.role;

        if (cardList) {
            cardList.innerHTML = '';
            item.highlights.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                cardList.appendChild(li);
            });
        }

        if (cardBenefit) {
            cardBenefit.innerHTML = `<strong>Wartość dla Twojej firmy:</strong> ${item.benefit}`;
        }
    }

    techButtons.forEach(btn => {
        const key = btn.dataset.tech;
        btn.addEventListener('click', () => renderTech(key));
        btn.addEventListener('mouseenter', () => renderTech(key));
    });

    // Inicjalnie załaduj pierwszą technologię
    const firstKey = techButtons[0]?.dataset.tech;
    if (firstKey) renderTech(firstKey);
}

/**
 * Płynne przewijanie do kotwic z uwzględnieniem wysokości nagłówka
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = 96;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

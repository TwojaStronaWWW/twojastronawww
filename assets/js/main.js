/**
 * TwojaStronaWWW.pl – Główny skrypt interfejsu użytkownika (Vanilla JS)
 * Zero zewnętrznych bibliotek, wysoka wydajność, pełna dostępność (a11y).
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initTechStackExplorer();
    initSmoothScroll();
});

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
 * Baza danych interaktywnego eksploratora technologii
 */
const TECH_DATABASE = {
    html_css: {
        title: 'HTML5 & Nowoczesny CSS3 (Grid / Flexbox / BEM)',
        role: 'Fundament strukturalny i wizualny',
        command: 'cat /stack/frontend/markup-and-styling.yml',
        highlights: [
            'Semantyczny kod HTML5 zoptymalizowany pod roboty Google i czytniki ekranowe (a11y)',
            'Nowoczesne tokeny CSS i brak ciężkich frameworków (np. Tailwind/Bootstrap) redukuje wagę strony o 90%',
            'Dedykowany dark-mode, szklane efekty (glassmorphism) i płynne mikro-animacje 60 FPS'
        ],
        benefit: 'Błyskawiczne renderowanie i doskonały wynik First Contentful Paint (<0.6s).'
    },
    php_flatfile: {
        title: 'PHP 8.x & Autorski Silnik Flat-File (Baza CSV z SHA-256)',
        role: 'Bezpieczny silnik zapisu danych i panelu CMS',
        command: 'php --version && ls -la /api/leads-store.php',
        highlights: [
            'Zero podatności na SQL Injection – brak zewnętrznego serwera MySQL/PostgreSQL',
            'Deterministyczny format CSV z unikalnymi sumami kontrolnymi SHA-256 dla każdego rekordu',
            'Błyskawiczny backup (wystarczy skopiować folder) i brak ryzyka awarii bazy danych'
        ],
        benefit: 'Zerowe koszty licencji bazodanowych i maksymalna przenoszalność między serwerami.'
    },
    vanilla_js: {
        title: 'Vanilla JavaScript (ES Modules & Fetch API)',
        role: 'Lekka, reaktywna warstwa interakcji',
        command: 'node -e "console.log(process.memoryUsage())"',
        highlights: [
            'Brak ociężałych bibliotek (Zero jQuery, No bulky node_modules na produkcji)',
            'Asynchroniczne zapytania w tle z obsługą nagłówków Content-Type: application/json',
            'Moduł Lead Recovery – automatyczne ratowanie porzuconych leadów przez navigator.sendBeacon'
        ],
        benefit: 'Natychmiastowa reakcja interfejsu i płynne działanie nawet na starszych smartfonach.'
    },
    git_cicd: {
        title: 'Git Versioning & Automatyzacja CI/CD (Node:Test)',
        role: 'Bezpieczeństwo kodu, powtarzalność i SLA',
        command: 'git log -n 1 --stat && npm test',
        highlights: [
            'Każda zmiana w kodzie jest audytowalna i wersjonowana w repozytorium Git',
            'Własne testy jednostkowe bez zależności (node:test) weryfikujące integralność przed wdrożeniem',
            'Możliwość natychmiastowego rollbacku w przypadku jakichkolwiek problemów (SLA <15 min)'
        ],
        benefit: 'Pełna własność kodu źródłowego dla klienta – brak vendor lock-in.'
    },
    security_csrf: {
        title: 'Strict CSRF & Atomowy Anti-Spam (File-Locking flock)',
        role: 'Wielowarstwowa ochrona przed atakami i botami',
        command: 'grep -E "flock|LOCK_EX" /api/rate-limit.php',
        highlights: [
            'Jednorazowe tokeny sesyjne (One-Time Token CSRF) eliminujące ataki typu Replay',
            'Atomowy rate-limiter oparty na blokadach plików systemowych (flock LOCK_EX) odporny na Race Conditions',
            'Ochrona katalogów sesji i liczników regułami Apache .htaccess (Deny from all) wg norm ISO 27001'
        ],
        benefit: '100% czysta skrzynka odbiorcza bez spamu i bezpieczne przetwarzanie leadów wg RODO.'
    },
    cloudflare_cdn: {
        title: 'Cloudflare Edge SSL & Globalne Buforowanie CDN',
        role: 'Przyspieszenie sieciowe i tarcza ochronna WAF',
        command: 'curl -I https://twojastronawww.pl/ | grep cf-ray',
        highlights: [
            'Szyfrowanie SSL Full Strict z najnowszym protokołem TLS 1.3 i HTTP/3',
            'Serwowanie zasobów z węzłów brzegowych najbliżej Twojego klienta',
            'Zintegrowana ochrona przed atakami wolumetrycznymi DDoS'
        ],
        benefit: 'Dostępność 99.9% oraz błyskawiczne otwieranie strony w dowolnym miejscu na świecie.'
    }
};

/**
 * Interaktywny terminal stacku technologicznego
 */
function initTechStackExplorer() {
    const techButtons = document.querySelectorAll('.tech-item[data-tech]');
    const terminalTitle = document.getElementById('tech-term-title');
    const terminalRole = document.getElementById('tech-term-role');
    const terminalCmd = document.getElementById('tech-term-cmd');
    const terminalList = document.getElementById('tech-term-list');
    const terminalBenefit = document.getElementById('tech-term-benefit');

    if (!techButtons.length || !terminalTitle) return;

    function renderTech(techKey) {
        const item = TECH_DATABASE[techKey];
        if (!item) return;

        // Aktualizuj stan przycisków
        techButtons.forEach(btn => {
            const isActive = btn.dataset.tech === techKey;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        // Wypełnij zawartość terminala
        terminalTitle.textContent = item.title;
        if (terminalRole) terminalRole.textContent = item.role;
        if (terminalCmd) terminalCmd.textContent = `$ ${item.command}`;

        if (terminalList) {
            terminalList.innerHTML = '';
            item.highlights.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                terminalList.appendChild(li);
            });
        }

        if (terminalBenefit) {
            terminalBenefit.innerHTML = `<strong>Wartość biznesowa:</strong> ${item.benefit}`;
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

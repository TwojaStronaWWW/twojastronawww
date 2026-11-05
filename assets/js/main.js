/**
 * TwojaStronaWWW.pl – Główny skrypt interfejsu użytkownika (Vanilla JS)
 * Zero zewnętrznych bibliotek, wysoka wydajność, pełna dostępność (a11y).
 *
 * ============================================================================
 * MAPA ARCHITEKTURY MODUŁÓW (assets/js/modules/*)
 * ============================================================================
 * Kod interfejsu jest podzielony na 5 czystych modułów tematycznych ES6:
 *
 * 1. assets/js/modules/navigation.js
 *    - initMobileNav()       — obsługa mobilnego menu nawigacji i klawisza Escape
 *    - initSmoothScroll()    — płynne przewijanie do sekcji kotwicowych
 *    - initServiceWorker()   — rejestracja PWA Service Workera (/sw.js)
 *
 * 2. assets/js/modules/hero-xray.js
 *    - initScrollScrubbedMotion() / initScrollMotion() — suwak #xraySlider i kurtyna
 *      X-Ray przesuwająca się w lewo i w prawo podczas przewijania strony oraz przeciągania
 *    - initHardwareViewSwitcher() — przełącznik widoku komponentów (First/Second Frame)
 *
 * 3. assets/js/modules/benchmark-race.js
 *    - BENCHMARK_PROFILES    — profile obciążenia sieciowego ('4g', '3g', 'spike')
 *    - initHardwareBenchmark() / initLiveBenchmark() — wyścig ładowania na żywo,
 *      paski postępu oraz animacja rosnących liczb po kliknięciu w zasięgi 4g/3g/spike
 *
 * 4. assets/js/modules/pricing-configurator.js
 *    - initModuleSelector()  — interaktywny konfigurator wyceny (#pricing -> #contactForm)
 *    - initTelemetryChannelSelector() — przełącznik kanałów pomiarowych w #portfolio
 *
 * 5. assets/js/modules/tech-explorer.js
 *    - TECH_DATABASE         — baza wiedzy o technologiach i korzyściach (Anti-Jargon)
 *    - initTechStackExplorer() — interaktywny eksplorator stosu technologicznego
 *
 * Uwaga: Plik main.js utrzymuje zintegrowany bundle wykonawczy dla pełnej kompatybilności
 * wstecznej z klasycznym tagiem <script data-cfasync="false" src="assets/js/main.js?v=20"></script>
 * (bez narzutu kaskadowych żądań HTTP) oraz z testami jednostkowymi (tests/unit/main.test.js).
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initTechStackExplorer();
    initScrollScrubbedMotion();
    initHardwareViewSwitcher();
    initTelemetryChannelSelector();
    initHardwareBenchmark();
    initModuleSelector();
    initSmoothScroll();
    initServiceWorker();
});

/* ==========================================================================
   MODUŁ 1: Nawigacja i Service Worker (assets/js/modules/navigation.js)
   ========================================================================== */

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

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });
}

/* ==========================================================================
   MODUŁ 5: Eksplorator technologii (assets/js/modules/tech-explorer.js)
   ========================================================================== */

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
            'Perfekcyjny kontrast, taktylny interfejs i płynne przejścia działające z pełną prędkością na każdym telefonie'
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

        techButtons.forEach(btn => {
            const isActive = btn.dataset.tech === techKey;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

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

    const firstKey = techButtons[0]?.dataset.tech;
    if (firstKey) renderTech(firstKey);
}

/* ==========================================================================
   MODUŁ 2: Kurtyna X-Ray & Scroll-Scrubbed Motion (assets/js/modules/hero-xray.js)
   ========================================================================== */

/**
 * Dual-Keyframe X-Ray Split Curtain & Scroll-Scrubbed Motion w Hero
 * Kurtyna i suwak #xraySlider reagują na ręczne przesuwanie oraz płynnie
 * przesuwają się w lewo i w prawo podczas przewijania strony w dół i w górę.
 */
function initScrollScrubbedMotion() {
    if (typeof window === 'undefined') return;

    const stage = document.getElementById('keyframeStage');
    const viewport = document.getElementById('keyframeViewport') || (stage && stage.querySelector ? stage.querySelector('.keyframe-viewport') : null);
    const slider = document.getElementById('xraySlider');
    const curtain = document.getElementById('xrayCurtainOverlay');
    const divider = document.getElementById('xrayDividerLine');
    const panoramaImg = document.getElementById('heroPanoramaImg');

    if (!stage && !viewport && !slider && !curtain && !divider && !panoramaImg) return;

    function setCurtainPercent(pct) {
        const num = Number(pct);
        const clamped = Math.max(2, Math.min(98, Number.isNaN(num) ? 58 : num));
        if (stage && stage.style && typeof stage.style.setProperty === 'function') {
            stage.style.setProperty('--xray-pos', `${clamped}%`);
        }
        if (curtain && curtain.style) {
            curtain.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
        }
        if (divider && divider.style) {
            divider.style.left = `${clamped}%`;
        }
        if (slider && String(Math.round(clamped)) !== String(slider.value)) {
            slider.value = String(Math.round(clamped));
        }
    }

    const initialSliderVal = slider ? (Number(slider.value) || 58) : 58;
    let anchorPct = initialSliderVal;
    let anchorScrollY = window.scrollY || window.pageYOffset || 0;

    function setManualPosition(pct) {
        const num = Number(pct);
        const clamped = Math.max(2, Math.min(98, Number.isNaN(num) ? 58 : num));
        anchorPct = clamped;
        anchorScrollY = window.scrollY || window.pageYOffset || 0;
        setCurtainPercent(clamped);
    }

    if (slider) {
        slider.addEventListener('input', () => {
            setManualPosition(slider.value);
        });
    }

    function updateFromClientX(clientX) {
        if (!viewport || typeof viewport.getBoundingClientRect !== 'function') return;
        const rect = viewport.getBoundingClientRect();
        if (!rect || !rect.width) return;
        const rawPct = ((clientX - rect.left) / rect.width) * 100;
        setManualPosition(rawPct);
    }

    if (viewport && typeof viewport.addEventListener === 'function') {
        let isDragging = false;

        viewport.addEventListener('pointerdown', (e) => {
            isDragging = true;
            if (typeof viewport.setPointerCapture === 'function' && e && e.pointerId !== undefined) {
                try {
                    viewport.setPointerCapture(e.pointerId);
                } catch (_) {
                    // Ignorujemy brak wsparcia setPointerCapture w mock-dom
                }
            }
            if (e && typeof e.clientX === 'number') {
                updateFromClientX(e.clientX);
            }
        });

        viewport.addEventListener('pointermove', (e) => {
            if (!isDragging || !e || typeof e.clientX !== 'number') return;
            updateFromClientX(e.clientX);
        });

        const endPointerDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            if (typeof viewport.releasePointerCapture === 'function' && e && e.pointerId !== undefined) {
                try {
                    viewport.releasePointerCapture(e.pointerId);
                } catch (_) {
                    // Ignorujemy błędy releasePointerCapture
                }
            }
        };

        viewport.addEventListener('pointerup', endPointerDrag);
        viewport.addEventListener('pointercancel', endPointerDrag);

        viewport.addEventListener('mousedown', (e) => {
            isDragging = true;
            if (e && typeof e.clientX === 'number') {
                updateFromClientX(e.clientX);
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !e || typeof e.clientX !== 'number') return;
            updateFromClientX(e.clientX);
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        viewport.addEventListener('touchstart', (e) => {
            if (e && e.touches && e.touches[0]) {
                isDragging = true;
                updateFromClientX(e.touches[0].clientX);
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (!isDragging || !e || !e.touches || !e.touches[0]) return;
            updateFromClientX(e.touches[0].clientX);
        }, { passive: true });

        viewport.addEventListener('touchend', () => {
            isDragging = false;
        }, { passive: true });
    }

    function applyScrollState() {
        const y = window.scrollY || window.pageYOffset || 0;

        if (stage || viewport || slider || curtain || divider) {
            const deltaY = y - anchorScrollY;
            const shift = (deltaY / 700) * 44;
            const scrubbedPct = Math.max(2, Math.min(98, anchorPct - shift));
            setCurtainPercent(scrubbedPct);
        }
    }

    setCurtainPercent(initialSliderVal);

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => {
                    applyScrollState();
                    ticking = false;
                });
            } else {
                applyScrollState();
                ticking = false;
            }
        }
    }, { passive: true });
}

const initScrollMotion = initScrollScrubbedMotion;

/* ==========================================================================
   MODUŁ 3: Wyścig ładowania i rosnące liczby (assets/js/modules/benchmark-race.js)
   ========================================================================== */

/**
 * Zintegrowane scenariusze wyścigu ładowania, rosnących liczb i tabeli porównawczej (#porownanie)
 */
const BENCHMARK_PROFILES = {
    '4g': {
        tswDoneMs: 380,
        wpDoneMs: 4820,
        cleanTime: 0.38,
        wpTime: 4.82,
        cleanBarWidth: 10,
        wpBarWidth: 78,
        lossPct: '38%',
        visitors: 10,
        loadLabel: '10 klientów jednocześnie (Sieć 4G LTE)',
        cleanMeta: '<span>Przesyłane dane: <strong>64 KB</strong></span><span>Zapytania do bazy: <strong>0</strong></span><span>Gotowość formularza: <strong>100% zachowanych zgłoszeń</strong></span>',
        wpMeta: '<span>Przesyłane dane: <strong>6,8 MB</strong></span><span>Zapytania do bazy: <strong>84</strong></span><span>Skutek opóźnienia: <strong>Utrata 38% niecierpliwych odbiorców</strong></span>',
        narrative: 'W 0,38 sekundy witryna w czystym kodzie jest w pełni wyświetlona i gotowa do przyjęcia zapytania, podczas gdy szablon WordPress wczytuje dopiero pierwszą falę zewnętrznych bibliotek.',
        sqlText: '84 zapytania SQL na wejście',
        statusA: 'Natychmiastowy odczyt',
        statusB: 'Utrata 38% niecierpliwych klientów'
    },
    '3g': {
        tswDoneMs: 680,
        wpDoneMs: 9450,
        cleanTime: 0.68,
        wpTime: 9.45,
        cleanBarWidth: 14,
        wpBarWidth: 96,
        lossPct: '64%',
        visitors: 100,
        loadLabel: '100 klientów jednocześnie (Słaby zasięg w budynku)',
        cleanMeta: '<span>Przesyłane dane: <strong>64 KB</strong></span><span>Zapytania do bazy: <strong>0</strong></span><span>Ochrona szkicu: <strong>100% zapisu w pamięci przeglądarki</strong></span>',
        wpMeta: '<span>Przesyłane dane: <strong>6,8 MB</strong></span><span>Zapytania do bazy: <strong>84</strong></span><span>Skutek opóźnienia: <strong>Rezygnacja 64% użytkowników mobilnych</strong></span>',
        narrative: 'W budynku o słabym zasięgu lekka strona otwiera się w 0,68 sekundy. Ciężki szablon potrzebuje blisko 10 sekund, przez co większość klientów zamyka kartę przed zobaczeniem oferty.',
        sqlText: '8 400 zapytań SQL w tle',
        statusA: 'Pełna dostępność przy słabym zasięgu',
        statusB: 'Rezygnacja 64% użytkowników mobilnych'
    },
    'spike': {
        tswDoneMs: 410,
        wpDoneMs: 7900,
        cleanTime: 0.41,
        wpTime: 7.90,
        cleanBarWidth: 11,
        wpBarWidth: 92,
        lossPct: '54%',
        visitors: 500,
        loadLabel: '500 klientów jednocześnie (Szczyt kampanii)',
        cleanMeta: '<span>Obciążenie procesora: <strong>poniżej 2%</strong></span><span>Zapytania do bazy: <strong>0</strong></span><span>Ciągłość działania: <strong>Pełna stabilność przy 500 wejściach naraz</strong></span>',
        wpMeta: '<span>Obciążenie procesora: <strong>98% (ryzyko błędu 502)</strong></span><span>Zapytania do bazy: <strong>42 000 na minutę</strong></span><span>Skutek opóźnienia: <strong>Zablokowanie puli połączeń z bazą MySQL</strong></span>',
        narrative: 'W szczycie kampanii reklamowej statyczna architektura obsługuje setki równoczesnych wejść bez narzutu procesora, podczas gdy baza SQL w typowym CMS ulega przeciążeniu.',
        sqlText: '42 000 zapytań SQL w tle',
        statusA: 'Pełna stabilność (PageSpeed 99/100)',
        statusB: 'Przeciążenie bazy i ryzyko błędu 502/504'
    }
};

const BENCHMARK_SCENARIOS = BENCHMARK_PROFILES;

/**
 * Interaktywny Symulator Wyścigu Ładowania, Rosnących Liczb i Tabeli Porównawczej w #porownanie
 */
function initHardwareBenchmark() {
    const scrubber = document.getElementById('timelineScrubber') || document.getElementById('editorialTimeSlider');
    const clockEl = document.getElementById('timelineClock') || document.getElementById('sliderTimeValue');
    const runBtn = document.getElementById('runBenchmarkBtn');

    const tickCleanDoneEl = document.getElementById('tickCleanDone');
    const tickWpDoneEl = document.getElementById('tickWpDone');

    const scenarioBtns = document.querySelectorAll(
        '.bench-scenario[data-scenario], .benchmark-mode-btn[data-scenario], .bench-mode-btn[data-scenario], .bench-mode-btn[data-load-preset], [data-scenario], [data-load-preset]'
    );

    const bmCleanTimeEl = document.getElementById('bmCleanTime');
    const bmWpTimeEl = document.getElementById('bmWpTime');
    const bmCleanMetaEl = document.getElementById('bmCleanMeta');
    const bmWpMetaEl = document.getElementById('bmWpMeta');
    const statusTextEl = document.getElementById('benchmarkStatusText');

    const tswTimeEl = document.getElementById('benchTswTime');
    const wpTimeEl = document.getElementById('benchWpTime');
    const tswBarEl = document.getElementById('benchTswBar') || document.getElementById('bmCleanBar');
    const wpBarEl = document.getElementById('benchWpBar') || document.getElementById('bmWpBar');
    const tswLogEl = document.getElementById('benchTswLog');
    const wpLogEl = document.getElementById('benchWpLog');

    const trafficSlider = document.getElementById('trafficLoadSlider');
    const loadValueEl = document.getElementById('trafficLoadValue');
    const benchTimeAEl = document.getElementById('benchTimeA');
    const benchTimeBEl = document.getElementById('benchTimeB');
    const benchStatusAEl = document.getElementById('benchStatusA');
    const benchStatusBEl = document.getElementById('benchStatusB');
    const benchWeightAEl = document.getElementById('benchWeightA');
    const benchWeightBEl = document.getElementById('benchWeightB');
    const benchSqlAEl = document.getElementById('benchSqlA');
    const benchSqlBEl = document.getElementById('benchSqlB');
    const barA = document.getElementById('benchBarA');
    const barB = document.getElementById('benchBarB');

    if (
        !scrubber &&
        !scenarioBtns.length &&
        !runBtn &&
        !tswBarEl &&
        !wpBarEl &&
        !trafficSlider &&
        !bmCleanTimeEl
    ) {
        return;
    }

    let currentScenarioKey = '4g';
    let raceInterval = null;
    let rafId = null;

    function resolveScenarioKey(raw) {
        const val = String(raw || '').toLowerCase().trim();
        if (val === '4g' || val === 'lte' || val === '10') return '4g';
        if (val === '3g' || val === '100') return '3g';
        if (val === 'spike' || val === 'peak' || val === '500') return 'spike';
        const num = Number(val);
        if (!Number.isNaN(num) && num > 0) {
            if (num >= 300) return 'spike';
            if (num >= 50) return '3g';
            return '4g';
        }
        return '4g';
    }

    function stopAllAnimations() {
        if (raceInterval) {
            clearInterval(raceInterval);
            raceInterval = null;
        }
        if (rafId && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function formatBenchTimeB(secVal, scenarioKey) {
        const formatted = Number(secVal).toFixed(2);
        return scenarioKey === 'spike'
            ? `${formatted} s (ryzyko błędu 504)`
            : `${formatted} sekundy`;
    }

    function syncTableStaticFields(scenario) {
        if (scrubber) {
            scrubber.max = String(scenario.wpDoneMs);
        }
        if (tickCleanDoneEl) {
            tickCleanDoneEl.textContent = `${scenario.cleanTime.toFixed(2)} s (Gotowy czysty kod)`;
        }
        if (tickWpDoneEl) {
            tickWpDoneEl.textContent = `${scenario.wpTime.toFixed(2)} s (Utrata ${scenario.lossPct} ruchu)`;
        }
        if (loadValueEl) loadValueEl.textContent = scenario.loadLabel;
        if (trafficSlider) trafficSlider.value = String(scenario.visitors);
        if (benchStatusAEl) benchStatusAEl.textContent = scenario.statusA;
        if (benchStatusBEl) benchStatusBEl.textContent = scenario.statusB;
        if (benchWeightAEl) benchWeightAEl.textContent = '64 KB kodu';
        if (benchWeightBEl) benchWeightBEl.textContent = '6.8 MB bibliotek';
        if (benchSqlAEl) benchSqlAEl.textContent = '0 zapytań SQL';
        if (benchSqlBEl) benchSqlBEl.textContent = scenario.sqlText;
        if (bmCleanMetaEl) bmCleanMetaEl.innerHTML = scenario.cleanMeta;
        if (bmWpMetaEl) bmWpMetaEl.innerHTML = scenario.wpMeta;
    }

    function getBtnRawScenario(btn) {
        return btn?.dataset?.scenario ||
            btn?.dataset?.loadPreset ||
            btn?.getAttribute?.('data-scenario') ||
            btn?.getAttribute?.('data-load-preset') ||
            '';
    }

    function highlightActiveScenarioButtons(scenarioKey) {
        scenarioBtns.forEach(btn => {
            const btnKey = resolveScenarioKey(getBtnRawScenario(btn));
            const isActive = btnKey === scenarioKey;
            btn.classList.toggle('is-active', isActive);
            if (btn.hasAttribute('aria-pressed')) {
                btn.setAttribute('aria-pressed', String(isActive));
            }
        });
    }

    /**
     * Spójne renderowanie stanu wyścigu ładowania w punkcie czasu ms (0..scenario.wpDoneMs).
     * Wszystkie zegary (#timelineClock, #bmCleanTime, #bmWpTime, #benchTswTime, #benchWpTime)
     * oraz paski postępu (#benchTswBar, #benchWpBar) są w 100% zsynchronizowane.
     */
    function renderAtMs(rawMs) {
        const scenario = BENCHMARK_PROFILES[currentScenarioKey] || BENCHMARK_PROFILES['4g'];
        const maxMs = scenario.wpDoneMs;
        const ms = Math.max(0, Math.min(maxMs, Number(rawMs) || 0));
        const secNum = ms / 1000;
        const secStr = `${secNum.toFixed(2)} s`;

        if (clockEl) clockEl.textContent = secStr;

        const tswElapsedMs = Math.min(ms, scenario.tswDoneMs);
        const wpElapsedMs = Math.min(ms, scenario.wpDoneMs);

        const currentCleanSec = (tswElapsedMs / 1000).toFixed(2);
        const currentWpSec = (wpElapsedMs / 1000).toFixed(2);

        const tswPct = Math.min(100, Math.round((ms / scenario.tswDoneMs) * 100));
        const wpPct = Math.min(100, Math.round((ms / scenario.wpDoneMs) * 100));

        if (tswBarEl) {
            tswBarEl.style.transition = 'none';
            tswBarEl.style.width = `${tswPct}%`;
        }
        if (wpBarEl) {
            wpBarEl.style.transition = 'none';
            wpBarEl.style.width = `${wpPct}%`;
        }
        if (barA) {
            barA.style.transition = 'none';
            barA.style.width = `${Math.max(4, Math.round((tswPct / 100) * scenario.cleanBarWidth))}%`;
        }
        if (barB) {
            barB.style.transition = 'none';
            barB.style.width = `${Math.max(6, Math.round((wpPct / 100) * scenario.wpBarWidth))}%`;
        }

        if (bmCleanTimeEl) bmCleanTimeEl.textContent = `${currentCleanSec}s`;
        if (bmWpTimeEl) bmWpTimeEl.textContent = `${currentWpSec}s`;
        if (benchTimeAEl) benchTimeAEl.textContent = `${currentCleanSec} sekundy`;
        if (benchTimeBEl) benchTimeBEl.textContent = formatBenchTimeB(currentWpSec, currentScenarioKey);

        if (ms >= scenario.tswDoneMs) {
            if (tswTimeEl) tswTimeEl.textContent = `${scenario.cleanTime.toFixed(2)} s — 100% gotowe`;
            if (tswLogEl) {
                tswLogEl.textContent = 'Pełna treść, cennik i formularz są aktywne. Klient od razu czyta ofertę i wysyła zapytanie.';
            }
        } else {
            if (tswTimeEl) tswTimeEl.textContent = `${currentCleanSec} s — renderowanie (${tswPct}%)`;
            if (tswLogEl) {
                tswLogEl.textContent = 'Nawiązywanie połączenia TLS i odczyt statycznego pliku HTML (64 KB)...';
            }
        }

        if (ms >= scenario.wpDoneMs) {
            if (wpTimeEl) wpTimeEl.textContent = `${scenario.wpTime.toFixed(2)} s — załadowano zbyt późno (utrata ${scenario.lossPct})`;
            if (wpLogEl) {
                wpLogEl.textContent = `Strona wreszcie się wyświetla po ${scenario.wpTime.toFixed(2)} s, ale około ${scenario.lossPct} klientów mobilnych zdążyło już zamknąć kartę.`;
            }
            if (statusTextEl) {
                statusTextEl.textContent = scenario.narrative;
            }
        } else if (wpPct < 25) {
            if (wpTimeEl) wpTimeEl.textContent = `${currentWpSec} s — biały ekran (${wpPct}%)`;
            if (wpLogEl) {
                wpLogEl.textContent = `W ${secStr} ekran telefonu jest nadal pusty — serwer wykonuje zapytania SQL i inicjuje wtyczki.`;
            }
            if (statusTextEl) {
                statusTextEl.textContent = ms >= scenario.tswDoneMs
                    ? `Stan w ${secStr}: TwojaStronaWWW jest już w 100% gotowa (${scenario.cleanTime.toFixed(2)} s), a na WordPressie klient widzi wciąż biały ekran (${wpPct}%).`
                    : `Stan w ${secStr}: Inicjalizacja połączenia i pobieranie pierwszych pakietów danych.`;
            }
        } else if (wpPct < 65) {
            if (wpTimeEl) wpTimeEl.textContent = `${currentWpSec} s — blokada skryptów (${wpPct}%)`;
            if (wpLogEl) {
                wpLogEl.textContent = 'Pobieranie 6,8 MB bibliotek wizualnych motywu. Klient nie może jeszcze przewijać strony.';
            }
            if (statusTextEl) {
                statusTextEl.textContent = `Stan w ${secStr}: Witryna w czystym kodzie dawno przyjęła formularz (${scenario.cleanTime.toFixed(2)} s), podczas gdy WordPress blokuje wątek główny telefonu (${wpPct}%).`;
            }
        } else {
            if (wpTimeEl) wpTimeEl.textContent = `${currentWpSec} s — doczytywanie (${wpPct}%)`;
            if (wpLogEl) {
                wpLogEl.textContent = 'Przesunięcia układu i doczytywanie czcionek. Część niecierpliwych użytkowników opuszcza stronę.';
            }
            if (statusTextEl) {
                statusTextEl.textContent = `Stan w ${secStr}: Przesunięcia układu i doczytywanie skryptów (${wpPct}%) — narasta rezygnacja użytkowników mobilnych (do ${scenario.lossPct}).`;
            }
        }
    }

    /**
     * Animacja rosnących liczb i pasków postępu od 0 do scenario.wpDoneMs
     * po kliknięciu w zasięgi ('4g', '3g', 'spike') lub przycisk #runBenchmarkBtn
     */
    function animateGrowingNumbers(scenarioKey, animate = true) {
        stopAllAnimations();
        const resolvedKey = resolveScenarioKey(scenarioKey);
        currentScenarioKey = resolvedKey;
        const scenario = BENCHMARK_PROFILES[resolvedKey] || BENCHMARK_PROFILES['4g'];

        highlightActiveScenarioButtons(resolvedKey);
        syncTableStaticFields(scenario);

        const canAnimate = animate &&
            typeof window !== 'undefined' &&
            typeof window.requestAnimationFrame === 'function' &&
            typeof performance !== 'undefined' &&
            typeof performance.now === 'function';

        if (!canAnimate) {
            if (scrubber) scrubber.value = String(scenario.wpDoneMs);
            renderAtMs(scenario.wpDoneMs);
            return;
        }

        if (scrubber) scrubber.value = '0';
        renderAtMs(0);

        const startTime = performance.now();
        const totalWallDurationMs = 1150;

        function tickRace(now) {
            const elapsed = Math.max(0, now - startTime);
            const progress = Math.min(1, elapsed / totalWallDurationMs);
            const currentMs = Math.round(progress * scenario.wpDoneMs);

            if (scrubber) scrubber.value = String(currentMs);
            renderAtMs(currentMs);

            if (progress < 1) {
                rafId = window.requestAnimationFrame(tickRace);
            } else {
                rafId = null;
                if (scrubber) scrubber.value = String(scenario.wpDoneMs);
                renderAtMs(scenario.wpDoneMs);
            }
        }

        rafId = window.requestAnimationFrame(tickRace);
    }

    /**
     * Odtworzenie żywego wyścigu ładowania (0..scenario.wpDoneMs) po kliknięciu #runBenchmarkBtn
     */
    function playTimelineRace() {
        stopAllAnimations();
        const scenario = BENCHMARK_PROFILES[currentScenarioKey] || BENCHMARK_PROFILES['4g'];
        syncTableStaticFields(scenario);

        let ms = 0;
        const stepMs = Math.max(80, Math.round(scenario.wpDoneMs / 45));
        if (scrubber) scrubber.value = '0';
        renderAtMs(0);

        raceInterval = setInterval(() => {
            ms += stepMs;
            if (ms >= scenario.wpDoneMs) {
                ms = scenario.wpDoneMs;
                stopAllAnimations();
            }
            if (scrubber) scrubber.value = String(ms);
            renderAtMs(ms);
        }, 30);
    }

    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const rawKey = getBtnRawScenario(btn) || '4g';
            animateGrowingNumbers(rawKey, true);
        });
    });

    if (runBtn) {
        runBtn.addEventListener('click', () => {
            playTimelineRace();
        });
    }

    if (scrubber) {
        scrubber.addEventListener('input', () => {
            stopAllAnimations();
            renderAtMs(Number(scrubber.value || 0));
        });
    }

    if (trafficSlider) {
        trafficSlider.addEventListener('input', (e) => {
            const pax = Number(e.target.value) || 100;
            const mappedKey = resolveScenarioKey(pax);
            animateGrowingNumbers(mappedKey, false);
        });
    }

    animateGrowingNumbers('4g', false);
}

const initLiveBenchmark = initHardwareBenchmark;

/* ==========================================================================
   MODUŁ 4: Konfigurator wyceny i portfolio (assets/js/modules/pricing-configurator.js)
   ========================================================================== */

/**
 * Interaktywny Konfigurator Projektu w #pricing z przekazaniem do #contactForm
 */
function initModuleSelector() {
    const tierRows = document.querySelectorAll('.config-tier-row[data-tier-id]');
    const switchBtns = document.querySelectorAll('.module-switch-btn[data-module-code]');
    const summaryTitle = document.getElementById('configSummaryTitle');
    const summaryPrice = document.getElementById('configSummaryPrice');
    const summaryTime = document.getElementById('configSummaryTime');
    const summaryList = document.getElementById('configSummaryList');
    const addonsSummary = document.getElementById('moduleConfigSummary');
    const applyBtn = document.getElementById('applyConfigToFormBtn');
    const messageField = document.querySelector('#contactForm textarea[name="message"]');

    if (!tierRows.length && !switchBtns.length) return;

    let activeTier = document.querySelector('.config-tier-row.is-active') || tierRows[0];
    const selectedModules = new Set();

    function formatPLN(num) {
        return Number(num).toLocaleString('pl-PL');
    }

    function refreshSummary() {
        if (!activeTier) return;
        const basePrice = Number(activeTier.dataset.tierPrice) || 5499;
        const tierName = activeTier.dataset.tierName || 'Strona Firmowa';
        const tierTime = activeTier.dataset.tierTime || '10–14 dni roboczych';
        const itemsRaw = activeTier.dataset.tierItems || '';

        let oneTimeAddons = 0;
        let monthlySla = 0;
        const activeAddonNames = [];

        switchBtns.forEach(sw => {
            if (selectedModules.has(sw.dataset.moduleCode)) {
                const p = Number(sw.dataset.modulePrice) || 0;
                if (sw.dataset.moduleCode === 'SLA_MONITOR_24_7') {
                    monthlySla = p;
                } else {
                    oneTimeAddons += p;
                }
                activeAddonNames.push(sw.dataset.moduleLabel || sw.dataset.moduleCode);
            }
        });

        const totalNet = basePrice + oneTimeAddons;
        const prefix = activeTier.dataset.tierId === 'system' ? 'od ' : '';
        const slaSuffix = monthlySla > 0 ? ` + ${monthlySla} PLN/mies. SLA` : '';

        if (summaryTitle) summaryTitle.textContent = tierName;
        if (summaryPrice) {
            summaryPrice.innerHTML = `${prefix}${formatPLN(totalNet)} <span>PLN netto${slaSuffix}</span>`;
        }
        if (summaryTime) summaryTime.textContent = `Czas realizacji: ${tierTime}`;

        if (summaryList && itemsRaw) {
            summaryList.innerHTML = '';
            itemsRaw.split('|').forEach(itemText => {
                const li = document.createElement('li');
                li.textContent = itemText;
                summaryList.appendChild(li);
            });
        }

        if (addonsSummary) {
            addonsSummary.textContent = activeAddonNames.length
                ? `Wybrane moduły dodatkowe (${activeAddonNames.length}): ${activeAddonNames.join(', ')}`
                : 'Wybrane moduły dodatkowe: brak (możesz zaznaczyć po lewej)';
        }

        if (applyBtn) {
            applyBtn.setAttribute('data-select-tier', `${tierName} (${prefix}${formatPLN(totalNet)} PLN netto${slaSuffix})`);
        }
    }

    tierRows.forEach(row => {
        function activateRow() {
            activeTier = row;
            tierRows.forEach(r => {
                const isAct = r === row;
                r.classList.toggle('is-active', isAct);
                r.setAttribute('aria-checked', String(isAct));
            });
            refreshSummary();
        }

        row.addEventListener('click', activateRow);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateRow();
            }
        });
    });

    switchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.dataset.moduleCode;
            if (selectedModules.has(code)) {
                selectedModules.delete(code);
                btn.classList.remove('is-selected');
                btn.setAttribute('aria-pressed', 'false');
            } else {
                selectedModules.add(code);
                btn.classList.add('is-selected');
                btn.setAttribute('aria-pressed', 'true');
            }
            refreshSummary();
        });
    });

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const tierLabel = applyBtn.getAttribute('data-select-tier') || '';
            const activeLabels = [];
            switchBtns.forEach(sw => {
                if (selectedModules.has(sw.dataset.moduleCode)) {
                    activeLabels.push(sw.dataset.moduleLabel || sw.dataset.moduleCode);
                }
            });

            if (messageField) {
                const modLine = activeLabels.length
                    ? `\nDodatkowe moduły: ${activeLabels.join(', ')}`
                    : '\nDodatkowe moduły: do ustalenia podczas rozmowy';
                messageField.value = `Wybrany wariant z konfiguratora: ${tierLabel}${modLine}\nKrótki opis obecnej strony lub potrzeb firmy: `;
                messageField.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    refreshSummary();
}

/**
 * Przełącznik stanu modułu sprzętowego (First-Frame <-> Second-Frame: Pokrętło <-> Magistrala)
 */
function initHardwareViewSwitcher() {
    const viewBtns = document.querySelectorAll('.hardware-view-btn[data-target-img][data-img-src]');
    if (!viewBtns.length) return;

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.targetImg;
            const imgSrc = btn.dataset.imgSrc;
            const imgEl = document.getElementById(targetId);
            if (imgEl && imgSrc) {
                imgEl.src = imgSrc;
            }
            const group = btn.closest('.hardware-view-switcher');
            if (group) {
                group.querySelectorAll('.hardware-view-btn').forEach(b => {
                    b.classList.toggle('is-active', b === btn);
                });
            }
        });
    });
}

/**
 * Selektor kanałów pomiarowych w 2x2 Industrial Telemetry Grid (#portfolio)
 */
function initTelemetryChannelSelector() {
    const channelBtns = document.querySelectorAll('.channel-select-btn[data-channel-target]');
    const channelCells = document.querySelectorAll('.telemetry-channel-cell');
    if (!channelBtns.length || !channelCells.length) return;

    channelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.channelTarget;
            channelBtns.forEach(b => b.classList.toggle('is-active', b === btn));
            channelCells.forEach(cell => {
                cell.classList.toggle('is-active', cell.id === targetId);
            });
        });
    });
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
                const isDesktopRail = typeof window !== 'undefined' && window.innerWidth >= 980;
                const headerOffset = isDesktopRail ? 16 : 72;
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

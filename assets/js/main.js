/**
 * TwojaStronaWWW.pl – Główny skrypt interfejsu użytkownika (Vanilla JS)
 * Zero zewnętrznych bibliotek, wysoka wydajność, pełna dostępność (a11y).
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

/**
 * Dual-Keyframe X-Ray Split Curtain & Scroll-Scrubbed Motion w Hero
 * Kurtyna i suwak #xraySlider reagują na ręczne przesuwanie oraz płynnie
 * przesuwają się w lewo i w prawo podczas przewijania strony w dół i w górę.
 */
function initScrollScrubbedMotion() {
    if (typeof window === 'undefined') return;

    const stage = document.getElementById('keyframeStage');
    const slider = document.getElementById('xraySlider');
    const curtain = document.getElementById('xrayCurtainOverlay');
    const divider = document.getElementById('xrayDividerLine');
    const panoramaImg = document.getElementById('heroPanoramaImg');

    if (!stage && !slider && !curtain && !divider && !panoramaImg) return;

    const reduceMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

    function setCurtainPercent(pct) {
        const clamped = Math.max(4, Math.min(96, Number(pct) || 58));
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

    function computeScrollShift(scrollY) {
        const y = Math.max(0, Math.min(950, Number(scrollY) || 0));
        return (y / 700) * 44;
    }

    const initialSliderVal = slider ? (Number(slider.value) || 58) : 58;
    let baseOffset = initialSliderVal;

    if (slider) {
        slider.addEventListener('input', () => {
            const val = Math.max(4, Math.min(96, Number(slider.value) || 58));
            const currentY = window.scrollY || window.pageYOffset || 0;
            baseOffset = val + computeScrollShift(currentY);
            setCurtainPercent(val);
        });
    }

    function applyScrollState() {
        const y = window.scrollY || window.pageYOffset || 0;

        if (stage || slider || curtain || divider) {
            const shift = computeScrollShift(y);
            const effectiveBase = Math.max(48, Math.min(92, baseOffset));
            const scrubbedPct = effectiveBase - shift;
            setCurtainPercent(scrubbedPct);
        }

        if (panoramaImg && !reduceMotion) {
            const progress = Math.min(1, Math.max(0, y / 600));
            const scale = 1 + progress * 0.045;
            const translateY = progress * -18;
            panoramaImg.style.transform = `scale(${scale.toFixed(4)}) translateY(${translateY.toFixed(1)}px)`;
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

/**
 * Zintegrowane scenariusze wyścigu ładowania, rosnących liczb i tabeli porównawczej (#porownanie)
 */
const BENCHMARK_SCENARIOS = {
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

/**
 * Interaktywny Symulator Wyścigu Ładowania, Rosnących Liczb i Tabeli Porównawczej w #porownanie
 */
function initHardwareBenchmark() {
    const scrubber = document.getElementById('timelineScrubber') || document.getElementById('editorialTimeSlider');
    const clockEl = document.getElementById('timelineClock') || document.getElementById('sliderTimeValue');
    const runBtn = document.getElementById('runBenchmarkBtn');

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
     * Animacja rosnących liczb po kliknięciu w zasięgi (WS3 + WS1 + WS2)
     */
    function animateGrowingNumbers(scenarioKey, animate = true) {
        stopAllAnimations();
        const resolvedKey = resolveScenarioKey(scenarioKey);
        currentScenarioKey = resolvedKey;
        const scenario = BENCHMARK_SCENARIOS[resolvedKey] || BENCHMARK_SCENARIOS['4g'];

        highlightActiveScenarioButtons(resolvedKey);
        syncTableStaticFields(scenario);

        if (scrubber) scrubber.value = String(scenario.tswDoneMs);
        if (clockEl) clockEl.textContent = `${(scenario.tswDoneMs / 1000).toFixed(2)} s`;
        if (statusTextEl) statusTextEl.textContent = scenario.narrative;

        if (tswTimeEl) tswTimeEl.textContent = `${(scenario.tswDoneMs / 1000).toFixed(2)} s — 100% gotowe`;
        if (wpTimeEl) wpTimeEl.textContent = `${scenario.wpTime.toFixed(2)} s — utrata ${scenario.lossPct} odbiorców`;
        if (tswLogEl) {
            tswLogEl.textContent = 'Pełna treść, cennik i formularz są aktywne. Klient od razu czyta ofertę i wysyła zapytanie.';
        }
        if (wpLogEl) {
            wpLogEl.textContent = `Strona ładuje się aż ${scenario.wpTime.toFixed(2)} s — skutek: ${scenario.statusB.toLowerCase()}.`;
        }

        const canAnimate = animate &&
            typeof window !== 'undefined' &&
            typeof window.requestAnimationFrame === 'function' &&
            typeof performance !== 'undefined' &&
            typeof performance.now === 'function';

        if (!canAnimate) {
            if (bmCleanTimeEl) bmCleanTimeEl.textContent = `${scenario.cleanTime.toFixed(2)}s`;
            if (bmWpTimeEl) bmWpTimeEl.textContent = `${scenario.wpTime.toFixed(2)}s`;
            if (benchTimeAEl) benchTimeAEl.textContent = `${scenario.cleanTime.toFixed(2)} sekundy`;
            if (benchTimeBEl) benchTimeBEl.textContent = formatBenchTimeB(scenario.wpTime, resolvedKey);
            if (tswBarEl) tswBarEl.style.width = '100%';
            if (wpBarEl) wpBarEl.style.width = `${scenario.wpBarWidth}%`;
            if (barA) barA.style.width = `${scenario.cleanBarWidth}%`;
            if (barB) barB.style.width = `${scenario.wpBarWidth}%`;
            return;
        }

        if (tswBarEl) {
            tswBarEl.style.transition = 'none';
            tswBarEl.style.width = '0%';
        }
        if (wpBarEl) {
            wpBarEl.style.transition = 'none';
            wpBarEl.style.width = '0%';
        }
        if (barA) {
            barA.style.transition = 'none';
            barA.style.width = '0%';
        }
        if (barB) {
            barB.style.transition = 'none';
            barB.style.width = '0%';
        }

        const startTime = performance.now();
        const cleanDuration = 280;
        const wpDuration = 900;

        window.requestAnimationFrame(() => {
            if (tswBarEl) {
                tswBarEl.style.transition = 'width 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
                tswBarEl.style.width = '100%';
            }
            if (wpBarEl) {
                wpBarEl.style.transition = 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                wpBarEl.style.width = `${scenario.wpBarWidth}%`;
            }
            if (barA) {
                barA.style.transition = 'width 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
                barA.style.width = `${scenario.cleanBarWidth}%`;
            }
            if (barB) {
                barB.style.transition = 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                barB.style.width = `${scenario.wpBarWidth}%`;
            }
        });

        function tickNumbers(now) {
            const elapsed = Math.max(0, now - startTime);
            const cleanProgress = Math.min(1, elapsed / cleanDuration);
            const wpProgress = Math.min(1, elapsed / wpDuration);

            const currentClean = (scenario.cleanTime * cleanProgress).toFixed(2);
            const currentWp = (scenario.wpTime * wpProgress).toFixed(2);

            if (bmCleanTimeEl) bmCleanTimeEl.textContent = `${currentClean}s`;
            if (bmWpTimeEl) bmWpTimeEl.textContent = `${currentWp}s`;
            if (benchTimeAEl) benchTimeAEl.textContent = `${currentClean} sekundy`;
            if (benchTimeBEl) benchTimeBEl.textContent = formatBenchTimeB(currentWp, resolvedKey);

            if (wpProgress < 1) {
                rafId = window.requestAnimationFrame(tickNumbers);
            } else {
                rafId = null;
                if (bmCleanTimeEl) bmCleanTimeEl.textContent = `${scenario.cleanTime.toFixed(2)}s`;
                if (bmWpTimeEl) bmWpTimeEl.textContent = `${scenario.wpTime.toFixed(2)}s`;
                if (benchTimeAEl) benchTimeAEl.textContent = `${scenario.cleanTime.toFixed(2)} sekundy`;
                if (benchTimeBEl) benchTimeBEl.textContent = formatBenchTimeB(scenario.wpTime, resolvedKey);
                if (statusTextEl) statusTextEl.textContent = scenario.narrative;
            }
        }

        rafId = window.requestAnimationFrame(tickNumbers);
    }

    /**
     * Renderowanie stanu wyścigu ładowania w punkcie czasu ms (0..5000 ms)
     */
    function renderAtMs(rawMs) {
        const ms = Math.max(0, Math.min(5000, Number(rawMs) || 0));
        const scenario = BENCHMARK_SCENARIOS[currentScenarioKey] || BENCHMARK_SCENARIOS['4g'];
        const secNum = ms / 1000;
        const secStr = `${secNum.toFixed(2)} s`;

        if (clockEl) clockEl.textContent = secStr;

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
            barA.style.width = `${Math.max(4, Math.round((tswPct / 100) * scenario.cleanBarWidth))}%`;
        }
        if (barB) {
            barB.style.width = `${Math.max(6, Math.round((wpPct / 100) * scenario.wpBarWidth))}%`;
        }

        const currentCleanSec = ms >= scenario.tswDoneMs
            ? scenario.cleanTime.toFixed(2)
            : secNum.toFixed(2);
        const currentWpSec = ms >= 5000
            ? scenario.wpTime.toFixed(2)
            : Math.min(scenario.wpTime, (ms / 5000) * scenario.wpTime).toFixed(2);

        if (bmCleanTimeEl) bmCleanTimeEl.textContent = `${currentCleanSec}s`;
        if (bmWpTimeEl) bmWpTimeEl.textContent = `${currentWpSec}s`;
        if (benchTimeAEl) benchTimeAEl.textContent = `${currentCleanSec} sekundy`;
        if (benchTimeBEl) benchTimeBEl.textContent = formatBenchTimeB(currentWpSec, currentScenarioKey);

        if (ms >= scenario.tswDoneMs) {
            if (tswTimeEl) tswTimeEl.textContent = `${(scenario.tswDoneMs / 1000).toFixed(2)} s — 100% gotowe`;
            if (tswLogEl) {
                tswLogEl.textContent = 'Pełna treść, cennik i formularz są aktywne. Klient od razu czyta ofertę i wysyła zapytanie.';
            }
        } else {
            if (tswTimeEl) tswTimeEl.textContent = `${secStr} — renderowanie (${tswPct}%)`;
            if (tswLogEl) {
                tswLogEl.textContent = 'Nawiązywanie połączenia TLS i odczyt statycznego pliku HTML (64 KB)...';
            }
        }

        if (ms < 800) {
            if (wpTimeEl) wpTimeEl.textContent = `${secStr} — biały ekran (${wpPct}%)`;
            if (wpLogEl) {
                wpLogEl.textContent = `W ${secStr} ekran telefonu jest nadal pusty — serwer wykonuje zapytania SQL i inicjuje wtyczki.`;
            }
            if (statusTextEl) {
                statusTextEl.textContent = ms >= scenario.tswDoneMs
                    ? `Stan w ${secStr}: TwojaStronaWWW jest już w 100% gotowa (${scenario.cleanTime.toFixed(2)} s), a na WordPressie klient widzi wciąż biały ekran.`
                    : `Stan w ${secStr}: Inicjalizacja połączenia i pobieranie pierwszych pakietów danych.`;
            }
        } else if (ms < 2400) {
            if (wpTimeEl) wpTimeEl.textContent = `${secStr} — blokada skryptów (${wpPct}%)`;
            if (wpLogEl) {
                wpLogEl.textContent = 'Pobieranie 6,8 MB bibliotek wizualnych motywu. Klient nie może jeszcze przewijać strony.';
            }
            if (statusTextEl) {
                statusTextEl.textContent = `Stan w ${secStr}: Witryna w czystym kodzie dawno przyjęła formularz, podczas gdy WordPress blokuje wątek główny telefonu (${wpPct}%).`;
            }
        } else if (ms < 5000 && ms < scenario.wpDoneMs) {
            if (wpTimeEl) wpTimeEl.textContent = `${secStr} — opóźnienie (${wpPct}%)`;
            if (wpLogEl) {
                wpLogEl.textContent = 'Przesunięcia układu i doczytywanie czcionek. Część niecierpliwych użytkowników opuszcza stronę.';
            }
            if (statusTextEl) {
                statusTextEl.textContent = `Stan w ${secStr}: Przesunięcia układu i doczytywanie skryptów — narasta rezygnacja użytkowników mobilnych (do ${scenario.lossPct}).`;
            }
        } else {
            if (wpTimeEl) wpTimeEl.textContent = `${scenario.wpTime.toFixed(2)} s — załadowano zbyt późno`;
            if (wpLogEl) {
                wpLogEl.textContent = `Strona wreszcie się wyświetla, ale około ${scenario.lossPct} klientów mobilnych zdążyło już zamknąć kartę.`;
            }
            if (statusTextEl) {
                statusTextEl.textContent = scenario.narrative;
            }
        }
    }

    /**
     * Odtworzenie żywego wyścigu ładowania (0..5000 ms) po kliknięciu #runBenchmarkBtn
     */
    function playTimelineRace() {
        stopAllAnimations();
        let ms = 0;
        if (scrubber) scrubber.value = '0';
        renderAtMs(0);

        raceInterval = setInterval(() => {
            ms += 100;
            if (ms >= 5000) {
                ms = 5000;
                stopAllAnimations();
            }
            if (scrubber) scrubber.value = String(ms);
            renderAtMs(ms);
        }, 35);
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

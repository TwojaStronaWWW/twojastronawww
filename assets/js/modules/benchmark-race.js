/**
 * Moduł wyścigu ładowania na żywo, animacji rosnących liczb i tabeli porównawczej (assets/js/modules/benchmark-race.js)
 * Odpowiedzialność:
 * - BENCHMARK_PROFILES / BENCHMARK_SCENARIOS: profile obciążenia i sieci ('4g', '3g', 'spike')
 * - initHardwareBenchmark() / initLiveBenchmark(): symulator czasu ładowania, pasków postępu
 *   oraz płynnej animacji rosnących liczb po kliknięciu w zasięgi 4g / 3g / spike
 */

export const BENCHMARK_PROFILES = {
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

export const BENCHMARK_SCENARIOS = BENCHMARK_PROFILES;

/**
 * Interaktywny Symulator Wyścigu Ładowania, Rosnących Liczb i Tabeli Porównawczej w #porownanie
 */
export function initHardwareBenchmark() {
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

export const initLiveBenchmark = initHardwareBenchmark;

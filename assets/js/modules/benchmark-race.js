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
     * Animacja rosnących liczb po kliknięciu w zasięgi ('4g', '3g', 'spike')
     */
    function animateGrowingNumbers(scenarioKey, animate = true) {
        stopAllAnimations();
        const resolvedKey = resolveScenarioKey(scenarioKey);
        currentScenarioKey = resolvedKey;
        const scenario = BENCHMARK_PROFILES[resolvedKey] || BENCHMARK_PROFILES['4g'];

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
        const scenario = BENCHMARK_PROFILES[currentScenarioKey] || BENCHMARK_PROFILES['4g'];
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

export const initLiveBenchmark = initHardwareBenchmark;

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
/**
 * Interaktywna scena Hero XOR Viewport (assets/js/modules/hero-xray.js):
 * 1. Kontener .xor-compositor (isolation: isolate; tło #000) z 3 kwadratami (#fff, mix-blend-mode: difference)
 * 2. Warstwa <canvas id="xorPlasmaCanvas"> z mix-blend-mode: multiply i proceduralną plazmą Simplex/Perlin
 * 3. Warstwa HUD nad maską (obrysy 1px solid rgba(255,255,255,0.3), SECTION 01–03, orbity, stoper TIME)
 */
function initXorHeroViewport() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const stage = document.getElementById('xorViewportStage');
    const plasmaCanvas = document.getElementById('xorPlasmaCanvas');
    const ambientCanvas = document.getElementById('xorAmbientCanvas');
    const orbitCanvas = document.getElementById('xorOrbitCanvas');
    const thumb1 = document.getElementById('xorThumb1');
    const thumb2 = document.getElementById('xorThumb2');
    const timerEl = document.getElementById('xorHudTimer');
    const fpsEl = document.getElementById('xorHudFps');
    const resEl = document.getElementById('xorHudRes');

    const masks = [
        document.getElementById('xorMask1'),
        document.getElementById('xorMask2'),
        document.getElementById('xorMask3')
    ];
    const frames = [
        document.getElementById('xorFrame1'),
        document.getElementById('xorFrame2'),
        document.getElementById('xorFrame3')
    ];

    if (!stage || !plasmaCanvas || typeof plasmaCanvas.getContext !== 'function') return;

    const plasmaCtx = plasmaCanvas.getContext('2d');
    const ambientCtx = ambientCanvas && typeof ambientCanvas.getContext === 'function' ? ambientCanvas.getContext('2d') : null;
    const orbitCtx = orbitCanvas && typeof orbitCanvas.getContext === 'function' ? orbitCanvas.getContext('2d') : null;
    const thumb1Ctx = thumb1 && typeof thumb1.getContext === 'function' ? thumb1.getContext('2d') : null;
    const thumb2Ctx = thumb2 && typeof thumb2.getContext === 'function' ? thumb2.getContext('2d') : null;

    if (!plasmaCtx) return;

    const BUF_W = 180;
    const BUF_H = 160;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = BUF_W;
    offCanvas.height = BUF_H;
    const offCtx = typeof offCanvas.getContext === 'function' ? offCanvas.getContext('2d') : null;
    const imgData = offCtx && typeof offCtx.createImageData === 'function' ? offCtx.createImageData(BUF_W, BUF_H) : null;

    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) perm[i] = i;
    let seed = 1337;
    for (let i = 255; i > 0; i--) {
        seed = (seed * 16807) % 2147483647;
        const j = seed % (i + 1);
        const tmp = perm[i];
        perm[i] = perm[j];
        perm[j] = tmp;
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function lerp(a, b, t) {
        return a + t * (b - a);
    }

    function grad(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -2.0 * v : 2.0 * v);
    }

    function noise2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = fade(xf);
        const v = fade(yf);
        const aa = perm[perm[X] + Y];
        const ab = perm[perm[X] + Y + 1];
        const ba = perm[perm[X + 1] + Y];
        const bb = perm[perm[X + 1] + Y + 1];
        const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
        const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
        return lerp(x1, x2, v) * 0.5 + 0.5;
    }

    let stageW = stage.clientWidth || 640;
    let stageH = stage.clientHeight || 540;

    function syncStageSize() {
        const rect = typeof stage.getBoundingClientRect === 'function' ? stage.getBoundingClientRect() : null;
        if (rect && rect.width > 40 && rect.height > 40) {
            stageW = Math.round(rect.width);
            stageH = Math.round(rect.height);
        }
        plasmaCanvas.width = stageW;
        plasmaCanvas.height = stageH;
        if (orbitCanvas) {
            orbitCanvas.width = stageW;
            orbitCanvas.height = stageH;
        }
        if (resEl) {
            resEl.textContent = `${stageW}x${stageH}`;
        }
    }

    syncStageSize();
    window.addEventListener('resize', syncStageSize, { passive: true });

    const isMobile = () => stageW < 520;
    const boxes = [
        {
            x: stageW * 0.44,
            y: stageH * 0.46,
            lerpFactor: 0.13,
            offsetX: -38,
            offsetY: -18,
            ampX: 28,
            ampY: 22,
            freqX: 1.15,
            freqY: 0.92,
            phase: 0.0,
            getSize: () => (isMobile() ? 136 : 184)
        },
        {
            x: stageW * 0.58,
            y: stageH * 0.42,
            lerpFactor: 0.072,
            offsetX: 44,
            offsetY: -26,
            ampX: 36,
            ampY: 30,
            freqX: 0.84,
            freqY: 1.18,
            phase: 2.1,
            getSize: () => (isMobile() ? 110 : 148)
        },
        {
            x: stageW * 0.50,
            y: stageH * 0.58,
            lerpFactor: 0.042,
            offsetX: 8,
            offsetY: 38,
            ampX: 42,
            ampY: 26,
            freqX: 0.68,
            freqY: 0.78,
            phase: 4.2,
            getSize: () => (isMobile() ? 88 : 118)
        }
    ];

    let pointerX = stageW * 0.5;
    let pointerY = stageH * 0.48;
    let prevPointerX = pointerX;
    let prevPointerY = pointerY;
    let pointerVelocity = 0;
    let pointerActive = false;
    let draggedBoxIndex = -1;
    let hoveredBoxIndex = -1;
    let pulseEnergy = 0;
    const pulseRings = [];

    // Tablica 12 słupków pomiarowych i ich szczytów (Peak Hold) dla analizatora w lewym dolnym rogu
    const NUM_BARS = 12;
    const barValues = new Float32Array(NUM_BARS);
    const barPeaks = new Float32Array(NUM_BARS);

    // 22 bioluminescencyjne cząsteczki fotonowe odrywające się ze skrzydeł motyla
    const spores = Array.from({ length: 22 }, (_, idx) => ({
        angle: (idx / 22) * Math.PI * 2,
        dist: 0.15 + (idx % 7) * 0.11,
        speed: 0.22 + (idx % 5) * 0.07,
        size: 1.2 + (idx % 3) * 0.6,
        phase: idx * 1.7
    }));

    const frameLabels = frames.map(f => (f && f.querySelector ? f.querySelector('.xor-frame-label') : null));

    const getStageCoords = (clientX, clientY) => {
        if (typeof stage.getBoundingClientRect !== 'function') return null;
        const rect = stage.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return null;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
            width: rect.width,
            height: rect.height
        };
    };

    const findNearestBox = (x, y) => {
        let bestIdx = -1;
        let bestDist = Infinity;
        boxes.forEach((box, i) => {
            const d = Math.hypot(x - box.x, y - box.y);
            const hitRadius = box.getSize() * 0.62;
            if (d <= hitRadius && d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        });
        return bestIdx;
    };

    const handlePointerDown = (clientX, clientY) => {
        const pt = getStageCoords(clientX, clientY);
        if (!pt) return;
        pointerX = Math.max(40, Math.min(pt.width - 40, pt.x));
        pointerY = Math.max(40, Math.min(pt.height - 40, pt.y));
        pointerActive = true;
        pulseEnergy = 1.0;
        pulseRings.push({ x: pointerX, y: pointerY, r: 8, alpha: 0.95 });
        if (pulseRings.length > 4) pulseRings.shift();

        const hitIdx = findNearestBox(pt.x, pt.y);
        if (hitIdx !== -1) {
            draggedBoxIndex = hitIdx;
        } else {
            let closest = 0;
            let minD = Infinity;
            boxes.forEach((box, i) => {
                const d = Math.hypot(pt.x - box.x, pt.y - box.y);
                if (d < minD) {
                    minD = d;
                    closest = i;
                }
            });
            draggedBoxIndex = closest;
        }

        if (draggedBoxIndex !== -1) {
            boxes[draggedBoxIndex].customX = pointerX;
            boxes[draggedBoxIndex].customY = pointerY;
        }
    };

    const handlePointerMove = (clientX, clientY) => {
        const pt = getStageCoords(clientX, clientY);
        if (!pt) return;
        const { x: relX, y: relY, width, height } = pt;

        if (relX >= -120 && relX <= width + 120 && relY >= -120 && relY <= height + 120) {
            const nextX = Math.max(44, Math.min(width - 44, relX));
            const nextY = Math.max(44, Math.min(height - 44, relY));
            const stepDist = Math.hypot(nextX - prevPointerX, nextY - prevPointerY);
            pointerVelocity = Math.min(1.0, pointerVelocity * 0.75 + (stepDist / 38) * 0.65);
            prevPointerX = nextX;
            prevPointerY = nextY;
            pointerX = nextX;
            pointerY = nextY;
            pointerActive = true;
            hoveredBoxIndex = findNearestBox(relX, relY);

            if (draggedBoxIndex !== -1 && boxes[draggedBoxIndex]) {
                boxes[draggedBoxIndex].customX = pointerX;
                boxes[draggedBoxIndex].customY = pointerY;
            }
        } else if (draggedBoxIndex === -1) {
            pointerActive = false;
            hoveredBoxIndex = -1;
        }
    };

    const handlePointerUp = () => {
        draggedBoxIndex = -1;
    };

    if (typeof stage.addEventListener === 'function') {
        stage.addEventListener('mousedown', (e) => {
            if (e && typeof e.clientX === 'number') {
                handlePointerDown(e.clientX, e.clientY);
            }
        });

        stage.addEventListener('touchstart', (e) => {
            if (e && e.touches && e.touches[0]) {
                handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        stage.addEventListener('touchmove', (e) => {
            if (e && e.touches && e.touches[0]) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        stage.addEventListener('touchend', handlePointerUp, { passive: true });
    }

    window.addEventListener('mousemove', (e) => {
        if (e && typeof e.clientX === 'number') {
            handlePointerMove(e.clientX, e.clientY);
        }
    }, { passive: true });

    window.addEventListener('mouseup', handlePointerUp, { passive: true });

    function renderTelemetryBars(tSec, rig, centers) {
        if (!thumb2Ctx || !thumb2) return;
        const w = thumb2.width || 156;
        const h = thumb2.height || 52;
        thumb2Ctx.clearRect(0, 0, w, h);

        // Tło siatki oscyloskopowej
        thumb2Ctx.strokeStyle = 'rgba(0, 229, 153, 0.12)';
        thumb2Ctx.lineWidth = 0.5;
        for (let gy = 12; gy < h; gy += 12) {
            thumb2Ctx.beginPath();
            thumb2Ctx.moveTo(0, gy);
            thumb2Ctx.lineTo(w, gy);
            thumb2Ctx.stroke();
        }

        const leftSpan = rig ? rig.leftSpan : 1.0;
        const rightSpan = rig ? rig.rightSpan : 1.0;
        const hindSpread = rig ? rig.hindSpread : 1.0;
        const flap = 0.5 + 0.5 * Math.sin(tSec * 1.85);

        // Oblicz stopień zbliżenia/nałożenia kwadracików XOR
        let overlapScore = 0.42;
        if (centers && centers.length >= 3) {
            const d01 = Math.hypot(centers[0].x - centers[1].x, centers[0].y - centers[1].y);
            const d12 = Math.hypot(centers[1].x - centers[2].x, centers[1].y - centers[2].y);
            overlapScore = Math.max(0.15, Math.min(0.98, 1.0 - (d01 + d12) / (stageW * 0.95)));
        }

        const barAreaW = 84;
        const barStep = barAreaW / NUM_BARS;
        const barW = Math.max(3, barStep - 2);
        const maxBarH = h - 14;

        for (let i = 0; i < NUM_BARS; i++) {
            const bandPhase = tSec * (2.4 + (i % 4) * 0.55) + i * 0.72;
            const wave = 0.5 + 0.5 * Math.sin(bandPhase);
            let target = 0.25;
            if (i < 4) {
                target = Math.min(1, (leftSpan - 0.45) * 0.75 + wave * 0.22 + pointerVelocity * 0.35 + pulseEnergy * 0.3);
            } else if (i < 8) {
                target = Math.min(1, overlapScore * 0.65 + flap * 0.28 + pointerVelocity * 0.4 + pulseEnergy * 0.35);
            } else {
                target = Math.min(1, (rightSpan - 0.45) * 0.72 + (hindSpread - 0.5) * 0.25 + wave * 0.2 + pointerVelocity * 0.35);
            }

            barValues[i] += (target - barValues[i]) * 0.28;
            if (barValues[i] >= barPeaks[i]) {
                barPeaks[i] = barValues[i];
            } else {
                barPeaks[i] = Math.max(0.05, barPeaks[i] - 0.012);
            }

            const bx = 5 + i * barStep;
            const bh = Math.max(2, Math.round(barValues[i] * maxBarH));
            const by = h - 4 - bh;

            thumb2Ctx.fillStyle = i % 3 === 0 ? '#00E599' : (i % 2 === 0 ? '#00C482' : '#4FFFD2');
            thumb2Ctx.fillRect(bx, by, barW, bh);

            // Znacznik szczytu (Peak Hold)
            const py = Math.max(3, Math.round(h - 4 - barPeaks[i] * maxBarH) - 2);
            thumb2Ctx.fillStyle = '#E8FFF8';
            thumb2Ctx.fillRect(bx, py, barW, 1.5);
        }

        // Prawa część: 3 poziome paski telemetryczne (SPAN, FLUX, XOR)
        const rightX = 94;
        const meterW = w - rightX - 6;
        const metrics = [
            { lbl: 'SPAN', val: Math.min(1, (leftSpan + rightSpan) * 0.46) },
            { lbl: 'FLUX', val: Math.min(1, 0.32 + pointerVelocity * 0.65 + pulseEnergy * 0.4 + flap * 0.2) },
            { lbl: 'XOR', val: overlapScore }
        ];

        thumb2Ctx.font = '600 7px monospace';
        metrics.forEach((m, idx) => {
            const my = 11 + idx * 15;
            thumb2Ctx.fillStyle = 'rgba(232, 255, 248, 0.86)';
            if (typeof thumb2Ctx.fillText === 'function') {
                thumb2Ctx.fillText(`${m.lbl} ${Math.round(m.val * 100)}%`, rightX, my);
            }
            thumb2Ctx.fillStyle = 'rgba(0, 229, 153, 0.16)';
            thumb2Ctx.fillRect(rightX, my + 3, meterW, 3);
            thumb2Ctx.fillStyle = '#00E599';
            thumb2Ctx.fillRect(rightX, my + 3, Math.round(meterW * m.val), 3);
        });
    }

    function renderPlasmaBuffer(tSec, rig, centers) {
        if (!offCtx || !imgData) return;
        const data = imgData.data;
        let idx = 0;

        const leftSpan = rig ? rig.leftSpan : 1.0;
        const rightSpan = rig ? rig.rightSpan : 1.0;
        const leftLift = rig ? rig.leftLift : 0.0;
        const rightLift = rig ? rig.rightLift : 0.0;
        const hindSpread = rig ? rig.hindSpread : 1.0;
        const bodySway = rig ? rig.bodySway : 0.0;
        const centerShiftX = rig ? rig.centerShiftX : 0.0;
        const centerShiftY = rig ? rig.centerShiftY : 0.0;

        const hoverY = 0.025 * Math.sin(tSec * 1.45) + centerShiftY;
        const tilt = 0.05 * Math.sin(tSec * 0.78) + (rightLift - leftLift) * 0.32;
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const flapScale = 0.86 + 0.14 * Math.sin(tSec * 1.85);
        const veinBoost = 0.48 + pulseEnergy * 0.35;

        for (let py = 0; py < BUF_H; py++) {
            const y0 = (py / BUF_H - 0.50) * 1.92 - hoverY;
            for (let px = 0; px < BUF_W; px++) {
                const x0 = (px / BUF_W - 0.50) * 1.98 - centerShiftX;

                const rx = x0 * cosT - y0 * sinT;
                const ry = x0 * sinT + y0 * cosT;

                const isLeft = rx < 0;
                const sideSpan = Math.max(0.52, (isLeft ? leftSpan : rightSpan) * flapScale);
                const sideLift = isLeft ? leftLift : rightLift;

                const u = Math.abs(rx - bodySway * ry * 0.35) / sideSpan;
                const v = ry - sideLift * Math.min(1.2, u * 0.85) + 0.04 * (1 - flapScale) * u * u;

                const nSym = noise2D(u * 2.6 - tSec * 0.32, v * 2.6 + tSec * 0.22);
                const nFine = noise2D(u * 5.4 + nSym * 1.2, v * 5.4 - tSec * 0.38);

                const uw = Math.max(0, u + (nSym - 0.5) * 0.036);
                const vw = v + (nFine - 0.5) * 0.036;

                const r = Math.hypot(uw, vw);
                const theta = Math.atan2(-vw, uw + 1e-6);

                const dThetaFore = theta - 0.44;
                const sigmaFore = dThetaFore >= 0 ? 0.58 : 0.38;
                const rFore = 0.96 * Math.exp(-Math.pow(dThetaFore / sigmaFore, 2)) *
                    (1.0 + 0.035 * Math.sin(theta * 3.0) + 0.018 * Math.sin(theta * 16.0));

                const dThetaHind = theta + 0.54;
                const sigmaHind = dThetaHind >= 0 ? 0.33 : 0.48;
                const rHindBase = 0.74 * hindSpread * Math.exp(-Math.pow(dThetaHind / sigmaHind, 2));
                const rHind = (rHindBase + 0.13 * hindSpread * Math.exp(-Math.pow((theta + 0.88) / 0.18, 2))) *
                    (1.0 + 0.028 * Math.sin(theta * 20.0));

                const wingR = Math.pow(Math.pow(rFore, 4) + Math.pow(rHind, 4), 0.25);
                const nr = r / (wingR + 1e-5);

                const wingMask = nr <= 1.0
                    ? 1.0 - Math.pow(nr, 6.5) * 0.20
                    : Math.exp(-Math.pow((nr - 1.0) / 0.08, 2)) * 0.74;

                const wingRim = Math.exp(-Math.pow((nr - 0.88) / 0.095, 2)) * 0.96;
                const wingInner = Math.exp(-Math.pow((nr - 0.48) / 0.36, 2)) * (0.52 + 0.48 * nSym);
                const veinPhase = theta * 13.0 + nr * 2.2 * Math.sin(theta * 2.5) + (nSym - 0.5) * 1.1;
                const veins = Math.pow(0.5 + 0.5 * Math.cos(veinPhase), 3.6) *
                    Math.min(1, nr * 2.4) * (nr <= 1.05 ? 1.0 : 0.0);

                const dEye1 = Math.hypot(uw - 0.46, vw + 0.24);
                const eye1 = Math.exp(-Math.pow(dEye1 / 0.092, 2)) * 0.88 +
                    Math.exp(-Math.pow((dEye1 - 0.148) / 0.038, 2)) * 0.64;

                const dEye2 = Math.hypot(uw - 0.31, vw - 0.23);
                const eye2 = Math.exp(-Math.pow(dEye2 / 0.072, 2)) * 0.80 +
                    Math.exp(-Math.pow((dEye2 - 0.115) / 0.030, 2)) * 0.54;

                const hingeCleft = Math.min(1.0, Math.pow(u / 0.048, 2.0));
                const wingVal = wingMask * hingeCleft * (
                    wingInner * 0.68 +
                    wingRim * 0.76 +
                    veins * veinBoost +
                    (eye1 + eye2) * 0.65
                );

                const bodyWidth = 0.025 * (1.0 - 0.42 * Math.pow((v - 0.04) / 0.40, 2)) +
                    0.009 * Math.exp(-Math.pow((v + 0.12) / 0.10, 2));
                const bodyEnvY = Math.exp(-Math.pow((v - 0.05) / 0.31, 4));
                const bodyVal = bodyEnvY *
                    Math.exp(-Math.pow(u / Math.max(0.011, bodyWidth), 2)) *
                    (0.88 + 0.12 * Math.cos(v * 34.0));

                const antT = (-v - 0.21) / 0.46;
                let antVal = 0;
                if (antT > 0 && antT < 1.35) {
                    const antLenEnv = Math.min(1, antT * 4.2) *
                        Math.exp(-Math.pow(Math.max(0, antT - 0.86) / 0.15, 2));
                    const antCurveU = 0.012 + 0.27 * Math.pow(antT, 1.45) +
                        0.012 * Math.sin(antT * 4.5 - tSec * 2.2);
                    const clubBoost = 1.0 + 0.80 * Math.exp(-Math.pow((antT - 0.88) / 0.08, 2));
                    const antRadius = 0.014 + 0.008 * Math.exp(-Math.pow((antT - 0.88) / 0.08, 2));
                    antVal = antLenEnv * clubBoost *
                        Math.exp(-Math.pow((u - antCurveU) / antRadius, 2)) * 0.78;
                }

                const val = Math.min(1, Math.max(0, wingVal + bodyVal + antVal));

                // Mapowanie koloru na szmaragdową paletę strony (#00E599 / #00C482 / #E8FFF8)
                const rCol = Math.min(255, Math.floor(Math.pow(val, 3.3) * 225));
                const gCol = Math.min(255, Math.floor(Math.pow(val, 0.70) * 240));
                const bCol = Math.min(255, Math.floor(Math.pow(val, 1.05) * 168 + Math.pow(val, 2.7) * 82));

                data[idx] = rCol;
                data[idx + 1] = gCol;
                data[idx + 2] = bCol;
                data[idx + 3] = 255;
                idx += 4;
            }
        }

        offCtx.putImageData(imgData, 0, 0);

        plasmaCtx.imageSmoothingEnabled = true;
        plasmaCtx.clearRect(0, 0, stageW, stageH);
        plasmaCtx.drawImage(offCanvas, 0, 0, stageW, stageH);

        if (ambientCtx && ambientCanvas) {
            ambientCtx.imageSmoothingEnabled = true;
            ambientCtx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
            ambientCtx.drawImage(offCanvas, 0, 0, ambientCanvas.width, ambientCanvas.height);
        }

        if (thumb1Ctx && thumb1) {
            const tw = thumb1.width || 52;
            const th = thumb1.height || 52;
            thumb1Ctx.clearRect(0, 0, tw, th);
            thumb1Ctx.drawImage(
                offCanvas,
                Math.floor(BUF_W * 0.06),
                Math.floor(BUF_H * 0.06),
                Math.floor(BUF_W * 0.88),
                Math.floor(BUF_H * 0.88),
                0,
                0,
                tw,
                th
            );
            const scanY = Math.floor(((tSec * 22) % th));
            thumb1Ctx.fillStyle = 'rgba(0, 229, 153, 0.55)';
            thumb1Ctx.fillRect(0, scanY, tw, 1);
        }

        renderTelemetryBars(tSec, rig, centers);
    }

    function drawNodeCircle(ctx, x, y, radius, isHighlighted) {
        if (typeof ctx.arc !== 'function') return;
        ctx.save();
        ctx.strokeStyle = isHighlighted ? '#00E599' : 'rgba(0, 229, 153, 0.68)';
        ctx.lineWidth = isHighlighted ? 1.5 : 1.0;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        if (isHighlighted) {
            ctx.strokeStyle = 'rgba(0, 229, 153, 0.42)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = isHighlighted ? '#E8FFF8' : '#00E599';
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function renderOrbitsAndLinks(tSec, centers, rig) {
        if (!orbitCtx) return;
        orbitCtx.clearRect(0, 0, stageW, stageH);

        const cx = stageW * 0.5 + (rig ? rig.centerShiftX * stageW * 0.45 : 0);
        const cy = stageH * 0.48 + (rig ? rig.centerShiftY * stageH * 0.45 : 0);
        const baseR = Math.min(stageW, stageH) * 0.35;

        spores.forEach((sp) => {
            const rNorm = (sp.dist + tSec * sp.speed * 0.35) % 1.0;
            const curR = baseR * (0.18 + rNorm * 0.95);
            const curAngle = sp.angle + Math.sin(tSec * 0.9 + sp.phase) * 0.45;
            const sx = cx + Math.cos(curAngle) * curR * (rig ? (rig.leftSpan + rig.rightSpan) * 0.5 : 1);
            const sy = cy + Math.sin(curAngle) * curR * 0.78 - rNorm * 26;
            const alpha = Math.sin(rNorm * Math.PI) * 0.65;
            orbitCtx.fillStyle = `rgba(0, 229, 153, ${alpha.toFixed(2)})`;
            orbitCtx.fillRect(sx, sy, sp.size, sp.size);
        });

        for (let i = pulseRings.length - 1; i >= 0; i--) {
            const pr = pulseRings[i];
            pr.r += 4.2;
            pr.alpha *= 0.93;
            if (pr.alpha < 0.03) {
                pulseRings.splice(i, 1);
                continue;
            }
            if (typeof orbitCtx.arc === 'function') {
                orbitCtx.save();
                orbitCtx.strokeStyle = `rgba(0, 229, 153, ${pr.alpha.toFixed(2)})`;
                orbitCtx.lineWidth = 1.2;
                orbitCtx.beginPath();
                orbitCtx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
                orbitCtx.stroke();
                orbitCtx.restore();
            }
        }

        const orbits = [
            { rx: baseR * 1.04, ry: baseR * 0.68, rot: -0.35 + tSec * 0.08 },
            { rx: baseR * 0.88, ry: baseR * 0.96, rot: 0.48 - tSec * 0.06 },
            { rx: baseR * 1.14, ry: baseR * 0.54, rot: 1.12 + tSec * 0.05 }
        ];

        const orbitNodes = [];

        orbitCtx.strokeStyle = 'rgba(0, 229, 153, 0.18)';
        orbitCtx.lineWidth = 0.85;

        orbits.forEach((orb, i) => {
            orbitCtx.save();
            orbitCtx.translate(cx, cy);
            orbitCtx.rotate(orb.rot);
            orbitCtx.beginPath();
            orbitCtx.ellipse(0, 0, orb.rx, orb.ry, 0, 0, Math.PI * 2);
            orbitCtx.stroke();
            orbitCtx.restore();

            const angle = tSec * (0.48 + i * 0.15) + i * 2.1;
            const lx = Math.cos(angle) * orb.rx;
            const ly = Math.sin(angle) * orb.ry;
            const cosR = Math.cos(orb.rot);
            const sinR = Math.sin(orb.rot);
            const gx = cx + lx * cosR - ly * sinR;
            const gy = cy + lx * sinR + ly * cosR;
            orbitNodes.push({ x: gx, y: gy });

            drawNodeCircle(orbitCtx, gx, gy, 4.5, false);
        });

        const leftWingAnchor = {
            x: cx - baseR * 0.48 * (rig ? rig.leftSpan : 1),
            y: cy - baseR * 0.28 - (rig ? rig.leftLift * baseR * 0.45 : 0)
        };
        const rightWingAnchor = {
            x: cx + baseR * 0.48 * (rig ? rig.rightSpan : 1),
            y: cy - baseR * 0.28 - (rig ? rig.rightLift * baseR * 0.45 : 0)
        };
        const lowerWingAnchor = {
            x: cx + (rig ? rig.bodySway * baseR * 0.35 : 0),
            y: cy + baseR * 0.34 * (rig ? rig.hindSpread : 1)
        };
        const wingAnchors = [leftWingAnchor, rightWingAnchor, lowerWingAnchor];

        if (centers.length >= 3) {
            orbitCtx.strokeStyle = 'rgba(0, 229, 153, 0.38)';
            orbitCtx.lineWidth = 1.0;
            orbitCtx.beginPath();
            orbitCtx.moveTo(centers[0].x, centers[0].y);
            orbitCtx.lineTo(centers[1].x, centers[1].y);
            orbitCtx.lineTo(centers[2].x, centers[2].y);
            orbitCtx.closePath();
            orbitCtx.stroke();

            centers.forEach((center, i) => {
                const anchor = wingAnchors[i];
                const orbNode = orbitNodes[i];
                const isActive = draggedBoxIndex === i || hoveredBoxIndex === i;

                if (anchor) {
                    orbitCtx.strokeStyle = isActive
                        ? 'rgba(0, 229, 153, 0.85)'
                        : 'rgba(0, 229, 153, 0.36)';
                    orbitCtx.lineWidth = isActive ? 1.3 : 0.85;
                    orbitCtx.beginPath();
                    orbitCtx.moveTo(center.x, center.y);
                    orbitCtx.lineTo(anchor.x, anchor.y);
                    orbitCtx.stroke();

                    drawNodeCircle(orbitCtx, anchor.x, anchor.y, 5.0, isActive);
                }

                if (orbNode) {
                    orbitCtx.strokeStyle = 'rgba(0, 229, 153, 0.20)';
                    orbitCtx.lineWidth = 0.75;
                    orbitCtx.beginPath();
                    orbitCtx.moveTo(center.x, center.y);
                    orbitCtx.lineTo(orbNode.x, orbNode.y);
                    orbitCtx.stroke();
                }

                drawNodeCircle(orbitCtx, center.x, center.y, 8.0, isActive);
            });
        }
    }

    const startTimeMs = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    let lastFpsTime = startTimeMs;
    let frameCount = 0;

    function formatTimer(elapsedMs) {
        const totalSec = elapsedMs / 1000;
        const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const secs = String(Math.floor(totalSec % 60)).padStart(2, '0');
        const cs = String(Math.floor((elapsedMs % 1000) / 10)).padStart(2, '0');
        return `${mins}:${secs}.${cs}`;
    }

    function tick(nowRaw) {
        const now = typeof nowRaw === 'number' ? nowRaw : Date.now();
        const elapsedMs = Math.max(0, now - startTimeMs);
        const tSec = elapsedMs / 1000;

        pointerVelocity *= 0.94;
        pulseEnergy *= 0.92;

        frameCount++;
        if (now - lastFpsTime >= 500) {
            const fps = Math.min(60, Math.max(50, Math.round((frameCount * 1000) / (now - lastFpsTime))));
            if (fpsEl) fpsEl.textContent = `${fps}FPS`;
            frameCount = 0;
            lastFpsTime = now;
        }

        if (timerEl) {
            timerEl.textContent = formatTimer(elapsedMs);
        }

        const baseTargetX = pointerActive
            ? pointerX
            : stageW * 0.5 + Math.cos(tSec * 0.55) * (stageW * 0.07);
        const baseTargetY = pointerActive
            ? pointerY
            : stageH * 0.48 + Math.sin(tSec * 0.42) * (stageH * 0.06);

        const centers = [];

        boxes.forEach((box, i) => {
            const size = box.getSize();
            const isBeingDragged = draggedBoxIndex === i;
            const driftScale = isBeingDragged ? 0.12 : 1.0;
            const driftX = Math.sin(tSec * box.freqX + box.phase) * box.ampX * driftScale;
            const driftY = Math.cos(tSec * box.freqY + box.phase) * box.ampY * driftScale;

            let targetCenterX;
            let targetCenterY;

            if (isBeingDragged && typeof box.customX === 'number' && typeof box.customY === 'number') {
                targetCenterX = box.customX;
                targetCenterY = box.customY;
            } else if (typeof box.customX === 'number' && typeof box.customY === 'number' && !pointerActive) {
                targetCenterX = box.customX + driftX * 0.5;
                targetCenterY = box.customY + driftY * 0.5;
            } else {
                targetCenterX = baseTargetX + box.offsetX + driftX;
                targetCenterY = baseTargetY + box.offsetY + driftY;
            }

            const activeLerp = isBeingDragged ? 0.34 : box.lerpFactor;
            box.x += (targetCenterX - box.x) * activeLerp;
            box.y += (targetCenterY - box.y) * activeLerp;

            const half = size * 0.5;
            const clampedCenterX = Math.max(half + 14, Math.min(stageW - half - 14, box.x));
            const clampedCenterY = Math.max(half + 44, Math.min(stageH - half - 54, box.y));

            const topLeftX = clampedCenterX - half;
            const topLeftY = clampedCenterY - half;
            const transformStr = `translate3d(${topLeftX.toFixed(1)}px, ${topLeftY.toFixed(1)}px, 0)`;

            if (masks[i] && masks[i].style) {
                masks[i].style.transform = transformStr;
            }
            if (frames[i] && frames[i].style) {
                frames[i].style.transform = transformStr;
            }

            centers.push({ x: clampedCenterX, y: clampedCenterY });
        });

        const c0x = (centers[0].x - stageW * 0.5) / (stageW * 0.5);
        const c0y = (centers[0].y - stageH * 0.48) / (stageH * 0.5);
        const c1x = (centers[1].x - stageW * 0.5) / (stageW * 0.5);
        const c1y = (centers[1].y - stageH * 0.48) / (stageH * 0.5);
        const c2x = (centers[2].x - stageW * 0.5) / (stageW * 0.5);
        const c2y = (centers[2].y - stageH * 0.5) / (stageH * 0.5);

        const rig = {
            leftSpan: Math.max(0.62, Math.min(1.42, 0.92 + (-c0x) * 0.72)),
            rightSpan: Math.max(0.62, Math.min(1.42, 0.92 + (c1x) * 0.72)),
            leftLift: Math.max(-0.35, Math.min(0.35, -c0y * 0.38)),
            rightLift: Math.max(-0.35, Math.min(0.35, -c1y * 0.38)),
            hindSpread: Math.max(0.72, Math.min(1.36, 0.92 + c2y * 0.58)),
            bodySway: Math.max(-0.35, Math.min(0.35, c2x * 0.42)),
            centerShiftX: (c0x + c1x + c2x) * 0.08,
            centerShiftY: (c0y + c1y + c2y) * 0.08
        };

        if (frameLabels[0]) {
            frameLabels[0].textContent = `SECTION 01 · L ${Math.round(rig.leftSpan * 100)}%`;
        }
        if (frameLabels[1]) {
            frameLabels[1].textContent = `SECTION 02 · R ${Math.round(rig.rightSpan * 100)}%`;
        }
        if (frameLabels[2]) {
            frameLabels[2].textContent = `SECTION 03 · Z ${Math.round(rig.hindSpread * 100)}%`;
        }

        renderPlasmaBuffer(tSec, rig, centers);
        renderOrbitsAndLinks(tSec, centers, rig);

        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(tick);
        }
    }

    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(tick);
    } else {
        tick(startTimeMs);
    }
}

function initScrollScrubbedMotion() {
    if (typeof window === 'undefined') return;

    initXorHeroViewport();

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

/**
 * Moduł kurtyny X-Ray i animacji Scroll-Scrubbed Motion w sekcji Hero (assets/js/modules/hero-xray.js)
 * Odpowiedzialność:
 * - initScrollScrubbedMotion() / initScrollMotion(): suwak #xraySlider i kurtyna #xrayCurtainOverlay
 *   poruszająca się płynnie w lewo i w prawo podczas przewijania strony oraz przy ręcznym przeciąganiu
 * - initHardwareViewSwitcher(): przełącznik stanu modułu sprzętowego (First-Frame <-> Second-Frame)
 */

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
export function initXorHeroViewport() {
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

    // Bufor niskiej rozdzielczości do szybkiego generowania płynnej plazmy Simplex/Perlin 60 FPS
    const BUF_W = 140;
    const BUF_H = 120;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = BUF_W;
    offCanvas.height = BUF_H;
    const offCtx = typeof offCanvas.getContext === 'function' ? offCanvas.getContext('2d') : null;
    const imgData = offCtx && typeof offCtx.createImageData === 'function' ? offCtx.createImageData(BUF_W, BUF_H) : null;

    // Szybki deterministyczny szum 2D (Perlin/Value-Gradient hybrid)
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

    // Konfiguracja 3 okien SECTION 01, SECTION 02, SECTION 03 (różne rozmiary, prędkości LERP i fazy dryfu)
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
    let pointerActive = false;

    const handlePointerMove = (clientX, clientY) => {
        if (typeof stage.getBoundingClientRect !== 'function') return;
        const rect = stage.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        if (relX >= -120 && relX <= rect.width + 120 && relY >= -120 && relY <= rect.height + 120) {
            pointerX = Math.max(60, Math.min(rect.width - 60, relX));
            pointerY = Math.max(60, Math.min(rect.height - 60, relY));
            pointerActive = true;
        } else {
            pointerActive = false;
        }
    };

    window.addEventListener('mousemove', (e) => {
        if (e && typeof e.clientX === 'number') {
            handlePointerMove(e.clientX, e.clientY);
        }
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
        if (e && e.touches && e.touches[0]) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    function renderPlasmaBuffer(tSec) {
        if (!offCtx || !imgData) return;
        const data = imgData.data;
        let idx = 0;

        for (let py = 0; py < BUF_H; py++) {
            const ny = (py / BUF_H - 0.48) * 2.15;
            for (let px = 0; px < BUF_W; px++) {
                const nx = (px / BUF_W - 0.5) * 2.25;

                // Domain warping (płynny szum Perlin/Simplex 2 oktaw)
                const n1 = noise2D(nx * 1.65 + tSec * 0.38, ny * 1.65 - tSec * 0.28);
                const n2 = noise2D(nx * 3.1 - tSec * 0.44 + n1 * 1.4, ny * 2.9 + tSec * 0.34);

                const wx = nx + (n1 - 0.5) * 0.42;
                const wy = ny + (n2 - 0.5) * 0.38;

                // Dwuplatowa forma bioluminescencyjna (jak na referencji recent.design)
                const absX = Math.abs(wx);
                const lobeCenter = 0.36 + 0.12 * Math.sin(wy * 2.1 - tSec * 0.65);
                const distLobe = Math.abs(absX - lobeCenter);

                // Centralna szczelina + jasne krawędzie wewnętrzne i falujące prążki
                const cleftMask = Math.min(1, absX / 0.085);
                const verticalEnv = Math.max(0, 1 - Math.pow(wy / 0.96, 2) * 0.92);
                const ridge = 0.5 + 0.5 * Math.cos((absX - lobeCenter) * 15.0 + n2 * 4.2 - tSec * 1.1);

                let intensity = Math.exp(-distLobe * distLobe * 6.8) * verticalEnv * cleftMask;
                intensity *= (0.62 + 0.55 * ridge) * (0.68 + 0.52 * n1);

                // Dodatkowa dolna smuga plazmowa
                const tail = Math.exp(-Math.pow((wx - 0.08 * Math.sin(wy * 3 + tSec)) * 2.1, 2)) *
                    Math.max(0, 1 - Math.pow((wy - 0.45) / 0.7, 2)) * 0.42 * cleftMask;

                const val = Math.min(1, Math.max(0, intensity + tail));

                // Mapowanie koloru na elektryczny błękit / cyjan / biel rdzenia
                const r = Math.min(255, Math.floor(Math.pow(val, 3.1) * 235));
                const g = Math.min(255, Math.floor(Math.pow(val, 1.55) * 225));
                const b = Math.min(255, Math.floor(Math.pow(val, 0.72) * 255));

                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
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
            thumb1Ctx.drawImage(
                offCanvas,
                Math.floor(BUF_W * 0.22),
                Math.floor(BUF_H * 0.22),
                Math.floor(BUF_W * 0.45),
                Math.floor(BUF_H * 0.45),
                0,
                0,
                thumb1.width,
                thumb1.height
            );
        }

        if (thumb2Ctx && thumb2) {
            thumb2Ctx.drawImage(
                offCanvas,
                Math.floor(BUF_W * 0.36),
                Math.floor(BUF_H * 0.30),
                Math.floor(BUF_W * 0.32),
                Math.floor(BUF_H * 0.32),
                0,
                0,
                thumb2.width,
                thumb2.height
            );
        }
    }

    function renderOrbitsAndLinks(tSec, centers) {
        if (!orbitCtx) return;
        orbitCtx.clearRect(0, 0, stageW, stageH);

        const cx = stageW * 0.5;
        const cy = stageH * 0.47;
        const baseR = Math.min(stageW, stageH) * 0.34;

        // Cienkie pierścienie orbitalne wokół plazmy
        const orbits = [
            { rx: baseR * 1.02, ry: baseR * 0.68, rot: -0.35 + tSec * 0.08 },
            { rx: baseR * 0.88, ry: baseR * 0.96, rot: 0.48 - tSec * 0.06 },
            { rx: baseR * 1.12, ry: baseR * 0.52, rot: 1.12 + tSec * 0.05 }
        ];

        orbitCtx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
        orbitCtx.lineWidth = 0.85;

        orbits.forEach((orb, i) => {
            orbitCtx.save();
            orbitCtx.translate(cx, cy);
            orbitCtx.rotate(orb.rot);
            orbitCtx.beginPath();
            orbitCtx.ellipse(0, 0, orb.rx, orb.ry, 0, 0, Math.PI * 2);
            orbitCtx.stroke();

            // Drobny punkt telemetryczny na orbicie
            const angle = tSec * (0.55 + i * 0.18) + i * 2.0;
            const px = Math.cos(angle) * orb.rx;
            const py = Math.sin(angle) * orb.ry;
            orbitCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            orbitCtx.fillRect(px - 1, py - 1, 2, 2);
            orbitCtx.restore();
        });

        // Cienkie wektory łączące środki kwadratów SECTION 01–03
        if (centers.length >= 3) {
            orbitCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            orbitCtx.lineWidth = 0.8;
            orbitCtx.beginPath();
            orbitCtx.moveTo(centers[0].x, centers[0].y);
            orbitCtx.lineTo(centers[1].x, centers[1].y);
            orbitCtx.lineTo(centers[2].x, centers[2].y);
            orbitCtx.stroke();
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

        // Punkt docelowy: kursor lub płynna orbita autonomiczna, jeśli kursor poza sceną
        const baseTargetX = pointerActive
            ? pointerX
            : stageW * 0.5 + Math.cos(tSec * 0.55) * (stageW * 0.08);
        const baseTargetY = pointerActive
            ? pointerY
            : stageH * 0.47 + Math.sin(tSec * 0.42) * (stageH * 0.07);

        const centers = [];

        boxes.forEach((box, i) => {
            const size = box.getSize();
            const driftX = Math.sin(tSec * box.freqX + box.phase) * box.ampX;
            const driftY = Math.cos(tSec * box.freqY + box.phase) * box.ampY;

            const targetCenterX = baseTargetX + box.offsetX + driftX;
            const targetCenterY = baseTargetY + box.offsetY + driftY;

            box.x += (targetCenterX - box.x) * box.lerpFactor;
            box.y += (targetCenterY - box.y) * box.lerpFactor;

            // Ograniczenie do bezpiecznego obszaru wewnątrz sceny (by nie nachodzić na HUD w rogach)
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

        renderPlasmaBuffer(tSec);
        renderOrbitsAndLinks(tSec, centers);

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

export function initScrollScrubbedMotion() {
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

export const initScrollMotion = initScrollScrubbedMotion;

/**
 * Przełącznik stanu modułu sprzętowego (First-Frame <-> Second-Frame: Pokrętło <-> Magistrala)
 */
export function initHardwareViewSwitcher() {
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

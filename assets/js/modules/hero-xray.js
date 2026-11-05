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
export function initScrollScrubbedMotion() {
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

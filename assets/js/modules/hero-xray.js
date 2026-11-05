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

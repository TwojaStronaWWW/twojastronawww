// Contact Form Logic (RODO Local Draft + CSRF + Anti-Bot Timing)
// Uwaga architektoniczna: wysyłka szkiców do lead-recovery.php została zastąpiona
// zapisem w pamięci przeglądarki (localStorage), aby klient nie tracił wpisanego tekstu
// przy odświeżeniu karty przy 100% zgodności z RODO (brak przesyłania PII bez kliknięcia Wyślij).

const API_BASE = '/api/';
const DRAFT_STORAGE_KEY = 'tsw_contact_draft_v1';
let CSRF_TOKEN = '';

function isStrictFiniteNumber(val) {
    if (typeof val === 'boolean' || val === null || val === '') return false;
    const num = Number(val);
    return Number.isFinite(num);
}

function getMonotonicMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        const t = performance.now();
        if (isStrictFiniteNumber(t)) return t;
    }
    return Date.now();
}

async function loadCsrfToken() {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
        const response = await fetch(API_BASE + 'get-csrf-token.php', {
            credentials: 'same-origin',
            signal: controller ? controller.signal : undefined
        });
        if (!response || !response.ok) return;
        const data = await response.json();
        if (data && data.token) {
            CSRF_TOKEN = data.token;
        }
    } catch (_) {
        // W statycznym serwerze deweloperskim (bez silnika PHP) endpoint CSRF jest pomijany
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

function saveLocalDraft(form) {
    try {
        if (typeof localStorage === 'undefined') return;
        const draft = {
            name: form.elements['name'] ? form.elements['name'].value : '',
            email: form.elements['email'] ? form.elements['email'].value : '',
            phone: form.elements['phone'] ? form.elements['phone'].value : '',
            message: form.elements['message'] ? form.elements['message'].value : '',
            newsletter_consent: form.elements['newsletter_consent'] ? Boolean(form.elements['newsletter_consent'].checked) : false,
            updatedAt: Date.now()
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (_) {
        // Ignoruj błędy prywatnego trybu przeglądarki (QuotaExceeded / SecurityError)
    }
}

function restoreLocalDraft(form) {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (!draft || typeof draft !== 'object') return;

        // Wygaszanie szkicu po 7 dniach
        if (draft.updatedAt && (Date.now() - draft.updatedAt) > 7 * 24 * 3600 * 1000) {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            return;
        }

        if (draft.name && form.elements['name'] && !form.elements['name'].value) {
            form.elements['name'].value = draft.name;
        }
        if (draft.email && form.elements['email'] && !form.elements['email'].value) {
            form.elements['email'].value = draft.email;
        }
        if (draft.phone && form.elements['phone'] && !form.elements['phone'].value) {
            form.elements['phone'].value = draft.phone;
        }
        if (draft.message && form.elements['message'] && !form.elements['message'].value) {
            form.elements['message'].value = draft.message;
        }
        if (typeof draft.newsletter_consent === 'boolean' && form.elements['newsletter_consent']) {
            form.elements['newsletter_consent'].checked = draft.newsletter_consent;
        }
    } catch (_) {
        // Ignoruj uszkodzony JSON w localStorage
    }
}

function clearLocalDraft() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    } catch (_) {}
}

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const formInitTime = getMonotonicMs();

    // 1. Pobierz token CSRF
    loadCsrfToken();

    // 2. Przywróć zapisany szkic z przeglądarki (RODO Local Draft)
    restoreLocalDraft(form);

    const errorDiv = document.getElementById('formErrors');
    const successMsg = document.getElementById('formSuccess');

    const inputs = form.querySelectorAll('input, textarea');
    const btn = form.querySelector('button[type="submit"]');
    const originalBtnText = btn ? btn.textContent : 'Wyślij';

    function clearError() {
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }

    function showError(msg) {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = msg;
        } else {
            alert(msg);
        }
    }

    // 3. Zapisuj lokalny szkic przy każdej zmianie pola (żeby klient nie musiał pisać drugi raz)
    inputs.forEach(input => {
        if (input.name === 'website_url') return;
        input.addEventListener('input', () => saveLocalDraft(form));
        input.addEventListener('change', () => saveLocalDraft(form));
    });

    // 4. Obsługa wysyłki formularza (z obsługą WebMCP SubmitEvent.agentInvoked / e.respondWith)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const submitTask = (async () => {
            clearError();
            if (successMsg) successMsg.style.display = 'none';

            if (btn) {
                btn.textContent = 'Wysyłanie...';
                btn.disabled = true;
            }

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Uwzględnij stan checkboxa newsletter_consent
            const consentEl = form.elements['newsletter_consent'];
            data.newsletter_consent = consentEl && consentEl.checked ? '1' : '0';

            // Zabezpieczenia Anty-Bot (ujednolicone z _site-template: zegar monotoniczny)
            data.js_check = '1';
            const rawElapsed = (getMonotonicMs() - formInitTime) / 1000;
            data.submission_seconds = (isStrictFiniteNumber(rawElapsed) && rawElapsed >= 0 ? rawElapsed : 0).toFixed(2);

            if (CSRF_TOKEN) {
                data.csrf_token = CSRF_TOKEN;
            }

            const controller = typeof AbortController === 'function' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

            try {
                const response = await fetch(API_BASE + 'contact.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify(data),
                    signal: controller ? controller.signal : undefined
                });

                const result = await response.json().catch(() => ({ status: 'error', message: 'Błąd serwera.' }));

                if (response.ok && (result.status === 'success' || result.success === true)) {
                    const msgText = result.message || 'Wiadomość wysłana pomyślnie!';
                    if (successMsg) {
                        successMsg.style.display = 'block';
                        successMsg.textContent = msgText;
                    } else {
                        alert(msgText);
                    }
                    form.reset();
                    clearLocalDraft();
                    loadCsrfToken();
                    return { ok: true, message: msgText };
                } else {
                    const errText = result.message || 'Wystąpił błąd. Spróbuj ponownie.';
                    showError(errText);
                    if (response.status === 403) loadCsrfToken();
                    return { ok: false, error: errText };
                }
            } catch (error) {
                console.error(error);
                if (error && error.name === 'AbortError') {
                    const errText = 'Przekroczono czas oczekiwania na odpowiedź serwera. Spróbuj ponownie.';
                    showError(errText);
                    return { ok: false, error: errText };
                } else {
                    const errText = 'Błąd połączenia. Sprawdź internet.';
                    showError(errText);
                    return { ok: false, error: errText };
                }
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
                if (btn) {
                    btn.textContent = originalBtnText;
                    btn.disabled = false;
                }
            }
        })();

        if (e?.agentInvoked && typeof e?.respondWith === 'function') {
            e.respondWith(submitTask);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initContactForm();
});

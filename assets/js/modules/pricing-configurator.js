/**
 * Moduł konfiguratora wyceny i przełącznika kanałów portfolio (assets/js/modules/pricing-configurator.js)
 * Odpowiedzialność:
 * - initModuleSelector(): interaktywny konfigurator projektu w #pricing z przekazaniem wybranego pakietu
 *   i modułów dodatkowych bezpośrednio do formularza kontaktowego #contactForm
 * - initTelemetryChannelSelector(): selektor kanałów pomiarowych w siatce 2x2 (#portfolio)
 */

/**
 * Interaktywny Konfigurator Projektu w #pricing z przekazaniem do #contactForm
 */
export function initModuleSelector() {
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
 * Selektor kanałów pomiarowych w 2x2 Industrial Telemetry Grid (#portfolio)
 */
export function initTelemetryChannelSelector() {
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

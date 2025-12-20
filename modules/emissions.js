/**
 * Emissions Module
 * Displays CO2 Emissions since the start of the current year (UTC)
 */

const Emissions = (() => {
    let intervalId = null;

    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="card-title">
                <h2 style="margin:0;">Global CO2 Emissions</h2>
            </div>
            <div style="text-align: center; padding: 20px 0;">
                <div id="emissions-since-label" style="font-size: 0.9rem; color: var(--subtext); margin-bottom: 5px;">Since —</div>
                <div id="emissions-counter" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 2.0rem; font-weight: 700; color: var(--text); line-height: 1.2;">
                    Loading...
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem; color: var(--subtext);">
                    Tonnes of CO2
                </div>
                <div style="margin-top: 15px; font-size: 0.85rem;">
                    <a href="https://climateclock.net/" target="_blank" style="color: var(--highlight); text-decoration: none;">Source: Climate Clock</a>
                </div>
            </div>
        `;

        const counterEl = document.getElementById('emissions-counter');

        function update() {
            if (typeof ClimateData === 'undefined') {
                console.error('ClimateData module not loaded');
                return;
            }
            const tonnes = ClimateData.getEmissionsSince2025();
            // Update the since label dynamically from ClimateData
            // Update the since label dynamically from ClimateData (if available).
            const labelEl = document.getElementById('emissions-since-label');
            if (labelEl) {
                if (typeof ClimateData !== 'undefined' && typeof ClimateData.getReferenceLabel === 'function') {
                    labelEl.textContent = `Since ${ClimateData.getReferenceLabel()}`;
                } else {
                    // Fallback: use Jan 1 of the current UTC year
                    const now = new Date();
                    const fallback = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    labelEl.textContent = `Since ${monthNames[fallback.getUTCMonth()]} ${fallback.getUTCDate()}, ${fallback.getUTCFullYear()}`;
                }
            }
            // Format with commas
            counterEl.textContent = Math.floor(tonnes).toLocaleString();
        }

        update();
        intervalId = setInterval(update, 200);
    }

    function destroy() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return { render, destroy };
})();

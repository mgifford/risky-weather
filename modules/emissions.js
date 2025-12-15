/**
 * Emissions Module
 * Displays CO2 Emissions since Jan 1, 2025
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
                <div style="font-size: 0.9rem; color: #4a5568; margin-bottom: 5px;">Since Jan 1, 2025</div>
                <div id="emissions-counter" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 2.0rem; font-weight: 700; color: #2d3748; line-height: 1.2;">
                    Loading...
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem; color: #4a5568;">
                    Tonnes of CO2
                </div>
                <div style="margin-top: 15px; font-size: 0.85rem;">
                    <a href="https://climateclock.net/" target="_blank" style="color: #3182ce; text-decoration: none;">Source: Climate Clock</a>
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

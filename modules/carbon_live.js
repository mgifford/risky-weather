/**
 * Carbon Live Module
 * Displays the Carbon Budget countdown using dynamic calculation (MCC/IPCC 2025 Budget)
 */

const CarbonLive = (() => {
    let intervalId = null;

    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="card-title">
                <h2 style="margin:0;">Carbon Budget: Time to 1.5°C</h2>
            </div>
            <div style="text-align: center; padding: 20px 0;">
                <div id="carbon-live-countdown" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 1.2rem; font-weight: 600; color: #c53030; line-height: 1.5;">
                    Loading...
                </div>
                <div style="margin-top: 15px; font-size: 0.85rem;">
                    <a href="https://climateclock.net/" target="_blank" style="color: #3182ce; text-decoration: none;">Source: Climate Clock (MCC/IPCC 2025)</a>
                </div>
            </div>
        `;

        const counterEl = document.getElementById('carbon-live-countdown');

        function update() {
            if (typeof ClimateData === 'undefined') {
                console.error('ClimateData module not loaded');
                return;
            }

            const { timeRemainingSeconds } = ClimateData.getCarbonBudget();
            
            if (timeRemainingSeconds <= 0) {
                counterEl.textContent = "Budget Exhausted";
                return;
            }

            const seconds = Math.floor(timeRemainingSeconds % 60);
            const minutes = Math.floor((timeRemainingSeconds / 60) % 60);
            const hours = Math.floor((timeRemainingSeconds / 3600) % 24);
            const days = Math.floor((timeRemainingSeconds / 86400) % 365.25);
            const years = Math.floor(timeRemainingSeconds / (86400 * 365.25));

            counterEl.textContent = `${years} years, ${String(days).padStart(3, '0')} days, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        update();
        intervalId = setInterval(update, 1000);
    }

    function destroy() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return { render, destroy };
})();

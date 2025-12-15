/**
 * Warming Module
 * Displays Global Warming since 1880
 */

const Warming = (() => {
    let intervalId = null;

    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="card-title">
                <h2 style="margin:0;">Global Warming Since 1880</h2>
            </div>
            <div style="text-align: center; padding: 20px 0;">
                <div id="warming-counter" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 2.5rem; font-weight: 700; color: #c53030; line-height: 1.2;">
                    Loading...
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem; color: #4a5568;">
                    Degrees Celsius (°C)
                </div>
                <div style="margin-top: 15px; font-size: 0.85rem;">
                    <a href="https://climateclock.net/" target="_blank" style="color: #1e3a8a; text-decoration: none;">Source: Climate Clock</a>
                </div>
            </div>
        `;

        const counterEl = document.getElementById('warming-counter');

        function update() {
            if (typeof ClimateData === 'undefined') {
                console.error('ClimateData module not loaded');
                return;
            }
            const temp = ClimateData.getCurrentWarming();
            counterEl.textContent = `+${temp.toFixed(8)}°C`;
        }

        update();
        intervalId = setInterval(update, 100); // Update frequently for "live" feel
    }

    function destroy() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    return { render, destroy };
})();

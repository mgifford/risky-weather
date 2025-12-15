/**
 * Carbon Module
 * Displays the Carbon Budget countdown
 */

const Carbon = (() => {
    // Target date for 1.5C budget exhaustion (Estimate: July 2029)
    const TARGET_DATE = new Date('2029-07-22T00:00:00Z');
    let intervalId = null;

    /**
     * Calculate time remaining
     */
    function getTimeRemaining() {
        const total = Date.parse(TARGET_DATE) - Date.parse(new Date());
        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        
        // Calculate years (approximate)
        const years = Math.floor(days / 365);
        const remainingDays = days % 365;

        return {
            total,
            years,
            days: remainingDays,
            hours,
            minutes,
            seconds
        };
    }

    /**
     * Render the Carbon Budget section
     */
    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="card-title">
                <h2 style="margin:0;">Carbon Budget: Time to 1.5°C</h2>
            </div>
            <div style="text-align: center; padding: 20px 0;">
                <div id="carbon-countdown" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 1.2rem; font-weight: 600; color: #2d3748; line-height: 1.5;">
                    Loading...
                </div>
                <div style="margin-top: 15px; font-size: 0.85rem;">
                    <a href="https://climateclock.net/" target="_blank" style="color: #4a5568; text-decoration: underline;">— Reference: Climate Clock</a>
                </div>
            </div>
        `;

        startCountdown();
    }

    /**
     * Start the countdown timer
     */
    function startCountdown() {
        if (intervalId) clearInterval(intervalId);
        
        function update() {
            const t = getTimeRemaining();
            const el = document.getElementById('carbon-countdown');
            if (el) {
                el.innerHTML = `
                    ${t.years} years, ${t.days.toString().padStart(3, '0')} days,<br>
                    ${t.hours.toString().padStart(2, '0')} hours ${t.minutes.toString().padStart(2, '0')} minutes, ${t.seconds.toString().padStart(2, '0')} seconds
                `;
            }
            if (t.total <= 0) {
                clearInterval(intervalId);
            }
        }

        update();
        intervalId = setInterval(update, 1000);
    }

    return {
        render
    };
})();

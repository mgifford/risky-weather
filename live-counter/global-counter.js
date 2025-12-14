// global-counter.js

// Use DOMContentLoaded to ensure the script executes only after the HTML structure is fully parsed.
document.addEventListener('DOMContentLoaded', function() {
    
    // Check if the configuration data (from data.js) is available
    if (typeof CONFIG_DATA === 'undefined') {
        console.error("CONFIG_DATA not found. Ensure 'data.js' is loaded before 'global-counter.js'.");
        return;
    }

    const { 
        DAILY_SEED, 
        REMAINING_SECONDS, 
        BUDGET_RATE_PER_SEC,
        CURRENT_TEMP,
        TEMP_RATE_PER_SEC 
    } = CONFIG_DATA;
    
    const WIDGET_CONTAINER = document.getElementById('risky-weather-global-counter');

    if (!WIDGET_CONTAINER) {
        console.warn("Global Counter widget container (#risky-weather-global-counter) not found.");
        return; 
    }

    const START_TIMESTAMP = Date.now();
    const SECONDS_IN_A_DAY = 86400;

    // --- Counter Definitions ---
    const counters = [
        {
            id: 'time-counter',
            label: 'Carbon Budget: Time to 1.5°C',
            unit: 'YRS:DAYS:HRS:MIN:SEC',
            calculate: (elapsed) => {
                const totalSeconds = Math.max(0, REMAINING_SECONDS - elapsed);
                // Convert seconds into YRS, DAYS, HR, MIN, SEC
                let remaining = totalSeconds;
                const years = Math.floor(remaining / (365.25 * SECONDS_IN_A_DAY));
                remaining %= (365.25 * SECONDS_IN_A_DAY);
                const days = Math.floor(remaining / SECONDS_IN_A_DAY);
                remaining %= SECONDS_IN_A_DAY;
                const hours = Math.floor(remaining / 3600);
                remaining %= 3600;
                const minutes = Math.floor(remaining / 60);
                const seconds = Math.floor(remaining % 60);

                return `${String(years).padStart(2, '0')}:${String(days).padStart(3, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            },
            link: 'https://climateclock.world/'
        },
        {
            id: 'temp-counter',
            label: 'Global Warming Since 1880',
            unit: '°C',
            calculate: (elapsed) => {
                // Calculation: Base Temp + (Rate * Elapsed Seconds)
                const currentTemp = CURRENT_TEMP + (TEMP_RATE_PER_SEC * elapsed);
                return currentTemp.toFixed(5);
            },
            link: 'https://news.sky.com/story/the-daily-climate-show-track-global-warming-with-our-live-counters-12262823'
        }
    ];

    // --- Daily Randomization Logic ---
    // Simple PRNG (Pseudo-Random Number Generator) based on the seed
    function seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    const seed = parseInt(DAILY_SEED); // e.g., 20251214
    const randomIndex = Math.floor(seededRandom(seed) * counters.length);
    const selectedCounter = counters[randomIndex];
    
    // --- Initial Setup and Update Loop ---

    // 1. Set static elements (label and reference link)
    document.getElementById('counter-label').textContent = selectedCounter.label;
    document.getElementById('counter-unit').textContent = selectedCounter.unit;
    
    const refLink = document.getElementById('counter-reference');
    if (refLink) {
        refLink.href = selectedCounter.link;
    }

    // 2. The main update function
    function updateCounter() {
        const elapsedSeconds = (Date.now() - START_TIMESTAMP) / 1000;
        const value = selectedCounter.calculate(elapsedSeconds);
        document.getElementById('counter-value').textContent = value;
    }

    // Set the clock to update rapidly for the "live" effect (every 100ms)
    setInterval(updateCounter, 100); 

    // Initial call to populate the counter immediately
    updateCounter();
});
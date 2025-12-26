// Configuration
const API_BASE = "https://api.open-meteo.com/v1/forecast";
const HISTORICAL_API = "https://archive-api.open-meteo.com/v1/archive";

// DOM Elements
const locationDisplay = document.getElementById('location-display');
const modelSourceDisplay = document.getElementById('model-source');
const precipProbEl = document.getElementById('precip-prob');
const tempMaxEl = document.getElementById('temp-max');
const riskTextEl = document.getElementById('risk-interpretation');
const realitySection = document.getElementById('reality-check-section');
const realityContent = document.getElementById('reality-content');
const valToday = document.getElementById('val-today');
const valClimate = document.getElementById('val-climate');
const climateInsight = document.getElementById('climate-insight');
const ecccLinkContainer = document.getElementById('eccc-link-container');
const ecccLink = document.getElementById('eccc-link');
const footerSourceText = document.getElementById('footer-source-text');
const stripesContainer = document.getElementById('stripes-container');

// 1. Initialization
async function init() {
    // Initialize theme based on user preference or system setting
    initTheme();

    let lat, lon, city;
    const savedLoc = localStorage.getItem('user_location');
    
    if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        initWeather(parsed.lat, parsed.lon, parsed.city || "Saved Location");
    } else {
        if (navigator.geolocation) {
            locationDisplay.innerText = "Triangulating...";
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`)
                        .then(res => res.json())
                        .then(data => {
                            const cityName = data.results ? data.results[0].name : "Detected Location";
                            localStorage.setItem('user_location', JSON.stringify({ lat, lon, city: cityName }));
                            initWeather(lat, lon, cityName);
                        })
                        .catch(() => initWeather(lat, lon, "Detected Location"));
                },
                () => initWeather(45.42, -75.69, "Ottawa (Demo)")
            );
        } else {
            initWeather(45.42, -75.69, "Ottawa (Demo)");
        }
    }
}

// Theme handling
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-theme');
        document.getElementById('btn-dark').setAttribute('aria-pressed', 'true');
        document.getElementById('btn-light').setAttribute('aria-pressed', 'false');
        // Show the sun (action to switch to light), hide the moon
        const bl = document.getElementById('btn-light');
        const bd = document.getElementById('btn-dark');
        if (bl) { bl.style.display = 'inline-block'; bl.title = 'Switch to light mode'; bl.setAttribute('aria-label','Switch to light mode'); }
        if (bd) { bd.style.display = 'none'; bd.title = 'Dark mode (active)'; bd.setAttribute('aria-label','Dark mode (active)'); }
    } else {
        root.removeAttribute('data-theme');
        document.body.classList.remove('dark-theme');
        document.getElementById('btn-light').setAttribute('aria-pressed', 'true');
        document.getElementById('btn-dark').setAttribute('aria-pressed', 'false');
        // Show the moon (action to switch to dark), hide the sun
        const bl = document.getElementById('btn-light');
        const bd = document.getElementById('btn-dark');
        if (bd) { bd.style.display = 'inline-block'; bd.title = 'Switch to dark mode'; bd.setAttribute('aria-label','Switch to dark mode'); }
        if (bl) { bl.style.display = 'none'; bl.title = 'Light mode (active)'; bl.setAttribute('aria-label','Light mode (active)'); }
    }
}

function initTheme() {
    const saved = localStorage.getItem('preferred-theme');
    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved);
        return;
    }

    // Respect user's system preference initially
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');

    // Listen for changes in system preference and update if user hasn't chosen explicitly
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        const stillSaved = localStorage.getItem('preferred-theme');
        if (!stillSaved) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// Theme button handlers
document.addEventListener('DOMContentLoaded', () => {
    const btnLight = document.getElementById('btn-light');
    const btnDark = document.getElementById('btn-dark');
    if (btnLight && btnDark) {
        btnLight.addEventListener('click', () => {
            applyTheme('light');
            localStorage.setItem('preferred-theme', 'light');
        });
        btnDark.addEventListener('click', () => {
            applyTheme('dark');
            localStorage.setItem('preferred-theme', 'dark');
        });
    }
});

function initWeather(lat, lon, cityName) {
    locationDisplay.innerText = cityName;
    const isCanada = (lat > 41 && lat < 83 && lon > -141 && lon < -52);
    fetchWeatherData(lat, lon, isCanada);
    
    // Trigger the separate heavy load for stripes
    generateStripes(lat, lon);
}

// 2. Main Weather Fetch
async function fetchWeatherData(lat, lon, isCanada) {
    let params = `latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_probability_max,rain_sum&timezone=auto`;
    
    if (isCanada) {
        params += `&models=gem_regional`;
        modelSourceDisplay.innerText = "Source: Env. Canada (GEM)";
        modelSourceDisplay.classList.add('can-source');
        footerSourceText.innerText = "Forecast: Environment & Climate Change Canada (GEM Model).";
        ecccLinkContainer.classList.remove('hidden');
        ecccLink.href = `https://weather.gc.ca/city/pages/search_metric_e.html`; 
    } else {
        modelSourceDisplay.innerText = "Source: Global Consensus";
        footerSourceText.innerText = "Forecast: Weighted Mean of Global Models.";
    }

    try {
        const response = await fetch(`${API_BASE}?${params}`);
        const data = await response.json();
        updateUI(data, lat, lon, isCanada);
        checkHistory(lat, lon); 
    } catch (error) {
        console.error(error);
        riskTextEl.innerText = "Error loading weather data.";
    }
}

function updateUI(data, lat, lon, isCanada) {
    const today = data.daily;
    const maxTemp = today.temperature_2m_max[0];
    const precipProb = today.precipitation_probability_max[0];
    const probDisplay = precipProb !== null ? precipProb : (today.rain_sum[0] > 0 ? ">50" : "0");

    tempMaxEl.innerText = `${maxTemp}°C`;
    precipProbEl.innerText = `${probDisplay}%`;

    let interpretation = "";
    if (precipProb < 10) interpretation = "<strong>Low Chance (Stable).</strong> The atmosphere is stable. If you played today out 10 times, it would stay dry in almost all of them.";
    else if (precipProb < 40) interpretation = `<strong>Low–Medium Chance.</strong> There is a ${precipProb}% Chance of precipitation. Humans tend to round this down to '0', but in the long run, this event happens 1 out of 3 times.`;
    else if (precipProb < 70) interpretation = `<strong>Coin Toss (Uncertain).</strong> Chance of precipitation is around ${precipProb}%. It will rain in ${Math.round(precipProb/10)} out of 10 parallel universes today. Plan for wet weather.`;
    else interpretation = `<strong>High Confidence.</strong> The atmospheric drivers are strong. Precipitation is the expected outcome, not just a chance.`;
    
    riskTextEl.innerHTML = interpretation;

    // Save forecast
    localStorage.setItem('last_forecast', JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        prob: precipProb,
        lat: lat,
        lon: lon
    }));

    fetchClimateData(lat, lon, maxTemp);
}

// 3. Climate Context (10 Year Avg)
async function fetchClimateData(lat, lon, currentMax) {
    const todayDate = new Date();
    const mm = String(todayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(todayDate.getDate()).padStart(2, '0');
    
    // Heuristic: Last 10 years of this specific day
    const historyUrl = `${HISTORICAL_API}?latitude=${lat}&longitude=${lon}&start_date=2014-${mm}-${dd}&end_date=2024-${mm}-${dd}&daily=temperature_2m_max&timezone=auto`;
    
    try {
        const res = await fetch(historyUrl);
        const histData = await res.json();
        const temps = histData.daily.temperature_2m_max;
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;

        valToday.innerText = `${currentMax}°C`;
        valClimate.innerText = `${avg.toFixed(1)}°C (10y Avg)`;

        const maxVal = Math.max(currentMax, avg) + 10;
        const offset = 20; 
        const wToday = ((currentMax + offset) / (maxVal + offset)) * 100;
        const wClimate = ((avg + offset) / (maxVal + offset)) * 100;

        document.getElementById('bar-today').style.width = `${Math.min(wToday, 100)}%`;
        document.getElementById('bar-climate').style.width = `${Math.min(wClimate, 100)}%`;

        const diff = (currentMax - avg).toFixed(1);
        const sign = diff > 0 ? "+" : "";
        
        climateInsight.innerHTML = `
            <strong>Anomaly: ${sign}${diff}°C</strong><br>
            Today is ${diff > 0 ? "warmer" : "cooler"} than the recent average for this date.
        `;
    } catch (e) { console.log(e); }
}

// 4. GENERATE WARMING STRIPES (1950-2023)
async function generateStripes(lat, lon) {
    // 1. Fetch 73 years of daily mean temperature
    // Note: This is a large request (~27k data points), but Open-Meteo handles it fast.
    const url = `${HISTORICAL_API}?latitude=${lat}&longitude=${lon}&start_date=1950-01-01&end_date=2023-12-31&daily=temperature_2m_mean&timezone=auto`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const dailyTemps = data.daily.temperature_2m_mean;
        const dates = data.daily.time;
        
        // 2. Aggregate by Year
        const yearlyData = {};
        
        dates.forEach((date, index) => {
            const year = date.split('-')[0];
            const temp = dailyTemps[index];
            if(temp !== null) {
                if(!yearlyData[year]) yearlyData[year] = { sum: 0, count: 0 };
                yearlyData[year].sum += temp;
                yearlyData[year].count++;
            }
        });

        // 3. Calculate Means & Baseline (1971-2000)
        let baselineSum = 0;
        let baselineCount = 0;
        const annualMeans = [];

        Object.keys(yearlyData).sort().forEach(year => {
            const mean = yearlyData[year].sum / yearlyData[year].count;
            annualMeans.push({ year, mean });
            
            // Standard Reference Period
            if (year >= 1971 && year <= 2000) {
                baselineSum += mean;
                baselineCount++;
            }
        });

        const baseline = baselineSum / baselineCount;

        // 4. Render Stripes
        stripesContainer.innerHTML = ''; // Clear loading
        
        annualMeans.forEach(item => {
            const delta = item.mean - baseline;
            const stripe = document.createElement('div');
            stripe.className = 'stripe';
            stripe.style.backgroundColor = getStripeColor(delta);
            
            // Tooltip for interaction
            stripe.title = `${item.year}: ${delta > 0 ? '+' : ''}${delta.toFixed(2)}°C`;
            
            stripesContainer.appendChild(stripe);
        });

    } catch (error) {
        stripesContainer.innerHTML = "<p>Could not load historical data.</p>";
        console.error(error);
    }
}

// Helper: Color Scale (Similar to Ed Hawkins' scale)
function getStripeColor(delta) {
    if (delta <= -2.0) return '#08306b'; // Deepest Blue
    if (delta <= -1.0) return '#2171b5';
    if (delta <= -0.5) return '#6baed6';
    if (delta <= -0.1) return '#c6dbef';
    if (delta < 0.1)  return '#f7f7f7'; // Neutral
    if (delta < 0.5)  return '#fee0d2';
    if (delta < 1.0)  return '#fc9272';
    if (delta < 2.0)  return '#de2d26';
    return '#a50f15'; // Deepest Red
}

// 5. Reality Check Logic (Same as before)
async function checkHistory(lat, lon) {
    const saved = localStorage.getItem('last_forecast');
    if (!saved) return;
    const record = JSON.parse(saved);
    const todayStr = new Date().toISOString().split('T')[0];

    if (record.date !== todayStr) {
        const url = `${HISTORICAL_API}?latitude=${lat}&longitude=${lon}&start_date=${record.date}&end_date=${record.date}&daily=rain_sum&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        
        if(data.daily && data.daily.rain_sum) {
            const actualRain = data.daily.rain_sum[0];
            const wasDry = actualRain < 0.1;
            realitySection.classList.remove('hidden');
            let lesson = wasDry ? "It was dry." : `It rained (${actualRain}mm).`;
            realityContent.innerHTML = `<div class="comparison-box"><p><strong>Result:</strong> ${lesson}</p></div>`;
        }
    }
}

document.getElementById('reset-loc').addEventListener('click', () => {
    localStorage.removeItem('user_location');
    localStorage.removeItem('last_forecast');
    location.reload();
});

// Add click handler for connection indicator
if (document.getElementById('connection-indicator')) {
    document.getElementById('connection-indicator').addEventListener('click', async () => {
        const indicator = document.getElementById('connection-indicator');
        const text = indicator.querySelector('.connection-text');
        const originalText = text.textContent;
        text.textContent = 'Checking...';
        await Connection.manualCheck();
        // Show result for 2 seconds
        setTimeout(() => {
            text.textContent = originalText;
        }, 2000);
    });
    
    // Also handle Enter key for accessibility
    document.getElementById('connection-indicator').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('connection-indicator').click();
        }
    });
}

init();
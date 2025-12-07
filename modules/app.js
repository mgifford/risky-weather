/**
 * App Module
 * Main application logic and orchestration
 */

const App = (() => {
    let currentConfig = null;

    /**
     * Initialize application
     */
    async function init() {
        // Initialize internationalization first
        I18n.init();
        
        // Check for language in URL parameters
        const urlParams = Storage.getUrlParams();
        if (urlParams.language) {
            I18n.setLanguage(urlParams.language);
            document.getElementById('html-root').lang = urlParams.language;
        }
        
        UI.updateLanguageToggle();
        UI.onLanguageToggle(toggleLanguage);
        UI.onShare(shareLocation);

        UI.setStatus(I18n.t('status.checkingHistory'));
        loadScoreboard();

        // Display random education lesson on startup
        UI.initEducation();

        // Check URL parameters first (highest priority for sharing)
        if (urlParams.location) {
            UI.setStatus(I18n.t('status.savedLocation'));
            console.log(`Using URL location: ${urlParams.location.city} (${urlParams.location.lat}, ${urlParams.location.lon})`);
            Storage.saveLocation(urlParams.location.lat, urlParams.location.lon, urlParams.location.city);
            runApp(urlParams.location.lat, urlParams.location.lon, urlParams.location.city);
            return;
        }

        // Try IP geolocation first - most reliable for VPN/real-world scenarios
        let ipGeoData = null;
        try {
            const ipResponse = await fetch('https://ipwho.is/', {
                signal: AbortSignal.timeout(3000)
            });
            if (ipResponse.ok) {
                const data = await ipResponse.json();
                if (data.ip && data.latitude && data.longitude) {
                    UI.setIP(data.ip);
                    console.log(`IP detected: ${data.ip}`);
                    ipGeoData = {
                        lat: data.latitude,
                        lon: data.longitude,
                        city: data.city,
                        ip: data.ip
                    };
                    console.log(`IP location: ${data.city} (${data.latitude}, ${data.longitude})`);
                }
            }
        } catch (error) {
            console.log('Could not fetch IP:', error.message);
        }

        const savedLocation = Storage.getLocation();
        console.log('Saved location:', savedLocation);

        if (savedLocation) {
            UI.setStatus(I18n.t('status.savedLocation'));
            console.log(`Using saved: ${savedLocation.city} (${savedLocation.lat}, ${savedLocation.lon})`);
            runApp(savedLocation.lat, savedLocation.lon, savedLocation.city);
        } else if (ipGeoData) {
            // Prefer IP geolocation over browser geolocation (more reliable, works with VPNs)
            UI.setStatus(I18n.t('status.ipGeolocation'));
            console.log(`Using IP location: ${ipGeoData.city} (${ipGeoData.lat}, ${ipGeoData.lon})`);
            Storage.saveLocation(ipGeoData.lat, ipGeoData.lon, ipGeoData.city, ipGeoData.ip);
            runApp(ipGeoData.lat, ipGeoData.lon, ipGeoData.city);
        } else {
            // Fallback to browser geolocation if IP geolocation unavailable
            UI.setStatus(I18n.t('status.requestingGeolocation'));
            try {
                const position = await Geo.getCurrentPosition();
                console.log(`Geolocation received: (${position.lat}, ${position.lon})`);
                UI.setStatus(I18n.t('status.geoSuccess'));
                
                // Display IP address if available
                if (position.ip) {
                    UI.setIP(position.ip);
                }
                
                // If position already has a city (from IP geolocation), use it
                let city = position.city;
                if (!city) {
                    city = await API.getCityName(position.lat, position.lon);
                    console.log(`City name resolved via API: ${city}`);
                } else {
                    console.log(`Using city from geolocation source: ${city}`);
                }
                
                Storage.saveLocation(position.lat, position.lon, city);
                runApp(position.lat, position.lon, city);
            } catch (error) {
                console.error('Geolocation/city lookup failed:', error);
                UI.setStatus(I18n.t('status.defaultLocation', error.message));
                console.log(`Falling back to default: Ottawa (${Geo.DEFAULT_LAT}, ${Geo.DEFAULT_LON})`);
                runApp(Geo.DEFAULT_LAT, Geo.DEFAULT_LON, Geo.DEFAULT_CITY);
            }
        }

        // Check and display what's in localStorage
        const hasLocation = Storage.getLocation() !== null;
        const hasHistory = localStorage.getItem('history_v6_pending') !== null;
        const hasScoreboard = localStorage.getItem('scoreboard_v6') !== null;
        UI.setStorageInfo(hasLocation, hasHistory, hasScoreboard);
    }

    /**
     * Main application flow
     */
    async function runApp(lat, lon, city) {
        UI.setLocation(city);
        UI.setStatus(I18n.t('status.loadingWeather', city));

        // Update URL with current location and language
        Storage.updateUrl(lat, lon, city);

        const config = Geo.getModelConfig(lat, lon);
        currentConfig = { ...config, lat, lon, city };

        // Update UI with model info
        UI.setModelLabels(config.nameA, config.nameB, config.colorA, config.colorB);

        // Set official link(s)
        const links = Geo.getOfficialLinks(lat, lon, config.isCanada, city);
        UI.setOfficialLinks(links);

        // Fetch weather data
        try {
            const forecastData = await API.fetchForecast(lat, lon, config.modelA, config.modelB, config.isCanada);
            renderForecast(forecastData, config);
            saveForecastForHistory(forecastData, config, lat, lon);
            checkHistory(lat, lon, config);
        } catch (error) {
            UI.setStatus(I18n.t('status.apiError', error.message));
            UI.getElement('forecastList').innerHTML = '<tr><td colspan="3">Error loading weather. Check Console.</td></tr>';
        }

        // Generate stripes in background
        generateStripes(lat, lon);
    }

    /**
     * Render forecast data to UI
     */
    function renderForecast(data, config) {
        const daily = data.daily;

        // Today's forecast
        const tempA = Calculations.getSafeData(daily, config.modelA, 'temperature_2m_max', 0);
        const probA = Calculations.getSafeData(daily, config.modelA, 'precipitation_probability_max', 0);
        const tempB = Calculations.getSafeData(daily, config.modelB, 'temperature_2m_max', 0);
        const probB = Calculations.getSafeData(daily, config.modelB, 'precipitation_probability_max', 0);

        UI.renderToday(tempA, probA, tempB, probB);

        // 7-day forecast
        UI.renderSevenDay(daily, config.modelA, config.modelB);

        UI.setStatus(I18n.t('status.weatherLoaded'));
    }

    /**
     * Save current forecast for tomorrow's verification
     */
    function saveForecastForHistory(data, config, lat, lon) {
        const today = new Date().toISOString().split('T')[0];

        const probA = Calculations.getSafeData(data.daily, config.modelA, 'precipitation_probability_max', 0);
        const probB = Calculations.getSafeData(data.daily, config.modelB, 'precipitation_probability_max', 0);

        Storage.saveForecastRecord(today, lat, lon, { name: config.nameA, prob: probA }, { name: config.nameB, prob: probB });
    }

    /**
     * Check yesterday's forecast vs actual weather
     */
    async function checkHistory(lat, lon, config) {
        const pendingRecord = Storage.getPendingForecast();
        if (!pendingRecord) return;

        const today = new Date().toISOString().split('T')[0];

        // Only check if pendingRecord is from yesterday
        if (pendingRecord.date === today) return;

        UI.setStatus('Verifying History...');

        try {
            const historyData = await API.fetchHistoricalDay(lat, lon, pendingRecord.date);

            if (!historyData.daily || !historyData.daily.rain_sum) {
                throw new Error('No historical data');
            }

            const rainfall = historyData.daily.rain_sum[0];
            const actuallyRained = rainfall > 0.5;

            // Calculate accuracy for each model
            const probA = pendingRecord.modelA.prob || 0;
            const probB = pendingRecord.modelB.prob || 0;
            const errorA = Calculations.calculateAccuracy(actuallyRained, probA);
            const errorB = Calculations.calculateAccuracy(actuallyRained, probB);

            // Show result
            UI.renderRealityCheck(
                pendingRecord.date,
                actuallyRained,
                rainfall,
                probA,
                probB,
                pendingRecord.modelA.name,
                pendingRecord.modelB.name
            );

            // Determine and show winner
            const winner = Calculations.determineWinner(errorA, errorB);
            if (winner === 'A') {
                UI.showWinner(pendingRecord.modelA.name);
                updateScore('A', pendingRecord.date);
            } else if (winner === 'B') {
                UI.showWinner(pendingRecord.modelB.name);
                updateScore('B', pendingRecord.date);
            } else {
                UI.showDraw();
            }
        } catch (error) {
            console.error('History check failed:', error);
            UI.setStatus(`History check failed: ${error.message}`);
        }
    }

    /**
     * Update scoreboard and record win
     */
    function updateScore(winner, date) {
        const lastScoredDate = Storage.getLastScoredDate();
        if (lastScoredDate === date) return; // Already scored this date

        Storage.incrementScore(winner);
        Storage.setLastScoredDate(date);
        loadScoreboard();
    }

    /**
     * Load and display scoreboard
     */
    function loadScoreboard() {
        const scores = Storage.getScoreboard();
        UI.updateScoreboard(scores.a, scores.b, scores.start);
    }

    /**
     * Generate warming stripes (74 years of historical data)
     */
    async function generateStripes(lat, lon) {
        UI.setStatus(I18n.t('status.loadingHistorical'));

        try {
            const data = await API.fetchHistoricalYears(lat, lon, 1950, 2023);

            if (!data) {
                throw new Error('No historical data available');
            }

            if (data && data.rateLimited) {
                UI.setStatus(I18n.t('status.historicalRateLimited'));
                console.warn('Historical API rate-limited (429) - skipping stripes');
                return;
            }

            if (!data.daily) {
                throw new Error('No historical data available');
            }

            const annualMeans = Calculations.calculateAnnualMeans(
                data.daily.time,
                data.daily.temperature_2m_mean
            );

            const baseline = Calculations.calculateBaseline(annualMeans, 1971, 2000);

            if (baseline === null) {
                throw new Error('Could not calculate baseline');
            }

            UI.renderStripes(annualMeans, baseline);
            UI.setStatus('Complete');
        } catch (error) {
            console.error('Stripes generation failed:', error);
            UI.setStatus(`Stripes error: ${error.message}`);
        }
    }

    /**
     * Reset application state
     */
    function reset() {
        Storage.clearAll();
        location.reload();
    }

    /**
     * Refresh location by clearing saved location and re-detecting
     */
    async function refreshLocation() {
        UI.setStatus(I18n.t('status.loadingWeather'));
        Storage.removeLocation(); // Clear saved location
        
        try {
            const position = await Geo.getCurrentPosition();
            console.log(`New location detected: (${position.lat}, ${position.lon})`);
            UI.setStatus(I18n.t('status.weatherLoaded'));
            
            // Display IP address if available
            if (position.ip) {
                UI.setIP(position.ip);
            }
            
            // Get city name
            let city = position.city;
            if (!city) {
                city = await API.getCityName(position.lat, position.lon);
                console.log(`City name resolved: ${city}`);
            } else {
                console.log(`Using city from geolocation source: ${city}`);
            }
            
            Storage.saveLocation(position.lat, position.lon, city);

            // Update URL to reflect new location and preserve language
            const lang = I18n.getCurrentLanguage();
            Storage.updateUrl(position.lat, position.lon, city, lang);

            // Re-run app for new location
            runApp(position.lat, position.lon, city);
        } catch (error) {
            console.error('Location refresh failed:', error);
            UI.setStatus(`Location refresh failed: ${error.message}`);
            alert(`Could not detect new location: ${error.message}`);
        }
    }

    /**
     * Toggle between English and French
     */
    function toggleLanguage() {
        const currentLang = I18n.getCurrentLanguage();
        const newLang = currentLang === 'en' ? 'fr' : 'en';
        I18n.setLanguage(newLang);
        
        console.log(`Language switched to: ${newLang}`);
        
        // Update UI elements with new language
        UI.updateLanguageToggle();
        UI.updateAllText();
        
        // Update HTML lang attribute
        document.getElementById('html-root').lang = newLang;
        
        // Update all elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = I18n.t(key);
            // Use innerHTML for elements that may contain HTML tags
            if (translated.includes('<')) {
                el.innerHTML = translated;
            } else {
                el.textContent = translated;
            }
        });
        
        // Refresh page to update all translations including dynamic content
        location.reload();
    }

    /**
     * Share current location as a URL
     */
    async function shareLocation() {
        if (!currentConfig) {
            alert('No location loaded yet');
            return;
        }

        const shareUrl = Storage.getShareUrl(
            currentConfig.lat,
            currentConfig.lon,
            currentConfig.city
        );

        // Try to copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert(I18n.t('ui.linkCopied'));
            console.log('Share URL:', shareUrl);
        } catch (err) {
            // Fallback: show URL in prompt
            prompt(I18n.t('ui.linkCopyFailed', ''), shareUrl);
        }
    }

    return {
        init,
        reset,
        refreshLocation,
        toggleLanguage,
        shareLocation
    };
})();

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
        
        // Initialize city search
        UI.initCitySearch((lat, lon, city) => {
            console.log(`City selected from search: ${city} (${lat}, ${lon})`);
            Storage.saveLocation(lat, lon, city);
            Storage.updateUrl(lat, lon, city);
            // Reload the page to fetch fresh weather data for the new city
            window.location.reload();
        });

        UI.setStatus(I18n.t('status.checkingHistory'));
        loadScoreboard();

        // Load and display today's historical climate event
        await History.loadEvents();
        const todayEvent = History.getTodayEvent();
        if (todayEvent) {
            const formatted = History.formatEvent(todayEvent);
            UI.renderHistoryEvent(formatted);
        }

        // Load and display random education lesson on startup
        await UI.initEducation();

        // Check URL parameters first (highest priority for sharing)
        if (urlParams.location) {
            let startedFromUrl = false;
            UI.setStatus(I18n.t('status.savedLocation'));
            const urlCity = urlParams.location.city;
            const urlLat = urlParams.location.lat;
            const urlLon = urlParams.location.lon;
            console.log(`URL params detected: city=${urlCity}, lat=${urlLat}, lon=${urlLon}`);
            // If city is present, geocode and use its coordinates; ignore mismatched lat/lon
            try {
                if (urlCity) {
                    // Pass the raw city string to geocoder; it will normalize/expand province names
                    console.log(`Geocoding city from URL: "${urlCity}"`);
                    const results = await Geo.searchCities(urlCity);
                    if (results && results.length) {
                        const best = results[0];
                        console.log(`Using geocoded city: ${best.displayName} (${best.lat}, ${best.lon})`);
                        Storage.saveLocation(best.lat, best.lon, best.displayName);
                        // Ensure URL is city-only for clarity
                        Storage.updateUrl(best.lat, best.lon, best.displayName);
                        await runApp(best.lat, best.lon, best.displayName);
                        startedFromUrl = true;
                    } else {
                        console.warn('No geocode results for city. Falling back to coordinates if present.');
                    }
                }
                // Fallbacks: if no city or geocoding failed but coords exist, use coords
                if (urlLat !== null && urlLon !== null) {
                    console.log(`Using URL coordinates: (${urlLat}, ${urlLon}) with city label: ${urlCity || 'Location'}`);
                    Storage.saveLocation(urlLat, urlLon, urlCity || 'Location');
                    await runApp(urlLat, urlLon, urlCity || 'Location');
                    startedFromUrl = true;
                }
            } catch (e) {
                console.warn('City geocode failed; falling back to URL coordinates:', e);
                if (urlLat !== null && urlLon !== null) {
                    Storage.saveLocation(urlLat, urlLon, urlCity || 'Location');
                    await runApp(urlLat, urlLon, urlCity || 'Location');
                    startedFromUrl = true;
                }
            }
            // Only return if we successfully started from URL params.
            if (startedFromUrl) return;
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

    }

    /**
     * Update storage info display
     */
    function updateStorageDisplay() {
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
        
        // Update storage display
        updateStorageDisplay();

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
            const todayData = renderForecast(forecastData, config);
            saveForecastForHistory(forecastData, config, lat, lon);
            checkHistory(lat, lon, config);
            
            // Fetch and display historical normals for today's date
            const now = new Date();
            const monthDay = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            
            try {
                const normals = await API.fetchHistoricalNormals(lat, lon, monthDay, 10);
                if (normals && !normals.rateLimited) {
                    // Calculate average of today's forecast from both models
                    const todayHigh = (todayData.tempMaxA + todayData.tempMaxB) / 2;
                    const todayLow = (todayData.tempMinA + todayData.tempMinB) / 2;
                    
                    UI.renderHistoricalNormals(normals, todayHigh, todayLow);
                }
            } catch (histError) {
                console.warn('Could not fetch historical normals:', histError);
                // Don't show error to user - this is an enhancement feature
            }
        } catch (error) {
            UI.setStatus(I18n.t('status.apiError', error.message));
            UI.getElement('forecastList').innerHTML = '<tr><td colspan="3">Error loading weather. Check Console.</td></tr>';
        }

        // Generate stripes in background
        generateStripes(lat, lon);

        // Lazy-load ECCC almanac after main content for Canada only
        try {
            let debugInfo = { isCanada: !!config.isCanada, station: null, almanac: null, almanacError: null, city, lat, lon, provCode: null };
            if (config.isCanada) {
                // Try to infer province from the city display name (supports formats like "City-XX" or "City, Province")
                let provCode = null;
                if (city) {
                    const dashMatch = city.match(/-([A-Z]{2})\b/);
                    if (dashMatch) provCode = dashMatch[1];
                    if (!provCode) {
                        const provMap = {
                            'British Columbia': 'BC', 'Alberta': 'AB', 'Saskatchewan': 'SK', 'Manitoba': 'MB',
                            'Ontario': 'ON', 'Quebec': 'QC', 'New Brunswick': 'NB', 'Nova Scotia': 'NS',
                            'Prince Edward Island': 'PE', 'Newfoundland and Labrador': 'NL', 'Yukon': 'YT',
                            'Northwest Territories': 'NT', 'Nunavut': 'NU'
                        };
                        for (const [name, code] of Object.entries(provMap)) {
                            if (city.includes(name)) { provCode = code; break; }
                        }
                    }
                }
                debugInfo.provCode = provCode;
                const station = Geo.findNearestCanadianStation(lat, lon, provCode);
                debugInfo.station = station || null;
                if (station) {
                    const now = new Date();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const eccc = await API.fetchECCCAlmanac(station.id, month, day);
                    if (eccc) {
                        debugInfo.almanac = eccc;
                        UI.renderECCCAlmanac(eccc, station);
                    }
                }
            }
            // Always show debug banner for now (can make conditional later)
            UI.renderDebugBanner(debugInfo);
        } catch (e) {
            console.warn('ECCC almanac load skipped:', e.message);
            UI.renderDebugBanner({ isCanada: !!config.isCanada, station: null, almanac: null, almanacError: e.message });
        }
    }

    /**
     * Render forecast data to UI
     */
    function renderForecast(data, config) {
        const daily = data.daily;

        // Today's forecast - extract all weather data
        const todayData = {
            tempMaxA: Calculations.getSafeData(daily, config.modelA, 'temperature_2m_max', 0),
            tempMinA: Calculations.getSafeData(daily, config.modelA, 'temperature_2m_min', 0),
            probA: Calculations.getSafeData(daily, config.modelA, 'precipitation_probability_max', 0),
            snowA: Calculations.getSafeData(daily, config.modelA, 'snowfall_sum', 0),
            windA: Calculations.getSafeData(daily, config.modelA, 'windspeed_10m_max', 0),
            gustA: Calculations.getSafeData(daily, config.modelA, 'windgusts_10m_max', 0),
            codeA: Calculations.getSafeData(daily, config.modelA, 'weather_code', 0),
            tempMaxB: Calculations.getSafeData(daily, config.modelB, 'temperature_2m_max', 0),
            tempMinB: Calculations.getSafeData(daily, config.modelB, 'temperature_2m_min', 0),
            probB: Calculations.getSafeData(daily, config.modelB, 'precipitation_probability_max', 0),
            snowB: Calculations.getSafeData(daily, config.modelB, 'snowfall_sum', 0),
            windB: Calculations.getSafeData(daily, config.modelB, 'windspeed_10m_max', 0),
            gustB: Calculations.getSafeData(daily, config.modelB, 'windgusts_10m_max', 0),
            codeB: Calculations.getSafeData(daily, config.modelB, 'weather_code', 0)
        };

        UI.renderToday(todayData);

        // 7-day forecast
        UI.renderSevenDay(daily, config.modelA, config.modelB);

        UI.setStatus(I18n.t('status.weatherLoaded'));
        
        return todayData; // Return for historical normals comparison
    }

    /**
     * Save current 7-day forecast for future verification
     */
    function saveForecastForHistory(data, config, lat, lon) {
        const today = new Date().toISOString().split('T')[0];
        const daily = data.daily;
        const times = daily.time;

        // Build 7-day forecast for Model A
        const daysA = times.map((date, index) => ({
            date,
            tempMax: Calculations.getSafeData(daily, config.modelA, 'temperature_2m_max', index),
            tempMin: Calculations.getSafeData(daily, config.modelA, 'temperature_2m_min', index),
            precip: Calculations.getSafeData(daily, config.modelA, 'precipitation_probability_max', index)
        }));

        // Build 7-day forecast for Model B
        const daysB = times.map((date, index) => ({
            date,
            tempMax: Calculations.getSafeData(daily, config.modelB, 'temperature_2m_max', index),
            tempMin: Calculations.getSafeData(daily, config.modelB, 'temperature_2m_min', index),
            precip: Calculations.getSafeData(daily, config.modelB, 'precipitation_probability_max', index)
        }));

        const forecasts = {
            modelA: { name: config.nameA, days: daysA },
            modelB: { name: config.nameB, days: daysB }
        };

        Storage.saveForecastRecord(today, lat, lon, forecasts);
        updateStorageDisplay();
    }

    /**
     * Check stored forecasts vs actual weather for all past dates
     */
    async function checkHistory(lat, lon, config) {
        const pendingRecord = Storage.getPendingForecast();
        if (!pendingRecord) return;

        const today = new Date().toISOString().split('T')[0];
        const savedDate = pendingRecord.savedDate;

        // Don't check if we saved today (no actual data yet)
        if (savedDate === today) return;

        UI.setStatus('Verifying History...');

        try {
            const forecasts = pendingRecord.forecasts;
            if (!forecasts || !forecasts.modelA || !forecasts.modelB) {
                // Old format - fall back to legacy check
                await checkHistoryLegacy(pendingRecord, lat, lon);
                return;
            }

            // Find dates that have passed and can be verified
            const datesToCheck = forecasts.modelA.days.filter(day => day.date < today);
            if (datesToCheck.length === 0) return;

            // For now, check the first date that passed (yesterday)
            const yesterdayForecast = datesToCheck[datesToCheck.length - 1];
            const dateToCheck = yesterdayForecast.date;

            // Fetch actual weather for that date
            const historyData = await API.fetchHistoricalDay(lat, lon, dateToCheck);

            if (!historyData.daily) {
                throw new Error('No historical data');
            }

            const actualRainfall = historyData.daily.rain_sum ? historyData.daily.rain_sum[0] : 0;
            const actualTempMax = historyData.daily.temperature_2m_max ? historyData.daily.temperature_2m_max[0] : null;
            const actualTempMin = historyData.daily.temperature_2m_min ? historyData.daily.temperature_2m_min[0] : null;
            const actuallyRained = actualRainfall > 0.5;

            // Find this date in both model forecasts
            const forecastA = forecasts.modelA.days.find(d => d.date === dateToCheck);
            const forecastB = forecasts.modelB.days.find(d => d.date === dateToCheck);

            if (!forecastA || !forecastB) return;

            // Calculate accuracy for precipitation
            const errorA = Calculations.calculateAccuracy(actuallyRained, forecastA.precip || 0);
            const errorB = Calculations.calculateAccuracy(actuallyRained, forecastB.precip || 0);

            // Calculate temperature errors if we have actual temps
            let tempErrorA = 0;
            let tempErrorB = 0;
            if (actualTempMax !== null) {
                tempErrorA += Math.abs((forecastA.tempMax || 0) - actualTempMax);
                tempErrorB += Math.abs((forecastB.tempMax || 0) - actualTempMax);
            }
            if (actualTempMin !== null) {
                tempErrorA += Math.abs((forecastA.tempMin || 0) - actualTempMin);
                tempErrorB += Math.abs((forecastB.tempMin || 0) - actualTempMin);
            }

            // Combined score: precipitation accuracy (weighted 60%) + temp accuracy (weighted 40%)
            const scoreA = errorA * 0.6 + (tempErrorA / 10) * 0.4; // Normalize temp error to 0-1 scale
            const scoreB = errorB * 0.6 + (tempErrorB / 10) * 0.4;

            // Show result with temperature details
            UI.renderRealityCheck(
                dateToCheck,
                actuallyRained,
                actualRainfall,
                forecastA.precip,
                forecastB.precip,
                forecasts.modelA.name,
                forecasts.modelB.name,
                {
                    actualTempMax,
                    actualTempMin,
                    forecastATempMax: forecastA.tempMax,
                    forecastATempMin: forecastA.tempMin,
                    forecastBTempMax: forecastB.tempMax,
                    forecastBTempMin: forecastB.tempMin
                }
            );

            // Determine winner based on combined score
            const winner = scoreA < scoreB ? 'A' : scoreA > scoreB ? 'B' : 'tie';
            if (winner === 'A') {
                UI.showWinner(forecasts.modelA.name);
                updateScore('A', dateToCheck);
            } else if (winner === 'B') {
                UI.showWinner(forecasts.modelB.name);
                updateScore('B', dateToCheck);
            } else {
                UI.showDraw();
            }
        } catch (error) {
            console.error('History check failed:', error);
            UI.setStatus(`History check failed: ${error.message}`);
        }
    }

    /**
     * Legacy check for old format records (rain only)
     */
    async function checkHistoryLegacy(pendingRecord, lat, lon) {
        const historyData = await API.fetchHistoricalDay(lat, lon, pendingRecord.date);

        if (!historyData.daily || !historyData.daily.rain_sum) {
            throw new Error('No historical data');
        }

        const rainfall = historyData.daily.rain_sum[0];
        const actuallyRained = rainfall > 0.5;

        const probA = pendingRecord.modelA.prob || 0;
        const probB = pendingRecord.modelB.prob || 0;
        const errorA = Calculations.calculateAccuracy(actuallyRained, probA);
        const errorB = Calculations.calculateAccuracy(actuallyRained, probB);

        UI.renderRealityCheck(
            pendingRecord.date,
            actuallyRained,
            rainfall,
            probA,
            probB,
            pendingRecord.modelA.name,
            pendingRecord.modelB.name
        );

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
        updateStorageDisplay();
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
            UI.setStatus(I18n.t('status.stripesError', error.message));
            // Show placeholder in stripes area
            const stripesEl = document.getElementById('stripes');
            if (stripesEl) {
                stripesEl.innerHTML = '<div style="text-align: center; color: #999; padding: 10px; font-size: 0.85rem;">Historical climate data unavailable (may be rate-limited)</div>';
            }
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
        console.log('toggleLanguage called');
        const currentLang = I18n.getCurrentLanguage();
        console.log(`Current language before toggle: ${currentLang}`);
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
        
        // Persist language in URL before reload so shared links keep language
        const savedLoc = Storage.getLocation();
        if (savedLoc && savedLoc.lat && savedLoc.lon && savedLoc.city) {
            Storage.updateUrl(savedLoc.lat, savedLoc.lon, savedLoc.city, newLang);
        } else {
            // If no saved location, still update just the lang param
            Storage.updateUrl(null, null, null, newLang);
        }

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

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
        // Initialize internationalization using browser defaults only
        I18n.init();
        const urlParams = Storage.getUrlParams();
        // Ignore explicit lang overrides for now; rely on browser default
        document.getElementById('html-root').lang = I18n.getCurrentLanguage();
        
        // Hide language toggle until localization is ready
        UI.updateLanguageToggle(true);
        initializeShareMenu();
        
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
                        Storage.saveLocation(best.lat, best.lon, best.displayName, best.country);
                        // Ensure URL is city-only for clarity
                        Storage.updateUrl(best.lat, best.lon, best.displayName);
                        await runApp(best.lat, best.lon, best.displayName, best.country);
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
                        country: data.country,
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
            runApp(savedLocation.lat, savedLocation.lon, savedLocation.city, savedLocation.country);
        } else if (ipGeoData) {
            // Prefer IP geolocation over browser geolocation (more reliable, works with VPNs)
            UI.setStatus(I18n.t('status.ipGeolocation'));
            console.log(`Using IP location: ${ipGeoData.city} (${ipGeoData.lat}, ${ipGeoData.lon})`);
            Storage.saveLocation(ipGeoData.lat, ipGeoData.lon, ipGeoData.city, ipGeoData.country);
            runApp(ipGeoData.lat, ipGeoData.lon, ipGeoData.city, ipGeoData.country);
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
                
                Storage.saveLocation(position.lat, position.lon, city, position.country);
                runApp(position.lat, position.lon, city, position.country);
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
        const historyCount = Storage.getHistoryCount ? Storage.getHistoryCount() : 0;
        const hasHistory = historyCount > 0;
        const hasScoreboard = localStorage.getItem('scoreboard_v6') !== null;
        UI.setStorageInfo(hasLocation, hasHistory, hasScoreboard, historyCount);
    }

    /**
     * Dynamically load a script file
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    /**
     * Dynamically load a CSS file
     */
    function loadCSS(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    /**
     * Render random sections (Education, Stripes, Carbon, RSS, CAT)
     * Supports URL override via ?blocks=...
     * Supports weighted random selection
     * Loads only ONE block and lazy loads its assets
     */
    async function renderRandomSections(lat, lon, country) {
        const container = document.getElementById('random-sections');
        if (!container) return;
        
        container.innerHTML = ''; // Clear existing

        // Define available sections with weights (higher = more likely)
        const availableSections = [
            {
                id: 'education-section',
                weight: 1.0,
                script: 'modules/education.js',
                init: () => Education.render('education-section')
            },
            {
                id: 'stripes-section',
                weight: 0.5, // Lower weight due to heavy API call
                script: 'modules/stripes.js',
                css: 'modules/stripes.css',
                init: () => Stripes.render('stripes-section', lat, lon)
            },
            {
                id: 'carbon-section',
                weight: 1.0,
                script: 'modules/carbon.js',
                init: () => Carbon.render('carbon-section')
            },
            {
                id: 'carbon-live-section',
                weight: 1.0,
                script: 'modules/carbon_live.js',
                init: () => CarbonLive.render('carbon-live-section')
            },
            {
                id: 'warming-section',
                weight: 1.0,
                script: 'modules/warming.js',
                init: () => Warming.render('warming-section')
            },
            {
                id: 'emissions-section',
                weight: 1.0,
                script: 'modules/emissions.js',
                init: () => Emissions.render('emissions-section')
            },
            {
                id: 'rss-section',
                weight: 1.0,
                script: 'modules/rss.js',
                init: () => RSS.render('rss-section')
            },
            {
                id: 'cat-section',
                weight: 1.0,
                script: 'modules/cat.js',
                init: () => CAT.render('cat-section', country)
            }
        ];

        // Check for URL override
        const params = new URLSearchParams(window.location.search);
        const blocksParam = params.get('blocks');
        
        let selectedSection = null;

        if (blocksParam) {
            // URL Override Mode - Pick the first valid one
            const requestedId = blocksParam.split(',')[0].trim().toLowerCase();
            selectedSection = availableSections.find(s => 
                s.id.replace('-section', '') === requestedId || s.id === requestedId
            );
        } else {
            // Weighted Random Selection
            // 1. Filter out sections based on probability (if weight < 1)
            // 2. Pick one from the remaining
            
            // Algorithm:
            // Calculate total weight of all candidates
            // Pick random number between 0 and total
            // Find corresponding section
            
            const totalWeight = availableSections.reduce((sum, s) => sum + s.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const section of availableSections) {
                if (random < section.weight) {
                    selectedSection = section;
                    break;
                }
                random -= section.weight;
            }
        }

        if (selectedSection) {
            console.log(`Loading random section: ${selectedSection.id}`);
            
            // Create container
            const sectionEl = document.createElement('section');
            sectionEl.id = selectedSection.id;
            sectionEl.className = 'card';
            container.appendChild(sectionEl);

            // Load assets
            if (selectedSection.css) {
                loadCSS(selectedSection.css);
            }

            try {
                await loadScript(selectedSection.script);
                // Initialize
                if (selectedSection.init) {
                    selectedSection.init();
                }
            } catch (e) {
                console.error(`Failed to load section ${selectedSection.id}:`, e);
                const errorMsg = e.message || 'Unknown error';
                const errorType = selectedSection.id || 'unknown section';
                sectionEl.innerHTML = `<p style="color:red; text-align:center; font-size: 0.9rem;">⚠️ Error loading ${errorType}<br><span style="font-size: 0.8rem; color: #cc6666;">${errorMsg}</span></p>`;
            }
        }
    }

    /**
     * Main application flow
     */
    async function runApp(lat, lon, city, country) {
        // Parse scenario/debug overrides from URL
        const overrides = Scenario.parseOverrides(window.location.search);
        
        // Show scenario badge only if in test/scenario mode (not for debug-only)
        const badgeInfo = Scenario.getScenarioModeBadge(overrides);
        if (badgeInfo) {
            UI.showScenarioBadge(badgeInfo);
        }

        UI.setLocation(city);
        const loadingMsg = I18n.t('status.loadingWeather', city);
        UI.setStatus(loadingMsg);
        UI.announce(loadingMsg);

        // Render random sections
        await renderRandomSections(lat, lon, country);

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

        // Fetch current conditions first (for immediate display)
        try {
            const currentData = await API.fetchCurrentWeather(lat, lon);
            if (currentData) {
                UI.renderCurrentConditions(currentData, config.nameA, config.nameB, config.units, config.isCanada);
            }
        } catch (currentError) {
            console.warn('Could not fetch current conditions:', currentError);
            // Don't show error to user - this is an enhancement feature
        }

        // Fetch ECCC weather alerts if in Canada
        if (config.isCanada) {
            try {
                await fetchAndDisplayECCCAlerts(lat, lon, city);
            } catch (alertError) {
                console.warn('Could not fetch ECCC alerts:', alertError);
                // Don't show error to user - this is an enhancement feature
            }
        }

        // Fetch forecast data
        try {
            let forecastData = await API.fetchForecast(lat, lon, config.modelA, config.modelB, config.isCanada);
            
            // Apply scenario overrides if present
            const overrides = Scenario.parseOverrides(window.location.search);
            if (overrides && (overrides.scenario || Object.keys(overrides).some(k => overrides[k] && k !== 'mode' && k !== 'debug'))) {
                forecastData = Scenario.applyOverrides(forecastData, overrides);
            }
            
            const todayData = renderForecast(forecastData, config);
            saveForecastForHistory(forecastData, config, lat, lon);
            checkHistory(lat, lon, config);
            
            // Generate and render actions
            try {
                const candidates = Actions.getCandidateActions(forecastData, { lat, lon }, overrides);
                const actions = Actions.getActions(forecastData, { lat, lon }, overrides);
                
                // Show actions panel if there are actionable items
                if (actions && actions.length > 0) {
                    UI.renderActionsPanel(actions, { lat, lon });
                }
                
                // Show debug info if debug=1
                if (overrides.debug) {
                    const dismissed = Actions.getDismissedActions(`${lat},${lon}`, overrides.mode || 'real');
                    const debugInfo = Scenario.getDebugInfo(candidates, actions, overrides, dismissed);
                    UI.showDebugInfo(debugInfo);
                }
            } catch (actionsError) {
                console.warn('Could not generate actions:', actionsError);
            }
            
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
            const errorMsg = I18n.t('status.apiError', error.message);
            UI.setStatus(errorMsg);
            UI.announce(errorMsg);
            UI.getElement('forecastList').innerHTML = '<tr><td colspan="3">Error loading weather. Check Console.</td></tr>';
        }

        // Auto-display battle history if there are past forecasts
        try {
            await showBattleHistoryIfAvailable();
        } catch (battleError) {
            console.warn('Could not display battle history:', battleError);
        }

        // Lazy-load ECCC almanac after main content for Canada only
        try {
            const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
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
                    // On static hosting (GitHub Pages), ECCC CSV fetch is blocked by CORS.
                    // Render station card with links only; skip data fetch.
                    UI.renderECCCAlmanac(null, station);
                }
            }
            if (debugMode) {
                UI.renderDebugBanner(debugInfo);
            }
        } catch (e) {
            console.warn('ECCC almanac load skipped:', e.message);
            const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
            if (debugMode) {
                UI.renderDebugBanner({ isCanada: !!config.isCanada, station: null, almanac: null, almanacError: e.message });
            }
        }

        // GDACS integration removed.
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

        const loadedMsg = I18n.t('status.weatherLoaded');
        UI.setStatus(loadedMsg);
        UI.announce(loadedMsg + " for " + config.city);
        
        return todayData; // Return for historical normals comparison
    }

    /**
     * Show battle history section if there are past forecasts available
     */
    async function showBattleHistoryIfAvailable() {
        const history = Storage.getHistoricalForecasts();
        const pastForecastCount = history ? history.filter(h => h.savedDate < new Date().toISOString().split('T')[0]).length : 0;
        
        if (pastForecastCount > 0) {
            console.log(`Found ${pastForecastCount} past forecasts. Rendering battle history...`);
            await UI.renderBattleHistory();
        }
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
    // Simple in-file cache for `fetchHistoricalDay` calls to avoid duplicate requests
    const _historicalDayCache = { data: {}, TTL: 60 * 60 * 1000 }; // 1 hour TTL

    async function fetchHistoricalDayCached(lat, lon, date) {
        const key = `${lat},${lon},${date}`;
        const cached = _historicalDayCache.data[key];
        if (cached && (Date.now() - cached.ts) < _historicalDayCache.TTL) {
            console.log(`[CACHE HIT] fetchHistoricalDay ${key}`);
            return cached.val;
        }

        const val = await API.fetchHistoricalDay(lat, lon, date);
        _historicalDayCache.data[key] = { val, ts: Date.now() };
        console.log(`[CACHE SET] fetchHistoricalDay ${key}`);
        return val;
    }

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

            // Fetch actual weather for that date (cached wrapper)
            const historyData = await fetchHistoricalDayCached(lat, lon, dateToCheck);

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
        const historyData = await fetchHistoricalDayCached(lat, lon, pendingRecord.date);

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
                stripesEl.innerHTML = '<div style="text-align: center; color: var(--subtext); padding: 10px; font-size: 0.85rem;">Historical climate data unavailable (may be rate-limited)</div>';
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
     * Initialize share menu and social handlers
     */
    function initializeShareMenu() {
        const shareBtn = document.getElementById('share-btn');
        const shareMenu = document.getElementById('share-menu');

        if (!shareBtn || !shareMenu) {
            console.warn('Share menu elements not found');
            return;
        }

        // Toggle menu on button click
        shareBtn.addEventListener('click', () => {
            const isOpen = shareMenu.style.display !== 'none';
            shareMenu.style.display = isOpen ? 'none' : 'block';
            shareBtn.setAttribute('aria-expanded', !isOpen);
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const shareContainer = shareBtn.parentElement;
            if (shareContainer && !shareContainer.contains(e.target)) {
                shareMenu.style.display = 'none';
                shareBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Register social share button handlers
        const copyBtn = document.getElementById('share-copy-btn');
        const linkedinBtn = document.getElementById('share-linkedin-btn');
        const mastodonBtn = document.getElementById('share-mastodon-btn');
        const blueskyBtn = document.getElementById('share-bluesky-btn');

        const closeMenu = () => {
            shareMenu.style.display = 'none';
            shareBtn.setAttribute('aria-expanded', 'false');
        };

        if (copyBtn) {
            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!currentConfig) {
                    alert('No location loaded yet');
                    return;
                }
                const shareUrl = Storage.getShareUrl(
                    currentConfig.lat,
                    currentConfig.lon,
                    currentConfig.city
                );
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    alert(I18n.t('ui.linkCopied'));
                } catch (err) {
                    prompt(I18n.t('ui.linkCopyFailed', ''), shareUrl);
                }
                closeMenu();
            });
        }

        if (linkedinBtn) {
            linkedinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!currentConfig) {
                    alert('No location loaded yet');
                    return;
                }
                const shareUrl = Storage.getShareUrl(
                    currentConfig.lat,
                    currentConfig.lon,
                    currentConfig.city
                );
                const url = encodeURIComponent(shareUrl);
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
                closeMenu();
            });
        }

        if (mastodonBtn) {
            mastodonBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!currentConfig) {
                    alert('No location loaded yet');
                    return;
                }
                const shareUrl = Storage.getShareUrl(
                    currentConfig.lat,
                    currentConfig.lon,
                    currentConfig.city
                );
                const text = encodeURIComponent(`Check out Risky Weather - learn about weather forecasts, model uncertainty, and climate context: ${shareUrl}`);
                window.open(`https://toot.kytta.dev/?text=${text}`, '_blank', 'width=600,height=400');
                closeMenu();
            });
        }

        if (blueskyBtn) {
            blueskyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!currentConfig) {
                    alert('No location loaded yet');
                    return;
                }
                const shareUrl = Storage.getShareUrl(
                    currentConfig.lat,
                    currentConfig.lon,
                    currentConfig.city
                );
                const text = encodeURIComponent(`Check out Risky Weather - learn about weather forecasts, model uncertainty, and climate context: ${shareUrl}`);
                window.open(`https://bsky.app/intent/compose?text=${text}`, '_blank', 'width=600,height=400');
                closeMenu();
            });
        }
    }

    /**
     * Fetch and display ECCC weather alerts for a Canadian location
     */
    async function fetchAndDisplayECCCAlerts(lat, lon, city) {
        try {
            // Environment Canada publishes alerts via RSS feeds per province
            // Format: https://weather.gc.ca/rss/alertsCap_xx.xml where xx is province code
            
            // Try to detect province code from city or use a generic feed
            let provCode = null;
            
            // Common Canadian cities and their provinces for quick lookup
            const cityToProvince = {
                'Ottawa': 'ON', 'Toronto': 'ON', 'Montreal': 'QC', 'Vancouver': 'BC',
                'Calgary': 'AB', 'Edmonton': 'AB', 'Winnipeg': 'MB', 'Halifax': 'NS',
                'Quebec City': 'QC', 'Kingston': 'ON', 'Victoria': 'BC', 'Saskatoon': 'SK'
            };
            
            // Try to match city name
            for (const [cityName, code] of Object.entries(cityToProvince)) {
                if (city && city.toLowerCase().includes(cityName.toLowerCase())) {
                    provCode = code;
                    break;
                }
            }
            
            // If no province found, try to infer from latitude/longitude
            if (!provCode) {
                // Rough bounds for provinces (lat/lon boxes)
                const provBounds = {
                    'BC': { minLat: 49, maxLat: 60, minLon: -139, maxLon: -114 },
                    'AB': { minLat: 49, maxLat: 60, minLon: -120, maxLon: -110 },
                    'SK': { minLat: 49, maxLat: 60, minLon: -110, maxLon: -102 },
                    'MB': { minLat: 49, maxLat: 60, minLon: -102, maxLon: -95 },
                    'ON': { minLat: 42, maxLat: 52, minLon: -95, maxLon: -74 },
                    'QC': { minLat: 45, maxLat: 52, minLon: -79, maxLon: -57 },
                    'NB': { minLat: 45, maxLat: 48, minLon: -69, maxLon: -64 },
                    'NS': { minLat: 43, maxLat: 47, minLon: -66, maxLon: -60 },
                    'PE': { minLat: 45, maxLat: 47, minLon: -64, maxLon: -62 },
                    'NL': { minLat: 47, maxLat: 53, minLon: -59, maxLon: -52 }
                };
                
                for (const [code, bounds] of Object.entries(provBounds)) {
                    if (lat >= bounds.minLat && lat <= bounds.maxLat && 
                        lon >= bounds.minLon && lon <= bounds.maxLon) {
                        provCode = code;
                        break;
                    }
                }
            }
            
            if (!provCode) {
                console.warn('Could not determine province code for alerts');
                return;
            }
            
            // Fetch ECCC alerts RSS feed
            const feedUrl = `https://weather.gc.ca/rss/alertsCap_${provCode}.xml`;
            const response = await fetch(feedUrl, { signal: AbortSignal.timeout(5000) });
            
            if (!response.ok) {
                console.warn(`ECCC alerts feed returned ${response.status}`);
                return;
            }
            
            const xml = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');
            
            // Check for parse errors
            if (doc.querySelector('parsererror')) {
                console.warn('Failed to parse ECCC alerts feed');
                return;
            }
            
            // Extract alert entries from the RSS/Atom feed
            const entries = doc.querySelectorAll('entry');
            
            if (entries.length === 0) {
                // No alerts - hide the alerts section
                const alertsDiv = document.getElementById('weather-alerts');
                if (alertsDiv) alertsDiv.style.display = 'none';
                return;
            }
            
            // Parse and display alerts
            const alerts = [];
            entries.forEach(entry => {
                const title = entry.querySelector('title')?.textContent || '';
                const summary = entry.querySelector('summary')?.textContent || '';
                const updated = entry.querySelector('updated')?.textContent || '';
                
                // Extract alert type from title (Warning, Watch, Advisory, etc.)
                const alertType = title.split(' ').slice(0, 3).join(' ') || title;
                
                alerts.push({
                    type: alertType,
                    summary: summary,
                    updated: new Date(updated).toLocaleString()
                });
            });
            
            // Display alerts in the UI
            if (alerts.length > 0) {
                const alertsDiv = document.getElementById('weather-alerts');
                const contentDiv = document.getElementById('alerts-content');
                
                if (alertsDiv && contentDiv) {
                    let html = '';
                    alerts.forEach((alert, idx) => {
                        html += `<div style="margin-bottom: 8px;">
                            <strong>${alert.type}</strong><br>
                            ${alert.summary.substring(0, 200)}${alert.summary.length > 200 ? '...' : ''}<br>
                            <span style="font-size: 0.8rem; opacity: 0.8;">Updated: ${alert.updated}</span>
                        </div>`;
                        if (idx < alerts.length - 1) {
                            html += '<hr style="border: none; border-top: 1px solid #ffc107; margin: 8px 0;">';
                        }
                    });
                    
                    contentDiv.innerHTML = html;
                    alertsDiv.style.display = 'block';
                }
            }
            
        } catch (error) {
            console.warn('ECCC alerts fetch error:', error);
            // Silently fail - alerts are optional
        }
    }

    return {
        init,
        reset,
        refreshLocation,
        toggleLanguage
    };
})();

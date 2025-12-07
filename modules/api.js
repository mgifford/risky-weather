/**
 * API Module
 * Handles all HTTP requests to Open-Meteo services
 */

const API = (() => {
    const BASE_FORECAST = 'https://api.open-meteo.com/v1/forecast';
    const BASE_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
    const BASE_GEOCODING = 'https://geocoding-api.open-meteo.com/v1/reverse';

    const CONFIG = {
        FORECAST_TIMEOUT: 10000,
        ARCHIVE_TIMEOUT: 15000,
        GEOCODING_TIMEOUT: 5000
    };

    /**
     * Fetch forecast data for two models
     * For Canada: also fetches GEM Global to fill in days 3-6
     */
    async function fetchForecast(lat, lon, modelA, modelB, isCanada = false) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            daily: 'temperature_2m_max,precipitation_probability_max',
            models: `${modelA},${modelB}`,
            timezone: 'auto'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.FORECAST_TIMEOUT);

        try {
            const response = await fetch(`${BASE_FORECAST}?${params}`, { signal: controller.signal });
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            let data = await response.json();

            // For Canada: if GEM Regional (modelA) has gaps, fetch GEM Global for days 3-6
            if (isCanada && modelA === 'gem_regional') {
                data = await mergeWithGemGlobal(lat, lon, data, modelB);
            }

            return data;
        } catch (error) {
            throw new Error(`Forecast fetch failed: ${error.message}`);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Merge GEM Regional (days 0-2) with GEM Global (days 3-6)
     * Keeps the accurate short-term forecasts, extends with global model
     */
    async function mergeWithGemGlobal(lat, lon, regionalData, modelB) {
        // Try GEM Global first; if that fails, try modelB (e.g., ECMWF) as a longer-horizon fallback
        const tryFetch = async (models) => {
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                daily: 'temperature_2m_max,precipitation_probability_max',
                models,
                timezone: 'auto'
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.FORECAST_TIMEOUT);

            try {
                const response = await fetch(`${BASE_FORECAST}?${params}`, { signal: controller.signal });
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                const data = await response.json();
                clearTimeout(timeoutId);
                return data;
            } catch (err) {
                clearTimeout(timeoutId);
                throw err;
            }
        };

        try {
            const globalData = await tryFetch('gem_global');
            return blendForecasts(regionalData, globalData);
        } catch (errGlobal) {
            console.warn(`GEM Global fetch failed: ${errGlobal.message}`);
            if (modelB) {
                try {
                    // Try modelB (e.g., ECMWF) as a horizon filler
                    const fallbackData = await tryFetch(modelB);
                    return blendForecasts(regionalData, fallbackData);
                } catch (errModelB) {
                    console.warn(`Fallback to modelB (${modelB}) failed: ${errModelB.message}`);
                }
            }
            // As a last resort, return regionalData (will be short but usable)
            return regionalData;
        }
    }

    /**
     * Combine two forecast datasets: ensure a full 7-day series by using
     * GEM Global as the base (longer horizon) and overlay GEM Regional
     * values for the early days where available. This handles cases where
     * the regional fetch returns only the first few days.
     */
    function blendForecasts(regionalData, globalData) {
        // Use regionalData as the base so we preserve other model keys (e.g. ECMWF/GFS).
        // Then extend/fill the regional-keyed arrays from globalData where regional values are missing.
        const blended = JSON.parse(JSON.stringify(regionalData)); // Deep clone regional

        const globalTimes = globalData.daily?.time || [];
        const globalDays = globalTimes.length;

        // Normalize blended.daily.time to the global horizon so UI always sees the full window
        blended.daily = blended.daily || {};
        blended.daily.time = globalData.daily.time.slice(0, globalDays);

        // Ensure all arrays in blended.daily are the same length (globalDays)
        for (const key of Object.keys(blended.daily)) {
            if (key === 'time') continue;
            const arr = blended.daily[key] || [];
            if (arr.length < globalDays) {
                blended.daily[key] = arr.concat(new Array(globalDays - arr.length).fill(null));
            } else if (arr.length > globalDays) {
                blended.daily[key] = arr.slice(0, globalDays);
            }
        }

        // Keys we care about filling
        const gemRegTempKey = `temperature_2m_max_gem_regional`;
        const gemGlobTempKey = `temperature_2m_max_gem_global`;
        const genericTempKey = `temperature_2m_max`;
        const gemRegRainKey = `precipitation_probability_max_gem_regional`;
        const gemGlobRainKey = `precipitation_probability_max_gem_global`;
        const genericRainKey = `precipitation_probability_max`;

        if (!blended.daily[gemRegTempKey]) blended.daily[gemRegTempKey] = new Array(globalDays).fill(null);
        if (!blended.daily[gemRegRainKey]) blended.daily[gemRegRainKey] = new Array(globalDays).fill(null);

        const regionalTempArr = regionalData.daily?.[gemRegTempKey] || [];
        const regionalRainArr = regionalData.daily?.[gemRegRainKey] || [];

        for (let i = 0; i < globalDays && i < 7; i++) {
            // Fill temperature: prefer existing regional value, otherwise copy from global
            if (regionalTempArr[i] != null) {
                blended.daily[gemRegTempKey][i] = regionalTempArr[i];
            } else if (globalData.daily?.[gemGlobTempKey] && globalData.daily[gemGlobTempKey][i] != null) {
                blended.daily[gemRegTempKey][i] = globalData.daily[gemGlobTempKey][i];
            } else if (globalData.daily?.[genericTempKey] && globalData.daily[genericTempKey][i] != null) {
                // Some API responses provide generic keys (non-namespaced)
                blended.daily[gemRegTempKey][i] = globalData.daily[genericTempKey][i];
            }

            // Fill rain probability similarly
            if (regionalRainArr[i] != null) {
                blended.daily[gemRegRainKey][i] = regionalRainArr[i];
            } else if (globalData.daily?.[gemGlobRainKey] && globalData.daily[gemGlobRainKey][i] != null) {
                blended.daily[gemRegRainKey][i] = globalData.daily[gemGlobRainKey][i];
            } else if (globalData.daily?.[genericRainKey] && globalData.daily[genericRainKey][i] != null) {
                blended.daily[gemRegRainKey][i] = globalData.daily[genericRainKey][i];
            }
        }

        return blended;
    }

    /**
     * Fetch historical data for accuracy verification
     */
    async function fetchHistoricalDay(lat, lon, date) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: date,
            end_date: date,
            daily: 'rain_sum',
            timezone: 'auto'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.ARCHIVE_TIMEOUT);

        try {
            const response = await fetch(`${BASE_ARCHIVE}?${params}`, { signal: controller.signal });
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Historical day fetch failed: ${error.message}`);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetch 74 years of historical data for warming stripes
     * Large request but cacheable locally
     */
    async function fetchHistoricalYears(lat, lon, startYear = 1950, endYear = 2023) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: `${startYear}-01-01`,
            end_date: `${endYear}-12-31`,
            daily: 'temperature_2m_mean',
            timezone: 'auto'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.ARCHIVE_TIMEOUT);

        try {
            const response = await fetch(`${BASE_ARCHIVE}?${params}`, { signal: controller.signal });
            if (!response.ok) {
                // Handle rate limiting explicitly
                if (response.status === 429) {
                    console.warn('Historical years fetch rate limited (429)');
                    return { rateLimited: true };
                }
                throw new Error(`API returned ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Historical years fetch failed: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Reverse geocode to get city name from coordinates
     * Uses Open-Meteo primary, falls back to Nominatim if needed
     */
    async function getCityName(lat, lon) {
        // If running from file:// or origin null, skip Open-Meteo reverse geocoding (CORS)
        const isFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
        const originIsNull = typeof window !== 'undefined' && window.location && (window.location.origin === 'null' || window.location.origin === 'about:blank');

        // Prefer a quick IP-based lookup first (works without extra API key)
        try {
            const ipResp = await fetch('https://ipwho.is/');
            if (ipResp.ok) {
                const ipData = await ipResp.json();
                if (ipData && ipData.city) {
                    return ipData.city;
                }
            }
        } catch (err) {
            // ignore ipwho.is failures, move to other fallbacks
        }

        if (!isFileProtocol && !originIsNull) {
            // Try Open-Meteo first
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                count: 1,
                language: 'en',
                format: 'json'
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.GEOCODING_TIMEOUT);

            try {
                const response = await fetch(`${BASE_GEOCODING}?${params}`, { signal: controller.signal });
                if (response.ok) {
                    const data = await response.json();
                    if (data.results?.[0]?.name) {
                        clearTimeout(timeoutId);
                        return data.results[0].name;
                    }
                }
            } catch (error) {
                console.error(`Open-Meteo geocoding failed: ${error.message}`);
            } finally {
                clearTimeout(timeoutId);
            }
        }

        // Fallback: Try Nominatim (OpenStreetMap)
        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
            const response = await fetch(nominatimUrl);
            if (response.ok) {
                const data = await response.json();
                // Try to get city, town, or village name
                const name = data.address?.city ||
                           data.address?.town ||
                           data.address?.village ||
                           data.address?.county ||
                           null;
                if (name) {
                    return name;
                }
            }
        } catch (error) {
            console.error(`Nominatim geocoding failed: ${error.message}`);
        }

        // Final fallback: Generate approximate location name from coordinates
        const latDir = lat > 0 ? 'N' : 'S';
        const lonDir = lon > 0 ? 'E' : 'W';
        const absLat = Math.abs(lat).toFixed(2);
        const absLon = Math.abs(lon).toFixed(2);
        return `${absLat}°${latDir} ${absLon}°${lonDir}`;
    }

    return {
        fetchForecast,
        fetchHistoricalDay,
        fetchHistoricalYears,
        getCityName
    };
})();

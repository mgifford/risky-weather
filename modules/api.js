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
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,snowfall_sum,windspeed_10m_max,windgusts_10m_max,weather_code',
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
                daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,snowfall_sum,windspeed_10m_max,windgusts_10m_max,weather_code',
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
        const keys = {
            tempMax: { reg: 'temperature_2m_max_gem_regional', glob: 'temperature_2m_max_gem_global', gen: 'temperature_2m_max' },
            tempMin: { reg: 'temperature_2m_min_gem_regional', glob: 'temperature_2m_min_gem_global', gen: 'temperature_2m_min' },
            rain: { reg: 'precipitation_probability_max_gem_regional', glob: 'precipitation_probability_max_gem_global', gen: 'precipitation_probability_max' },
            precip: { reg: 'precipitation_sum_gem_regional', glob: 'precipitation_sum_gem_global', gen: 'precipitation_sum' },
            snow: { reg: 'snowfall_sum_gem_regional', glob: 'snowfall_sum_gem_global', gen: 'snowfall_sum' },
            wind: { reg: 'windspeed_10m_max_gem_regional', glob: 'windspeed_10m_max_gem_global', gen: 'windspeed_10m_max' },
            gust: { reg: 'windgusts_10m_max_gem_regional', glob: 'windgusts_10m_max_gem_global', gen: 'windgusts_10m_max' },
            code: { reg: 'weather_code_gem_regional', glob: 'weather_code_gem_global', gen: 'weather_code' }
        };

        // Initialize arrays
        Object.values(keys).forEach(k => {
            if (!blended.daily[k.reg]) blended.daily[k.reg] = new Array(globalDays).fill(null);
        });

        // Get regional arrays
        const regional = {
            tempMax: regionalData.daily?.[keys.tempMax.reg] || [],
            tempMin: regionalData.daily?.[keys.tempMin.reg] || [],
            rain: regionalData.daily?.[keys.rain.reg] || [],
            precip: regionalData.daily?.[keys.precip.reg] || [],
            snow: regionalData.daily?.[keys.snow.reg] || [],
            wind: regionalData.daily?.[keys.wind.reg] || [],
            gust: regionalData.daily?.[keys.gust.reg] || [],
            code: regionalData.daily?.[keys.code.reg] || []
        };

        // Fill each day, blending regional with global
        for (let i = 0; i < globalDays && i < 7; i++) {
            // Helper to fill one key type
            const fillKey = (keySet, regionalArr) => {
                if (regionalArr[i] != null) {
                    blended.daily[keySet.reg][i] = regionalArr[i];
                } else if (globalData.daily?.[keySet.glob] && globalData.daily[keySet.glob][i] != null) {
                    blended.daily[keySet.reg][i] = globalData.daily[keySet.glob][i];
                } else if (globalData.daily?.[keySet.gen] && globalData.daily[keySet.gen][i] != null) {
                    blended.daily[keySet.reg][i] = globalData.daily[keySet.gen][i];
                }
            };

            fillKey(keys.tempMax, regional.tempMax);
            fillKey(keys.tempMin, regional.tempMin);
            fillKey(keys.rain, regional.rain);
            fillKey(keys.precip, regional.precip);
            fillKey(keys.snow, regional.snow);
            fillKey(keys.wind, regional.wind);
            fillKey(keys.gust, regional.gust);
            fillKey(keys.code, regional.code);
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
     * Fetch historical highs/lows for today's date across past years
     * Returns average, record high, and record low for comparison
     */
    async function fetchHistoricalNormals(lat, lon, monthDay, yearsBack = 10) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - yearsBack;

        // Fetch a date range covering the last N years, then filter to the target month-day
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: `${startYear}-01-01`,
            end_date: `${currentYear - 1}-12-31`,
            daily: 'temperature_2m_max,temperature_2m_min',
            timezone: 'auto'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.ARCHIVE_TIMEOUT);

        try {
            const response = await fetch(`${BASE_ARCHIVE}?${params}`, { signal: controller.signal });
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('Historical normals fetch rate limited (429)');
                    return { rateLimited: true };
                }
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            const times = data.daily?.time || [];
            const highsAll = data.daily?.temperature_2m_max || [];
            const lowsAll = data.daily?.temperature_2m_min || [];

            // Filter entries matching the requested month-day (MM-DD)
            const targetMD = monthDay; // already MM-DD
            const idxs = times
                .map((t, i) => ({ t, i }))
                .filter(({ t }) => t.slice(5) === targetMD)
                .map(({ i }) => i);

            const highs = idxs.map(i => highsAll[i]).filter(v => v != null);
            const lows = idxs.map(i => lowsAll[i]).filter(v => v != null);

            if (highs.length === 0 || lows.length === 0) return null;

            return {
                avgHigh: highs.reduce((a, b) => a + b, 0) / highs.length,
                avgLow: lows.reduce((a, b) => a + b, 0) / lows.length,
                recordHigh: Math.max(...highs),
                recordLow: Math.min(...lows),
                yearsOfData: highs.length
            };
        } catch (error) {
            console.error(`Historical normals fetch failed: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetch Environment Canada (ECCC) Almanac averages/extremes for a station and month-day.
     * Placeholder implementation using a CSV pattern; returns null if unavailable.
     */
    async function fetchECCCAlmanac(stationId, month, day) {
        try {
            const url = `https://climate.weather.gc.ca/climate_data/bulk_data_e.html?format=csv&stationID=${stationId}&timeframe=3`;
            const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) throw new Error(`ECCC almanac fetch failed: ${resp.status}`);
            const text = await resp.text();
            const lines = text.split(/\r?\n/);
            const md = `${month}-${String(day).padStart(2,'0')}`;
            const target = lines.find(l => l.includes(md));
            if (!target) return null;
            const cols = target.split(',');
            return {
                date: md,
                avgHigh: parseFloat(cols[5] || 'NaN'),
                avgLow: parseFloat(cols[6] || 'NaN'),
                recHigh: parseFloat(cols[7] || 'NaN'),
                recLow: parseFloat(cols[8] || 'NaN')
            };
        } catch (e) {
            console.warn('ECCC almanac unavailable or endpoint changed:', e.message);
            return null;
        }
    }

    // GDACS integration removed.

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
                    // Add region/state if available (format: "City-Region")
                    const region = ipData.region_code || ipData.region;
                    if (region) {
                        return `${ipData.city}-${region}`;
                    }
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
                    if (data.results?.[0]) {
                        clearTimeout(timeoutId);
                        const result = data.results[0];
                        const name = result.name;
                        // Add region/admin1 if available (format: "City-Region")
                        const region = result.admin1 || result.country_code;
                        if (region && region !== name) {
                            return `${name}-${region}`;
                        }
                        return name;
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
                    // Add state/region if available (format: "City-Region")
                    const region = data.address?.state || data.address?.county || data.address?.country_code?.toUpperCase();
                    if (region && region !== name) {
                        return `${name}-${region}`;
                    }
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

    /**
     * Fetch actual weather data for a specific date range
     * Used to verify forecast accuracy against what actually happened
     */
    async function fetchActualWeather(lat, lon, startDate, endDate = null) {
        const end = endDate || startDate;
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: startDate,
            end_date: end,
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
            timezone: 'auto'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.ARCHIVE_TIMEOUT);

        try {
            const response = await fetch(`${BASE_ARCHIVE}?${params}`, { signal: controller.signal });
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Actual weather fetch failed for ${startDate}: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    return {
        fetchForecast,
        fetchHistoricalDay,
        fetchHistoricalYears,
        fetchHistoricalNormals,
        getCityName,
        fetchECCCAlmanac,
        fetchActualWeather
    };
})();

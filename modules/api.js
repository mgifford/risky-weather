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

    // Simple in-memory cache for expensive API responses
    const RESPONSE_CACHE = {
        historicalYears: {},
        TTL: 24 * 60 * 60 * 1000 // 24 hours
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
        const cacheKey = `${lat},${lon},${startYear},${endYear}`;
        const cached = RESPONSE_CACHE.historicalYears[cacheKey];
        if (cached && (Date.now() - cached.timestamp) < RESPONSE_CACHE.TTL) {
            console.log(`[CACHE HIT] fetchHistoricalYears for ${cacheKey}`);
            return cached.data;
        }

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
            const data = await response.json();
            RESPONSE_CACHE.historicalYears[cacheKey] = { data, timestamp: Date.now() };
            console.log(`[CACHE SET] fetchHistoricalYears for ${cacheKey}`);
            return data;
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
        const today = new Date();
        const currentYear = today.getFullYear();
        const startYear = currentYear - yearsBack;
        const endDate = today.toISOString().split('T')[0];

        // Fetch a date range covering the last N years, including current year to calculate recent averages
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: `${startYear}-01-01`,
            end_date: endDate,
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

            if (!times.length || !highsAll.length || !lowsAll.length) return null;

            const entries = times.map((t, i) => ({
                dateStr: t,
                date: new Date(`${t}T00:00:00Z`),
                month: Number(t.slice(5, 7)),
                day: Number(t.slice(8, 10)),
                high: highsAll[i],
                low: lowsAll[i]
            }));

            const targetMD = monthDay; // MM-DD
            const targetMonth = Number(monthDay.slice(0, 2));
            const targetDay = Number(monthDay.slice(3));
            const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;

            const todayBaseline = computeDayStats(entries, targetMD, currentYear);
            const rollingBaseline = computeRollingWindow(entries, targetMonth, targetDay, currentYear);
            const recent31 = computeRecentWindow(entries, today, 31);
            const monthStats = computeMonthlyStats(entries, targetMonth, prevMonth, currentYear);

            return {
                today: todayBaseline,
                rolling31: {
                    baseline: rollingBaseline,
                    recent: recent31,
                    windowDays: 31
                },
                month: monthStats
            };
        } catch (error) {
            console.error(`Historical normals fetch failed: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function computeStats(list) {
        const highs = list.map(e => e.high).filter(v => v != null);
        const lows = list.map(e => e.low).filter(v => v != null);
        if (!highs.length || !lows.length) return null;
        return {
            avgHigh: highs.reduce((a, b) => a + b, 0) / highs.length,
            avgLow: lows.reduce((a, b) => a + b, 0) / lows.length,
            recordHigh: Math.max(...highs),
            recordLow: Math.min(...lows),
            yearsOfData: highs.length
        };
    }

    function computeDayStats(entries, targetMD, currentYear) {
        const dayEntries = entries.filter(e => e.dateStr.slice(5) === targetMD && e.date.getFullYear() <= currentYear - 1);
        return computeStats(dayEntries);
    }

    function computeRollingWindow(entries, month, day, currentYear) {
        const windowKeys = buildWindowKeys(month, day, 15);
        const windowEntries = entries.filter(e => windowKeys.has(e.dateStr.slice(5)) && e.date.getFullYear() <= currentYear - 1);
        return computeStats(windowEntries);
    }

    function computeRecentWindow(entries, today, days) {
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - (days - 1));
        const recentEntries = entries.filter(e => e.date >= cutoff && e.date <= today && e.date.getFullYear() === today.getFullYear());
        return computeStats(recentEntries);
    }

    function computeMonthlyStats(entries, currentMonth, prevMonth, currentYear) {
        const prevActual = entries.filter(e => e.date.getFullYear() === currentYear && e.month === prevMonth);
        const prevBaseline = entries.filter(e => e.month === prevMonth && e.date.getFullYear() <= currentYear - 1);

        const currentBaseline = entries.filter(e => e.month === currentMonth && e.date.getFullYear() <= currentYear - 1);

        return {
            previous: {
                month: prevMonth,
                actual: computeStats(prevActual),
                baseline: computeStats(prevBaseline)
            },
            current: {
                month: currentMonth,
                baseline: computeStats(currentBaseline)
            }
        };
    }

    function buildWindowKeys(month, day, span) {
        const base = new Date(Date.UTC(2001, month - 1, day));
        const keys = new Set();
        for (let offset = -span; offset <= span; offset++) {
            const d = new Date(base);
            d.setUTCDate(base.getUTCDate() + offset);
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            keys.add(`${m}-${dd}`);
        }
        return keys;
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
            const url = `${BASE_ARCHIVE}?${params}`;
            console.log(`Fetching actual weather: ${url}`);
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            const data = await response.json();
            console.log(`Got actual weather for ${startDate}:`, data);
            return data;
        } catch (error) {
            console.warn(`Actual weather fetch failed for ${startDate}: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetch current weather conditions
     * Returns temperature, weather code, and other current conditions
     * Note: Open-Meteo returns single observation, not model-specific data
     */
    async function fetchCurrentWeather(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m',
            timezone: 'auto'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.FORECAST_TIMEOUT);

        try {
            const response = await fetch(`${BASE_FORECAST}?${params}`, { signal: controller.signal });
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn(`Current weather fetch failed: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Fetch current weather from Environment Canada for Canadian locations
     * Uses GeoJSON stations API to find nearest weather station
     * Returns standardized current weather object
     */
    async function fetchEnvironmentCanadaWeather(lat, lon) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.FORECAST_TIMEOUT);

        try {
            // Step 1: Find the nearest weather station
            const geoUrl = `https://api.weather.gc.ca/collections/stations/items?limit=10&f=json`;
            const geoResponse = await fetch(geoUrl, { signal: controller.signal });
            if (!geoResponse.ok) throw new Error(`GeoJSON API returned ${geoResponse.status}`);
            const geoData = await geoResponse.json();

            // Find nearest station by calculating distance
            let nearestStation = null;
            let minDistance = Infinity;

            if (geoData.features) {
                for (const feature of geoData.features) {
                    const [stationLon, stationLat] = feature.geometry.coordinates;
                    const dx = stationLon - lon;
                    const dy = stationLat - lat;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestStation = feature.properties.id;
                    }
                }
            }

            if (!nearestStation) throw new Error('No weather station found');

            // Step 2: Fetch current conditions from the nearest station
            const wxUrl = `https://api.weather.gc.ca/collections/weather-observations-daily-results/items?station_id=${nearestStation}&limit=1&f=json`;
            const wxResponse = await fetch(wxUrl, { signal: controller.signal });
            if (!wxResponse.ok) throw new Error(`Weather API returned ${wxResponse.status}`);
            const wxData = await wxResponse.json();

            if (!wxData.features || wxData.features.length === 0) {
                throw new Error('No weather data for station');
            }

            // Convert EC data to format similar to Open-Meteo for comparison
            const obs = wxData.features[0].properties;
            return {
                source: 'environment_canada',
                current: {
                    time: obs.date_obs || new Date().toISOString(),
                    temperature_2m: obs.mean_temp !== null ? obs.mean_temp : null,
                    relative_humidity_2m: obs.rel_humidity !== null ? obs.rel_humidity : null,
                    precipitation: obs.precip_total !== null ? obs.precip_total : null,
                    wind_speed_10m: obs.wind_spd !== null ? obs.wind_spd : null,
                    // Weather code mapping (simplified)
                    weather_code: mapECWeatherCode(obs.weather_code)
                },
                station_id: nearestStation
            };
        } catch (error) {
            console.warn(`Environment Canada fetch failed: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Map Environment Canada weather codes to WMO codes for consistency
     */
    function mapECWeatherCode(ecCode) {
        // Simplified mapping - EC uses different codes
        // For now, return null to indicate we don't have a reliable mapping
        return null;
    }

    return {
        fetchForecast,
        fetchHistoricalDay,
        fetchHistoricalYears,
        fetchHistoricalNormals,
        getCityName,
        fetchECCCAlmanac,
        fetchActualWeather,
        fetchCurrentWeather,
        fetchEnvironmentCanadaWeather
    };
})();

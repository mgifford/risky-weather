/**
 * Geolocation Module
 * Handles geolocation detection and model configuration
 */

const Geo = (() => {
    const GEO_TIMEOUT = 5000; // Increased to handle VPNs

    /**
     * Get current position from browser geolocation
     * Falls back to IP-based geolocation if browser geolocation fails/times out
     */
    function getCurrentPosition() {
        return new Promise(async (resolve, reject) => {
            if (!navigator.geolocation) {
                console.log('Browser geolocation not supported, trying IP-based geolocation');
                return tryIPGeolocation(resolve, reject);
            }

            const timeoutId = setTimeout(() => {
                console.log('Browser geolocation timed out, trying IP-based geolocation');
                clearTimeout(timeoutId);
                tryIPGeolocation(resolve, reject);
            }, GEO_TIMEOUT);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    console.log(`Browser geolocation succeeded: ${position.coords.latitude}, ${position.coords.longitude}`);
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (error) => {
                    clearTimeout(timeoutId);
                    console.log(`Browser geolocation failed: ${error.message}, trying IP-based`);
                    tryIPGeolocation(resolve, reject);
                }
            );
        });
    }

    /**
     * Fallback: Get location from IP address using ipwho.is
     * Works reliably even with VPNs, no API key required
     */
    async function tryIPGeolocation(resolve, reject) {
        try {
            const response = await fetch('https://ipwho.is/', {
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) throw new Error(`ipwho.is returned ${response.status}`);
            const data = await response.json();

            if (!data.success && data.success !== undefined) {
                throw new Error(`ipwho.is failure: ${data.message || 'Unknown error'}`);
            }

            if (data.latitude != null && data.longitude != null) {
                console.log(`IP-based geolocation: ${data.city}, ${data.country_code} (${data.latitude}, ${data.longitude})`);
                resolve({
                    lat: data.latitude,
                    lon: data.longitude,
                    city: data.city || `${data.region || data.country_code}`, // Fallback to region/country if no city
                    ip: data.ip // Store the IP address for display
                });
            } else {
                reject(new Error('IP geolocation returned invalid coordinates'));
            }
        } catch (error) {
            console.error(`IP-based geolocation failed: ${error.message}`);
            reject(new Error(`IP geolocation failed: ${error.message}`));
        }
    }

    /**
     * Get model configuration based on location
     */
    function getModelConfig(lat, lon) {
        const isCanada = Calculations.isCanadianLocation(lat, lon);

        return {
            isCanada,
            modelA: isCanada ? 'gem_regional' : 'ecmwf_ifs025',
            modelB: isCanada ? 'ecmwf_ifs025' : 'gfs_seamless',
            nameA: isCanada ? 'GEM (Canada)' : 'ECMWF (Euro)',
            nameB: isCanada ? 'ECMWF (Euro)' : 'GFS (USA)',
            colorA: isCanada ? 'var(--gem-color)' : 'var(--euro-color)',
            colorB: isCanada ? 'var(--euro-color)' : 'var(--gfs-color)'
        };
    }

    /**
     * Get official weather links for location
     * Returns array of links with region-specific primary sources
     */
    function getOfficialLinks(lat, lon, isCanada, cityName) {
        const links = [];

        if (isCanada) {
            // PRIMARY: Environment Canada
            const coords = `${lat.toFixed(3)},${lon.toFixed(3)}`;
            links.push({
                href: `https://weather.gc.ca/en/location/index.html?coords=${coords}`,
                label: 'View Environment Canada Official',
                color: 'var(--gem-color)',
                isPrimary: true
            });
            
            // SECONDARY: Windy.com visual comparison
            links.push({
                href: `https://www.windy.com/${lat}/${lon}?${lat},${lon},9`,
                label: 'View Windy.com Forecast Map',
                color: 'var(--euro-color)',
                isPrimary: false
            });
        } else if (isUK(lat, lon)) {
            // PRIMARY: BBC Weather - use city name for accurate location
            const bbcUrl = cityName 
                ? `https://www.bbc.co.uk/weather/search?s=${encodeURIComponent(cityName)}`
                : `https://www.bbc.co.uk/weather/?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
            
            links.push({
                href: bbcUrl,
                label: 'View BBC Weather',
                color: '#222222',
                isPrimary: true
            });
            
            // SECONDARY: Windy.com
            links.push({
                href: `https://www.windy.com/${lat}/${lon}?${lat},${lon},9`,
                label: 'View Windy.com Map',
                color: 'var(--euro-color)',
                isPrimary: false
            });
        } else if (isEurope(lat, lon)) {
            // PRIMARY: Windy for Europe
            links.push({
                href: `https://www.windy.com/${lat}/${lon}?${lat},${lon},9`,
                label: 'View Windy.com Map',
                color: 'var(--euro-color)',
                isPrimary: true
            });
            
            // SECONDARY: TimeandDate.com (works globally)
            links.push({
                href: `https://www.timeanddate.com/weather/${getTimeandDateCode(lat, lon)}`,
                label: 'View TimeandDate Weather',
                color: '#2B6CB0',
                isPrimary: false
            });
        } else if (isUSA(lat, lon)) {
            // PRIMARY: National Weather Service (USA)
            links.push({
                href: `https://www.weather.gov/`,
                label: 'View National Weather Service',
                color: '#003366',
                isPrimary: true
            });
            
            // SECONDARY: Windy.com
            links.push({
                href: `https://www.windy.com/${lat}/${lon}?${lat},${lon},9`,
                label: 'View Windy.com Map',
                color: 'var(--gfs-color)',
                isPrimary: false
            });
        } else {
            // FALLBACK: Windy for everywhere else
            links.push({
                href: `https://www.windy.com/${lat}/${lon}?${lat},${lon},9`,
                label: 'View Windy.com Map',
                color: 'var(--euro-color)',
                isPrimary: true
            });
        }

        return links;
    }

    /**
     * Helper: Detect if coordinates are in UK
     */
    function isUK(lat, lon) {
        return lat > 50 && lat < 59 && lon > -9 && lon < 2;
    }

    /**
     * Helper: Detect if coordinates are in Europe
     */
    function isEurope(lat, lon) {
        return lat > 35 && lat < 71 && lon > -11 && lon < 40;
    }

    /**
     * Helper: Detect if coordinates are in USA
     */
    function isUSA(lat, lon) {
        return lat > 24 && lat < 49 && lon > -125 && lon < -66;
    }

    /**
     * Helper: Get TimeandDate code (uses approximate region)
     */
    function getTimeandDateCode(lat, lon) {
        // TimeandDate.com works without specific codes
        return '';
    }

    /**
     * Search for cities using Open-Meteo Geocoding API
     */
    async function searchCities(query) {
        if (!query || query.length < 2) return [];

        const currentLang = (typeof I18n !== 'undefined' && I18n.getCurrentLanguage) ? I18n.getCurrentLanguage() : 'en';

        // Normalize common patterns: "City-Region" -> "City, Region"
        function normalize(q) {
            const trimmed = q.trim();
            // Replace multiple separators with single space
            let normalized = trimmed.replace(/[\s_]+/g, ' ');
            // Convert dashes to comma-space to hint admin1
            normalized = normalized.replace(/\s*-\s*/g, ', ');
            return normalized;
        }

        // Extract possible admin1/country tokens
        function splitTokens(q) {
            // Split on comma or dash
            const parts = q.split(/[,-]/).map(p => p.trim()).filter(Boolean);
            return parts;
        }

        async function queryGeocoding(name) {
            const params = new URLSearchParams({
                name,
                count: '10',
                language: currentLang,
                format: 'json'
            });
            const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
                signal: AbortSignal.timeout(5000)
            });
            if (!resp.ok) throw new Error(`Geocoding API returned ${resp.status}`);
            const data = await resp.json();
            return Array.isArray(data.results) ? data.results : [];
        }

        try {
            const attempts = [];
            const normalized = normalize(query);
            const tokens = splitTokens(query);
            // Map common province codes to full names for better matching
            const provMap = {
                'BC': 'British Columbia', 'AB': 'Alberta', 'SK': 'Saskatchewan', 'MB': 'Manitoba',
                'ON': 'Ontario', 'QC': 'Quebec', 'NB': 'New Brunswick', 'NS': 'Nova Scotia',
                'PE': 'Prince Edward Island', 'NL': 'Newfoundland and Labrador', 'YT': 'Yukon',
                'NT': 'Northwest Territories', 'NU': 'Nunavut'
            };
            let enhanced = normalized;
            // If query contains "City-XX" or "City, XX", convert to "City, FullProvince"
            const codeMatch = query.match(/[-,]\s*([A-Z]{2})\b/);
            if (codeMatch && provMap[codeMatch[1]]) {
                const cityOnly = tokens[0];
                enhanced = `${cityOnly}, ${provMap[codeMatch[1]]}`;
            }

            // Attempt 1: normalized (handles City-Region -> City, Region)
            attempts.push(normalized);
            // Attempt 1b: province full name substituted when available
            if (enhanced && enhanced !== normalized) attempts.push(enhanced);
            // Attempt 2: raw query (as-is)
            attempts.push(query);
            // Attempt 3: city-only (first token)
            if (tokens.length > 0) attempts.push(tokens[0]);
            // Attempt 4: append ", Canada" for Canadian queries
            if (enhanced) attempts.push(`${enhanced}, Canada`);
            if (tokens.length > 0) attempts.push(`${tokens[0]}, Canada`);

            // Deduplicate attempts
            const uniqueAttempts = [...new Set(attempts)].filter(a => a && a.length >= 2);

            for (const name of uniqueAttempts) {
                try {
                    const results = await queryGeocoding(name);
                    if (results.length) {
                        return results.map(result => ({
                            name: result.name,
                            region: result.admin1 || '',
                            country: result.country,
                            countryCode: result.country_code,
                            lat: result.latitude,
                            lon: result.longitude,
                            displayName: [result.name, result.admin1, result.country].filter(Boolean).join(', ')
                        }));
                    }
                } catch (innerErr) {
                    console.warn('Geocoding attempt failed for', name, innerErr);
                }
            }

            return [];
        } catch (error) {
            console.error('City search failed:', error);
            return [];
        }
    }

    /**
     * Find nearest Canadian climate station with almanac coverage.
     * Minimal seeded list; expand as needed.
     */
    function findNearestCanadianStation(lat, lon, provinceCode = null) {
        const stations = [
            { id: 49568, name: 'Ottawa CDA', prov: 'ON', lat: 45.317, lon: -75.667 },
            { id: 51459, name: 'Toronto City', prov: 'ON', lat: 43.655, lon: -79.383 },
            { id: 888, name: 'Vancouver Intl', prov: 'BC', lat: 49.194, lon: -123.184 },
            { id: 6158355, name: 'Montreal', prov: 'QC', lat: 45.5, lon: -73.567 }
        ];
        // If province code provided, prefer stations within that province
        const pool = provinceCode ? stations.filter(s => s.prov === provinceCode) : stations;
        const toRad = d => d * Math.PI / 180;
        const earthR = 6371;
        const distance = (aLat, aLon, bLat, bLon) => {
            const dLat = toRad(bLat - aLat);
            const dLon = toRad(bLon - aLon);
            const sLat = toRad(aLat);
            const sLat2 = toRad(bLat);
            const h = Math.sin(dLat/2)**2 + Math.cos(sLat)*Math.cos(sLat2)*Math.sin(dLon/2)**2;
            return 2 * earthR * Math.asin(Math.sqrt(h));
        };
        let best = null;
        let bestDist = Infinity;
        for (const st of pool.length ? pool : stations) {
            const d = distance(lat, lon, st.lat, st.lon);
            if (d < bestDist) { best = st; bestDist = d; }
        }
        // If the nearest seeded station is too far, return null to avoid misleading matches
        const result = best ? { ...best, distanceKm: Math.round(bestDist) } : null;
        if (result && result.distanceKm > 300) return null;
        return result;
    }

    return {
        getCurrentPosition,
        getModelConfig,
        getOfficialLinks,
        searchCities,
        findNearestCanadianStation,
        DEFAULT_LAT: 45.42,
        DEFAULT_LON: -75.69,
        DEFAULT_CITY: 'Ottawa (Default)'
    };
})();

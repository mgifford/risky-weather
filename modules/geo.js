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

    return {
        getCurrentPosition,
        getModelConfig,
        getOfficialLinks,
        DEFAULT_LAT: 45.42,
        DEFAULT_LON: -75.69,
        DEFAULT_CITY: 'Ottawa (Default)'
    };
})();

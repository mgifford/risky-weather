/**
 * Storage Module
 * Handles all localStorage operations for location, history, and scores
 */

const Storage = (() => {
    const VERSION = 'v6';
    const KEYS = {
        LOCATION: `user_loc_${VERSION}`,
        HISTORY_PENDING: `history_${VERSION}_pending`,
        SCOREBOARD: `scoreboard_${VERSION}`,
        LAST_SCORED: `last_scored_date_${VERSION}`
    };

    return {
        // Location Storage
        saveLocation(lat, lon, city) {
            localStorage.setItem(KEYS.LOCATION, JSON.stringify({ lat, lon, city }));
        },

        getLocation() {
            const saved = localStorage.getItem(KEYS.LOCATION);
            return saved ? JSON.parse(saved) : null;
        },

        clearLocation() {
            localStorage.removeItem(KEYS.LOCATION);
        },

        removeLocation() {
            // Alias for clearLocation for clarity
            this.clearLocation();
        },

        // Forecast History
        saveForecastRecord(date, lat, lon, forecasts) {
            // forecasts: { modelA: { name, days: [{date, tempMax, tempMin, precip}] }, modelB: {...} }
            const record = {
                savedDate: date,
                lat,
                lon,
                forecasts
            };
            localStorage.setItem(KEYS.HISTORY_PENDING, JSON.stringify(record));
        },

        getPendingForecast() {
            const saved = localStorage.getItem(KEYS.HISTORY_PENDING);
            return saved ? JSON.parse(saved) : null;
        },

        // Scoreboard
        getScoreboard() {
            const saved = localStorage.getItem(KEYS.SCOREBOARD);
            return saved ? JSON.parse(saved) : { a: 0, b: 0, start: new Date().toLocaleDateString() };
        },

        incrementScore(winner) {
            const scores = this.getScoreboard();
            if (winner === 'A') scores.a++;
            if (winner === 'B') scores.b++;
            localStorage.setItem(KEYS.SCOREBOARD, JSON.stringify(scores));
            return scores;
        },

        setLastScoredDate(date) {
            localStorage.setItem(KEYS.LAST_SCORED, date);
        },

        getLastScoredDate() {
            return localStorage.getItem(KEYS.LAST_SCORED);
        },

        // URL Parameter Management
        /**
         * Get URL parameters for current location and language
         */
        getShareUrl(lat, lon, city, lang = null) {
            const currentLang = lang || I18n.getCurrentLanguage();
            const baseUrl = window.location.origin + window.location.pathname;
            const params = new URLSearchParams();
            
            if (lat && lon && city) {
                params.set('lat', lat.toFixed(2));
                params.set('lon', lon.toFixed(2));
                params.set('city', encodeURIComponent(city));
            }
            
            if (currentLang) {
                params.set('lang', currentLang);
            }
            
            return `${baseUrl}?${params.toString()}`;
        },

        /**
         * Parse URL parameters for location and language
         */
        getUrlParams() {
            const params = new URLSearchParams(window.location.search);
            const result = {};
            
            const lat = params.get('lat');
            const lon = params.get('lon');
            const city = params.get('city');
            const lang = params.get('lang');
            
            if (lat && lon) {
                result.location = {
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    city: city ? decodeURIComponent(city) : 'Location'
                };
            }
            
            if (lang) {
                result.language = lang;
            }
            
            return result;
        },

        /**
         * Update URL with current location (without page reload)
         */
        updateUrl(lat, lon, city, lang = null) {
            const currentLang = lang || I18n.getCurrentLanguage();
            const params = new URLSearchParams();
            
            if (lat && lon && city) {
                params.set('lat', lat.toFixed(2));
                params.set('lon', lon.toFixed(2));
                params.set('city', encodeURIComponent(city));
            }
            
            if (currentLang) {
                params.set('lang', currentLang);
            }
            
            const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({ lat, lon, city, lang: currentLang }, '', newUrl);
        },

        // Clear all
        clearAll() {
            Object.values(KEYS).forEach(key => localStorage.removeItem(key));
        }
    };
})();

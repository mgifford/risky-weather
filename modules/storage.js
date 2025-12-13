/**
 * Storage Module
 * Handles all localStorage operations for location, history, and scores
 */

const Storage = (() => {
    const VERSION = 'v6';
    const KEYS = {
        LOCATION: `user_loc_${VERSION}`,
        HISTORY: `history_${VERSION}`,
        SCOREBOARD: `scoreboard_${VERSION}`,
        LAST_SCORED: `last_scored_date_${VERSION}`
    };
    const MAX_HISTORY_DAYS = 31;

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
            
            // Get existing history array or create new one
            let history = this.getHistoricalForecasts();
            
            // Check if we already have a record for this date
            const existingIndex = history.findIndex(r => r.savedDate === date);
            if (existingIndex >= 0) {
                // Update existing record
                history[existingIndex] = record;
            } else {
                // Add new record
                history.push(record);
            }
            
            // Sort by date (most recent first)
            history.sort((a, b) => new Date(b.savedDate) - new Date(a.savedDate));
            
            // Keep only the last 31 days
            if (history.length > MAX_HISTORY_DAYS) {
                history = history.slice(0, MAX_HISTORY_DAYS);
            }
            
            localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
        },

        getPendingForecast() {
            // Get the most recent forecast (for backward compatibility)
            const history = this.getHistoricalForecasts();
            return history.length > 0 ? history[0] : null;
        },

        // Get all historical forecasts (up to 31 days)
        getHistoricalForecasts() {
            const saved = localStorage.getItem(KEYS.HISTORY);
            return saved ? JSON.parse(saved) : [];
        },

        // Get forecast for a specific date
        getForecastByDate(date) {
            const history = this.getHistoricalForecasts();
            return history.find(r => r.savedDate === date) || null;
        },

        // Get number of historical forecast days stored
        getHistoryCount() {
            return this.getHistoricalForecasts().length;
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
                // Do not pre-encode; URLSearchParams handles encoding
                params.set('city', city);
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
            
            // If city is present, prefer it. Include lat/lon only if provided.
            if (city) {
                result.location = {
                    // No manual decode; params.get already returns decoded value
                    city: city,
                    lat: lat ? parseFloat(lat) : null,
                    lon: lon ? parseFloat(lon) : null
                };
            } else if (lat && lon) {
                // No city, but coordinates are present
                result.location = {
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    city: 'Location'
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
            // Start from existing params to preserve non-core keys like `debug`
            const params = new URLSearchParams(window.location.search);

            // Normalize core location params
            if (city) {
                params.set('city', city);
                // Clear lat/lon if city is authoritative to avoid conflicting state
                params.delete('lat');
                params.delete('lon');
            } else if (lat && lon) {
                params.set('lat', Number(lat).toFixed(2));
                params.set('lon', Number(lon).toFixed(2));
                // If no city provided, ensure any stale city is removed
                params.delete('city');
            }

            if (currentLang) {
                params.set('lang', currentLang);
            }

            const query = params.toString();
            const newUrl = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
            window.history.replaceState({ lat, lon, city, lang: currentLang }, '', newUrl);
        },

        // Clear all
        clearAll() {
            Object.values(KEYS).forEach(key => localStorage.removeItem(key));
        }
    };
})();

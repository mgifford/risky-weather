/**
 * Internationalization Module
 * Handles multi-language support with browser default detection
 */

const I18n = (() => {
    const SUPPORTED_LANGUAGES = ['en', 'fr'];
    const DEFAULT_LANGUAGE = 'en';

    // Translation strings
    const translations = {
        en: {
            // Status messages
            'status.init': 'Initializing...',
            'status.checkingHistory': 'Checking History...',
            'status.savedLocation': 'Using Saved Location',
            'status.ipGeolocation': 'Using IP Geolocation',
            'status.requestingGeolocation': 'Requesting Browser Geolocation...',
            'status.geoSuccess': 'Geolocation Success',
            'status.loadingWeather': 'Loading Weather for {0}...',
            'status.weatherLoaded': 'Weather Loaded',
            'status.loadingHistorical': 'Loading Historical Data...',
            'status.historicalRateLimited': 'Historical data rate-limited. Try again later.',
            'status.stripesError': 'Stripes error: {0}',
            'status.apiError': 'API Error: {0}',
            'status.defaultLocation': 'Using Default Location: {0}',

            // UI Elements
            'ui.title': 'Risky Weather',
            'ui.subtitle': 'Comparing Models & Assessing Uncertainty',
            'ui.location': 'Location',
            'ui.scoreboard': '🏆 Model Scoreboard',
            'ui.winsSince': 'Wins since',
            'ui.versus': 'vs',
            'ui.today': '📊 Today\'s Forecast',
            'ui.highTemp': 'High Temp',
            'ui.sevenDay': '📅 7-Day Competition',
            'ui.yesterday': '🔍 Yesterday\'s Result',
            'ui.climateContext': '🌍 Climate Context',
            'ui.education': 'Understanding Weather & Risk',
            'ui.loadingLesson': 'Loading lesson...',
            'ui.historyTitle': '📜 On This Day in Climate History',
            'ui.uncertaintyTitle': '🎯 Understanding Model Disagreement',
            'ui.uncertaintyDescription': 'When models disagree significantly, forecast uncertainty is <strong>high</strong>. Look for ⚠️ (high uncertainty) or ⚡ (moderate uncertainty) icons next to days below.',
            'ui.resetLocation': 'Reset Location & History',
            'ui.refreshLocation': '🔄 Refresh Location',
            'ui.viewCache': '📋 View Cache',
            'ui.shareLocation': '🔗 Share',
            'ui.toggleLanguage': '🌍 {0}',
            'ui.linkCopied': 'Link copied to clipboard!',
            'ui.linkCopyFailed': 'Could not copy link. URL: {0}',

            // Model names
            'model.gem': 'GEM',
            'model.gemRegional': 'GEM Regional',
            'model.gemGlobal': 'GEM Global',
            'model.ecmwf': 'ECMWF',
            'model.gfs': 'GFS',
            'model.canada': 'GEM (Canada)',
            'model.euro': 'ECMWF (Euro)',
            'model.usa': 'GFS (USA)',

            // Data units
            'unit.celsius': '°C',
            'unit.percent': '%',
            'unit.rainRisk': '{0}% Rain',

            // Cache Inspector
            'cache.title': '📋 Cache Inspector',
            'cache.location': '📍 Current Location',
            'cache.scores': '🏆 Model Scores',
            'cache.forecasts': '📅 Daily Forecasts Stored',
            'cache.keys': '🔑 All Stored Keys',
            'cache.rawJson': '📦 Raw JSON',
            'cache.city': 'City',
            'cache.latitude': 'Lat',
            'cache.longitude': 'Lon',
            'cache.ip': 'IP',
            'cache.noLocation': 'No location saved',
            'cache.noScores': 'No scores saved yet',
            'cache.noForecasts': 'No daily forecasts stored yet. Will save on next visit.',
            'cache.noData': 'No data stored',
            'cache.gemRegionalWins': 'GEM Regional Wins',
            'cache.gemGlobalWins': 'GEM Global Wins',
            'cache.ecmwfWins': 'ECMWF Wins',
            'cache.lastScored': 'Last Scored',
            'cache.gemForecast': 'GEM Forecast',
            'cache.ecmwfForecast': 'ECMWF Forecast',

            // Weather links
            'link.officialEnvironmentCanada': 'View Environment Canada Official',
            'link.windyMap': 'View Windy.com Forecast Map',
            'link.officialBBC': 'View BBC Weather',
            'link.officialNWS': 'View National Weather Service',
            'link.officialMeteoFrance': 'View Météo-France',
            'link.officialDeutscherWetterdienst': 'View Deutscher Wetterdienst',

            // Education
            'education.nextLesson': 'Next Lesson',

            // Stripes
            'stripes.title': 'Annual temperature deviation (1950-2023)',
            'stripes.description': 'Annual temperature deviation (1950-2023). <br><strong>Blue</strong> = Cooler than normal. <strong>Red</strong> = Warmer.',
            'stripes.start': '1950',
            'stripes.end': '2023',

            // Table headers
            'table.day': 'Day',
            'table.date': 'Date',
            'table.high': 'High',
            'table.low': 'Low',
            'table.rain': 'Rain %',

            // Rain legend
            'rain.lowRisk': 'Low Risk',
            'rain.moderateRisk': 'Moderate Risk',
            'rain.highRisk': 'High Risk',
            'rain.veryHighRisk': 'Very High Risk',

            // Weather conditions
            'weather.clear': 'Clear',
            'weather.mainlyClear': 'Mainly Clear',
            'weather.partlyCloudy': 'Partly Cloudy',
            'weather.overcast': 'Overcast',
            'weather.foggy': 'Foggy',
            'weather.drizzle': 'Drizzle',
            'weather.rain': 'Rain',
            'weather.snow': 'Snow',
            'weather.rainShowers': 'Rain Showers',
            'weather.snowShowers': 'Snow Showers',
            'weather.thunderstorm': 'Thunderstorm',

            // Extreme weather warnings
            'warning.extremeHeat': 'EXTREME HEAT',
            'warning.highHeat': 'Very Hot',
            'warning.extremeCold': 'EXTREME COLD',
            'warning.highCold': 'Very Cold',
            'warning.dangerousWinds': 'DANGEROUS WINDS',
            'warning.highWinds': 'High Winds',
            'warning.heavySnow': 'HEAVY SNOW',
            'warning.significantSnow': 'Significant Snow',

            // Weather details
            'weather.snowfall': 'Snow',
            'weather.wind': 'Wind',
            'weather.gusts': 'gusts',

            // Days of week
            'day.sunday': 'Sunday',
            'day.monday': 'Monday',
            'day.tuesday': 'Tuesday',
            'day.wednesday': 'Wednesday',
            'day.thursday': 'Thursday',
            'day.friday': 'Friday',
            'day.saturday': 'Saturday'
        },
        fr: {
            // Messages d'état
            'status.init': 'Initialisation...',
            'status.checkingHistory': 'Vérification de l\'historique...',
            'status.savedLocation': 'Utilisation de l\'emplacement enregistré',
            'status.ipGeolocation': 'Utilisation de la géolocalisation IP',
            'status.requestingGeolocation': 'Demande de géolocalisation du navigateur...',
            'status.geoSuccess': 'Succès de la géolocalisation',
            'status.loadingWeather': 'Chargement de la météo pour {0}...',
            'status.weatherLoaded': 'Météo chargée',
            'status.loadingHistorical': 'Chargement des données historiques...',
            'status.historicalRateLimited': 'Données historiques limitées par le débit. Réessayez plus tard.',
            'status.stripesError': 'Erreur des rayures : {0}',
            'status.apiError': 'Erreur API : {0}',
            'status.defaultLocation': 'Utilisation de l\'emplacement par défaut : {0}',

            // Éléments UI
            'ui.title': 'Météo Risquée',
            'ui.subtitle': 'Comparaison de modèles et évaluation de l\'incertitude',
            'ui.location': 'Emplacement',
            'ui.scoreboard': '🏆 Tableau des scores',
            'ui.winsSince': 'Victoires depuis',
            'ui.versus': 'contre',
            'ui.today': '📊 Prévisions d\'aujourd\'hui',
            'ui.highTemp': 'Température maximale',
            'ui.sevenDay': '📅 Compétition de 7 jours',
            'ui.yesterday': '🔍 Résultat d\'hier',
            'ui.climateContext': '🌍 Contexte climatique',
            'ui.education': 'Comprendre la météo et le risque',
            'ui.loadingLesson': 'Chargement de la leçon...',
            'ui.historyTitle': '📜 Ce jour dans l’histoire du climat',
            'ui.uncertaintyTitle': '🎯 Comprendre le désaccord des modèles',
            'ui.uncertaintyDescription': 'Lorsque les modèles sont en désaccord significatif, l\'incertitude des prévisions est <strong>élevée</strong>. Recherchez les icônes ⚠️ (incertitude élevée) ou ⚡ (incertitude modérée) à côté des jours ci-dessous.',
            'ui.resetLocation': 'Réinitialiser l\'emplacement et l\'historique',
            'ui.refreshLocation': '🔄 Rafraîchir l\'emplacement',
            'ui.viewCache': '📋 Afficher le cache',
            'ui.shareLocation': '🔗 Partager',
            'ui.toggleLanguage': '🌍 {0}',
            'ui.linkCopied': 'Lien copié dans le presse-papiers!',
            'ui.linkCopyFailed': 'Impossible de copier le lien. URL: {0}',

            // Noms des modèles
            'model.gem': 'GEM',
            'model.gemRegional': 'GEM Régional',
            'model.gemGlobal': 'GEM Global',
            'model.ecmwf': 'ECMWF',
            'model.gfs': 'GFS',
            'model.canada': 'GEM (Canada)',
            'model.euro': 'ECMWF (Euro)',
            'model.usa': 'GFS (USA)',

            // Unités de données
            'unit.celsius': '°C',
            'unit.percent': '%',
            'unit.rainRisk': '{0}% Pluie',

            // Inspecteur de cache
            'cache.title': '📋 Inspecteur de cache',
            'cache.location': '📍 Emplacement actuel',
            'cache.scores': '🏆 Scores des modèles',
            'cache.forecasts': '📅 Prévisions quotidiennes stockées',
            'cache.keys': '🔑 Toutes les clés stockées',
            'cache.rawJson': '📦 JSON brut',
            'cache.city': 'Ville',
            'cache.latitude': 'Lat',
            'cache.longitude': 'Lon',
            'cache.ip': 'IP',
            'cache.noLocation': 'Aucun emplacement enregistré',
            'cache.noScores': 'Aucun score enregistré',
            'cache.noForecasts': 'Aucune prévision quotidienne stockée. Sera sauvegardée à la prochaine visite.',
            'cache.noData': 'Aucune donnée stockée',
            'cache.gemRegionalWins': 'Victoires GEM Régional',
            'cache.gemGlobalWins': 'Victoires GEM Global',
            'cache.ecmwfWins': 'Victoires ECMWF',
            'cache.lastScored': 'Dernier score',
            'cache.gemForecast': 'Prévision GEM',
            'cache.ecmwfForecast': 'Prévision ECMWF',

            // Liens météo
            'link.officialEnvironmentCanada': 'Voir le rapport officiel d\'Environnement Canada',
            'link.windyMap': 'Voir la carte de prévision Windy.com',
            'link.officialBBC': 'Voir BBC Météo',
            'link.officialNWS': 'Voir le Service national de la météo',
            'link.officialMeteoFrance': 'Voir Météo-France',
            'link.officialDeutscherWetterdienst': 'Voir Deutscher Wetterdienst',

            // Éducation
            'education.nextLesson': 'Leçon suivante',

            // Rayures climatiques
            'stripes.title': 'Déviation de température annuelle (1950-2023)',
            'stripes.description': 'Déviation de température annuelle (1950-2023). <br><strong>Bleu</strong> = Plus froid que la normale. <strong>Rouge</strong> = Plus chaud.',
            'stripes.start': '1950',
            'stripes.end': '2023',

            // En-têtes de tableau
            'table.day': 'Jour',
            'table.date': 'Date',
            'table.high': 'Max',
            'table.low': 'Min',
            'table.rain': 'Pluie %',

            // Légende de probabilité de pluie
            'rain.lowRisk': 'Risque faible',
            'rain.moderateRisk': 'Risque modéré',
            'rain.highRisk': 'Risque élevé',
            'rain.veryHighRisk': 'Risque très élevé',

            // Conditions météorologiques
            'weather.clear': 'Dégagé',
            'weather.mainlyClear': 'Principalement dégagé',
            'weather.partlyCloudy': 'Partiellement nuageux',
            'weather.overcast': 'Couvert',
            'weather.foggy': 'Brouillard',
            'weather.drizzle': 'Bruine',
            'weather.rain': 'Pluie',
            'weather.snow': 'Neige',
            'weather.rainShowers': 'Averses',
            'weather.snowShowers': 'Averses de neige',
            'weather.thunderstorm': 'Orage',

            // Avertissements météorologiques extrêmes
            'warning.extremeHeat': 'CHALEUR EXTRÊME',
            'warning.highHeat': 'Très chaud',
            'warning.extremeCold': 'FROID EXTRÊME',
            'warning.highCold': 'Très froid',
            'warning.dangerousWinds': 'VENTS DANGEREUX',
            'warning.highWinds': 'Vents forts',
            'warning.heavySnow': 'NEIGE ABONDANTE',
            'warning.significantSnow': 'Neige importante',

            // Détails météorologiques
            'weather.snowfall': 'Neige',
            'weather.wind': 'Vent',
            'weather.gusts': 'rafales',

            // Jours de la semaine
            'day.sunday': 'Dimanche',
            'day.monday': 'Lundi',
            'day.tuesday': 'Mardi',
            'day.wednesday': 'Mercredi',
            'day.thursday': 'Jeudi',
            'day.friday': 'Vendredi',
            'day.saturday': 'Samedi'
        }
    };

    let currentLanguage = null;

    /**
     * Initialize i18n with browser language preference
     */
    function init() {
        // Get browser language (e.g., 'en-US' -> 'en')
        const browserLang = navigator.language?.split('-')[0]?.toLowerCase() || DEFAULT_LANGUAGE;
        
        // Use browser language if supported, otherwise default to English
        currentLanguage = SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE;
        
        // Check for saved language preference
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
            currentLanguage = savedLang;
        }
        
        console.log(`I18n initialized with language: ${currentLanguage} (browser: ${browserLang})`);
        return currentLanguage;
    }

    /**
     * Get current language
     */
    function getCurrentLanguage() {
        return currentLanguage || DEFAULT_LANGUAGE;
    }

    /**
     * Set language
     */
    function setLanguage(lang) {
        if (!SUPPORTED_LANGUAGES.includes(lang)) {
            console.warn(`Language ${lang} not supported. Using ${DEFAULT_LANGUAGE}`);
            return DEFAULT_LANGUAGE;
        }
        currentLanguage = lang;
        localStorage.setItem('app_language', lang);
        return lang;
    }

    /**
     * Get supported languages
     */
    function getSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    /**
     * Get language name in current language
     */
    function getLanguageName(lang) {
        const names = {
            en: { en: 'English', fr: 'Anglais' },
            fr: { en: 'Français', fr: 'Français' }
        };
        return names[lang]?.[getCurrentLanguage()] || lang;
    }

    /**
     * Translate a key, optionally with placeholders
     * Usage: t('status.loadingWeather', 'London')
     */
    function t(key, ...args) {
        const lang = getCurrentLanguage();
        let text = translations[lang]?.[key];
        
        if (!text) {
            // Fallback to English if translation missing
            text = translations[DEFAULT_LANGUAGE]?.[key];
        }
        
        if (!text) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        // Replace placeholders {0}, {1}, etc.
        if (args.length > 0) {
            text = text.replace(/{(\d+)}/g, (match, index) => {
                return args[index] !== undefined ? args[index] : match;
            });
        }

        return text;
    }

    /**
     * Get all translations for current language (for use in templates)
     */
    function getAll() {
        return translations[getCurrentLanguage()] || translations[DEFAULT_LANGUAGE];
    }

    return {
        init,
        getCurrentLanguage,
        setLanguage,
        getSupportedLanguages,
        getLanguageName,
        t,
        getAll
    };
})();

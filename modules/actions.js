/**
 * Actions Module
 * Generates context-appropriate actionable recommendations based on weather conditions
 */

const Actions = (() => {
    const STORAGE_PREFIX = 'riskyWeather:dismissedActions';
    const STORAGE_SCENARIO_PREFIX = 'riskyWeather:scenarioMode';

    // Default dismissal TTLs (hours)
    const DISMISSAL_TTLS = {
        snow: 12,
        watering: 48,
        basement: 24,
        cooling: 12,
        heat: 12,
        roads: 24,
        easterEgg: 24
    };

    const REMIND_LATER_TTLS = {
        snow: 2,
        watering: 6,
        cooling: 3
    };

    /**
     * Generate stable deterministic ID for an action
     */
    function generateActionId(type, trigger, forecastData) {
        const hash = `${type}:${trigger}:${Math.floor(Date.now() / 3600000)}`; // Changes hourly
        return hash;
    }

    /**
     * Check if action is currently dismissed
     */
    function isDismissed(actionId, locationKey, mode = 'real') {
        const dismissalKey = `${STORAGE_PREFIX}:${locationKey}:${mode}`;
        const dismissed = JSON.parse(localStorage.getItem(dismissalKey) || '{}');
        
        if (!dismissed[actionId]) return false;
        
        const dismissedAt = dismissed[actionId].dismissedAt || 0;
        const ttlMs = (dismissed[actionId].ttlHours || 24) * 3600000;
        const isExpired = Date.now() - dismissedAt > ttlMs;
        
        if (isExpired) {
            // Clean up expired dismissal
            delete dismissed[actionId];
            localStorage.setItem(dismissalKey, JSON.stringify(dismissed));
            return false;
        }
        
        return true;
    }

    /**
     * Mark action as dismissed
     */
    function dismissAction(actionId, locationKey, ttlHours = 24, mode = 'real') {
        const dismissalKey = `${STORAGE_PREFIX}:${locationKey}:${mode}`;
        const dismissed = JSON.parse(localStorage.getItem(dismissalKey) || '{}');
        
        dismissed[actionId] = {
            dismissedAt: Date.now(),
            ttlHours: ttlHours
        };
        
        localStorage.setItem(dismissalKey, JSON.stringify(dismissed));
    }

    /**
     * Get all dismissed actions for cleanup in debug
     */
    function getDismissedActions(locationKey, mode = 'real') {
        const dismissalKey = `${STORAGE_PREFIX}:${locationKey}:${mode}`;
        return JSON.parse(localStorage.getItem(dismissalKey) || '{}');
    }

    /**
     * Clear all dismissals for a location
     */
    function clearDismissals(locationKey, mode = 'real') {
        const dismissalKey = `${STORAGE_PREFIX}:${locationKey}:${mode}`;
        localStorage.removeItem(dismissalKey);
    }

    /**
     * Generate all candidate actions
     */
    function generateActions(forecastData, location, overrides = {}) {
        const actions = [];

        // Extract key values
        const now = new Date(overrides.now || Date.now());
        const temp = overrides.t_out ?? forecastData.current?.temperature_2m ?? null;
        const humidity = overrides.rh_out ?? forecastData.current?.relative_humidity_2m ?? null;
        const dewpoint = overrides.dp_out ?? calculateDewpoint(temp, humidity);
        const rain48h = overrides.rain_48h ?? estimateRain48h(forecastData);
        const snow24h = overrides.snow_24h ?? estimateSnow24h(forecastData);
            const tminOvernight = overrides.tmin_overnight ?? estimateMinOvernight(forecastData);
            const tmaxDay = forecastData.daily?.temperature_2m_max?.[0] ?? null;
        const season = overrides.season ?? getSeason(now);

        // Cooling/Ventilation actions
        if (tminOvernight !== null && tminOvernight >= 20) {
            actions.push({
                id: generateActionId('heat', 'tropicalNight', forecastData),
                type: 'heat',
                title: '🌴 Tropical night precautions',
                description: 'Minimum temperature will stay above 20°C. Consider a DIY swamp cooler (cold water + fan in small rooms) or ensure AC is ready.',
                why: `Overnight low ${Math.round(tminOvernight)}°C is a tropical night`,
                timeframe: 'Tonight and early morning',
                severity: 'important',
                dismissTTLHours: DISMISSAL_TTLS.heat,
                easterEgg: true,
                easterEggText: 'Put a bowl of cold water in front of a fan for a DIY swamp cooler vibe (small rooms only).'
            });
        }

        if (temp !== null && temp >= 28 && season === 'summer') {
            actions.push({
                id: generateActionId('cooling', 'heat_day', forecastData),
                type: 'cooling',
                title: 'Keep windows closed and run AC',
                description: 'High temperatures expected. Keep windows closed and use air conditioning to manage heat.',
                why: `Outdoor temperature is ${Math.round(temp)}°C`,
                severity: 'important',
                dismissTTLHours: DISMISSAL_TTLS.cooling,
                remindLaterTTLHours: REMIND_LATER_TTLS.cooling
            });
        } else if (temp !== null && temp < 20 && humidity !== null && humidity < 70) {
            actions.push({
                id: generateActionId('cooling', 'cool_dry_night', forecastData),
                type: 'cooling',
                title: 'Open windows tonight to cool the house',
                description: 'Perfect conditions for natural ventilation. Cool, dry air is ideal for airing out the house.',
                why: `Temperature ${Math.round(temp)}°C and humidity ${Math.round(humidity)}% are comfortable`,
                timeframe: 'Tonight',
                severity: 'info',
                dismissTTLHours: DISMISSAL_TTLS.cooling,
                easterEgg: true,
                easterEggText: 'Perfect night for "air out the house" and fresh sheets.'
            });
        } else if (temp !== null && temp < 20 && humidity !== null && humidity >= 70) {
            actions.push({
                id: generateActionId('cooling', 'cool_humid_night', forecastData),
                type: 'cooling',
                title: 'Run dehumidifier tonight',
                description: 'Temperature is cool but humidity is elevated. Running a dehumidifier will improve comfort.',
                why: `Temperature ${Math.round(temp)}°C and humidity ${Math.round(humidity)}% suggests moisture management`,
                timeframe: 'Tonight',
                severity: 'info',
                dismissTTLHours: DISMISSAL_TTLS.cooling
            });
        }

        // Snow actions
        if (snow24h !== null && snow24h >= 10) {
            actions.push({
                id: generateActionId('snow', 'heavy_snow', forecastData),
                type: 'snow',
                title: '❄️ Time to shovel the snow?',
                description: 'Significant snow accumulation is forecast. Plan to shovel now or monitor timing for best conditions.',
                why: `${Math.round(snow24h)}cm of snow expected in next 24 hours`,
                timeframe: 'Next 12-24 hours',
                severity: 'urgent',
                dismissTTLHours: DISMISSAL_TTLS.snow,
                remindLaterTTLHours: REMIND_LATER_TTLS.snow
            });
        } else if (snow24h !== null && snow24h >= 5 && tminOvernight !== null && tminOvernight > 0) {
            const note = (tmaxDay !== null && tmaxDay >= 5) || (tminOvernight !== null && tminOvernight >= 1) ? ' Consider waiting until temperatures rise.' : '';
            actions.push({
                id: generateActionId('snow', 'light_snow_warming', forecastData),
                type: 'snow',
                title: 'Wait to shovel',
                description: `Light snow is forecast but warming follows. Waiting may reduce shoveling effort.${note}`,
                why: `${Math.round(snow24h)}cm snow expected but warming to ${Math.round(tminOvernight)}°C overnight`,
                timeframe: 'Next 24 hours',
                severity: 'important',
                dismissTTLHours: DISMISSAL_TTLS.snow
            });
        }

        // Basement/drainage actions
        if (season === 'winter' && tminOvernight !== null && tminOvernight > 2 && rain48h !== null && rain48h >= 10) {
            actions.push({
                id: generateActionId('basement', 'freeze_thaw_rain', forecastData),
                type: 'basement',
                title: '💧 Check basement and drains',
                description: 'Freeze-thaw cycle with heavy rain can cause water intrusion and drainage issues. Clear gutters and downspouts.',
                why: 'Recent freezing followed by warming and rainfall creates runoff and flooding risk',
                timeframe: 'Today and tonight',
                severity: 'important',
                dismissTTLHours: DISMISSAL_TTLS.basement
            });
        }

        if (season === 'winter' && tminOvernight !== null && tminOvernight <= 2 && tmaxDay !== null && tmaxDay >= 5 && ((rain48h !== null && rain48h >= 5) || (snow24h !== null && snow24h >= 3))) {
            actions.push({
                id: generateActionId('roads', 'freeze_thaw_slippery', forecastData),
                type: 'roads',
                title: '⚠️ Slippery roads - freeze-thaw cycle',
                description: 'Freeze-thaw with precipitation can create black ice and slick surfaces. Use caution.',
                why: `Temperature cycle ${Math.round(tminOvernight)}°C → ${Math.round(tmaxDay)}°C with ${rain48h >= 5 ? Math.round(rain48h) + 'mm rain' : Math.round(snow24h) + 'cm snow'} increases black ice risk`,
                timeframe: 'Until roads clear',
                severity: 'important',
                dismissTTLHours: DISMISSAL_TTLS.roads
            });
        }

        // Watering actions
        if (season === 'summer' && temp !== null && temp >= 20 && rain48h !== null && rain48h < 5) {
            const recentRain = estimateRain(forecastData, -3); // Last 3 days
            if (recentRain < 10) {
                actions.push({
                    id: generateActionId('watering', 'drought_water', forecastData),
                    type: 'watering',
                    title: '💧 Have you watered the plants?',
                    description: 'Hot, dry conditions with minimal recent or forecast rain. Plants need water.',
                    why: `Temperature ${Math.round(temp)}°C, only ${Math.round(recentRain)}mm rain in past 3 days, and less than 5mm expected next 48h`,
                    timeframe: 'Early morning preferred',
                    severity: 'info',
                    dismissTTLHours: DISMISSAL_TTLS.watering,
                    remindLaterTTLHours: REMIND_LATER_TTLS.watering,
                    easterEgg: true,
                    easterEggText: 'Watering trivia: early morning beats midday (cooler, less evaporation).'
                });
            }
        } else if (rain48h !== null && rain48h >= 10) {
            actions.push({
                id: generateActionId('watering', 'rain_coming', forecastData),
                type: 'watering',
                title: 'Skip watering for now',
                description: 'Significant rain is forecast. Hold off on watering to avoid overwatering.',
                why: `${Math.round(rain48h)}mm of rain expected in next 48 hours`,
                timeframe: 'Next 48 hours',
                severity: 'info',
                dismissTTLHours: DISMISSAL_TTLS.watering
            });
        }

        return actions;
    }

    /**
     * Helper: calculate dew point from temp and humidity
     */
    function calculateDewpoint(temp, humidity) {
        if (temp === null || humidity === null) return null;
        // Simplified Magnus formula
        const a = 17.27;
        const b = 237.7;
        const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
        return (b * alpha) / (a - alpha);
    }

    /**
     * Helper: estimate total rain in next 48h
     */
    function estimateRain48h(forecastData) {
        if (!forecastData.daily) return 0;
        const precip = forecastData.daily.precipitation_sum || [];
        return (precip[0] || 0) + (precip[1] || 0);
    }

    /**
     * Helper: estimate rain in past N days
     */
    function estimateRain(forecastData, days = -3) {
        // Stub: in production, would look up historical data
        return 0;
    }

    /**
     * Helper: estimate snow in next 24h
     */
    function estimateSnow24h(forecastData) {
        if (!forecastData.daily) return 0;
        const snow = forecastData.daily.snowfall_sum || [];
        return snow[0] || 0;
    }

    /**
     * Helper: estimate minimum temperature overnight
     */
    function estimateMinOvernight(forecastData) {
        if (!forecastData.daily) return null;
        const minTemps = forecastData.daily.temperature_2m_min || [];
        return minTemps[0] || null;
    }

    /**
     * Helper: determine season from date
     */
    function getSeason(date) {
        const month = date.getMonth();
        if (month >= 2 && month <= 4) return 'spring'; // Mar-May
        if (month >= 5 && month <= 7) return 'summer'; // Jun-Aug
        if (month >= 8 && month <= 10) return 'fall'; // Sep-Oct
        return 'winter'; // Nov-Feb
    }

    /**
     * Filter actions: remove dismissed and non-actionable items
     */
    function filterActions(candidateActions, locationKey, mode = 'real') {
        // Filter out dismissed
        const active = candidateActions.filter(action => {
            return !isDismissed(action.id, locationKey, mode);
        });

        // Filter out non-actionable (keep only those that require user decision)
        const actionable = active.filter(action => {
            // Non-actionable patterns
            if (action.title?.includes('No action needed')) return false;
            if (action.title?.includes('Skip watering') && action.severity === 'info') return false;
            return true;
        });

        return actionable;
    }

    /**
     * Public API: generate and filter actions
     */
    function getActions(forecastData, location, overrides = {}) {
        const candidates = generateActions(forecastData, location, overrides);
        const mode = overrides.mode || 'real';
        const locationKey = `${location.lat},${location.lon}`;
        const filtered = filterActions(candidates, locationKey, mode);
        return filtered;
    }

    /**
     * Public API: get all candidates (for debug only)
     */
    function getCandidateActions(forecastData, location, overrides = {}) {
        return generateActions(forecastData, location, overrides);
    }

    return {
        getActions,
        getCandidateActions,
        dismissAction,
        getDismissedActions,
        clearDismissals,
        isDismissed
    };
})();

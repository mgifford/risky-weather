/**
 * Scenario Module
 * Handles URL-driven overrides and synthetic forecast data for testing
 */

const Scenario = (() => {
    /**
     * Parse URL query parameters for overrides
     */
    function parseOverrides(searchString) {
        const params = new URLSearchParams(searchString);
        const overrides = {
            mode: 'real'
        };

        // Debug mode
        if (params.has('debug')) {
            overrides.debug = params.get('debug') === '1';
        }

        // Scenario name
        if (params.has('scenario')) {
            overrides.scenario = params.get('scenario');
            overrides.mode = 'scenario';
        }

        // Numeric overrides
        if (params.has('t_out')) overrides.t_out = parseFloat(params.get('t_out'));
        if (params.has('rh_out')) overrides.rh_out = parseFloat(params.get('rh_out'));
        if (params.has('dp_out')) overrides.dp_out = parseFloat(params.get('dp_out'));
        if (params.has('rain_48h')) overrides.rain_48h = parseFloat(params.get('rain_48h'));
        if (params.has('snow_24h')) overrides.snow_24h = parseFloat(params.get('snow_24h'));
        if (params.has('tmin_overnight')) overrides.tmin_overnight = parseFloat(params.get('tmin_overnight'));
        if (params.has('season')) overrides.season = params.get('season');
        if (params.has('now')) overrides.now = params.get('now');
        if (params.has('eggs')) overrides.eggs = params.get('eggs') === '1';

        return overrides;
    }

    /**
     * Generate synthetic forecast data for a named scenario
     */
    function getScenario(name) {
        const scenarios = {
            tropicalNight: {
                current: {
                    temperature_2m: 24,
                    relative_humidity_2m: 75,
                    weather_code: 3
                },
                daily: {
                    temperature_2m_min: [20],
                    temperature_2m_max: [28],
                    precipitation_sum: [0],
                    snowfall_sum: [0]
                }
            },
            coolDryNight: {
                current: {
                    temperature_2m: 15,
                    relative_humidity_2m: 55,
                    weather_code: 0
                },
                daily: {
                    temperature_2m_min: [12],
                    temperature_2m_max: [18],
                    precipitation_sum: [0],
                    snowfall_sum: [0]
                }
            },
            coolHumidNight: {
                current: {
                    temperature_2m: 16,
                    relative_humidity_2m: 78,
                    weather_code: 2
                },
                daily: {
                    temperature_2m_min: [13],
                    temperature_2m_max: [19],
                    precipitation_sum: [2],
                    snowfall_sum: [0]
                }
            },
            freezeThawRain: {
                current: {
                    temperature_2m: 3,
                    relative_humidity_2m: 85,
                    weather_code: 51
                },
                daily: {
                    temperature_2m_min: [-2],
                    temperature_2m_max: [5],
                    precipitation_sum: [15],
                    snowfall_sum: [0]
                }
            },
            heavySnow: {
                current: {
                    temperature_2m: -5,
                    relative_humidity_2m: 90,
                    weather_code: 71
                },
                daily: {
                    temperature_2m_min: [-8],
                    temperature_2m_max: [-2],
                    precipitation_sum: [5],
                    snowfall_sum: [18]
                }
            },
            lightSnowWarmingSoon: {
                current: {
                    temperature_2m: -2,
                    relative_humidity_2m: 80,
                    weather_code: 71
                },
                daily: {
                    temperature_2m_min: [1],
                    temperature_2m_max: [8],
                    precipitation_sum: [3],
                    snowfall_sum: [6]
                }
            },
            droughtSummer: {
                current: {
                    temperature_2m: 30,
                    relative_humidity_2m: 40,
                    weather_code: 0
                },
                daily: {
                    temperature_2m_min: [22],
                    temperature_2m_max: [32],
                    precipitation_sum: [0],
                    snowfall_sum: [0]
                }
            },
            heatDay: {
                current: {
                    temperature_2m: 33,
                    relative_humidity_2m: 45,
                    weather_code: 0
                },
                daily: {
                    temperature_2m_min: [25],
                    temperature_2m_max: [35],
                    precipitation_sum: [0],
                    snowfall_sum: [0]
                }
            }
        };

        return scenarios[name] || null;
    }

    /**
     * Apply overrides to forecast data
     */
    function applyOverrides(forecastData, overrides) {
        if (!overrides || Object.keys(overrides).length === 0) {
            return forecastData;
        }

        let data = JSON.parse(JSON.stringify(forecastData));

        // Apply scenario first
        if (overrides.scenario) {
            const scenarioData = getScenario(overrides.scenario);
            if (scenarioData) {
                data = JSON.parse(JSON.stringify(scenarioData));
            }
        }

        // Apply numeric overrides (these take precedence)
        if (!data.current) data.current = {};
        if (overrides.t_out !== undefined) data.current.temperature_2m = overrides.t_out;
        if (overrides.rh_out !== undefined) data.current.relative_humidity_2m = overrides.rh_out;
        if (overrides.dp_out !== undefined) data.current.dewpoint_2m = overrides.dp_out;

        if (!data.daily) data.daily = {};
        if (overrides.rain_48h !== undefined) {
            data.daily.precipitation_sum = [(overrides.rain_48h / 2), (overrides.rain_48h / 2)];
        }
        if (overrides.snow_24h !== undefined) {
            data.daily.snowfall_sum = [overrides.snow_24h];
        }
        if (overrides.tmin_overnight !== undefined) {
            data.daily.temperature_2m_min = [overrides.tmin_overnight];
        }

        return data;
    }

    /**
     * Get scenario mode badge info
     */
    function getScenarioModeBadge(overrides) {
        if (!overrides || overrides.mode !== 'scenario') return null;

        const parts = [];
        if (overrides.scenario) {
            parts.push(`Scenario: ${overrides.scenario}`);
        }
        if (overrides.debug) {
            parts.push('Debug: ON');
        }

        return {
            text: `Test Mode: ${parts.join(' • ')}`,
            show: true
        };
    }

    /**
     * Create debug output
     */
    function getDebugInfo(candidates, filtered, overrides, dismissed) {
        const info = {
            mode: overrides.mode || 'real',
            scenario: overrides.scenario || null,
            overridesActive: Object.keys(overrides).filter(k => k !== 'mode' && k !== 'debug' && overrides[k]).length > 0,
            candidates: candidates.map(a => ({ id: a.id, type: a.type, title: a.title })),
            filtered: filtered.map(a => ({ id: a.id, type: a.type, title: a.title })),
            dismissed: dismissed
        };
        return info;
    }

    /**
     * Clear overrides from URL
     */
    function clearOverrides() {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    return {
        parseOverrides,
        getScenario,
        applyOverrides,
        getScenarioModeBadge,
        getDebugInfo,
        clearOverrides
    };
})();

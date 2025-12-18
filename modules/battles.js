/**
 * Battles Module
 * Analyzes historical forecast accuracy and determines winners
 */

const Battles = (() => {
    /**
     * Calculate accuracy score for a single prediction
     * Lower score is better (closer to actual)
     */
    function calculateAccuracy(predicted, actual) {
        if (predicted === null || predicted === undefined || actual === null || actual === undefined) {
            return null;
        }
        return Math.abs(predicted - actual);
    }

    /**
     * Compare two models for a single metric
     * Returns 'A', 'B', or 'tie'
     */
    function determineWinner(errorA, errorB, threshold = 0.5) {
        if (errorA === null && errorB === null) return 'tie';
        if (errorA === null) return 'B';
        if (errorB === null) return 'A';
        
        const diff = Math.abs(errorA - errorB);
        if (diff < threshold) return 'tie';
        
        return errorA < errorB ? 'A' : 'B';
    }

    /**
     * Analyze a single day's battle
     * Returns battle result with winner and accuracy metrics
     */
    async function analyzeDayBattle(forecastRecord, actualData) {
        if (!forecastRecord || !actualData) {
            console.warn('Missing forecast or actual data');
            return null;
        }

        const forecasts = forecastRecord.forecasts;
        if (!forecasts || !forecasts.modelA || !forecasts.modelB) {
            console.warn('Invalid forecast structure', forecastRecord);
            return null;
        }

        // Get the first day's forecast (day 0 - the day it was saved)
        const predA = forecasts.modelA.days[0];
        const predB = forecasts.modelB.days[0];
        
        if (!predA || !predB) {
            console.warn(`Missing prediction data for ${forecastRecord.savedDate}`);
            return null;
        }

        // Get actual weather from archive API
        const actual = {
            tempMax: actualData.daily?.temperature_2m_max?.[0],
            tempMin: actualData.daily?.temperature_2m_min?.[0],
            precip: actualData.daily?.precipitation_sum?.[0]
        };

        console.log(`Battle data for ${forecastRecord.savedDate}:`, {
            predicted: { predA, predB },
            actual
        });

        // Calculate errors for each metric
        const errors = {
            modelA: {
                tempMax: calculateAccuracy(predA.tempMax, actual.tempMax),
                tempMin: calculateAccuracy(predA.tempMin, actual.tempMin),
                precip: calculateAccuracy(predA.precip, actual.precip)
            },
            modelB: {
                tempMax: calculateAccuracy(predB.tempMax, actual.tempMax),
                tempMin: calculateAccuracy(predB.tempMin, actual.tempMin),
                precip: calculateAccuracy(predB.precip, actual.precip)
            }
        };

        // Determine winners for each metric
        const winners = {
            tempMax: determineWinner(errors.modelA.tempMax, errors.modelB.tempMax, 0.5),
            tempMin: determineWinner(errors.modelA.tempMin, errors.modelB.tempMin, 0.5),
            precip: determineWinner(errors.modelA.precip, errors.modelB.precip, 5) // 5% threshold
        };

        // Calculate overall winner (best 2 out of 3)
        const wins = { A: 0, B: 0, tie: 0 };
        Object.values(winners).forEach(w => wins[w]++);
        
        let overallWinner = 'tie';
        if (wins.A > wins.B) overallWinner = 'A';
        else if (wins.B > wins.A) overallWinner = 'B';

        return {
            date: forecastRecord.savedDate,
            modelA: forecasts.modelA.name,
            modelB: forecasts.modelB.name,
            predicted: {
                modelA: predA,
                modelB: predB
            },
            actual,
            errors,
            winners,
            overallWinner,
            location: {
                lat: forecastRecord.lat,
                lon: forecastRecord.lon
            }
        };
    }

    /**
     * Analyze all historical battles
     * Returns array of battle results sorted by date
     */
    async function analyzeAllBattles() {
        const history = Storage.getHistoricalForecasts();
        if (!history || history.length === 0) {
            console.warn('No historical forecasts found');
            return [];
        }

        const today = new Date().toISOString().split('T')[0];
        const battles = [];

        console.log(`Analyzing battles. Today: ${today}, Total forecasts: ${history.length}`);

        // Process each historical forecast
        for (const forecast of history) {
            const forecastDate = forecast.savedDate;
            
            // Only analyze dates in the past (not today or future)
            if (forecastDate >= today) {
                console.log(`Skipping future/today forecast: ${forecastDate}`);
                continue;
            }

            console.log(`Analyzing battle for ${forecastDate}...`);

            try {
                // Fetch actual weather for that date
                const actualData = await API.fetchActualWeather(
                    forecast.lat,
                    forecast.lon,
                    forecastDate
                );

                if (actualData) {
                    const battle = await analyzeDayBattle(forecast, actualData);
                    if (battle) {
                        console.log(`Battle result for ${forecastDate}: Winner = ${battle.overallWinner}`);
                        battles.push(battle);
                    } else {
                        console.warn(`Failed to analyze battle for ${forecastDate}: Battle data is null`);
                    }
                } else {
                    console.warn(`No actual weather data for ${forecastDate}`);
                }
            } catch (error) {
                console.warn(`Failed to analyze battle for ${forecastDate}:`, error);
            }
        }

        console.log(`Battle analysis complete. Found ${battles.length} battles.`);
        return battles;
    }

    /**
     * Calculate accuracy trends over time
     * Returns summary statistics
     */
    function calculateTrends(battles) {
        if (!battles || battles.length === 0) return null;

        const stats = {
            totalBattles: battles.length,
            winsA: 0,
            winsB: 0,
            ties: 0,
            avgErrorA: { tempMax: 0, tempMin: 0, precip: 0 },
            avgErrorB: { tempMax: 0, tempMin: 0, precip: 0 },
            battles: battles
        };

        let countTempMax = 0, countTempMin = 0, countPrecip = 0;

        battles.forEach(battle => {
            // Count wins
            if (battle.overallWinner === 'A') stats.winsA++;
            else if (battle.overallWinner === 'B') stats.winsB++;
            else stats.ties++;

            // Sum errors for averaging
            if (battle.errors.modelA.tempMax !== null) {
                stats.avgErrorA.tempMax += battle.errors.modelA.tempMax;
                stats.avgErrorB.tempMax += battle.errors.modelB.tempMax;
                countTempMax++;
            }
            if (battle.errors.modelA.tempMin !== null) {
                stats.avgErrorA.tempMin += battle.errors.modelA.tempMin;
                stats.avgErrorB.tempMin += battle.errors.modelB.tempMin;
                countTempMin++;
            }
            if (battle.errors.modelA.precip !== null) {
                stats.avgErrorA.precip += battle.errors.modelA.precip;
                stats.avgErrorB.precip += battle.errors.modelB.precip;
                countPrecip++;
            }
        });

        // Calculate averages
        if (countTempMax > 0) {
            stats.avgErrorA.tempMax /= countTempMax;
            stats.avgErrorB.tempMax /= countTempMax;
        }
        if (countTempMin > 0) {
            stats.avgErrorA.tempMin /= countTempMin;
            stats.avgErrorB.tempMin /= countTempMin;
        }
        if (countPrecip > 0) {
            stats.avgErrorA.precip /= countPrecip;
            stats.avgErrorB.precip /= countPrecip;
        }

        return stats;
    }

    return {
        analyzeDayBattle,
        analyzeAllBattles,
        calculateTrends,
        determineWinner
    };
})();

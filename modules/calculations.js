/**
 * Calculations Module
 * Handles data processing, formatting, and business logic
 */

const Calculations = (() => {
    return {
        // Format temperature value
        formatTemp(value) {
            return value !== null ? Math.round(value) + '°' : '--';
        },

        // Format precipitation probability
        formatRain(value) {
            return value !== null ? value + '% Risk' : 'N/A';
        },

        // Determine rain pill CSS class
        getRainPillClass(probability) {
            if (probability === null) return 'rain-none';
            if (probability >= 80) return 'rain-high';
            if (probability >= 60) return 'rain-med';
            if (probability >= 30) return 'rain-low';
            return 'rain-none';
        },

        // Format table cell with probability and temperature
        formatTableCell(probability, temperature) {
            const pillClass = this.getRainPillClass(probability);
            let probTxt = '<span class="rain-pill rain-none">-</span>';

            if (probability !== null) {
                probTxt = `<span class="rain-pill ${pillClass}">${probability}%</span>`;
            }

            const tempTxt = `<span class="temp-val">${temperature !== null ? Math.round(temperature) + '°' : '--'}</span>`;
            return `${probTxt} ${tempTxt}`;
        },

        // Calculate warming stripe color based on temperature delta
        getStripeColor(delta) {
            if (delta < -1.5) return '#08306b';
            if (delta < -0.5) return '#4292c6';
            if (delta < 0.0) return '#c6dbef';
            if (delta < 0.5) return '#fee0d2';
            if (delta < 1.5) return '#ef3b2c';
            return '#67000d';
        },

        // Calculate accuracy score (lower error = better)
        calculateAccuracy(actuallyRained, forecastedProbability) {
            const target = actuallyRained ? 100 : 0;
            return Math.abs(target - forecastedProbability);
        },

        // Determine winner between two probability forecasts
        determineWinner(errorA, errorB) {
            if (errorA < errorB) return 'A';
            if (errorB < errorA) return 'B';
            return null; // Draw
        },

        // Parse day name for forecast table
        getDayName(dateString, isToday) {
            if (isToday) return 'Today';
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        },

        // Detect if location is in Canada
        isCanadianLocation(lat, lon) {
            return lat > 41 && lat < 83 && lon > -141 && lon < -52;
        },

        // Safely retrieve nested API data
        getSafeData(dailyData, modelName, parameterName, index) {
            const key = `${parameterName}_${modelName}`;
            const value = dailyData[key]?.[index];
            return value !== undefined && value !== null ? value : null;
        },

        // Calculate annual means from daily data
        calculateAnnualMeans(times, temperatures) {
            const yearlyData = {};

            times.forEach((date, index) => {
                const year = date.split('-')[0];
                const temp = temperatures[index];

                if (temp !== null) {
                    if (!yearlyData[year]) {
                        yearlyData[year] = { sum: 0, count: 0 };
                    }
                    yearlyData[year].sum += temp;
                    yearlyData[year].count++;
                }
            });

            const annualMeans = [];
            Object.keys(yearlyData)
                .sort()
                .forEach(year => {
                    annualMeans.push({
                        year,
                        mean: yearlyData[year].sum / yearlyData[year].count
                    });
                });

            return annualMeans;
        },

        // Calculate baseline from reference period
        calculateBaseline(annualMeans, startYear = 1971, endYear = 2000) {
            const referencePeriod = annualMeans.filter(
                item => parseInt(item.year) >= startYear && parseInt(item.year) <= endYear
            );

            if (referencePeriod.length === 0) return null;

            const sum = referencePeriod.reduce((acc, item) => acc + item.mean, 0);
            return sum / referencePeriod.length;
        },

        // Convert temperature delta to tooltip text
        getStripeTooltip(year, delta) {
            return `${year}: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}°C`;
        },

        // Calculate model disagreement (returns absolute difference)
        calculateDisagreement(valueA, valueB) {
            if (valueA === null || valueB === null) return null;
            return Math.abs(valueA - valueB);
        },

        // Classify uncertainty level based on model disagreement
        getUncertaintyLevel(tempDiff, rainDiff) {
            // High uncertainty: >5°C difference OR >30% rain probability difference
            if (tempDiff !== null && tempDiff > 5) return 'high';
            if (rainDiff !== null && rainDiff > 30) return 'high';
            
            // Medium uncertainty: 2-5°C difference OR 15-30% rain difference
            if (tempDiff !== null && tempDiff > 2) return 'medium';
            if (rainDiff !== null && rainDiff > 15) return 'medium';
            
            // Low uncertainty: models agree closely
            return 'low';
        },

        // Get uncertainty indicator emoji/icon
        getUncertaintyIcon(level) {
            if (level === 'high') return '⚠️';
            if (level === 'medium') return '⚡';
            return ''; // No icon for low uncertainty (consensus)
        },

        // Generate tooltip explaining what a probability means
        getProbabilityTooltip(probability) {
            if (probability === null) return 'No data available';
            if (probability >= 80) return `${probability}% risk means rain is very likely. Out of 10 similar forecasts, rain occurs 8+ times. Plan for rain.`;
            if (probability >= 60) return `${probability}% risk means rain is more likely than not. Out of 10 similar forecasts, rain occurs 6-7 times. Have backup plans.`;
            if (probability >= 40) return `${probability}% risk means rain is possible but uncertain. Out of 10 similar forecasts, rain occurs 4-5 times. Watch for updates.`;
            if (probability >= 20) return `${probability}% risk means rain is unlikely but not impossible. Out of 10 similar forecasts, rain occurs 2-3 times. Probably stay dry.`;
            return `${probability}% risk means rain is very unlikely. Out of 10 similar forecasts, rain occurs 0-1 times. Expect dry conditions.`;
        },

        // Generate explanation for model disagreement
        getDisagreementTooltip(tempDiff, rainDiff) {
            const parts = [];
            
            if (tempDiff !== null && tempDiff > 5) {
                parts.push(`Temperature disagreement: ${tempDiff.toFixed(1)}°C. This is HIGH uncertainty—plan for a wide range.`);
            } else if (tempDiff !== null && tempDiff > 2) {
                parts.push(`Temperature disagreement: ${tempDiff.toFixed(1)}°C. Moderate uncertainty—models differ on conditions.`);
            }
            
            if (rainDiff !== null && rainDiff > 30) {
                parts.push(`Rain disagreement: ${rainDiff}%. HIGH uncertainty—one model sees rain, another doesn't.`);
            } else if (rainDiff !== null && rainDiff > 15) {
                parts.push(`Rain disagreement: ${rainDiff}%. Moderate uncertainty about precipitation.`);
            }
            
            if (parts.length === 0) {
                return 'Models agree closely—high confidence forecast.';
            }
            
            return parts.join(' ');
        }
    };
})();

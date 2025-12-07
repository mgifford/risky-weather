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
        }
    };
})();

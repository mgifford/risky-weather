/**
 * Climate Data Module
 * Central source of truth for climate calculations.
 * Based on logic from live-counter/live-counter.py and data.js
 */

const ClimateData = (() => {
    // Constants from Python script / IPCC AR6 / MCC
    const REFERENCE_DATE = new Date('2025-01-01T00:00:00Z');
    const REMAINING_BUDGET_GT = 130; // GtCO2 as of Jan 1, 2025
    const ANNUAL_EMISSIONS_GT = 42.2; // GtCO2 per year
    const GT_TO_TONNES = 1_000_000_000;
    const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;

    const EMISSION_RATE_TONNES_PER_SEC = (ANNUAL_EMISSIONS_GT * GT_TO_TONNES) / SECONDS_PER_YEAR;

    // Warming Data (from live-counter/data.js generated 2025-12-14)
    const DATA_GEN_DATE = new Date('2025-12-14T22:40:21Z');
    const BASE_TEMP = 1.3411;
    const TEMP_RATE = 0.00000000634;

    /**
     * Get current global warming level in °C
     */
    function getCurrentWarming() {
        const now = new Date();
        const elapsed = (now - DATA_GEN_DATE) / 1000;
        return BASE_TEMP + (TEMP_RATE * elapsed);
    }

    /**
     * Get current carbon budget status
     */
    function getCarbonBudget() {
        const now = new Date();
        const elapsedSinceRef = (now - REFERENCE_DATE) / 1000;
        const budgetDepleted = EMISSION_RATE_TONNES_PER_SEC * elapsedSinceRef;
        const totalBudgetTonnes = REMAINING_BUDGET_GT * GT_TO_TONNES;
        const currentBudget = totalBudgetTonnes - budgetDepleted;
        
        // Time = Budget / Rate
        const timeRemainingSeconds = currentBudget / EMISSION_RATE_TONNES_PER_SEC;
        
        return {
            currentBudgetTonnes: currentBudget,
            timeRemainingSeconds: timeRemainingSeconds
        };
    }

    /**
     * Get total emissions since Jan 1, 2025
     */
    function getEmissionsSince2025() {
        const now = new Date();
        const elapsed = (now - REFERENCE_DATE) / 1000;
        return Math.max(0, elapsed * EMISSION_RATE_TONNES_PER_SEC);
    }

    return {
        getCurrentWarming,
        getCarbonBudget,
        getEmissionsSince2025
    };
})();

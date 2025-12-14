// data.js - Generated on 2025-12-14 22:40:21 UTC

const CONFIG_DATA = {
    // --- Daily Randomization Seed ---
    // YYYYMMDD string ensures the daily random counter selection is consistent for all users.
    DAILY_SEED: '20251214',

    // --- Carbon Budget (Time Remaining) Counter Data ---
    // Depletion Rate (Tonnes/sec) calculated from 42.2 GtCO2/year
    BUDGET_RATE_PER_SEC: 1337.237,
    // Total seconds remaining until 1.5°C threshold is hit (as of generation time)
    REMAINING_SECONDS: 67152934,
    // Note: The counter will be TIME (Years, Days, Hrs, etc.)

    // --- Global Warming Counter Data ---
    // Latest calculated human-induced warming level (in °C)
    // This value is CURRENT_TEMP + (TEMP_RATE_PER_SEC * time_elapsed)
    CURRENT_TEMP: 1.3411,
    // Rate of temperature increase (in °C per second)
    TEMP_RATE_PER_SEC: 0.00000000634, 
    // Note: The counter will be the rising temperature (°C)
};
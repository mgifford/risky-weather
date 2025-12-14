import datetime
import time

# --- INPUT DATA (Adjust these values based on the latest scientific updates) ---

# 1. REMAINING CARBON BUDGET
# Based on the IPCC AR6 (400 GtCO2 from Jan 1, 2020, for 67% chance),
# adjusted for emissions since that date (approx. 42.2 GtCO2/year).
# The current central estimate from groups tracking this is ~130 GtCO2 as of Jan 1, 2025.
# We will use the *current* real-time budget from a source like MCC for maximum accuracy.
REMAINING_BUDGET_GIGA_TONNES = 130  # GtCO2 remaining as of Jan 1, 2025

# 2. ANNUAL EMISSION RATE
# Current average global CO2 emissions rate (Fossil + Land Use Change)
ANNUAL_EMISSION_RATE_GIGA_TONNES = 42.2  # GtCO2 per year

# 3. REFERENCE START DATE
# The date the 'REMAINING_BUDGET_GIGA_TONNES' was defined
REFERENCE_DATE = datetime.datetime(2025, 1, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)
CURRENT_TIME = datetime.datetime.now(datetime.timezone.utc)

# --- CALCULATIONS ---

# Time elapsed since the reference date
time_elapsed = CURRENT_TIME - REFERENCE_DATE
time_elapsed_seconds = time_elapsed.total_seconds()

# Convert Giga-tonnes to Tonnes (1 Gt = 1 Billion tonnes = 1e9 tonnes)
TONNES_PER_GIGA_TONNE = 1_000_000_000  # 1e9

# Calculate the rate of budget depletion per second
seconds_per_year = 365.25 * 24 * 60 * 60  # Account for leap years
rate_tonnes_per_sec = (ANNUAL_EMISSION_RATE_GIGA_TONNES * TONNES_PER_GIGA_TONNE) / seconds_per_year

# Calculate total budget depletion since the reference date
budget_depleted_since_ref = rate_tonnes_per_sec * time_elapsed_seconds

# Calculate the current remaining budget in Tonnes
current_budget_tonnes = (REMAINING_BUDGET_GIGA_TONNES * TONNES_PER_GIGA_TONNE) - budget_depleted_since_ref

# Calculate the time remaining in seconds: Time = Budget / Rate
time_remaining_seconds = current_budget_tonnes / rate_tonnes_per_sec
deadline_timestamp = CURRENT_TIME.timestamp() + time_remaining_seconds


# --- OUTPUT AND FORMATTING ---
print("--- Climate Clock Data Model Output ---")
print(f"Current Date: {CURRENT_TIME.strftime('%Y-%m-%d %H:%M:%S UTC')}")
print(f"Reference Budget (GtCO2): {REMAINING_BUDGET_GIGA_TONNES} as of {REFERENCE_DATE.strftime('%Y-%m-%d')}")
print(f"Annual Emission Rate (GtCO2/yr): {ANNUAL_EMISSION_RATE_GIGA_TONNES}\n")

print(f"1. Total Remaining Budget (Tonnes): {current_budget_tonnes:,.0f} tonnes")
print(f"2. Depletion Rate (Tonnes/sec): {rate_tonnes_per_sec:,.3f} tonnes/sec")
print(f"3. Time Remaining (Total Seconds): {time_remaining_seconds:,.0f} seconds")

# --- Export for JS Widget ---
print("\n--- JavaScript Widget Export Variables ---")
print(f"const REMAINING_SECONDS = {time_remaining_seconds:.0f};")
print(f"const BUDGET_RATE_PER_SEC = {rate_tonnes_per_sec:.3f};")

# Optional: Print the estimated deadline
deadline_date = datetime.datetime.fromtimestamp(deadline_timestamp, tz=datetime.timezone.utc)
print(f"\nEstimated Deadline: {deadline_date.strftime('%Y-%m-%d %H:%M:%S UTC')}")
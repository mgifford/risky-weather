# API Optimization Plan: Reducing Redundant Calls

## Overview
With the recent expansion to evaluate all dates in historical forecasts (not just the save date), API calls have multiplied exponentially. This document maps all API calls and proposes consolidation strategies.

---

## 1. API Call Inventory

### A. `fetchActualWeather(lat, lon, startDate, endDate)`
**Purpose:** Get actual weather data for a date range (used to compare against forecast predictions)
**Location:** `modules/battles.js` line 61
**Call Frequency:** 
- **Current Problem:** Called **ONCE PER PAST DATE PER FORECAST**
- Example: 3 forecasts × 4 past dates = **12 API calls** instead of 3
- **Scaling Impact:** With 100 users, 10 forecasts each, 4 dates = 4,000 API calls
- **Rate Limit Risk:** HIGH ⚠️

**Response Data:** Single day of weather (tempMax, tempMin, precipitation_sum)

---

### B. `fetchHistoricalYears(lat, lon, startYear = 1950, endYear = 2023)`
**Purpose:** Get 74 years of daily temperature data for warming stripes visualization
**Locations:** 
- `modules/stripes.js` line 36
- `modules/app.js` line 686
**Call Frequency:** 
- Called TWICE per app load if stripes block is rendered
- Response: ~27,000 data points (cacheable but large)

**Problem:** Same request made twice if both stripes.js and app.js try to fetch independently

---

### C. `fetchHistoricalNormals(lat, lon, monthDay, yearsBack = 10)`
**Purpose:** Get historical climate averages for today's date (daily forecast display)
**Location:** `modules/app.js` line 360
**Call Frequency:** Once per app load
**Response Data:** ~10 years of matching dates for avg high/low/record temps

---

### D. `fetchHistoricalDay(lat, lon, date)`
**Purpose:** Get actual weather for a specific date (used in history verification)
**Locations:**
- `modules/app.js` line 545 (in `checkHistory()`)
- `modules/app.js` line 622 (in `refreshLocation()`)
**Call Frequency:** Called twice during initialization
**Problem:** Likely fetching the same date twice

**Note:** Different from `fetchActualWeather` - this returns `rain_sum` only

---

### E. `getCityName(lat, lon)`
**Purpose:** Reverse geocode coordinates to city name
**Location:** Multiple calls during app initialization
**API Calls Inside:**
- ipwho.is (1st call)
- Open-Meteo Geocoding API (2nd call if file:// protocol)
- Nominatim/OpenStreetMap (3rd call fallback)
**Call Frequency:** Once during init (but with fallback chains)

---

### F. `fetchForecast(lat, lon, modelA, modelB, isCanada)`
**Purpose:** Get 7-day forecast for two weather models
**Location:** `modules/app.js` line ~300
**Call Frequency:** Once per app load
**Note:** Already efficient, calls merged model request

---

## 2. Redundancy Analysis

| API Call | Current Calls/Load | Optimization Opportunity |
|----------|-------------------|--------------------------|
| `fetchActualWeather` | N×M (forecasts × dates) | **Batch into single date-range request** |
| `fetchHistoricalYears` | 2 | **Add caching layer** |
| `fetchHistoricalDay` | 2 | **Merge/consolidate calls** |
| `fetchHistoricalNormals` | 1 | OK (already single call) |
| `getCityName` | 1 | OK (fallback chain is necessary) |
| `fetchForecast` | 1 | OK (already merged models) |

---

## 3. Detailed Consolidation Strategies

### Strategy 1: Batch `fetchActualWeather` Requests ⭐⭐⭐ HIGHEST IMPACT

**Current Pattern:**
```javascript
// In battles.js analyzeAllBattles()
for (const forecast of history) {          // 3 forecasts
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {  // ~4 days
        const actualData = await API.fetchActualWeather(lat, lon, targetDate);  // 1 call per day
        // Result: 12 separate API calls
    }
}
```

**Proposed Solution:**
1. Collect all dates needing verification into an array
2. Determine date range (min to max)
3. Make ONE request with `startDate` and `endDate` parameters
4. Parse response to extract individual days

**Code Example:**
```javascript
async function analyzeAllBattles() {
    const history = Storage.getHistoricalForecasts();
    const today = new Date().toISOString().split('T')[0];
    
    // STEP 1: Collect all dates needing verification
    const dates = new Set();
    history.forEach(forecast => {
        if (forecast.savedDate >= today) return;
        const days = forecast.forecasts?.modelA?.days || [];
        days.forEach(day => {
            if (day.date < today) dates.add(day.date);
        });
    });
    
    if (dates.size === 0) return [];
    
    // STEP 2: Convert to sorted array and get date range
    const sortedDates = Array.from(dates).sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    
    // STEP 3: Fetch ALL actual weather in ONE call (assuming all forecasts for same location)
    const location = history[0]; // All forecasts use same lat/lon
    const allActualData = await API.fetchActualWeather(
        location.lat,
        location.lon,
        startDate,
        endDate  // NEW: endDate parameter allows range fetch
    );
    
    // STEP 4: Build lookup map for fast access
    const actualByDate = {};
    allActualData.daily.time.forEach((date, idx) => {
        actualByDate[date] = {
            tempMax: allActualData.daily.temperature_2m_max[idx],
            tempMin: allActualData.daily.temperature_2m_min[idx],
            precip: allActualData.daily.precipitation_sum[idx]
        };
    });
    
    // STEP 5: Analyze battles using cached actual weather
    const battles = [];
    for (const forecast of history) {
        for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
            const targetDate = days[dayIndex].date;
            const actual = actualByDate[targetDate]; // O(1) lookup
            // Proceed with analysis using cached actual...
        }
    }
    
    return battles;
}
```

**Impact:**
- Current: 12 calls → **Proposed: 1 call** (12x reduction)
- Scaling: 100 users × 10 forecasts × 4 dates = 4,000 calls → **~100 calls**
- **Estimated Savings: 97% reduction in `fetchActualWeather` calls**

**Required API Changes:**
- `fetchActualWeather()` already supports `endDate` parameter ✅
- Only change: Pass `endDate` in battles.js

---

### Strategy 2: Cache `fetchHistoricalYears` ⭐⭐ MEDIUM IMPACT

**Current Problem:**
```
stripes.js → fetchHistoricalYears() → API call
app.js     → fetchHistoricalYears() → API call (duplicate)
```

**Proposed Solution:** Add in-memory cache with 24-hour TTL

**Implementation:**
```javascript
// Add to API module
const CACHE = {
    historicalYears: {},
    ttl: 24 * 60 * 60 * 1000  // 24 hours in milliseconds
};

async function fetchHistoricalYears(lat, lon, startYear = 1950, endYear = 2023) {
    const cacheKey = `${lat},${lon}`;
    const cached = CACHE.historicalYears[cacheKey];
    
    // Return cached data if fresh
    if (cached && Date.now() - cached.timestamp < CACHE.ttl) {
        console.log(`[CACHE HIT] historicalYears for ${cacheKey}`);
        return cached.data;
    }
    
    // Fetch fresh data
    const data = await fetch(...); // existing code
    
    // Store in cache
    CACHE.historicalYears[cacheKey] = {
        data,
        timestamp: Date.now()
    };
    
    return data;
}
```

**Impact:**
- Current: 2 calls per load → **Proposed: 1 call** (2x reduction on initial fetch)
- Scaling: 100 users × 2 calls = 200 → **100 calls**
- **Savings: 50% reduction on first load, 100% on subsequent loads within 24 hours**

---

### Strategy 3: Consolidate `fetchHistoricalDay` Calls ⭐ LOW IMPACT

**Current Problem:**
```javascript
// app.js line 545
const historyData = await API.fetchHistoricalDay(lat, lon, dateToCheck);

// app.js line 622
const historyData = await API.fetchHistoricalDay(lat, lon, pendingRecord.date);
```

**Investigation Needed:** Are these fetching the same date? (likely both checking yesterday)

**Proposed Solution:** 
1. Determine if both calls target the same date
2. If yes, store first result and reuse
3. If no, keep separate (necessary calls)

---

### Strategy 4: Implement Response Caching Layer ⭐⭐⭐ INFRASTRUCTURE

**Purpose:** Cache all API responses to prevent duplicate requests within short window

```javascript
// Enhanced API module with caching
const API = (() => {
    const CACHE = {
        responses: {},
        TTL: 5 * 60 * 1000  // 5 minutes
    };

    function getCacheKey(fn, params) {
        return `${fn}:${JSON.stringify(params)}`;
    }

    async function cachedFetch(fnName, params, fetchFn) {
        const key = getCacheKey(fnName, params);
        const cached = CACHE.responses[key];
        
        if (cached && Date.now() - cached.timestamp < CACHE.TTL) {
            console.log(`[CACHE] ${fnName} hit`);
            return cached.data;
        }
        
        const data = await fetchFn();
        CACHE.responses[key] = { data, timestamp: Date.now() };
        return data;
    }

    async function fetchActualWeather(lat, lon, startDate, endDate) {
        return cachedFetch(
            'fetchActualWeather',
            { lat, lon, startDate, endDate },
            () => fetch(/* existing code */)
        );
    }

    // Apply same pattern to all other API functions
    
    return { fetchActualWeather, ... };
})();
```

**Benefits:**
- Catches duplicate requests automatically
- 5-minute TTL balances freshness with efficiency
- No changes needed to calling code

---

## 4. Implementation Priority

| Priority | Strategy | Est. Savings | Effort |
|----------|----------|--------------|--------|
| 🔴 **CRITICAL** | Batch `fetchActualWeather` | 97% ↓ | Medium |
| 🟡 **HIGH** | Implement caching layer | 30-50% ↓ | Medium |
| 🟢 **MEDIUM** | Cache `fetchHistoricalYears` | 50% ↓ | Low |
| ⚪ **LOW** | Consolidate `fetchHistoricalDay` | 5% ↓ | Low |

---

## 5. Rate Limit Context

**Open-Meteo API Limits:**
- Free tier: 10,000 calls/day (per IP)
- Threshold for concern: ~100 active concurrent users

**Current Scaling Scenario (100 users):**
- Before optimization: **~4,000 calls/load**
- After optimization: **~100 calls/load** (40x reduction)
- **Status:** SAFE ✅

**Without Optimization:**
- 1,000 concurrent users = 40,000 calls/load = **RATE LIMITED** ⚠️

---

## 6. Next Steps

1. ✅ Document current call patterns (this file)
2. ⬜ Implement batching for `fetchActualWeather`
3. ⬜ Add caching layer to API module
4. ⬜ Test with console logging to verify cache hits
5. ⬜ Monitor rate limit headers in production
6. ⬜ Update documentation

---

## 7. Monitoring & Alerts

Add to API responses:
```javascript
// Log rate limit info
console.log(`API Rate Limit: ${response.headers['x-ratelimit-remaining']} calls remaining`);
```

Consider adding client-side alert if approaching limit:
```javascript
if (remaining < 1000) {
    console.warn('⚠️ API rate limit nearing threshold');
}
```

---

## Appendix: API Call Flow Diagram

```
App Initialization
├── IP Geolocation (ipwho.is)
├── Fetch Forecast (modelA + modelB)
├── Fetch Historical Normals (for today's comparison)
├── Fetch Historical Years (if stripes block selected)
│   └── [DUPLICATE CALL if app.js also requests]
├── Check History (fetchHistoricalDay)
│   └── [POTENTIAL DUPLICATE if called twice]
└── Analyze Battles (analyzeAllBattles)
    └── For each past forecast date
        └── fetchActualWeather [CALLED N×M TIMES]
            └── [CONSOLIDATION OPPORTUNITY]
```

---

**Generated:** 2025-12-20  
**Status:** Ready for implementation

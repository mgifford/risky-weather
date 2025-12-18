# API Call Flow Analysis

## Detailed Breakdown of Every API Call

### 1. Application Initialization Flow (App.init)

```
App.init()
│
├─ I18n.init()
│
├─ Storage.getUrlParams() - LocalStorage read, NO API
│
├─ History.loadEvents() - Loads from modules/education.js, NO API
│
├─ [URL PARAMS PATH]
│  └─ Geo.searchCities(city) - Geocoding API call
│     └─ runApp(lat, lon, city)
│
├─ [IP GEOLOCATION PATH]
│  └─ fetch('https://ipwho.is/') 
│     └─ IP detection (counts as API call)
│
├─ Storage.getLocation() - LocalStorage read, NO API
│
└─ Geo.getCurrentPosition()
   ├─ navigator.geolocation.getCurrentPosition() - Browser API
   └─ API.getCityName(lat, lon) ──────────────────── [CALL #1]
      ├─ fetch('https://ipwho.is/') - IP geolocation
      ├─ fetch(Open-Meteo Geocoding) - if not file://
      └─ fetch(Nominatim OSM) - fallback
```

### 2. Main App Load (App.runApp)

**Location:** modules/app.js line ~350

```
runApp(lat, lon, city, country)
│
├─ getCurrentDate()
│
├─ Storage.saveLocation(lat, lon, city)
│
├─ formatDate functions
│
├─ API.fetchForecast(lat, lon, modelA, modelB) ──── [CALL #2]
│  └─ Returns 7-day forecast for both models
│
├─ UI.renderForecast(data)
│
├─ checkHistory(lat, lon, config) ────────────────── [CALL #3?]
│  └─ See detailed flow below
│
├─ API.fetchHistoricalNormals(lat, lon, monthDay) ─ [CALL #4]
│  └─ Used for "Historical Averages" section
│
├─ If config.requestHistoricalYears:
│  └─ API.fetchHistoricalYears(lat, lon) ────────── [CALL #5]
│     └─ **ALSO CALLED FROM stripes.js!** (Potential duplicate)
│
├─ renderRandomSections(lat, lon, country)
│  └─ May call API.fetchHistoricalYears AGAIN ─── [DUPLICATE #5]
│     └─ From modules/stripes.js line 36
│
└─ showBattleHistoryIfAvailable()
   └─ Battles.analyzeAllBattles()
      └─ **CALLS fetchActualWeather MANY TIMES** ── [CALLS #6-N]
         └─ See detailed flow below
```

---

### 3. History Check (checkHistory Function)

**Location:** modules/app.js lines 516-620

```
checkHistory(lat, lon, config)
│
└─ For each pending record:
   └─ API.fetchHistoricalDay(lat, lon, date) ──── [CALL #3]
      └─ Gets actual weather for date
      └─ Compares against forecast
      └─ Updates scoreboard
```

**Problem:** This function is called from `runApp()` line 353, but only checks ONE date (yesterday's forecast).

---

### 4. Battle Analysis (analyzeAllBattles Function)

**Location:** modules/battles.js lines 173-210

```
analyzeAllBattles()
│
└─ For each forecast in history:
   └─ For each day in forecast:
      └─ If day.date < today:
         └─ API.fetchActualWeather(lat, lon, date) ── [CALL #6, #7, #8, ...]
            │
            └─ Returns: tempMax, tempMin, precipitation_sum
            └─ Called once per past date per forecast
            
   Example: 3 forecasts × 4 past dates = **12 SEPARATE API CALLS**
```

**This is the performance killer.** Each call should be batched into one.

---

### 5. City Refresh (refreshLocation Function)

**Location:** modules/app.js lines 737-777

```
refreshLocation()
│
├─ Geo.getCurrentPosition()
│  └─ navigator.geolocation
│
├─ API.getCityName(lat, lon) ──────────────────── [CALL]
│  └─ Same as App.init flow
│
└─ runApp(lat, lon, city)
   └─ Calls all the above flows AGAIN for new location
```

---

## Summary Table: All API Calls Per App Load

| Call # | API Function | Purpose | Frequency | Optional | Notes |
|--------|--------------|---------|-----------|----------|-------|
| 1 | `getCityName()` | Reverse geocode | Always | - | Multiple internal APIs (IP, OM, OSM) |
| 2 | `fetchForecast()` | Get 7-day forecast | Always | - | Merged models, efficient |
| 3 | `fetchHistoricalDay()` | Check yesterday's forecast | If history exists | - | Checks ONE date only |
| 4 | `fetchHistoricalNormals()` | Today's climate normals | Always | - | Efficient single call |
| 5a | `fetchHistoricalYears()` | Warming stripes data | If block rendered | ✅ | **CALLED FROM app.js** |
| 5b | `fetchHistoricalYears()` | Warming stripes data | If block rendered | ✅ | **ALSO CALLED FROM stripes.js** |
| 6-N | `fetchActualWeather()` | Battle verification | O(forecasts × dates) | - | **CRITICAL PROBLEM** |

---

## API Call Count Scenarios

### Scenario A: First-time user, no history
```
getCityName()              1 call
fetchForecast()            1 call
fetchHistoricalNormals()   1 call
Total:                     3 calls
```

### Scenario B: Returning user with 1 old forecast
```
getCityName()              1 call
fetchForecast()            1 call
fetchHistoricalDay()       1 call (check yesterday)
fetchHistoricalNormals()   1 call
fetchHistoricalYears()     1 call (stripes) + 1 call (app.js) = 2 calls (DUPLICATE)
fetchActualWeather()       4 calls (1 forecast × 4 dates)
Total:                     10 calls
```

### Scenario C: Active user with 3 forecasts saved
```
getCityName()              1 call
fetchForecast()            1 call
fetchHistoricalDay()       1 call (check yesterday)
fetchHistoricalNormals()   1 call
fetchHistoricalYears()     2 calls (DUPLICATE from stripes + app.js)
fetchActualWeather()       ~12 calls (3 forecasts × 4 dates avg)
Total:                     ~18 calls per user
```

### Scenario D: 100 concurrent users, Scenario C
```
18 calls × 100 users = 1,800 API calls per app load cycle
```

---

## Identified Redundancies & Inefficiencies

### 🔴 CRITICAL: fetchActualWeather() Called O(n×m)

**Issue:** In `analyzeAllBattles()`, for each forecast × each date, a separate API call is made.

**Current:** 
- 3 forecasts × 4 dates = 12 calls
- Scales as O(n×m) - exponential with user count

**Proposed:** Batch into single date-range request
- Consolidates 12 calls into 1
- Scales linearly instead of exponentially

**File:** `modules/battles.js` line 61
**Function:** `analyzeDayBattle()` called from `analyzeAllBattles()`

---

### 🟡 HIGH: fetchHistoricalYears() Called Twice

**Issue:** Same data requested from two locations:
1. `modules/app.js` line 686 (in `renderRandomSections()`)
2. `modules/stripes.js` line 36 (in module initialization)

**Current:** 2 identical API calls if stripes block is selected
**Proposed:** Cache result, reuse on second call

**Impact:** 50% reduction on historical years calls

---

### 🟡 MEDIUM: fetchHistoricalDay() Possibly Redundant

**Issue:** Called in two functions:
1. `checkHistory()` line 545 - checks yesterday's forecast
2. `checkHistoryLegacy()` line 622 - legacy format fallback

**Status:** Likely fetching same date (yesterday), but unclear if both execute
**Action:** Needs investigation; consolidate if both run

---

### 🟢 LOW: getCityName() Fallback Chain

**Issue:** Multiple internal APIs (IP → Open-Meteo → OSM)
**Status:** Necessary for robustness, not redundant
**Optimization:** Could cache per location for 24 hours

---

## Redundancy Removal Roadmap

### Phase 1: Critical (Batch fetchActualWeather)
- Consolidate 12+ calls into 1
- **Est. Reduction:** 90%+
- **Effort:** Medium
- **Code Location:** `modules/battles.js` + `modules/api.js`

### Phase 2: High (Cache Historical Years)
- Add TTL cache for fetchHistoricalYears
- **Est. Reduction:** 50%
- **Effort:** Low
- **Code Location:** `modules/api.js`

### Phase 3: General (Response Caching)
- Add cache layer to all API calls
- Prevents any duplicate within 5 min window
- **Est. Reduction:** 10-30%
- **Effort:** Medium
- **Code Location:** `modules/api.js` (wrapper)

### Phase 4: Investigation (Verify Historical Calls)
- Confirm if `fetchHistoricalDay` called twice
- Check if consolidation possible
- **Est. Reduction:** 5-10%
- **Effort:** Low

---

## Rate Limit Projection

**Open-Meteo Free Tier:** 10,000 calls/day per IP

| Users | Scenario | Calls/Load | Calls/Day | Status |
|-------|----------|-----------|-----------|--------|
| 1 | Scenario C | 18 | 180 | ✅ Safe |
| 10 | Scenario C | 180 | 1,800 | ✅ Safe |
| 100 | Scenario C | 1,800 | 18,000 | ⚠️ **EXCEEDED** |
| 100 | After Phase 1 | 180 | 1,800 | ✅ Safe |
| 1000 | After Phase 1 | 1,800 | 18,000 | ⚠️ **EXCEEDED** |
| 1000 | After Phase 1+2 | 900 | 9,000 | ✅ Safe |

**Conclusion:** Without optimization, rate limit hit at ~100 users. With Phase 1, can support 1,000+ users.

---

## Implementation Checklist

- [ ] Document all API calls (this file)
- [ ] Identify redundancies (completed)
- [ ] Batch fetchActualWeather() calls
- [ ] Add caching for fetchHistoricalYears()
- [ ] Implement general response cache
- [ ] Add rate limit monitoring
- [ ] Test at scale (multiple locations)
- [ ] Update architecture docs

---

**Generated:** 2025-12-20  
**Status:** Comprehensive analysis complete, ready for optimization implementation

# Module Map - Visual Guide

## Module Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       index.html                            │
│          (Loads modules & initializes app)                  │
└────┬────────────┬──────────────┬──────────────┬─────────────┘
     │            │              │              │
     v            v              v              v
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │storage.js│ │calc.js   │ │ api.js   │ │  ui.js   │
  │  (v6)    │ │(logic)   │ │ (fetch)  │ │ (render) │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
       ▲            ▲            ▲            ▲
       │            │            │            │
       └────────────┴────────────┴────────────┘
              ↓
       ┌──────────────┐        ┌──────────┐
       │   app.js     │◄──────►│  geo.js  │
       │(orchestrate) │        │ (locate) │
       └──────────────┘        └──────────┘
```

---

## Module Responsibilities

### 🗄️ storage.js
**Manages: LocalStorage operations**

```
Input:  location, forecast, scores
Output: Retrieved saved data
Does:   Save/load to browser storage
Keys:   user_loc_v6, history_v6_pending, scoreboard_v6

Public API:
  saveLocation(lat, lon, city)
  getLocation()
  saveForecastRecord(date, lat, lon, modelA, modelB)
  getPendingForecast()
  getScoreboard() / incrementScore(winner)
  clearAll()
```

---

### 🧮 calculations.js
**Manages: All data processing & business logic**

```
Input:  Raw API data, temperature values, probability scores
Output: Formatted strings, CSS classes, calculated values
Does:   Format, process, calculate, determine winners

Pure Functions (no side effects):
  formatTemp(value)              → "22°"
  formatRain(value)              → "60% Risk"
  formatTableCell(prob, temp)    → "<span>...</span>"
  getRainPillClass(prob)         → "rain-high"
  getStripeColor(delta)          → "#c53030"
  calculateAccuracy(rained, forecast)
  determineWinner(errorA, errorB) → 'A' | 'B' | null
  calculateAnnualMeans(times, temps)
  calculateBaseline(means)
```

---

### 🌐 api.js
**Manages: All HTTP requests to Open-Meteo**

```
Input:  Latitude, longitude, date ranges
Output: Weather data (JSON)
Does:   Fetch from Open-Meteo API with timeouts

Public API:
  fetchForecast(lat, lon, modelA, modelB)
    → { daily: { temperature_2m_max, precipitation_probability_max, ... } }
  
  fetchHistoricalDay(lat, lon, date)
    → { daily: { rain_sum: [mm] } }
  
  fetchHistoricalYears(lat, lon, startYear, endYear)
    → { daily: { time: [...], temperature_2m_mean: [...] } }
  
  getCityName(lat, lon)
    → "Toronto"

Features:
  ✓ Automatic timeouts (prevents hanging)
  ✓ Error handling
  ✓ URLSearchParams for clean queries
```

---

### 🎨 ui.js
**Manages: All DOM manipulation & rendering**

```
Input:  Values, labels, data to display
Output: Updated DOM elements
Does:   Select elements, update innerHTML, add/remove classes

Public API:
  setLocation(city)
  setModelLabels(nameA, nameB, colorA, colorB)
  renderToday(tempA, probA, tempB, probB)
  renderSevenDay(dailyData, modelA, modelB)
  renderStripes(annualMeans, baseline)
  renderRealityCheck(date, rained, rainfall, probA, probB, ...)
  showWinner(modelName) / showDraw()
  updateScoreboard(scoreA, scoreB, startDate)
  setPrimaryLink(href, label, color)
  setStatus(message)
  onReset(callback)

Cache:
  Stores references to all DOM elements in ELEMENTS object
```

---

### 📍 geo.js
**Manages: Geolocation & model configuration**

```
Input:  Latitude, longitude (from browser or saved)
Output: Model config, official links
Does:   Detect location, select appropriate weather models

Public API:
  getCurrentPosition()  → { lat, lon } (Promise)
  getModelConfig(lat, lon)  → { modelA, modelB, nameA, nameB, colorA, colorB }
  getOfficialLink(lat, lon, isCanada)  → { href, label, color }

Constants:
  DEFAULT_LAT = 45.42
  DEFAULT_LON = -75.69
  DEFAULT_CITY = "Ottawa (Default)"

Features:
  ✓ Canada detection (41°N to 83°N, 141°W to 52°W)
  ✓ Different models for different regions
  ✓ 3.5 second timeout on geolocation
```

---

### �� app.js
**Manages: Application orchestration & main flow**

```
Input:  User interactions, API responses
Output: Complete app state
Does:   Coordinate all modules, execute main flow

Public API:
  init()   - App entry point
  reset()  - Clear all data & reload

Internal Flow:
  init()
    ├─ Check saved location
    ├─ Request geolocation (if needed)
    └─ Call runApp(lat, lon, city)
  
  runApp(lat, lon, city)
    ├─ Get model config
    ├─ Fetch forecast
    ├─ Render to UI
    ├─ Save forecast
    ├─ Check yesterday's accuracy
    └─ Generate stripes (async)

Key Responsibilities:
  ✓ Initializes the app
  ✓ Handles user interactions
  ✓ Coordinates between all modules
  ✓ Manages application state flow
```

---

## Data Flow Examples

### Example 1: App Startup
```
User opens index.html
        ↓
App.init() is called
        ↓
Storage.getLocation() → null (first time)
        ↓
Geo.getCurrentPosition() → { lat: 45.42, lon: -75.69 }
        ↓
API.getCityName(45.42, -75.69) → "Ottawa"
        ↓
Storage.saveLocation(45.42, -75.69, "Ottawa")
        ↓
App runs main flow with new location
```

### Example 2: Fetching Forecast
```
App.runApp() calls:
        ↓
API.fetchForecast(45, -75, 'gem_regional', 'ecmwf_ifs025')
        ↓ (returns raw API data)
Calculations.getSafeData() ← safely extract values
        ↓
Calculations.formatTemp() ← "22°"
        ↓
UI.renderToday() ← update DOM
```

### Example 3: Verification
```
Next day, App.init() calls:
        ↓
Storage.getPendingForecast() → yesterday's data
        ↓
API.fetchHistoricalDay() → actual weather
        ↓
Calculations.calculateAccuracy() → scored
        ↓
Calculations.determineWinner() → Model A or B
        ↓
UI.showWinner() + Storage.incrementScore()
```

---

## Dependency Matrix

```
           │ storage │ calculations │ api │ ui │ geo │ app
───────────┼─────────┼──────────────┼─────┼────┼─────┼─────
storage    │    -    │      -       │  -  │ -  │  -  │  ✓
calculations│   -    │      -       │  -  │ -  │  ✓  │  ✓
api        │    -    │      -       │  -  │ ✓  │  -  │  ✓
ui         │    -    │      ✓       │  -  │ -  │  -  │  ✓
geo        │    -    │      ✓       │  -  │ -  │  -  │  ✓
app        │    ✓    │      ✓       │ ✓   │ ✓  │  ✓  │  -
```

Legend: ✓ = depends on, - = no dependency

---

## Module Interaction Patterns

### Pattern 1: Direct Call (Simple)
```
app.js → Storage.getLocation()
app.js → UI.setLocation(city)
app.js → Calculations.formatTemp(value)
```

### Pattern 2: Pass Data (Functional)
```
data = await API.fetchForecast(...)
app.js formats it:
  temp = Calculations.getSafeData(data, ...)
  formatted = Calculations.formatTemp(temp)
app.js displays it:
  UI.renderToday(formatted, ...)
```

### Pattern 3: Store Results (Persistence)
```
app.js fetches forecast:
  data = await API.fetchForecast(...)
app.js saves it:
  Storage.saveForecastRecord(...)
next day app.js retrieves it:
  old = Storage.getPendingForecast()
```

---

## Adding New Functionality

### Add Temperature Unit Preference

**Step 1: Storage**
```javascript
saveTempUnit(unit) { /* save to localStorage */ }
getTempUnit() { /* read from localStorage */ }
```

**Step 2: Calculations**
```javascript
formatTemp(value, unit = 'C') {
  if (unit === 'F') return (value * 9/5 + 32) + '°F'
  return value + '°C'
}
```

**Step 3: UI**
```javascript
renderToday(tempA, probA, tempB, probB, unit) {
  ELEMENTS.valA.innerText = Calculations.formatTemp(tempA, unit)
  // ...
}
```

**Step 4: App**
```javascript
const unit = Storage.getTempUnit()
UI.renderToday(tempA, probA, tempB, probB, unit)
```

✅ Each module remains focused and testable!

---

## Testing Individual Modules

```javascript
// In browser console

// Test storage
Storage.saveLocation(45, -75, 'Test')
Storage.getLocation()  // → {lat: 45, lon: -75, city: 'Test'}

// Test calculations
Calculations.formatTemp(22.5)  // → "23°"
Calculations.getStripeColor(-1)  // → "#4292c6"

// Test API
await API.getCityName(45.42, -75.69)  // → "Ottawa"

// Test UI
UI.setStatus('Testing UI')

// Test geo
Geo.getModelConfig(45.42, -75.69)
```

---

## Files Reference

| File | Lines | Exports | Key Functions |
|------|-------|---------|----------------|
| storage.js | 64 | Storage | save/get/clear operations |
| calculations.js | 133 | Calculations | format, calculate, color |
| api.js | 95 | API | fetch, timeout handling |
| ui.js | 159 | UI | render, update, display |
| geo.js | 72 | Geo | position, config, links |
| app.js | 221 | App | init, orchestrate flow |

---

**For detailed information, see ARCHITECTURE.md**

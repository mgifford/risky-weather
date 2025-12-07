# Weather Risk - Modular Architecture

## Overview

The Weather Risk application has been refactored into a modular architecture, separating concerns into independent JavaScript modules that can be developed, tested, and maintained without affecting other parts of the codebase.

## Module Structure

```
weather-risk/
├── index.html                 # Main HTML (simplified, no inline scripts)
├── style.css                  # Global styling
├── modules/
│   ├── storage.js            # LocalStorage operations
│   ├── calculations.js       # Data processing & business logic
│   ├── api.js                # HTTP requests to Open-Meteo
│   ├── ui.js                 # DOM manipulation & rendering
│   ├── geo.js                # Geolocation & model configuration
│   └── app.js                # Application orchestration
└── ARCHITECTURE.md           # This file
```

## Module Details

### 1. **storage.js** - State Management
**Purpose:** Handle all localStorage operations
**Exports:** `Storage` object with methods:
- `saveLocation(lat, lon, city)` - Save user location
- `getLocation()` - Retrieve saved location
- `saveForecastRecord(date, lat, lon, modelA, modelB)` - Store daily forecast
- `getPendingForecast()` - Get yesterday's forecast for verification
- `getScoreboard()` / `incrementScore(winner)` - Model accuracy tracking
- `clearAll()` - Reset all saved data

**Why modular:** Storage logic is decoupled from UI and API. Easy to swap localStorage with IndexedDB or a backend database without changing other modules.

---

### 2. **calculations.js** - Business Logic
**Purpose:** Pure data transformations and formatting
**Exports:** `Calculations` object with methods:
- `formatTemp(value)`, `formatRain(value)` - Format API responses
- `getRainPillClass(probability)` - Determine CSS class for precipitation probability
- `calculateAccuracy(actuallyRained, forecastedProbability)` - Scoring logic
- `determineWinner(errorA, errorB)` - Model comparison
- `getStripeColor(delta)` - Temperature color mapping
- `calculateAnnualMeans(times, temperatures)` - Aggregate daily → yearly
- `calculateBaseline(annualMeans, startYear, endYear)` - 1971-2000 reference period

**Why modular:** Pure functions with no side effects. Easy to unit test. Changes to scoring logic don't affect UI or storage.

---

### 3. **api.js** - Data Fetching
**Purpose:** All HTTP communication with Open-Meteo API
**Exports:** `API` object with methods:
- `fetchForecast(lat, lon, modelA, modelB)` - 7-day forecast
- `fetchHistoricalDay(lat, lon, date)` - Yesterday's actual weather
- `fetchHistoricalYears(lat, lon, startYear, endYear)` - 74-year climate data
- `getCityName(lat, lon)` - Reverse geocoding

**Features:**
- Automatic request timeouts (prevents hanging on slow connections)
- Error handling with descriptive messages
- Uses URLSearchParams for clean query string construction

**Why modular:** Centralized API logic. Easy to add caching, add new endpoints, or switch to a different weather service without touching UI or calculations.

---

### 4. **ui.js** - Presentation Layer
**Purpose:** All DOM manipulation and rendering
**Exports:** `UI` object with methods:
- `setLocation(city)`, `setModelLabels(...)` - Update header
- `renderToday(tempA, probA, tempB, probB)` - Today's forecast display
- `renderSevenDay(dailyData, modelA, modelB)` - 7-day table
- `renderStripes(annualMeans, baseline)` - Warming stripes visualization
- `renderRealityCheck(...)` - Yesterday's result
- `showWinner(modelName)` / `showDraw()` - Score display
- `updateScoreboard(scoreA, scoreB, startDate)` - Leaderboard
- `setPrimaryLink(href, label, backgroundColor)` - Official weather link
- `onReset(callback)` - Register event handlers

**Why modular:** All DOM logic in one place. Easy to refactor styles or change how data is displayed. UI changes don't affect business logic or API calls.

---

### 5. **geo.js** - Location & Configuration
**Purpose:** Geolocation detection and model selection
**Exports:** `Geo` object with methods:
- `getCurrentPosition()` - Get user's GPS coordinates (returns Promise)
- `getModelConfig(lat, lon)` - Select appropriate weather models based on location
- `getOfficialLink(lat, lon, isCanada)` - Generate official weather service link

**Constants:**
- `DEFAULT_LAT`, `DEFAULT_LON`, `DEFAULT_CITY` - Fallback location (Ottawa)

**Why modular:** Location-based logic isolated. Easy to add new regions or change model selection criteria. Geolocation errors handled gracefully.

---

### 6. **app.js** - Application Orchestration
**Purpose:** Main application flow and coordination
**Exports:** `App` object with methods:
- `init()` - Application entry point
- `reset()` - Clear all data and reload

**Internal Functions:**
- `runApp(lat, lon, city)` - Main execution flow
- `renderForecast(data, config)` - Coordinate UI updates
- `saveForecastForHistory(...)` - Prepare tomorrow's verification
- `checkHistory(lat, lon, config)` - Verify yesterday's forecast
- `updateScore(winner, date)` - Record model accuracy
- `loadScoreboard()` - Display current scores
- `generateStripes(lat, lon)` - Load historical data

**Why modular:** Orchestration layer. Uses APIs from other modules to compose the complete application flow. Changes to individual modules don't cascade throughout the app.

---

## Dependency Graph

```
┌─────────────────┐
│  app.js         │ (Entry point, orchestrates everything)
└────────┬────────┘
         │
    ┌────┴──────────────────┬────────────────┬──────────────┐
    │                       │                │              │
    v                       v                v              v
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ api.js      │  │ geo.js       │  │ storage.js   │  │ ui.js        │
│ (fetch)     │  │ (location)   │  │ (persist)    │  │ (render)     │
└─────────────┘  └──────────────┘  └──────────────┘  └────┬─────────┘
                                                           │
                                                           v
                                                  ┌──────────────────┐
                                                  │ calculations.js  │
                                                  │ (format, score)  │
                                                  └──────────────────┘
```

## Load Order (in index.html)

Modules are loaded in dependency order to ensure all dependencies are available:

1. **storage.js** - No dependencies
2. **calculations.js** - No dependencies
3. **api.js** - No dependencies
4. **ui.js** - No dependencies
5. **geo.js** - Depends on `Calculations.isCanadianLocation()`
6. **app.js** - Depends on all other modules
7. **Entry script** - Calls `App.init()` and registers event handlers

## Example: Making Changes

### Scenario 1: Change Scoring Logic
**File to modify:** `modules/calculations.js`
- Update `calculateAccuracy()` or `determineWinner()`
- No changes needed to UI, storage, or API modules
- Test with the scoring logic in isolation

### Scenario 2: Change Temperature Display Format
**File to modify:** `modules/calculations.js` → `formatTemp()`
- Update the format (e.g., "22°C" → "22 °C")
- No changes needed elsewhere
- UI module uses `Calculations.formatTemp()`, will automatically use new format

### Scenario 3: Switch to Different Weather API
**File to modify:** `modules/api.js`
- Replace `fetchForecast()` implementation
- Keep the same function signature and return structure
- Other modules don't need to know the API changed

### Scenario 4: Add Dark Mode
**File to modify:** `modules/ui.js`
- Update rendering logic to add/remove dark mode classes
- No changes to business logic or data fetching
- App module continues to work unchanged

## Testing Strategy

With this modular structure, each module can be tested independently:

```javascript
// Example: Test calculation.js without UI
const testScoring = () => {
    const error = Calculations.calculateAccuracy(true, 60); // Actually rained, forecast 60%
    console.assert(error === 40, 'Should calculate error correctly');
};

// Example: Test storage.js
const testStorage = () => {
    Storage.saveLocation(45.42, -75.69, 'Ottawa');
    const loc = Storage.getLocation();
    console.assert(loc.city === 'Ottawa', 'Should retrieve saved location');
};
```

## Best Practices

1. **Keep modules focused** - Each module handles one concern
2. **Use clear interfaces** - Modules expose only necessary functions
3. **Avoid circular dependencies** - Maintain clear dependency hierarchy
4. **Use descriptive names** - Function names clearly indicate purpose
5. **Handle errors gracefully** - Each module manages its own errors
6. **Document assumptions** - Comments explain why code is structured this way

## Future Improvements

- Add unit test framework (Jest or Vitest)
- Add TypeScript for better type safety
- Extract UI components into separate files (header.js, forecast-table.js, etc.)
- Add LocalStorage caching for API responses
- Create configuration module for adjustable settings
- Add logging module for better debugging

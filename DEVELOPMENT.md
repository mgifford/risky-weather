# Development Guide - Weather Risk Modules

## Quick Start for Developers

### Adding a New Feature

**Example: Add temperature preference (Celsius/Fahrenheit)**

1. **Add to storage** (`modules/storage.js`):
```javascript
saveTempUnit(unit) {
    localStorage.setItem('temp_unit', unit);
},
getTempUnit() {
    return localStorage.getItem('temp_unit') || 'C';
}
```

2. **Update calculations** (`modules/calculations.js`):
```javascript
formatTemp(value, unit = 'C') {
    if (value === null) return '--';
    const rounded = Math.round(value);
    if (unit === 'F') return Math.round(rounded * 9/5 + 32) + '°F';
    return rounded + '°C';
}
```

3. **Update UI** (`modules/ui.js`):
```javascript
addTempUnitToggle(onChange) {
    const btn = document.createElement('button');
    btn.innerHTML = '°C/°F';
    btn.onclick = () => onChange();
    // append to header
}
```

4. **Update app** (`modules/app.js`):
```javascript
const tempUnit = Storage.getTempUnit();
UI.renderToday(tempA, probA, tempB, probB, tempUnit);
// Pass unit down to UI render functions
```

**Key point:** Changes are isolated to relevant modules. Other modules don't need modifications.

---

## Module Communication Pattern

Modules should NOT import each other. Instead, they communicate through a clear interface:

### ❌ WRONG - Circular dependency
```javascript
// In api.js
const location = Storage.getLocation();  // BAD: Creates dependency

// In app.js imports both api.js and storage.js - creates coupling
```

### ✅ RIGHT - Pass data as parameters
```javascript
// In app.js (orchestrator)
const location = Storage.getLocation();
const forecast = await API.fetchForecast(location.lat, location.lon, ...);
// app.js coordinates between modules
```

---

## Common Tasks

### Task 1: Fix a Bug in Forecast Display

The 7-day forecast temps are showing incorrectly:

1. **Check modules in order:**
   - `api.js` - Is the API returning correct data?
   - `calculations.js` - Are we formatting correctly?
   - `ui.js` - Is the DOM update correct?

2. **Add debug logging:**
```javascript
// In app.js renderForecast()
console.log('Received forecast data:', data);
console.log('Formatted cell:', Calculations.formatTableCell(probA, tempB));
UI.renderSevenDay(daily, config.modelA, config.modelB);
```

3. **Test in isolation:**
```javascript
// In browser console
Calculations.formatTableCell(60, 22);  // Returns: "<span...>22°</span>"
```

---

### Task 2: Add Caching for Weather Requests

Prevent redundant API calls within the same hour:

1. **Create cache in api.js:**
```javascript
// At top of api.js
const CACHE = {
    forecast: { data: null, timestamp: null },
    LIFETIME: 3600000  // 1 hour in ms
};

function isCacheValid(timestamp) {
    return timestamp && Date.now() - timestamp < CACHE.LIFETIME;
}
```

2. **Update fetchForecast():**
```javascript
async function fetchForecast(lat, lon, modelA, modelB) {
    const key = `${lat},${lon},${modelA},${modelB}`;
    
    if (isCacheValid(CACHE.forecast.timestamp)) {
        return CACHE.forecast.data;
    }
    
    const data = await fetch(...);
    CACHE.forecast = { data, timestamp: Date.now() };
    return data;
}
```

3. **No changes needed to other modules** - they still call `API.fetchForecast()` the same way.

---

### Task 3: Add Error Notifications

Show user-friendly error messages instead of silent failures:

1. **Extend UI module:**
```javascript
// modules/ui.js
showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-banner';
    errorEl.innerHTML = `⚠️ ${message}`;
    document.body.insertBefore(errorEl, document.body.firstChild);
    setTimeout(() => errorEl.remove(), 5000);
},

hideError() {
    const banner = document.querySelector('.error-banner');
    if (banner) banner.remove();
}
```

2. **Add CSS to style.css:**
```css
.error-banner {
    background: #fed7d7;
    color: #c53030;
    padding: 12px;
    border-left: 4px solid #c53030;
    margin-bottom: 16px;
    animation: slideIn 0.3s ease-out;
}
```

3. **Update API error handling:**
```javascript
// modules/api.js
catch (error) {
    UI.showError(`Weather data unavailable: ${error.message}`);
    throw error;
}
```

---

## Debugging Guide

### Browser Console Commands

```javascript
// Check current state
Storage.getLocation();          // Current location
Storage.getScoreboard();        // Model scores
Storage.getPendingForecast();   // Tomorrow's forecast to verify

// Test individual functions
Calculations.formatTemp(22.5);
Calculations.getStripeColor(0.5);
Calculations.determineWinner(10, 5);  // Returns 'B' (lower error wins)

// Test API
await API.getCityName(45.42, -75.69);
await API.fetchForecast(45.42, -75.69, 'gem_regional', 'ecmwf_ifs025');

// Test geolocation
await Geo.getCurrentPosition();
Geo.getModelConfig(45.42, -75.69);
```

### Add Debug Mode

```javascript
// In app.js
const DEBUG = true;

function debug(label, data) {
    if (DEBUG) console.log(`[DEBUG] ${label}:`, data);
}

// Use in modules
debug('API Response', data);
debug('Calculated Winner', winner);
```

---

## Performance Considerations

### Lazy Loading Historical Data

The stripes generation (74 years of data) is heavy. Consider:

```javascript
// In app.js - Run stripes in background
setTimeout(() => {
    generateStripes(lat, lon);
}, 2000);  // Start after 2 seconds, allowing UI to load first
```

### Debounce Rapid Changes

If user toggles location multiple times:

```javascript
// In app.js
let pendingInit = null;

function debouncedInit() {
    if (pendingInit) clearTimeout(pendingInit);
    pendingInit = setTimeout(() => App.init(), 500);
}
```

---

## Code Quality Checklist

Before committing changes:

- [ ] Function has JSDoc comment explaining purpose
- [ ] Function has 1-3 parameters (if more, use config object)
- [ ] Error cases are handled (try/catch or error callback)
- [ ] No console.log statements left (use debug() instead)
- [ ] No DOM query selectors outside of UI module
- [ ] No direct localStorage access outside of Storage module
- [ ] No API calls outside of API module
- [ ] No inline setTimeout/setInterval (extract to separate function)

---

## Testing Examples

### Unit Test: Calculations Module

```javascript
function testCalculations() {
    console.group('Calculations Module Tests');
    
    // Test temperature formatting
    console.assert(
        Calculations.formatTemp(22.5) === '23°',
        'Should round temperature'
    );
    
    // Test accuracy calculation
    console.assert(
        Calculations.calculateAccuracy(true, 60) === 40,
        'Should calculate error for rain forecast'
    );
    
    // Test color mapping
    console.assert(
        Calculations.getStripeColor(-2) === '#08306b',
        'Should return deep blue for cold anomaly'
    );
    
    console.groupEnd();
}

testCalculations();  // Run in console
```

### Integration Test: Storage Module

```javascript
function testStorage() {
    console.group('Storage Module Tests');
    
    Storage.clearAll();
    
    Storage.saveLocation(45.42, -75.69, 'Ottawa');
    const loc = Storage.getLocation();
    console.assert(loc.city === 'Ottawa', 'Should save and retrieve location');
    
    Storage.incrementScore('A');
    Storage.incrementScore('A');
    Storage.incrementScore('B');
    const scores = Storage.getScoreboard();
    console.assert(scores.a === 2 && scores.b === 1, 'Should track scores');
    
    console.groupEnd();
}

testStorage();  // Run in console
```

---

## Common Mistakes to Avoid

1. **Don't modify other modules' state directly**
   ```javascript
   // ❌ BAD
   document.getElementById('score-a').innerText = '5';  // If in api.js
   
   // ✅ GOOD
   UI.updateScoreboard(5, 3, startDate);
   ```

2. **Don't fetch data in multiple places**
   ```javascript
   // ❌ BAD
   const location = Storage.getLocation();  // In geo.js AND app.js
   
   // ✅ GOOD
   // Get once in app.js, pass to both modules
   ```

3. **Don't create global variables**
   ```javascript
   // ❌ BAD
   currentLocation = { lat: 45, lon: -75 };
   
   // ✅ GOOD
   Storage.saveLocation(45, -75, 'Ottawa');
   ```

4. **Don't make calculations functions async**
   ```javascript
   // ❌ BAD
   async function formatTemp(v) { return v + '°'; }
   
   // ✅ GOOD
   function formatTemp(v) { return v + '°'; }  // Pure & fast
   ```

---

## Resources

- Open-Meteo API Docs: https://open-meteo.com/en/docs
- MDN Web Docs: https://developer.mozilla.org/
- JavaScript Modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

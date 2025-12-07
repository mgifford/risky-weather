# Modular Architecture - Quick Reference

## 📁 File Organization

```
weather-risk/
├── index.html              # Main HTML (loads all modules)
├── style.css               # Global styles
├── README.md              # Project overview
├── ARCHITECTURE.md        # Module structure & dependency graph
├── DEVELOPMENT.md         # Developer guide
├── QUICKSTART.md          # This file
└── modules/
    ├── storage.js         # Data persistence
    ├── calculations.js    # Business logic
    ├── api.js            # API calls
    ├── ui.js             # DOM rendering
    ├── geo.js            # Location & config
    └── app.js            # Orchestration
```

## 🎯 What Each Module Does

| Module | Responsibility | Can Call |
|--------|-----------------|----------|
| **storage.js** | Save/load to localStorage | Nothing (no dependencies) |
| **calculations.js** | Format data, scoring logic | Nothing (pure functions) |
| **api.js** | HTTP requests to weather API | UI (for error display) |
| **ui.js** | Update DOM elements | Calculations (formatting) |
| **geo.js** | Geolocation & model selection | Calculations (is location Canada?) |
| **app.js** | Orchestrate entire flow | All other modules |

## ⚡ Quick Start: Adding a Feature

### Step 1: Identify which module(s) to modify

```
Need to persist new data?          → storage.js
Need to process/format data?       → calculations.js
Need to fetch from API?            → api.js
Need to update what user sees?     → ui.js
Need location-based logic?         → geo.js
Need to coordinate multiple tasks? → app.js
```

### Step 2: Make changes in isolation

Example: Add temperature unit preference (°C or °F)

```javascript
// 1. In storage.js
saveTempUnit(unit) { localStorage.setItem('tempUnit', unit); },
getTempUnit() { return localStorage.getItem('tempUnit') || 'C'; }

// 2. In calculations.js  
formatTemp(value, unit = 'C') {
    if (unit === 'F') return Math.round(value * 9/5 + 32) + '°F';
    return Math.round(value) + '°C';
}

// 3. In ui.js
renderToday(tempA, probA, tempB, probB, unit) {
    ELEMENTS.valA.innerText = Calculations.formatTemp(tempA, unit);
    // ... etc
}

// 4. In app.js (orchestrator)
const unit = Storage.getTempUnit();
UI.renderToday(tempA, probA, tempB, probB, unit);
```

**Result:** Changes are contained. Other parts of code unaffected.

## 🧪 Testing Individual Modules

Open browser console and run:

```javascript
// Test storage
Storage.saveLocation(45, -75, 'Ottawa');
Storage.getLocation();  // { lat: 45, lon: -75, city: 'Ottawa' }

// Test calculations
Calculations.formatTemp(22.5);      // "23°"
Calculations.getStripeColor(-1);    // "#4292c6"
Calculations.determineWinner(5, 10); // "A"

// Test API
await API.getCityName(45.42, -75.69);

// Test UI
UI.setLocation('Toronto');
UI.renderToday(20, 60, 22, 55);

// Test geo
await Geo.getCurrentPosition();
Geo.getModelConfig(45, -75);
```

## 🔄 Module Dependency Graph

```
index.html
    ↓ loads (in order)
┌──────────────────────────┐
│ 1. storage.js            │ ← No dependencies
│ 2. calculations.js       │ ← No dependencies  
│ 3. api.js               │ ← No dependencies
│ 4. ui.js                │ ← Uses calculations.js
│ 5. geo.js               │ ← Uses calculations.js
│ 6. app.js               │ ← Uses all above
└──────────────────────────┘
    ↓ calls
App.init()  ← Starts the application
```

## ✅ Before Committing Changes

- [ ] Only edited files required for your feature
- [ ] Tested in browser console (if data manipulation)
- [ ] No new global variables created
- [ ] No circular dependencies introduced
- [ ] Console clean (no leftover debug logs)
- [ ] Related documentation updated (if adding feature)

## 🐛 Debugging Quick Tips

**Forecast not showing?**
```javascript
// Check in order:
const data = await API.fetchForecast(45, -75, 'gem_regional', 'ecmwf_ifs025');
console.log(data);  // Is API returning data?

Calculations.getSafeData(data.daily, 'gem_regional', 'temperature_2m_max', 0);
// Is formatting working?

UI.renderToday(22, 60, 23, 55);  // Does UI update work?
```

**Scores not saving?**
```javascript
Storage.getScoreboard();  // Check current scores
Storage.incrementScore('A');
Storage.getScoreboard();  // Did it change?
```

**Geolocation not working?**
```javascript
await Geo.getCurrentPosition();  // Gets permission dialog
// Check browser console for errors
```

## 📖 Documentation

- **ARCHITECTURE.md** - Deep dive into module design
- **DEVELOPMENT.md** - Detailed developer guide with examples
- **README.md** - Project overview and background

## 🚀 Common Tasks

### Add a new weather parameter
1. Update `API.fetchForecast()` to request it
2. Update UI render functions to display it

### Change display format
1. Update `Calculations.format*()` function
2. No other changes needed

### Add persistence for new data
1. Add methods to `Storage` module
2. Call from `App.js`

### Add a new view/page
1. Create functions in `UI` module
2. Orchestrate in `App` module
3. Ensure responsive design in `style.css`

## ⚠️ Common Mistakes

❌ **Calling API from UI module**
```javascript
// Don't do this in ui.js
const data = await fetch('https://api.open-meteo.com/...');
```

❌ **Direct DOM queries outside UI module**
```javascript
// Don't do this in app.js
document.getElementById('score-a').innerText = '5';
```

❌ **Importing modules into each other**
```javascript
// Don't do this
import Storage from './storage.js';  // In api.js
```

✅ **Always pass data between modules through app.js**

---

**Questions?** Check DEVELOPMENT.md for more detailed examples!

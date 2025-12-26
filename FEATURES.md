# 🎯 Features Guide - Risky Weather

Complete documentation of all current features and how to use them.

---

## 📍 Core Features

### 1. Current Conditions Display
**What:** Real-time weather conditions shown at the top of the page before the forecast loads.

**Shows:**
- Current temperature and weather icon
- "Feels like" temperature (if significantly different)
- Humidity percentage
- Wind speed
- Precipitation amount (if active)
- Time of last observation
- Data source (Open-Meteo for most locations, Environment Canada for Canada)

**Technical:**
- Fetched from Open-Meteo API
- For Canada: Also compares with Environment Canada data if available
- Shows source attribution at bottom
- Appears immediately before the longer forecast loads

**Locations:**
- Top of page, in a prominent card section
- Displays "Current Conditions" emoji (🌡️)

---

### 2. Forecast Comparison
**What:** Side-by-side comparison of two weather models for 7 days.

**Features:**
- GEM Regional (Canada) or ECMWF (Europe/USA) as primary model
- ECMWF or GFS as secondary comparison
- Daily high/low temperatures, rain probability, snowfall, wind
- Visual disagreement indicators (⚠️ ⚡) when models differ by >5°C or >30% on rain
- Wins/losses tracked when comparing to actual weather from yesterday

**Data Sources:**
- Open-Meteo API for all forecast data
- Supports 8 different global weather models
- For Canada: GEM Regional blended with GEM Global for extended forecasts (days 3-6)

---

### 3. Historical Averages (Last 10 Years)
**What:** Compare today's forecast to historical norms and records.

**Always Visible:**
- Average High temperature and today's comparison (with ▲/▼ indicator)
- Average Low temperature and today's comparison (with ▲/▼ indicator)
- Record High temperature
- Record Low temperature

**In Accordion (Click "More Details"):**
- Data attribution
- Years of data used
- Open-Meteo Archive API link

**Data Source:**
- Open-Meteo Historical Weather API
- 10 years of historical data by default
- Automatically calculated for any location

---

### 4. Actions Card (Smart Recommendations)
**What:** Context-aware actionable suggestions based on current weather and forecast.

**When It Appears:**
- Only shows when there's something actionable to do
- Hides when no relevant conditions are detected

**Action Types:**

**Temperature/Comfort:**
- 🌴 Tropical night precautions (overnight low ≥ 20°C)
- Keep windows closed and run AC (≥ 28°C in summer)
- Open windows tonight (cool + dry conditions)
- Run dehumidifier (cool + humid conditions)

**Snow/Winter:**
- ❄️ Time to shovel the snow? (10cm+ expected) — **URGENT** (red)
- Wait to shovel (light snow but warming approaching)
- ⚠️ Slippery roads - freeze-thaw cycle (overnight freeze + daytime warm + precipitation)

**Water/Drainage:**
- 💧 Check basement and drains (freeze-thaw cycle with heavy rain)

**Seasonal:**
- Water the garden (dry period approaching)

**How They Work:**
- **Dismissible:** Click "Done" to hide or "Remind later" for re-appearance in hours
- **Persistent:** Stored in localStorage, survives page reloads
- **TTL-based:** Re-appear after 12-48 hours if conditions worsen
- **Color-coded severity:**
  - 🔴 **Urgent** (red border) — High priority
  - 🟠 **Important** (orange border) — Should do soon
  - 🔵 **Info** (blue border) — Nice to know

---

### 5. Environment Canada Integration (Canada Only)
**What:** For Canadian locations, offers data from Environment Canada in addition to Open-Meteo.

**Features:**
- Automatically detects Canadian locations
- Attempts to fetch current conditions from nearest EC weather station
- Compares EC data with Open-Meteo
- Shows single source if data matches closely
- Indicates when data sources differ significantly

**Technical:**
- Uses Environment Canada's public GeoJSON stations API
- Finds nearest station to your coordinates
- Converts EC data format to Open-Meteo format for comparison

**Display:**
- Source attribution in current conditions card
- Shows "Open-Meteo & Environment Canada" when aligned
- Shows "Open-Meteo (Environment Canada differs)" when significantly different

---

### 6. Test Mode & Scenario System
**What:** URL-driven system for testing what actions trigger under different weather conditions.

**Test Mode Badge:**
- 🧪 Orange badge appears at top of page when testing
- Shows scenario name or active parameters
- "Clear" button to return to real weather
- Only visible when actually testing (hidden in normal mode)

**How to Use Test Mode:**

**Predefined Scenarios:**
```
?scenario=tropicalNight      → 24°C, 75% humidity overnight
?scenario=heavySnow          → 20cm snow expected
?scenario=coolDryNight       → Perfect ventilation conditions
?scenario=freezeThawRain     → Freeze-thaw + heavy rain risk
?scenario=lightSnowWarmingSoon → Light snow, warming approaching
?scenario=droughtSummer      → Hot, dry summer day (28°C+)
?scenario=heatDay            → Extreme heat alert
?scenario=coolHumidNight     → Cool but damp evening
```

**Direct Parameter Overrides:**
```
?t_out=35                    → Set outdoor temp to 35°C
?rh_out=40                   → Set humidity to 40%
?snow_24h=15                 → Force 15cm snow in next 24h
?rain_48h=25                 → Force 25mm rain in next 48h
?tmin_overnight=22           → Set overnight low to 22°C
?debug=1                     → Show debug panel with candidates/filters
```

**Combination Examples:**
```
http://localhost:8000?scenario=heavySnow&city=Ottawa&debug=1
http://localhost:8000?city=Ottawa&t_out=35&rh_out=40&debug=1
```

**Debug Mode (`?debug=1`):**
- Shows all candidate actions evaluated
- Shows which actions were filtered out and why
- Shows currently dismissed actions
- Shows active mode (real vs scenario)
- Helps understand action generation logic

---

### 7. Connection Status Indicator
**What:** Shows when internet connection is unavailable.

**Visual:**
- 🔴 Red dot in header with "Offline" label
- **Only appears when disconnected** (not visible when online)
- Minimal visual intrusion
- Clickable to manually check connection status

**Location:**
- Top right of header, between language toggle and theme toggle

**How It Works:**
- Monitors browser online/offline events
- Periodic health checks every 30 seconds
- Attempts lightweight API fetch to verify connectivity
- Automatically updates when connection restored

**Why It Matters:**
- App is heavily cached (service worker)
- Difficult to know if viewing fresh data or cached data
- Red "Offline" indicates data may be stale
- Green/online not shown (assumed normal state)

---

### 8. Language Support
**What:** Bilingual UI (English & French).

**Features:**
- Language toggle button in header
- Browser default language detection on first visit
- Preference saved to localStorage
- All UI text, tooltips, labels translated
- Supports internationalized date/time formatting

**Coverage:**
- Main UI complete
- Model names and descriptions
- Action cards and messages
- Help text and tooltips

---

### 9. Theme Support (Light/Dark Mode)
**What:** Respects system theme preference and allows manual toggle.

**Features:**
- Light mode (default)
- Dark mode with theme toggle buttons (☀️ and 🌙)
- Preference saved to localStorage
- System color scheme detection
- All colors adapt via CSS custom properties

---

### 10. 7-Day Competition
**What:** Tracks wins/losses when comparing forecast model accuracy to actual weather.

**How It Works:**
- Yesterday's actual weather fetched from archive
- Both models' previous forecasts compared to observed conditions
- "Wins" tracked for most accurate model
- Scoreboard shows cumulative wins since selected date
- Reset button to start new tracking period

**Data:**
- Uses historical weather data from Open-Meteo Archive API
- Accurate observations back-tested against model predictions

---

### 11. Lesson/Education System
**What:** 20+ educational lessons about weather, climate, uncertainty, and probability.

**Features:**
- Cycling through curated lessons with "Next >" button
- Lessons explain:
  - How to read weather probabilities
  - Model uncertainty and ensemble forecasting
  - Climate vs weather context
  - Risk assessment and decision-making
  - How different models work
- Bilingual educational content
- Lesson counter showing current lesson

---

### 12. Shareable URLs
**What:** Generate reproducible views by encoding location in URL.

**Captured in URL:**
- `lat` - Latitude
- `lon` - Longitude
- `city` - Location name
- `lang` - Language preference (en/fr)

**Use:**
- Share a URL to show same location to others
- Bookmark specific locations
- URLs automatically restore saved state on load

**Example:**
```
http://localhost:8000?lat=45.4123&lon=-75.7022&city=Ottawa&lang=fr
```

---

### 13. City Search
**What:** Find any city in the world with autocomplete.

**Features:**
- Real-time search as you type
- Results from Open-Meteo Geocoding API
- Debounced to reduce API calls
- Click result to load that location
- Accessible via keyboard navigation

---

### 14. Data Caching
**What:** Offline-first caching for performance and resilience.

**What's Cached:**
- Forecast data (reduces redundant API calls within same session)
- User location and preferences
- Forecast history for model comparison
- Dismissed actions (survives page reloads)

**Storage:**
- Browser localStorage for persistent data
- Service worker for offline capability
- Manual cache inspector available (developer use)

**Benefits:**
- Faster page loads
- Works when network is slow
- Actions persist across browser sessions
- Historical data for model scoring

---

## 🔧 Configuration & Customization

### URL Parameters (Full List)

| Parameter | Type | Example | Purpose |
|-----------|------|---------|---------|
| `city` | string | `?city=Ottawa` | Set location by city name |
| `lat` | number | `?lat=45.4` | Set latitude |
| `lon` | number | `?lon=-75.7` | Set longitude |
| `lang` | string | `?lang=fr` | Set language (en/fr) |
| `scenario` | string | `?scenario=heavySnow` | Load test scenario |
| `t_out` | number | `?t_out=35` | Override current temp |
| `rh_out` | number | `?rh_out=40` | Override humidity % |
| `dp_out` | number | `?dp_out=20` | Override dew point |
| `snow_24h` | number | `?snow_24h=15` | Force snow amount |
| `rain_48h` | number | `?rain_48h=25` | Force rain amount |
| `tmin_overnight` | number | `?tmin_overnight=10` | Set overnight low |
| `season` | string | `?season=winter` | Force season context |
| `now` | string | `?now=2025-01-15T10:00:00Z` | Set current time |
| `debug` | number | `?debug=1` | Enable debug panel |
| `eggs` | number | `?eggs=1` | Enable easter eggs |

---

## 🎓 Use Cases

### For Learning
1. Visit different locations to see how models differ globally
2. Use lessons to understand weather concepts
3. Compare historical averages to current forecasts
4. See actual vs predicted results via scoreboard

### For Testing/Development
1. Use scenarios to trigger different action cards
2. Use debug mode to understand action generation logic
3. Use direct overrides to test edge cases
4. Use `?debug=1` to see all candidates and filters

### For Daily Use
1. Check current conditions immediately upon page load
2. Review 7-day forecast from two models
3. Compare to historical norms (always visible averages)
4. Act on recommendations from action cards
5. See offline indicator if connection lost

---

## 📊 Data Sources

| Data | Source | API | Update Freq |
|------|--------|-----|------------|
| Current conditions | Open-Meteo | `/v1/forecast` | Real-time |
| Forecast | Open-Meteo | `/v1/forecast` | Daily |
| Environment Canada conditions | Canada EC | GeoJSON API | Real-time |
| Historical data | Open-Meteo Archive | `/v1/archive` | Daily |
| Geolocation (IP) | ipwho.is | HTTP | Real-time |
| Reverse geocoding | Nominatim/Open-Meteo | HTTP | Real-time |

---

## ✅ Summary Table

| Feature | Status | Test URL | Notes |
|---------|--------|----------|-------|
| Current Conditions | ✅ Active | Base URL | Loads before forecast |
| Forecast Comparison | ✅ Active | Base URL | 7-day two-model |
| Historical Averages | ✅ Active | Base URL | Always visible summary |
| Actions Card | ✅ Active | `?scenario=heavySnow` | Dynamic recommendations |
| Environment Canada | ✅ Active (Canada only) | `?city=Ottawa` | Automatic for Canada |
| Test Mode Badge | ✅ Active | `?scenario=heavySnow` | Orange, only in test mode |
| Connection Indicator | ✅ Active | Go offline | Red dot only when disconnected |
| Language Support | ✅ Active | Toggle button | EN/FR |
| Theme Support | ✅ Active | Toggle buttons | Light/Dark |
| 7-Day Competition | ✅ Active | Base URL | Tracks model accuracy |
| Lessons | ✅ Active | Base URL | 20+ lessons available |
| Shareable URLs | ✅ Active | Copy button | Encodes location & prefs |
| City Search | ✅ Active | Search box | Real-time autocomplete |
| Data Caching | ✅ Active | Offline | Service worker + localStorage |


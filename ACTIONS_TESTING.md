# Actions System Testing Guide

## Overview
The Actions system provides context-appropriate recommendations based on weather conditions. It includes:
- Deterministic action generation (no randomness)
- Dismissible actions with TTL-based reappearance
- URL-driven scenario testing
- Easter egg suggestions
- Debug mode for transparency

## Quick Start

### View Actions in Real Weather
Visit the site normally - actions appear based on current forecast.

### Test Scenarios (Pre-built Weather)

```
?scenario=tropicalNight     # Warm, humid night (20°C min, 75% humidity)
?scenario=coolDryNight      # Cool, dry night (15°C, 55% humidity)
?scenario=coolHumidNight    # Cool, humid night (16°C, 78% humidity)
?scenario=freezeThawRain    # Freeze-thaw with heavy rain
?scenario=heavySnow         # Heavy snow accumulation (18cm)
?scenario=lightSnowWarmingSoon  # Light snow with warming
?scenario=droughtSummer     # Hot, dry conditions
?scenario=heatDay           # Extreme heat (33°C)
```

Example:
```
http://localhost:8000?scenario=heavySnow&city=Ottawa
```

### Direct Parameter Overrides (highest precedence)

```
?t_out=25              # Outdoor temperature (°C)
?rh_out=80             # Relative humidity (%)
?dp_out=18             # Dew point (°C)
?rain_48h=15           # Rain forecast next 48h (mm)
?snow_24h=20           # Snow forecast next 24h (cm)
?tmin_overnight=3      # Minimum overnight temperature (°C)
?season=winter|summer|fall|spring  # Force season
?now=2025-12-26T21:00  # Force local time (ISO)
```

Example:
```
http://localhost:8000?city=Ottawa&t_out=32&rh_out=45&tmin_overnight=22&snow_24h=0
```

### Debug Mode

Add `&debug=1` to see:
- All candidate actions
- Which actions were filtered and why
- Dismissed actions and when they expire
- Active triggers and thresholds

```
http://localhost:8000?scenario=tropicalNight&debug=1&city=Ottawa
```



## Action Categories

### Heat/Cooling
- **Ventilate tonight**: When cool, dry conditions allow natural cooling
- **Keep windows closed**: When heat requires AC
- **Tropical night precautions**: When overnight min ≥ 20°C
- **Run dehumidifier**: When cool but humid

### Snow
- **Time to shovel?**: When ≥10cm snow forecast or accumulated
- **Wait to shovel**: When light snow expected with warming imminent

### Basement/Drainage
- **Check basement and drains**: When freeze-thaw + rain creates runoff risk

### Road Safety
- **Slippery roads - freeze-thaw cycle**: When overnight freezing followed by daytime warming + precipitation creates black ice conditions

### Watering
- **Have you watered the plants?**: When hot, dry, minimal recent/forecast rain
- **Skip watering**: When significant rain forecast

## Dismissal Behavior

### TTLs (Time-to-Live)
- Snow: 12 hours
- Watering: 48 hours
- Basement: 24 hours
- Roads: 24 hours
- Cooling: 12 hours
- Heat: 12 hours

### "Remind Me Later" Option
Available for time-sensitive actions (snow, watering, cooling):
- Reappears after shorter interval (2-6 hours)
- User can keep the action dismissed longer

### Storage
Dismissals stored in localStorage under:
```
riskyWeather:dismissedActions:<lat>,<lon>:<mode>
```

Example:
```
riskyWeather:dismissedActions:45.42,-75.69:real
```

**Mode** is either:
- `real` (actual weather)
- `scenario` (test mode)

This keeps test dismissals separate from real weather.

## Testing Workflows

### 1. Test Dismissal TTL
```
1. Load scenario with actionable items: ?scenario=heavySnow&city=Ottawa
2. Click "Done" on the snow action
3. Action disappears immediately (visual feedback)
4. Reload page - action stays dismissed
5. Wait 12 hours (or modify localStorage directly to test expiry)
6. Dismissal expires, action reappears
```

### 2. Test "Remind Me Later"
```
1. Load scenario with time-sensitive action: ?scenario=heavySnow
2. Click "Remind me later"
3. Action dismissed for 2 hours (much shorter)
4. Reappears after time expires
```



### 4. Test Debug Mode
```
?scenario=freezeThawRain&debug=1&city=Ottawa
```
Scroll down to see:
- Candidate actions (all that could fire)
- Filtered actions (dismissed ones removed)
- Exact trigger thresholds

### 5. Test Clear Scenario Mode
```
?scenario=droughtSummer&city=Ottawa
```
Orange badge appears with "Test Mode" label. Click "Clear" to:
- Remove all query params
- Return to real weather
- Reload page

## Implementation Details

### Action Generation
Actions are generated from forecast data using deterministic rules:
- Temperature thresholds (e.g., 20°C for tropical night)
- Precipitation amounts (e.g., 10mm rain threshold)
- Time-based logic (season, time of day if future)
- No randomness - same conditions always produce same actions

### Action ID Format
Deterministic IDs enable proper dismissal tracking:
```
<type>:<trigger>:<hour> (changes hourly to allow escalation)
```

Example:
```
snow:heavy_snow:435267  (hour component changes hourly)
```

### Filtering Pipeline
1. Generate all candidates
2. Remove dismissed (check TTL expiry)
3. Remove non-actionable (e.g., "No action needed")
4. Render remaining

### Non-Actionable Examples
These generate but don't appear in the Actions panel:
- "No action needed"
- Info-only items with no user task
- Suppressed by dismissal filters

## Edge Cases

### Rapid Weather Changes
If forecast snow jumps from 5cm → 15cm, a new action with updated ID can fire:
```
Dismissed: snow:light_snow_warming_soon (12h TTL)
New action: snow:heavy_snow (higher threshold)
```
User sees the new, more urgent action.

### Switching Locations
Each location has its own dismissal state:
```
riskyWeather:dismissedActions:45.42,-75.69:real  (Ottawa)
riskyWeather:dismissedActions:43.65,-79.39:real  (Toronto)
```
Dismissals don't cross-contaminate.

### Clearing All Dismissals
For testing or reset:
```javascript
localStorage.removeItem('riskyWeather:dismissedActions:45.42,-75.69:real');
```

## Troubleshooting

### Actions not appearing
1. Check debug mode: `&debug=1` shows why
2. Verify scenario is loading: "Test Mode" badge should appear
3. Check browser console for errors
4. Ensure Actions module loads (check script tags in HTML)

### Dismissal not persisting
1. localStorage must be enabled
2. Check location key matches (lat,lon format)
3. Verify mode is correct (real vs scenario)
4. Check TTL hasn't expired


## Future Enhancements

- Geolocation of sunrise/sunset for ventilation timing
- Historical rainfall data for better watering logic
- Snowpack detection for basement risk assessment
- User preferences for action sensitivity
- Mobile push notifications for urgent actions
- Action completion tracking across days

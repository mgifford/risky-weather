Here is a comprehensive `README.md` that you can include in your repository. It documents the philosophy, educational goals, technical evolution, and the collaborative process we went through to build it.

---

# Weather vs. Risk: A Climate Literacy Project

## 🏗️ Architecture

**This project now uses a modular JavaScript architecture for better maintainability and scalability.**

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed module structure and dependency graph
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Developer guide for adding features and fixing bugs

The codebase is organized into 6 independent modules:
- `storage.js` - LocalStorage operations
- `calculations.js` - Business logic & data processing  

# Weather vs. Risk: A Climate Literacy Project

This repository contains a client-side, single-page web app that helps people learn probabilistic thinking, model uncertainty, and climate context by comparing competing weather forecast models and local observations.

---

## Quick Highlights
- **Bilingual UI:** English and French support with browser default detection and a language toggle.
- **IP Geolocation & Fallbacks:** Displays your IP and uses [IPWho.is]* / Nominatim / [Open-Meteo]* fallbacks to resolve a city name when reverse geocoding is unavailable.
- **Model Comparison:** Side-by-side comparison of regional GEM vs ECMWF/GFS model outputs; GEM regional data is blended with GEM global for later days when needed.
- **Uncertainty Indicators:** Visual warnings (⚠️ ⚡) highlight days when models disagree significantly on temperature (>5°C) or rain probability (>30%), teaching users when forecasts are less reliable.
- **Probability Education:** Hover tooltips explain what "60% rain" actually means in practical frequency terms (e.g., "out of 10 similar forecasts, rain occurs 6 times").
- **20 Educational Lessons:** Cycle through expert explanations of risk vs probability, model uncertainty, climate vs weather, ensemble forecasting, and more.
- **Warming Stripes:** Optional historical warming-stripes generation using multi-decade historical data (note: archive requests can be rate-limited).
- **Cache Inspector:** A modal UI to inspect localStorage keys (e.g. `user_loc_v6`, `history_v6_pending`, `scoreboard_v6`).
- **Shareable URLs:** Generate and copy a URL containing `lat`, `lon`, `city`, and `lang` so others can reproduce the same view.

---

## Weather Models Included

- Global Environmental Multiscale Model (GEM)*
- Regional Deterministic Prediction System (RDPS)*
- European Centre for Medium-Range Weather Forecasts (ECMWF)*
- Global Forecast System (GFS)*
- CONUS Swiss HD 4x4
- North American Ensemble Forecast System (NAEFS)*
- High Resolution Deterministic Prediction System (HRDPS)*
- ICON (Icosahedral Nonhydrostatic)*
- UKMO (United Kingdom Met Office)*
- MeteoGroup (BBC Weather)*


---

## Modules
The app is split into focused modules under `modules/`:
- `storage.js` — LocalStorage helpers and URL param helpers
- `calculations.js` — Formatting and scoring utilities
- `api.js` — Forecast, historical fetches, geocoding & blending logic
- `ui.js` — DOM rendering, handlers (cache inspector, share, language)
- `geo.js` — Geolocation helper and model selection
- `i18n.js` — Translations and language management
- `education.js` — Small lesson system and educational copy
- `app.js` — App orchestration and initialization
- `rss.js` — Fetches and displays climate news from various RSS feeds
- `carbon.js` — Displays the Carbon Budget countdown
- `stripes.js` — Warming stripes visualization

## Random Blocks
The application displays one of the following blocks at random on each load. You can force a specific block using the `?blocks=` URL parameter:
- `education` - Educational lessons about weather and risk
- `stripes` - Warming stripes visualization (rate-limited)
- `carbon` - Carbon Budget countdown (Static Target: July 2029)
- `carbon-live` - Carbon Budget countdown (Dynamic: Based on 130Gt budget from Jan 2025)
- `warming` - Global Warming since 1880 (Live counter)
- `emissions` - Global CO2 Emissions (Live counter). The displayed "Since" date is driven by `modules/climate_data.js` (the `REFERENCE_DATE` constant) and will update automatically if changed.
- `rss` - Climate news feed
- `cat` - Climate Action Tracker (Country-specific ratings)

Example: `http://localhost:8000/?blocks=carbon-live`

---

## Educational Goals
- **Risk Literacy:** Show probabilistic forecasts in context with plain-language explanations and frequency interpretations.
- **Model Uncertainty:** Surface disagreements between scientific models with visual indicators (⚠️⚡) and explanatory tooltips—teaching users that large disagreement = high forecast uncertainty.
- **Probability Understanding:** Tooltips explain what "60% rain" means in practical terms: "out of 10 similar forecasts, rain occurs 6 times."
- **Climate vs Weather:** Compare today to the long-run baseline (warming stripes) while teaching the difference between weather models (10-day horizon) and climate models (decades).
- **Ensemble Thinking:** 20 educational lessons explain why multiple models matter, how consensus builds confidence, and why forecast accuracy degrades over time.
- **Verification:** Encourage users to keep score and calibrate model trust over time through the scoreboard feature.

---

## How To Run (recommended)
Serving the app over HTTP avoids common CORS problems with reverse-geocoding services when opening `file://` directly.

Start a lightweight server (Python 3):

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes:
- If you open the file locally via `file://`, some third-party reverse-geocoding endpoints may reject the request (CORS). Use the local server above to avoid that.
- The app will request geolocation only when needed; if blocked it falls back to IP-based location.

---

## Important Behaviors & Troubleshooting
- **URL Params Win:** If the page URL includes `lat`, `lon`, or `city` parameters, the app will use those values (this allows reproducible shared views).
- **IP Display:** The app always fetches and displays your public IP (via `ipwho.is`) for transparency.
- **Rate Limits:** The Open-Meteo archive endpoint may return HTTP 429 forIPWho.is)* for transparency.
- **Rate Limits:** The Open-Meteo* archive endpoint may return HTTP 429 for heavy historical requests. The UI detects this and shows a friendly, translated message rather than throwing an error.
- **Reverse Geocoding & CORS:** When served from `file://` or when reverse geocoding is blocked, the app falls back from Open-Meteo* geocoding → IPWho.is* → Nominatim → coordinate label.
- **Language:** Toggle language using the header button. Language choice is persisted and included in shared URLs.

---

## Development Notes
- Use the modular files in `modules/` to add features or fix bugs. Follow the naming and responsibility patterns above.
- Key localStorage keys to know: `user_loc_v6`, `history_v6_pending`, `scoreboard_v6`, `last_scored_date_v6`.

---

## Contributing
Open a PR or file an issue with a clear reproduction case. If you are testing geocoding behavior, run the app from `http://localhost:8000` to avoid file:// CORS problems.

---

## References

* [Open-Meteo API](https://open-meteo.com/en/docs) — Weather forecast data and geocoding
* [IPWho.is](https://ipwho.is/) — IP geolocation service
* [Environment Canada Models](https://weather.gc.ca/mainmenu/modelling_menu_e.html) — GEM model data
* [RDPS Dataset](https://open.canada.ca/data/en/dataset/a9f2828c-0d78-5eb6-a4c7-1fc1219f1e3d) — Regional deterministic prediction system
* [ECMWF](https://www.ecmwf.int/en/forecasts) — European weather forecasts
* [NOAA Global Forecast System](https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast) — US model data
* [NAEFS](https://en.wikipedia.org/wiki/North_American_Ensemble_Forecast_System) — Ensemble forecasting
* [HRDPS Dataset](https://open.canada.ca/data/en/dataset/5b401fa0-6c29-57f0-b3d5-749f301d829d) — High resolution Canadian predictions
* [ICON Weather Model](https://www.dwd.de/EN/research/weatherforecasting/num_modelling/01_num_weather_prediction_modells/icon_description.html) — German meteorological institute
* [Nominatim](https://nominatim.org/) — Reverse geocoding fallback
* [MeteoGroup](https://en.wikipedia.org/wiki/MeteoGroup) — BBC Weather provider

---
## AI Disclosure

Yes. AI was used in creating this tool. There be dragons! 


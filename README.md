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
- **IP Geolocation & Fallbacks:** Displays your IP and uses `ipwho.is`/Nominatim/Open-Meteo fallbacks to resolve a city name when reverse geocoding is unavailable.
- **Model Comparison:** Side-by-side comparison of regional GEM vs ECMWF/GFS model outputs; GEM regional data is blended with GEM global for later days when needed.
- **Uncertainty Indicators:** Visual warnings (⚠️ ⚡) highlight days when models disagree significantly on temperature (>5°C) or rain probability (>30%), teaching users when forecasts are less reliable.
- **Probability Education:** Hover tooltips explain what "60% rain" actually means in practical frequency terms (e.g., "out of 10 similar forecasts, rain occurs 6 times").
- **20 Educational Lessons:** Cycle through expert explanations of risk vs probability, model uncertainty, climate vs weather, ensemble forecasting, and more.
- **Warming Stripes:** Optional historical warming-stripes generation using multi-decade historical data (note: archive requests can be rate-limited).
- **Cache Inspector:** A modal UI to inspect localStorage keys (e.g. `user_loc_v6`, `history_v6_pending`, `scoreboard_v6`).
- **Shareable URLs:** Generate and copy a URL containing `lat`, `lon`, `city`, and `lang` so others can reproduce the same view.

---

## Weather Models 

- From [Open-Meteo](https://open-meteo.com/en/docs) 
- [Global Environmental Multiscale Model (GEM)](https://en.wikipedia.org/wiki/Global_Environmental_Multiscale_Model) - [Environment Canada Models](https://weather.gc.ca/mainmenu/modelling_menu_e.html)
- [Regional Deterministic Prediction System (RDPS)](https://open.canada.ca/data/en/dataset/a9f2828c-0d78-5eb6-a4c7-1fc1219f1e3d) 
- [European Centre for Medium-Range Weather Forecasts (ECMWF)](https://en.wikipedia.org/wiki/European_Centre_for_Medium-Range_Weather_Forecasts) - [European Model](https://www.ecmwf.int/en/forecasts)
- [Global Forecast System (GFS)](https://en.wikipedia.org/wiki/Global_Forecast_System) - [NOAA USA](https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast)
- CONUS Swiss HD 4x4
- [North American Ensemble Forecast System (NAEFS)](https://en.wikipedia.org/wiki/North_American_Ensemble_Forecast_System)
- [High Resolution Deterministic Prediction System (HRDPS)](https://open.canada.ca/data/en/dataset/5b401fa0-6c29-57f0-b3d5-749f301d829d)
- [ICON (Icosahedral Nonhydrostatic)](https://windy.app/blog/what-is-icon-weather-model-forecast.html) - [DWD Info](https://www.dwd.de/EN/research/weatherforecasting/num_modelling/01_num_weather_prediction_modells/icon_description.html)
- [UKMO, also known as UKMET (United Kingdom Met Office)](https://en.wikipedia.org/wiki/Met_Office)
- [BBC Weather](https://www.bbc.com/weather) Uses the [MeteoGroup's Model](https://en.wikipedia.org/wiki/MeteoGroup)


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
- **Rate Limits:** The Open-Meteo archive endpoint may return HTTP 429 for heavy historical requests. The UI detects this and shows a friendly, translated message rather than throwing an error.
- **Reverse Geocoding & CORS:** When served from `file://` or when reverse geocoding is blocked, the app falls back from Open-Meteo geocoding → `ipwho.is` → Nominatim → coordinate label.
- **Language:** Toggle language using the header button. Language choice is persisted and included in shared URLs.

---

## Development Notes
- Use the modular files in `modules/` to add features or fix bugs. Follow the naming and responsibility patterns above.
- Key localStorage keys to know: `user_loc_v6`, `history_v6_pending`, `scoreboard_v6`, `last_scored_date_v6`.

---

## Contributing
Open a PR or file an issue with a clear reproduction case. If you are testing geocoding behavior, run the app from `http://localhost:8000` to avoid file:// CORS problems.

## AI Disclosure

Yes. AI was used in creating this tool. There be dragons! 


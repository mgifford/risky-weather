# AGENTS.md

## Project Purpose
Risky Weather is a client-side web application that helps users understand weather forecasts, model uncertainty, and climate context by comparing forecast models and local observations.

This is an educational and exploratory tool. It is not an operational weather service and must not be used as the sole basis for safety-critical or risk-sensitive decisions.

## Audience and Responsibility
This project is intended for learning, experimentation, and public understanding of uncertainty in weather forecasting.

Outputs are informational only. Users are responsible for how they interpret and act on the information presented.

## Scope
The project consists of:
- Static HTML, CSS, and JavaScript running entirely in the browser
- Modules for calculations, data handling, and UI logic
- Optional interactions with third-party services such as weather or geolocation APIs

## UI Contract
The UI must not misrepresent certainty.

- Probabilities represent model agreement or likelihood, not guarantees.
- Comparative views are explanatory, not predictive.
- Language and visuals must avoid implying authoritative or official forecasts.

No UI element should suggest operational reliability or compliance with any official meteorological authority.

## Accessibility Position
Risky Weather is developed with intent to improve accessibility, but it is not fully WCAG 2.2 AA compliant.

Accessibility is treated as a continuous improvement effort, not a compliance claim.

Contributors should:
- Prefer semantic HTML
- Ensure keyboard access to interactive elements
- Maintain visible focus indicators
- Use ARIA roles for dynamic updates where appropriate

Known accessibility gaps should be documented and explained.

## Code Quality Principles
- Keep logic modular with clear responsibilities
- Handle errors explicitly and visibly
- Avoid silent failures
- Degrade gracefully when external services fail or are unavailable

## Third-Party Dependencies
- Avoid external scripts with unclear provenance
- Document any third-party API usage, including endpoints and failure modes
- Do not commit API keys or secrets

## Data Handling and Privacy
- Request user location only with explicit permission
- Clearly document any local storage usage
- Do not track users or collect personal data without disclosure

## Testing Expectations
Manual testing should include:
- Keyboard navigation through all controls
- Visible focus for interactive elements
- Correct behavior when APIs fail or permissions are denied

Automated testing is optional but encouraged for core logic.

## Contribution Standards
Pull requests should include:
- A description of the change and rationale
- Notes on UI or behavior changes
- Documentation of any known limitations introduced

## Definition of Done
A change is considered complete when:
- The app runs without console errors
- UI failures are visible and understandable
- Accessibility considerations are not regressed
- New dependencies or behaviors are documented

## GitHub Pages constraints (required)

All pages must work when hosted under the repository subpath:
- `https://<user>.github.io/<repo>/`

Rules:
- Use relative URLs that respect the repo base path.
  - Prefer `./assets/...` or `assets/...` from the current page.
  - Avoid absolute root paths like `/assets/...` unless you explicitly set and use a base path.
- Navigation links must work from every page (no assumptions about being at site root).
- Do not rely on server-side routing. Every page must be reachable as a real file.
- Avoid build steps unless documented and reproducible. Prefer “works from static files”.
- If using Jekyll:
  - Treat Jekyll processing as optional unless `_config.yml` and layouts are part of the repo.
  - If you use `{{ site.baseurl }}`, use it consistently for links and assets.
- Provide a failure-safe: pages should render a readable error if required data files are missing.

Static asset rules:
- Pin external CDN dependencies (exact versions) and document why each exists.
- Prefer vendoring critical JS/CSS locally to reduce breakage.
- Don’t depend on blocked resources (mixed content, HTTP, or fragile third-party endpoints).

Caching/versioning:
- If you fetch JSON/data files, include a lightweight cache-busting strategy (e.g., query param using a version string) OR document that users must hard refresh after updates.


## Local preview (required before publish)

Test pages via a local HTTP server (not `file://`) to match GitHub Pages behavior.

Examples:
- `python3 -m http.server 8000`
- `npx serve`

Verify:
- links resolve under a subpath
- fetch requests succeed
- no console errors on load

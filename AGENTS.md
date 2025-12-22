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

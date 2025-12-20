**Design Tokens & Color Governance — Risky Weather**

Purpose
- Provide a concise, governance-friendly specification of semantic design tokens for colors and accessibility guidance for the Risky Weather project.
- Enable consistent light/dark theming, clear ownership for color changes, and easy verification of accessibility (contrast) requirements.

Scope
- This document defines the minimal token set required for the UI today (typography, backgrounds, accents, links, component-level tokens) and rules for usage and review.

Governance Summary
- Owner: Frontend team (or individual name/email)
- Change process: Any token change must be proposed as a PR with:
  - Rationale for change
  - Before/after screenshots (light & dark)
  - Contrast verification results (WCAG AA) for affected pairs
  - Approval from accessibility reviewer (design/accessibility owner)
- Rollback: Token changes require a follow-up PR to revert if regressions are found.

Token Naming Principles
- Use semantic names (purpose) not visual descriptions (avoid `--blue`, prefer `--link`).
- Keep tokens small and composable: global tokens first, component tokens derived from them.
- Use `--` prefix and kebab-case.

Suggested Global Tokens
- Seed / Brand
  - `--seed` (single hue used to generate accent variations)
- Canvas / Surfaces
  - `--canvas` (page background)
  - `--card` (card background)
- Text
  - `--text` (primary text)
  - `--muted` / `--subtext` (secondary text)
  - `--inverse-text` (for text on dark backgrounds)
- Interactive
  - `--link` / `--link-hover`
  - `--button-bg` / `--button-text`
- Semantic intent
  - `--accent` (danger/alert)
  - `--accent-strong` / `--accent-weak`
  - `--success`, `--warning`, `--info`
- Utilities
  - `--focus-ring`

Component Tokens (examples)
- `--carbon-countdown` (used by carbon countdown component)
- `--carbon-ref` (small reference links)
- `--cat-rating-critically`, `--cat-rating-highly`, etc.

Light/Dark strategy
- Define tokens in `:root` for light defaults.
- Override only changed tokens in `html[data-theme="dark"]`.
- Avoid duplicating component logic — derive component tokens from global tokens.

Accessibility Rules
- All foreground/background pairs must meet WCAG AA (4.5:1) for normal text, 3:1 for large text where applicable.
- Run automated contrast checks as part of PR validation.

Developer Guidance
- Never use inline `style="color:..."` in markup. Instead add a semantic class and use tokens in CSS.
- Examples:
  - `p { color: var(--text); }`
  - `.card { background: var(--card); color: var(--text); }`

PR Checklist for Token Changes
- [ ] Update `design-tokens.md` with the change rationale
- [ ] Provide screenshots (light + dark)
- [ ] Provide contrast calculations for changed tokens
- [ ] Accessibility reviewer sign-off
- [ ] Update any dependent components or styles

Next steps
- Create a `design-tokens.css` file and integrate tokens into `style.css` (I can scaffold this).
- Run a conservative repo-wide replacement plan to remove inline color attributes and map them to tokens.

Notes / References
- Palette generator example: https://thisisfranciswu.com/enterprise-ui-palette-generator/
- WCAG color-contrast guidance: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html


Inline Color Patch Plan — conservative

Summary

This document enumerates inline `style` occurrences that set `color` or `background` in the repo and proposes a conservative replacement plan that maps each location to semantic design tokens. The goal is to avoid risky sweeping changes: only replace literal hex values and string color literals used inline, and leave existing `var(...)` usage intact.

Rules
- Only target inline `style` attributes that include a literal color value (hex or literal color name), or where inline backgrounds are being set.
- Prefer mapping to existing semantic tokens where available: `--text`, `--subtext`, `--highlight`, `--accent`, and the Carbon tokens we added: `--carbon-countdown`, `--carbon-ref`.
- When a literal color is ambiguous, choose a conservative token that matches intent (text vs muted vs accent). If uncertain, mark as `manual-review`.
- Do not change inline event handlers, layout styles, or inline `font-family`/size attributes; only change `color` and `background` inline values.
- After patching, test locally (unregister service worker, hard refresh) and run Accessibility Insights or contrast script for affected elements.

Occurrences (conservative list)

1) modules/cat.js (line ~171)
   - Snippet: `<div style="margin-top: 15px; font-size: 0.85rem; color: #657286;">
   - Recommendation: replace `color: #657286` -> `color: var(--subtext)`
   - Rationale: `#657286` is used as muted/subtext in other places; `--subtext` is the semantic equivalent.
   - Risk: low

2) modules/rss.js (several places)
   - `span style="font-size: 0.8rem; color: #657286;` -> `color: var(--subtext)`
   - `span style="color: #657286;">Loading news...</span>` -> `color: var(--subtext)`
   - `contentDiv.innerHTML = `<div style="text-align: center; color: #657286;">No recent news found.</div>` -> `color: var(--subtext)`
   - Recommendation: replace these `#657286` instances with `var(--subtext)`.
   - Risk: low

3) modules/carbon.js (already updated earlier) — ensure no inline color remains. (Checked)

4) modules/carbon_live.js (already updated earlier) — ensure no inline color remains. (Checked)

5) modules/warming.js
   - `div id="warming-counter" ... color: var(--accent);` - already uses token; leave as-is.
   - `a href ... style="color: var(--highlight)"` - leave as-is.

6) modules/stripes.js
   - `p style="font-size: 0.9rem; color: var(--text);` - uses token; leave.
   - `container.innerHTML = '<div style="text-align: center; color: var(--subtext); padding: 10px;'>No historical data available</div>';` - uses token; leave.

7) modules/education.js
   - `button id="lesson-cycle-btn" style="background: none; border: none; cursor: pointer;...` - no color change needed (no literal colors)
   - `div style="font-size: 0.8rem; color: var(--subtext);` - uses token; leave.

8) modules/emissions.js
   - `div id="emissions-since-label" style="font-size: 0.9rem; color: var(--subtext);...` - uses token; leave.
   - `a href climateclock style="color: var(--highlight)` - leave.

9) modules/rss.js links — some use `color: var(--highlight)` and `color: var(--text)`; leave these.

10) modules/stripes.js container message used var(--subtext) - leave.

What I'll NOT change in this conservative pass
- Any inline styles already using `var()` tokens.
- Inline backgrounds that are layout-critical unless they contain a literal color and represent semantic color (e.g., brand button background). We'll handle button backgrounds in a separate, more careful pass.
- Colors set in external assets (SVGs) or canvas drawing code — these need manual review.

Patch steps (conservative)
1. Replace literal `#657286` in the following files with `var(--subtext)`:
   - `/modules/cat.js`
   - `/modules/rss.js`
2. Search for other hex color literals used inline (regex `style="[^"]*#([0-9a-fA-F]{6})`) and list them for manual review. (This file is already a conservative find.)
3. Commit the replacements in a single, well-tested PR with message: `chore(tokens): replace inline muted hex with var(--subtext)`
4. Run local smoke tests, unregister service worker, hard-refresh, run accessibility contrast checks on RSS and CAT sections.
5. If everything passes, schedule a second pass to convert inline backgrounds and button styles to token-based classes and remove defensive `!important` rules.

Testing
- Unregister service worker before testing to ensure fresh assets.
- Use `Accessibility Insights` or `axe` to re-scan the site to confirm color-contrast issues addressed.
- Run local contrast-check Python snippet for the changed pairs (already used earlier).

Manual review items (follow-up)
- Any inline SVG color attributes or JS-generated colors (e.g., in `modules/geo.js`) should be reviewed and mapped to tokens.
- Button backgrounds that previously used `#0ea5e9` should be canonicalized to `--button-bg` token in a planned second pass.



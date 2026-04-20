# Session Brief — Stage 2a: Baseline Render

**Project:** Spatial Workspace v3, Stage 2 (candidate A — baseline)
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — read Stage 2 → Candidate 0 section.
**Depends on:** Stage 1 must be complete (bag classification applied). Does NOT depend on any other Stage 2 session.
**Runs in parallel with:** stage-2b, stage-2c, stage-2d, stage-2e.

---

## Goal

Produce a static SVG render of the **existing v2 radial layout with Stage 1's bag-node fix applied**, against the real 3096-node ecosystem tree at three expansion states. This is the baseline that every other candidate is compared against.

---

## Why This Baseline Matters

Stage 1 might have resolved the visual failure. If it did, we want the baseline to show up in the Stage 2 review looking GOOD — and the eye test then says "the baseline wins, no new algorithm needed." Without this panel in the bakeoff, we risk picking an alternative that is merely *different*, not *better*.

---

## Input

- Real tree data: whatever source the v2 generator uses (check `generator/generate-ecosystem.py`)
- Stage 1's `classifyNode()` and modified `getVisibleTree()` logic
- Thresholds: whatever values Stage 1 settled on

---

## Output

`play/stage2a-baseline.svg` — one SVG file containing three panels (stacked vertically or side-by-side), each showing the baseline layout at one expansion state:

1. **Default state:** root + direct children expanded (INITIAL_EXPAND_DEPTH = 1)
2. **One-branch-deep:** one representative branch fully expanded (e.g., Playful Sincerity → PS Software fully open)
3. **Fully expanded:** every directory expanded (with bag-classified directories collapsed to their terminal bag representation)

Each panel:
- SVG format (no raster, so it's zoomable in review)
- Labels rendered in-place, no truncation, no minRadius culling
- Node buttons use the existing v2 style (rect + label + heat color)
- Bag nodes use the Stage 1 visual token
- Canvas size as large as needed to fit everything at natural scale — do NOT compress for this baseline

Also write `play/stage2a-baseline-stats.md`:
- Total visible nodes at each expansion state
- Render time (wall clock)
- Parameter count (current layout's params + Stage 1's 2 bag thresholds)
- Any visual failure modes observed by the human running the session (before Wisdom's review)

---

## Steps

1. Write a small Python or Node script `tools/stage2a-render.py` (or `.js`) that:
   - Loads the real tree data (same source as generator)
   - Applies Stage 1 bag classification
   - Runs the existing radial layout (port from `templates/v2/app.js` or invoke headless)
   - Emits SVG to `play/stage2a-baseline.svg`
2. Test at each of the three expansion states.
3. Eyeball the result — does it render correctly? If rendering is broken, fix and re-run.
4. Commit the SVG + stats file.
5. In the Stage 2 review session, this panel will be composed with 2b–2e into a single comparison sheet.

---

## Constraints

- **No interactivity.** This is a static render. If you find yourself writing pan/zoom code, stop.
- **No invention.** Use the existing layout verbatim. This is a comparison control.
- **Do NOT modify `templates/v2/app.js`.** If you need to extract the layout logic, port it into a standalone `tools/` script. `app.js` stays live for v2 users.
- **Bag handling is Stage 1's responsibility.** Import/call Stage 1's `classifyNode`, don't reimplement.

---

## Success Criteria

- SVG opens cleanly in a browser
- All three expansion states render without errors
- Nodes are readable (or at least readable enough that their failure to fit is clearly visible — that IS information)
- Bag nodes appear correctly at their expected locations (HHA inbox, any others > threshold)
- Stats file captures the key numbers

---

## What This Session Does NOT Do

- No new layout algorithm
- No interactive UI
- No integration with the v2 canvas
- No Stage 2 review / comparison — that's a separate session once all five are done

Chronicle the session: what the render looks like, any surprises, what the numbers say. Hand off to the Stage 2 review session via the chronicle.

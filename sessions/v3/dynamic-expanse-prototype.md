# Dynamic Expanse Prototype — Session Brief

**Project:** Spatial Workspace v2 (dynamic-expanse variant)
**Start this session in a FRESH Claude Code conversation.** Self-contained brief.

## The Split

As of 2026-04-18 we have two parallel prototypes exploring different semantics for what happens when a user clicks a folder to expand:

- **Pinned Expanse** (working in the other conversation): When you click a folder, its position is locked, *and so is every other already-placed node*. Only the NEW children run through physics, settling around a completely frozen world. The clicked folder does NOT move. Children of the click must squeeze into whatever empty space exists, respecting the membranes of neighboring pinned subtrees. The ecosystem's shape IS the user's navigation history.
  - Output: `~/ecosystem-canvas-pinned.html`
  - Template: `templates/v2/`

- **Dynamic Expanse** (this prototype): Same idea — previously-placed nodes stay pinned — EXCEPT the folder that was just clicked. The clicked folder is allowed to move just enough to give its new children a clean bubble, respecting the membranes of other pinned sibling subtrees. Everything else stays exactly where it is.
  - Output: `~/ecosystem-canvas-dynamic.html`
  - Template: `templates/v2-dynamic/` (currently a byte-for-byte clone of `v2/` — this session's job is to diverge it)

## Why Two Prototypes

Wisdom's framing (2026-04-18): "The fact that it's rigid right now — the new expanded everything else stays the same but the one that you click moves out a bit depending on how much it needs to move out in order to have a good nice bubble that doesn't overlap anything." He wants to feel both in use and choose.

## The Core Change

In `templates/v2-dynamic/app.js`, `createLayout.run()` currently hard-pins every carried-over node via `fx`/`fy` when `PIN_HARD` is true (see the block starting `const PIN_HARD = P.pinStrength >= 0.9`). The dynamic-expanse behavior requires one exception: **the most recently-clicked folder is not hard-pinned.** It gets a soft pin (spring back toward its prior position) AND a single-axis outward bias allowed only if needed to resolve overlap with sibling subtrees.

### What "most recently clicked" means

The click handler at `attachNodeHandlers` (search for `state.expandedPaths.add`) knows the clicked path. Thread it into `updateTree` as `{ justExpanded: path }` so `createLayout` can treat that node specially.

### Behavior when clicked

The clicked node `C` should:
1. NOT get `fx`/`fy` set (it can move).
2. Have a **soft spring toward its prior position** — medium strength, so it returns to near-original placement if possible.
3. Have its children placed as in current pinned-expanse (physics-free-to-move around `C`).
4. Bubble-compare `C`'s subtree against sibling subtrees. If overlap exists, `C` (and its mobile children) move outward to resolve. Pinned siblings don't move.

### Invariants to preserve

- Root always pinned at origin.
- Every carried-over node *except* `C` is still hard-pinned.
- `C`'s children are mobile (as before).
- After the sim, `C`'s new position is saved to `_prevPositions` so the next expand sees it there.

## Files to Change

Only `templates/v2-dynamic/app.js`. Everything else stays identical to `v2/`.

Key code regions (same line numbers as `v2/` at time of fork):
- `1125` — `updateTree` signature: accept `justExpanded` option, pass down.
- `1140-1156` — carried flag logic: don't set `_carried = true` on the just-expanded node; instead set `d._justExpanded = true`.
- `282-302` — pin setup block: skip `fx`/`fy` for the just-expanded node.
- `404-412` — `pinSpring` function: give the just-expanded node a spring pull toward its prior position (medium k, separate from `P.pinStrength`).
- `367-395` — bubble force: when comparing a pair involving `C`, use velocity push on `C`'s subtree (so it can drift to resolve overlap) and position correction on other mobile subtrees. Pinned peers still contribute via position correction with pinned side skipped.

## How to Test

1. `python3 generator/generate-ecosystem.py --template templates/v2-dynamic --output ~/ecosystem-canvas-dynamic.html`
2. Open `~/ecosystem-canvas-dynamic.html` in browser
3. Expand PS Software, then HHA, then The Companion, in various orders
4. The previously-expanded subtrees should stay literally put. The just-clicked folder should nudge outward if its new subtree would overlap a sibling. New children should form a clean bubble.

## What "Done" Looks Like

Both prototypes side-by-side:
- `~/ecosystem-canvas-pinned.html` — click; clicked folder is rigid; children squeeze into empty space
- `~/ecosystem-canvas-dynamic.html` — click; clicked folder nudges outward to make room; children get a clean bubble

Wisdom eye-tests both, chooses (or keeps both as modes).

## Context from Current Session

- Current session fixed membrane-crossing in pinned-expanse by switching bubble force to direct-position correction when `PIN_HARD` (velocity accumulates across ticks into drift; position correction resolves overlap in one tick).
- `applySubtreePosition` helper respects `fx`/`fy` so mixed subtrees (pinned parent + new children) work automatically.
- `chargeStrength` returns 0 for pinned nodes (avoids same one-way-ram pattern).
- The click handler used to force `isResettle: true` (wiping carry-over); was changed to default `false` so pin-on-expand actually activates.

## Chronicle

Current session chronicle: `chronicle/2026-04-18.md`. Read the "Implementation" entries for the pin-on-expand history and the three force-asymmetry fixes applied.

# Session Brief — Stage 1: Bag-Node Fix

**Project:** Spatial Workspace v3, Stage 1
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — read Stage 1 section fully before coding.
**Think Deep:** [`../../research/think-deep/2026-04-17-layout-rethink.md`](../../research/think-deep/2026-04-17-layout-rethink.md) — read "What We Discovered" for the reframe that led here.

---

## Why This Session Exists

Two prior layout iterations (physics, tidy-radial) failed the visual eye test. A Think Deep session revealed that the real problem may not be the layout algorithm at all — it may be that one directory (HHA pipeline/inbox) with 469 children dominates any proportional angular allocator. If we treat that directory as a *bag* (terminal container of leaves) rather than as a *tree* (structured hierarchy), the layout may already be fine.

Stage 1 tests that hypothesis with ~100 lines of additive code. It's the cheapest possible falsification before any algorithmic rewrite.

---

## Goal

Add bag-node detection + bag rendering + bag drawer UI to the existing v2 canvas. No changes to the underlying layout algorithm. Ship or fail based on Wisdom's eye test of the result.

---

## Read These First

1. [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — Stage 1 section in full
2. [`../../templates/v2/app.js`](../../templates/v2/app.js) — you'll be editing this. Pay attention to:
   - `function classifyNode` area — you're adding one
   - `function getVisibleTree` (~line 514) — you're modifying this
   - `INITIAL_EXPAND_DEPTH` (line 57) and `setInitialExpanded` (line 502) — context, not change target
   - Reader panel code (search for "reader" and "tabs") — you'll reuse its infrastructure for the bag drawer
3. [`../v2/phase-3c-layout-rethink.md`](../v2/phase-3c-layout-rethink.md) — the history that led here
4. [`~/Wisdom Personal/people/wisdom-happy.md`](/Users/wisdomhappy/Wisdom%20Personal/people/wisdom-happy.md) — Wisdom's visual preferences; the "organic > grid" rule applies even for bag rendering

---

## Three Open Questions — Resolve With Wisdom Before Coding

Do NOT code until these are answered. Ask Wisdom via `AskUserQuestion` or conversation at the start of the session.

1. **Drawer UI vs shift-click-to-expand-in-place for bag nodes?**
   - Recommendation: drawer-only for Stage 1. Click = drawer, no expand-in-place affordance. Simpler and avoids re-introducing the pack-469-siblings problem.
   - Alternative: shift-click to force expansion-in-place anyway (for users who want to see everything). Adds complexity.
   - Wisdom's call.

2. **Thresholds (set from data, not guesses):**
   - Proposed defaults before data: `BAG_THRESHOLD_ABS = 60`, `BAG_THRESHOLD_REL = 3.0` (× sibling median).
   - Step 1.0 produces the actual out-degree distribution. After that, Wisdom and Claude calibrate together.

3. **Bag visual token:**
   - Recommendation: rounded rectangle button, 1.4× width × 1.3× height of a normal tree node, label format `"<name> · <count>"`, with a subtle striped pattern fill that distinguishes it from solid-fill tree nodes. Exact visual TBD.
   - If Wisdom wants to prototype 2-3 options in Figma first, pause before implementing.

---

## Implementation Steps (After Open Questions Resolved)

### Step 1.0 — Out-degree distribution (5 min, do first)

Write `tools/tree-stats.py`, a Python stdlib script that reads the ecosystem tree (via the existing generator's data source — see `generator/generate-ecosystem.py` for how it reads) and emits:

```
Tree stats — YYYY-MM-DD
─────────────────────
Total directories: <N>
Median children per directory: <M>
Mean children per directory: <M_avg>
90th percentile: <P90>
99th percentile: <P99>

Histogram (children count → number of directories):
    0     : ███
    1-5   : ████████████
    6-10  : ████████
    11-20 : █████
    21-50 : ██
    51-100: █
   101-200: █
   201+   : █

Top 10 largest directories:
  <path> — <N> children
  <path> — <N> children
  ...

Suggested thresholds:
  BAG_THRESHOLD_ABS (99th percentile rounded): <N>
  BAG_THRESHOLD_REL (3× median): <M × 3>
```

Save the output to `research/tree-stats-YYYY-MM-DD.md`. This is the real data Wisdom calibrates thresholds against.

### Step 1.1 — Add `classifyNode()` to `app.js`

Add near the existing classify/measure helpers. Takes a node's sibling context so it can check relative thresholds. Returns one of `"leaf" | "tree" | "bag"`.

### Step 1.2 — Modify `getVisibleTree()`

When a "bag" classified directory is expanded, do NOT recurse into children. Record `clone._bagChildren = node.children` for the drawer to access.

### Step 1.3 — Bag node rendering in canvas

Find the node render path (search for `nodeVisual` or where the per-node rect is drawn). Add a branch: if the node is `_bagClassified === "bag"`, use the larger dimensions + striped fill + count-label format.

### Step 1.4 — Bag drawer UI

Hook into the existing reader/tab infrastructure. When a bag node is clicked, open a new panel listing its contents with virtualized scroll + click-to-open-in-reader. Reuse the reader's close button and keyboard shortcuts where possible.

### Step 1.5 — Verification

- Existing `#demo=expandBranch` and `#demo=expandAll` still pass
- Screenshot before/after at full expand state
- Canvas renders bag nodes for: HHA/pipeline/inbox (should fire), claude-system/skills (should NOT fire if threshold is 60), people/ (49 — should NOT fire if threshold is 60)
- Click bag node → drawer opens with 469 items, scrollable, click-through works
- Wisdom eye test → passes (ship Stage 1, Stage 2 is NOT needed) OR fails (proceed to Stage 2)

---

## What This Session Does NOT Do

- No new layout algorithm
- No membrane layer (SVG hulls / Voronoi)
- No transitions, hit-box fixes, zoom changes
- No touching reader/tabs/search/centering
- No writing Stage 2 code — that's different sessions

---

## Success Criteria

1. `tools/tree-stats.py` exists, runs, produces the distribution file
2. Bag classification correctly identifies the inbox (and any others at the chosen threshold)
3. Bag nodes render distinctly in the canvas
4. Drawer opens on bag click, lists items, click-through works
5. Existing demo hooks and tests still pass
6. Wisdom's eye test: he looks at the post-Stage-1 canvas and says yes OR no

If yes → write a chronicle entry noting Stage 2 is cancelled. If no → write a chronicle entry noting what specifically looked wrong and kick off Stage 2.

---

## Chronicle This Session

Log every substantive step. At session end, write a summary chronicle entry covering what was built, what thresholds were chosen, and Wisdom's verdict. This is the record that drives the Stage 2 decision.

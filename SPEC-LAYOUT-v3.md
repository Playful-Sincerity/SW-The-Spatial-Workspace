# SPEC — Layout v3 (Post-Think-Deep)

**Authored:** 2026-04-17
**Supersedes:** Phase 3B iteration loop. Does NOT replace `SPEC-PHYSICS.md` yet — that spec's deterministic radial algorithm is still in play as the Stage 1 base.
**Premise:** Three prior layout iterations (physics, tidy-radial, SPEC-PHYSICS-style deterministic) failed the user's eye test. A Think Deep session (see [research/think-deep/2026-04-17-layout-rethink.md](research/think-deep/2026-04-17-layout-rethink.md)) revealed that *nobody has shipped this combination* — and that the real reframe is visibility-contract, not algorithm. The next work is sequenced from cheapest-falsification to most-expensive-commitment.

---

## Goal

A file-hierarchy layout that simultaneously:

1. **Adapts at every expansion state** — packs space well whether 40 or 400 nodes are visible
2. **Shows membrane-like containment** — a parent and its children read as one group, visually
3. **Maximizes compression** — as many files visible as possible, hierarchy still legible
4. **Feels continuous to explore** — no jarring jumps when expanding or panning
5. **Looks good** — organic, not grid-like; not sterile

Plus the constraint the Think Deep surfaced: **the 469-child HHA inbox is not a layout problem, it is a data-type mismatch.** A *bag* of flat files deserves different rendering than a *tree* of nested directories. Any algorithm that tries to spatially pack 469 siblings loses.

---

## The Plan — Three Stages, Cheapest First

This spec does NOT commit to a single algorithm up front. The three stages are ordered by cost-to-falsify. Each stage has an explicit kill switch — what observable failure stops it and hands off to the next.

| Stage | Effort | What | Confidence | Kill switch |
|-------|--------|------|-----------|-------------|
| 1 | hours | Out-degree distribution + bag-node detection + "bag" rendering in the *existing* radial layout | 0.85 (low risk) | Visual eye-test on real data still feels "too regular" or too empty → Stage 2 |
| 2 | 1–2 days | Static render bakeoff: baseline + 4 alternatives (spiral, circle-pack, bubble-treemap, hierarchical Voronoi), against real data, no interaction | Varies per candidate; Wisdom's eye test is the judge | All five look bad → revisit Think Deep Open Threads (usage-memory, ZUI, different reframe) |
| 3 | 2–5 days | Full interactive build of Stage 2's winner (pan/zoom/expand/collapse/transitions) | 0.80 conditional on Stage 2 passing | — (we're shipping at this point) |

**The most important discipline in this spec: DO NOT SKIP AHEAD.** If Stage 1 resolves the visual failure, Stages 2 and 3 never happen. If Stage 2's static render looks wrong, we do not attempt Stage 3 anyway "just to see." Every stage has a human decision point at the end.

---

# STAGE 1 — Bag-Node Fix to the Existing Radial Layout

**Goal:** Without rewriting the layout algorithm, make the current radial layout render well for the real 3096-node tree by treating pathological directories (>N children) as a different rendering mode.

## Core Insight

The current layout's visual failure is not about radial-vs-containment-vs-spiral. It's that *one directory with 469 children* dominates any proportional angular allocator, crushing all other siblings into slivers. Remove that pathological case from the spatial allocator and the rest of the layout is fine (or at least: fine enough to test before we know).

## Two-Sentence Algorithm Change

> **Before running the layout, tag every directory as either a "tree node" (children are navigable structure) or a "bag node" (children are a flat list of leaves with no meaningful internal hierarchy). The layout ignores bag children for angular allocation — bag nodes are laid out as single oversized terminal buttons with a count, expansion of a bag opens a separate drawer/list UI, not a spatial fan.**

## Steps

### Step 1.0 — Out-degree distribution (5 min)

Before any code changes, produce the real distribution of directory sizes so thresholds are set from data, not guessed.

**Deliverable:** `research/tree-stats-2026-04-17.md` containing:
- Total directory count
- Histogram of children-per-directory: bucket sizes 0, 1–5, 6–10, 11–20, 21–50, 51–100, 101–200, 201+
- Top 10 largest directories by direct-child count, with paths
- Median and 90th-percentile child counts
- Mean vs median (measures skew)

**How:** A 20-line Python script run against the actual ecosystem tree. Lives at `tools/tree-stats.py`. Python stdlib only, per project convention.

### Step 1.1 — Bag-node classification

Add a classification pass before layout:

```
function classifyNode(node):
    if node.type != "directory": return "leaf"
    childCount = node.children.length
    if childCount > BAG_THRESHOLD_ABS: return "bag"
    // Relative threshold fires only if there's enough data to have a median
    if siblings.length >= 4:
        median = medianOfSiblingChildCounts()
        if childCount > BAG_THRESHOLD_REL * median and childCount > 20: return "bag"
    return "tree"
```

**Open question — needs Wisdom's input before coding:**
- `BAG_THRESHOLD_ABS`: proposed 60. Data from Step 1.0 may adjust this — e.g., if three directories exceed 60 but only one exceeds 200, maybe 200 is the right line.
- `BAG_THRESHOLD_REL`: proposed 3.0 (i.e., 3× sibling median). Only fires when the directory is an outlier *relative to its siblings*. Complementary to the absolute threshold.

The thresholds are tuning values. The spec is honest about this: *two parameters*, not zero.

### Step 1.2 — Modified visible-tree pruning

In `getVisibleTree`:

- For a "tree" directory that is expanded: render children as today
- For a "bag" directory that is expanded: **do not recurse into its children for spatial layout**. The bag renders as a single oversized node with its count: `"inbox (469)"`
- Record the bag state on the cloned node: `clone._bagChildren = node.children` so the drawer UI (Step 1.4) can access the list

### Step 1.3 — Bag node visual treatment

A bag node in the canvas:

- Rendered as a rounded-rectangle button, slightly larger than a normal tree node (suggest 1.4× width, 1.3× height)
- Label format: `"<name> · <count>"` (e.g., `"inbox · 469"`)
- Distinct visual token: same heat/color as a directory, but with a subtle pattern fill or stripe to signal "this is a container of items, not a container of structure". Exact visual TBD in design review — this spec pins the *semantic difference*, not the exact pixels.
- Still clickable — click opens the drawer UI (Step 1.4)
- Still expandable-in-place via a shift-click or long-press? **Open question**, see below

### Step 1.4 — Bag drawer UI

Clicking a bag node opens a new panel (reusing the reader-pane infrastructure) that lists its contents:

- Flat scrollable list of the bag's items, 20 per page or virtualized scroll
- Search-within-bag (reuse main search logic if cheap)
- Click an item in the list → opens it in the normal reader (reusing existing tab/reader behavior)
- Close button returns to canvas

This is roughly the same pattern as today's reader — so implementation cost is "another panel" rather than "new UI primitive."

### Step 1.5 — Verification

- The existing `#demo=expandBranch` and `#demo=expandAll` tests must still pass (overlap count unchanged for tree-mode dirs; bags are excluded from the check)
- Run the canvas against the real ecosystem tree with the HHA inbox fully expanded in the data (but auto-bagged by the classifier)
- Screenshot: pre-change and post-change at full-expand. Post-change should have **visibly more space** for non-inbox subtrees.
- Eye test: Wisdom reviews. If he says "yes, this is basically what I wanted" → Stage 1 ships, Stages 2–3 are unneeded. If he says "the inbox problem is fixed but it still looks too regular / too grid-like" → Stage 2.

## What Stage 1 Does NOT Do

- Does not change the underlying layout algorithm (still SPEC-PHYSICS-style deterministic radial, or whatever is live in `app.js` today)
- Does not add membranes (SVG hulls / Voronoi cells) — that's Stage 3
- Does not change transitions, hit-boxes, zoom behavior, or any other UI
- Does not add usage-memory / slime-mold layout adaptation — that's far future

## Stage 1 Parameters (Honest Inventory)

1. `BAG_THRESHOLD_ABS` — absolute child count for bag classification
2. `BAG_THRESHOLD_REL` — relative-to-sibling-median multiplier
3. Bag node size multiplier (~1.4×) — aesthetic choice, not algorithmic

Three knobs. Not zero. The spec does not claim otherwise.

## Stage 1 Open Questions (Resolve Before Coding)

1. **Drawer UI or always-in-place expand?** The spec proposes: bag nodes never expand in place — clicking always opens the drawer. Alternative: shift-click to expand in place anyway, for power users. **My recommendation: drawer-only for Stage 1. Simpler, and the whole point is to not pack 469 siblings spatially.**
2. **Which directories qualify as bags on the real tree?** Answered by Step 1.0.
3. **Bag visual token.** Decided after Step 1.0's data review — may want to prototype 2-3 looks in Figma first.

---

# STAGE 2 — Static Render Bakeoff (IF Stage 1 fails the eye test)

**Goal:** Before any interactive rewrite, produce static images of the two leading candidate algorithms rendered against the real tree data. Wisdom looks and chooses.

## Why This Stage Exists

The Think Deep's leading recommendation (golden-angle spiral phyllotaxis) has **never been rendered against real file-tree data**. Its existence proofs are in nature (sunflowers) and in academic InfoVis literature (various phyllotaxis-adjacent layouts). The d3.pack circle-packing option has been validated in production (GitHub Next) but is a different aesthetic. We cannot pick without seeing both.

## Five Candidate Renders

Each candidate is an independent static render of the real tree data. Candidates are chosen to span the space from "minimal change" to "radically different," so the comparison is honest.

### Candidate 0 — Baseline (post-Stage-1 existing radial layout)

**Mechanism:** Current deterministic radial algorithm in `app.js`, with Stage 1's bag-node fix applied. No other changes.

**Why it's here:** If Stage 1 is enough, Stage 2's review will tell us by showing the baseline alongside the alternatives. Stage 1's kill-switch triggers entry to Stage 2, but the baseline still deserves to be rendered so we compare apples-to-apples against the alternatives. It also controls for the possibility that the bag fix alone resolved the visual failure and any alternative is just *different*, not *better*.

**Parameters:** whatever the current layout already uses + Stage 1's two bag thresholds.

### Candidate A — Golden-Angle Spiral + Leaf-Weighted Radius + Post-Hoc Convex Hulls

**Mechanism:**
- For each parent, place its N children at angles: `θ_i = i × 137.5°` (golden angle). Distance from parent: `r_i = baseDistance × √(i + 1)` (Vogel's phyllotaxis formula).
- Node size (rectangle width/height): `size = base × (1 + K × log₂(leafCount + 1))`, where K ≈ 0.08. Directories larger than files; deeper subtrees larger than shallow.
- After all positions are computed, draw SVG convex hulls around each subtree as the "membrane."
- Bag nodes (from Stage 1) render inline as single oversized terminal nodes.

**Handles the 469-child inbox by:** It doesn't — bag-handling (Stage 1) removes the inbox from the spatial algorithm entirely.

**Handles a 3-child folder by:** Three nodes placed at 0°, 137.5°, 275° from the parent — a natural asymmetric Y shape that feels organic.

**Parameters:** golden angle (fixed at 137.5°, not tunable), base distance (one constant), K for size (one constant), min-radius, hull padding. **~5 numeric constants.** Not "one formula" — be honest.

### Candidate B — d3.pack Zoomable Circle Packing

**Mechanism:**
- Use d3-hierarchy's `pack` layout. Each directory becomes a circle containing its children's circles. Circle radius ∝ √(file size) or √(leaf count) — we choose leaf count.
- The tree becomes a recursive nesting of circles. No separate membrane layer — the circle IS the membrane.
- Bag nodes (from Stage 1) render as single leaf circles with a count.

**Handles the 469-child inbox by:** Bag-handling (Stage 1) again.

**Handles a 3-child folder by:** Three packed circles inside a larger parent circle. Size proportional to content.

**Parameters:** padding, min-circle-size (for culling), radius-scale. **~3 numeric constants.**

### Candidate C — Bubble Treemap (Görtler 2018 variant)

**Mechanism:**
- Compute a squarified or jigsaw treemap as the internal structure (rectangular cells proportional to leaf count)
- Replace every rectangle boundary with a *smooth contour* (cubic Bézier curves, possibly offset slightly outward)
- Nest contours recursively — a parent's contour contains all its children's contours
- Within each leaf cell, place the label with its heat color. Outside the leaf (in the padding/contour band), render the parent's color as a subtle gradient ring — this is the "membrane" aesthetic the paper's main visual contribution.

**Handles the 469-child inbox by:** Bag-handling (Stage 1) again — inbox becomes one leaf cell with `"inbox · 469"`. If bag were OFF, Görtler's approach would give 469 tiny cells inside a smooth membrane, which reads as "this is a lot of items" rather than failing — but we still don't want it.

**Handles a 3-child folder by:** A treemap of 3 rectangles inside a smooth outer contour. Feels like three cells inside a soap bubble.

**Parameters:** contour smoothing radius, padding between nested contours, gradient width (3 constants). Rectangular internal placement uses squarified treemap's own mechanism.

**Why it's here:** This is the closest academic match to Wisdom's stated "organic membrane" aesthetic. The Think Deep's papers research called it "the closest thing to organic membrane containment in the literature." If it looks right, we may not need phyllotaxis at all — the smooth contour does the organic work.

### Candidate D — Hierarchical Voronoi (FoamTree-style)

**Mechanism:**
- Compute a weighted centroidal Voronoi tessellation at the top level. Each top-level directory gets a polygonal cell. Weight = leaf count.
- Recurse: within each cell, compute another Voronoi tessellation of that cell's children.
- Cells are polygons with shared edges — the shared edges ARE the membranes. No separate membrane layer needed.
- Labels placed at the centroid of each cell. For small cells (below a min-readable-area threshold), label is hidden but cell remains.

**Handles the 469-child inbox by:** Bag-handling (Stage 1). Without bag-handling, Voronoi does better on fan-out than spiral (it packs space-filling by construction) — but the 469 cells would be tiny and illegible. Stage 1's bag handling is still the right move.

**Handles a 3-child folder by:** Three polygonal cells tessellating the parent cell. Edges are organic-feeling, unpredictable.

**Parameters:** Lloyd's algorithm iterations (for centroid convergence), weight-to-area scaling, min-readable-area threshold (3 constants). Voronoi is computationally heavy (O(n log n) per level, iterative convergence) — for STATIC render this is fine; for interactive it's a Stage 3 concern.

**Why it's here:** This is the closest SHIPPED existence proof — FoamTree from Carrot Search uses hierarchical Voronoi in production. Visually it is the most organic of any option. It is the maximum-aesthetic, maximum-complexity endpoint of the bakeoff.

## Deliverable

**One static HTML page** (`play/stage2-bakeoff.html`) that renders ALL FIVE candidates side-by-side against the same real tree data at three expansion states (default / one-branch-deep / fully-expanded). Each candidate is produced by an independent parallel session (see `sessions/v3/` briefs). The review page composites them into a single visual bakeoff.

- 5 candidates × 3 expansion states = 15 SVG panels, arranged as a 5-row × 3-column grid
- Same input data for every candidate — the real 3096-node ecosystem tree
- Each label rendered in-place (no truncation, no min-size culling for this static test)
- SVG output (downloadable as PNG via screenshot if useful)
- No interaction. No zoom. Static.
- A sixth row with plain text: candidate name, parameter count, computation time per render

Wisdom reviews, eliminates obvious losers first, then picks the leader (or says "none of these — back to the drawing board").

## What Stage 2 Does NOT Do

- Does not implement zoom, pan, expand, collapse
- Does not hook into the v2 canvas
- Does not write production code — this is a play/prototype
- Does not commit to a direction — output is a visual, not a rewrite

## Stage 2 Open Questions

1. **Is "static render" enough to judge?** A spiral may look crowded in static but beautiful when the user zooms in. A circle-pack may look elegant in static but frustrating to navigate. We will judge on static alone for Stage 2 — interaction cost is a Stage 3 concern. The risk: we pick something that static-tests well and interactively feels wrong.
2. **How many expansion states to test?** Proposed: 3 — (a) only root + direct children expanded (the default), (b) one deep branch expanded (simulating a user browsing), (c) all directories expanded (the stress test). Each candidate × each state = 6 images.

---

# STAGE 3 — Full Interactive Build (DEFERRED)

**Spec TBD.** Will be written after Stage 2's outcome is known. The interactive build's shape depends on which candidate won Stage 2:

- If Candidate A (spiral) won: Stage 3 integrates the spiral layout into the `Simulation` interface, adds post-hoc hulls as an SVG layer, hooks expand/collapse with position-interpolation transitions, and fixes the known hit-box bug.
- If Candidate B (circle-pack) won: Stage 3 integrates d3.pack with d3-zoom + DOM culling, removes the radial layout code entirely, and ports centering/search to work with nested circles.
- If neither won: Stage 3 does not exist; we revisit the Think Deep's Open Threads (slime-mold usage memory? FoamTree port? different reframe entirely?).

---

## Verification Plan (All Stages)

| Stage | Verification |
|-------|-------------|
| 1 | Out-degree distribution script runs; bag classification passes known cases (inbox flagged, claude-system/skills not flagged); post-change canvas screenshot shows visibly more space than pre-change; Wisdom's eye test. |
| 2 | Static bakeoff HTML opens; both layouts render against real data at 3 expansion states; Wisdom picks one or neither. |
| 3 | Full interactive canvas renders the winner; existing `#demo=expandBranch` / `#demo=expandAll` / `#demo=clickDir` checks pass; transitions smooth; hit-boxes correct; eye test. |

---

## What We Carry Forward (From SPEC-PHYSICS and v2 Work)

- `measureNode(d)` canvas-width helper
- `Simulation` interface seam — any Stage 3 layout plugs into it
- `getVisibleTree` + `state.expandedPaths` — extended for bag-node support
- Node button anatomy (rect + label + heat color)
- Reader, tabs, search, centering, zoom, settings, legend, watch-server — ALL UNTOUCHED
- Demo hooks (`#demo=*`) — kept as verification harness
- `_leafCount` computation (already in `app.js` line 190) — reused for both bag detection (relative threshold uses it implicitly through child counts) and for leaf-weighted sizing in Candidate A
- `_prevPositions` cache — kept for animation interpolation

## What We Potentially Throw Out (If Stage 3 Happens)

Depends on Stage 2 outcome. If circle-pack wins: the full polar-radial code goes. If spiral wins: the existing `allocateAngles` recursion goes, but leaf-weighted sizing and convex-hull membranes are net-new. Either way, no code is deleted before Stage 2 decides.

---

## Session-Level Learnings This Spec Encodes

1. **Falsification order > design elegance.** Better to ship the cheapest fix first and discover it was enough than to write the prettiest algorithm.
2. **Name parameters honestly.** "One formula" is marketing if the surrounding system has five knobs. This spec lists every knob in every stage.
3. **Prior art answers "should we build?" as much as "how?".** The Think Deep's three-stream NO told us this is novel territory — which also told us there's no obvious rescue ladder if we fail. Discipline in stage-gating is how we survive that.
4. **Bag ≠ tree.** The 469-child inbox is the clearest example, but this distinction likely applies elsewhere. Future work may generalize: what other directory patterns have different ideal renderings (time-ordered journal entries? dated chronicle files? photo collections)?

---

## Stage-Gate Approvals (Fill In As We Go)

- [ ] Stage 1 approved to implement (Wisdom sign-off)
- [ ] Stage 1 ships — eye test passes OR fails; decision recorded
- [ ] Stage 2 approved to prototype (only if Stage 1 eye test fails)
- [ ] Stage 2 bakeoff reviewed; candidate chosen OR both rejected
- [ ] Stage 3 spec written (only after Stage 2 chooses a candidate)
- [ ] Stage 3 approved to implement
- [ ] Stage 3 ships

# SPEC — Layout Engine Redesign

**Authored:** 2026-04-16 18:40 PDT, Phase 3 iteration reset
**Supersedes:** The force-simulation-based layout in `templates/v2/app.js` (current `createMembraneSimulation` + `rectCollide`)
**Premise:** Instead of tuning physics until overlap is "small enough," design a deterministic layout where overlap is **zero by construction**. Integrate incrementally into the existing codebase — not a rewrite.

---

## Goal

A radial tree layout that:

1. **Guarantees zero overlap** between any two node buttons, at any expansion state, without a physics pass.
2. **Reads as elegant and simple** — the algorithm should be explainable in two sentences, and the user should feel that "every node has its natural place."
3. **Respects the Figma button anatomy** — nodes are rectangles with labels inside, sized to their content, arranged radially around a root.
4. **Handles the full ecosystem** — 5,000+ nodes, collapse/expand interactions, smooth transitions.
5. **Drops into the existing `Simulation` interface** — no rewrite of rendering, tabs, reader, legend, OPEN FILES dropdown, click-to-center, or any other behavior already wired up. Only the layout math is replaced.

---

## The Core Insight

The current physics-based approach fights geometry instead of respecting it. At depth 5 with ~2,000 leaves and ~150px average label widths, placing every leaf on a single ring requires a circumference of ~300,000px — but a sane ring spacing only provides ~15,000px. No collision-force tuning can fit 20× the content into the available space. The physics only has two failure modes: either it lets things overlap (collision weak), or it pushes them apart radially and ruins the tree metaphor (collision strong). There's no sweet spot inside this model, and that's what we've been trying to find.

The elegant solution: **don't try to place everything on one ring**. Give every subtree an angular wedge proportional to its size, and let depth-spacing adapt to the density of each wedge. Geometry does the work; physics becomes unnecessary.

---

## The Algorithm (two sentences)

> **Each directory claims an angular slice of its parent's slice, proportional to its descendant count. Within each slice, children are placed on their depth's ring at the slice's center angle; ring spacing at every depth is the minimum that fits the widest label at the narrowest slice at that depth.**

That's the whole thing. No forces. No iterations. Deterministic.

---

## Detailed Mechanics

### Step 1 — Compute subtree weights

For every node, compute `leafCount(node)` = number of visible leaf descendants (or 1 if the node is itself a leaf). This is a single post-order traversal: O(n).

### Step 2 — Recursive angular allocation

Starting with the root occupying the full 2π range:

```
allocate(node, angleStart, angleEnd):
    node.angle = (angleStart + angleEnd) / 2
    if node has visible children:
        totalWeight = sum of child.leafCount for each visible child
        cursor = angleStart
        for child in children (sorted for stable layout):
            slice = (angleEnd - angleStart) * (child.leafCount / totalWeight)
            allocate(child, cursor, cursor + slice)
            cursor += slice
```

Invariant: **sibling angular ranges are disjoint and contiguous** — every child owns a clean wedge.

### Step 3 — Compute adaptive ring spacing

For each depth D in the visible tree:

- `minArcAtD` = smallest angular-slice width at that depth × nominal radius
- `maxLabelAtD` = widest measured label width of any node at that depth, plus padding

The required radius at depth D such that the narrowest wedge fits its widest label:

```
radius[D] = max(radius[D-1] + minRingGap, (maxLabelAtD / minArcAtD) * someConstant)
```

Concretely: we walk depths outward, and at each one we bump the radius as needed so that the narrowest slice's arc-length exceeds the widest label at that depth. This is a single linear pass, O(depths × nodes).

### Step 4 — Place nodes in polar coordinates

For each visible node: `(x, y) = (radius[depth] × cos(angle - π/2), radius[depth] × sin(angle - π/2))`. Root sits at origin.

### Step 5 — Render

No changes — the existing render code already reads `(d.x, d.y, d.width, d.height)` from each node. The new layout writes those same fields; everything else downstream is unchanged.

---

## Invariants

These must hold at all times — if any fails, the implementation is wrong:

1. **Disjoint wedges:** for any two sibling nodes A and B, their angular ranges do not overlap.
2. **Sufficient arc:** for any node N at depth D, its angular wedge × radius[D] ≥ its label width + padding.
3. **Containment:** every descendant's angular range lies inside its ancestor's angular range.
4. **Determinism:** given the same tree, the layout produces identical coordinates. No randomness, no seeded rng.
5. **Overlap count = 0:** the `#demo=expandBranch` and `#demo=expandAll` overlap counters (already wired in this session) must return zero for every test case.

---

## What We Carry Forward From This Session

Real gains — do not throw out:

- **Simulation interface seam** (`{ seed, run, measure, tick }`) — the new layout implements the same interface, just with different internals. The enter-point `sim.run()` simply writes node positions and returns. No iteration loop, no promise chain.
- **`measureNode(d)` canvas-measurement helper** — still needed to know label widths.
- **Node button anatomy + `nodeVisual()` + color legend** — untouched. These are correct and Wisdom-approved.
- **File reader with `hidePill` fix** — untouched.
- **Click-to-center (`centerOnNode`)** — untouched. Works with any layout.
- **Expand/collapse mechanics** — the tree pruning in `getVisibleTree` + `state.expandedPaths` stays the same. Only the positions change.
- **Demo hooks** (`#demo=clickFile`, `#demo=clickDir`, `#demo=expandBranch`, `#demo=expandAll`) — carry forward, they're our verification harness.
- **Overlap counter via DOM-attr** — the single most valuable debug pattern found this session. Use it to verify the new layout. Should return zero for all demo scenarios.
- **Connector rendering** — the center-to-center straight lines between parent and child still work. No changes.
- **OPEN FILES dropdown, tabs, search, settings panel, trackpad gestures** — all untouched.

---

## What We Throw Out

Dead code after the redesign. Delete cleanly — leaving it in "just in case" pollutes the engine:

- `createMembraneSimulation()` — replaced by `createDeterministicLayout()`.
- `rectCollide()` — no longer needed. Collision is impossible by construction.
- `d3.forceSimulation` + `d3.forceLink` + `d3.forceManyBody` + `d3.forceRadial` — all gone. The only d3 we need from now on is `d3.hierarchy`, `d3.select`, `d3.zoom`, `d3.quadtree` (for future search) — no force module at all.
- `velocityDecay`, `alphaDecay`, `alphaMin`, iteration-budget scaling — all irrelevant.
- `SETTLE_MAX_ITERATIONS`, `RESETTLE_ITERATIONS`, `SETTLE_ALPHA_MIN` constants — gone.
- `_prevPositions` cache — **keep** for smooth transitions during expand/collapse (we still want nodes to animate from old positions to new ones), but its role is now "previous-position cache for animation interpolation," not "physics seeding."

---

## Learnings Carried Forward (Not Code — Wisdom)

These are session-level insights that should inform the redesign and future work:

1. **Geometry beats physics for hierarchical data.** A recursive partition of space — whether angular, circular, or rectangular — guarantees properties that a force simulation can only approximate. Use physics only when geometry genuinely cannot specify the layout (which is almost never, for trees).
2. **When iteration stops compounding, architecture is the answer.** This session's 80% overlap reduction cost a lot of tuning for a result that still failed the user's eye test. The next 80% would have cost even more. Reset.
3. **"Elegant and simple" is an output criterion, not a style preference.** If the algorithm needs three parameters to produce a good layout, those parameters are artifacts of the algorithm being wrong, not signals that the user should tune more.
4. **Partial wins deserve surgical preservation.** The file-reader fix, the color semantics rework, the legend, click-to-center, and the DOM-attr debug pattern are all legitimately good. The redesign must keep them, not start over with them.

---

## Open Questions (Resolve Before Implementation)

These are the decisions a fresh session should confirm with Wisdom before coding:

1. **Canvas size vs. readability trade-off.** If the full ecosystem needs a 30,000×30,000 virtual canvas for every label to fit, is that OK (user pans/zooms to read detail) or should labels truncate aggressively at deep rings to keep the canvas bounded?
2. **Leaf-cluster behavior.** When one folder has 500+ direct leaf children, should they fan out radially (huge ring) or pack tangentially inside their parent's slice (tree becomes a "blossom" at that folder)? Spec 1 favors the radial default, but adaptive ring spacing may make the canvas oversized in that case.
3. **Sort order.** Alphabetical? By leaf count? By most-recently-modified? Stable across renders is the invariant; the specific order is a product decision.
4. **Should the root's 2π range be fixed at the twelve o'clock position**, or should the algorithm rotate it so the most-visually-weighted subtree lands at the top? The former is deterministic; the latter is prettier. Prefer deterministic.
5. **Transition choreography during expand/collapse.** When a user expands a folder and a subtree appears, do all other subtrees re-allocate their angles (smooth re-layout of the whole tree) or does the new subtree "fit in" without disturbing siblings (fast but less elegant)? Spec recommends the former for coherence.

---

## Verification Plan

1. Write `createDeterministicLayout()` implementing the algorithm above.
2. Drop it into the existing `updateTree` flow behind the `Simulation` interface — one line change.
3. Run the existing `#demo=expandBranch` overlap counter — **must return 0**.
4. Run `#demo=expandAll` overlap counter — **must return 0**.
5. Run `#demo=clickDir` centering check — **must still pass** (centering is layout-independent).
6. Take a cold-open screenshot, a branch-expand screenshot, and a full-expand screenshot. Compare to this session's best output. Goal: visually *less sparse* than the current physics output, with *zero overlap*.
7. Measure: time to lay out the full ecosystem. Must be <200ms (physics was 2–5s). This is a strict improvement — geometry is O(n); physics was O(n² × iterations).

---

## Incremental Implementation Path

To make the change minimally invasive:

1. **Phase A — scaffold** (1 hour): Add `createDeterministicLayout()` alongside `createMembraneSimulation()`. Same interface. Add a `CONFIG.layoutEngine = "deterministic" | "physics"` toggle. Default still physics.
2. **Phase B — implement the algorithm** (2 hours): Angular allocation, adaptive ring spacing, cartesian projection. Test with the overlap counter — iterate on that metric, not on visuals.
3. **Phase C — tune the visuals** (1 hour): Minimum/maximum ring-spacing constraints, slice-sort ordering, label truncation policy for deep rings. Screenshots at each step.
4. **Phase D — swap default + cleanup** (30 min): Flip the toggle to deterministic, delete the physics branch + its constants, remove d3 force imports from the bundle if possible.

Total: ~4–5 hours of focused work. Keeping everything else intact. This is the "implement a system into this" path, not a rewrite.

---

## What "Done" Looks Like

- Cold-open screenshot: 4 nodes, radial, identical visual to today's but generated without physics.
- Branch-expand screenshot (`#demo=expandBranch` on Playful Sincerity): all ~3,000 nodes visible, zero overlap, visually compact and structured (not sparse like today's force-tuned version).
- Full-expand screenshot (`#demo=expandAll`): all ~5,400 nodes, zero overlap, every label legible at 100% zoom on the node or upon pan.
- Overlap counter returns 0 in every test case.
- Click-to-center still works.
- Layout completes in <200ms.
- Chronicle entry summarizing the redesign and pointing at this spec.

---

## Non-Goals

- Not redesigning the visual language. The button anatomy, color system, legend, and reader are frozen.
- Not redesigning tabs, search, or the OPEN FILES dropdown.
- Not addressing the folder-size visual differentiator (already filed separately in `design/2026-04-16-folder-size-visual-differentiator.md`).
- Not pursuing sub-200ms animation polish in this session — correctness first, aesthetics after.

---

## Approval

Requires Wisdom's read and sign-off before implementation. Key decision points to confirm:
- The algorithm (two-sentence description above) — does this feel elegant and simple to him?
- The carry-forward / throw-out split — anything he wants to preserve from the physics branch beyond what's listed?
- Open questions 1–5 — resolve those with explicit answers.

Once approved, a fresh session implements Phase A → D against this spec, not from conversation memory.

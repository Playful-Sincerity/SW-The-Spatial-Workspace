# SPEC — Click-to-Grow Substrate
*Spatial Workspace v2 · Layout mechanism for incremental expansion*
*Date: 2026-04-18 · Status: DRAFT pending Wisdom review*

---

## Goal

Specify the **simplest possible mechanism** that satisfies all agreed layout criteria for the click-to-grow interaction, in a way that is actionable at the code level. Produced via Think Deep (see `research/think-deep/2026-04-18-click-to-grow-substrate/`).

## Context — Why This Spec Exists

Today (2026-04-18) we shipped three tuning passes on the force-directed click-to-grow in `templates/v2-dynamic-alt/`: position-correction bubble, charge/outwardBias skips on the just-expanded node, then velocity-freeze on the just-expanded node. Each reduced drift but did not fundamentally solve it. Wisdom stepped back and asked two questions:

1. **What is fundamentally causing the clicked-folder subtree to "go all the way out"?**
2. **What is the simplest possible math/logic that would solve all the criteria?**

This spec answers both.

## The Deep Cause of Drift (Diagnosis)

**Physics is a wrong-fit substrate for click-to-grow, because physics has no native concept of "minimum disturbance."**

Force-directed simulation models nodes as particles with mass, connected by springs (links), repelled by charge, subject to custom forces. Each tick, net force updates velocity; velocity integrates into position. Over many ticks the system approaches an equilibrium where all forces cancel.

For C (the just-clicked node) to *end up* at "prior position + minimum displacement to resolve overlap with pinned siblings," the sum of all forces at that endpoint must be zero. In our system:

- **Charge from C's new children** → net outward push on C (children are asymmetrically placed along an outward axis, so their repulsions don't cancel).
- **`gentleCenter`** → pulls C toward origin.
- **`outwardBias`** → pushed C outward from its grandparent (we disabled for C today).
- **Link force** → balances at correct parent-child distance.
- **Bubble force** → fires only on overlap.
- **Pin spring** → pulls C toward prior position.
- **`freezeJustExpanded`** (today's fix) → zeros C's velocity after all forces.

Without the freeze, the non-zero residuals from charge + gentleCenter accumulate across ~200 ticks (velocityDecay=0.55 retains 45% per tick) into meaningful displacement. The pin spring at `k=0.35` cannot balance the cumulative push.

**With the freeze, C's velocity is zeroed every tick** — no force can move C via the integrator. Bubble's *direct position correction* remains the only thing that can change C's position. Effectively, we have **reinvented placement by disabling physics for C.** Physics still runs for C's new children, but C itself is now placed algorithmically.

This is the honest diagnosis: *our fixes have incrementally converted the click-to-grow operation into a placement algorithm disguised as a physics sim.* The cleaner path is to remove the disguise — do placement explicitly, delete the physics at click time.

## Agreed Criteria

Restated from today's conversation:

| # | Criterion | Definition |
|---|-----------|------------|
| 1 | **Spatial memory** | Same shape on return. The layout is a *place* the user trains on. Clicking must not retrain them. |
| 2 | **Minimum disturbance** | On expand, only the clicked folder and its new children change. Everything else stays literally still unless mathematically forced. |
| 3 | **No overlap (membrane)** | Subtrees can deform at the boundary but cannot cross — the membrane property. |
| 4 | **Legibility** | Each button readable at current zoom. No wasted leaf. |
| 5 | **Efficient canopy (phototropism)** | Visible viewport well-used — max button area, min structural mass (line length × count), zero overlap. |
| 6 | **Deterministic** | Same clicks in same order → same layout. No randomness. |
| 7 | **Predictable motion** | When something must move, it slides cleanly to a known destination — not a 200-tick settling. |
| 8 | **Scale-resilient** | Same algorithm works for 10 or 10,000 nodes without per-size tuning. |

**How force-directed fares** — fails 1, 2, 6, 7, 8 structurally. Gets 3 and 4 okay. Is poor on 5 (phototropism) because empty middles and far drifts both reduce canopy efficiency.

## The Reframe (Load-Bearing)

From the dream agent (Scenario 3): **click-to-grow is not a layout engine — it is a position-assignment service for new nodes.**

- A node's position is *computed exactly once*, when the node is first revealed by a click.
- Thereafter, the position is a **stored fact**, not a recomputed result.
- `_prevPositions` (which we already have!) becomes the source of truth, not a performance optimization.

Consequences:
- Spatial memory is automatic — positions persist across sessions when stored.
- Drift is impossible — no per-click physics means no per-click drift accumulation.
- The algorithm only runs on NEW children of the clicked folder. Every other node is already placed, and its stored position is honored.

## The Mechanism

Drawing from yesterday's play synthesis + today's dream + today's research (see [research-algorithms.md](research/think-deep/2026-04-18-click-to-grow-substrate/agents/research-algorithms.md)) + the phototropism framing.

**Primary algorithm: Proportional Angular Sector Allocation (balloon/wedge layout).** This is the algorithm mxGraph/draw.io, yFiles BalloonLayouter, and ELK Radial all converge on for interactive radial trees. Ka-Ping Yee et al. (Berkeley 2001) observed it "comfortably accommodates addition and deletion of nodes with only small perturbation of siblings" — exactly our constraint.

Why wedge over phyllotaxis (my original sketch): wedge handles non-uniform subtree weights natively by giving larger subtrees wider angular slices, AND it guarantees no overlap between sibling subtrees by construction (each lives in its own angular wedge). Phyllotaxis treats all children equally — a 200-descendant child and a 2-descendant child get the same angular slice, producing the one-arm-asymmetry yesterday's challenger predicted.

### Per-node state
```
node.position      = {x, y}            # stored, never recomputed for placed nodes
node.radius        = sizeFromWeight(leafCount)
node.isBag         = (immediateChildCount > 50)   # render-mode switch
node.wedgeStart    = angle                        # reserved angular sector (start)
node.wedgeSpan     = angle                        # reserved angular sector (span)
```

The **wedge** is the key new concept: when a node is placed, it is given not just a position but an angular *sector* it owns. Its children must fit inside that sector. Siblings' wedges don't overlap by construction.

### On click to expand a node
```
function expand(node):
  if node.isBag:
    openMembraneRenderer(node)   # grid inside a membrane; skip spatial placement
    return

  children = node.immediateChildren
  totalLeaves = sum(leafCount(c) for c in children where no stored position)

  # The wedge is the parent's reserved sector. Children subdivide it by weight.
  cumAngle = node.wedgeStart
  for each child in children:
    if child.position exists:   # return visitor — honor stored position
      continue
    slice = node.wedgeSpan × (leafCount(child) / totalLeaves)
    childAngle = cumAngle + slice/2

    # Radius: far enough that child circle fits within its angular slice
    # (chord of slice >= child diameter) AND respects size encoding.
    r_geometric = child.circleRadius / sin(slice / 2)
    r_semantic  = base + k × sqrt(leafCount(child))
    r = clamp(max(r_geometric, r_semantic), minR, maxR)

    child.position   = node.position + polar(r, childAngle)
    child.wedgeStart = cumAngle
    child.wedgeSpan  = slice
    cumAngle += slice
    persist(child.position, child.wedgeStart, child.wedgeSpan)

  # Overlap check: if the clicked node itself (with its new children's extent)
  # now overlaps a pinned sibling, resolve via MTV push on clicked node only.
  for each pinned sibling S of node:
    overlap = (node.radius + S.radius) - distance(node, S)
    if overlap > 0:
      push = normalize(node.position - S.position) × overlap
      node.position += clamp(push, maxMagnitude=maxPush)
  # Note: when the parent moves, children move with it because positions
  # are stored RELATIVE to parent in render, or recomputed from stored offsets.

  render(animateFromStoredToNew, duration=400ms)
```

### The root case

For the root node, the initial wedge is 360° (full circle). The root's first expansion fans children around the full circle with wedges proportional to their subtree weight. This gives the initial ecosystem bloom the same algorithm as every subsequent click — we do NOT need a separate force-directed bloom anymore. The algorithm unifies.

### Wedge-share cap (avoid giant-blob asymmetry)

**Problem:** if one root child has 95% of the leaves, it gets 340° of wedge and the other 6 children share 20° — producing a giant blob and tiny slivers. That's technically accurate to weight but visually broken.

**Fix:** no single child's wedge can exceed `maxWedgeShare = 60%` of the parent's wedge. When a child exceeds the cap, clamp its wedge to 60% and redistribute the remainder proportionally among the others.

### Deterministic jitter (avoid "too regular" complaint)

Pure wedge layout can look mechanical. Add a small deterministic angular offset per child — seeded by the path hash, so it's reproducible but breaks visual uniformity:

```
jitterSeed = hashPath(child.path)
jitter = ((jitterSeed mod 1000) / 1000 - 0.5) × min(slice × 0.2, 5°)
childAngle += jitter
```

Jitter is clamped to ±5° AND ≤20% of the wedge span, so children never leave their wedge. Determinism is preserved (same path → same jitter).

### Sibling overlap is impossible by construction

Because each child owns an exclusive angular wedge within its parent's wedge, **children of different parents cannot overlap by construction**. This eliminates the same-parent sibling cleanup step entirely. The only overlap check is the clicked-node-vs-pinned-sibling MTV (the parent itself might grow large enough to overlap a cousin).

### Constants (named, small set)

| Name | Value | Purpose |
|---|---|---|
| `base` | 80px | Floor distance parent→child |
| `maxR` | 280px | Ceiling distance parent→child |
| `minR` | 60px | Hard minimum (legibility) |
| `k` | ~14 (TBD) | Semantic radius coefficient |
| `bagThreshold` | 50 | Immediate-child count → membrane renderer |
| `maxPush` | 30px | Cap on clicked-node MTV displacement |
| `GOLDEN_ANGLE` | 137.5° | Used only for root's first fan (visual balance) |

Seven constants total. All geometric or data-driven. **No physics constants.**

### What is NOT in the mechanism

- No force simulation at click time.
- No velocity, integration, or decay.
- No iterative relaxation.
- No angular-occupancy-map query for "where can I bloom?" — wedges are pre-allocated at placement time, so no search is needed.
- No randomness.

### What is NOT in the mechanism

- No force simulation at click time
- No velocity, no integration, no decay
- No iterative relaxation
- No per-click re-layout
- No randomness (seed jitter, etc.)

### Interaction with existing infrastructure

- **`_prevPositions`** becomes load-bearing. Extended: persist to disk (localStorage or a JSON in the project) so positions survive page reload. Phase 2 feature — ship to localStorage first.
- **Force-directed sim remains** only for the INITIAL ecosystem bloom (first render of the whole tree). The organic settling aesthetic is valuable there. Click-time physics is retired.
- **`centerOnNodeWithChildren`** still fires after expansion.
- **Rendering** uses D3 transition for old→new position animation (400ms). No per-tick render.

## Why This Satisfies Every Criterion

| # | Criterion | How |
|---|-----------|-----|
| 1 | Spatial memory | Stored positions re-used on return; new children placed deterministically by parent + index |
| 2 | Minimum disturbance | Only new children + possibly same-parent siblings shift; nothing else moves |
| 3 | No overlap | Deterministic overlap cleanup after placement |
| 4 | Legibility | Size-from-leafCount formula (unchanged from current) |
| 5 | Efficient canopy | Outward-facing fan + weighted slices naturally fills available arc; no drift to corners |
| 6 | Deterministic | Fixed golden-angle + stored bloom direction + stored positions = same output every run |
| 7 | Predictable motion | Single known target per node; animation is the render, not a 200-tick settle |
| 8 | Scale-resilient | O(children + conflicts), independent of total tree size |

## Open Questions (Honest)

From the dream agent:

1. **Absolute vs. relative position storage.** When the overlap cleanup nudges a parent 25px, its already-placed children need to move too. Two options: (a) store absolute coords and walk the subtree to re-apply deltas; (b) store positions relative to parent. (b) is cleaner but means a full render pass walks from root each time. For ~3000 nodes this is fine. Decision: **relative storage, render-time absolute computation**.

2. **Re-bloom gesture.** If the user wants to forget stored positions for a subtree (e.g., files added outside the canvas, topology looks wrong), what gesture discards them? Proposal: shift-click = "re-bloom, discard cached positions for this subtree." Hover tooltip: "Shift-click to re-layout this folder."

3. **The k constant.** `k=8` vs `k=14` produce meaningfully different size orderings for small folders. Needs a static render on real data to choose. This is yesterday's Stage 2 test, restated.

Added today:

4. **Bloom direction when a stored node has moved.** If a parent was nudged by overlap cleanup after its children were already placed, what bloom direction do grandchildren inherit? Proposal: bloom direction is cached at placement time, never recomputed. This means a nudged parent's grandchildren still fan in the original direction — fine, because the parent only nudges up to 30px.

5. **Phototropism as a post-placement score, not a driver.** We don't optimize for phototropism during placement. After Stage 3 ships, add an observer that computes the phototropism score (visible button area ÷ line mass, penalized by overlap) on each render and logs it. Use the number to compare implementations and tune constants.

## Implementation Roadmap

Aligned with yesterday's staging, updated with today's clarity:

### Stage 0 — Out-degree survey (30 min)
- Run a script to tabulate how many folders have how many immediate children. What's the distribution? Where should `bagThreshold` sit? Yesterday's spec recommended this; still not done.

### Stage 1 — Bag-node detection + collapse-by-default on `v2/` (≤1 session)
Yesterday's cheapest test, still not done. Do this before the wedge rewrite.
- Add `isBag = immediateChildCount > bagThreshold` in the data pipeline.
- Default-collapse bag nodes.
- When a bag is clicked, render grid-inside-membrane (new component, ~100 LOC).
- Apply to existing `templates/v2/` without changing layout algorithm.
- **Kill switch**: if this alone makes the canvas acceptable, consider Stage 2 optional rather than required.

### Stage 2 — Prototype wedge-based placement in `templates/v3-wedge/` (1 session)
- New sandbox: `templates/v3-wedge/` (clone from `v2/` + Stage 1 changes).
- Implement the wedge layout as the primary algorithm (initial bloom AND click-to-grow use the same code path).
- Include: wedge-share cap, deterministic jitter, bag-renderer integration.
- Persist positions to localStorage on every click.
- Test: open canvas, click 10 folders in sequence. Close browser. Reopen. Compare.
- **Kill switch**: if wedge squeeze at depth 5+ is unacceptable, either (a) raise the minimum wedge span and push children outward more aggressively, or (b) introduce "zoom-into-subtree" as a mode for deep drilling. Both are smaller than pivoting algorithms.
- **Fallback**: if wedge looks bad on real data, prototype fCoSE `fixedNodeConstraint` as Option 3 from research (~120 LOC, production-validated, less deterministic but aesthetically polished).

### Stage 3 — Interactive polish + cross-session storage (1-2 sessions)
- File-backed position storage via the watch server (so positions survive across browsers, not just localStorage).
- Re-bloom gesture (shift-click on a folder discards its stored layout; children re-compute on next expand).
- Phototropism score observer (post-placement, logs score to console; purely diagnostic).
- Retire `templates/v2-dynamic/`, `templates/v2-dynamic-alt/` — physics experiments. Keep `templates/v2/` (baseline) and `templates/v3-wedge/` (new canonical).

### Stage 4 (future, out of scope now)
- Zoom-into-subtree mode for deep drilling (cousin of Muse's nested canvases).
- Phototropism-based re-layout mode as an opt-in "re-optimize my canopy" button.
- Slime-mold / usage memory layer (yesterday's open thread — layouts drift based on user navigation frequency).

## What Gets Deleted

If Stage 2 ships:

- All click-time force forces: `outwardBias`, `subtreeBubble`, `pinSpring`, `gentleCenter` applied at click. (These remain for the initial bloom render only.)
- `freezeJustExpanded` (today's fix) — unnecessary once physics isn't running at click time.
- `_carried` / `_justExpanded` / `fx`/`fy` plumbing on click. Replaced by stored-position honoring.
- `pinStrength` slider. It becomes irrelevant.

## Honest Risks

1. **Wedge squeezes at deep levels.** After 4-5 expansions along one path, the wedge for each level's children gets narrow. At depth 6 with uniform subdivision, wedges can be 10-15°, which squashes children visually. Mitigate: enforce a minimum wedge span (e.g. 20°) and push children outward to make room; if minimum cannot be honored, the next level forces a "zoom-into-subtree" mode that treats the clicked node as the new root with a fresh 360° wedge. This is the fractal boundary where a canvas-level spatial map becomes a sub-canvas.

2. **`maxPush=30` may be too small for some configurations.** When the clicked node must move to clear an overlap with a pinned sibling, 30px may be insufficient. Mitigate: if a pass leaves overlap, iterate once more (bounded — at most 3 passes). If still overlap, log and render anyway (visible as slight crowding, not runaway drift). Raise cap to 60px if clear crowding is a common failure.

3. **Stored positions become stale when file tree changes.** If a folder is renamed, its stored position remains under the old path. Mitigate: position store keyed by path; on path change, re-bloom subtree automatically. Watch server can surface this.

4. **User might expect re-layout on large changes.** If half the ecosystem moves (major file reorg), user might want the canvas to reflow. Proposal: "Re-bloom all" gesture (menu item) that clears stored positions and re-runs initial force-directed bloom. Emergency reset.

5. **Wedge allocation looks mechanical.** Research noted: wedge layouts can feel "too regular" compared to force-directed organic feel. Mitigate: add small per-child angular jitter (deterministic, seeded by path hash) of ±2-5° within the assigned wedge. Breaks visual uniformity without sacrificing determinism or stability.

## Success Criteria (Measurable)

After Stage 2 lands:

1. Click a folder. Only its new children appear. No other node moves by >30px. ✓
2. Click-through of 10 folders in sequence. Last click produces same result as if user had done them in any other order (modulo bloom direction). ✓
3. Close browser. Reopen. Canvas is identical to pre-close. ✓
4. Click a bag node (HHA/inbox). Grid opens inside membrane. Other nodes untouched. ✓
5. Total LOC for the new `expand()` function: <200. ✓
6. Zero tunable parameters whose correct value is "whatever looks right" — all constants are geometric, documented, defensible. ✓

---

## Appendix: References

- [research/think-deep/2026-04-17-layout-rethink.md](research/think-deep/2026-04-17-layout-rethink.md) — yesterday's full think-deep synthesis (three-stage recommendation, landscape survey)
- [research/think-deep/2026-04-17-layout-rethink/agents/play-synthesis.md](research/think-deep/2026-04-17-layout-rethink/agents/play-synthesis.md) — yesterday's play (golden-angle + size encoding + bag detection + slime mold)
- [research/think-deep/2026-04-17-layout-rethink/agents/challenger.md](research/think-deep/2026-04-17-layout-rethink/agents/challenger.md) — yesterday's challenger (predicted drift; warned against skipping Stage 1)
- [research/think-deep/2026-04-18-click-to-grow-substrate/agents/dream-scenarios.md](research/think-deep/2026-04-18-click-to-grow-substrate/agents/dream-scenarios.md) — today's dream scenarios (seven walks; mechanism sketch)
- [research/think-deep/2026-04-18-click-to-grow-substrate/agents/research-algorithms.md](research/think-deep/2026-04-18-click-to-grow-substrate/agents/research-algorithms.md) — today's algorithms research (pending)
- [knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md](knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md) — today's phototropism framing
- [ideas/2026-04-18-phototropism-layout-philosophy.md](ideas/2026-04-18-phototropism-layout-philosophy.md) — phototropism expanded
- [chronicle/2026-04-18.md](chronicle/2026-04-18.md) — today's full session log

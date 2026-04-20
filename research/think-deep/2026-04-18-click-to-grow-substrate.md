# Think Deep: Click-to-Grow Substrate for Spatial Workspace v2

*Generated 2026-04-18 | Phases: Dream (complete) + Research-Algorithms (pending) + Structure + Challenge + Synthesis | Depth: Deep*
*Parent question set: (1) Why does the just-clicked node drift so far? (2) What is the simplest possible math/logic that satisfies every agreed criterion?*

---

## The Short Answer

The drift isn't a tuning problem — it's a substrate problem. **Physics has no native concept of "minimum disturbance," so tuning it to produce minimum disturbance is working against its grain.** Every fix we shipped today (position-correction bubble, charge zero, outwardBias skip, velocity freeze) has incrementally converted our click-to-grow operation from a physics simulation into a placement algorithm disguised as one. The simplest math is to drop the disguise: **do placement directly, delete physics at click time**. The mechanism is a ≤200-LOC `expand()` function that assigns positions once per node, stores them, and never recomputes — reframing click-to-grow from "layout engine" to "position-assignment service." The full spec is at `SPEC-CLICK-TO-GROW.md`; this document explains the thinking.

---

## What We Discovered

The session started with a screenshot — two clusters of nodes at opposite corners of a vast dark canvas, the clicked folder ejected hundreds of pixels from where it used to be. The drift was worse after three rounds of fixes than the user's patience should have to accommodate. So we stepped back.

The deep question was Wisdom's: *"What is making this go all the way out? What is the simplest possible structure we can build?"* That second question is where most think-deep questions hide their answer — in what gets *removed*, not what gets added.

### The diagnosis

Force-directed simulation is an ODE integrator. Each tick: net force → velocity update → position update. Over many ticks, the system approaches equilibrium where all forces cancel. For a node to *end up* at position X, the sum of all forces at X must be zero.

Our clicked node C had seven different forces acting on it — link, charge, collision, outward bias, bubble, pin-spring, center pull. For C to end up at "prior position + minimum overlap correction," we'd need every residual of every force at that position to sum to zero. The pin spring at k=0.35 couldn't balance the sum. Each tick, charge from C's asymmetrically-placed new children injected a little outward velocity. Velocity decayed 55% per tick but compounded over ~200 ticks into meaningful drift.

Today's `freezeJustExpanded` fix was the honest concession: *we set C's velocity to zero every tick so nothing velocity-based can move it.* Which means we accept that physics isn't doing C's placement — bubble's direct position correction is. Physics runs, but C ignores it.

That's the moment the problem changed shape. **We'd reinvented placement by disabling physics for C.** If placement is what's actually happening, physics is dead weight. Remove it.

### The reframe

The dream agent's seven scenarios converged on one reframe: *click-to-grow is not a layout engine, it's a position-assignment service for new nodes.* Every node's position is computed *exactly once*, when the node is first revealed by a click. From then on, the position is a stored fact.

This is not a clever optimization. It's a different conception of what the algorithm *is.* A layout engine computes where things go when the data changes. A position-assignment service computes where a specific new thing goes, once, and commits it. The spatial memory criterion — which we've been trying to approximate with pinning — becomes automatic, because positions are stored, not recomputed.

The immediate consequence: most of yesterday's hard problems dissolve. No per-click drift, because there's no per-click physics. No "have we settled yet?" question, because there's no settling. No surprise re-layouts across sessions, because positions persist. The 469-child inbox problem never manifests, because bag nodes get a different rendering mode (yesterday's Stage 1, still untested).

### The mechanism

The dream agent's scenarios pointed toward a phyllotaxis+fan hybrid. Then the research agent's findings shifted the recommendation: **proportional angular sector allocation ("balloon/wedge" layout)** is both simpler and better-validated than phyllotaxis for this problem. It's what mxGraph/draw.io, yFiles BalloonLayouter, and ELK Radial all ship.

**Why wedge over phyllotaxis:** Phyllotaxis gives every child the same angular gap regardless of its subtree weight — a 200-descendant child and a 2-descendant child get identical angular space. This produces the "one huge arm, tiny dots" asymmetry yesterday's challenger predicted as the confidence risk. Wedge allocation natively handles non-uniform weights: each child gets an angular sector proportional to its leaf count. And wedge containment means sibling subtrees cannot overlap *by construction* — the algorithm itself enforces the membrane property.

**On click to expand a node (wedge/balloon layout):**
1. If bag node (>50 immediate children), open membrane renderer. Return.
2. Each child receives an angular wedge within the parent's reserved wedge, sliced proportionally to its leaf count.
3. Each child is placed at the center of its wedge, at a radius derived from both (a) geometric fit (chord ≥ child diameter) and (b) semantic weight encoding (`base + k*√leafCount`).
4. Each child stores its own wedge start/span for its future children.
5. If the clicked node (with its new descendants) now overlaps a pinned sibling, apply minimum translation vector (MTV) to the clicked node only — capped at 30px.
6. Animate old→new via D3 transition.

Seven constants total: base, maxR, minR, k, bagThreshold, maxPush, GOLDEN_ANGLE (used only for root's first fan). No physics constants. Implementation is <200 LOC, with production existence proofs in at least three shipped tools.

### Why the criteria collapse into the mechanism

Each agreed criterion maps to a specific piece of the mechanism:

- **Spatial memory** — stored positions persist; the algorithm runs once per node and never touches placed nodes again.
- **Minimum disturbance** — only new children and (rarely) their direct siblings shift. Nothing else moves.
- **No overlap** — deterministic push in step 7 resolves overlap in one pass. No accumulating drift.
- **Legibility** — size formula `base + k*sqrt(leafCount)` (unchanged from today's code) encodes weight.
- **Efficient canopy** — outward-facing fan + weight-proportional slices naturally fills available arc, no empty-middle drift.
- **Deterministic** — fixed constants + stored bloom direction + stored positions = same result every run.
- **Predictable motion** — single known target per node; animation is the render, not a 200-tick settle.
- **Scale-resilient** — O(children + neighbors), independent of ecosystem size.

No criterion requires force balance. No criterion requires emergence. Placement is enough.

### What this reveals about the prior three failed iterations

Yesterday's challenger said this, and it was right: *two layout approaches have failed; each failed iteration consumed a full session; the base rate says the third approach has meaningful failure probability.* Today was the third iteration, and it did fail in the predicted way — drift got reduced but not solved. The pattern across all three: we kept trying to make the force engine *behave* like a placement system instead of replacing it with one.

The pivot should have happened after the first failed iteration. Stage 1 of yesterday's spec (bag detection + collapse-by-default on the existing radial layout) would have tested the cheapest hypothesis. We skipped it. Today, we pay the cost.

---

## The Landscape

### Why the physics substrate keeps producing drift

Three independent mechanisms inject non-zero velocity into the just-clicked node every tick, none of which the spring can cancel at equilibrium:

1. **Charge from new children.** The clicked node's new children are placed along an outward axis (not symmetrically around 360°). Their charge repulsions have a net outward component on the parent. Small per tick; compounds over ~200 ticks.
2. **Gentle center pull.** Pulls every non-root node toward origin with k=0.005. For a node 500px from origin, this is 2.5 units/tick of velocity added. Damped, but nonzero.
3. **Outward bias / link forces with off-target geometry.** Even after today's fixes, the pin-spring k=0.35 cannot match the sum of residuals at the prior-position attractor.

The systemic property: **any force field with multiple non-cancelling residuals at the desired endpoint will drift.** Physics would only work if we could precisely balance all forces at the endpoint. That's a harder optimization than just computing the endpoint directly.

### The phototropism framing, and what it adds

Wisdom's phototropism metaphor — eyes as light, buttons as leaves, lines as structural mass, overlap as wasted leaves — is not a layout algorithm. It's an **objective function**: a way to score any layout and compare implementations. `score = leaf_area - α·line_mass - β·overlap_area`.

The most honest read: phototropism is a **post-placement diagnostic**, not a placement driver. We compute positions deterministically using the mechanism. Then, optionally, we compute the phototropism score and log it. Over time, the score number informs whether we're drifting toward worse or better layouts. That's enough utility for v1 — we don't need phototropism-driven re-layout yet.

Motion cost is phototropism's missing term (captured in today's chat): real trees don't penalize themselves for reshaping, but we do, because constant reshuffling destroys spatial memory. Full objective: maximize light, minimize displacement from last layout. The mechanism hard-codes the motion-cost term to infinity (except for new children), which means we're effectively solving the motion-cost-bounded version of phototropism.

### The decision landscape

Three primary paths, ranked by cost × risk × information value:

**Path A — Stage 1 first (bag detection + collapse defaults on existing layout, ≤1 session).** Yesterday's cheapest test, still not done. Minimal code, preserves existing spatial memory, answers the question "is the layout algorithm actually the problem?" If the canvas looks good after this alone, we stop. Confidence Stage 1 resolves the visual pain: 0.70.

**Path B — Build the new mechanism in `templates/v3-placement/` (1 session after Stage 1).** Prototype the deterministic placement algorithm. Render on real data. Compare side-by-side with `v2/` + Stage 1 and with `v2-dynamic-alt/` (today's physics). Confidence B lands a visually acceptable result: 0.75 (higher than yesterday's estimate because we've now thought through the specific mechanism).

**Path C — Keep tuning physics (the path we were on).** Reduced to "polish the drift-reduction further" and hope it's enough. Confidence that physics alone lands all criteria: 0.25 (low, based on today's evidence).

The order is A → B → C as fallback. If B ships and passes eye-test, C is retired.

### What gets deleted if B ships

- All click-time force forces (`outwardBias`, `subtreeBubble`, `pinSpring`, `gentleCenter`) applied at click. Kept for initial bloom.
- `freezeJustExpanded` (today's fix).
- `_carried`, `_justExpanded`, `fx`/`fy` plumbing on click.
- `pinStrength` slider.
- Three parallel v2-dynamic templates (`v2-dynamic/`, `v2-dynamic-alt/`).

Simplification is real.

---

## Recommendations

### Primary recommendation

**Ship Path A (bag detection + collapse defaults on `v2/`) next, before any further physics work or new-mechanism work.**

This is yesterday's Stage 1, still untested. If it resolves the visual pain alone, the entire substrate pivot becomes unnecessary — we keep the current radial layout, add the bag-node renderer, and ship. Wisdom's existing spatial memory is preserved.

- **Confidence**: 0.70
- **Assumptions**: bag-node rendering (grid inside membrane) doesn't feel jarring next to radial clusters; the existing radial layout produces acceptable output when the 469-child inbox isn't in the input
- **Strongest counter**: Wisdom said "organic > grid" in prior design reviews — grid-inside-membrane may fail aesthetically even with the rest of the layout fixed. If so, Path B is needed.
- **What would change our mind**: eye-test of Stage 1 result fails aesthetically → proceed to Path B

### Secondary recommendation (if A passes)

**Land the phototropism observer** (post-render diagnostic, logs score to console) without changing layout. Gives us data to compare `v2 + Stage 1` against future experiments. Adds ~50 LOC. Low risk, high information value.

### Conditional recommendation (if A fails aesthetically)

**Ship Path B (deterministic placement in `templates/v3-placement/`).** The mechanism is specified in `SPEC-CLICK-TO-GROW.md`. Implementation effort: 1 session for the algorithm + overlap cleanup, 1 more for cross-session position storage and re-bloom gesture.

- **Confidence**: 0.75 (conditional on Stage 1 not resolving alone)
- **Assumptions**: a static render of the algorithm on real tree data produces acceptable output without the pathological one-arm-asymmetry yesterday's challenger predicted
- **Strongest counter**: three layout attempts have now failed; base rate suggests 50%+ failure probability on novel algorithms. The mechanism has not been rendered. Unknown until tested.
- **What would change our mind**: static render of Path B looks wrong → fall back to d3.pack circle packing (Option 1 from yesterday — production-proven)

### What would change our mind globally

- Wisdom reports from real usage that spatial memory matters less than overview → criterion 1 weakens, and force-directed becomes more viable
- Ecosystem tree stops changing (no new files) → Path A becomes trivially sufficient
- Wisdom requests "re-optimize for light" as an active feature → phototropism moves from observer to driver, changing the landscape substantially

---

## Open Threads

**1. Absolute vs. relative position storage.** We recommend relative (each node's position stored as offset from parent). Tradeoff: render traverses tree from root each time (O(n), fast for 3800 nodes) but parent nudges automatically propagate. Alternative: absolute storage, explicit descendant update on parent nudge. Decision can defer to implementation time.

**2. Re-bloom gesture.** When the user wants to discard stored positions for a subtree (stale layout, bad first placement), what triggers it? Proposal: shift-click. Needs UX eye-test.

**3. The `k` constant.** `k=8` vs `k=14` produces meaningfully different size orderings for small folders. Static render on real data resolves. This IS Stage 2 from yesterday's synthesis; has not run.

**4. Bloom direction persistence.** Cached at first placement, never recomputed. What if the user explicitly wants to re-bloom? Same question as Thread 2.

**5. Slime mold layer (future).** Yesterday's play surfaced usage-memory as THE mechanism that differentiates Spatial Workspace long-term. Out of scope for Path A or B, but flagged as the next big direction after v3-placement stabilizes.

**6. "GitHub should adopt this" positioning.** Wisdom mentioned (2026-04-18) that the tool is "an operable canvas visualization of a repository" — a positioning that differentiates from GitHub's static repo-visualizer. Worth capturing as product narrative separate from technical spec.

**7. What happens at the boundary between initial bloom (force-directed) and incremental placement (deterministic)?** The initial bloom settles all 3800 nodes into some configuration. On the first click, the clicked node's children get placed deterministically *relative to* the force-settled parent position. If the force sim produced pathological initial positions (e.g., PS Software too close to PS Research), the subsequent placements inherit that problem. Mitigate: make the initial bloom deterministic too (radial seed by depth, size-weighted radii, no jitter). This is actually simple and avoids the randomness criticism.

---

## Sources & Methodology

This think-deep ran on top of yesterday's think-deep (same topic, broader scope). Today's session narrowed to the click-to-grow mechanism specifically.

- **Prior context** (read in full): yesterday's synthesis `research/think-deep/2026-04-17-layout-rethink.md`, its play-synthesis, its challenger, its github research. Those artifacts surveyed the landscape and produced the three-stage recommendation we're building on.
- **Today's diagnosis** (written by the orchestrator based on today's three physics fixes in `templates/v2-dynamic-alt/app.js`): drift is structural, not tuning, because physics has no "minimum disturbance" concept.
- **Today's dream** (`agents/dream-scenarios.md`): seven scenarios walking through specific interaction moments (first click, tight squeeze, return visitor, bag click, deep drill, phototropism dial, drift over time). The reframe — "position-assignment service, not layout engine" — surfaced in Scenario 3 and reshaped everything else.
- **Today's phototropism framing** (`knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md`): eyes as light, buttons as leaves, lines as structural mass. Reframes what the layout optimizes for.
- **Today's research-algorithms** (`agents/research-algorithms.md`): surveyed phyllotaxis, MTV, incremental variants of Reingold-Tilford, d3.pack internals, fCoSE with `fixedNodeConstraint`, yFiles Partial Layout, Graphviz neato `pin=true`, and the broader dynamic graph drawing literature (Beck 2016 survey, Foresighted Layout). Key finding: **the proportional angular sector allocation ("balloon/wedge" layout) is the dominant shipped algorithm for interactive radial trees** — used by mxGraph/draw.io, yFiles BalloonLayouter, ELK Radial. It was the 2001 Berkeley Ka-Ping Yee paper's answer to exactly our problem and remains the best fit. The spec's primary mechanism was revised mid-session from phyllotaxis to wedge on this basis.

Cross-reference the SPEC at `SPEC-CLICK-TO-GROW.md` for the actionable mechanism, constants, implementation roadmap, and success criteria.

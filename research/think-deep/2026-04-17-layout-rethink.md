# Think Deep: Spatial Workspace v2 Layout Rethink

*Generated 2026-04-17 | Phases: Research (web / papers / github) + Play + Structure + Challenge + Synthesis | Depth: Deep*

---

## The Short Answer

Nobody has shipped what you're trying to build — three independent research streams converged on that answer, not because the pieces don't exist but because the integration doesn't. The real discovery of this session is that the layout algorithm was the wrong thing to optimize: you never need to pack 3096 nodes, you only need to pack whatever is currently expanded (typically 20-80). And the actionable next step is not picking an algorithm yet — it's a cheapest-first falsification sequence where the very first test might make the rewrite unnecessary.

---

## What We Discovered

The question that started this session was partly technical and partly existential: *has someone really not done this before?* It felt implausible. Hierarchy visualization is one of the most-studied problems in InfoVis — there are 341 catalogued techniques in Schulz's living bibliography. File/folder canvases have been attempted since Microsoft Research Code Canvas in 2010. Disk-analyzer treemaps have shipped since the 1990s. Surely the combination you want — adaptive packing, membrane-like containment, compression, continuous exploration, and genuine aesthetic quality — exists somewhere.

It doesn't. Three research agents working in parallel reached the same conclusion from different angles.

**Web research found one near-hit and it's not a product.** FoamTree, by Carrot Search, is the only shipped technology that credibly achieves membrane containment and aesthetic organic feel at scale — hierarchical Voronoi polygons with lazy-loading up to 100k nodes. But FoamTree is a JavaScript library embedded in enterprise dashboards, not a standalone app, and its "expose" interaction is click-to-reveal rather than continuous zoom. DaisyDisk ships the most beautiful radial hierarchy in any consumer product, but sunbursts die on outliers — a 469-child ring becomes thin, illegible arcs. Muse has the best zoomable UI in any shipped tool, genuinely spatial, but requires every board to be placed by hand. No consumer product scores above 3.5/5 against your five criteria; FoamTree scores 4.5 but isn't an app.

**Academic research found the pieces, scattered across 40 years.** Every individual criterion has been addressed somewhere. Zoomable treemaps (Blanch & Lecolinet 2007) solved adaptive packing with continuous zoom. Bubble treemaps (Görtler et al. 2018) produced the most organic curved containment boundaries in the literature. Voronoi treemaps (Balzer & Deussen 2005) produced space-filling organic cells. The hyperbolic browser (Lamping, Rao, Pirolli 1995) solved continuous focus+context. Degree-of-interest trees (Card & Nation 2002) solved adaptive screen allocation based on user attention. But the *combination* — organic membrane containment that is also space-efficient, continuously zoomable, stable across expansion states, and handles 469-child outliers — appears nowhere as a unified system. The three-way trade-off between continuity, stability, and aspect ratio was formalized by Bederson, Shneiderman, and Wattenberg in 2002 and has not been resolved in 24 years. The field has explicitly named it as an open problem.

**GitHub research found where people converge when they actually ship.** D3's `d3.pack` — zoomable circle packing with DOM culling — is what people land on when they want membranes that work at scale. GitHub Next's repo-visualizer, vasturiano's circlepack-chart, Cytoscape Web's Cell View all independently chose circle packing. Among open-source algorithms, `d3-flextree` (by Klortho, 364 stars, used by markmap's 12.7k stars) is the cleanest variable-size tree layout. ELK's `mrtree` is the most mature compound-aware radial layout. d3-voronoi-treemap (BSD-3) produces the most organic output of anything portable, but it's iterative and slow — suitable for precomputed static renders, not interactive expand/collapse. The GitHub answer to "what should we mine?" is: d3.pack for the primitive, the vasturiano DOM-culling pattern, a semantic-zoom layer (larsvers gist) on top, and custom adaptive logic for the outlier case. Approximately 400-600 lines of new code sitting on top of existing open-source primitives.

Then the play phase happened, and the problem changed shape.

**The thread-follower found it first: the layout algorithm is the wrong thing to optimize.** Not because layout doesn't matter — because the framing of the problem ("how do we pack 3096 nodes into 2D space") is itself wrong. You never need to pack 3096 nodes. You need to pack whatever is currently expanded. The HHA inbox with its 469 children is a single button until you click it. When you do click it, the layout algorithm doesn't suddenly need to place 469 fan-arranged children — the inbox is a *bag*, not a tree, and bags deserve a different rendering mode: a membrane container with a grid inside, not a spatial fan. The compression floor (~44px touch target, ~12pt readable label) isn't a failure — it's a signal to switch representation modes. This reframe reorients everything. The entire complexity budget changes. "Pack 3096 nodes elegantly" becomes "pack 40 nodes with meaningful size signals, plus a bag-node exception." That is a much easier problem.

**The paradox-holder refused to collapse the real tensions.** Compact + organic is not actually a contradiction — snowflakes and soap bubbles are both. Deterministic + alive is not a contradiction — Penrose tilings and Fibonacci spirals prove it. But *show everything + focus on what matters* is a real, irreducible physical trade-off: 3096 readable labels don't fit on one screen, period. *Stable + adaptive* is real but resolvable: stable in relative position, adaptive in scale, like the macOS Dock. *Algorithm serves data vs. data serves algorithm* is the least-explored axis — virtualization is data reshaping, bag-detection is data reshaping, and those are legitimate design moves, not cheats.

**The pattern-spotter found seven mechanisms that genuinely transfer, not just metaphors.** Phyllotaxis — the golden angle of 137.5° — places N children in a spiral where no two share an angle, producing maximum compactness from a single deterministic rule. Voronoi / soap bubbles — recursive space subdivision where each cell's boundary sits at the midpoint between centers. Population cartograms — area encodes weight, so an inbox with 469 descendants is legitimately a big button before you read a word. The London tube map — the map is not the territory; stop trying to make spatial layout "accurate" to depth and make it serve navigation instead. Slime mold (Physarum) — network topology emerges from usage; paths you walk often become shorter. Memory palace — the layout must be learnable, so determinism and stability are required features, not bugs. Desire paths — track where users actually go, not where you planned they would.

The play output then pointed at a two-layer architecture: a deterministic golden-angle spiral seed from each parent, with a short physics pass (100-150 iterations of local forces) to resolve rare collisions. Size encoding does the compression work. Bag nodes get detected and rendered as grid-inside-membrane. Membranes as post-layout SVG hull paths behind each subtree. It reads as elegant — one formula, one constant.

**Then the challenger showed up and the elegance cracked a bit.** Not broken, but cracked honestly. The "no parameters" claim for Option 2 was wrong on close inspection — the structure's own enumeration lists k (size scaling), minRadius, bag-node threshold, physics alpha/velocity decay, and the leaf-size K coefficient. That's five to seven parameters, and calling it "one formula" smuggles in the rest of the system. The 0.80 confidence on the golden-angle spiral is unearned — it has never been rendered against real data; Assumption A4 and Open Question Q1 both acknowledge this. Worst of all, the structure's leading recommendation may be inverted relative to the evidence: circle packing (Option 1) has production existence proof (GitHub Next, FoamTree, Cytoscape) and got a "GOOD" aesthetics score; the golden-angle spiral has never shipped for file trees and got "EXCELLENT" — on what basis?

The challenger's best counter-argument is genuinely the cheapest path forward, and it deserves to be tested before anything else: **add bag-node detection and collapse-by-default to the existing radial layout, keep the algorithm you already have, and see if the visual failures resolve themselves.** Progressive disclosure may be a default-state configuration, not an algorithmic choice. The three failed sessions may have been solving the wrong problem.

That is the thread we carry into the recommendation.

---

## The Landscape

### The ingredients that exist

These are the primitives you can actually combine. None of them are a full solution; each contributes something specific.

- **Progressive disclosure (the visibility contract).** Render only what's currently expanded. Folded nodes are size-weighted placeholders, not invisible. Cost: needs a good default expansion state and smooth expand transitions. Cannot do: show the whole tree at once for overview.
- **Phyllotaxis / golden-angle placement.** One constant (137.5°), one formula (distance proportional to index or sqrt(leafCount)). Each parent fans its children in a spiral. Cost: places children at equal angular increments regardless of subtree weight, so deeply unbalanced trees produce one huge arm and one tiny node. Cannot do: weight the angle by subtree size without adding complexity.
- **d3.pack (zoomable circle packing).** Nested circles, parent-circle-contains-child-circles. Smooth camera zoom via d3-zoom. DOM culling below minRadius. Cost: wastes 10-15% space at corners; at depth >4 inner circles become tiny. Cannot do: achieve squarified-treemap-level compression.
- **Voronoi cells / FoamTree-style membrane.** Organic polygonal subdivision, space-filling, inherently membrane-like. Cost: iterative relaxation is slow, poor stability under data changes, best for precompute. Cannot do: real-time expand/collapse without expensive recomputation.
- **Post-hoc convex (or concave) hulls as membranes.** Draw an SVG path around a parent and all its children, fill it softly. Works with any positioning algorithm. Cost: hull recomputes on every layout change; hull quality depends on layout quality (scattered children produce sprawling hulls that may overlap adjacent subtrees). Cannot do: be purely decoupled from the underlying layout.
- **Population cartogram sizing (area = weight).** Node area = k × log2(leafCount + 1). Size IS the primary signal before text or color. Cost: conflicts with minimum legible label size for leaves; needs a floor. Cannot do: size a leaf file by meaningful weight (leafCount = 0).
- **Degree-of-Interest trees (Card & Nation 2002).** Allocate screen space by user focus. High-DOI nodes big, low-DOI nodes small or hidden. Cost: requires interest prediction; feels arbitrary when predictions miss. Cannot do: serve users who haven't built usage history yet.
- **Bag-node virtualization.** Detect high out-degree flat nodes (>threshold), render as grid/list inside a membrane. Cost: threshold choice is fragile; grid inside organic canvas is stylistically dissonant (Wisdom said organic > grid). Cannot do: handle genuinely navigable 469-child folders that deserve spatial layout.

### The concrete layout options

Four options survived the research. Each has a specific failure mode and an honest parameter count.

**Option 1 — Zoomable circle packing with semantic zoom and DOM culling.**

*Mechanism.* d3.pack computes nested circles for all expanded nodes. d3-zoom provides smooth camera motion. Below minCircleRadius (~8px), nodes are culled to DOM; a count badge appears in their place. SVG hull paths are optional — parent circles are already membranes.

*Handles 469-child inbox by:* default-collapsing it; expanding it into 469 small circles packed inside the parent; DOM-culling below legibility; showing "469 items" badge. No layout explosion.

*Handles 3-child folder by:* three circles packed inside one parent circle. Parent scales to signal its weight. Clean.

*Criteria:* (a) adaptive packing YES — recalculates per zoom; (b) membrane containment EXCELLENT — circles ARE membranes; (c) compression MODERATE — wastes corners; (d) continuous exploration EXCELLENT — smooth camera, no teleport, validated by GitHub Next; (e) aesthetics GOOD — organic, validated in production, but can feel cluttered at depth >4.

*Parameters:* minCircleRadius, padding, zoomThreshold. Three.

*Implementation cost:* ~300-400 LOC. Dependency: d3-hierarchy, d3-zoom (already in project). Reference: vasturiano/circlepack-chart.

*Kill switch:* if inner circles at depth >4 are perceptually illegible even with zoom, the membrane metaphor breaks. If the corner waste makes the canvas feel empty compared to tidy radial, fails aesthetics.

**Option 2 — Golden-angle spiral fan + light physics polish + SVG membrane layer.**

*Mechanism.* Each expanded parent fans its children at golden-angle (137.5°) increments, spiraling outward. Distance proportional to sqrt(leafCount). Size = k × log2(leafCount + 1). A short d3-force pass (100-150 iterations, local forces only) resolves collisions. SVG convex hull paths drawn as membranes. Bag nodes detected and rendered as grid-inside-membrane. DOM culling below minRadius.

*Handles 469-child inbox by:* detecting it as a bag node before the layout runs; rendering it as a membrane container with a scrollable grid inside; never fanning 469 children spatially.

*Handles 3-child folder by:* three children at 0°, 137.5°, 275° from parent center, distances by subtree weight. Physics ensures no overlap. Hull drawn around the trio.

*Criteria:* (a) adaptive packing GOOD — runs only on expanded nodes; (b) membrane containment GOOD — hull paths, soft fill; (c) compression GOOD — size-encoding does the work; (d) continuous exploration EXCELLENT — children bloom from parent, siblings anchored, spatial memory preserved; (e) aesthetics TBD — novel, unrendered, may look excellent or may produce one-huge-arm asymmetry on unbalanced trees.

*Parameters (honest count).* Placement: golden angle constant (fixed). Distance formula: sqrt(leafCount) coefficient. Size: k and minimum floor. Physics: alpha decay, velocity decay, iteration cap. Bag-node threshold (absolute or relative). Hull: padding, smoothness. That is five to seven tunable values. The *placement sub-formula* is one constant. The full system is not.

*Implementation cost:* ~400-600 LOC. No new dependencies. Highest novelty, moderate risk.

*Kill switch:* if a static render on the real tree shows one enormous arm and tiny-dot siblings, the equal-angular-spacing assumption is wrong for this data. If hull paths overlap adjacent subtrees at natural spacings, membranes fail. If the bag-node grid feels stylistically jarring next to organic clusters, the data-reshape move fails Wisdom's aesthetic.

**Option 3 — Minimum-viable fix to the existing radial layout (the challenger's cheapest falsification).**

*Mechanism.* Keep the current tidy radial tree algorithm. Add two things: (1) bag-node detection — any directory above threshold out-degree renders as a collapsed summary button, not a fanned subtree; (2) collapse-by-default for the HHA inbox and similar outliers. Run an out-degree distribution script first to pick the threshold from real data. Leave everything else alone.

*Handles 469-child inbox by:* never expanding it into the layout; it's a summary button. When clicked, enter a grid/list sub-view (same UX as Option 2's bag renderer).

*Handles 3-child folder by:* same as today — the existing radial layout already does this correctly.

*Criteria:* (a) adaptive packing MODERATE — the underlying algorithm doesn't change, but it no longer sees the outlier; (b) membrane containment PARTIAL — the existing layout doesn't draw membranes, so this inherits that gap; (c) compression GOOD — size encoding already works; the bag node stops dominating; (d) continuous exploration PARTIAL — the "expand transition is jarring" known issue persists; (e) aesthetics PARTIAL — the current layout is "too regular" per the session brief, and this doesn't change that.

*Parameters:* bag-node threshold. One, plus whatever the existing layout already exposes.

*Implementation cost:* ~100 LOC. Zero new dependencies. Zero new risk. Preserves whatever spatial memory Wisdom has built using the current layout.

*Kill switch:* after the fix, Wisdom still judges the layout "too regular" or "sterile" — the aesthetics complaint that drove this rethink remains. The 55 overlaps remain at the non-outlier nodes. The "organic clusters" preference isn't satisfied.

**Option 4 — FoamTree port / hierarchical Voronoi treemap.**

*Mechanism.* Offline precompute: run d3-voronoi-treemap over the full tree to produce a JSON of polygon coordinates per node. Browser renders polygons as SVG paths with d3-zoom. Semantic zoom for label visibility. Membrane = the polygon border itself, inherently organic. Recompute on file-tree changes via watch-server.

*Handles 469-child inbox by:* offline, Voronoi iteratively subdivides the inbox's parent polygon into 469 organic cells. Runtime renders from JSON.

*Criteria:* (a) excellent at precompute, poor for runtime expand/collapse; (b) excellent — the best membrane in the survey; (c) excellent — space-filling; (d) moderate — dynamic expansion triggers a precompute pause; (e) excellent — the best-looking option.

*Parameters:* convergenceRatio, maxIterations (offline only). Zero runtime parameters.

*Implementation cost:* ~600-800 LOC plus Python precompute pipeline. Convergence time for 469-child inbox may be minutes at quality settings. The precompute pipeline is a maintenance burden.

*Kill switch:* if interactive expand/collapse in the live watch-server model feels laggy (because every structural change requires recompute), the model is wrong for this product. Best kept as a "static snapshot export" mode, not primary layout.

### The one-formula-elegant question

Is there a layout where one formula really does the work? Honest answer: the *placement sub-algorithm* can be one formula — the golden-angle spiral is an existence proof. But "the layout" is never just placement. It is placement + sizing + collision resolution + bag-node detection + culling + membrane rendering + animation. Each of those pieces has parameters. Calling Option 2 "one formula" and Option 1 "multiple constants" is comparing sub-algorithms, not systems, and the comparison evaporates when both are built out.

The right reframing, and this matters for how you evaluate the rendered options: **"elegant and simple" is an output criterion, not an implementation requirement.** Wisdom evaluates pixels, not source code. If a two-parameter system produces a visually elegant result that reads as "one rule generated this," it satisfies the criterion. The question to ask at review time is: *can you describe what the layout is doing in a single sentence, and does the render back that up?* For the golden-angle spiral: "children fan from their parent in a spiral where each is at the golden angle from the last." For circle packing: "every parent is a circle that contains its children as smaller circles." Both pass. A system with five tunable dials whose behavior can't be summarized in a sentence — that fails, regardless of line count.

---

## Recommendations

The structured analysis and the challenger disagree on confidence levels and sequencing. That disagreement is the recommendation. Do the cheapest test first. Do not rebuild before falsifying.

### Stage 1 — Cheapest falsification (hours, not days)

*Do this before touching the layout algorithm.*

Add bag-node detection and collapse-by-default to the existing radial layout. Specifically: (a) write an out-degree distribution script to see what the real tree looks like — this gives you an honest threshold rather than a guess; (b) pick a threshold (starting proposal: >60 children OR >3× median-sibling-count, whichever fires first — revise after looking at the distribution); (c) flag directories above the threshold as bag nodes that render as a single summary button ("inbox (469 items)"); (d) set initial expansion state so these bag nodes are collapsed by default; (e) when a bag node is clicked, enter a grid/list sub-view rather than fanning it spatially.

Render the result. Look at it honestly. If the visual failures that drove this rethink (the inbox dominating the canvas, the angular sector squeeze on everything else) are resolved, the algorithm rewrite may not be needed. Wisdom's spatial memory from the current layout is preserved. The 55-overlap tidy radial tree may be fine once the outlier is out of the picture.

**Confidence this stage is worth trying: 0.85.** The evidence is unambiguous that the 469-child inbox is the outlier driving most of the pain. Removing it from the layout input is cheap and reversible.

**Assumptions that must hold:** the bag-node rendering feels acceptable to Wisdom (he said organic > grid; a grid inside a membrane may or may not read as jarring — this needs his eye). The rest of the tree produces acceptable output once the outlier is removed.

**Strongest counter:** the aesthetics complaint about the current layout ("too regular," "sterile") may not be about the outlier — it may be about the layout itself. If so, Stage 1 resolves the outlier and leaves the aesthetic problem. Proceed to Stage 2.

**What would change our mind:** Stage 1 result looks acceptable to Wisdom → stop, you're done. Stage 1 result resolves overlaps but still feels sterile or too grid-like → proceed.

### Stage 2 — Static prototype of the leading candidate (1-2 days)

*Only if Stage 1 fails the aesthetics bar.*

Build a static render — PNG or SVG, no interaction, no physics — of the golden-angle spiral with leaf-size-weighted distances, post-hoc convex hulls as membranes, against the real 3096-node tree with realistic expansion state (top-level branches expanded, inbox collapsed via bag detection). The goal is a single picture that shows what Option 2 would actually look like on this data.

In parallel (or as a fallback if the spiral render is visually wrong): build the same static render for Option 1 (d3.pack circle packing with DOM culling below minRadius).

Wisdom looks at both. If the spiral render reads as organic, balanced, and elegant — proceed to Stage 3 with Option 2. If the spiral produces the predicted one-huge-arm-tiny-dots asymmetry on the unbalanced parts of the tree, fall back to Option 1 (circle packing has production existence proof — GitHub Next, FoamTree aesthetic, Cytoscape; the risk is quantified and low).

**Confidence that a static prototype is the right next step: 0.90.** This is the prototype-first discipline Wisdom has explicitly asked for ("reset architecturally but in-place, show me what it will actually look like"). Rendering to PNG takes hours, not days. The decision this enables is load-bearing — don't make it from theory.

**Confidence in the golden-angle spiral as the winner before rendering: 0.50.** The challenger is correct that 0.80 is unearned. Until it's on screen against real data, it is a hypothesis. Circle packing is the 0.75 fallback because it has shipped.

**Assumptions that must hold:** the real-tree data (after bag-node detection removes the inbox) is not so unbalanced that spiral placement is inherently wrong. Membrane hulls don't overlap at natural inter-subtree spacings.

**Strongest counter:** two layout approaches have already failed in this project. Base rate says the third has meaningful failure probability. The static-prototype gate exists specifically to catch that before sinking a session into implementation.

**What would change our mind:** spiral render shows one enormous subtree arm and tiny-dot siblings, or hull paths overlap adjacent subtrees → pivot to Option 1. Both renders look flat or sterile → reconsider Option 4 (Voronoi precompute) as a static-first mode. Wisdom says "this is what I wanted" to either → proceed to Stage 3 with that choice.

### Stage 3 — Full interactive build (2-5 days)

*Only after Stage 2 has produced a render Wisdom approves.*

Implement the winning static option interactively. Zoom, expand/collapse animation (bloom outward from parent, siblings anchored, spatial memory preserved), stable transitions. Membrane layer as a separate SVG group rendered beneath node positions. Integration with the v2 UI that stays — reader, tabs, search, centering, zoom, settings, watch-server live updates all preserved. Bag-node grid renderer as a separate component called when the membrane is expanded.

Fix the two known issues the session brief flags: the hit-box regression (stale hit-area rects during transitions — needs investigation regardless of algorithm) and the "expand transition is jarring" problem (the bloom animation described in the play synthesis is the proposed fix; it needs to be technically specified, not just conceptually described).

**Confidence this stage succeeds conditional on Stage 2 passing: 0.80.** Static renders that Wisdom approves are a strong predictor of final quality. The remaining risk is interaction quality (animation smoothness, hit-box correctness, performance under rapid expand/collapse cycles) rather than aesthetic — those are engineering problems with known solutions.

**Assumptions that must hold:** the physics polish pass in Option 2 or the d3-zoom camera in Option 1 runs under 100ms at 40-80 nodes. Hull recomputation is fast enough to stay interactive. The v2 UI keep-list actually integrates cleanly with the new layout.

**Strongest counter:** performance at 3096 nodes with rapid expand/collapse animations has not been benchmarked. If the hull recomputation fires on every physics iteration, it may stall. Benchmark this during the first day of Stage 3 and be ready to defer hull-recompute to settle time.

**What would change our mind:** animation benchmarks fail at real data → simplify the physics pass or defer membrane rendering to post-settle. Hit-box bug cannot be resolved in transition → freeze hit-boxes during animation, activate on settle.

---

## Open Threads

This think-deep opened more than it closed. These threads deserve their own sessions or belong on the longer-term roadmap.

**The slime-mold / usage-memory thread.** The play synthesis devoted significant energy to it — layouts that drift based on user navigation, nodes visited often migrating toward center, desire paths emerging from actual behavior. The structure dismissed this as "the future layer, not for v2." The challenger flagged that dismissal as premature: the play synthesis identified usage-memory as the core mechanism that would differentiate Spatial Workspace from every other file browser. It is not for this phase, but it deserves a dedicated session when the layout stabilizes. The watch-server could write a `layout-affinity.json` of click counts, within the "no backend" constraint, as a starting experiment.

**The one-formula-unified question.** Can golden angle (placement) + weighted arc (allocation) + bloom direction (away from grandparent) + DOI-based compression collapse into a single expression? The play synthesis posed this as live question 8. Even if the answer is "no, these are orthogonal concerns," making the failure explicit is worth a short exploration. The shortest path to "elegant and simple" might be fewer mechanisms, not better ones.

**The long-term ZUI endgame.** Is Spatial Workspace ultimately a single 2D plane, or a Muse-style system of nested canvases where each branch gets its own zoomable surface? The single-canvas model (Assumption A3) is load-bearing to this analysis. Muse's interaction model is the best ZUI in any shipped product — pinch-zoom into a nested board, the child fills the screen, the parent becomes a card. If Spatial Workspace's endgame is that model, several current constraints dissolve (each sub-canvas only renders its local branch; outliers aren't outliers at their own level). This is a product-direction question, not an algorithm question. Worth naming explicitly before the architecture ossifies.

**The FoamTree question.** Carrot Search's library is the only shipped technology that achieves what you want aesthetically. It's closed-source and licensable. Is there a compelling reason to license it as a shortcut to beautiful output, versus a compelling reason to keep the layout in-house (IP, customization, no external dependency, learning value)? The IP-ecosystem rationale probably points to in-house. But if the static prototype of Option 2 produces disappointing renders and Option 1 lacks aesthetic distinctiveness, FoamTree as a paid fallback is worth knowing exists.

**What Wisdom actually does with this tool day to day.** The challenger flagged this as a blind spot. The analysis has been reasoning about layouts in the abstract. Is this primarily a *read-the-ecosystem-from-above* tool (in which case compression and overview matter most) or a *navigate-to-specific-files* tool (in which case reader integration and click-to-open matter most)? The optimal layout differs substantially between those cases. One week of real usage after Stage 1 would answer this better than any further analysis.

---

## Sources & Methodology

This think-deep ran five phases. Each produced an artifact; the synthesis derives from the cross-comparison.

- **Web / shipped products** (`agents/research-web.md`): Surveyed 30+ production tools across disk analyzers, knowledge canvases, code visualizers, and ZUI products. Found FoamTree as the only near-match (library, not app), DaisyDisk as the best consumer aesthetic, Muse as the best ZUI navigation. Converged on "no shipped product scores above 3.5/5; the combination is genuinely novel."
- **Academic papers** (`agents/research-papers.md`): Covered 40+ years of InfoVis literature — Reingold-Tilford (1981) through Neighborhood-Preserving Voronoi Treemaps (2025). Identified the fundamental three-way trade-off (continuity + stability + aspect ratio, unresolved in 24 years). Closest paper to the five criteria: Blanch & Lecolinet's Zoomable Treemaps (2007), missing only (b) organic membranes and (e) aesthetics.
- **GitHub / open-source** (`agents/research-github.md`): Surveyed 30+ repositories. Converged on d3.pack + d3-zoom + DOM culling as the production-tested primitive, with d3-flextree as the best variable-size tree algorithm. Identified ELK mrtree as the most mature compound-aware radial layout. Named the 469-child pathology as unsolved by any library.
- **Play** (`agents/play-synthesis.md`): Three parallel agents — thread-follower, paradox-holder, pattern-spotter. The thread-follower surfaced the load-bearing reframe: the layout algorithm was the wrong optimization target; progressive disclosure changes the problem. The paradox-holder refused to collapse real tensions into false consensus. The pattern-spotter found seven mechanism transfers (phyllotaxis, Voronoi, cartograms, tube map, slime mold, memory palace, desire paths), naming each with the actual mechanism rather than just vibes.
- **Structure** (`agents/structure.md`): Synthesized the four prior outputs into five frameworks (visibility contract, ingredient taxonomy, trade-off collapse, mode transition, two-layer architecture) and four concrete options. Recommended Option 2 (golden-angle spiral) at 0.80 confidence as the leading candidate.
- **Challenger** (`agents/challenger.md`): Stress-tested the structure. Correctly caught the "no parameters" overclaim, the 0.80-confidence-on-unrendered-algorithm overclaim, the dismissed counter-argument (fix defaults before rebuilding), the aesthetic dissonance of grids-inside-membranes, and the unstated cost of erasing Wisdom's current spatial memory. The challenger's strongest move was reframing Stage 1 as the first test, not a preamble.

The synthesis incorporates the challenger's corrections directly. Confidence levels are revised (Option 2 at 0.50 unrendered, not 0.80; the reframe at 0.65 as hypothesis, not 0.95 as finding). Stage 1 is first in the recommendation, not buried. The "one formula" claim is stated honestly as applying to the placement sub-algorithm, not the full system. The slime-mold thread is surfaced in Open Threads rather than dismissed.

All agent files are in `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/research/think-deep/2026-04-17-layout-rethink/agents/` — read them for the full detail behind any claim above.

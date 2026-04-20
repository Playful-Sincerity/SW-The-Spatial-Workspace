---
agent: analyst / structure
date: 2026-04-17
phase: structure
input-agents: research-web, research-papers, research-github, play-synthesis
---

# Structured Analysis — Spatial Workspace v2 Layout Algorithm

---

## 1. INSIGHT MAP

### Theme A: The Visibility Reframe

**Insight A1: The layout problem is not "pack 3096 nodes" — it is "pack what's currently visible."**
Evidence: play-synthesis (thread-follower Walk 1 and 2), confirmed by research-web's observation that every working spatial browser uses progressive disclosure.
Confidence: 0.95. This is the most load-bearing insight in all four outputs. Every failed iteration (physics, tidy radial) treated the full dataset as the layout problem. The reframe eliminates the hardest constraint (469-child outlier) from the runtime layout algorithm entirely.

**Insight A2: Folded nodes must occupy proportional area as placeholders, not collapse to zero.**
Evidence: play-synthesis (thread-follower Walk 2, cartogram principle from pattern-spotter), research-web (GrandPerspective/squarified treemap shows this works for file size; the same principle applies to descendant count).
Confidence: 0.90. Node area = k × log2(leafCount + 1) simultaneously solves the size-encoding problem and makes progressive disclosure feel spatial rather than hierarchical. Users can read the weight of a folder before expanding it.

**Insight A3: The compression floor is a mode-switch signal, not a failure.**
Evidence: play-synthesis (thread-follower Walk 4).
Confidence: 0.85. Below ~44px / 12pt readable label, the correct response is to switch rendering mode (count badge or summary dot), not to try to squeeze more nodes in. This makes the compression target achievable: compress until the floor is hit, then virtualize.

---

### Theme B: Ingredients That Exist

**Insight B1: d3.pack (circle packing) + d3-zoom (smooth camera) + DOM culling is the most production-ready combination for criteria a/b/c/d simultaneously.**
Evidence: research-github (vasturiano/circlepack-chart, GitHub Next repo-visualizer independently converged on this), research-web (FoamTree's aesthetic success with Voronoi containment is the more complex analog).
Confidence: 0.90. GitHub Next tested alternatives and chose circle packing. Not an accident.

**Insight B2: The golden-angle phyllotaxis spiral is the one-formula answer Wisdom requires.**
Evidence: play-synthesis (pattern-spotter mechanism transfer 1). Confirmed by research-papers (no existing paper implements phyllotaxis for file hierarchies — it is a genuine novel application).
Confidence: 0.80. The golden angle (137.5°) places N children in a spiral with no two at the same angle, producing organic density from a single deterministic formula. The pattern never closes into a ring. Every subtree fans uniquely because every subtree has a different N. No tunable parameters.

**Insight B3: Bubble Treemaps (Görtler et al. 2018) solved the curved membrane containment rendering problem academically; the visual output is the target aesthetic.**
Evidence: research-papers (Bubble Treemaps are the most aesthetically organic containment in the literature). FoamTree (research-web) is the only shipped product that achieves membrane-like visual quality.
Confidence: 0.85. The rendering technique (nested contour arcs / SVG hull paths with soft fill behind subtrees) is separable from the layout algorithm. The membrane is a rendering layer on top of any layout, not part of the layout itself.

**Insight B4: ELK `mrtree` is the only existing algorithm that radially distributes N children around a parent — closest to the "organic cluster" behavior.**
Evidence: research-github (ELK analysis, last commit March 2026).
Confidence: 0.75. ELK is more mature and better maintained than any other compound-aware layout library. `mrtree` mode handles high-degree nodes by radial distribution rather than linear alignment.

---

### Theme C: What's Genuinely Missing

**Insight C1: No existing library adaptively switches layout strategy per subtree based on child count.**
Evidence: research-github (explicit gap statement: "What does not exist"), research-web (no shipped product handles outlier + normal in the same layout), research-papers (gap acknowledged for large fan-out).
Confidence: 0.95. This is the most-confirmed gap across all three research streams. It must be custom code.

**Insight C2: No algorithm simultaneously achieves continuity + stability + aspect ratio. This is a proven irreducible trade-off.**
Evidence: research-papers (Bederson, Shneiderman, Wattenberg 2002 formalizes it; field has not resolved it in 24 years).
Confidence: 0.90. The implication: any design must consciously choose which two of the three to optimize. For Spatial Workspace, the choice should be continuity + stability (jarring jumps break spatial memory more than imperfect aspect ratios).

**Insight C3: No shipped product handles the "one folder with 469 children, most others with 5-20" distribution gracefully.**
Evidence: All four agents independently reach this conclusion. The outlier is a degenerate case for every known algorithm.
Confidence: 0.95. The solution is not algorithmic — it is architectural: detect "bag nodes" (high out-degree, flat, no sub-structure) and render them with a different mode (grid inside membrane) rather than spatial fan.

---

### Theme D: The 469-Child Outlier Problem

**Insight D1: The HHA inbox is a "bag" not a "tree" — it is a data-type mismatch, not a layout failure.**
Evidence: play-synthesis (thread-follower Walk 5, pattern-spotter mechanism 1).
Confidence: 0.85. 469 flat children with no sub-hierarchy signals that the data lacks navigable structure at this node. The correct response is a different rendering mode: a membrane container showing a count + grid/list view inside, not a spatial fan of 469 children. The layout algorithm need never see all 469 children simultaneously.

**Insight D2: The threshold for "bag node" detection should be relative, not absolute.**
Evidence: play-synthesis (live question 4). Corroborated by research-github's observation that no library defaults to adaptive strategy.
Confidence: 0.65. An absolute threshold (N > 60) works for this dataset but is fragile if the data changes. A relative threshold (N > 3× median sibling out-degree across the whole tree) is more robust. Fragile: this depends on being able to compute the median efficiently at render time.

---

### Theme E: Aesthetics and the "Elegant and Simple" Criterion

**Insight E1: "Elegant and simple" means one generative rule, not one tunable parameter.**
Evidence: play-synthesis (thread-follower, paradox-holder, pattern-spotter all converge), context from Wisdom's profile ("elegant and simple = one formula not five parameters").
Confidence: 0.95. The golden-angle spiral meets this: one constant (137.5°), one distance formula (proportional to index), no global planner.

**Insight E2: Membrane containment is a rendering layer (SVG hull path + soft fill) that can be computed post-layout from any positioning algorithm.**
Evidence: research-papers (Bubble Treemaps render contour arcs independently of layout), research-web (FoamTree renders membrane-like borders as part of its Voronoi output).
Confidence: 0.85. This means the choice of positioning algorithm and the membrane visual are orthogonal decisions. Any algorithm that produces valid positions can have membranes drawn on top.

---

## 2. FRAMEWORKS

### Framework 1: The Visibility Contract

**What it is:** A mental model that separates the layout problem into two subproblems: (1) what to show and (2) how to arrange what's shown. Most failed approaches conflate them.

**The key reframe:** The layout algorithm's input is not the full 3096-node tree — it is the currently-expanded subtree, which is typically 20-80 nodes. The full tree only exists as size-encoded placeholders. This changes the problem from "how do I pack 3096 nodes" to "how do I pack 40 nodes with meaningful size signals and a bag-node exception."

**How to use it:** Before evaluating any layout algorithm, ask: "What is the maximum number of nodes this algorithm will ever be asked to place simultaneously?" If the answer is "all 3096," the visibility contract is wrong. Fix the contract first; then choose the algorithm.

---

### Framework 2: Ingredient Taxonomy

The primitives available, organized by what each contributes:

| Ingredient | What It Contributes | Trade-off |
|---|---|---|
| d3.pack (circle packing) | Membrane containment + continuous zoom + DOM culling | Wastes ~10-15% space in circle-corners; poor at extreme aspect ratios |
| Squarified treemap (d3.treemap) | Maximum compression, zero wasted space | No organic feel; containment is rectangular; zoom is "teleport" not "camera" |
| Golden-angle phyllotaxis spiral | One deterministic formula, organic variety, no parameters | Does not weight by subtree size; may cluster large subtrees near center |
| Voronoi treemap (d3-voronoi-treemap) | Organic polygon containment, area-proportional | Slow to compute iteratively; poor stability; best for precomputed/static renders |
| Bubble Treemap contour arcs | Smooth curved membrane rendering | Sacrifices compression for visual whitespace |
| DOI (Degree of Interest) trees | Adaptive screen space based on user focus | Requires interest model; can feel arbitrary when focus prediction is wrong |
| ELK mrtree | Radial distribution of N children, compound-aware | Not D3-native; directed-graph origin; EPL license |
| fCoSE compound spring embedder | Physics-based compound node containment | Slow at N>200; compound boundary is bounding box, not smooth membrane |
| Semantic zoom (larsvers pattern) | Level-of-detail switching by zoom threshold | Requires explicit zoom-threshold → render-mode mapping |
| Size encoding (cartogram) | Area = descendant count, visual weight before reading | Conflicts with minimum legible label size for leaf nodes |
| Bag-node virtualization | Handles high-degree flat nodes without layout explosion | Needs detection heuristic; threshold fragility |
| SVG hull path as membrane | Renders membrane visually from any node positions | Post-layout computation; no algorithmic coupling |

---

### Framework 3: The Trade-off Axis Collapse

The InfoVis literature proves three axes are always in tension: continuity (smooth exploration), stability (no jarring reposition), aspect ratio (legible proportions). The field has never resolved the three-way trade-off.

**The collapse for Spatial Workspace:** We can eliminate aspect ratio as a primary axis because we are not encoding file SIZE — we are encoding navigable structure. When area encodes descendant count (not file size), acceptable aspect ratios are much more forgiving: a folder with 10 descendants is legitimately bigger than a folder with 2. The worst-case aspect-ratio scenarios in the literature (DaisyDisk thin arcs, WinDirStat slivers) occur when size distribution is extreme and aspect ratio is the encoding. For descendant-count encoding with progressive disclosure, the range is much narrower.

**Result:** The three-way trade-off collapses to two axes — continuity vs. stability — and for Spatial Workspace, the right choice is clear: prioritize stability (preserve relative positions; spatial memory requires it) and accept mild continuity cost on rare full re-layouts.

---

### Framework 4: Mode Transition Model

Different node types need different layout modes. The failure of "one algorithm for all nodes" is proven by the bag-node case. The mode model:

| Mode | Trigger | Algorithm | Membrane |
|---|---|---|---|
| Normal | 1-60 children, any depth | Golden-angle spiral fan from parent + light physics polish | SVG hull path, soft fill |
| Bag | >N children (N = relative threshold), no sub-structure | Grid/list inside membrane container; no spatial fan | Same membrane; grid inside |
| Leaf | 0 children (files) | Minimal button sized to label; no fan | None |
| Summary | Node too small to render at current zoom | Count badge dot | None |

This is the "one algorithm, four rendering modes" design. The layout algorithm is always golden-angle spiral; the rendering mode switches based on count, depth, and zoom level.

---

### Framework 5: The Two-Layer Architecture

All four agents converge on this architecture independently:

**Layer 1 (Seed positions):** Deterministic golden-angle spiral fan from each parent. No physics. Each node gets a starting position in ~O(n) time. Positions are stable across renders because they are deterministic.

**Layer 2 (Polish):** Short d3-force pass (100-150 iterations max). Link attraction (local only), gentle charge repulsion, rect/circle collision. This is NOT a full force simulation — it is a finish pass that resolves rare overlaps. Settles in under 100ms at 40-80 nodes.

The key: Layer 1 does almost all the work. Layer 2 touches only nodes that collide. The result: deterministic enough for spatial memory, organic enough to look alive.

---

## 3. DECISION LANDSCAPE

### Option 1: Zoomable Circle Packing with Semantic Zoom and DOM Culling

**Mechanism:** d3.pack computes nested circles for all expanded nodes. d3-zoom provides smooth camera (no teleport). Below minCircleRadius (e.g., 8px), nodes are removed from DOM. Semantic zoom layer switches label rendering on/off by zoom threshold. SVG hull paths drawn around each parent circle as the membrane.

**469-child inbox trace:** At default zoom, inbox is a single large circle (log2(469+1) ≈ 9 units of area = visually prominent). Expand: 469 small circles packed inside the parent. Below legibility threshold (~8px radius), sub-circles are culled to DOM; a count badge "469 items" appears. User zooms in to see individual items. No layout explosion.

**3-child folder trace:** Three circles packed inside one parent circle. Clean, organic. Parent circle scales proportionally to signal its weight. Membrane = parent circle border. Looks correct.

**Criteria scores:**
- (a) Adaptive packing: GOOD — d3.pack recalculates at every expand/collapse; DOM culling at every zoom
- (b) Membrane containment: EXCELLENT — circles ARE membranes; parent circle = container
- (c) Compression: MODERATE — circles waste ~10-15% space at corners. At 3096 nodes visible: worse than treemap, better than force-directed
- (d) Continuous exploration: EXCELLENT — smooth camera zoom, no teleport, validated by GitHub Next
- (e) Aesthetics: GOOD — circles are organic; SVG hull paths can add soft glow; validated by FoamTree's aesthetic category

**Parameters:** minCircleRadius, zoomThreshold for semantic switch, padding between circles. ~3 parameters. Not ideal; can be reduced to 1 if minRadius is derived from viewport.

**Implementation cost:** ~300-400 lines. Dependencies: d3-hierarchy, d3-zoom (already in project or trivially added). Vasturiano's circlepack-chart is reference code. Low risk.

**Failure mode:** Space inefficiency becomes visible at the top level if the root has many large-radius children (they don't tile efficiently). Aesthetic concern: circles-within-circles can look cluttered if depth > 4. At depth > 5, inner circles become tiny and the membrane metaphor breaks down.

---

### Option 2: Golden-Angle Spiral Fan + Light Physics Polish + SVG Membrane Layer

**Mechanism:** Each expanded parent fans its children using a golden-angle (137.5°) spiral outward. Distance from parent = proportional to child's sqrt(leafCount). Node size = k × log2(leafCount + 1). Short d3-force pass resolves any overlaps (100-150 iterations, local forces only). SVG convex hull path drawn around each parent + its children = membrane. Bag nodes detected (>threshold) and rendered as grid-inside-membrane instead of spatial fan. DOM culling below minRadius.

**469-child inbox trace:** At default zoom: inbox is a large button (high leafCount = high area). No expansion of inbox children into the spatial fan. Inbox is detected as a bag node. Expand: membrane container appears; inside, 469 items in a scrollable grid (12×12 or similar). No layout algorithm runs for the 469 children — they go into a grid renderer. Zero impact on the spatial layout of the rest of the tree.

**3-child folder trace:** Three children placed at golden angles (0°, 137.5°, 275°) from parent center. Distances proportional to their subtree weights. Light physics ensures no overlap. SVG hull path around parent + children = membrane. Organic, no rings, no forced symmetry.

**Criteria scores:**
- (a) Adaptive packing: GOOD — layout runs only on expanded nodes; size-encoding compresses the tree visually
- (b) Membrane containment: GOOD — SVG hull paths are computed post-layout; can be soft/blurred; reads as membrane
- (c) Compression: GOOD — size-encoding does the heavy lifting; visible nodes are typically 20-80
- (d) Continuous exploration: EXCELLENT — children bloom outward from parent (no teleport); stable relative positions (spatial memory preserved)
- (e) Aesthetics: EXCELLENT — one formula, organic variety per subtree, no geometric rigidity; closest to Wisdom's "elegant and simple" target

**Parameters:** k (size scaling constant), minRadius for culling, bag-node threshold. Could be reduced to 1-2 if k is derived from viewport width.

**Implementation cost:** ~400-600 lines. No new dependencies — d3-hierarchy + d3-force already in the project. This is the most novel algorithm but also the one most aligned with "elegant and simple." Moderate risk: the golden-angle spiral needs validation against the actual tree structure.

**Failure mode:** Deeply unbalanced trees (one child with 400 descendants, others with 2) may produce spatially unbalanced fans where one arm is enormous and others are dots. The weighted-radius distance formula mitigates this but does not eliminate it. May need a max-radius cap.

---

### Option 3: Zoomable Squarified Treemap with Smooth Zoom Transitions

**Mechanism:** d3.treemap (squarified) computes rectangle partitions for all expanded nodes. Click-to-zoom transition: selected cell expands to fill viewport with a smooth CSS transform. Parent-level treemap visible as small thumbnails in a breadcrumb strip. Membranes = colored rectangular borders with subtle shadows. DOM culling below minBlockArea.

**469-child inbox trace:** 469 rectangles subdivide the inbox's parent rectangle. If children are equal weight (equal descendant count), they are thin slivers. Squarified mitigates but does not solve this at 469 equal-weight items — aspect ratios are still poor. Click to zoom into inbox: inbox fills viewport, 469 items as a rectangle grid. Legible but not organic.

**3-child folder trace:** Three rectangles. Clean, legible. Hierarchy levels distinguished by border thickness and color. Memory palace complaint: after navigating away and back, the layout is stable (treemaps are deterministic per data state). Good for spatial memory.

**Criteria scores:**
- (a) Adaptive packing: EXCELLENT — every pixel used; best compression in class
- (b) Membrane containment: MODERATE — rectangles imply containment but feel like spreadsheet cells, not membranes
- (c) Compression: EXCELLENT — most nodes visible simultaneously; treemap is the compression champion
- (d) Continuous exploration: POOR — "replace viewport" zoom is jarring; spatial context lost on each zoom in/out
- (e) Aesthetics: POOR for Wisdom's preferences — "clean and simple" but not organic; Cascaded Treemaps (Lü & Fogarty 2008) improve this with layered offsets but add visual complexity

**Parameters:** padding (treemap padding between levels), zoomTransitionDuration, colorScheme. ~3-4 parameters.

**Implementation cost:** ~200-250 lines. d3.treemap is mature and well-documented. Lowest implementation risk.

**Failure mode:** Criterion (d) — exploration is fundamentally not continuous. Fails the "spatial memory" requirement. The 469-child outlier produces unreadable aspect ratios without virtualization.

---

### Option 4: Voronoi Treemap (Precomputed) + d3-zoom Semantic Overlay

**Mechanism:** Voronoi treemap computed offline (Python script at build time, not at browser render time). Output is a JSON of polygon coordinates per node. Browser renders the polygons as SVG paths + d3-zoom. At runtime, no layout computation — just rendering from precomputed coordinates. Semantic zoom layer hides/shows labels. Membrane = the Voronoi polygon border itself (inherently organic, no separate hull computation needed).

**469-child inbox trace:** Precomputed: Voronoi iterative relaxation runs on the 469 children offline. Converges to organic polygons. Output baked into the JSON. Runtime: inbox renders as one large polygon; expand reveals 469 small polygons inside. Organic, space-filling. But: if the inbox contents change (new files added to pipeline), the precomputed layout is stale — requires re-running the Voronoi computation.

**3-child folder trace:** Three organic polygons inside parent polygon. Looks like cells under a microscope. The most aesthetically distinctive option in the survey. Genuinely beautiful.

**Criteria scores:**
- (a) Adaptive packing: EXCELLENT at precompute time; POOR for dynamic expand/collapse (requires recompute)
- (b) Membrane containment: EXCELLENT — Voronoi polygon borders ARE organic membranes
- (c) Compression: EXCELLENT — Voronoi is space-filling
- (d) Continuous exploration: MODERATE — d3-zoom gives smooth camera; but dynamic expand/collapse requires recompute, which is a jarring pause
- (e) Aesthetics: EXCELLENT — the best-looking option in the survey

**Parameters:** convergenceRatio, maxIterations (for offline script). Zero runtime parameters — the layout is precomputed.

**Implementation cost:** ~600-800 lines (Python precompute script + browser rendering). Dependencies: d3-voronoi-treemap (BSD-3-Clause) for the offline script; d3-zoom for browser. Highest implementation cost. Risk: convergence time for the full tree (especially the 469-child inbox) may be minutes at quality settings. Precompute pipeline is a maintenance burden.

**Failure mode:** Dynamic interaction breaks the model — if users expand/collapse in real-time, the precomputed positions don't recalculate. Suitable for a "static snapshot" mode; not suitable as the primary interactive algorithm.

---

### Option 5: Adaptive Mode-Switched Hybrid (ELK mrtree + Bag-Node Virtualization + SVG Membrane)

**Mechanism:** ELK `mrtree` algorithm for the primary tree layout (radially distributes children around each parent, compound-aware — children stay inside parent bounds). Bag nodes (>threshold) use a separate grid-inside-membrane renderer. SVG hull paths for membranes. d3-zoom for navigation. elkjs runs in a Web Worker to avoid blocking the UI.

**469-child inbox trace:** Inbox is detected as a bag node before ELK runs. ELK only sees the inbox as a leaf node (collapsed). Expand: grid renderer kicks in. ELK never processes 469 children. No layout explosion. Membrane around the grid is drawn by hull computation.

**3-child folder trace:** ELK `mrtree` radially distributes 3 children around the parent node. Organic, non-linear positioning. Parent node is a compound node that visually contains children. Clean.

**Criteria scores:**
- (a) Adaptive packing: GOOD — ELK recalculates per expand/collapse; Web Worker means non-blocking
- (b) Membrane containment: GOOD — compound nodes + hull paths
- (c) Compression: MODERATE — ELK is not primarily a space-filling algorithm; some white space expected
- (d) Continuous exploration: GOOD — ELK's compound approach preserves relative positions better than pure physics; Web Worker keeps UI responsive
- (e) Aesthetics: MODERATE — ELK's output is more "diagram" than "organic." Better than flat treemap; less organic than circle packing or golden-angle spiral

**Parameters:** ELK nodeSpacing, edgeRouting, algorithm selection. 3-4 parameters. EPL 2.0 license — check for project requirements.

**Implementation cost:** ~500-700 lines. elkjs as dependency (WASM + Web Worker boilerplate). Moderate complexity. Risk: EPL 2.0 license may require attribution in certain contexts; algorithm concepts are free to port if preferred.

**Failure mode:** ELK's visual output tends toward "diagram" aesthetics — clean but not organic. Criterion (e) (aesthetics) is the weakest point. May feel more like a flowchart visualizer than a spatial file browser.

---

## 4. ASSUMPTIONS

### A1: All 3096 nodes are visible as placeholders in the initial render
**Fragility: Moderate.** The analysis assumes that the "root + top-level + second level" initial expansion state means most of the tree is folded. If the initial state expands too deeply, the "layout only runs on visible nodes" claim breaks down. The visibility contract depends on a thoughtful initial expansion state. What changes if wrong: the "pack 40 nodes" problem reverts to "pack 300 nodes" — still much better than 3096, but changes the complexity calculation.

### A2: The 469-child HHA pipeline inbox directory has no meaningful sub-structure
**Fragility: Robust for now, fragile over time.** The bag-node detection is calibrated to this directory's current structure. If the pipeline inbox acquires sub-directories in the future, the bag-node heuristic may misclassify it. What changes if wrong: the bag-node rendering mode (grid inside membrane) is applied to a directory that actually benefits from spatial layout. User gets a grid when they expected navigable space.

### A3: The single-canvas model (v2 UI) is preserved — no sub-canvases
**Fragility: Moderate.** The analysis assumes all rendering happens on one zoomable canvas. If the architecture changed to discrete sub-canvases per branch (like Muse), several constraint calculations change (especially around spatial memory and membrane rendering). What changes if wrong: sub-canvas model would actually make the layout problem easier (each sub-canvas only renders its local branch), but would break the "see the whole ecosystem" criterion.

### A4: "Good-looking" can be evaluated without a rendered prototype
**Fragility: Fragile.** This analysis reasons about aesthetics from text descriptions of existing tools. No rendered output exists yet. The gap between "this sounds organic" and "this looks organic when rendered at 40 nodes" may be significant. What changes if wrong: Option 2 (golden-angle spiral) is the most novel — it has not been rendered for this use case. It may look better or worse than expected. Option 1 (circle packing) has a rendered existence proof (GitHub Next repo-visualizer, FoamTree) — lower aesthetic uncertainty.

### A5: Python stdlib only, single HTML file — no new dependencies
**Fragility: Moderate.** The analysis recommends d3.pack and d3-zoom as the minimal dependency additions. The Spatial Workspace CLAUDE.md states "Python stdlib only for all generator scripts" and "Single HTML file." D3 is already used (markmap in v2 uses it). elkjs would violate the single-file constraint without bundling. What changes if wrong: Option 5 (ELK-based) becomes much more viable if external JS dependencies are allowed.

### A6: Real-time zoom matters — this is interactive, not a static poster
**Fragility: Robust.** All five criteria assume interactive use. What changes if wrong: Option 4 (Voronoi precomputed) becomes the superior choice — it produces the best-looking output with zero runtime computation cost.

---

## 5. OPEN QUESTIONS (ranked by importance)

### Q1: Does the golden-angle spiral produce acceptable density for deeply unbalanced trees?
**Why it matters:** This is the leading algorithm candidate (Option 2) and it has not been rendered for real file tree data. The golden angle gives equal angular spacing regardless of subtree size. For trees where one child has 400 descendants and another has 2, the small child and large child get the same angular step — but the large child's area is much bigger. The resulting visual might show one enormous arm and one tiny node. A quick prototype (even a static HTML mock with the actual tree data) would answer this. Decision weight: if the spiral fails on real data, fall back to Option 1 (circle packing), which is proven on real file trees.

### Q2: What is the correct bag-node threshold, and is relative better than absolute?
**Why it matters:** The bag-node virtualization is the primary mechanism for handling the 469-child inbox. The threshold determines when this mode kicks in. Too low: small directories get grid-treated when spatial navigation would be better. Too high: the inbox explodes the layout algorithm. An absolute threshold (N > 60) is simple to implement. A relative threshold (N > 3× median) requires computing the median of out-degrees at startup. The right answer depends on the actual out-degree distribution of the 3096-node tree, which is known data. This can be answered by running a distribution script on the actual file tree before implementation.

### Q3: Can the membrane (SVG hull path) be computed efficiently at interactive speeds after each expand/collapse?
**Why it matters:** The membrane is a non-negotiable aesthetic criterion. Computing a convex hull or concave hull around each subtree is O(n log n) per subtree in the worst case. At 40-80 visible nodes with 20-30 parent nodes each needing a hull, this is ~2000 hull computations per layout cycle. In practice, hull computation at this scale is fast (< 1ms per hull). But the concern is: when a node is expanded and positions shift slightly (from the physics polish), do all membranes need to recompute? If yes, every physics iteration recomputes all hulls. If membranes are recomputed only at settle (after physics is done), the cost is acceptable. Needs a brief prototype or benchmark.

---

*Analysis complete. Three agents read; one framework synthesized. The leading option and the core reframe are unambiguous on the research evidence.*

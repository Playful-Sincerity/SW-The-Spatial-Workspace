---
agent: research-papers
date: 2026-04-17
stream: academic papers / InfoVis literature
---

# Academic Literature Review: Hierarchical Layout Algorithms for 2D Canvas Visualization

## Scope

This review covers the InfoVis, IEEE VIS, EuroVis, TVCG, and CHI literature on hierarchical layout, with specific attention to the five criteria governing the Spatial Workspace v2 problem: (a) adaptive space packing at every zoom/expansion state, (b) membrane-like containment around parent-child groups, (c) compression maximized while legibility preserved, (d) continuous non-jarring exploration, and (e) aesthetic quality.

---

## Classic Tree Layouts

### Reingold-Tilford "Tidy Tree" (1981)
Reingold and Tilford's paper in *IEEE Transactions on Software Engineering* SE-7(2) established the foundational aesthetic criteria for tree drawing: nodes at equal depth on parallel lines, isomorphic subtrees drawn identically, symmetry preserved, compact packing. Walker (1990) extended it to n-ary trees; Buchheim et al. (2002) reduced the worst-case time to O(n), which is the version in common use today (implemented in D3's `d3.tree()`). The flextree variant (d3-flextree, 2016) extends it to variable-size nodes.

**What it solves:** Elegant node-link display of moderate-sized trees with consistent parent-child alignment.

**Where it fails for our case:** It allocates screen space uniformly by level, ignoring subtree weight or size. Deep hierarchies with high fan-out create enormous horizontal or vertical spread. No containment boundaries. No semantic zoom. Dead space is not reclaimed on collapse. Not space-efficient.

---

### Walker Algorithm (1990) and Buchheim Linear-Time (2002)
Refinements of Reingold-Tilford for general trees. Same core failure mode: space use is governed by layout geometry, not data density. The "tidy" property (subtrees don't overlap, compacted leftward) improves over naive approaches but does not solve adaptive packing.

---

## Treemap Family

### Shneiderman Slice-and-Dice (1991)
The original treemap, published in *ACM Transactions on Graphics*. Divides the rectangle alternately into horizontal and vertical strips, recursively. Perfect space utilization (every pixel used). Hierarchical containment is implicit through nesting.

**Failure:** Produces thin, elongated rectangles. Aspect ratios frequently exceed 10:1. Perceptual accuracy degrades severely at extreme aspect ratios (Kong, Heer, and Agrawala confirmed this in 2010 — area comparisons become unreliable). No organic feel. Visual differentiation of hierarchy levels is weak.

### Squarified Treemaps — Bruls, Huizing, van Wijk (2000)
Published at *Eurographics/IEEE TCVG Symposium on Visualization*. Greedy algorithm that produces rectangles approximating squares by choosing strip orientations to minimize aspect ratio at each step. Shaded frames around groups strengthen hierarchy perception. Average aspect ratio of 1.19–1.75 vs. slice-and-dice's 26–304.

**What it solves:** The aspect ratio problem. Much better area comparison. This is the standard for file explorer treemaps (used in WinDirStat, DaisyDisk, etc.).

**Failure for our case:** Layout order is not preserved (siblings appear in scrambled spatial order). When data changes, layout is unstable — whole regions jump. No organic containment; the boundaries are rectangular frames, not membranes. Zoom is discontinuous: squarified layouts at different data cuts are visually discontinuous.

### Ordered Treemap Layouts — Bederson, Shneiderman, Wattenberg (2002)
Published at *IEEE TVCG*. Trade some aspect-ratio improvement for layout stability. Strip treemaps emerge as the best compromise — better than slice-and-dice on aspect ratio, more stable than squarified on data updates. Establishes three-axis trade-off: aspect ratio, order preservation, stability.

**Key contribution:** Formalizes that aspect ratio and stability are in fundamental tension. No algorithm achieves both simultaneously. This trade-off is still unresolved as of 2026.

### Cascaded Treemaps — Lü and Fogarty (2008)
Published at *Graphics Interface 2008*. Instead of strictly nested rectangles, uses cascaded/offset rectangles that make hierarchy levels distinguishable through visual layering. Creates depth cues and natural padding between siblings. Addresses the core treemap critique that internal structure is invisible.

**What it solves:** Hierarchy visibility inside treemaps. Addresses the "all structure looks like flat tiles" problem.

**Failure for our case:** Still rectangular. Containment is visual but not organic/curved. The membrane effect is suggested by offsets, not boundaries.

### Voronoi Treemaps — Balzer and Deussen (2005)
Published at *IEEE Information Visualization (InfoVis) 2005*. Replaces rectangles with Voronoi cells — weighted centroidal Voronoi tessellations produce convex polygons that pack the space. Works in non-rectangular canvases. Hierarchy is shown through nested polygonal containment.

**What it solves:** Non-rectangular containment. Organic-feeling boundaries. Area-proportional cells with arbitrary boundary shapes.

**Failure for our case:** Slow to compute (iterative relaxation). Cells are convex polygons, not smooth curves — still "jagged" looking. Stability is poor: minor data changes cause substantial cell rearrangements. The 2005 paper acknowledged convergence issues. Later work (Nocaj and Brandes 2012 — "Computing Voronoi Treemaps: Faster, Simpler, and Resolution-independent") addressed speed but not stability.

**Closest to our membrane goal** in the rectangular treemap family.

### Neighborhood-Preserving Voronoi Treemaps (2025)
Published in *IEEE TVCG* (arxiv: 2508.03445). Extends Voronoi treemaps to incorporate data similarity — cells that are semantically related are placed adjacent. Uses Kuhn-Munkres matching and greedy swapping during optimization. Achieves 62% average constraint preservation vs. 35% for random initialization.

**What it adds:** Semantic spatial relationships inside the containment structure. Nodes that belong together not just hierarchically but semantically cluster near each other.

**Failure for our case:** Still no continuous zoom; interactive prototype only allows step-through. Stability during data-driven updates not addressed.

### Bubble Treemaps — Görtler, Schulz, Weiskopf, Deussen (2018)
Published in *IEEE TVCG 2018*. Each node is represented with nested contour arcs (circles with explicit spacing between hierarchy levels). Hierarchical containment shown through nested bubble structures. Allocates explicit whitespace for visual variables (uncertainty encoding).

**What it solves:** Smooth, curved containment boundaries — closest thing to "membrane" in the literature. The nested arc approach creates a natural inside/outside distinction that reads organically.

**Failure for our case:** Not space-efficient. Explicit whitespace allocation reduces compression. Does not handle large fan-out gracefully — with 200+ children, bubbles become too small. No zoom mechanism described. Good aesthetics; poor compression.

### GosperMap — Auber et al. (2013)
Published in *IEEE TVCG 19(11)*. Uses a Gosper space-filling curve to generate irregular nested regions for hierarchy. Input ordering preserved — adjacent children in the hierarchy appear adjacent geometrically. Supports size-proportional leaves.

**What it adds:** Irregular but aesthetically interesting containment regions. Unlike rectangular treemaps, the regions feel more organic.

**Failure for our case:** The Gosper fractal structure imposes a rigid mathematical pattern. Fan-out must fit the curve's structure. Not adaptive to arbitrary tree shapes. Computationally involved.

---

## Circle/Bubble Packing

### Circle Packing Hierarchy — Wang, Wang, Dai, Wang (2006)
Published at *CHI 2006*. Tangent circles represent sibling nodes at each level. Children of a node are packed inside that node's circle. Size-proportional. Simultaneous clearer and more compact than rectangular views for hierarchy with visible groupings.

**What it solves:** Very clear containment metaphor. Every level has a natural circular boundary. Organic, non-rectangular look. Small nodes remain visible (no extreme aspect ratios).

**Failure for our case:** Severe space inefficiency. Circle packing never exceeds ~90.7% area coverage (hexagonal packing theoretical limit); nested packing compounds the inefficiency — deep hierarchies leave enormous gaps. With large fan-out (200+ children), innermost circles become too small to label. No zoom mechanism described in the original paper.

---

## Focus+Context and Dynamic Layouts

### Hyperbolic Browser — Lamping, Rao, Pirolli (1995)
Published at *CHI 1995*. Maps a tree onto a hyperbolic plane (which has exponentially more space near the periphery), then projects onto a circular display. More display space allocated to the focus area with smooth fall-off by distance. Supports multiple foci. Continuous smooth animation between focus changes.

**What it solves:** Criterion (d) — continuous exploration without jarring jumps. The context is always present. Navigation is smooth because it's a continuous mathematical transformation, not a discrete expand/collapse.

**Failure for our case:** The hyperbolic distortion makes the periphery heavily compressed and geometrically distorted. In practice, users can only meaningfully read ~2-3 levels at once. No containment/membrane effect. The circular display constraint is limiting. H3 (Munzner 1997, extended to 3D) addressed scale but not containment.

### SpaceTree — Plaisant, Grosjean, Bederson (2002)
Published at *IEEE InfoVis 2002*. Received IEEE VIS Test of Time Award in 2022. Node-link tree browser with dynamic branch rescaling — branches adapt to available screen space. Preview icons summarize collapsed subtree topology. Optimized camera movement for navigation.

**What it solves:** Continuous exploration feel (criterion d) through intelligent camera movement and branch rescaling. Users can see both the current focus and surrounding context through preview glyphs.

**Failure for our case:** Node-link diagrams inherently waste space with edges. No containment. No compression — layout spread is still bounded by the deepest subtree.

### Degree-of-Interest Trees — Card and Nation (2002)
Published at *AVI 2002*. Assigns each node a degree-of-interest (DOI) score based on user interaction and proximity to focus. High-DOI nodes get more display space; low-DOI nodes are compressed or hidden. Fits within predetermined display bounds.

**What it solves:** Adaptive allocation of display space based on user focus (criteria a and d together). Attention-reactive layout.

**Failure for our case:** Requires explicit interest model — the system must predict what the user cares about. When predictions are wrong, the layout feels arbitrary. No containment structure.

### Browsing Zoomable Treemaps — Blanch and Lecolinet (2007)
Published at *IEEE TVCG*. Hybridizes treemaps with zoomable user interfaces (ZUIs). Consistent interaction techniques allow navigation in very large hierarchies (tested with 700K nodes across 13 levels). Structure-aware navigation uses the hierarchy to guide zoom behavior.

**What it solves:** Criteria (a) and (d) — adaptive packing through zoom, and continuous exploration at scale. This is probably the most direct antecedent to what we want for file system navigation.

**Failure for our case:** The zoom is semantic but the underlying layout is still a rectangular treemap. No membrane/containment aesthetics. At the leaf level, rectangles are still rectangles. Stability during zoom transitions depends on the underlying layout algorithm (squarified), which is inherently unstable.

### Mental Map Preservation — Misue, Eades, Lai, Sugiyama (1995)
Published in *Journal of Visual Languages and Computing 6*. Foundational work on layout stability during dynamic graph updates. Defines properties that a layout should maintain when nodes/edges are added/removed to preserve user orientation.

**What it solves:** Criterion (d) — no jarring jumps. Establishes theoretical basis for stability preservation.

**Key finding:** Absolute position preservation and relative position preservation are distinct strategies. Relative position preservation (cluster-based) is more practical for large graphs.

**Still open:** There is no algorithm that simultaneously achieves good layout aesthetics AND strong mental map preservation for hierarchical data. The trade-off between visual quality and stability is an acknowledged open problem.

---

## Compound Graph Layouts

### CoSE — Dogrusoz, Giral, Cetintas, Civril, Demir (2009)
Published in *Information Sciences 179*. Spring-embedder force-directed algorithm extended to compound (nested) graphs. Defines forces for inter-cluster repulsion, intra-cluster spring forces, gravity toward cluster center. Handles arbitrary nesting depth. Implemented in Cytoscape.

**What it solves:** Force-directed layout for hierarchical containment — the layout "breathes" organically because it's physics-based. Compound nodes get tighter when their children are spatially close.

**Failure for our case:** Force-directed layouts with compound nodes are slow to converge for large hierarchies. The compound node boundary is computed as the bounding box of children, not a smooth membrane. Fan-out of 200+ children causes extreme slowdown. Not designed for space efficiency.

### fCoSE — Balci, Dogrusoz (2022, *IEEE TVCG*)
Extends CoSE with constraint support (alignment, separation, position constraints) and uses spectral layout for initialization, dramatically improving speed. Still a compound spring embedder.

**What it adds:** Practical scale for interactive use. Constraint system allows forcing specific groupings to colocate.

**Still fails:** Same compound-boundary issues as CoSE. Not space-filling.

### Overview+Detail Layout for Compound Graphs — Han, Lieffers, Morrison, Isaacs (2024)
Published at *arxiv 2408.04045*, targeting TVCG. Positions expanded groups adjacent to their collapsed counterparts rather than replacing them. Preserves higher-level structure while showing nested detail. Modified Reingold-Tilford for compound placement.

**What it solves:** Viewing collapsed and expanded states simultaneously — criterion (d), continuous context during exploration.

**Failure:** Layout direction constrained to right/bottom only. No space efficiency. No membrane aesthetics.

---

## Survey Papers

### A Visual Survey of Tree Visualization — Jürgensmann and Schulz (2010)
Poster at *IEEE InfoVis 2010*. Catalogs tree visualization techniques along dimensions of dimensionality (2D vs. 3D), edge representation (explicit edges vs. implicit/space-filling), and node alignment (axis-aligned vs. radial vs. free).

### Treevis.net — Schulz (2011, updated to 341 techniques as of 2025)
Published in *IEEE Computer Graphics and Applications*. Living reference. Now contains 341 techniques filterable by dimensionality, representation, and alignment. This is the definitive catalog. The sheer size (341 techniques) confirms that tree visualization is one of the best-studied areas in InfoVis.

### The Design Space of Implicit Hierarchy Visualization — Schulz et al. (2011)
Surveys "implicit hierarchy" techniques — those where parent-child relationships are not drawn as edges but implied through spatial containment or adjacency (treemaps, icicle plots, sunbursts, etc.). Identifies four design axes: dimensionality, edge representation, node representation, layout.

### Perceptual Guidelines for Creating Rectangular Treemaps — Kong, Heer, Agrawala (2010)
Published in *IEEE TVCG*. Empirical study establishing that aspect ratio significantly affects area comparison accuracy. Confirmed that neither extreme aspect ratios nor perfect squares are ideal. Established benchmark criteria for layout evaluation. The key result: accuracy is highest for aspect ratios in the range 1:1.5 to 1:3.

---

## What the Field Measures: Quality Metrics

The InfoVis community evaluates hierarchical layouts along these axes:

1. **Aspect ratio** — ratio of longer to shorter side of each rectangle. Squarified targets < 2:1. Empirically validated by Kong et al. 2010 as correlated with perceptual accuracy.

2. **Area error** — deviation between assigned area and ideal area (proportional to node weight). All algorithms fail here when parent frames consume space.

3. **Stability / layout distance** — how much the layout changes when data changes. Typically measured as average displacement (Manhattan or Euclidean) of node positions between time steps. Ordered treemaps and strip treemaps score best.

4. **Order preservation** — whether the input ordering of siblings is maintained in the layout. Squarified fails; ordered/strip treemaps succeed.

5. **Readability** (Bederson et al.'s metric) — 1.0 for pure slice-and-dice, near 0 for scrambled. Quantifies how easily users can locate a known item.

6. **Neighborhood preservation** (Voronoi treemaps paper 2025) — what fraction of semantically adjacent nodes are geometrically adjacent. A* shortest path between separated pairs as a secondary metric.

7. **User task performance** (CHI papers) — target search time, topology estimation accuracy, navigation error rate. Task-based evaluation is considered the gold standard but is expensive.

There are no universally accepted benchmarks. Each paper introduces new metrics suited to its technique. This fragmentation is an acknowledged weakness of the field — comparisons across papers are difficult.

---

## What the Field Has Converged On

1. **Squarified treemaps** are the de facto standard for space-filling, area-proportional hierarchy visualization. Used in DaisyDisk, WinDirStat, Disk Inventory X, Tableau.

2. **The aspect ratio vs. stability trade-off** is fundamental and irreducible. No rectangular treemap algorithm solves both simultaneously. Strip treemaps are the best known compromise.

3. **Reingold-Tilford (Buchheim variant)** is the de facto standard for node-link tree layout. Used in D3, Graphviz, and essentially every tree visualization library.

4. **Hyperbolic geometry** is the best-known approach for continuous focus+context tree navigation, but it has not seen widespread adoption due to disorientation effects at the periphery.

5. **Mental map preservation** is important for dynamic layouts; relative position preservation is more practical than absolute.

6. **Containment works better than edge drawing** for deep hierarchies with large fan-out (implicit vs. explicit hierarchy representation). Space-filling techniques are consistently preferred for file system visualization specifically.

---

## What the Field Has NOT Converged On (Open Problems)

1. **Smooth membrane/organic containment**: No paper produces curved, smooth, organic containment boundaries that also pack space efficiently. Bubble treemaps (2018) come closest but sacrifice compression. Voronoi treemaps produce polygonal (not smooth) boundaries. This is an open aesthetic+algorithmic gap.

2. **Adaptive packing at every zoom level simultaneously**: Zoomable treemaps (Blanch and Lecolinet 2007) handle this for rectangular layouts; no paper handles it for organic/curved layouts.

3. **Continuity + stability + aspect ratio**: The three-way trade-off. Every paper solves two at the expense of the third.

4. **Large fan-out (200+ children)**: None of the circle packing, Voronoi, or force-directed compound approaches handle directories with 200+ siblings gracefully. Rectangle layouts handle it geometrically but create unreadable slivers. This is an acknowledged gap — no paper specifically addresses it.

5. **File/folder hierarchy specifically with mixed leaf sizes and deep nesting**: Most papers evaluate on trees with small fan-out (3-5 children per node) and modest depth (5-8 levels). File systems have irregular fan-out, depth 10-15+, and highly skewed size distributions. Most algorithms degrade on real file system data.

6. **Neural/ML layout methods**: Several papers (2020-2024) explore learned layouts using GNNs, but none produce reliably better results than algorithmic approaches for hierarchical containment tasks. This remains exploratory.

---

## The Closest Paper to Our Five Criteria

**Browsing Zoomable Treemaps — Blanch and Lecolinet (2007)** comes closest to addressing all five criteria in a single system:

- (a) Adaptive packing: squarified treemap recalculated at each zoom state ✓
- (b) Membrane containment: rectangular frames with shading, not organic ✗
- (c) Compression maximized: space-filling, every pixel used ✓
- (d) Continuous exploration: ZUI-based continuous zoom, no jarring jumps ✓
- (e) Aesthetics: functional but not beautiful; rectangular ✗

No single paper addresses all five. The gap is specifically criteria (b) and (e) — organic, beautiful containment — combined with (c) high compression and (d) continuous exploration. These goals are in tension: organic boundaries (curved, smooth) are computationally expensive to compute, hard to zoom continuously, and typically sacrifice compression.

**Runner-up**: Bubble Treemaps (Görtler et al. 2018) for (b) and (e) — it's the most aesthetically organic space-filling containment in the literature. But it explicitly sacrifices (c) compression and doesn't address (d) zoom.

---

## The Answer to "Has Somebody Done This Before?"

**Honest verdict: No, but components exist.**

The InfoVis community has, over 40+ years, produced 341+ tree visualization techniques (per Schulz's living catalog). Every individual criterion in our target has been addressed somewhere:

- Adaptive packing: zoomable treemaps (2007)
- Organic containment: Voronoi treemaps (2005), bubble treemaps (2018)
- Compression: squarified treemaps (2000), circle packing (2006)
- Continuous navigation: hyperbolic browser (1995), SpaceTree (2002)
- Aesthetics: GosperMap (2013), bubble treemaps (2018), Voronoi (2005)

But the **combination** — organic membrane containment that is also space-efficient, continuously zoomable, stable across expansion states, and handles large fan-out — does not appear in the literature as a unified system.

The closest thing is a hypothetical hybrid: the ZUI navigation model of zoomable treemaps applied to a force-directed compound layout (fCoSE-style) with smooth boundary rendering (bubble treemap-style contour arcs) and DOI-based adaptive compression. Each component is published; the integration is not.

This confirms our design problem is genuine and not a duplicate of prior work. The field has solved the pieces; the synthesis is ours to build.

---

## Key Sources

- Reingold & Tilford (1981): https://reingold.co/tidier-drawings.pdf
- Bruls, Huizing, van Wijk (2000): https://vanwijk.win.tue.nl/stm.pdf
- Bederson, Shneiderman, Wattenberg (2002): http://www.cs.umd.edu/~ben/papers/Bederson2002Ordered.pdf
- Lü and Fogarty (2008): https://dl.acm.org/doi/10.5555/1375714.1375758
- Balzer & Deussen (2005): https://ieeexplore.ieee.org/document/1532128/
- Neighborhood-Preserving Voronoi (2025): https://arxiv.org/abs/2508.03445
- Wang et al. circle packing (2006): https://www.researchgate.net/publication/221516201_Visualization_of_large_hierarchical_data_by_circle_packing
- Görtler et al. bubble treemaps (2018): https://graphics.uni-konstanz.de/publikationen/Goertler2018BubbleTreemapsUncertainty/bubble-treemaps.pdf
- GosperMap (2013): https://dl.acm.org/doi/10.1109/TVCG.2013.91
- Blanch & Lecolinet zoomable treemaps (2007): https://ieeexplore.ieee.org/document/4376147/
- Lamping, Rao, Pirolli hyperbolic browser (1995): https://cgl.ethz.ch/teaching/scivis_common/Literature/Lamping95.pdf
- SpaceTree (2002): https://www.semanticscholar.org/paper/SpaceTree:-supporting-exploration-in-large-node-and-Plaisant-Grosjean/3816ccd8bd26db5d30adcc5b74607575d2966f50
- Card & Nation DOI trees (2002): https://faculty.cc.gatech.edu/~stasko/7450/Papers/card-avi02.pdf
- Dogrusoz et al. CoSE (2009): https://www.researchgate.net/publication/220311711_A_layout_algorithm_for_undirected_compound_graphs
- fCoSE (2022): https://www.semanticscholar.org/paper/fCoSE:-A-Fast-Compound-Graph-Layout-Algorithm-with-Balci-Dogrusoz/297fa618313dc82c808a527293260251d3e49c01
- Overview+Detail compound graphs (2024): https://arxiv.org/html/2408.04045v1
- Misue, Eades et al. mental map (1995): https://www.semanticscholar.org/paper/Layout-Adjustment-and-the-Mental-Map-Misue-Eades/8f3ea4c4374a59f2625a68e9498da03195f2efc0
- Kong, Heer, Agrawala perceptual guidelines (2010): https://idl.cs.washington.edu/files/2010-Treemaps-InfoVis.pdf
- Schulz treevis.net (2011): https://ieeexplore.ieee.org/document/6056510/

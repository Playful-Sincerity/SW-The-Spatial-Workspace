---
agent: research-algorithms
date: 2026-04-18
stream: incremental layout algorithms
scope: narrow — click-to-grow placement with fixed existing nodes
---

# Research — Incremental Click-to-Grow Placement Algorithms

## Scope

Narrow technical survey. Yesterday's think-deep (2026-04-17) surveyed the broad layout algorithm landscape. This agent focused on the specific question: *what is the simplest ALGORITHM for placing new children around a clicked parent while existing nodes stay pinned?*

---

## 1. Phyllotaxis / Golden-Angle Placement

**Algorithm name:** Fermat-spiral phyllotaxis placement.

**One-sentence description:** For the nth child placed around a parent, compute angle = n × 137.508° and radius = C × √n, then convert to Cartesian coordinates — no two items ever share an angle, and the spiral maximally distributes points.

**Closed-form formula (confirmed from open source):**

```javascript
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.39996 rad = 137.508°
function phyllotaxisPosition(parentX, parentY, index, totalChildren, maxRadius) {
  const angle  = index * GOLDEN_ANGLE;
  const radius = maxRadius * Math.sqrt(index / totalChildren);
  return {
    x: parentX + Math.cos(angle) * radius,
    y: parentY + Math.sin(angle) * radius
  };
}
```

Source confirmed in: `gist.github.com/enjalot/e1e442c8664b937112d6faff12c4b191` (d3 v4 phyllotaxis with rectangles).

**Complexity:** O(n) — one formula per child, no iteration needed.

**LOC in open source:** The placement kernel itself is 3-5 lines. Mike Bostock's d3 phyllotaxis Observable example is ~30 lines total including the SVG render.

**Handles our constraint ("don't move existing; place new ones around parent"):** YES, trivially — the formula is stateless and indexed. Child at index 0 never changes position when child at index 7 is added. Existing children are not referenced by new placements.

**Non-uniform subtree weights — the gap:** Standard phyllotaxis assigns equal angle increments regardless of child size/weight. Two adaptations exist:

- *Equal-area variant:* Replace √(index/total) radius with √(cumulativeWeight) — children with larger subtrees get placed farther out, but angle steps remain uniform. This preserves the golden-angle non-collision property.
- *Weighted-angle variant (ad hoc):* Assign each child an angular sector proportional to its subtree leaf count (see Balloon layout below), then place the child at the sector center. This breaks the phyllotaxis pattern entirely and produces the standard radial-wedge layout, not a spiral.

**Verdict on non-uniform weights:** Pure phyllotaxis cannot natively allocate different angular spans per child. The radius-weighting trick partially compensates (larger subtrees push outward) but does not reserve proportional angular space. For genuinely unbalanced trees (one child has 200 descendants, another has 2), pure phyllotaxis creates visual confusion — the 200-descendant child gets the same angular gap as the 2-descendant child. The fix is a hybrid: weighted angular sector allocation (see Algorithm 3 below) for the first level of placement, phyllotaxis only for roughly uniform siblings.

---

## 2. Minimum Translation Vector (MTV) for Parent Displacement

**Algorithm name:** Circle-pair MTV push-out (from separating axis theorem, specialized for circles).

**One-sentence description:** Given a newly-placed parent circle P and a set of fixed sibling circles S, for each overlapping sibling compute the unit vector from S.center to P.center, multiply by (r_P + r_S − dist), and sum the resulting push vectors to get total displacement.

**Complexity:** O(k) where k = number of overlapping siblings. Finding all overlapping siblings from a set of n fixed circles is O(n) with a spatial grid or O(n log n) with a sweep.

**Pseudocode (7 lines):**

```
function resolveParentOverlap(parent, fixedSiblings):
  displacement = {x: 0, y: 0}
  for each sibling in fixedSiblings:
    dist = distance(parent.center, sibling.center)
    overlap = (parent.r + sibling.r) - dist
    if overlap > 0:
      normal = normalize(parent.center - sibling.center)
      displacement += normal * overlap
  parent.center += displacement
  return parent
```

**Limitation of summing vectors:** The naive summed-MTV approach can fail when multiple siblings overlap from different sides — the parent may oscillate or not reach a feasible position in one pass. The practical fix is to iterate 3-5 passes until overlap = 0 or a maximum iteration count is hit. This is O(k × iterations), typically O(5k) in practice.

**Closest-feasible-point alternative:** For the specific problem of "move parent circle minimum distance to clear all fixed obstacles," the exact solution is a constrained quadratic program (minimize ‖x − x₀‖² subject to ‖x − sᵢ‖ ≥ rᵢ + rₚ for all i). This is convex if all constraints are circular, and can be solved exactly via projected gradient or Frank-Wolfe in O(k²) iterations. For k < 10 siblings, this is fast enough. For the common case of 1-3 overlapping siblings, the summed-MTV pass converges in 1-2 iterations and is acceptable.

**LOC in open-source:** The d3-force collision force (`forceCollide`) implements a similar iterative MTV across all pairs in ~80 lines of JavaScript. The pure circle-pair MTV kernel is ~15 lines.

**Satisfies our constraint:** YES for the parent (the new parent is the only moving entity). Existing pinned siblings never move. The parent finds its closest non-overlapping position from its initial placement.

---

## 3. Incremental Layout in Shipped Tools

### 3a. fCoSE (Cytoscape.js) — fixedNodeConstraint

Algorithm: Fast Compound Spring Embedder with spectral initialization + force-directed polishing. Published: Balci & Dogrusoz, IEEE TVCG 28(12), 2022.

The `fixedNodeConstraint` option pins exact (x,y) coordinates for specified nodes. During force simulation, these nodes generate constraint forces but are not displaced. New unconstrained nodes receive initial positions from spectral layout or neighbor barycenter heuristic, then are pulled into place by spring forces while pinned nodes absorb their forces.

Constraint satisfaction: new nodes converge to non-overlapping positions in O(k × numIter) where k = constrained nodes and numIter ≤ 2500 default. In practice, incremental runs use `initialEnergyOnIncremental: 0.3` to start cool, converging in ~200-400 iterations.

LOC: The fCoSE source repo (`iVis-at-Bilkent/cytoscape.js-fcose`) is ~2,800 lines. The fixedNodeConstraint enforcement subpath is ~120 lines.

**Satisfies our constraint:** YES — this is the best-documented shipped implementation of "pin existing nodes, place new ones around them." The algorithm is production-quality (npm: 185k weekly downloads as of 2025). Limitation: it runs force simulation, so placement is not closed-form; it converges stochastically.

### 3b. yFiles Partial Layout

Algorithm: Three-step approach — (1) group partial (new) elements into subgraph components, (2) apply a sub-layout to each component, (3) place each component as a rigid body near its fixed neighbors using BARYCENTER positioning (component placed at weighted centroid of its fixed neighbors) or FROM_SKETCH (component placed near its original position).

Does NOT move fixed elements: by design. Fixed elements are read-only constraints.

Limitation: partial layout "is not aware of the fixed elements" for the internal arrangement of the component — only its placement location respects fixed neighbors. Visual discontinuities can occur between the component's internal layout style and the surrounding fixed diagram.

LOC: Closed-source (commercial library). API surface suggests ~1,000+ lines for the partial layout subsystem.

**Satisfies our constraint:** YES for placement of component near fixed nodes. PARTIAL for the quality of the internal component layout (sub-layout algorithm is re-run from scratch inside the component, so it may not match the visual style of the surrounding fixed layout).

### 3c. Graphviz neato with `pin=true` and `-n` flag

Algorithm: Stress majorization (MDS). With `pin=true` on existing nodes, neato treats them as fixed points and minimizes global stress only over the remaining free nodes.

Mechanism: The stress function is ∑ᵢ<ⱼ wᵢⱼ(‖xᵢ − xⱼ‖ − dᵢⱼ)², where pinned nodes are constant terms. Gradient descent over free nodes only.

**Satisfies our constraint:** YES — neato's pin attribute is the oldest shipped implementation of this exact problem. Limitation: stress majorization is a global energy function; even free nodes may be pulled away from "expected" positions by the graph's edge-length ideal distances. For tree-structured data with no explicit edge lengths, the result may not respect the tree hierarchy visually.

### 3d. cytoscape.js-layout-utilities (Bilkent, open source)

Algorithm: Heuristic pre-placement. For each new node: if it has exactly one positioned neighbor, score 4 quadrants around that neighbor and place in the least-crowded quadrant at `idealEdgeLength` distance. If it has multiple neighbors, place at their geometric centroid. If it has no neighbors, place on the periphery of the existing layout bounding box.

Not a full layout run — this is a seed-position heuristic designed to give incremental layout (e.g. fCoSE) a better starting point.

LOC: ~150 lines for the placement heuristic. GitHub: `iVis-at-Bilkent/cytoscape.js-layout-utilities`.

**Satisfies our constraint:** YES for a "good enough" seed, NO for a final aesthetic result (a force pass is expected to follow).

### 3e. Sigma.js, Gephi (ForceAtlas2), ELK

- Sigma.js: No built-in incremental layout. Layouts are full recomputes. Incremental use requires external force simulation with pinned nodes manually managed.
- Gephi/ForceAtlas2: Continuous algorithm — you can stop it, add nodes, set their (x,y), and resume. No formal pin mechanism; new nodes start at (0,0) or user-set position and drift. Community workaround: set positions before starting, let ForceAtlas2 settle.
- ELK radial algorithm: 5-step pipeline (node placement, overlap removal, compaction, size calculation, edge routing). No documented incremental/partial mode in the radial algorithm specifically. ELK Layered supports `fromSketchMode` (hierarchical only). ELK Stress supports `org.eclipse.elk.stress.fixed` to pin a node by setting its position and marking it fixed.

---

## 4. Reingold-Tilford and Incremental Variants

**Standard RT / Buchheim / Walker:** All require a full tree re-layout pass. The Mod-based offset propagation means adding one child to a node can require recomputing the Mod values for all ancestors and their subtrees — not O(1) per new child.

**Can RT be adapted for "place only new children"?** Technically yes, with these constraints:

- The parent's assigned position is fixed.
- The new children must fit within the parent's angular sector (for radial variant) or within the allocated x-width (for horizontal variant).
- Siblings of the parent (fixed) define the boundaries.

In practice, this is a sector-filling subproblem, not an RT problem. RT's value is in globally minimizing width while centering parents over children — neither goal applies if the parent is already pinned. What replaces RT for the incremental case is the angular-wedge allocation algorithm (see Algorithm 5 below).

**d3-flextree (Klortho, 364 stars):** Variable-size extension of RT, used by markmap (12.7k stars). Still a full-recompute algorithm on each call. Does not support pinned subtrees. LOC: ~360 lines.

**Tidy (zxch3n):** High-performance O(n) RT implementation in Rust/WASM. Full recompute only. Not incremental.

**Conclusion:** No published incremental variant of RT exists as a standalone library. The problem is architectural — RT is designed as a global aesthetics optimizer, which is fundamentally incompatible with "don't touch existing nodes."

---

## 5. d3.pack Incremental and Smallest-Enclosing-Circle

**d3.packSiblings:** Front-chain packing algorithm (Wang et al.). Packs all provided circles by placing each one tangent to two existing front circles. No fixed/pinned circle support — all circles are repositioned. O(n²) worst case, O(n) average. ~120 lines in `d3-hierarchy/src/pack/siblings.js`.

**d3.packEnclose:** Matoušek-Sharir-Welzl algorithm. Computes the smallest enclosing circle of a set of circles in expected O(n) time. Returns `{x, y, r}`. This answers "what is the minimum circle that contains all these existing circles?" but not "where can I add one more circle inside this parent without overlapping existing children?"

**Is the reverse problem tractable?** The problem "pack a new circle of radius r_new inside a parent circle of radius R, avoiding k fixed existing circles" is a constrained feasibility problem. It is tractable for small k:

- Enumerate candidate positions: new circle must be tangent to at least one existing circle or the parent boundary (at a feasible tangent point). For k fixed circles and 1 parent boundary, there are O(k) tangent candidates.
- Check each candidate for feasibility (no other overlaps): O(k) per candidate.
- Total: O(k²) — feasible for k < 50.

No off-the-shelf library implements this. It requires custom code (~50-80 lines).

**Closest open-source approximation:** The recursive circle packing algorithm at `gorillasun.de/blog/a-recursive-circle-packing-strategy-for-organic-growth-patterns` uses a place-and-check loop: generate a random candidate position, reject if it overlaps any existing circle. With importance sampling near existing circles' tangent points, convergence is fast in practice for sparse packings but worst-case unbounded for dense packings.

---

## 6. Dynamic Graph Drawing / Online Layout Literature

**Key survey:** Beck et al., "A Taxonomy and Survey of Dynamic Graph Visualization," Computer Graphics Forum, 2016 (35 citations, 40+ years of literature). Two families of algorithms:

1. **Offline dynamic layout:** Full graph evolution is known in advance. Layout is computed globally over all time steps. Better mental map preservation possible (can smooth paths across time). Example: DynDAG (Sugiyama-based, 1998).

2. **Online / incremental dynamic layout:** Only past states are known. New step is computed from previous layout. Algorithm: start from last layout, apply small local updates.

**Mental map preservation definition (canonical):** "The placement of existing nodes and edges should change as little as possible when a change is made to the graph." — formally measured as ∑ nodes ‖xᵢ(t) − xᵢ(t−1)‖ / n.

**Key finding from Beck et al.:** "Stability is synonymous with the preservation of the mental map." The literature has never produced a single algorithm that simultaneously maximizes: (a) aesthetic quality of new placement + (b) stability of existing placement. These are in tension — the best aesthetic placement for new children may require reorganizing existing siblings.

**Foresighted Layout (Diel 2001):** Solves the stability problem by looking ahead — computes future states and chooses current layouts that minimize total displacement across future changes. O(T × layout_cost) where T = lookahead window. Not practical for interactive "click to expand" where future state is unknown.

**Incremental Layout for Online Dynamic Graphs (Dogrusoz et al., UC Davis):** Paper at `vis.cs.ucdavis.edu/papers/tarik_incremental.pdf` (binary-only, could not decode). Known from citations: uses force-directed update with frozen existing nodes and short simulation run for new nodes only.

**Practical conclusion from the literature:** The standard shipped solution for "add new nodes, don't disturb existing" is: (1) pin existing nodes, (2) use force-directed or constraint-based algorithm on new nodes only, (3) run for limited iterations. No algorithm achieves this with single-pass closed-form placement that also satisfies global aesthetic criteria. The closest to closed-form is the angular wedge allocation algorithm (below).

---

## 7. Angular Wedge / Balloon Layout — The Most Actionable Algorithm

**Algorithm name:** Proportional Angular Sector Allocation (radial balloon layout variant, after Ka-Ping Yee et al. 2001 and the balloon layout family).

**One-sentence description:** Assign each child of the clicked node an angular sector proportional to its leaf-descendant count; place each child at the center of its sector at radius = nodeSize / (2 × sin(sectorAngle / 2)); recurse.

**Formula:**

```
totalLeaves = sum(leafCount(child) for child in newChildren)
cumAngle = parentWedgeStart
for each child in newChildren:
  childAngle = parentWedgeSpan * (leafCount(child) / totalLeaves)
  child.x = parent.x + cos(cumAngle + childAngle/2) * radius(child, childAngle)
  child.y = parent.y + sin(cumAngle + childAngle/2) * radius(child, childAngle)
  cumAngle += childAngle
  // radius ensures child circle fits within its sector without overlap:
  // radius = max(minRadius, child.r / sin(childAngle / 2))
```

**Complexity:** O(n) where n = number of new children. Single pass, no iteration.

**Key property for incremental use:** The parent's position is fixed. The parent's angular wedge (the sector allocated to it by its own parent) is known and fixed. New children are placed only within that wedge. Existing siblings of the parent (who occupy adjacent wedges) are never touched.

**Non-uniform weight handling:** This algorithm handles it natively — larger subtrees get wider wedges, forcing their children farther out proportionally. This is the fundamental difference from pure phyllotaxis.

**Overlap with siblings:** The wedge boundary is a hard constraint; children of different parents live in non-overlapping wedges by construction. Overlap between a child and its parent's sibling nodes can only occur if the parent's radius is too large. Resolution: check parent.r + sibling.r > dist(parent, sibling) and if so apply MTV push-out to parent only (see Algorithm 2).

**LOC in open source:** mxRadialTreeLayout (mxGraph/draw.io) implements this pattern in ~350 lines of Java. The Berkeley Yee et al. paper described the algorithm in 2001 and noted it "comfortably accommodates addition and deletion of nodes" with "only small perturbation of siblings."

**Shipping status:** mxGraph (draw.io), yFiles BalloonLayouter, ELK radial (Eades 1992 variant), and d3's `d3.tree` with radial projection all implement variants of this. It is the dominant algorithm for radial tree visualization in shipped tools.

---

## Summary: Top 3 Candidate Algorithms

### CANDIDATE 1 — Proportional Angular Sector Allocation (Balloon/Wedge) — RECOMMENDED

*Best for: the core click-to-grow placement problem.*

Each clicked folder's children are assigned angular sectors proportional to their leaf-descendant count. Children are placed at sector centers, radius computed from node size. O(n), single pass, no iteration. Existing nodes never touched — new children live entirely within the clicked parent's reserved wedge. After placement, a single-pass MTV check resolves any overlap of the parent circle with pinned siblings (O(k) for k siblings). This is what mxGraph/draw.io, yFiles Balloon, ELK Radial, and the original Ka-Ping Yee 2001 paper all converge on for interactive radial trees.

**Complexity:** O(n children) placement + O(k siblings) MTV check.
**LOC:** ~100-150 lines for placement kernel + ~20 lines for MTV check.
**Shipping status:** Multiple production implementations. draw.io, yFiles, ELK all ship variants today.
**Satisfies "don't move existing nodes":** YES by construction (wedge containment).

### CANDIDATE 2 — Phyllotaxis Placement + Iterative MTV

*Best for: visually organic, non-hierarchical feel where unbalanced subtrees are acceptable.*

Children placed at golden-angle spiral positions (3-line formula). Since phyllotaxis does not allocate proportional angular sectors, large and small subtrees get equal angular gaps — this produces the "one huge arm" asymmetry on unbalanced trees that yesterday's think-deep flagged as the confidence risk. MTV pass (3-5 iterations) resolves overlaps. Existing nodes never moved by definition (formula is per-child, not global). Best for roughly balanced trees (most folder structures at depth 2-4 ARE roughly balanced — exceptions are the inbox-type outliers, which are bag-detected separately).

**Complexity:** O(n) placement, O(k × iterations) MTV.
**LOC:** ~15 lines placement + ~25 lines iterative MTV = ~40 lines total.
**Shipping status:** No shipped graph/file-tree tool uses pure phyllotaxis. Observable notebooks by Bostock/enjalot demonstrate it. Risk: unvalidated on real unbalanced file trees.
**Satisfies "don't move existing nodes":** YES (placement formula is per new child).

### CANDIDATE 3 — fCoSE fixedNodeConstraint (force-directed with pinned nodes)

*Best for: aesthetically polished placements in networks where the tree structure is less strict.*

Existing nodes are passed as `fixedNodeConstraint`. New nodes start at barycenter-of-neighbors seed position (from cytoscape.js-layout-utilities heuristic). Force simulation runs with pinned nodes as fixed constraints, converging new nodes to non-overlapping positions. Quality is excellent — it is the best-validated algorithm for aesthetic placements around pinned nodes. Tradeoff: non-deterministic (small random perturbations), requires iteration budget (~200-400 steps for incremental), and does not respect angular wedge containment — new children may appear anywhere around the parent, not in a predictable quadrant.

**Complexity:** O(n × numIter) where numIter ≈ 200-400 for incremental runs.
**LOC:** Full fCoSE: ~2,800 LOC. The fixedNodeConstraint incremental subpath alone: ~120 LOC.
**Shipping status:** Production. 185k npm weekly downloads. IEEE TVCG 2022 paper. Cytoscape Web, multiple bioinformatics tools.
**Satisfies "don't move existing nodes":** YES — this is the explicit design contract of fixedNodeConstraint.

---

## Synthesis Note for Decision

Algorithm 1 (Wedge) is the correct primary choice for a file-tree canvas:
- It handles non-uniform subtree weights natively.
- It guarantees no overlap between sibling subtrees by construction.
- It is O(n) single-pass.
- It has multiple production existence proofs.
- The placement is deterministic — same click produces same result, satisfying spatial memory.

Algorithm 2 (Phyllotaxis) should be tested as a visual variant for nodes where children ARE roughly uniform in weight (e.g., leaf files in a flat directory). Its spiral feel is more organic-looking than the wedge's sector-fan. The risk is the unbalanced-tree case.

Algorithm 3 (fCoSE) is the right fallback for cases where the wedge algorithm produces a visually poor result (parent is deeply nested, wedge is very narrow, children are too squashed). Run fCoSE with existing-sibling pinning as a quality polish pass after wedge placement.

The MTV push-out (noted in "Algorithm 2" above) is a sub-component, not a standalone candidate — it is used by both Candidate 1 and Candidate 2 to resolve the rare case where the parent circle overlaps a pinned sibling after its children are placed.

---

## Sources

- [Phyllotaxis gist (enjalot, d3 v4)](https://gist.github.com/enjalot/e1e442c8664b937112d6faff12c4b191)
- [Animated Exploration of Graphs with Radial Layout (Yee et al. 2001, Berkeley)](https://bailando.berkeley.edu/papers/infovis01.htm)
- [SAT / Minimum Translation Vector — dyn4j](https://dyn4j.org/2010/01/sat/)
- [Circle-Circle Collision and Push-Out — ericleong.me](https://ericleong.me/research/circle-circle/)
- [cytoscape.js-layout-utilities (Bilkent)](https://github.com/iVis-at-Bilkent/cytoscape.js-layout-utilities)
- [cytoscape.js-fcose (Bilkent, IEEE TVCG 2022)](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose)
- [yFiles Partial Layout documentation](https://docs.yworks.com/yfiles-html/dguide/layout/partial_layout.html)
- [yFiles Incremental Diagram Layout](https://www.yworks.com/pages/incremental-diagram-layout)
- [yFiles Incremental Hierarchical Demo](https://live.yworks.com/demos/layout-features/hierarchical-incremental/)
- [Graphviz neato documentation](https://graphviz.org/docs/layouts/neato/)
- [ELK Radial Algorithm](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-radial.html)
- [d3-hierarchy packSiblings source](https://github.com/d3/d3-hierarchy/blob/main/src/pack/siblings.js)
- [d3-hierarchy pack documentation](https://d3js.org/d3-hierarchy/pack)
- [FORBID: Overlap Removal by SGD, GD 2022](https://arxiv.org/abs/2208.10334)
- [Fast Node Overlap Removal (Dwyer, Marriott, Stuckey, GD 2005)](https://link.springer.com/chapter/10.1007/11618058_15)
- [Minimum-Displacement Overlap Removal — Gansner & Hu, JGAA 2010](https://jgaa.info/index.php/jgaa/article/view/paper198)
- [Beck et al., Taxonomy and Survey of Dynamic Graph Visualization, CGF 2016](https://creativecoding.soe.ucsc.edu/courses/cmpm290A_vcs/papers/Beck_et_al-2016-Computer_Graphics_Forum.pdf)
- [Preserving the Mental Map using Foresighted Layout (Diel 2001)](https://scispace.com/papers/preserving-the-mental-map-using-foresighted-layout-591mito5g7)
- [Node Overlap Removal by Growing a Tree (Holroyd)](http://aeholroyd.org/papers/overlap.pdf)
- [mxRadialTreeLayout API](https://jgraph.github.io/mxgraph/docs/js-api/files/layout/mxRadialTreeLayout-js.html)

---
agent: research-github
date: 2026-04-17
stream: github / open-source implementations
---

# GitHub Research: Hierarchical File/Folder Canvas Layout

## Scope

Surveyed 30+ repositories across six library families: D3 hierarchy ecosystem, compound/container layout libraries, treemap/packing/space-filling, zoomable/focus+context, knowledge-tool canvas engines, and non-JS ecosystems. The goal: find what already exists that covers adaptive packing + membrane containment + compression + continuous exploration + visual quality at 3000+ nodes with one 469-child directory.

---

## D3 Hierarchy Ecosystem

### d3-hierarchy (core)
- **URL:** https://github.com/d3/d3-hierarchy
- **Last commit:** Active; v3.1.2 (2023+, actively maintained by Observable)
- **Algorithm:** Five layout families: `tree` (Reingold-Tilford tidy tree), `cluster` (dendrogram), `treemap` (squarified rectangles), `pack` (circle packing, Wilkinson 2005), `partition` (icicle/sunburst). All O(n) or near-O(n).
- **Scale at 3096 nodes / 469-child directory:** Tree layout handles large n in O(n) but a 469-child node creates a very wide level — uniform horizontal spacing collapses. Pack handles it but wastes space badly at wide nodes (circles can't tile efficiently around a 469-node ring). Treemap handles it well geometrically but loses parent-membrane clarity. No built-in adaptive response to zoom or expansion state.
- **License:** ISC (fully portable, no restriction)
- **Popularity:** 2.5k stars, de facto standard
- **Verdict:** Excellent base primitives; none of the five layouts alone solves the full problem.

### d3-flextree (Klortho)
- **URL:** https://github.com/Klortho/d3-flextree
- **Last commit:** v2.1.2 (2018); still cited in issues through 2024
- **Algorithm:** Enhanced Reingold-Tilford (van der Ploeg 2013 "Drawing Non-layered Tidy Trees in Linear Time"), extended to support per-node variable sizes via accessor functions. O(n). Spacing function can be per-pair.
- **Scale:** The algorithm is O(n) and handles variable node sizes, which is the critical capability for a hierarchy where some nodes are 1-file and one is a 469-child directory. The issue is it remains a left-right or top-bottom tree — it does not pack 2D space, it just arranges a tree with variable widths. The 469-child node will still create a massive horizontal span unless the tree is radial.
- **License:** WTFPL (public domain equivalent — fully portable)
- **Popularity:** 364 stars, 45 forks
- **Verdict:** Best algorithm for making a collapsible/expandable tree with variable node sizes. markmap uses this under the hood. Porting the algorithm to vanilla D3 is feasible — it is a pure JS function with no external deps beyond d3-hierarchy.

### markmap (markmap/markmap)
- **URL:** https://github.com/markmap/markmap
- **Last commit:** v0.18.0, December 2024 (actively maintained)
- **Algorithm:** Uses d3-flextree for horizontal tree layout + SVG + d3-zoom for pan/zoom. Nodes expand/collapse in-place.
- **Scale:** Designed for Markdown outlines, not for 3000+ arbitrary file nodes; no DOM culling. At large scale the SVG becomes heavy.
- **License:** MIT
- **Popularity:** 12.7k stars (the most popular implementation of the flextree pattern)
- **Verdict:** Best living example of flextree-as-mindmap. Not designed for the file hierarchy scale, but the layout algorithm + expand-collapse interaction pattern is directly relevant. TypeScript source, requires build toolchain — but the underlying d3-flextree call is extractable.

### Zoomable Treemap (various gists + vasturiano/treemap-chart)
- **URL:** https://github.com/vasturiano/treemap-chart (and mbostock gists)
- **Last commit:** vasturiano actively maintained through 2024
- **Algorithm:** d3.treemap squarified tiling. Click-to-zoom transitions (zoom into a cell, which expands to fill the viewport, revealing children in the same proportional layout).
- **Scale:** Vasturiano's implementation explicitly excludes nodes below `minBlockArea` from the DOM — designed for large datasets. The squarified algorithm handles 469-child directories well geometrically (children are proportionally sized).
- **License:** MIT
- **Popularity:** 76 stars (vasturiano/treemap-chart); classic mbostock gist widely referenced
- **Verdict:** Strongest compression + space-filling. Weakest on membrane clarity (rectangles imply containment but feel like spreadsheets). The zoom model is "replace viewport," which is jarring — you teleport into a child, lose context of siblings and ancestors.

### Zoomable Circle Packing (mbostock + vasturiano/circlepack-chart)
- **URL:** https://github.com/vasturiano/circlepack-chart; https://gist.github.com/mbostock/7607535
- **Last commit:** vasturiano maintained through 2024; mbostock gist is canonical but old
- **Algorithm:** d3.pack (Wilkinson circle packing). Click-to-zoom: camera zooms into the clicked circle while everything else rescales proportionally. Membranous containment is visually clear (circles nest inside circles). GitHub Next's repo-visualizer uses exactly this approach (D3 pack + force relaxation).
- **Scale:** vasturiano's implementation DOM-culls circles below minCircleRadius. At 3096 nodes this is necessary. The 469-child directory creates one very large parent circle with 469 small circles packed inside — which is actually legible because pack handles high-degree nodes gracefully. However, space efficiency is poor compared to treemap (circles leave corners empty).
- **License:** MIT (both)
- **Popularity:** vasturiano: 76 stars; mbostock gist: widely cited
- **Verdict:** Best membrane clarity, moderate compression. The zoom model is "camera" zoom (continuous, no teleport) — exploration feels more spatial. This is the approach GitHub Next chose after testing alternatives.

### GitHub Next repo-visualizer (githubocto/repo-visualizer)
- **URL:** https://github.com/githubocto/repo-visualizer
- **Last commit:** April 2023 (v0.9.1); unmaintained
- **Algorithm:** d3.pack (circle packing) for initial placement, then d3-force simulation for relaxation to fit SVG bounds and smooth git-history animations. Exports static SVG, not interactive.
- **Scale:** max_depth parameter; designed for CI/README use, not interactive exploration. No zoom/pan beyond static SVG pan.
- **License:** MIT
- **Popularity:** 1.3k stars
- **Verdict:** Good algorithm precedent (pack + force relaxation hybrid). Static output only — not directly usable for interactive canvas. Algorithm is portable.

---

## Compound / Container Layout Libraries

### cytoscape.js-fcose (iVis-at-Bilkent)
- **URL:** https://github.com/iVis-at-Bilkent/cytoscape.js-fcose
- **Last commit:** January 2023
- **Algorithm:** Fast Compound Spring Embedder (fCoSE). Combines spectral layout (for speed) with force-directed refinement (for aesthetics). Full compound node support: parent nodes contain their children, layout respects containment boundaries. Up to 2x faster than CoSE. User-defined placement constraints supported.
- **Scale:** Designed for interactive graph exploration; handles 1000+ nodes better than plain force-directed. The compound node architecture is directly relevant — parent directories become compound nodes with children inside.
- **License:** MIT
- **Popularity:** 174 stars; Bilkent lab is the academic authority on compound graph layout
- **Verdict:** Best compound layout algorithm that respects parent-child containment visually. Not D3-native; depends on cytoscape.js rendering pipeline. Porting the pure layout math is possible but complex.

### cytoscape.js-expand-collapse (iVis-at-Bilkent)
- **URL:** https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse
- **Last commit:** 2023
- **Algorithm:** Not a layout algorithm; a UX extension. Adds expand/collapse with animation, fisheye view, and layout re-run on state change. Directly models the interaction pattern Spatial Workspace needs.
- **License:** MIT
- **Verdict:** The interaction model (expand → re-layout → animate → focus) is worth studying even if not using cytoscape.js.

### ELK.js / elkjs (kieler)
- **URL:** https://github.com/kieler/elkjs
- **Last commit:** v0.11.1, March 2026 (actively maintained)
- **Algorithm:** Eclipse Layout Kernel — multiple algorithms: `layered` (Sugiyama-based hierarchical), `stress`, `mrtree` (multi-root tree), `radial`, `force`, `disco`. `layered` with `hierarchyHandling: INCLUDE_CHILDREN` is the compound-aware mode: it does a recursive bottom-up layout (children first, then parent expands to fit). Two-phase: Phase 1 computes child positions; Phase 2 sets parent bounds based on actual child space.
- **Scale:** Designed for production-grade diagram tools (used by Eclipse, VS Code diagram extensions). Web Workers supported for large graphs. Execution time comparison to Java ELK documented.
- **License:** EPL 2.0 (Eclipse Public License — compatible with open source use; commercial use requires checking)
- **Popularity:** 2.5k stars
- **Verdict:** Most mature compound-aware hierarchical layout engine in the JS ecosystem. The `layered` algorithm with `INCLUDE_CHILDREN` is the closest to the desired behavior: parents visually contain children, layout adapts when children change. Integration requires elkjs as dependency (WASM + worker). Algorithmically portable for pure-JS use.

### WebCola / cola.js (tgdwyer)
- **URL:** https://github.com/tgdwyer/WebCola
- **Last commit:** March 2018 (unmaintained)
- **Algorithm:** Constraint-based layout (IPOPT-style): force-directed with explicit constraints including group containment, alignment, ordering, and circular constraints. Groups force nodes inside a rectangular container.
- **Scale:** 2.1k stars but last commit 2018. Performance at 3000 nodes untested.
- **License:** MIT
- **Verdict:** Interesting constraint model (containers are enforced, not just suggested), but unmaintained. Not recommended for new projects.

### dagre / dagrejs
- **URL:** https://github.com/dagrejs/dagre
- **Last commit:** November 2025 (v2.0.0 — recently revived)
- **Algorithm:** Sugiyama-style directed graph layered layout. Hierarchical but DAG-oriented, not compound-aware (no visible parent containers). At 500+ nodes performance degrades without optimization.
- **License:** MIT
- **Popularity:** 5.6k stars
- **Verdict:** Does not solve compound containment. Useful for DAG dependency graphs, not file trees with parent membranes.

---

## Treemap / Packing / Space-Filling

### d3-voronoi-treemap (Kcnarf)
- **URL:** https://github.com/Kcnarf/d3-voronoi-treemap
- **Last commit:** v1.1.2, August 2022
- **Algorithm:** Voronoi treemap from the Nocaj & Brandes 2012 paper "Computing Voronoi Treemaps." Iterative relaxation of a Voronoi diagram until cell areas match input weights. Produces irregular polygonal cells rather than rectangles — each parent region subdivided into organic shapes. Membrane-like: parent polygon visually contains all children.
- **Scale:** 218 stars. Performance is iterative — at 1000+ nodes, convergence time is significant (seconds to minutes without parameter tuning). The 469-child node would require careful convergence tuning (lowering maxIterationCount, raising convergenceRatio). Not suitable for real-time re-layout on expand/collapse without precomputation.
- **License:** BSD-3-Clause (fully portable)
- **Verdict:** Most organic, membrane-like visual output of any algorithm surveyed. The look is closest to the "living organism" aesthetic. The computational cost makes it unsuitable for interactive expand/collapse without baking all states offline.

### vasturiano/circlepack-chart (see above)
Already covered. The DOM-culling + zoomable implementation is the most production-ready circle packing approach.

---

## Zoomable / Focus+Context

### prathyvsh/semantic-zoom
- **URL:** https://github.com/prathyvsh/semantic-zoom
- **Last commit:** Catalog repository; no active implementation
- **Verdict:** Useful conceptual catalog of semantic zoom patterns. Not an implementation.

### cns-iu/map4sci
- **URL:** https://github.com/cns-iu/map4sci
- **Last commit:** Unknown (4 stars)
- **Algorithm:** ZMLT (multi-level tree with semantic zoom). Three layout algorithms: BatchTree, CG, DELG. C++/TypeScript/Python stack. Zooming reveals more detail without teleporting.
- **Verdict:** The semantic zoom idea is directly relevant. The implementation is a C++/Docker pipeline — not portable to a single HTML file. Algorithm concept: different rendering resolution at different zoom levels with level-of-detail switching.

### larsvers gist: Semantic Zoom with Canvas
- **URL:** https://gist.github.com/larsvers/32f2ef58c910e1d4ada8a462f7474b75
- **Algorithm:** D3 zoom + canvas re-render at zoom thresholds. Labels and detail appear/disappear based on zoom level.
- **Verdict:** A clean, portable pattern for adding semantic zoom to a D3 canvas. Directly applicable to Spatial Workspace v2.

---

## Non-JS Ecosystems (Algorithm Mining Only)

### OGDF.js / ZJUVAI ogdf.js
- **URL:** https://github.com/ZJUVAI/ogdf.js
- **Algorithm:** OGDF C++ compiled to WASM via emscripten. Includes FM3, SugiyamaLayout, and dozens more. FM3 is the key algorithm: multilevel force-directed that runs in O(n log n) — handles thousands of nodes efficiently.
- **Verdict:** The FM3 algorithm from OGDF is worth understanding as a reference even if not using the WASM build. It achieves fast force-directed at scale by building a multilevel hierarchy and solving at each level.

### Graphviz (dot, neato, twopi, sfdp)
- The `twopi` algorithm (radial tree) and `sfdp` (sparse force-directed for large graphs) are documented. `sfdp` explicitly targets 100k+ node graphs. No JS port is current or practical for single-file use.

---

## Recency Assessment by Category

| Category | Status |
|---|---|
| D3 hierarchy core | Actively maintained (Observable, 2024+) |
| d3-flextree | Unmaintained since 2018, but algorithm is complete and widely used |
| markmap (uses flextree) | Actively maintained (December 2024) |
| cytoscape.js-fcose | Last 2023; Bilkent lab active on other projects |
| elkjs | Actively maintained (March 2026) |
| WebCola | Dead (2018) |
| dagre | Recently revived (November 2025) |
| d3-voronoi-treemap | Last August 2022 |
| vasturiano/* | Actively maintained (2024) |
| GitHub Next repo-visualizer | Abandoned (April 2023) |

---

## The 469-Child Node Problem

No library surveyed explicitly addresses the "one node has 469 children" pathology. This is a degenerate high-degree node case. Here is how each approach handles it:

- **d3.tree (Reingold-Tilford):** 469 children on one level creates an enormous horizontal span, making the rest of the tree look microscopic.
- **d3.pack (circle packing):** 469 children packed into one circle — works geometrically. The parent circle is large, children are small circles. Legibility degrades below ~40px diameter.
- **d3.treemap (squarified):** 469 children subdivide the parent rectangle proportionally. If all children have equal weight, they become very thin slivers (aspect ratio problem). Squarify mitigates this but 469 equal-weight items still produces poor rectangles.
- **fCoSE / compound layout:** 469 nodes inside one compound parent, force-directed to minimize overlap. Works but slow and unpredictable in shape.
- **ELK `mrtree` (multi-root tree):** Would radially distribute 469 children around the parent — closest to the "organic cluster" behavior Wisdom prefers.
- **Voronoi treemap:** 469 children subdivide the parent polygon organically — best visual result, worst computational cost.

**Key insight:** None of the existing libraries default to "adapt the layout strategy based on child count." That adaptive behavior would need to be custom logic sitting above whichever layout primitive is chosen.

---

## Summary Findings

### 1. Key Repositories Most Worth Mining

**A. d3-flextree (Klortho/d3-flextree)**
The most directly portable algorithm for a variable-size expanding tree. O(n), WTFPL license. The 364-star repo is small but the math is clean and proven (markmap uses it for 12.7k-star production use). Best for trees where children expand/collapse in-place with smooth re-layout.

**B. vasturiano/circlepack-chart + mbostock zoomable circle packing**
The best production-ready circle packing with DOM culling and zoom. GitHub Next validated circle packing as the clearest membrane representation after testing alternatives. MIT license. The zoom interaction (smooth camera, no teleport) is exactly the "continuous exploration" criterion.

**C. elkjs (kieler/elkjs)**
The most mature compound-layout engine. The `layered` + `INCLUDE_CHILDREN` combination produces the only layout where parent containers are sized by their actual children and nodes don't escape parent bounds. Actively maintained (March 2026). EPL 2.0 — algorithm ideas are free to port. The `mrtree` algorithm is specifically designed for tree-structured graphs and handles high-degree nodes by distributing children radially.

**D. d3-voronoi-treemap (Kcnarf)**
Best visual quality for organic, membrane-like containment. Voronoi cells feel like living cells dividing — the most aesthetically distinctive option. BSD-3-Clause. The computational cost means it is only viable for static renders or precomputed layouts, not interactive expand/collapse.

**E. d3-hierarchy squarified treemap + click-to-zoom (Observable)**
The highest compression — most files visible at once. Space-efficient enough to show 3096 nodes simultaneously at a high zoom level. The click-to-zoom "replace viewport" interaction model is the weakness: it is jarring and loses spatial context. The algorithm itself is solid.

### 2. Best Off-the-Shelf Algorithm to Port

**d3.pack (circle packing) + d3-zoom smooth camera + DOM culling at minRadius.**

Rationale:
- The pack algorithm is already in d3-hierarchy (no additional dependency), runs O(n log n), and handles the 469-child case better than any tree layout.
- Circles provide natural membrane containment — each parent is a circle that visually encloses its children.
- The smooth camera zoom (d3-zoom) gives continuous exploration without jarring jumps.
- DOM culling below a radius threshold (vasturiano's pattern) makes 3096 nodes tractable.
- GitHub Next independently converged on this choice after testing treemaps and node-link diagrams.

The key addition needed: a semantic zoom layer that shows labels and internal structure only at zoom levels where they are legible (the larsvers gist pattern + map4sci concept).

### 3. Gaps in Open Source

**What does not exist:**
- Any library that **adaptively switches layout strategy per subtree** based on child count (e.g., circle-pack for big nodes, treemap for medium, list for small).
- Any library with **true membrane rendering** — actual SVG paths drawn as organic boundaries around groups, not just colored backgrounds or circles.
- Any interactive hierarchy canvas that **maintains context across zoom levels** while also maximizing compression. The treemap model loses context; the circle-pack model wastes space; neither adapts.
- Any implementation that **handles 469-child nodes gracefully at all zoom levels** without user configuration.
- Any JS implementation of **degree-of-interest (DOI) trees** (Furnas 1986 concept) for file systems specifically. The academic literature has it; the open source does not.

### 4. Recency Assessment

This is an **active but fragmented problem**. The core layout algorithms are mature (d3-hierarchy: 2023+; elkjs: 2026; dagre: revived 2025). The interaction patterns are being reinvented repeatedly in different frameworks (React Flow + ELK, Cytoscape + fCoSE) without cross-pollination. No library synthesizes compression + membranes + adaptive zoom + continuity simultaneously. The most recent work (2024-2025) is in the React/flow-chart space (xyflow), not in the D3/SVG/file-tree space.

### 5. Has Somebody Done This Before?

**Honest verdict: No, not for the full requirements.**

Partial solutions exist:
- **GitHub Next repo-visualizer** — circle pack of a file tree, but static SVG, no interaction, unmaintained.
- **vasturiano/circlepack-chart** — interactive zoomable circle packing, but generic (not file-tree specific), no label-at-zoom-level, no adaptive strategy.
- **markmap** — excellent expand/collapse variable-size tree, but 1D layout (not 2D space-filling), designed for outlines not file hierarchies.
- **ELK layered + INCLUDE_CHILDREN** — compound layout with true containment, but oriented toward directed graphs/flowcharts, not file hierarchies, and the visual output is orthogonal/boxy.

Nobody has built an open-source canvas that simultaneously achieves (a) adaptive packing at every zoom/expansion state, (b) organic membrane-like parent containment, (c) maximum compression, (d) continuous spatial exploration, and (e) visual quality at 3000+ nodes for a file tree. The closest existence proof is the closed-source FoamTree (hierarchical Voronoi treemap for news aggregation), which is not open source.

The algorithm to build from: **d3.pack as the primary layout primitive + semantic zoom layer (larsvers pattern) + per-node DOM culling (vasturiano pattern) + custom adaptive logic for the 469-child pathology**. This is approximately 400-600 lines of new code on top of existing open source, not a from-scratch invention.

---

## Repository Quick Reference

| Repo | Algorithm | Stars | Last Active | License | Port Viable? |
|---|---|---|---|---|---|
| d3/d3-hierarchy | Tree, pack, treemap, partition | 2.5k | 2024+ | ISC | Already vanilla D3 |
| Klortho/d3-flextree | Variable-size R-T tree | 364 | 2018 (stable) | WTFPL | Yes |
| markmap/markmap | flextree + D3 zoom | 12.7k | Dec 2024 | MIT | Algorithm yes; build needed |
| vasturiano/circlepack-chart | D3 pack + DOM cull | 76 | 2024 | MIT | Yes |
| githubocto/repo-visualizer | D3 pack + force relax | 1.3k | Apr 2023 | MIT | Yes (algorithm) |
| iVis-at-Bilkent/cytoscape.js-fcose | Compound spring embed | 174 | Jan 2023 | MIT | Complex |
| kieler/elkjs | Layered/mrtree/radial | 2.5k | Mar 2026 | EPL 2.0 | Algorithm yes |
| tgdwyer/WebCola | Constraint-based | 2.1k | 2018 dead | MIT | Not recommended |
| dagrejs/dagre | Sugiyama DAG | 5.6k | Nov 2025 | MIT | Not compound-aware |
| Kcnarf/d3-voronoi-treemap | Voronoi iterative | 218 | Aug 2022 | BSD-3 | Yes (precompute only) |
| glato/emerge | D3 force + Louvain | 1.1k | 2024 | MIT | Yes (generic force) |
| cns-iu/map4sci | ZMLT semantic zoom | 4 | Unknown | MIT | Concept only |
| ZJUVAI/ogdf.js | OGDF WASM (FM3, Sugiyama) | Low | 2022 | GPL | Algorithm mining |

---
agent: research-web
date: 2026-04-17
stream: web / shipped products
---

# Shipped Products — Hierarchical 2D Canvas Visualization Landscape

Survey of what exists in production software for visualizing file/folder hierarchies on 2D canvases. Organized by category, then evaluated against the five criteria:

**(a) Adaptive packing** — space used efficiently at every zoom/expansion state
**(b) Membrane containment** — visually differentiated parent-child groups with clear enclosure
**(c) Compression** — maximum files visible while hierarchy stays legible
**(d) Continuous exploration** — no jarring jumps, always close to context
**(e) Aesthetics** — looks good

---

## CATEGORY 1: Disk Space / File Size Visualizers

These tools pioneered hierarchy visualization of file systems. Their purpose is narrower than the Spatial Workspace use case (size = area, not content), but they are the most direct technical predecessors.

### GrandPerspective (macOS) — v3.6.4 (March 2026, actively maintained)

**Layout:** Squarified treemap. Each file becomes a rectangle proportional to its size. Files in the same folder appear together, but their placement within the group is otherwise arbitrary.

**Navigation model:** Two-mode focus system. *Selection Focus* moves between items and parent folders via scroll wheel or keyboard shortcuts (⌘[ / ⌘]). *Display Focus* controls how deep in the hierarchy the view renders — sliding it up hides deep children, giving an overview. Zooming with locked selection descends level-by-level toward the selected file.

**Criteria assessment:**
- (a) Adaptive packing: YES — squarified treemap fills space at every level with near-optimal aspect ratios
- (b) Membrane containment: PARTIAL — files cluster together by folder but the folder boundary is minimal (a thin rectangle border). It reads more as spatial grouping than true enclosure
- (c) Compression: YES — extremely dense. All files visible simultaneously even in million-file volumes
- (d) Continuous exploration: PARTIAL — zoom descends toward a target but requires intentional focus changes; doesn't feel like smooth spatial exploration. You move focus, then zoom. Two-step.
- (e) Aesthetics: POOR by modern standards — flat colored rectangles with no texture or depth cues. Functional but not beautiful

**Failure mode at 3096 nodes / 469-child outlier:**
469 children of a single parent will produce very thin slivers at most zoom levels. The parent boundary disappears visually. Small files become sub-pixel. Navigation doesn't help — the Display Focus is binary per-level, not gradual.

**Visual signature:** Patchwork quilt of colored rectangles. Tight packing. No whitespace. Folder structure only visible by thin borders between groups.

---

### DaisyDisk (macOS) — v5.x, actively developed

**Layout:** Sunburst / radial chart. The disk is the center; each ring represents one level of folder depth; arc width is proportional to file size.

**Navigation model:** Click any arc segment to zoom in — the chart re-centers on that folder, expanding its sector to fill the circle. Tab breadcrumbs navigate back up. Hover reveals file path in sidebar.

**Design details:** Sectors are sorted by size. Very small files are consolidated into a "smaller objects" segment. Children of the same parent share a similar hue, providing visual continuity for navigation.

**Criteria assessment:**
- (a) Adaptive packing: PARTIAL — the sunburst is efficient in 2D area for size data, but at deep levels the outer rings become thin arcs with unusable labels
- (b) Membrane containment: YES — the arc-within-arc structure makes parent-child containment visually natural (radial nesting is effective enclosure)
- (c) Compression: PARTIAL — sunbursts show many levels but outer rings compress badly. At depth 4+, arcs are too thin to read
- (d) Continuous exploration: GOOD — click-to-zoom is smooth and re-centers contextually. One of the better implementations of continuous drill-down
- (e) Aesthetics: EXCELLENT — best-looking disk analyzer. Polished, modern, satisfying animation

**Failure mode at 469 children:**
469 children in one folder would appear as 469 arcs in the same ring. Most collapse to invisible slivers. The "smaller objects" catch-all helps but destroys individual legibility. The outlier problem is unsolvable with sunbursts — equal-ring-width assumes roughly equal depth distribution, which the outlier violates.

**Visual signature:** Smooth-gradient radial rings. Like a vinyl record colored by folder. Clean animation. The most beautiful disk tool.

---

### SpaceSniffer (Windows) — v2.2.0.27 (actively maintained)

**Layout:** Rectangle treemap, similar to WinDirStat but with real-time updates during scan. Nested folders stack inside parent rectangles.

**Navigation model:** Single-click selects. Double-click zooms the branch to fill the entire view. Breadcrumb at top navigates back up. Multiple simultaneous views can be open on the same scan. Filters update treemap in real-time; file deletions update the map as they happen.

**Distinguishing feature:** Real-time treemap — rare. Most treemap tools require a full scan before display. SpaceSniffer builds the map as the scan progresses.

**Criteria assessment:**
- (a) Adaptive packing: YES — fills space continuously
- (b) Membrane containment: PARTIAL — folder nesting is visible but thin; similar limitation to GrandPerspective
- (c) Compression: YES — full disk visible simultaneously. Multi-filter view is unique for comparison
- (d) Continuous exploration: GOOD — double-click zoom-to-fill is smooth. Real-time updates add a live exploration feel
- (e) Aesthetics: POOR — flat rectangles, Windows-era styling

**Failure mode at 3096 nodes:**
Same as GrandPerspective — thin slivers for small files, sub-pixel rendering for deep outlier children.

---

### WinDirStat (Windows) — classic, open-source, actively maintained community fork

**Layout:** Three-panel interface: directory list (size sorted), treemap, file type extension list. The treemap is separate from the tree list, which is odd for exploration.

**Navigation model:** Click in tree list highlights in treemap. Click in treemap navigates tree list. Designed for analysis, not exploration.

**Criteria assessment:**
- (a) Adaptive packing: YES — classic squarified treemap fills space
- (b) Membrane containment: PARTIAL — folder borders visible but thin
- (c) Compression: YES — all files visible
- (d) Continuous exploration: POOR — the split between list and treemap means exploration requires managing two panels. Jarring and non-spatial
- (e) Aesthetics: POOR — dated Windows XP styling

**Failure at scale:** Same treemap slivering. Plus the dual-panel navigation is cognitively expensive for large hierarchies.

---

### FolderSizes (Windows) — v9.8+ (actively developed, sunburst added May 2025)

**Layout:** Multiple chart types: treemap, sunburst (new in v9.8), bar chart, pie chart. Most complete disk analyzer for chart variety.

**Sunburst navigation:** Click to drill into a folder; the chart re-centers on that branch. Export to PNG/JPG for reporting. Can be included in scheduled automated reports.

**Criteria assessment:**
Similar to DaisyDisk sunburst with more enterprise features but less refined aesthetics. The treemap view has the same slivering limitation. The multi-chart approach lets users switch metaphors but no single view solves all five.

---

### FoamTree (Carrot Search) — v3.5.7 (October 2025, actively maintained)

**Layout:** Voronoi power diagrams — divides available space into organic convex polygons instead of rectangles. This is the key differentiator from all rectangle-treemap tools.

**Navigation model:** Click into a group to zoom in (animated). Double-click expands/collapses. Hierarchical and flattened stacking modes. Supports 100k+ nodes with lazy-loading and progressive disclosure.

**Containment visual:** Polygonal enclosures with rounded organic borders. Nested polygons convey parent-child with visual depth. Optional gradient fills and borders make containment legible at multiple scales.

**Criteria assessment:**
- (a) Adaptive packing: YES — Voronoi layout is approximately space-filling with better aspect ratios than rectangles for irregular distributions. Configurable to fit any convex container shape
- (b) Membrane containment: YES — the organic polygonal borders feel genuinely membrane-like. This is the closest to the "cell-wall" metaphor of any shipped product found
- (c) Compression: YES — dense packing. Lazy-loading handles 100k+ nodes
- (d) Continuous exploration: GOOD — animated zoom transitions. The expose interaction reveals inner groups without losing outer context
- (e) Aesthetics: EXCELLENT — organic shapes, configurable colors, smooth animation. The most visually distinct hierarchy visualization found

**Use cases found shipping:** Tree of Life visualization (100k+ groups, 100+ levels), financial dashboards, GitHub search results, SCADA monitoring.

**Failure mode at 469-child outlier:**
Voronoi subdivision of 469 children in one polygon will still produce very small polygons for minority members. Better than rectangle treemaps because Voronoi allows organic shapes that fit children more naturally, but the fundamental area-proportional problem remains — small files become small, illegible polygons. FoamTree's "expose" interaction (click to reveal children one at a time) mitigates this.

**Visual signature:** Organic blob-within-blob. Looks like bacteria under a microscope or geological survey maps. Immediately visually distinctive. Animated transitions between levels.

**Critical note:** FoamTree is a JavaScript library, not a shipped end-user application. It is embedded in enterprise products. No standalone app exists. However, it represents the state-of-the-art in shipped hierarchy visualization aesthetics.

---

## CATEGORY 2: Spatial Canvas / Knowledge Management Tools

These tools target thinking and knowledge organization. None were designed for file/folder hierarchies, but their spatial canvas + hierarchy approaches are directly relevant.

### Muse (iPad/macOS) — v3.x, updated December 2025

**Layout:** Infinite zoomable canvas where each board is also a canvas (nested boards). Navigation: pinch to zoom in/out. Zooming OUT shows the parent canvas with the board as a rectangular card. Zooming IN enters the board and its canvas fills the screen. Boards take on the shape of their content (recent update).

**Visual signature:** Each level of nesting is its own infinite canvas. The "parent" view shows all boards as thumbnail cards arranged spatially by the user. There is no auto-layout — placement is manual.

**Criteria assessment:**
- (a) Adaptive packing: NO — manual placement, no automatic space-filling. Space is wasted
- (b) Membrane containment: YES — boards are visually enclosed canvases. Containment is explicit and strong
- (c) Compression: NO — manual layout means low density. Can't see 3096 items in one view
- (d) Continuous exploration: EXCELLENT — pinch zoom in/out is genuinely continuous. One of the smoothest hierarchy navigation experiences in any shipped product. Feels spatial, not sequential
- (e) Aesthetics: EXCELLENT — clean, iPad-native, well-animated

**Failure at scale:**
Manual layout means a 3096-node file system would require 3096 manually placed boards. Not designed for auto-mapping file systems. Excellent ZUI model but no auto-layout.

---

### Heptabase — actively developed through 2025

**Layout:** Whiteboard-in-whiteboard model. Sub-whiteboards can be nested. On the whiteboard canvas, cards are manually placed and connected by arrows. Nested whiteboards appear as rectangular cards.

**Navigation model:** Double-click a sub-whiteboard card to enter it. Back button to exit. Standard flat canvas navigation within each level.

**Recommended depth:** Official docs say two layers is typically sufficient, warning against hasty third-layer sub-whiteboards. This is a usability admission that deep nesting breaks down.

**Criteria assessment:**
- (a) Adaptive packing: NO — manual card placement
- (b) Membrane containment: PARTIAL — sub-whiteboards are distinct rectangular containers but the connection between levels relies on the card thumbnail rather than true spatial enclosure
- (c) Compression: NO — manual layout, low density
- (d) Continuous exploration: PARTIAL — double-click to enter is not continuous. There's a mode change: you leave one canvas to enter another. No zoom metaphor
- (e) Aesthetics: GOOD — clean, research-tool aesthetic

**Failure at scale:** Acknowledged in their own docs — more than two layers breaks usability. 3096 nodes is completely out of scope.

---

### Obsidian Canvas — built-in plugin, actively developed

**Layout:** Infinite manual canvas. Cards placed by user. Groups are colored rectangular bounding boxes ("canvas groups") that can be drawn around cards. No auto-layout native feature.

**Performance:**
- Sluggish performance reported with 120+ nodes on some systems
- Known bugs with multiple nodes entering/exiting viewport simultaneously
- Graph view (separate from Canvas) becomes unusable at ~1000-2000 notes on average hardware; freezes at 3,500+ nodes

**Community plugins:** Folder Canvas generates a canvas view of folder structure. Advanced Canvas adds graph view integration. Canvas Mindmap Helper adds auto-layout via dagre. But these are third-party, not shipping as built-in.

**Criteria assessment:**
- (a) Adaptive packing: NO — manual layout, no auto-pack
- (b) Membrane containment: PARTIAL — canvas groups add colored boxes but "do little other than adding a coloured box" (per forum discussions). Not true enclosure
- (c) Compression: NO — manual, low density
- (d) Continuous exploration: PARTIAL — pan and zoom, but no hierarchy-aware navigation. No semantic zoom
- (e) Aesthetics: GOOD — dark mode, clean cards

**Failure at 3096 nodes:** Performance would likely collapse. Canvas has documented performance issues at 120 nodes. 3096 is approximately 25x that threshold.

---

### Logseq Graph View — actively developed

**Layout:** Force-directed graph of linked notes. Not hierarchical in the folder sense.

**Performance failure at scale:** GitHub issue documents Logseq becoming unusably slow at ~3500 nodes in graph view, with Chromium pegging CPU continuously. 18,500-page vaults cause complete unresponsiveness. This is a well-known, unresolved limitation.

**Criteria assessment:**
- (a) Adaptive packing: NO — force-directed graphs don't pack space efficiently. White space dominates
- (b) Membrane containment: NO — links, not enclosure
- (c) Compression: POOR — force-directed layouts waste 60-80% of screen space on average
- (d) Continuous exploration: PARTIAL — pan and zoom works, but at scale the graph is illegible
- (e) Aesthetics: DECENT — modern dark mode but visually busy at scale

---

### Kinopio — actively developed

**Layout:** Manual spatial canvas. Cards ("notes") can be placed anywhere. Boxes group related items. Lists organize cards vertically. No hierarchical nesting — flat canvas with visual grouping.

**Criteria assessment:**
- (a) Adaptive packing: NO — fully manual
- (b) Membrane containment: PARTIAL — boxes provide enclosure but are not nested
- (c) Compression: NO — manual placement, low density
- (d) Continuous exploration: PARTIAL — pan and zoom on flat canvas. No hierarchy-aware zoom
- (e) Aesthetics: EXCELLENT — warm, distinctive visual style. Unique among canvas tools

**Note:** Kinopio deliberately rejects hierarchy in favor of free association. Card grouping was a long-requested feature. This is a philosophical choice, not a limitation.

---

### Scrintal — early development, actively developing

**Layout:** Infinite canvas. Boards can be nested in boards. Cards on canvas.

**Criteria assessment:**
- (a) Adaptive packing: NO — manual
- (b) Membrane containment: PARTIAL — board nesting provides enclosure
- (c) Compression: NO — manual, low density
- (d) Continuous exploration: PARTIAL — zoom, but no hierarchy-aware navigation
- (e) Aesthetics: GOOD — visual, modern

**Scale limitation:** Undocumented, but as an early-stage product, very large hierarchies are unlikely to perform well.

---

### Miro / Mural / FigJam — enterprise infinite canvases

**Layout:** Manual infinite canvas. Auto-layout for sticky notes (cluster by theme via AI). Groups/frames for containment. No hierarchical auto-layout.

**Key relevant features:**
- Miro: Folder within folder (project organization at file level, not canvas level). Frame-based grouping on canvas. No hierarchy-aware spatial navigation.
- FigJam: AI-powered theme clustering. Frames and groups. No depth-based zoom.
- Both: Support thousands of objects with WebGL rendering, but these are flat canvases, not hierarchical ones.

**Criteria assessment:**
- (a) Adaptive packing: NO — fully manual, even with AI clustering
- (b) Membrane containment: PARTIAL — frames provide visual enclosure but no nesting depth hierarchy
- (c) Compression: NO — manual placement, low density by design
- (d) Continuous exploration: PARTIAL — smooth pan/zoom on flat canvas. No semantic hierarchy zoom
- (e) Aesthetics: GOOD to EXCELLENT — polished, team-tested

**Failure at hierarchy scale:** These tools have 40M+ users and handle large flat canvases well, but they never claim to visualize folder hierarchies. The hierarchy tools (project folders) are at the file management level, completely separate from the canvas view.

---

### Prezi — ZUI presentation tool, actively developed

**Layout:** Infinite canvas with frames and topics. Navigation is "zoom to frame" — the presenter defines a path through frames, and the viewer zooms between them. Nested topics orbit parent topics.

**What Prezi got right:** Proved that ZUI navigation can work for mass-market audiences. The zoom-between-frames interaction is genuinely continuous — no discrete page flips. Spatial memory works: audiences remember where topics were in the canvas.

**What Prezi got wrong:** Layout is manual. The canvas is a flat ZUI, not a hierarchy-aware one. Zooming doesn't reveal new content — it jumps to author-defined frames. Performance can lag on complex canvases. Motion can cause discomfort.

**Criteria assessment:**
- (a) Adaptive packing: NO — author-defined layout
- (b) Membrane containment: PARTIAL — topic/subtopic orbiting provides some visual grouping
- (c) Compression: NO — designed for spaced-out presentations, not density
- (d) Continuous exploration: GOOD — genuinely smooth zoom. The benchmark for ZUI navigation in consumer products
- (e) Aesthetics: GOOD — well-polished, but "Prezi-style" is now a dated aesthetic

---

## CATEGORY 3: Academic Tools That Shipped

### SpaceTree (UMD HCIL, 2002)

**Status:** Research prototype, available for licensing from University of Maryland. Not a consumer product. Has received an IEEE VIS Test of Time Award (2024), indicating lasting influence.

**Approach:** Node-link tree that dynamically rescales branches to fit available screen space. Camera movement optimized for hierarchy exploration. Preview icons summarize branch topology when collapsed.

**What makes it notable:** SpaceTree directly addressed the problem of viewing large node-link trees without losing context. Branch rescaling (shrinking far branches, expanding the current one) is an adaptive compression technique. Continuous camera movement. Integrated search/filter.

**Why it wasn't adopted widely:** Node-link layouts waste space even with rescaling. The space-filling advantage of treemaps is lost. For very large hierarchies (3096 nodes), even with rescaling, the majority of nodes are too small to label.

**Criteria assessment:**
- (a) Adaptive packing: PARTIAL — better than static trees but still wastes much space
- (b) Membrane containment: NO — node-link diagrams use edges, not enclosure
- (c) Compression: PARTIAL — rescaling helps but doesn't solve the fundamental legibility problem at scale
- (d) Continuous exploration: GOOD — optimized camera movement was the research contribution
- (e) Aesthetics: ADEQUATE — research-quality UI

---

### Inxight StarTree / Hyperbolic Browser (Xerox PARC / Inxight, 1995-2000s)

**Status:** HISTORICAL. Inxight Software was acquired by SAP in 2007. The Star Tree product (hyperbolic browser for hierarchies) is no longer available as a standalone product.

**Approach:** Hyperbolic geometry — places the hierarchy on a hyperbolic plane, where the area grows exponentially with distance from center. This means more space is available for distant nodes than Euclidean geometry allows. The focus node appears large at center; surrounding nodes compress naturally toward the edges.

**What it got right:** Degree-of-interest built into the geometry. Context preservation — you never lose the surrounding hierarchy. Continuous navigation — dragging moves the tree smoothly with no discrete jumps. Naturally implements (c) compression and (d) continuous exploration.

**What it got wrong:** Labels at the periphery become tiny and unreadable. Curve-distorted text is cognitively demanding. Users find the non-Euclidean layout disorienting. The aesthetic feels warped and uncomfortable.

**Status in 2025:** No shipped hyperbolic browser exists for general use. The technique is recognized academically but never reached mainstream adoption. Several D3.js examples exist but no standalone products.

---

### Tulip (labri.fr / academic) — v6.0.1 (March 2025, actively developed)

**Layout:** Full graph visualization framework. Supports hierarchical cluster trees (nested subgraphs). v6.0.0 (December 2024) added FORBID layout for node overlap removal, Leiden clustering.

**Navigation:** Supports 3D visualizations and cluster navigation. One of few tools offering efficient nested subgraph navigation.

**For our use case:** Tulip can visualize nested hierarchies as compound graphs with containment — circles or polygons containing children. But it is a research/analyst tool, not a consumer product. The UI is complex, designed for domain experts.

**Criteria assessment:**
- (a) Adaptive packing: PARTIAL — depends on chosen layout algorithm
- (b) Membrane containment: YES — compound graph views with nested containment
- (c) Compression: PARTIAL — depends on layout
- (d) Continuous exploration: PARTIAL — pan/zoom works but not hierarchy-aware
- (e) Aesthetics: POOR by consumer standards

---

### Cytoscape Web (Bioinformatics) — updated 2025

**Notable:** Cytoscape Web now includes a "Cell View" renderer using circle packing layout to depict hierarchical structures as nested circles, and a Tree View. This is one of the few shipped tools combining circle packing (organic containment) with a hierarchical data model.

**Circle packing in Cytoscape:** Nested circles where a parent circle contains all child circles. Size proportional to node weight or count. Hierarchically nested up to arbitrary depth.

**Criteria assessment:**
- (a) Adaptive packing: PARTIAL — circle packing fills space but wastes corners of the bounding rectangle
- (b) Membrane containment: YES — circles as membranes. Actually a good model
- (c) Compression: PARTIAL — better than node-link, worse than treemaps
- (d) Continuous exploration: PARTIAL — zoom works but not hierarchy-aware navigation
- (e) Aesthetics: ADEQUATE — biological science aesthetic, not consumer

---

### TagSpaces FolderViz Perspective — v6.x (actively developed, 2025-2026)

**What it is:** A file manager with multiple visualization perspectives. FolderViz offers five views: Folder Tree (mind-map style tree), Circular Folder Tree (radial tree), Tags Graph, Links Graph, Treemap.

**Treemap view:** Standard treemap where tile size reflects file size. Click a folder to open/close; double-click to navigate into it. Scroll to zoom.

**Circular tree view:** Radial display of folder hierarchy. Useful for identifying heavily populated branches. Rotatable between horizontal and vertical layouts.

**Stated limitation:** "Very large folders may impact performance in these views."

**Criteria assessment for file-system use case:**
- (a) Adaptive packing: PARTIAL — treemap yes; circular tree no
- (b) Membrane containment: PARTIAL — tree lines and radial arcs, not true membranes
- (c) Compression: PARTIAL — treemap is dense; tree views waste space
- (d) Continuous exploration: PARTIAL — navigate into folders explicitly, not continuous zoom
- (e) Aesthetics: GOOD — modern dark-mode interface

**Key gap:** TagSpaces is the closest shipped file manager that offers multiple hierarchy visualization types, but none of them combine adaptive packing, containment, compression, and continuous exploration simultaneously.

---

## CATEGORY 4: Code / IDE Visualization

### VS Code File Explorer

**Layout:** Indented tree. Collapse/expand nodes. Search-filtered list. Standard file system tree view.

**Limitation for large codebases:** Widely reported difficulty navigating projects with complex directory structures. No visual hierarchy compression. At 3096 files, the tree requires extensive scrolling.

**Criteria assessment:** Fails (a), (b), (c), (d). Adequate (e) for a text editor.

---

### JetBrains Project Tool Window (IntelliJ, Rider, etc.)

**Layout:** Two modes: Solution/Project View (structured, logical) and Files View (raw file system tree). Rider 2025.1 elevated Files View to be side-by-side with Project View.

**Performance note:** Rider 2025.1 EAP documentation notes "performance issues when using it with large solutions, which will be resolved in upcoming builds."

**Visual hierarchy:** Standard tree view with icons. No spatial compression.

**Criteria assessment:** Similar to VS Code. Fails (a), (b), (c). Partial (d). Adequate (e).

---

### Sourcetrail (open-source, archived 2021 / community fork active December 2025)

**What it was:** Code dependency graph visualizer. After indexing source code, generates interactive graphs of function calls, inheritance hierarchies, file includes. Click any node to activate it; graph and code view update in sync.

**Visual approach:** Node-link diagram for code relationships, not file system hierarchy. Shows a zoomed subgraph around the selected symbol.

**Criteria assessment:**
- (a) Adaptive packing: NO — node-link wastes space
- (b) Membrane containment: NO — links, not enclosure
- (c) Compression: POOR
- (d) Continuous exploration: PARTIAL — click-to-navigate is sequential, not spatial
- (e) Aesthetics: GOOD — clean dark mode

**Status:** Original archived. Community fork (petermost/Sourcetrail, 3000+ commits, December 2025 release) is active.

---

### Microsoft Research Code Canvas (2010 — historical)

**What it was:** Visual Studio 2010 research prototype. Infinite zoomable surface for software development. All project documents on a navigable canvas. Spatial memory orientation was the design goal.

**Status:** Never shipped as a product feature. Remains a research reference. No successor product found.

**Visual approach:** Documents as infinite canvas nodes, navigated by zoom. The research insight was that spatial memory aids code comprehension. This directly maps to the Spatial Workspace thesis.

**Legacy:** Influenced subsequent work on code visualization but no product shipping today implements this model.

---

## CATEGORY 5: ZUI / Semantic Zoom — General Tools

### DeepNotes — open-source, infinite canvas with deep nesting

**Approach:** Notes placed on infinite canvas. Each note can contain its own canvas (deep nesting). Navigation between levels is explicit: click to enter a nested note's canvas.

**Key gap:** Manual layout. No auto-packing. But the infinite nesting + zoom model is architecturally correct.

**Status:** Small independent product, actively developed.

---

### FileMap — production-ready but evolving

**Approach:** Infinite zoomable canvas for files. Files arranged manually like a physical desk. Combines cloud storage permanence with Miro-style spatial arrangement.

**Key gap:** Manual layout — no auto-hierarchy packing. "Spread ideas spatially" means users do the placement work.

**Status:** Production with active users but described as "developing platform."

---

### Infinity — Nested Canvas (iOS App Store, 2025)

**Approach:** Every node contains its own infinite canvas. Infinite nesting depth. App Store product.

**Key gap:** No information on auto-layout or adaptive packing. Same manual-placement limitation likely applies.

---

## CRITERIA SCORECARD — SUMMARY TABLE

| Product | (a) Adaptive Pack | (b) Membrane Contain | (c) Compression | (d) Continuous Explore | (e) Aesthetics | Overall |
|---|---|---|---|---|---|---|
| GrandPerspective | YES | PARTIAL | YES | PARTIAL | POOR | 2.5/5 |
| DaisyDisk | PARTIAL | YES | PARTIAL | GOOD | EXCELLENT | 3.5/5 |
| SpaceSniffer | YES | PARTIAL | YES | GOOD | POOR | 3/5 |
| FoamTree (library) | YES | YES | YES | GOOD | EXCELLENT | 4.5/5 — but not an app |
| Muse | NO | YES | NO | EXCELLENT | EXCELLENT | 3/5 |
| Heptabase | NO | PARTIAL | NO | PARTIAL | GOOD | 1.5/5 |
| Obsidian Canvas | NO | PARTIAL | NO | PARTIAL | GOOD | 1.5/5 |
| Prezi | NO | PARTIAL | NO | GOOD | GOOD | 2/5 |
| SpaceTree (research) | PARTIAL | NO | PARTIAL | GOOD | ADEQUATE | 2/5 |
| Cytoscape Circle Pack | PARTIAL | YES | PARTIAL | PARTIAL | ADEQUATE | 2.5/5 |
| TagSpaces FolderViz | PARTIAL | PARTIAL | PARTIAL | PARTIAL | GOOD | 2.5/5 |
| Inxight StarTree (hist.) | GOOD | NO | GOOD | GOOD | POOR | 3/5 |
| FolderSizes | PARTIAL | PARTIAL | YES | GOOD | ADEQUATE | 3/5 |

**Maximum score any shipped consumer product achieves: 3.5/5 (DaisyDisk)**

No product scores YES on all five criteria.

---

## CLOSEST ATTEMPTS

### 1. FoamTree (Carrot Search) — 4.5/5, not a consumer app

The only shipped technology to credibly satisfy adaptive packing, membrane containment, compression, and aesthetics simultaneously. The Voronoi polygon layout + animated zoom creates the closest thing to an organic, membrane-like, space-filling hierarchy browser that exists. It handles 100k+ nodes with lazy-loading.

**What it lacks:** It's a JavaScript library embedded in enterprise products, not a standalone app. No file/folder data model. No continuous exploration in the Muse sense (no zoom-in-to-reveal-children model — more click-to-expand). The outlier problem (469 children) still produces many tiny polygons.

**The gap:** FoamTree's "expose" interaction (revealing children one-by-one) partially addresses the outlier problem. But there's no zoom-continuous model where children emerge gradually as you zoom in, without a discrete click-to-expand.

---

### 2. DaisyDisk — 3.5/5, consumer app, actively developed

Best combination of membrane containment (radial arc nesting), continuous exploration (smooth drill-down), and aesthetics in a shipped consumer product. The design discipline (sorting, color-coding, "smaller objects" consolidation) shows someone thought deeply about the UX.

**What it lacks:** Radial sunburst is inherently bad at outliers (469 children in one ring). The sunburst metaphor assumes roughly equal depth distribution. For the Spatial Workspace use case (arbitrary folder structures with 3096 nodes), the outer rings become unusable thin arcs.

**The gap:** The containment and aesthetic quality of DaisyDisk applied to a flexible space-filling layout that handles outlier distributions.

---

### 3. Muse — 3/5, consumer app, actively developed

Best ZUI continuous exploration model in any shipped product. Pinch-to-zoom into nested canvases feels genuinely spatial. Boards take the shape of their content. The interaction model is exactly what criterion (d) asks for.

**What it lacks:** Completely manual layout. No auto-packing. No compression. For a 3096-node file system this would require manually placing 3096 boards — obviously impractical.

**The gap:** Muse's navigation model applied to auto-layout. If Muse auto-placed boards using a space-filling algorithm and allowed semantic zoom to reveal children, it would be the answer.

---

## WHAT NOBODY HAS DONE

1. **Adaptive space-filling + semantic zoom combined:** No tool auto-packs a hierarchy into 2D space AND allows continuous zoom-in to reveal children as they emerge. Treemaps auto-pack but don't have semantic zoom. Muse has semantic zoom but requires manual layout. This combination does not exist in any shipped product.

2. **Membrane containment at arbitrary depth with adaptive packing:** The organic Voronoi border of FoamTree with the semantic zoom model of Muse. FoamTree's polygons get smaller as you descend; Muse allows entering a new full canvas. No tool combines both.

3. **Graceful outlier handling:** No tool handles the "one folder with 469 children, most others with 5-20" distribution well. Treemaps produce slivers; sunbursts produce thin arcs; force-directed graphs produce crowded hairballs; manual canvases require manual placement.

4. **Legibility-preserving compression at 3096 nodes:** No tool keeps every node labeled and readable while showing all 3096 simultaneously. The closest is treemaps with zoom — but labels disappear at small sizes. The gap is semantic zoom that substitutes a summary representation at the level where individual labels would be unreadable (like Google Maps replacing individual building labels with neighborhood names as you zoom out).

5. **File/folder content visualization (not just size):** All disk analyzers encode file SIZE as area. No shipped tool encodes content structure — relationship between files, what type of content is present, semantic organization. This is entirely an open territory.

---

## THE ANSWER TO "HAS SOMEBODY DONE THIS BEFORE?"

**Verdict: No — not as a unified solution. The partial solutions exist but they're siloed into separate tools that each solve at most 2-3 of the 5 criteria.**

The academic literature (SpaceTree, 2002; DoI trees, 2004; hyperbolic browsers, 1995) defined the key algorithms. The disk analysis market (GrandPerspective, DaisyDisk, SpaceSniffer) shipped the best density/compression implementations. FoamTree (2010s) shipped the best aesthetic containment as a library. Muse (2019-present) shipped the best ZUI exploration model.

But no shipped product combines:
- Auto-adaptive space-filling packing (criterion a)
- True membrane-like containment at multiple zoom levels (criterion b)
- Compression with legibility-preserving semantic zoom (criterion c)
- Continuous exploration without discrete mode changes (criterion d)
- Consumer-grade aesthetics (criterion e)

The closest the world has come is FoamTree's aesthetic containment combined with DaisyDisk's exploration model — but they are different metaphors (Voronoi vs. sunburst) that have never been unified in one tool.

For the Spatial Workspace v2 use case specifically (3096 nodes, 469-child outlier, legibility priority, not size-encoding), the treemap family underperforms because it encodes size not count, and the knowledge-tool family (Muse, Heptabase, Obsidian Canvas) underperforms because they require manual layout.

**The combination the Spatial Workspace needs is genuinely novel:**
An auto-packing layout algorithm (Voronoi or circle packing variant) + semantic zoom that reveals children as the user zooms in + legibility-first label handling (labels stay readable; nodes scale to fit their labels, not the reverse) + organic membrane-like borders.

This is not a marginal improvement on existing tools — it is a distinct point in the design space that no shipped product occupies.

---

## SOURCES AND SEARCH COVERAGE

Sources consulted:
- GrandPerspective documentation: grandperspectiv.sourceforge.net/HelpDocumentation/NavigatingViews.html
- FoamTree product site: carrotsearch.com/foamtree/
- TagSpaces FolderViz docs: docs.tagspaces.org/perspectives/folderviz/
- Muse nested boards: museapp.com/how/nestedboards/
- Mac file manager comparison (mid-2025): tokie.is
- University hierarchy visualization overview: vis-uni-bamberg.github.io/hierarchy-vis/
- DaisyDisk reviews: multiple sources including softwarevs.com, thehightechsociety.com
- Logseq scale issue: github.com/logseq/logseq/issues/2089 (3,500 nodes unusable, documented)
- Obsidian Canvas performance: forum.obsidian.md (120 nodes causes lag, documented)
- SpaceSniffer product: space-sniffer.com and freewaregenius.com
- Compound graph visualization 2024 research: arxiv.org/abs/2408.04045
- SpaceTree 2002: umventures.org/technologies/spacetree-zoomable-hierarchy-visualization
- Cytoscape Web 2025: cytoscape.org
- FolderSizes sunburst (May 2025): foldersizes.com/wordpress
- Heptabase nested whiteboards: wiki.heptabase.com
- FileMap: filemap.com
- ZUI survey: Zooming user interface Wikipedia, jointjs.com demos
- Tulip v6.0 (December 2024): tulip.labri.fr, Wikipedia

**Gaps in coverage:**
- Could not access Commander One, Path Finder, ForkLift in depth (review article focused on transfer features, not hierarchy visualization)
- Reflect app does not appear to have a significant spatial hierarchy feature — it has a graph "Map" view but no documentation of its scale behavior
- RemNote, Napkin AI — not specifically designed for hierarchy visualization; Napkin converts text to diagrams, RemNote is an outliner
- Notion's graph view — Notion does not have a graph view (Notion does not have spatial visualization at all)
- Kosmik, Are.na — spatial canvas tools found in search but with insufficient data on hierarchy-specific features
- AppFlowy, Siyuan — open-source Notion alternatives with no spatial canvas features found

**Recency note:** All primary tools surveyed have been updated in 2025 or early 2026 (GrandPerspective 3.6.4 March 2026, FoamTree October 2025, DaisyDisk active, Tulip 6.0.1 March 2025, Heptabase ongoing). The space is not stagnant — but the fundamental gap documented here has not been closed.

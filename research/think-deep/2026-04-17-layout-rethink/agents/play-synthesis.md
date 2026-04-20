---
agent: play-orchestrator
date: 2026-04-17
phase: play
sub-agents: thread-follower, paradox-holder, pattern-spotter
---

# Play Synthesis — Layout Algorithm Rethink
## Spatial Workspace v2 / 2026-04-17

---

## What Was Most Surprising

The thread-follower found it first: **the layout algorithm is the wrong thing to be optimizing.** Not because layout doesn't matter — it does. But because the framing of the problem ("how do we pack 3096 nodes into 2D space") is itself wrong. You never need to pack 3096 nodes. You need to pack whatever is currently expanded. The problem dissolves when the visibility model changes. This reorients everything that follows.

---

## Thread-Follower — What Happens When You Walk Far Enough

The thread-follower doesn't hedge. Here's what the walks turned up.

**Walk 1 — "The algorithm is the wrong thing."** If progressive disclosure is real — if you never show all 3096 at once — then the layout algorithm's hardest problem (HHA inbox, 469 children) never actually occurs in practice. You see the inbox as a single button, sized to signal it's fat. You expand to see a paged summary. The layout only runs on what's visible. The problem isn't "how do we lay out 3096 nodes efficiently" — it's "how do we lay out 20-40 nodes with the right size signals." That's a much easier problem. The physics engine was trying to solve a problem that didn't need to exist.

**Walk 2 — "Never show all 3096 at once."** This is not cheating. Every working spatial file browser answers exactly this way. The question is what "folded" means spatially. The thread-follower's answer: folded nodes occupy proportional area as a placeholder. When you unfold, children EMERGE from the parent — they don't replace it. The parent node scales down; children bloom outward. Total canvas area consumed stays roughly constant. The layout engine only operates on currently-expanded nodes. The HHA inbox is "469 items" button until you open it.

**Walk 3 — "The layout that remembers."** Nodes you visit often drift toward visual center. Nodes you never visit drift to the periphery. The layout has two components: topology (tree structure, set at generation time) and affinity (your usage, accumulated over sessions). After 100 navigation events, the layout is a mirror of your actual mental model — not the abstract file tree. This is different from physics. Physics responds to structure. This responds to you.

**Walk 4 — "Compression has a ceiling, and the ceiling is informative."** The floor is real: ~44px touch target, ~12pt readable label. Once you hit it, you've hit it. But what follows from hitting it is interesting: that's the trigger to switch representation modes. Below the floor, you don't render each node — you render a count badge. The layout algorithm should know: "at this size, I represent this subtree as a single summary node." The floor isn't failure. It's a signal to switch display modes. Every tree visualization that works does this, usually implicitly. Making it explicit is the design insight.

**Walk 5 — "The inbox is telling us something about the data."** 469 flat children with no sub-hierarchy: this is a BAG, not a tree. The inbox has no meaningful structure. The layout algorithm should detect "bag nodes" (high out-degree, flat, no meaningful grouping) and render them differently — a grid or list inside the parent's containment membrane, not a spatial fan. The pathological case isn't a layout failure. It's a data-type mismatch. One algorithm for all node types was always wrong.

---

## Paradox-Holder — Where the Tensions Live

The paradox-holder's job is to refuse premature resolution. Here's what's real and what's illusory.

**Compact + Organic: illusory contradiction.** A snowflake is organic and near-maximally compact. Soap bubble arrays are organic (curved, variable) and perfectly space-filling. The principle: "organic" is a description of the LOCAL generative process. "Compact" is a description of the GLOBAL result. These are compatible — you need a good local rule that produces global density. Phyllotaxis is the existence proof: each leaf placed by a LOCAL rule (golden angle), globally COMPACT, infinitely VARIED. You don't need a global planner to get global density. The paradox dissolves when you realize the two terms operate at different levels.

**Deterministic + Feels Alive: illusory contradiction.** Mathematical determinism at the micro scale produces irreducible richness at the macro scale. Penrose tilings: fully deterministic, no two regions identical. Fibonacci spirals: deterministic, they look biological. The mechanism: the formula's output depends on the subtree's own structure, which is different for every subtree. A short deterministic formula produces visually unique layouts for every node because the input (your specific file tree) is itself unique. The layout "adapts" without randomness.

**Show Everything + Focus on What Matters: REAL, irreducible.** The focus+context tradition tried to resolve this by distorting space — fisheye, semantic zoom. But distortion violates spatial memory: if you remember where a node WAS, it moves when you're not focused there. Two honest paths exist, both with real costs: (1) Never show everything — progressive disclosure, minimap for global view; (2) Show everything but make unimportant nodes very small (dots) and important ones large. Path 1 sacrifices global overview. Path 2 requires a good importance signal. Neither eliminates the trade-off. The physical constraint is real: 3096 readable labels don't fit in one viewport.

**Stable + Adaptive: real but resolvable.** If the layout changes on every expand, continuity breaks. If it never changes, new nodes have no home. Resolution path: stable in RELATIVE position, adaptive in SCALE. When you expand a node, siblings don't move. The expanded node's children emerge into the space beyond it. The parent scales down slightly; children bloom outward in its direction. Relative order is preserved; only spacing shifts. This is how the macOS Dock works — other icons slide to make room for a new one; the relative order never changes.

**Hierarchy + Network: real, resolved by separation.** Files are a tree AND they reference each other across the tree. These are genuinely incompatible if you try to show both in one layout. The resolution is not fusion but separation: tree = primary topology (positioning), links = secondary overlay (drawn on top, toggleable). The map is one thing; the legend is another. Don't try to make one layout serve both information types.

**Algorithm serves data vs. data should serve algorithm: underexplored.** Most systems bend the visualization to fit whatever the data contains. But you can legitimately reshape data for legibility. Virtualization IS data reshaping (469-item inbox becomes a summary). Clustering IS data reshaping (group siblings by type before rendering). You are not forced to show what the file system actually contains — you can show a curated view. The layout can emit "this subtree renders as a summary node," and that is correct behavior. This is a design philosophy, not a technical trick.

---

## Pattern-Spotter — Real Mechanism Transfers

The pattern-spotter only counts metaphors that transfer a real mechanism, not just a vibe. Seven passed the test.

**1. Phyllotaxis — the one-formula answer.** Mechanism: each new element placed at golden angle (137.5°) from previous one. Result: maximum gap between any two adjacent elements, globally compact, no two at same angle. Transfer: place children using a golden-angle spiral from the parent center, at distance proportional to index. One formula. No tunable parameters. The golden angle is irrational — the pattern never closes into a ring. Every subtree fans differently because every subtree has a different N. This is the cleanest answer to "one formula, not five parameters."

**2. Voronoi / soap bubbles — recursive space subdivision.** Mechanism: each bubble wall sits at the midpoint between two centers, minimizing energy. Result: space-filling, no gaps, each cell's size proportional to content. Transfer: treat each subtree as a Voronoi region. Parent's region contains all children's regions. Children subdivide the parent's region recursively. The HHA inbox problem dissolves — if the inbox has 469 children, its Voronoi region has 469 sub-cells, all uniformly small. You don't choose spacing. The subdivision rule does. This naturally produces membrane-like containment (each parent has a boundary that contains its subtree).

**3. Population cartograms — area encodes weight.** Mechanism: distort geographic area proportionally to population. Result: visually wrong as geography, immediately legible as density data. Transfer: node area = descendant count. HHA inbox becomes a LARGE button. Folders with 2 files are small. You're reading a cartogram of your file system. This is already close to what the spec says (size = log(leafCount)) — the cartogram framing makes clear this isn't a visual flourish. It's the correct encoding. Area = content weight is the most honest thing a file system visualization can do.

**4. The tube map — abandon geographic accuracy.** Mechanism: London Underground map distorts geography completely to serve navigation. Straight lines, 45° angles only, equidistant stations. The map is not the territory — it's a navigation artifact. Transfer: stop trying to make spatial layout "accurate" to the file system's actual depth hierarchy. Optimize for navigation: most-visited nodes closer to center, structure preserved at the parent-contains-children level but not at the depth-means-distance level. A cognitive map, not a topological map. This legitimizes usage-based layout drift.

**5. Slime mold (Physarum) — emergence from use.** Mechanism: extends tendrils everywhere, reinforces traversed paths, withdraws from unused ones. Network topology emerges from usage. Transfer: a layout that starts from structure, then gets reinforced by user navigation. Paths traversed often become visually shorter. Nodes visited often migrate toward center. The layout emerges from use over time. This is the mechanistic version of the thread-follower's "layout that remembers." Slime mold IS the algorithm.

**6. Memory palace — the layout must be learnable.** Mechanism: humans memorize information by associating it with stable spatial locations. Navigating the space is navigating the information. Transfer: the layout must be stable enough that after a few sessions, you know roughly where things live. This means: deterministic (no random variation between renders), locally consistent (each subtree always fans in the same direction from its parent), and sparse enough at the top level to be memorable. A layout you can't build a spatial memory of is a layout you have to re-search every time.

**7. Desire paths — track actual navigation, not assumed structure.** Mechanism: people cut across grass to make shortcuts. Emergent paths are more "correct" than the planned ones. Transfer: track where users click and what paths they follow, then adjust layout to minimize navigational distance for high-frequency paths. The layout is not designed — it emerges from observation. A file you navigate to by traversing through 4 parents will naturally migrate closer if you do it 50 times. This is slime mold applied to human behavior specifically.

---

## Synthesis Narrative — What This Play Found

Three agents looked at the same problem from different angles. Here's what the overlap produced.

**The real finding:** The problem isn't the layout algorithm. It's the visibility contract. Every failed iteration (physics, radial tree) treated all 3096 nodes as things that need to be placed. They don't. The layout algorithm should only ever place what's currently expanded — which is likely 20-80 nodes at any given moment. The entire complexity budget changes. "How do you pack 3096 nodes elegantly" becomes "how do you pack 40 nodes with meaningful size signals." That's solved.

**The shape of the solution:** Two layers.

Layer 1 — **Seed positions**: a golden-angle spiral fan from each parent. Each parent fans its children at the golden angle, spiraling outward. Distance from parent = proportional to parent's size (which encodes its descendant count). One formula. No global angular allocation. No ring radii array. Children bloom outward from their parent in a direction away from the grandparent (290° arc). The golden angle guarantees no two children at the same angle — organic variety from determinism.

Layer 2 — **Physics polish**: short d3-force pass — link attraction (local only, distance = parent-half + child-half + gap), gentle charge repulsion, rect collision. No radial force. Settles in 100-150 iterations. Nodes that collide move apart minimally. Everything else stays where the seed put it.

**The size encoding** (cartogram principle): node area = k × log2(leafCount + 1). This is the most honest encoding. The root is large. Files are small. Intermediate folders are mid-sized. The visual hierarchy reads before you read any labels. Size IS the primary navigation signal — before text, before color, before position.

**The bag-node problem**: detect flat high-out-degree nodes (threshold: >~60 children with no sub-structure). Render them as a membrane cell with a grid of small buttons inside rather than a spatial fan. The 469-item inbox never needs to be fanned. It's a special data type that gets special treatment. One algorithm, two rendering modes.

**The future layer** (not for v2, but the direction): slime mold. Every click reinforces navigational paths. After enough sessions, the layout reflects actual usage patterns, not abstract file structure. The layout becomes the user's mental model externalized. This is not a v2 feature. It's the thesis of what Spatial Workspace becomes.

---

## Live Questions

1. **Is golden-angle spiral seed better than the local-fan algorithm already specced?** The specced algorithm uses weighted arc allocation (prop to sqrt(leafCount)). The golden angle doesn't weight by subtree size — it gives each child an equal angle increment. For balanced trees: golden angle is better (more organic). For deeply unequal trees (one child has 400 leaves, another has 2): weighted arc is more honest. Which matters more for this data? Could they be combined — golden angle for the angle, weighted arc for the radius?

2. **Voronoi containment — is this the membrane solution?** The "membrane-like containment" requirement could be solved by computing a convex hull (or Voronoi cell boundary) around each parent and its children, then rendering it as a soft blurred polygon behind the subtree. Is this computationally acceptable in real-time? What does it look like when a parent is expanded — does the membrane grow?

3. **Where does the usage-memory layer live?** localStorage for session, but across sessions? This implies a persistent data file written by the watch-server — a `layout-affinity.json` that records click counts per node path. Is that within the "Python stdlib only, no backend" constraint? The watch-server already runs locally. It could write this file.

4. **The bag-node threshold — what should it be?** 60 children? 100? Should it be absolute (N > 60) or relative (N > 3× median sibling count)? The detection heuristic matters because false positives (incorrectly treating a folder as a bag) will render it as a grid when the user might want to navigate spatially.

5. **Does size-encoding conflict with label readability?** If a file node is very small (few descendants = 0, so minimal size), its label may be below the readable threshold. The 20-char rule says "never squish below nominal width." But if size encodes content weight, a file node (0 descendants) might be naturally VERY small. Does the label override the size encoding? Or does the label float above the node separately?

6. **What is the correct "initial expanded" state?** Right now, top-level branches are expanded. With size encoding, the expanded view should show something useful at first load — not too collapsed (unreadable structure), not too expanded (3096 nodes). Is the right initial state: root + top-level branches + second level? Or root + top-level branches only? Size encoding might make this less important because the folded buttons already communicate weight.

7. **Can the layout be made reversible?** If I expand node A, then collapse it, do I get exactly the same positions back? The physics polish makes this non-deterministic (same seed, same result — but if the tree has changed since last render, the positions might differ). Does this matter for the spatial memory principle?

8. **Is there a one-formula answer that combines golden angle + weighted arc + bloom direction?** The thread-follower, paradox-holder, and pattern-spotter all pointed toward "one formula." The spec already has a local-fan algorithm that's close. Can golden angle replace the arc subdivision? Can the distance formula be simplified to a single expression that handles all cases without a max() over three alternatives?

---

*Play outputs are primary research data. This synthesis is derived from three parallel reasoning agents: thread-follower (followed threads past the point most people stop), paradox-holder (held tensions without resolving them), and pattern-spotter (found real mechanism transfers from unrelated domains). Each voice is distinct and their distinctness is the value.*

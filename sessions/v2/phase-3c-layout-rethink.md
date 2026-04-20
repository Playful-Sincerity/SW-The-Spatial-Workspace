# Session Brief — Phase 3C: Layout Rethink

**Project:** Spatial Workspace v2
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Supersedes:** The layout code in `templates/v2/app.js` — specifically `createLayout()` and everything it calls
**Does NOT supersede:** Reader, tabs, search, colors, legend, click-to-center, dot grid, node anatomy, CSS, template.html, generator, node measurement, label wrapping. All UI stays.

---

## What happened (Phase 3B → 3C)

Two full sessions of layout iteration. Phase 3B stripped the dual-engine tangle (createMembraneSimulation + createDeterministicLayout) down to one coordinate system. This session (3B continuation) then went through ~20 iterations trying to nail the layout. Two fundamentally different approaches were tried:

### Approach 1: Physics-based (fan seed + force sim + collision solver)
- Local fan seed places children radially around parent
- d3-force simulation with forceLink (pull to parent) + forceManyBody (repel) polishes positions
- Post-process collision (Jacobi solver or rectCollide) enforces minimum distance
- **Best result:** 91 overlaps / 3096 nodes
- **Problems:** Link force and collision fight each other. Charge adds spacing but makes things too spread. Removing charge makes things collapse. Tuning is a whack-a-mole. Lines cross because physics has no structural awareness. Dozens of parameters to tune (link strength, charge strength, distance multiplier, collision passes, hierarchical collision passes, velocity decay, alpha decay).

### Approach 2: Tidy radial tree (deterministic geometry, no physics)
- Bottom-up: compute each subtree's angular width from leaf widths
- Top-down: allocate angular sectors proportionally, place children at computed distance
- **Best result:** 55 overlaps / 3096 nodes, zero physics
- **Problems:** The layout is too regular — no organic feel. Space utilization is terrible: the 469-item HHA inbox directory dominates angular allocation, squeezing everything else into a sliver. Compression attempts (reducing distance multiplier) cause overlaps because children are closer than their subtrees need.

### Why both failed
The fundamental tension:
1. **Compact** requires children close to parent → siblings overlap → collision needed
2. **No crossings** requires angular sector allocation → huge directories dominate → wasted space
3. **Organic** requires some randomness/asymmetry → contradicts deterministic geometry

Neither pure physics nor pure geometry achieves all three simultaneously.

---

## What to keep (proven features, carry forward)

**From the codebase (all working):**
- `measureNode(d)` — canvas-based width measurement
- `nodeLabel(d)`, `wrapLabel()` — 20-char rule, multi-line wrap
- `nodeVisual(d)` — stroke/fill tokens from phase/heat
- All reader/tabs/search/centering/zoom/settings/live-reload code
- All CSS and template.html
- Demo hooks (#demo=expandBranch, expandAll, clickFile, clickDir)
- `resolveOverlaps()` Jacobi collision solver — useful as a cleanup pass regardless of layout approach
- `hierarchicalCollision()` — useful for preventing subtree intrusion
- `rectCollide()` — still available as a d3 force

**From the iterations (proven concepts):**
- **Subtree-weight sizing:** `1 + K × log2(leafCount + 1)` with K≈0.08. Nodes scale by descendant count. Files stay nominal. Root ~2×, medium folders ~1.5×, small folders ~1.2×. Visual hierarchy falls out naturally.
- **Spiral packing for 30+ child directories:** Golden angle spiral prevents the "huge ring" that arc-fan creates for dense directories.
- **Collision as post-process, not inline:** rectCollide modifies positions directly; d3-force's velocity integration undoes those corrections. Separate collision after physics converges produces better results.
- **Seed-aware link distance:** If using physics, the link distance must reference the seed's spacing — using just node widths causes collapse.

---

## The stress test: HHA pipeline inbox

The ecosystem has one directory with **469 children** (HHA pipeline/inbox). This is the single biggest challenge for any layout algorithm. Any algorithm that allocates space proportional to child count will dedicate most of the canvas to this one directory.

Other large directories: claude-system/skills (20), claude-system/rules (15), people/ (49). These are manageable. The inbox is the outlier.

Possible treatments for the inbox:
1. **Virtual scroll / lazy render:** Don't render all 469 at once. Show a summary node ("inbox (469)") that expands to a paginated sub-canvas.
2. **Spiral/grid packing:** Compact layout for dense directories (already prototyped).
3. **Collapsing:** The inbox starts collapsed by default. When expanded, it uses spiral packing.
4. **Capping:** Only show the first N children (e.g., 50), with a "+419 more" indicator.

---

## What to try next (ideas, not prescriptions)

The next session should explore, not execute a fixed plan. Some directions:

### Direction A: Physics with structural constraints
Keep the organic physics feel but add structural awareness:
- Use angular sector allocation ONLY for initial seed positions (gives the fan arrangement)
- Run physics (link + charge) to settle positions organically
- After settling, check for line crossings and fix them by swapping/rotating subtrees
- Use collision post-process for minimum distance

### Direction B: Adaptive radial tree
Keep the tidy radial algorithm but fix the space waste:
- Cap the angular width of any single subtree (e.g., no subtree gets more than 40% of its parent's arc)
- Redistribute excess angular width to smaller siblings
- This prevents the 469-item directory from dominating
- Use log scaling for angular width: `angularWidth = log2(leafCount + 1)` instead of linear sum
- Children at the cap get spiral-packed within their capped sector

### Direction C: Containment model
Each folder IS a container. Children render INSIDE the parent's bounding box. When you expand, the parent grows to contain its children. Like a treemap but with the node-button aesthetic. This is naturally space-efficient.

### Direction D: Hybrid — radial seed with containment physics
- Seed positions radially (for the organic feel)
- But use a "gravity toward parent centroid" force where the parent's centroid is the center of mass of all its descendants
- Children cluster around the centroid, creating tight organic groups
- Containment bounding boxes prevent subtree intrusion (like hierarchicalCollision)

---

## Known issues to carry forward

1. **Hit-box regression.** Clicks miss or land wrong. Needs investigation — possibly stale hit-area rects during transitions.
2. **Expand transition is jarring.** Everything moves when a folder expands. Options: anchor clicked node, stagger animation, or zoom-to-fit-children immediately.
3. **Zoom-dependent cluster labels.** (In build queue.) When zoomed out, overlay parent names on top of clusters for wayfinding.

---

## Files to read

- **[chronicle/2026-04-16.md](../../chronicle/2026-04-16.md)** — full narrative including all iterations
- **[SPEC-PHYSICS.md](../../SPEC-PHYSICS.md)** — original physics redesign spec (historically useful, mostly superseded)
- **[play/flextree-test.html](../../play/flextree-test.html)** — standalone tidy tree prototype
- **[ideas/build-queue.md](../../ideas/build-queue.md)** — parked ideas (reader "show in canvas" button, zoom-dependent cluster labels)
- **~/Wisdom Personal/people/wisdom-happy.md** — Wisdom's visual preferences: organic clusters > grids/rings, operability > geometric purity, "elegant and simple" means one formula not five parameters

---

## Kickoff

> "Pick up Spatial Workspace v2. Read `sessions/v2/phase-3c-layout-rethink.md` first — it's your single entry point. Then explore which layout direction to take."

The next session should start by understanding the problem deeply, not by immediately coding. Consider using `/think-deep` or `/debate` to explore the directions before writing layout code.

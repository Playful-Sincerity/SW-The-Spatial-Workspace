# SPEC — Fractal-Tree Substrate (Path B)
*Spatial Workspace v3-tree · Deterministic L-system-style layout for click-to-grow*
*Date: 2026-04-19 · Status: DRAFT pending Wisdom approval*

---

## Goal

Replace force-directed physics and rejected wedge/sunburst with a **fractal tree**: root trunk at center; each branch inherits direction from its parent; children deflect from that direction by a small angle; leaves sit at branch tips. Position is computed once per node and stored. No physics, no iterative relaxation, no randomness.

## Criteria

Same 8 criteria as [SPEC-CLICK-TO-GROW.md §Agreed Criteria](SPEC-CLICK-TO-GROW.md) — spatial memory, minimum disturbance, no overlap, legibility, efficient canopy (phototropism), deterministic, predictable motion, scale-resilient. This spec only swaps the mechanism.

## Mechanism — Packed Balloon Tree

The correction from fan-cone (pie-chart risk) to balloon-packing: each subtree claims a **circular territory** sized to fit its descendants. Children pack around their parent at *variable radii*, filling available angular space instead of splitting a fixed cone. This is what mxGraph's BalloonLayouter and yFiles' BalloonLayouter produce — dense organic fill, not radial fan. Aesthetically: leaves fill the canopy, short branches don't waste sky, long branches reach into gaps.

### Per-node state

```
node.position       = {x, y}           # stored, never recomputed for placed nodes
node.direction      = angle            # angle from parent (inbound branch direction)
node.nodeRadius     = sizeFromWeight(leafCount)   # visual radius of THIS node
node.subtreeRadius  = computed          # radius of minimal circle enclosing ENTIRE subtree
node.isBag          = (immediateChildCount > 50)
```

`subtreeRadius` is computed **bottom-up**: leaves have `subtreeRadius = nodeRadius`; interior nodes compute it from their children's packed arrangement. This is the key quantity — every subtree knows its own canopy footprint.

### Bottom-up pass — compute subtree radii

Before placement, walk the tree bottom-up:

```
function computeSubtreeRadius(N):
  if N has no children:
    N.subtreeRadius = N.nodeRadius
    return N.subtreeRadius

  for each child c in N.children:
    computeSubtreeRadius(c)

  # Parent's subtree radius = parent nodeRadius + "ring thickness"
  # needed to hold all children packed around it.
  # Ring thickness ≈ max(child.subtreeRadius) + packingBuffer
  # plus the additional radius needed to fit all children circumferentially.
  totalChildFootprint = Σ (2 × c.subtreeRadius + padding) for c in children
  minRing = totalChildFootprint / (2π)   # radius needed for child circles to fit on ring
  ringRadius = max(N.nodeRadius + maxChildSubtreeRadius + padding, minRing)
  N.subtreeRadius = ringRadius + maxChildSubtreeRadius
  return N.subtreeRadius
```

This guarantees every parent's canopy footprint accounts for its children's canopies.

### Placement — top-down pass

Root at origin. For each parent, lay children around it as packed balloons, respecting inherited direction to prevent trunk crossings.

```
function placeChildren(N):
  children = N.children
  if N.isBag:
    return   # bag renderer handles this subtree

  # For root: full 360° available.
  # For non-root: outward half-plane (180°) centered on N.direction.
  # The half-plane constraint is what prevents trunk crossings — children never
  # grow back through the incoming branch.
  availableCenter = (N is root) ? 0 : N.direction
  availableArc    = (N is root) ? 360° : 240°   # a bit wider than 180° for packing flexibility

  # Place children by angular packing around parent.
  # Each child's angular slot = 2 × asin(c.subtreeRadius / ringRadius)
  # Weighted placement: largest subtrees get "center of available arc",
  # smaller ones fill the edges (this helps balance visually).
  ringRadius = N.nodeRadius + max(c.subtreeRadius for c in children) + padding
  sorted = sortByWeightDescending(children)

  # Greedy pack: alternate sides from center outward
  # [largest at center, 2nd & 3rd flanking, 4th & 5th outside those, ...]
  slotCenters = computeSlotCenters(sorted, ringRadius, availableCenter, availableArc)

  for i, child in enumerate(sorted):
    child.direction = slotCenters[i]
    child.position  = N.position + polar(ringRadius_adjustedFor(child), child.direction)
    placeChildren(child)   # recurse

  # Cousin-overlap repair (rare with above math, but sanity-check):
  for each child c:
    for each non-ancestor M with stored position:
      overlap = (c.subtreeRadius + M.subtreeRadius) - distance(c, M)
      if overlap > 0:
        # Nudge c along its direction outward, bounded
        c.position += normalize(c.direction) × clamp(overlap, maxPush)
```

### Why this packs where fan-cone spread

- **Variable radius per child**: not everyone sits on the same ring. A small-weight child sits on a tighter inner ring; a heavy-weight child sits further out. This uses radial depth to pack.
- **Subtree territory is explicit**: each child's `subtreeRadius` reserves exactly the space its descendants need — no more, no less. Gaps don't form between subtrees.
- **Angular allocation by footprint, not by count**: a child with `subtreeRadius = 300px` gets a wider angular slot than a child with `subtreeRadius = 50px`. Uniform angular slots are the wasteful mode fan-cone fell into.
- **Half-plane constraint prevents trunk crossings**: children only grow into the outward 240° centered on `N.direction`. Inbound branch's side is reserved, so parent-child lines can't cross.

### What this looks like visually

- Root with 8 children of varying weights → 8 balloons packed around it, each balloon sized to its subtree. Heavy subtrees spread into dense neighborhoods; light ones fit in between.
- Recursion: each child does the same with its own children, in its own half-plane.
- Net effect: a fractal tree with dense canopy, no gaps, no overlap, trunks inherited cleanly. Matches your screenshot's aesthetic.

### Constants

| Name | Value | Purpose |
|---|---|---|
| `padding` | 20px | Gap between sibling subtree circles |
| `nodeRadiusBase` | 24px | Floor for individual node visual radius |
| `k_size` | 6 | Coefficient on √leafCount for node visual radius |
| `bagThreshold` | 50 | Immediate-child count → membrane renderer |
| `maxPush` | 30px | Cap on cousin-overlap correction |
| `outwardArc` | 240° | Available angular range for non-root children |
| `rootArc` | 360° | Available angular range for root's children |

Seven constants, no physics parameters. `subtreeRadius` is computed, not tuned.

### What is NOT in the mechanism

- No force simulation. No velocity, decay, integration.
- No randomness or jitter. Packing produces visual variety from weight distribution itself.
- No fixed-radius fan. Children sit at whatever radius their subtree footprint requires.
- No wedge subdivision (which produced the sunburst aesthetic).
- No per-click re-layout. Positions stored, reused on return.

## Honest Risks

1. **Weight imbalance makes one subtree dwarf others.** If PS Software has 2000 leaves and PS Events has 50, the PS Software balloon will be ~6× larger than PS Events. Tree will look lopsided. Mitigation: this is honest about data shape; visual imbalance IS the information. If it feels too extreme, consider log-scaling `subtreeRadius` (√leafCount → log(leafCount)). Phase 1: leave raw, observe.
2. **Cousin collision when half-planes meet.** Two cousins whose parents point in nearly-opposite directions could end up close. Mitigation: `subtreeRadius` includes the whole canopy, so siblings' half-plane boundaries reserve enough space. Post-placement `maxPush` nudge catches rare cases. If common: widen `padding`.
3. **240° outward arc sometimes too wide.** At deep levels, children fanning into 240° may still grow back close to grandparent's subtree. Mitigation: shrink `outwardArc` with depth (e.g., 240° at depth 1, 200° at depth 2, 180° at depth ≥ 3). Tune after static render.
4. **Node-count doesn't equal leaf-count for non-uniform trees.** Using `leafCount` for `subtreeRadius` means a narrow-deep branch (100 nodes but single-chain) gets a tiny balloon. This might actually be correct — a single-chain subtree *visually* only needs a thin corridor. But if it feels wrong, switch to `nodeCount` (total descendants) for subtreeRadius.
5. **Computed subtreeRadius may over-allocate space.** The `minRing` calculation assumes worst-case packing (all children circles tangent on a ring). For small childCount, a cluster-style arrangement would use less space. Mitigation: detect childCount ≤ 3 and use cluster arrangement (triangle/pair/single) instead of ring.
6. **Aesthetic feels too "tree-diagram" (boxy connectors).** Straight parent-child lines can look rigid. Fix is one-line: swap to quadratic Bézier curves without touching placement math.

## Stages

### Stage 0 — Clone and static render (this session)
1. `cp -r templates/v2 templates/v3-tree`
2. Replace `app.js`'s layout logic with fractal-tree placement. Keep render, interaction shell, reader, CSS, keyboard shortcuts, search.
3. **Static only** — render the entire expanded ecosystem tree on real data (no click interactions yet). All nodes placed, all connectors drawn. Eye-test.
4. If static render looks wrong (long spikes, cousin collisions, depth squeeze on real data) → iterate on constants or flag back to Wisdom.

### Stage 1 — Bag renderer integration (after eye-test passes)
- Bag-node detection + grid-inside-membrane for `immediateChildCount > 50`.
- Collapse-by-default. Click to open.

### Stage 2 — Interactive click-to-grow (after bag renderer lands)
- Start collapsed except root. Click expands one node at a time.
- `_prevPositions` stored in memory + localStorage.
- Animation on expand (400ms D3 transition from parent to final position).
- Re-bloom gesture (shift-click discards stored positions for subtree).

### Stage 3 — Cross-session persistence and polish (future)
- File-backed position storage via watch-server.
- Phototropism score observer (post-render diagnostic only).
- Retire `v2-dynamic/` and `v2-dynamic-alt/`.

## Success Criteria (Measurable, after Stage 0)

1. Static render of real ecosystem data (3800 nodes, bag-nodes collapsed) fits within reasonable canvas extent (< 6000px diameter).
2. Zero trunk crossings — no line between parent and child crosses another parent-child line.
3. Zero sibling-subtree overlap at depth ≤ 5.
4. Total LOC for new placement code: < 250.
5. Render is deterministic — two invocations on same data produce identical output.

## Open Questions

1. **Sort order for children around parent.** Proposal: largest subtree at center of available arc, flanked by next-largest pair outward, etc. (balanced symmetric packing). Alternative: alphabetical or data-order. Static render resolves.
2. **Connector style.** Straight lines or quadratic curves? Proposal: start with curves (more organic, matches "branches bend" intuition). One-line swap if it looks wrong.
3. **subtreeRadius metric: leafCount vs nodeCount.** `leafCount` matches phototropism (leaves capture light). `nodeCount` matches total density. Proposal: start with leafCount; revisit if narrow-deep branches look starved.
4. **Root orientation.** Fixed up (-90°) or derived from weighted centroid? Proposal: fixed (deterministic, cosmetic anyway).
5. **Cluster arrangement for small childCount.** When N has 2-3 children, the ring-pack math over-allocates. Should we handle these as special cases (pair = two balloons at ±angle, triple = triangle)? Proposal: yes, code it in from the start — small childCounts are common at leaf folders.

---

*When Stage 0 renders, we eye-test on real data before building anything else. If it looks like a tree that satisfies the phototropism metaphor — leaves fanning into light, trunks minimized, no overlap — we proceed. If not, we iterate on constants or flag back.*

# Session Brief — Stage 2c: Circle-Packing Render

**Project:** Spatial Workspace v3, Stage 2 (candidate C — d3.pack)
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — read Stage 2 → Candidate B section.
**Depends on:** Stage 1 must be complete. Does NOT depend on any other Stage 2 session.
**Runs in parallel with:** stage-2a, stage-2b, stage-2d, stage-2e.

---

## Goal

Produce a static SVG render of **d3.pack nested circle packing** against the real 3096-node ecosystem tree at three expansion states. This is the algorithm GitHub Next independently picked for file-tree visualization after testing alternatives — the closest to a "production existence proof" in open source.

---

## The Algorithm

### Placement
Use d3-hierarchy's `pack` layout:

```js
const root = d3.hierarchy(treeData)
    .sum(d => d._leafCount || 1)   // Each leaf contributes 1; sum propagates upward
    .sort((a, b) => b.value - a.value);

const pack = d3.pack()
    .size([width, height])
    .padding(3);  // Padding between sibling circles

pack(root);
// Now each node has .x, .y, .r (center + radius)
```

Every directory becomes a circle. Every file (leaf) becomes a circle inside its directory's circle. Recursive nesting.

### Membrane — free
No separate membrane layer needed. **The circle IS the membrane.** A parent's circle visibly contains all its children's circles. That's the Voronoi-treemap-like aesthetic achieved at lower cost.

### Labels
- Directory labels placed at circle center, scaled to fit (or rendered at top/bottom of circle if preferred)
- File labels placed inside their circle, truncated to circle diameter minus padding
- For the static render, DO NOT truncate aggressively — if the label doesn't fit, render it below the circle with a small tick line connecting them. This is a static render; readability matters more than strict containment.

### Bag handling
From Stage 1. A bag directory becomes a single leaf circle in its parent, with radius proportional to √(bag count) and label `"<name> · <count>"`.

---

## Parameters (Honest Inventory)

1. Padding between circles — one constant
2. Size scale (radius-to-data ratio) — implicit in d3.pack's size() call
3. Min-label-size (when label is smaller than circle, when to hide) — one constant
4. Stage 1's two bag thresholds

Three knobs + Stage 1's two. d3.pack itself is parameterless — its internal algorithm is the Weiszfeld iterative circle-packing, deterministic for a given input.

---

## Output

`play/stage2c-circlepack.svg` — one SVG with three panels:
1. Default expansion
2. One branch deep
3. Fully expanded

`play/stage2c-circlepack-stats.md`:
- Visible nodes per state
- Render time (d3.pack is O(n log n))
- Subjective notes: does nested-circle containment feel clean? Too geometric? How do deep subtrees read?

---

## Steps

1. Write `tools/stage2c-render.js` (Node.js, uses d3-hierarchy):
   - Load real tree data
   - Apply Stage 1 bag classification
   - Compute d3.hierarchy + d3.pack
   - Render SVG with each circle as a `<circle>` element + label as `<text>`
   - Use heat/status colors on circles; use the existing v2 color tokens

2. Render at all three expansion states. Save SVGs.

3. Review visually. Common failure modes:
   - **Tiny circles at depth** — deeply nested leaves may be too small to read labels. Expected; the Stage 2 review judges whether it's acceptable.
   - **Aspect ratio** — circles are always 1:1; folder labels may need to live outside the circle if they're long
   - **Whitespace waste** — circle packing leaves corner gaps between sibling circles

---

## Constraints

- Use d3-hierarchy (already bundled in `templates/v2/d3.min.js`)
- Node.js is OK since this is a build-time static render
- Do NOT modify the live v2 canvas
- Do NOT add interactivity

---

## Success Criteria

- SVG renders correctly at all three states
- Circles properly nested (no child sticks out of its parent)
- Labels rendered (possibly with tick-line for long labels)
- Stats file has honest notes on visual quality

---

## What This Session Does NOT Do

- No zoom (Stage 3 concern)
- No DOM culling (Stage 3 concern)
- No interactivity
- No integration with v2

Chronicle the session with an honest visual assessment.

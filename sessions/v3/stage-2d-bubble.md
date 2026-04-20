# Session Brief — Stage 2d: Bubble Treemap Render

**Project:** Spatial Workspace v3, Stage 2 (candidate D — Bubble Treemap)
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — read Stage 2 → Candidate C section.
**Reference paper:** Görtler, Schulz, Weiskopf, Deussen (2018), "Bubble Treemaps for Uncertainty Visualization." IEEE TVCG. The Think Deep papers agent identified this as the closest literature match to Wisdom's "organic membrane" aesthetic.
**Depends on:** Stage 1 must be complete. Does NOT depend on any other Stage 2 session.
**Runs in parallel with:** stage-2a, stage-2b, stage-2c, stage-2e.

---

## Goal

Produce a static SVG render of a **Bubble Treemap (smooth contour membranes around treemap cells)** against the real 3096-node ecosystem tree at three expansion states. This is the literature-closest match to Wisdom's stated aesthetic preference: organic membranes with visible group boundaries.

---

## The Algorithm

### Internal structure — squarified treemap
Use d3-hierarchy's `treemap` layout with the squarified tiling strategy:

```js
const root = d3.hierarchy(treeData)
    .sum(d => d._leafCount || 1)
    .sort((a, b) => b.value - a.value);

const treemap = d3.treemap()
    .tile(d3.treemapSquarify)   // Aspect-ratio-optimizing tiling
    .size([width, height])
    .padding(2);

treemap(root);
// Every node has .x0, .y0, .x1, .y1 (rectangle bounds)
```

Internal cells are rectangles. This gives strong compression with good aspect ratio (~1:1.5 on average per Kong et al. 2010).

### External contours — the bubble part
Replace every rectangle boundary with a smooth contour:

1. For each non-leaf node, take its bounding rect + its children's bounding rects
2. Compute a rounded "super-ellipse" or a Bézier-interpolated smooth path around the union of the children's rects, slightly offset outward (~5–10px)
3. Render the path with:
   - Fill: very soft (e.g., parent's heat color at 8% opacity)
   - Stroke: parent's heat color at full opacity, 2px
4. Recurse: nested contours for nested directories

Key mechanism: the **contour smoothing is what makes it feel organic**. Rectangular treemaps feel clinical; adding smooth contours reads as membranes.

### Labels
Standard treemap labels — placed at top-left of each cell, scaled to fit. Hide labels for cells below a min-area threshold.

### Bag handling
From Stage 1. Bag directories become a single rectangle with the bag visual token (striped fill, count in label).

---

## Parameters (Honest Inventory)

1. Treemap padding between sibling cells — one constant
2. Contour offset distance (how far outside the rect the bubble sits) — one constant
3. Contour corner radius / Bézier smoothing factor — one constant
4. Membrane fill opacity — one constant (visual, not algorithmic)
5. Min-label-area threshold — one constant
6. Stage 1's two bag thresholds

Four knobs + Stage 1's two.

---

## Output

`play/stage2d-bubble.svg` — one SVG with three panels:
1. Default expansion
2. One branch deep
3. Fully expanded

`play/stage2d-bubble-stats.md`:
- Visible nodes per state
- Render time
- Subjective notes: do the contours read as membranes? Is the internal rectangular structure visible through them, or do the contours dominate?

---

## Steps

1. Write `tools/stage2d-render.js`:
   - Load real tree data
   - Apply Stage 1 bag classification
   - Compute d3.treemap
   - For each non-leaf cell, compute smooth contour path using a Bézier interpolation over the children's bounding rects. If you don't want to roll your own, look at the `bubble-treemap` npm package or port its algorithm — otherwise implement Andrew's monotone chain + Chaikin's algorithm for smoothing.
   - Render contours first (so they sit behind cells), then cell rectangles, then labels
   - Use heat/status colors for cell fills

2. Render at all three expansion states. Save SVGs.

3. Review visually. Known risks:
   - **Contours fight rectangles** — if the internal rectangular cells show too strongly, the "bubble" aesthetic fails
   - **Overlap at small scales** — nested contours may visually overlap if padding is too small
   - **Deep nesting confusion** — 5+ levels of nested contours may become a muddle of concentric shapes

---

## Constraints

- Use d3-hierarchy for the treemap. Contour rendering is custom (or via bubble-treemap npm if license-compatible)
- Node.js is OK — this is a build-time static render
- Do NOT modify the live v2 canvas
- Do NOT add interactivity
- Stroke color for each contour comes from the parent's heat color — consistent with v2's color system

---

## Success Criteria

- SVG renders correctly at all three states
- Contours are smooth and visually distinct from internal rectangles
- Labels readable for large cells, hidden for cells below threshold
- Stats file captures subjective notes honestly

---

## What This Session Does NOT Do

- No interactivity
- No zoom
- No integration with v2 canvas

Chronicle: Does the bubble/membrane aesthetic actually land on our data, or does it feel like "rectangles with squiggly borders"?

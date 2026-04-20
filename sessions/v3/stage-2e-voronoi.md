# Session Brief — Stage 2e: Hierarchical Voronoi Render

**Project:** Spatial Workspace v3, Stage 2 (candidate E — Hierarchical Voronoi / FoamTree-style)
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — read Stage 2 → Candidate D section.
**Reference implementation:** `d3-voronoi-treemap` (BSD-3 licensed, Kcnarf). FoamTree (Carrot Search) is the shipped closed-source existence proof; this session replicates its aesthetic using the open-source algorithm.
**Depends on:** Stage 1 must be complete. Does NOT depend on any other Stage 2 session.
**Runs in parallel with:** stage-2a, stage-2b, stage-2c, stage-2d.

---

## Goal

Produce a static SVG render of a **hierarchical weighted centroidal Voronoi tessellation** against the real 3096-node ecosystem tree at three expansion states. This is the maximum-aesthetic, maximum-computation candidate — the closest open-source analogue to FoamTree.

---

## The Algorithm

### Weighted Centroidal Voronoi Tessellation (CVT)

For each level of the hierarchy, recursively:

1. Take the parent cell's polygon (at the top level: the full canvas rectangle or a circle)
2. For each child, assign a weight = `_leafCount` (or √ of it, to compress the range)
3. Run Lloyd's algorithm on the child cells within the parent polygon:
   - Start with N seed points placed randomly inside the parent
   - Compute the Voronoi diagram, clipped to the parent polygon, weighted by the assigned weights
   - Move each seed to its cell's weighted centroid
   - Repeat until convergence (typically 20–80 iterations)
4. Each child now owns a polygonal cell with area roughly proportional to its weight
5. Recurse: for each child that is a directory, repeat the tessellation inside its cell

### Library
Use `d3-voronoi-treemap` directly (https://github.com/Kcnarf/d3-voronoi-treemap, BSD-3). Import it in a Node.js script. It handles the Lloyd's algorithm convergence for you.

### Membrane — free
The Voronoi cell boundaries ARE the membranes. Shared edges between sibling cells mean they share a wall; a parent's outer boundary automatically contains all descendants.

### Labels
Place at cell centroid. For cells too small to fit their label, hide the label (a min-cell-area threshold).

### Bag handling
From Stage 1. Bag becomes one Voronoi cell with the bag visual token.

---

## Parameters (Honest Inventory)

1. Lloyd's algorithm max iterations — one constant (~50 default)
2. Convergence tolerance — one constant
3. Weight scale (√count vs log₂ vs linear) — one choice
4. Min-cell-area for label visibility — one constant
5. Stroke width for cell edges — one constant
6. Initial seed distribution (random vs grid vs golden-angle) — one choice
7. Stage 1's two bag thresholds

Five knobs + Stage 1's two. Plus Lloyd's convergence is nondeterministic unless you fix the random seed — **use a fixed seed** so the render is reproducible.

---

## Output

`play/stage2e-voronoi.svg` — one SVG with three panels:
1. Default expansion
2. One branch deep
3. Fully expanded

`play/stage2e-voronoi-stats.md`:
- Visible nodes per state
- Render time (Voronoi is the slowest candidate — expect seconds, not milliseconds, for the full-expand case)
- Subjective notes: does the result look like FoamTree? Too chaotic? Too organic? Edges too busy?

---

## Steps

1. Install `d3-voronoi-treemap` locally in a throwaway `tools/stage2e/` subdirectory (npm install for this one session is OK since it's build-time only, not runtime for the v2 canvas)
2. Write `tools/stage2e/render.js`:
   - Load real tree data
   - Apply Stage 1 bag classification
   - Compute hierarchical Voronoi recursively — top level tessellates on the canvas rect, each directory cell then tessellates its children
   - Emit SVG with cells as `<path>` elements (polygons), labels as `<text>`
   - Use heat/status colors for cell fills
3. Render at all three expansion states. Save SVGs.
4. Review. Known risks:
   - **Render time** — the full 3096-node tree may take 10–60 seconds per state. Fine for static; a concern for Stage 3 interactive if Voronoi wins.
   - **Chaotic edges** — Voronoi cells are polygons with unpredictable shapes. The "organic" aesthetic may cross into "busy" on complex hierarchies.
   - **Small cells for flat leaves** — a directory with 50 files tessellated into a small area produces 50 tiny Voronoi cells. May need a min-area threshold that groups small leaves into a composite cell.

---

## Constraints

- `npm install d3-voronoi-treemap` + `d3-weighted-voronoi` is permitted FOR THIS BUILD SCRIPT ONLY. The v2 canvas still has no npm dependency. This build tool lives in `tools/stage2e/` with its own `package.json` so it's clearly isolated.
- Do NOT integrate Voronoi into the live v2 canvas
- Do NOT add interactivity
- Use a fixed random seed for reproducibility

---

## Success Criteria

- SVG renders correctly at all three states
- Voronoi cells tessellate without gaps or overlaps within their parent
- Labels visible for large cells, hidden for cells below threshold
- Stats file captures render times + subjective notes

---

## What This Session Does NOT Do

- No interactive implementation (Stage 3 concern, and honestly a hard problem — real-time Lloyd's convergence is expensive)
- No integration with v2 canvas
- No attempt to match FoamTree's exact look — match its *algorithm*, report what we get

Chronicle the session: does Voronoi feel like what Wisdom was picturing when he said "organic" + "membranes"? Or does it feel different?

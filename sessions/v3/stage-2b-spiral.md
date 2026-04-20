# Session Brief — Stage 2b: Golden-Angle Spiral Render

**Project:** Spatial Workspace v3, Stage 2 (candidate B — phyllotaxis spiral)
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — read Stage 2 → Candidate A section.
**Depends on:** Stage 1 must be complete (bag classification applied). Does NOT depend on any other Stage 2 session.
**Runs in parallel with:** stage-2a, stage-2c, stage-2d, stage-2e.

---

## Goal

Produce a static SVG render of a **golden-angle (phyllotaxis) spiral layout with leaf-weighted node sizing and post-hoc convex hull membranes**, against the real 3096-node ecosystem tree at three expansion states.

---

## The Algorithm

### Placement
For each non-root node N with parent P and sibling-index i (0-based, deterministic by sorting):
- `θ_i = i × 137.5° (in radians: i × π × (3 - √5))` — the golden angle
- `r_i = baseDistance_at_depth(P.depth + 1) × √(i + 1)` — Vogel's phyllotaxis formula

Root sits at origin. Each parent's children spiral outward from it.

### Node sizing
`nodeSize(n) = baseSize × (1 + K × log₂(n._leafCount + 1))` with K ≈ 0.08. Directories get bigger as they contain more. Files stay nominal.

### Membrane layer (post-hoc)
After all positions are computed, for every directory subtree:
1. Gather the positions of all visible descendants (including leaves)
2. Compute the convex hull of those points (use `d3.polygonHull` or a standalone Andrew's monotone chain implementation)
3. Expand the hull outward by a padding (~15–25px) using a polygon-offset routine
4. Render the hull as an SVG `<path>` with a soft fill (e.g., `rgba(parent-color, 0.08)`) and a thin stroke matching the parent's heat color

The membrane's visual job: make the parent + descendants read as one group even though positions are scattered by phyllotaxis.

### Bag handling
From Stage 1. Bag nodes render as terminal oversized buttons. They do NOT recurse into the spiral; they just take their own slot in the parent's phyllotaxis.

---

## Parameters (Honest Inventory)

1. Golden angle — **fixed** at 137.5° (the whole point; don't tune)
2. Base distance per depth — a scaling function, likely linear in depth, one constant
3. K (leaf-count-to-size coefficient) — one constant, ~0.08 proposed
4. Base node size — one constant
5. Hull padding — one constant
6. Stage 1's two bag thresholds

Five knobs plus Stage 1's two. The spec does not claim "one formula."

---

## Output

`play/stage2b-spiral.svg` — one SVG file with three panels for the three expansion states:
1. Default (root + direct children)
2. One branch deep
3. Fully expanded (bags auto-collapsed)

`play/stage2b-spiral-stats.md`:
- Visible nodes per state
- Render time
- Subjective notes: does the spiral look beautiful? Crowded? Unbalanced?

---

## Steps

1. Write a standalone Python or Node script `tools/stage2b-render.py` (or `.js`) that:
   - Loads real tree data
   - Applies Stage 1 bag classification
   - Computes phyllotaxis positions recursively
   - Computes leaf-weighted sizes
   - Computes convex hulls per subtree
   - Emits SVG with membranes rendered first (so they sit behind nodes), then nodes on top

2. Render at all three expansion states. Save SVGs.

3. Review visually. Common failure modes to flag in the stats file:
   - **One-arm asymmetry** — if a subtree has many more leaves than its siblings, its spiral arm dominates; the result feels unbalanced
   - **Hull overlap** — if two sibling subtrees' convex hulls overlap, the membrane layer breaks. May need to shrink hulls or prevent overlap at layout time
   - **Interior node placement** — a parent's position is fixed by ITS parent's phyllotaxis, but its children spiral outward from it. Do parent-positions feel natural relative to their children's cluster?

---

## Constraints

- Python stdlib or vanilla JS only. No pip installs. D3 is OK (already bundled in project).
- Single standalone script + single SVG output. Do not modify the live v2 canvas.
- Do NOT add interactivity (pan, zoom, hover). Static image only.
- Do NOT try to "fix" ugly outputs by tuning — the spec says five parameters is honest. If the result is ugly, that's information for Stage 2 review.

---

## Success Criteria

- SVG renders correctly
- All three expansion states produce valid output
- Membranes are visible and distinct from nodes
- Stats file captures the numbers + honest subjective notes

---

## What This Session Does NOT Do

- No physics, no force simulation, no iterative convergence (spiral is deterministic)
- No interactivity
- No integration with v2 canvas
- No Stage 2 review — that's a separate session

Chronicle honestly. If phyllotaxis looks wrong on this data, say so. If it looks right, say so. The Stage 2 review session decides — not this one.

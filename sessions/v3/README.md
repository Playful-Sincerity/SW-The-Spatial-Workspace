# Spatial Workspace v3 — Multi-Session Build

This directory decomposes the layout-v3 work into self-contained, cold-startable session briefs. Each brief is enough to open a new Claude Code conversation and drive a single focused task to completion.

**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — the single source of truth for what v3 is and how the stages compose.
**Think Deep that produced the plan:** [`../../research/think-deep/2026-04-17-layout-rethink.md`](../../research/think-deep/2026-04-17-layout-rethink.md)
**Prior sessions:** [`../v2/`](../v2/) — the history that led here. Phase 3C's brief in particular.

---

## The Philosophy

Three-stage falsification ladder. Cheapest tests first. Each stage has a human decision point at the end. We do NOT skip ahead.

- **Stage 1** — fix the inbox problem in the existing layout. Maybe this is all we need.
- **Stage 2** — if Stage 1's not enough, render 5 candidates as static images and pick the best one on the eye.
- **Stage 3** — build the Stage 2 winner interactively. Spec written only after Stage 2 picks a winner.

---

## Dependency Graph

```
stage-1-bag-fix ──────────────────┐
                                   ▼
                           [Wisdom eye test]
                                   │
                          ┌────────┴────────┐
                       passes             fails
                          │                  │
                       SHIP               Stage 2
                                             │
                      ┌──────────────┬───────┴──────┬──────────────┬──────────────┐
                      ▼              ▼              ▼              ▼              ▼
                 stage-2a       stage-2b       stage-2c       stage-2d       stage-2e
                 baseline       spiral         circle-pack    bubble         voronoi
                 (existing     (phyllotaxis  (d3.pack +     (Görtler        (FoamTree-
                  radial +      + hulls)      zoom)         2018)           style)
                  bag-fix)
                      └──────────────┴──────┬───────┴──────────────┴──────────────┘
                                             ▼
                                    stage-2-review
                                    (Wisdom picks winner)
                                             │
                                    winner decided
                                             ▼
                                    stage-3-build
                                    (spec TBD — shape depends on winner)
```

The Stage 2 rendering briefs (2a–2e) are **fully independent** — each takes the real tree data, runs its own layout algorithm, produces an SVG. They can run in parallel in five separate conversations with no coordination needed.

Stage 2 review is a single session that composes the outputs and hands them to Wisdom.

---

## Brief Index

| File | Stage | Depends On | Purpose |
|------|-------|------------|---------|
| [stage-1-bag-fix.md](stage-1-bag-fix.md) | 1 | — | Out-degree distribution + bag classification + drawer UI in existing radial layout |
| [stage-2a-baseline.md](stage-2a-baseline.md) | 2a | Stage 1 | Static render of existing radial + bag-fix (baseline for comparison) |
| [stage-2b-spiral.md](stage-2b-spiral.md) | 2b | Stage 1 | Static render of golden-angle spiral + leaf-weighted + post-hoc convex hulls |
| [stage-2c-circlepack.md](stage-2c-circlepack.md) | 2c | Stage 1 | Static render of d3.pack nested circle packing |
| [stage-2d-bubble.md](stage-2d-bubble.md) | 2d | Stage 1 | Static render of Bubble Treemap (Görtler 2018 variant — smooth contour membranes) |
| [stage-2e-voronoi.md](stage-2e-voronoi.md) | 2e | Stage 1 | Static render of Hierarchical Voronoi (FoamTree-style polygon tessellation) |
| [stage-2-review.md](stage-2-review.md) | 2-review | All of 2a–2e | Compose all 5 × 3 renders; Wisdom reviews and picks winner |
| [stage-3-tbd.md](stage-3-tbd.md) | 3 | Stage 2 winner | Placeholder — this brief gets rewritten once we know who won |

---

## How to Use

### To run Stage 1:
Open a new Claude Code conversation in this repo. Paste:
> "Pick up Spatial Workspace v3 Stage 1. Read `sessions/v3/stage-1-bag-fix.md` first — it's your single entry point. Then resolve the open questions with me before coding."

### To run Stage 2 (after Stage 1 fails eye test):
Open **five parallel conversations**, one per candidate. In each, paste the appropriate kickoff:
> "Pick up Spatial Workspace v3 Stage 2a. Read `sessions/v3/stage-2a-baseline.md` first."
> "Pick up Spatial Workspace v3 Stage 2b. Read `sessions/v3/stage-2b-spiral.md` first."
> ...and so on.

Let each session produce its own SVG panels. When all five are done, start the review session with `stage-2-review.md`.

### To run Stage 3:
Happens after Stage 2 review picks a winner. The winner's brief will be written then — don't prematurely write it now.

---

## Invariants Across All Stages

- **v2 UI is sacred.** Reader, tabs, search, centering, zoom, settings, legend, watch-server, node measurement, label wrapping — none of this changes. All stages only touch the layout algorithm + bag-node additions.
- **Demo hooks remain.** `#demo=expandBranch`, `#demo=expandAll`, `#demo=clickFile`, `#demo=clickDir` must work for the post-Stage-3 build.
- **Python stdlib only** for any generator or tree-stats scripts. No pip installs.
- **Single HTML file** for any static render. No bundlers, no npm, no CDN.
- **Real data.** Every stage tests against the actual ecosystem tree (3096 nodes, 469-child inbox), not a toy dataset.

---

## Project Status As Of 2026-04-17

- Stage 1 brief written. Open questions flagged for Wisdom before coding starts.
- Stage 2a–2e briefs written. All 5 are independent and parallelizable.
- Stage 2 review brief written.
- Stage 3 brief is a placeholder.
- Think Deep synthesis complete and cross-referenced from the umbrella spec.
- v2 canvas is live and in use; v3 work is additive until Stage 3 ships.

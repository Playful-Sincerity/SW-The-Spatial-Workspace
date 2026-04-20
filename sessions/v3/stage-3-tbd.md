# Session Brief — Stage 3: Full Interactive Build (PLACEHOLDER)

**STATUS: PLACEHOLDER. This brief will be rewritten after Stage 2 review picks a winner.**

---

## Why This File Is a Placeholder

Stage 3's shape depends on which candidate wins Stage 2:

- **If Candidate 0 (baseline) wins** → Stage 3 does not happen. Stage 1 was sufficient. The v3 work is complete after Stage 1 ships.
- **If Candidate A (spiral) wins** → Stage 3 integrates the golden-angle spiral into the `Simulation` interface, adds post-hoc convex hulls as an SVG layer, fixes the known hit-box bug, and handles expand/collapse transitions via position interpolation.
- **If Candidate B (circle-pack) wins** → Stage 3 integrates d3.pack + d3-zoom + DOM culling. The radial layout code is removed. Centering, search, and settings adapt to nested circles.
- **If Candidate C (bubble) wins** → Stage 3 integrates the squarified treemap + contour layer. Transitions are rectangle morphs + contour redraws.
- **If Candidate D (voronoi) wins** → Stage 3 tackles the hardest case: real-time Lloyd's convergence. May require precomputation + cached layout + interpolation between precomputed states. A separate Think Deep or debate may be needed before the spec is written.
- **If none of the candidates win** → Stage 3 does not exist as written. Go back to the Think Deep Open Threads.

---

## Writing This Brief Properly

When Stage 2 review picks a winner, the next session (separate from the review) writes the real Stage 3 brief. That brief should cover:

1. **Integration seam** — which part of `templates/v2/app.js` changes, which stays
2. **The `Simulation` interface** — the winning algorithm plugs in through the existing `{ seed, run, measure, tick }` seam. Define the implementation.
3. **Transitions** — how expand/collapse animates. Position interpolation for nodes; morph or fade for membranes.
4. **Zoom and pan** — semantic zoom vs camera zoom, whatever fits the algorithm
5. **Hit boxes** — the current bug with stale hit rects during transitions must be fixed
6. **Membrane rendering** — separate SVG layer? Built into the node layer? Depends on winner.
7. **Verification** — `#demo=expandBranch`, `#demo=expandAll`, `#demo=clickDir` must pass. Plus a visual regression screenshot against the Stage 2 winning static render — the interactive version at rest should look identical to the static SVG.
8. **Estimated effort** — refine the 2–5 day estimate based on what the winner actually needs.

---

## Do Not Fill In This Placeholder Before Stage 2 Finishes

Writing Stage 3 speculatively would fork the work and waste effort on five branches that won't be used. The cost of waiting for Stage 2's decision is low; the cost of premature speccing is high.

If you're opening this file before Stage 2 is complete, close it. Go run the Stage 2 sessions first.

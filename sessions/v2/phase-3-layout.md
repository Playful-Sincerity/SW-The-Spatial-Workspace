# Session Brief: Phase 3 — Layout & Visual

**Project:** Spatial Workspace v2
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Dependencies:** Phase 2 complete (Figma frames approved, tokens in `templates/v2/app.css`)
**Feeds into:** Phase 4 (Polish + Verification)
**Blocks:** Phase 4
**Estimated scope:** 3-4 hours, autonomous, longest stretch in the build

## Context

This is the visual heart of v2. You'll build the membrane-physics layout (no overlapping labels by construction), node-as-button rendering (per Figma spec), status-as-ambient-color, connector geometry, and expand/collapse with smooth re-settle. The Figma file from Phase 2 is the source of truth for the visual.

**Read these first** (in this order):
1. `plan.md` — especially Step 0 (data model + interface contracts), User Journey, Section 3 acceptance criteria
2. `templates/v2/app.css` — the CSS custom properties Phase 2 extracted
3. `design/2026-04-16-figma-workshop.md` — the Figma URL + decisions log
4. `research/2026-04-16-design-references.md` — design brief (button anatomy, connector geometry, status encoding details)
5. `chronicle/<latest>.md` — what Phase 1 + 2 produced
6. `templates/v2/app.js` — current state (extracted from v1, will be substantially rewritten)
7. `archive/v1/app.html` — for reference on what v1 did and why it didn't work

**Open the Figma file** via the `mcp__figma__get_design_context` tool using the URL stored in `design/2026-04-16-figma-workshop.md`. Reference Frame 1, 2, 3, 4, 5 as you build.

## Task

Rewrite `templates/v2/app.js` to implement the membrane-physics layout with node-as-button rendering. Result: a canvas where labels never overlap, buttons look like the Figma spec, and the simulation settles in <1s for 5000 nodes.

### Build order (recommended)

**3A — Define the `Simulation` interface**
- Add a JSDoc-typed interface at the top of `app.js`:
  ```js
  /**
   * @typedef {object} Simulation
   * @property {(nodes, links) => void} seed
   * @property {(maxIterations: number) => Promise<void>} run
   * @property {(node) => {width, height}} measure
   * @property {((cb) => void) | null} tick — optional, for continuous mode
   */
  ```
- This is the seam Wisdom wants for "pluggable simulations later." Settle-once is the v2 implementation.

**3B — Implement `MembraneSimulation` (settle-once)**
- Use `d3.tree()` to seed initial polar positions, then convert to cartesian.
- Use `d3.forceSimulation` with these forces:
  1. **`forceLink`** — attractive force on parent-child edges, distance proportional to ring spacing
  2. **`forceManyBody`** — repulsion between all nodes (gentle)
  3. **`forceRadial`** — soft pull toward `depth × ringSpacing` for each node, preserving "rings = depth" reading
  4. **Custom `rectCollide`** — the membrane: each node has a measured bounding box (label width × height + padding), no two boxes can overlap
- After seeding, run `simulation.alpha(1).alphaDecay(0.05)` and tick until alpha drops below threshold. Should settle in <1s for 5000 nodes.
- After settle, call `dodgeLabels()` is **NOT NEEDED** — collision is in the simulation itself.

**Custom rectCollide implementation sketch:**
```js
function rectCollide(strength = 1) {
  let nodes;
  function force() {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const overlapX = (a.width + b.width) / 2 + 4 - Math.abs(dx);  // 4px padding
        const overlapY = (a.height + b.height) / 2 + 4 - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          // Push along the smaller-overlap axis
          if (overlapX < overlapY) {
            const push = (overlapX / 2) * strength * (dx >= 0 ? -1 : 1);
            a.x += push; b.x -= push;
          } else {
            const push = (overlapY / 2) * strength * (dy >= 0 ? -1 : 1);
            a.y += push; b.y -= push;
          }
        }
      }
    }
  }
  force.initialize = (n) => { nodes = n; };
  return force;
}
```
For 5000 nodes this is O(n²) per tick, which may be too slow. If perf is bad, optimize with a quadtree (d3.quadtree) for spatial indexing.

**3C — Render nodes as buttons**
- Each node is an SVG `<g class="node">` containing:
  - `<rect class="hit-area">` — invisible, larger than the visible button (per `--sw-hit-radius` setting)
  - `<rect class="node-button">` — visible button, sized to label + padding, border-radius per node type
  - `<text class="node-label">` — horizontal text, centered
- Status-as-ambient-color: if `d.data.meta.phase` is set, the `<rect class="node-button">` gets `stroke` = status border color (1.5px) and `fill` = status background tint. Otherwise default `--sw-border-default` 1px stroke and white fill.
- Use the `--sw-*` CSS custom properties from `app.css` for ALL visual properties. Never hardcode colors/sizes here.

**3D — Render connector lines**
- After settle, draw a `<path class="link">` per parent-child edge.
- Use `d3.linkRadial()` from the radial center for the curve.
- Center-to-center attachment (per design brief — edge attachment breaks under physics jitter).
- Color: `var(--sw-link-color)` at 65% opacity (or whatever Phase 2 settled on).

**3E — Expand / collapse with smooth re-settle**
- Click handler on directory buttons toggles `state.expandedPaths`.
- On toggle: recompute visible tree, re-seed simulation with new node set (preserving existing positions for nodes that are still visible), run for ~300ms, animate transitions on positions.

**3F — Initial load: just the root**
- On boot, only the root node is visible (per Wisdom's Phase 2 question answer).
- ~3 top-branch buttons appear as collapsed siblings around it.
- `setInitialExpanded(ECOSYSTEM_DATA, 0, 1)` — depth 1 means root is "expanded" (showing its children) but those children stay collapsed.

**3G — Trackpad gestures + zoom (port from v1)**
- Two-finger scroll = pan, pinch = zoom, cursor-anchored zoom.
- The v1 `setupTrackpadGestures()` works as-is — port it.

### Set the SW_READY flag

After the initial render completes, set `window.SW_READY = true`. This is what `screenshot.sh` waits for (see Phase 1 sub-task 1F).

### Verify with the screenshot loop

After every major milestone (sub-task 3B, 3C, 3D, 3E, 3F):
1. Restart the watch-server if not running
2. Wait 2-3s for live-reload
3. Run `bash generator/screenshot.sh`
4. Read the PNG via the `Read` tool
5. Compare visually to the Figma frames
6. If something looks wrong, fix it before moving on

This is the "visual verification loop" — it's how you stay aligned with the Figma spec without relying on Wisdom's eyes.

## Output

```
Spatial Workspace/
└── templates/v2/
    └── app.js                          ← SUBSTANTIALLY REWRITTEN (3A-3G)
```

The CSS shouldn't need changes (everything's in `--sw-*` variables from Phase 2).

## Success Criteria

- [ ] Vault of 5000 nodes settles in <1s; no overlapping labels (verify by screenshot at zoom-out)
- [ ] Nodes render as buttons matching Figma Frames 1-3
- [ ] Status-as-ambient-color works for all 5 statuses (verify by loading a vault with mixed statuses)
- [ ] Connector lines attach center-to-center, look symmetric and intentional
- [ ] Click to expand a folder: smooth re-settle in <300ms
- [ ] Initial load: only root visible (no auto-expansion of top branches' children)
- [ ] Pan/zoom works with trackpad (two-finger pan, pinch zoom)
- [ ] `window.SW_READY = true` after initial render
- [ ] `bash generator/screenshot.sh` produces a sharp PNG matching Figma Frame 1
- [ ] `Simulation` interface defined; `MembraneSimulation` is the v2 implementation; replacing it with a stub `AlwaysAliveSimulation` requires no changes outside the simulation file

## When done

Write the completion note in `chronicle/<today>.md`. Take a final screenshot showing the v2 canvas matching Figma. Tell Wisdom: **"Phase 3 complete. Canvas matches Figma spec. Membrane physics settles cleanly. Ready for Phase 4 (Polish + Verification)."**

# Session Brief — Phase 3B: Layout Engine Reset

**Project:** Spatial Workspace v2
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Supersedes:** The layout code in `templates/v2/app.js` (not the file — just the layout part)
**Does NOT supersede:** Everything else (reader, tabs, search, colors, legend, click-to-center, dot grid, node anatomy, CSS, template.html, generator). All of those stay.
**Estimated scope:** 2-3 hours focused work

---

## Your single entry point is this doc

Read this file first. It's the condensed version of everything that matters for the next step. Only dip into the references if something here is unclear.

---

## What happened (context in 4 paragraphs)

Phase 3 was supposed to be the autonomous 3-4 hour build against `phase-3-layout.md`. That session lived long. It went through: a session lockup (image paste exceeded 2000px limit), recovery from the session JSON, four major bug fixes (file reader, colors+legend, overlap, click-to-center), a formal physics-reset decision (captured in `SPEC-PHYSICS.md`), and then ~2½ hours of iterating a deterministic-then-hybrid-then-clusters layout engine.

The work produced real gains that are keepers: file-click recenters on file + parent with reader-transition timing, folder-click zoom-to-fit-children, tab-click recentering, multi-line label wrap with a 20-char rule, "never just `…`", shadow restyling for dark-bg legibility, dot grid moved into the SVG zoom layer so it zooms with content, hit-box reduced from 16 → 5 px, zoom scale extent expanded to 0.01, and a build-queue pattern that became a global rule (`~/claude-system/rules/build-queue.md`).

The LAYOUT engine itself ended up tangled. By the end of the session it had four interfering coordinate systems: (a) global angular allocation (`_sliceWidth`), (b) global ring radii (`radiusAt[]`), (c) local per-subtree seed, (d) physics polish. The physics link distance was reading from `radiusAt[]`, which at deep depths was ~10,000 px, dragging nodes outward. Deep subtrees ended up flung hundreds of pixels from their parents on long thin connector lines.

Wisdom invited a breather. I proposed a strip-back: keep everything that works, delete the layout engine's tangle, rewrite just the layout with one coordinate system. This brief is the execution plan.

---

## Hard invariants (non-negotiable)

These are the rules the new layout must produce. If the new code violates any, it's wrong.

1. **No overlap.** No two node rectangles overlap. Ever. Enforce via `rectCollide` or equivalent.
2. **The 20-char nominal rule.** Labels ≤ 20 characters render single-line at their natural width. They are **never** squished below that width. If a wedge is too tight for a 20-char label, the ring spreads wider or the subtree migrates — but the rect stays at nominal.
3. **Never just `…`.** Labels > 20 characters wrap to multi-line (up to 5 lines). Font scales down as a secondary recourse. Ellipsis-only output is forbidden.
4. **Children always farther from root than their parents.** The tree depth hierarchy is visually preserved.
5. **Children spawn on the outer side of their parent.** Each subtree fans in a direction pointing *away* from the grandparent, using the local space around the parent.
6. **Organic clusters, not concentric rings.** Subtrees should read as clusters around their parents, not as regular rings. If the final layout looks lattice-aligned or grid-like, something's wrong.
7. **Size encodes subtree weight.** *(Wisdom 2026-04-16, late session.)* A node's visual size scales with the number of descendants it contains. The root (which contains the whole tree) is the biggest. Top-level branches are medium. Files are smallest. Concrete shape: `sizeFactor = 1 + k × log2(leafCount + 1)` (log so a 2000-descendant root isn't 2000× a leaf — something like 6-10×). This is the new dominant size signal; the old sparse-wedge growth can be dropped in favor of it. See Section 8 below for more.
8. **Parent ≥ child size.** Guaranteed by the subtree-weight rule above (parent's `leafCount` always ≥ max child's `leafCount`).
9. **Canvas is zoom-and-pan.** The canvas can be large (thousands of px across); the user navigates via zoom and pan. Don't constrain canvas size at the cost of overlap.
10. **Compact by default.** Don't over-space. Wisdom's late-session note: *"there's just some unnecessary separations that are still happening, everything's kind of too far apart."* Err on the side of tighter clustering; let collision push things apart only as much as it absolutely needs to. When tuning physics, start from compact and loosen only if overlap requires it.

---

## The algorithm (one paragraph)

> Each node has a nominal width (20-char rule). Root sits at origin. Each parent fans its children in a local arc around itself — root's children fan 2π, non-root parents fan ~290° pointing away from their own parent. The fan distance is the maximum of: parent_halfwidth + child_halfwidth + gap, or (n_children × avg_child_width) / fan_arc (circumference-based crowding). Seed positions are set recursively top-down. Then a physics polish pass runs: `forceLink` with distance = parent_halfwidth + child_halfwidth + gap (local only, never reads any global ring radius), `forceManyBody` gentle repulsion, `rectCollide` strict no-overlap, NO `forceRadial` (that's what creates rings). Root is pinned at origin during the polish. ~100-150 iterations. Done.

That's the whole thing. No global angular allocation. No `radiusAt[]`. No arc-based shrink. No `MAX_RING_MULTIPLIER`. No `ARC_FILL_FACTOR`. One coordinate system.

---

## What to carry forward (DO NOT TOUCH)

Everything in [app.js](templates/v2/app.js) outside the layout section stays. Specifically, these are correct and working:

**Label handling:**
- `nodeLabel(d)` — builds the display label with count suffix
- `wrapLabel(d, label, { maxLines, preferredCharsPerLine })` — multi-line wrap with font-scale fallback
- `truncateLabel(d, label)` — used elsewhere; audit whether still needed after wrap

**Node visual tokens:**
- `nodeVisual(d)` — returns stroke/fill/strokeWidth based on phase / root / default
- `measureNode(d)` — canvas-based width measurement

**Reader + tabs + search:**
- `openFile(data)` — with reader-transition-aware centerOnFileWithParent delay
- `showActiveTab()` — renders markdown via marked.parse
- `activateTab(index)` — recenters on file+parent
- `closeAllTabs`, `minimizeReader`, `closeTab`
- `renderTabs()`, `renderOpenFiles()` — tab strip + OPEN FILES dropdown
- `attachNodeHandlers(selection)` — click handlers (directory → expand+fit-children, file → openFile)
- `applySearchHighlight()`, search input handlers — Enter-to-commit, keystroke-to-highlight

**Pan/zoom + centering:**
- `fitToView()` — initial framing
- `centerOnNode(path, opts)` — pan-only, keeps scale
- `centerOnFileWithParent(path)` — fits file + parent, never zooms in past current scale
- `centerOnNodeWithChildren(path)` — fits folder + immediate children, clamped min-scale
- `setupTrackpadGestures` — two-finger pan, pinch zoom
- `zoomBehavior` with scaleExtent `[0.01, 8]`

**Infrastructure:**
- `startLivePolling()` — watch-server auto-reload
- `toggleExpandAll()` — ⌘E / header button
- `expandAncestors(path)` — used by search
- `setupSettingsPanel()` — settings UI
- `setupEvents()` — keybinds, clicks
- `init()`, `flattenTree`, `setInitialExpanded`, `getVisibleTree`
- `_prevPositions` map — used for centerOnNode lookups; layout should maintain it

**Canvas structure:**
- SVG bootstrap: `defs` with `dot-grid` pattern, `outerG` (zoom-layer), content-layer `g` at (w/2, h/2)
- `dot-grid-bg` 200000×200000 rect inside outerG (scales with zoom)

**Demo hooks (verification harness):**
- `#demo=clickFile`, `#demo=clickDir`, `#demo=expandBranch`, `#demo=expandAll`
- These instrument overlap counts + centering assertions via `document.body.setAttribute("data-...", ...)` — read back via `--dump-dom`

**All of CSS (app.css):**
- Node button styling, layered shadows, legend pill, OPEN FILES dropdown, reader panel, tabs, header, dividers, search input with `⌘F` kbd badge, settings panel
- All `--sw-*` design tokens from Phase 2

**template.html, generator/, screenshot.sh, watch-server.py:** unchanged.

---

## What to delete

From `templates/v2/app.js`, delete these wholesale:

- The entire `createDeterministicLayout` function (roughly lines 225-380 as of this writing — verify by grep)
- The entire `createMembraneSimulation` function (roughly lines 158-220)
- The entire `rectCollide` function (roughly lines 400-470) — but you'll likely re-implement a similar one in the new layout; adapt as needed
- The `useDeterministic` toggle in `updateTree` and the `?layout=physics` param parsing
- Constants: `SETTLE_MAX_ITERATIONS`, `SETTLE_ALPHA_MIN`, `RESETTLE_ITERATIONS`, `PHASE_TO_HEAT` stays (used by `nodeVisual`), `NODE_ANATOMY` stays
- Any reference to `d._sliceWidth`, `d._angle`, `d._leafCount`, `d._weight`, `d._nominalWidth`, `d._naturalW`, `d._fontScale` — kill them all *outside* the new layout module (the new module can reintroduce any it needs, internally)
- Within the `nodeUpdate.each` render block: the references to `d._fontScale`. After deletion, the render code should use only `d.width`, `d.height`, and per-anatomy font settings.

---

## What to write

### Option A (recommended): extract into `templates/v2/layout.js`

Create a new file that exports one function matching the existing `Simulation` interface:

```js
/**
 * Build a layout engine for the Spatial Workspace canvas.
 * @returns {Simulation} with seed(nodes, links), run(), measure(d)
 */
export function createLayout({ baseSpacing = 180 } = {}) {
  // ...
  return { seed, run, measure: measureNode, tick: null };
}
```

Internal structure:
- `computeNominalWidths(nodes)` — applies the 20-char rule per node, writes to `n._nominalWidth`
- `seedLocalFan(root)` — recursive: fans each parent's children around it at a crowding-appropriate distance
- `polishPhysics(nodes, links)` — short d3-force pass with link + charge + collide, NO radial
- `rectCollide({ padding, strength })` — rectangle collision force (carry over the corrected quadtree cull from the old one; see chronicle for the bug history)

Then update the generator (`generate-ecosystem.py`) to concatenate `layout.js` into the HTML alongside `app.js`, OR just inline it into app.js as a clearly-delimited section.

### Option B (simpler): rewrite in place

If a separate file complicates the generator too much, put `createLayout` at the top of app.js with a `// ── Layout Engine ──────────` banner. Same function, just co-located.

Either option is fine. Pick the one that feels cleaner.

### Seed algorithm (more detail)

```js
function seedLocalFan(node) {
  if (!node.children?.length) return;

  const n = node.children.length;
  const total = node.children.reduce((s, c) => s + Math.sqrt(c._leafCount || 1), 0) || 1;

  let outwardCenter, arc;
  if (!node.parent) {
    outwardCenter = 0;
    arc = 2 * Math.PI;
  } else {
    outwardCenter = Math.atan2(node.y - node.parent.y, node.x - node.parent.x);
    arc = 1.6 * Math.PI;  // ~290°
  }

  // Crowding distance: enough circumference to fit all children's nominal widths
  const avgChildWidth = node.children.reduce((s, c) => s + c._nominalWidth, 0) / n;
  const circumferenceNeeded = n * (avgChildWidth + 24);
  const parentHalf = (node._nominalWidth || 100) / 2;
  const distance = Math.max(
    parentHalf + avgChildWidth / 2 + 40,
    circumferenceNeeded / arc,
    baseSpacing
  );

  const start = outwardCenter - arc / 2;
  let cursor = start;
  for (const child of node.children) {
    const weight = Math.sqrt(child._leafCount || 1);
    const childArc = arc * (weight / total);
    const center = cursor + childArc / 2;
    child.x = node.x + distance * Math.cos(center);
    child.y = node.y + distance * Math.sin(center);
    cursor += childArc;
  }

  for (const child of node.children) seedLocalFan(child);
}
```

### Physics polish (more detail)

```js
function polishPhysics(nodes, links) {
  const root = nodes.find(d => d.depth === 0);
  if (root) { root.fx = 0; root.fy = 0; }

  const sim = d3.forceSimulation(nodes)
    .velocityDecay(0.55)
    .force("link", d3.forceLink(links)
      .id(d => d.data.path)
      .distance(l => {
        const sHalf = (l.source._nominalWidth || 100) / 2;
        const tHalf = (l.target._nominalWidth || 100) / 2;
        return sHalf + tHalf + 40;
      })
      .strength(0.6))
    .force("charge", d3.forceManyBody()
      .strength(d => d.depth === 0 ? -400 : -50)
      .distanceMax(baseSpacing * 4))
    .force("collide", rectCollide({ padding: 10, strength: 2.5 }))
    .stop();

  sim.alpha(0.9).alphaDecay(0.035).alphaMin(0.005);
  const iters = Math.min(150, 80 + Math.floor(nodes.length / 40));
  for (let i = 0; i < iters; i++) sim.tick();

  if (root) { root.fx = null; root.fy = null; }
}
```

---

## Verification plan

After writing the new layout:

1. **Syntax:** `node --check templates/v2/app.js` (and layout.js if separate).
2. **Regenerate:** `python3 generator/generate-ecosystem.py`.
3. **Cold open screenshot** — `bash generator/screenshot.sh` — should show root + 3 children, root prominent, labels readable.
4. **Overlap counter — branch expand:** `#demo=expandBranch` → `data-overlap` should report 0 overlaps.
5. **Overlap counter — full expand:** `#demo=expandAll` → 0 overlaps.
6. **Click a file (demo=clickFile):** reader opens, file + parent in canvas-panel center.
7. **Click a folder:** expand happens, folder + children fit viewport.
8. **Visual inspection:** the expanded state should read as CLUSTERS around parents, not concentric rings. Wisdom will tell you if it's rigid.
9. **The 20-char test:** pick a folder with children named `community-health`, `development-journal.md`, etc. All labels readable single-line at nominal widths. Nothing rendering as `…`-only.

---

## References

- **[chronicle/2026-04-16.md](../../chronicle/2026-04-16.md)** — full narrative of today's work, 1160 lines. Skim the 21:07 entry if you want the condensed version of everything after the physics-reset decision.
- **[SPEC-PHYSICS.md](../../SPEC-PHYSICS.md)** — the original redesign spec. Most of it is still valid; the algorithm section has evolved into this brief's "algorithm" section.
- **[knowledge/sources/wisdom-speech/2026-04-16-physics-reset-decision.md](../../knowledge/sources/wisdom-speech/2026-04-16-physics-reset-decision.md)** — Wisdom's decision monologue preserved verbatim.
- **[ideas/build-queue.md](../../ideas/build-queue.md)** — running log of ideas Wisdom surfaced. Has one entry: a "show in canvas" reader button.
- **[design/2026-04-16-folder-size-visual-differentiator.md](../../design/2026-04-16-folder-size-visual-differentiator.md)** — separate design idea, parked.
- **~/Wisdom Personal/people/wisdom-happy.md** — his preferences. Relevant sections for this work: "Operability over geometric purity," "Organic clusters over rigid grids," "Elegant and simple," "Fast architectural pivot."
- **~/claude-system/rules/build-queue.md** — newly live global rule. During this session, capture any adjacent ideas silently to `ideas/build-queue.md`.
- **~/remote-entries/2026-04-16/build-queue-as-global-rule.md** — migration record (already migrated).

---

## Known issues to audit during the reset (from Wisdom's final review, 2026-04-16)

Besides the layout tangle itself, the end-of-session state has these problems. Address as you go:

1. **Hit-box regression.** *"The hit boxes are like too big or something and they're overlapping again, and some of the hit boxes are not there — I can't actually click some of them sometimes, off to the side."* Earlier in the session I reduced `hitRadius` from 16 → 5 px and that fixed an adjacent-node overlap issue. But something since then has re-broken it. Possibilities: (a) renderH changes between frames put the hit-area at a stale size; (b) during the re-layout transition the hit-area's underlying `<rect>` is tweening; (c) pointer-events on the button rect are taking precedence somehow. Audit the hit-area path during a live click before moving on. A headless `#demo=clickFile` might not catch this — need to click a node that was JUST re-positioned.

2. **Expand-transition feels jarring.** *"When it opens a new folder everything gets moved around a bunch which it has to obviously I understand that but … when I just clicked projects in Claude System everything got moved around and then it was kind of hard to keep track of all that."* The re-layout on expand/collapse tweens all nodes to new positions, which is visually chaotic when the tree topology changes substantially. Options: (a) shorter transition duration (currently 180ms, maybe 300-400ms feels less snappy but clearer); (b) stagger the transition so existing nodes settle first, then new nodes fade in; (c) anchor the clicked node so it stays still while the rest moves (user's focal point doesn't jump); (d) after re-layout, always center on the clicked node (already partially done via `centerOnNodeWithChildren` but may conflict with the transition).

3. **Too-far-apart in general.** *"There's just some unnecessary separations that are still happening, everything's kind of too far apart and then especially … when you go to the full out view it's way too far apart, can't see anything."* Symptom of the big physics distances. Strip-back should dramatically reduce default spacing since link distance = parent_half + child_half + gap is much smaller than the old `radiusAt`-derived values. Once the subtree-weight sizing rule is in, the "too far apart" feel should also naturally improve because bigger nodes are closer proportionally.

4. **Full-expand readability.** *"Full out view ... can't see anything."* This is the zoom-extent problem + physics distance compounding. With subtree-weight sizing, root is large and dominates the view, even at zoom-out. Combined with tighter spacing (issue 3), the full-expand view should self-improve. If not, consider: initial view on expand-all starts at root-focused (not full fit), user pans to explore.

## Parked (don't do these unless asked)

- Full-expand perf (Web Worker or virtualization). Separate session.
- "Show in canvas" reader button. In `ideas/build-queue.md`. Separate session.
- Mobile responsiveness. Separate design pass.
- Diagonal-angle √2 overlap. Likely moot after strip-back — `rectCollide` handles it.
- Folder-size visual differentiator (`design/2026-04-16-folder-size-visual-differentiator.md`). Parked.

---

## Tell Wisdom when done

> "Phase 3B complete. Layout engine rewritten with one coordinate system. Zero overlap, 20-char rule held, clusters emerging around parents. Hard-refresh to see it."

Take a cold-open screenshot and a branch-expand screenshot as evidence. Overlap counter should read 0 in both cases.

Chronicle it at the end. One entry summarizing the strip-back, under the **Implementation** category, with the before/after overlap counts and the final file structure.

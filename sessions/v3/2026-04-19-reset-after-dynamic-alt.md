# Reset — After 2026-04-18/19 Dynamic-Alt Session

**Start this session in a FRESH Claude Code conversation.** Self-contained brief. ~17 hours of physics tuning and popout attempts exhausted the approach. Reset the mental model, pick one of two genuine substrate options, build it fresh.

---

## Current State of the Code

- `templates/v2/app.js` — untouched baseline. Pinned-expanse radial tree. Packs organically at small-to-medium scale; spreads too wide at ecosystem scale (3800 nodes).
- `templates/v2-dynamic/app.js` — the parallel conversation's dynamic-expanse variant (clicked folder is mobile, drifts). Untouched today.
- `templates/v2-dynamic-alt/app.js` — **reset to a byte-identical copy of v2/ + a test marker**. All of today's popout/BFS/tuning work is GONE. This is the clean baseline.
- `templates/v3-*` — none. No wedge/packing/tree prototype exists yet.
- `generator/watch-server.py` — now accepts `--template` and `--output` flags. Run with `python3 generator/watch-server.py --template templates/v2-dynamic-alt` to serve dynamic-alt.

The test marker is a synthetic top-level node labeled `🧪 DYNAMIC-ALT TEST MARKER` — remove it once the watch-server-vs-file confusion is fully behind us.

## What We Tried Today — Short List

All in `templates/v2-dynamic-alt/`; all reverted or superseded; here so the next session does NOT rerun them:

1. **Bounded bubble push** (position correction, 0.5–1px/tick cap on clicked-folder drift) — reduced drift, didn't eliminate it.
2. **Velocity-freeze on clicked folder** — killed velocity-based drift; bubble-based drift remained.
3. **Charge/linkPad/K/gentleCenter tuning** — cycled several values, each with a different failure mode.
4. **Wedge layout** (proportional angular sector allocation, ~200 LOC) — solved drift structurally but looked like a sunburst. Wisdom rejected ("we want leaves, not a pie chart").
5. **Popout** (deterministic pop to past parent's bubble) — wrong framing; parent bubble radius compounded catastrophically over depth.
6. **Walk-outward popout** (iterate until clicked bubble clears siblings) — overshoots on first expansion; felt mechanical.
7. **BFS popout for every expanded folder** on initial render — produced concentric rings instead of packing.

**Root reason none worked:** force-directed physics *mathematically* spreads at 3800-node scale because total charge × N is huge. No amount of tuning converges if the substrate assumes all-pairs repulsion. Popout is a surface patch; the substrate is the problem.

## The Key Diagnostic Wisdom Landed On

> "It feels like what it's trying to do is like get up and out of the way of everything else. It's automatically making sure that it can. Which is cool but yeah I would much rather it actually just look better as you're traversing through."

**Physics is global.** Every node affects every other node within the charge cutoff. Spatial memory + incremental growth require *local* placement. These are incompatible. The next substrate must not be force-directed at click time.

## Wisdom's Desired Aesthetic (from 17 hours of feedback)

- **Organic, bubbly, leaf-like** — rejects rigid radial / grid / sunburst
- **Packed, not spread** — top-level branches close to root, not flung to canvas corners
- **"The bubbles were working"** — referring to v2's subtree-bubble concept (a parent + its descendants form a territory)
- **Children of an expanded folder should fan around the folder** — not just be placed inside a pie slice
- **When you click to expand, the clicked folder can move a little** outward to make room — but not drift continuously and not by compounding amounts
- **Everything else stays still** — spatial memory is paramount
- **Trunks shouldn't overlap, leaves shouldn't overlap** — captured in the phototropism metaphor (see `knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md`)

## The Two Genuine Paths Forward

Each is a full substrate rewrite, 4–6 hours of focused work. Do **not** combine or stack them.

### Path A — Nested Circle Packing

**What it looks like:** every folder is a circle; its children are smaller circles packed inside it; click a child → camera zooms into it, its children become visible packed inside IT. Production-proven by FoamTree, GitHub Next's repo-visualizer, Cytoscape. Matches Wisdom's "bubbles inside bubbles" language exactly.

**Why it'd work:**
- Containment is algorithmic — a child *cannot* be outside its parent's circle. Overlap between sibling subtrees is impossible by construction.
- d3.pack (in d3-hierarchy, already vendored) implements it. ~200 LOC for incremental click-to-zoom behavior.
- Scales to 3800+ nodes trivially with DOM-culling below minRadius.
- No spread-to-stratosphere failure mode. Ever.

**Tradeoffs:**
- Interaction is "zoom into a bubble" rather than "expand a folder in place." Different UX from v2.
- Children of deep-nested folders are tiny without zoom.
- "Flat" ecosystem view (see everything at once) is lost; overview requires zooming out.

**Implementation notes for the next session:**
- Look at `vasturiano/circlepack-chart` for the zoomable pattern.
- Yesterday's think-deep (`research/think-deep/2026-04-17-layout-rethink.md`) has detailed research on d3.pack tradeoffs.
- Use d3.pack for placement, d3-zoom for camera.

### Path B — Fractal Tree (L-System)

**What it looks like:** root trunk; branches extend outward with inherited direction; at each branching point children deflect from parent's direction by a small angle; leaves at the tips. Literally looks like a tree diagram. Wisdom's phototropism framing points here — "minimize trunk, maximize leaf surface, no trunk crossings."

**Why it'd work:**
- Direction is inherited from parent, not recomputed globally. Siblings diverge naturally.
- Deterministic: same click sequence → same shape.
- Trunks can't cross because every branch grows *outward* from its parent in a direction that differs from the parent's incoming direction.
- Matches Wisdom's tree metaphor directly.

**Tradeoffs:**
- Novel — no big off-the-shelf lib. ~150 LOC custom.
- Visual balance not guaranteed for unbalanced trees (one deep branch, others shallow → long spike).
- Less dense than circle packing.

**Implementation notes for the next session:**
- Sketch in `SPEC-CLICK-TO-GROW.md` (the wedge-with-inherited-direction variant).
- Look at L-system / fractal tree code examples on Observable for the recursive pattern.
- Start with uniform branching angle, then weight by subtree size.

## Gotchas the Next Session Must Know

1. **Watch-server defaults to `v2/`.** If you want to iterate on a different template, run:
   ```
   python3 generator/watch-server.py --template templates/v2-dynamic-alt
   ```
   Otherwise you're looking at v2 while editing somewhere else. We lost ~6 hours today to this.

2. **The test marker in `v2-dynamic-alt/app.js`** (a synthetic 🧪 top-level node) is your sanity check that you're viewing the file you're editing. Keep it until you're 100% confident in the file-serving path, then remove.

3. **`_prevPositions` and `_poppedPaths`** are in-memory only, reset on page reload. They carry positions within a session but don't persist across reloads. This is fine for dev; if you ship cross-session spatial memory you'll need localStorage or file-backed storage.

4. **At ~3800 nodes, physics-based layouts mathematically spread.** Don't try to fix this with tuning. Pick a non-physics substrate.

5. **Wisdom specifically rejects:**
   - Wedge / sunburst / pie-chart layouts — "too regular"
   - Grid-inside-membrane for bag nodes — "organic > grid"
   - Accumulated drift — "things get pushed further each time I expand"
   - Any "soft pin" behavior — it looks like things slowly wander

## How to Start the Next Session

1. Read THIS file. Read `SPEC-CLICK-TO-GROW.md`. Read `research/think-deep/2026-04-18-click-to-grow-substrate.md`. Skim `knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md` (2 min).
2. Confirm with Wisdom: **Path A (circle packing) or Path B (fractal tree)?** Do not build both. Commit to one.
3. Clone `v2/` to `v3-packing/` or `v3-tree/` (fresh sandbox). Don't touch v2-dynamic-alt — let it stay as the v2-copy safety net.
4. Implement the chosen substrate fresh, from the SPEC. Do not carry over today's popout/force-tuning code — that path is closed.
5. Static render first, then make it interactive. Yesterday's synthesis explicitly called for "prototype-first discipline" — render on real data before wiring clicks.

## What Today Was Good For (Despite Everything)

- Produced `SPEC-CLICK-TO-GROW.md` — a real actionable spec
- Produced `research/think-deep/2026-04-18-click-to-grow-substrate.md` — the full think-deep synthesis
- Produced the dream-scenarios and research-algorithms agent outputs
- Diagnosed the physics-is-global problem clearly
- Surfaced the phototropism framing (captured at `ideas/2026-04-18-phototropism-layout-philosophy.md`)
- Captured Wisdom's tree metaphor explicitly enough to build from
- Made the watch-server template-configurable

None of that is wasted. It's the foundation the next session builds on.

## Chronicle Pointers

- `chronicle/2026-04-18.md` — full arc of today's work, entry by entry
- `ideas/build-queue.md` — includes drag-and-drop buttons idea + bulk-expand gesture that surfaced today
- `SPEC-CLICK-TO-GROW.md` — action spec (wedge variant), reference for Path A adaptations

---

*Written at the end of a 17-hour day. Sleep first. Fresh head tomorrow.*

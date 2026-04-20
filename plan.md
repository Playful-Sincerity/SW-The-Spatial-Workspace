# Spatial Workspace v2 — Deep Plan

**Status:** PLANNING IN PROGRESS — do not implement yet.
**Started:** 2026-04-16
**Skill:** plan-deep (Complex assessment, 2-level depth)
**Goal:** Clean rebuild of the Spatial Workspace canvas with membrane-physics layout, nodes-as-buttons, productized for sharing with Dennis Hansen.

---

## Environment Health

**Verdict: WARNINGS (proceed)**

- ✓ `plan.md` created at project root (v1 plan archived to `archive/v1/plan-v1.md`)
- ✓ Git repo, on `main`, up-to-date with origin
- ⚠ Uncommitted changes to `CLAUDE.md` and `SPEC.md` (from today's v1 iteration session — expected, will commit after v2 plan locks)
- ✓ `CLAUDE.md` is 80 lines (healthy)
- ✓ `archive/` directory ready for v1 frontend archive
- ✓ No injection patterns detected in instruction files
- ✓ No broken symlinks at top 2 levels

---

## Pre-Step Phase 1 — Silent Research Summary

**v1 codebase:**
- `templates/app.html` — 1500-line monolith, all CSS + JS + HTML inlined. Built today over 4 hours of iteration. Hit a structural ceiling: d3.tree places nodes label-blind, then we patch overlaps post-hoc. The membrane-physics rebuild is exactly the right architectural pivot.
- `generator/generate-ecosystem.py` — solid, scans filesystem and embeds markdown into a JSON blob. Keeper, with config refactor.
- `generator/watch-server.py` — solid, polls filesystem and serves with snapshot-hash-based live reload. Keeper as-is.
- `generator/screenshot.sh` — works but produces faded PNGs. Needs a fix (likely waiting for SVG render-complete).

**Reference docs:**
- `SPEC.md` — original spec, Phase 1 + 2 history. v2 supersedes Phase 2's "Interactive HTML Canvas" with the rebuild.
- `SPEC-V2.md` — earlier draft, mixed concerns (shareability + force layout + Claude pane). v2 plan narrows scope: drop Claude pane (deferred), keep force layout + shareability, add membrane physics + nodes-as-buttons + user-journey design.
- `chronicle/2026-04-16.md` — full evolution log of v1's 12 iterations.
- `~/Wisdom Personal/people/dennis-hansen.md` — first share target. Knack founder → Artifact/Holograph. Ships clean tools.

**Cannibalizable from v1:**
- All of `generator/` stays
- The watch-server's snapshot-hash live-reload mechanism (port forward to v2 unchanged)
- The settings panel pattern (sliders bound to localStorage state)
- The trackpad gesture model (two-finger pan, pinch zoom, cursor-anchored)
- The keyboard shortcuts (Esc, ⌘F, etc.)
- The branch coloring strategy — but should become config-driven
- The status-color mapping — config-driven

**Architectural shifts in v2:**
- Layout: d3.tree (deterministic, label-blind) → d3.tree-seeded d3-force with rectangle membrane collision
- Visual primitive: dot + detached text → rounded button with text inside, line connects to button edge
- File organization: monolith app.html → split template.html / app.css / app.js, generator concatenates
- Distribution: Wisdom-only (hardcoded paths) → config-driven (anyone can run on their vault)

---

## Pre-Step Phase 1.5 — Research Streams

**Decision:** Skipping formal stream launch. Substantial recent context (v1 was built today). Membrane-physics approach is well-grounded in d3-force capabilities — no exotic algorithms needed. Wisdom's design preferences stated directly. If a section needs research during planning, launch a targeted Sonnet subagent at that point.

---

## Pre-Step Phase 2 — Questions for Wisdom

**See conversation — questions are presented to Wisdom for answers before plan continues.**

---

## Phase 2 — Wisdom's Answers (Locked In)

| Question | Wisdom's Answer | Implication |
|----------|----------------|-------------|
| First load expansion | **Just the root** | Default to depth-1; user expands from a clean starting state |
| Physics behavior | **Settle once, but architect for pluggable simulations** | Layout module exposes a `Simulation` interface; settle-once is the v2 implementation; future drop-in replacements (always-alive, draggable, force-directed-from-scratch) plug in without rewrites |
| Button content | **Text + project status as ambient color (NOT icons, NOT separate dots)** | Status communicated via colored shadow / outline / subtle background tint on the button itself. No icons. Wisdom wants this to look like a real product. Design research stream launched. |
| File reader | **Right side panel** | Same as v1 — multi-tab works there; minimize-on-canvas-click keeps tabs |
| Branding | **"Spatial Workspace"** | Public name = internal name. PS branding implicit via voice + color. |
| Sequencing | **Three sequential sessions** | Session 1 Foundation → Session 2 Layout → Session 3 Polish |

**Bonus ask:** Wisdom suggested workshopping the design in Figma before building. Adopted. New phase inserted: **Design Workshop in Figma** sits between Session 1 (Foundation) and Session 2 (Layout & Visual). Mock the canvas + button anatomy + status-as-shadow + connector lines in Figma, get explicit sign-off, then build to spec.

**Design research:** Sonnet subagent dispatched to research modern app design (Linear, Vercel, Heptabase, Reflect, Raycast, Arc) for button anatomy, color palette, typography, status-as-ambient-color encoding. Output → `research/2026-04-16-design-references.md`. Will inform the Figma workshop.

---

## User Journey (per Wisdom's explicit request)

### Persona: Dennis Hansen, first-time user
Forbes 30u30, Knack founder, building Artifact / Holograph (visual programming). High taste in tools. He's seen the pitch, downloaded the package, follows the README.

### Cold open (T+0 seconds)
1. He runs `./run.sh` in the unzipped folder.
2. Terminal shows: `Spatial Workspace v2 — generating canvas for [vault label]... done. Open http://localhost:8765`
3. Browser auto-opens. He sees a clean cream background. In the center, a single rounded-rectangle button labeled with his vault's root name. Around it, 3-5 collapsed top-branch buttons, connected by thin curved lines. Subtle status-color shadows on a couple of them. Header bar with the vault name in PS purple, small live-update dot pulsing green. **No instructions. Trusts the form.**

### Discovery (T+10s — T+60s)
4. He clicks a top-level branch button. Smooth ~250ms transition: that branch expands outward, its children appearing and the rest of the layout reflowing around them via membrane physics. **No labels collide.** Lines re-route to their new positions.
5. He clicks another. Same smooth expansion, the wheel breathes.
6. He scrolls (two-finger trackpad pan). Pans cleanly. Pinches. Zooms cleanly, anchored at his cursor.

### Reading (T+60s — T+3 min)
7. He clicks a `.md` file button. Reader slides in from the right (~45% width). The file renders in clean typography. He sees a markdown link to another file, clicks it. New tab appears at the top of the reader. Original file stays in tab 1, new file in tab 2.
8. He clicks anywhere on empty canvas. Reader minimizes to a small "2 files open" pill at the top right. Canvas is full-width again. He clicks the pill. Reader restores with both tabs intact.

### Power moves (T+3 min onward)
9. ⌘F focuses the search. He types "agents". Matching nodes light up via subtle outline; non-matching dim. The tree auto-expands to reveal matches.
10. He clicks the gear in the header. Settings dropdown: font size, ring spacing, leaf spacing, click-target size, dodge strength, layout density. Sliders feel responsive. He tweaks ring spacing. Layout reflows in real time.
11. He copies a file path with the 📋 button next to the reader. Pastes it into his terminal. Works.

### Living mode (background)
12. He edits a file in his editor. Within ~5 seconds, the page auto-reloads (via watch-server snapshot polling). The file's button might change (line count display, status color if metadata moved). All open tabs survive the reload.

### Off-ramps
13. He shares the canvas URL with a teammate on his local network.
14. He commits his vault changes; canvas is purely a viewer, doesn't touch his files.

### What this journey requires from the build
- Foundation: config-driven generator, watch-server live-reload, sharable run script, **markdown link extraction in the generator (data only, no rendering yet)**
- Layout: membrane-physics simulation that prevents label collisions, node-as-button rendering, expand/collapse with smooth reflow, trackpad gestures
- Polish: right-panel reader with multi-tab + canvas-click-minimize + pill, search, settings panel, copy-path button, design-fidelity per Figma workshop spec

### What this journey explicitly defers (post-v2)
- **Backlink visualization layer.** Wisdom flagged this for "eventually." Approach: hierarchy = strong purple lines (front), backlinks = faint gray curves (back, low opacity, possibly hover-revealed only). Could get messy fast — Obsidian's solution is "nice simple background linkages." Visual locked in Figma during the workshop so v3 just builds the renderer; data is already in place from v2's generator.
- **General Claude conversation pane** (full chat, codebase Q&A, multi-turn). Big surface, deferred to v3.
- File-system writes (canvas is read-only in v2).

### Narrower Claude feature considered for v2 (Wisdom's idea, 2026-04-16)
**Agentic Design Prompt.** A small "✨ Redesign" button in the header opens a text input. User types "make the buttons more like Linear" or "warmer palette." Prompt + current design tokens are sent to Claude API; Claude returns a JSON of token changes; frontend applies via CSS custom properties. Persists to localStorage. Has revert.

This is a **narrow, contained** form of "Claude in canvas" — aesthetic only, no general chat, no code generation. Distinguished from the deferred "general conversation pane" because it has a tight data model (CSS variables in, CSS variables out) and ships fast.

**Pluggable architecture from day one:** if v2 ships without this, the design-token system already supports it (all visual properties are CSS custom properties; `applyDesignChanges(diff)` is one function away from being agentic). So we're never blocked from adding it later.

**Sequencing options for Wisdom to choose** (see end-of-plan question block):
- **A. Add to v2 Section 4 (Polish & Share)** — adds ~2-3 hours, makes Dennis demo feel magical
- **B. New Section 6 in v2, post-Verification** — keeps base v2 unblocked, ships as optional add-on
- **C. Defer to v2.1** — ship v2 clean, follow up within a week

**Implementation skeleton** (regardless of when it ships):
- UI: ✨ button next to gear → input slides down → submit
- API: direct fetch to api.anthropic.com from browser (key in localStorage, prompted on first use, never proxied)
- Prompt: system prompt enumerates CSS custom properties + bounds (e.g., font size 6-32px); model returns JSON `{ changes: {...}, explanation: "..." }`
- Apply: `Object.entries(changes).forEach(([k,v]) => document.documentElement.style.setProperty(k, v))`
- Persist: merged into `state.settings.designOverrides` in localStorage
- Revert: button to clear overrides
- Failure modes: API error → toast; bad JSON → toast; key missing → prompt to enter

---

## Step 0 — Cross-Cutting Concerns

### Core data model

**TreeNode (unchanged from v1, generator outputs same shape):**
```
TreeNode {
  id: string                  // path-based unique ID
  name: string                // display name
  path: string                // full filesystem path
  type: "directory" | "file"
  content: string | null      // markdown body (files only)
  children: TreeNode[]
  meta: {
    size?: number, lines?: number,
    phase?: string,           // status (active/building/...)
    momentum?: string,
    project_name?: string,
    next_action?: string,
    cluster?: string
  }
}
```

**CrossLink (NEW in v2 data, NOT rendered in v2 frontend — hooks for v3):**
```
CrossLink {
  source: string              // path of file that contains the link
  target: string              // resolved path of the linked file (or null if external/broken)
  label?: string              // optional link text
  context?: string            // ~80 chars of surrounding text for hover preview
}
```
Generator extracts these from markdown via a `[text](path)` regex pass during file scanning. Stored alongside the tree as `ECOSYSTEM_DATA.crossLinks: CrossLink[]`. v2 frontend reads them but doesn't render — v3 (or a later release) draws them as **subtle background linkages** (à la Obsidian) — faint gray curves drawn under the hierarchy lines, only visible on node hover or when "show backlinks" is toggled. The Figma workshop will mock this view so the visual language is locked even though the implementation lands later.

**Layout state (NEW — held in JS, drives the physics simulation):**
```
LayoutNode {
  ...TreeNode,
  x, y: number                // current cartesian position (settled)
  vx, vy: number              // velocity (used by simulation)
  fx, fy: number | null       // pinned position (for dragging — future)
  width, height: number       // measured button bounding box
  expanded: boolean           // whether children are visible
  side: "left" | "right"      // for label-anchor decisions
}
```

**Render state:**
- `state.expandedPaths: Set<string>` — which directories are open
- `state.openTabs: TabState[]` — which files are loaded in the reader
- `state.activeTabIndex: number` — current tab
- `state.searchQuery: string`
- `state.settings: Settings` — persisted to localStorage
- `state.readerMinimized: boolean`

**Config schema (NEW — config.json):**
```json
{
  "label": "My Vault",
  "roots": [
    { "name": "Notes", "path": "~/notes" },
    { "name": "Code", "path": "~/code" }
  ],
  "branchColors": {
    "Notes": "#764AE2",
    "Code": "#5A9E6F"
  },
  "statusColors": {
    "active": "#4CAF50",
    "building": "#FF9800",
    "design": "#2196F3",
    "concept": "#9E9E9E",
    "paused": "#F44336"
  },
  "statusYaml": null,         // optional path to a project-status.yaml-style file
  "exclude": [".git", "node_modules", "__pycache__"]
}
```

### Technology stack

| Layer | v1 | v2 | Rationale |
|-------|----|----|-----------|
| Generator | Python stdlib | Python stdlib + config loader | Keep stdlib-only constraint; add JSON config parsing (stdlib `json`) |
| Watch-server | Python stdlib HTTP | Same, with `--config` flag | No changes needed beyond accepting config arg |
| Frontend layout | d3.tree (deterministic) | d3-force seeded by d3.tree (membrane physics) | Settle-once with rectangle collision; pluggable Simulation interface |
| Frontend rendering | Inline SVG | Inline SVG | Same — D3-driven |
| Markdown render | marked.js v15 | marked.js v15 | Unchanged |
| File organization | One monolith app.html | template.html + app.css + app.js | Maintainability; generator concatenates into single output HTML |

### Naming conventions

- **CSS classes:** `sw-` prefix (kept from v1) — e.g., `sw-canvas`, `sw-tab`
- **JS state:** `state.X` for runtime, `SETTINGS_DEFAULTS` for constants
- **JS modules** (within app.js): `// ── Section Name ──` comment dividers
- **Python:** snake_case functions/vars, PascalCase classes
- **Files:** kebab-case for new files (`run.sh`, `config.json`, `screenshot.sh`)
- **Config keys:** camelCase JSON

### Interface contracts (between layers)

**Generator → Frontend:**
- Generator emits `ECOSYSTEM_DATA` JS constant containing the TreeNode root + a `CONFIG` constant containing the resolved config (label, branchColors, statusColors).
- Frontend reads both at init.
- Frontend never touches the filesystem; everything it knows comes from `ECOSYSTEM_DATA` + `CONFIG`.

**Watch-server → Frontend:**
- Watch-server exposes `GET /__snapshot.json` returning `{ hash, generated_at, regen_in_progress }`.
- Frontend polls every 2s; on hash change → soft reload (window.location.reload).
- Watch-server serves `GET /` → the generated HTML.

**Layout module → Render module:**
- Layout module exposes `Simulation` interface:
  ```
  Simulation.seed(nodes, links) → void
  Simulation.tick(callback) → void  // optional continuous mode
  Simulation.run(maxIterations) → Promise<settled>
  Simulation.measure(node) → { width, height }  // for membrane collision
  ```
- v2 ships one implementation: `MembraneSimulation` (settle-once with rectangle collision).
- Future implementations (always-alive, draggable, etc.) drop in by satisfying the same interface.

**Render module → DOM:**
- Render module manages a single `<svg>` inside `#canvas`.
- Receives settled positions from layout, draws node-buttons + connector lines.
- Exposes `render(state)`, `transition(fromState, toState)` — no other DOM mutation.

### Error handling

- **Generator:** Bad config → exit 1 with clear message. Missing root path → warn to stderr, skip, continue. Unreadable file → warn to stderr, include node with `content: null`.
- **Watch-server:** Snapshot endpoint returns 503 if regen in progress. HTML serve returns 503 if no canvas yet generated.
- **Frontend:** Layout/render errors caught at the top level, logged to console, optionally shown to user via toast. Markdown parse errors fall back to `<pre>`-wrapped raw text.

### Testing conventions

| Layer | Framework | Pattern |
|-------|-----------|---------|
| Generator | `python3 -m pytest tests/` | `test_<unit>_<condition>_<expected>.py`; mock filesystem via `tmp_path` fixture |
| Watch-server | pytest | Spin up server on random port, assert endpoints |
| Frontend | Headless Chrome screenshot loop + manual checklist | `screenshot.sh` produces `/tmp/sw-canvas.png`; visual verification via Read tool |
| Acceptance | Manual checklist per User Journey step | Each step from "Cold open" through "Power moves" is a numbered acceptance test |

### Performance targets

| Metric | Target | Notes |
|--------|--------|-------|
| Initial load to interactive | < 2s | For vault of 5000 nodes |
| Membrane simulation settle (initial) | < 1s | Web worker if needed |
| Settle after expand | < 300ms | Only re-simulate the affected subtree if possible |
| Pan / zoom | 60 fps | Use `transform` not re-render |
| Markdown render on click | < 200ms | Same as v1 |
| Memory ceiling | < 200MB | Load test at 5000 nodes |
| Output HTML size | < 50MB | At 5000 nodes with content; v1 is 36MB |

### Cross-cutting design tokens (RESOLVED via design research)

Full brief at `research/2026-04-16-design-references.md` (382 lines, 8 principles + reference apps). Headline tokens:

- **Typography:** Satoshi (variable, via Fontshare CDN) over Inter — Inter is too generic. Stack: `'Satoshi', 'Inter', system-ui, sans-serif`. Type scale defined per node type (root 15px/700, folder 12px/600, file 11px/500).
- **Color (warm-neutral, NOT cool gray):**
  - Canvas `#F9F0E0` (cream), Panel `#F2E8D5`, Surface `#FFFFFF`
  - Border default `#D8CDB8` (warm), hover `#B8A898`, text primary `#2A2218`
  - Brand purple `#764AE2` for root + selected only
  - Connector line `#C8BAAA` at 65% opacity
- **Status as ambient color:** **1.5px border + 12% alpha background tint, no glow, no dot.** Active = `#1A9E5A`. Building = `#D97706` (amber). Concept = `#4B7FCC` (steel blue). Paused = `#B45309` (warm red-brown, NOT traffic-light red — reads as "resting" not "broken"). Default (no status) = neutral border.
- **Border radius:** 6px leaf, 8px folder, 10px root.
- **Spacing:** 4px atom, 8px standard unit (Vercel Geist-style).
- **Hover:** `translateY(-1px)` + shadow depth increase + `#F7F2EA` warm tint. 150ms ease. **No scale, no glow.**
- **Connector lines:** d3.linkRadial() curves, 1px, 65% opacity. Center-to-center attachment (edge-attach breaks under physics).
- **Critical detail:** 1.5px status borders remain visible at 50% zoom; 1px borders disappear. Use 1.5px for status, 1px for default.
- **Selected node:** SVG-friendly approach is a second `<rect>` behind the node, NOT box-shadow (the brief noted both options — Figma workshop will pick).

---

## Step 1 — Meta-Plan

### Goal

Rebuild the Spatial Workspace canvas as a clean, productized tool. Membrane-physics layout (no overlapping labels by construction), node-as-button visual (text + ambient status color), pluggable simulation architecture, config-driven shareability, and a Figma-workshopped design that meets a real product bar. Ship to Dennis Hansen as v0 of the public tool.

### Sections

1. **Foundation** — Archive v1 frontend, refactor file structure (template.html / app.css / app.js), config loader, generator updates, run script, README, screenshot.sh fix.
   - Complexity: M
   - Risk: Low — mostly mechanical refactoring + new config layer
   - Acceptance criteria:
     - `archive/v1/` contains the v1 monolith app.html and any v1-specific docs
     - `templates/v2/` contains `template.html`, `app.css`, `app.js` as separate files
     - Generator concatenates them into a single output HTML
     - `config.json` loads correctly; `config.example.json` exists
     - Generator with `--config path/to/config.json` produces canvas for any vault
     - `./run.sh` from a fresh clone bootstraps the watch-server
     - `screenshot.sh` produces sharp (not faded) PNGs

2. **Design Workshop (Figma)** — Mock the canvas in Figma using the Figma MCP. Validate visual direction with Wisdom before any visual code is written.
   - Complexity: M
   - Risk: Medium — design taste; need to nail the aesthetic
   - Acceptance criteria:
     - Figma file with: canvas overview frame, single-button anatomy frame, button states (default/hover/active/expanded), status-as-ambient-color matrix (5 status levels × button), connector line styles, file reader panel
     - **Backlinks/cross-link layer mocked** as a separate frame — show how they'd look if turned on (faint gray curves under hierarchy lines, possibly only on hover). Even though v2 won't render them, the visual language is locked now so v3 doesn't need a redesign.
     - Each spec frame has measurements (px) and color values (hex) annotated
     - Wisdom approves explicitly before Section 3 (Layout & Visual) starts
     - Design tokens extracted to `app.css` variables (so any further tweak is one place)

3. **Layout & Visual** — Membrane-physics simulation + node-as-button rendering. The visual heart of v2.
   - Complexity: L
   - Risk: Medium — physics tuning, label width measurement, performance at 5000 nodes
   - Acceptance criteria:
     - `Simulation` interface defined; `MembraneSimulation` implementation works
     - d3.tree seeds initial positions; d3-force with rectangle collision relaxes them
     - Settles in < 1s for 5000 nodes
     - Node-buttons rendered to Figma spec (no overlapping by construction)
     - Status-as-ambient-color renders correctly for all status levels
     - Connector lines attach symmetrically to button edges
     - Expand/collapse triggers smooth re-settle (< 300ms)
     - Initial load: just the root + top branches as collapsed buttons
     - Pluggable interface verified by stub `AlwaysAliveSimulation` (just the interface, not full impl)

4. **Polish & Share** — File reader + multi-tab + search + settings + distribution.
   - Complexity: M
   - Risk: Low — most pieces port from v1 with minor adjustments
   - Acceptance criteria:
     - Right-panel reader with multi-tab strip (port from v1, refit to new visual)
     - Canvas-click-to-minimize + restore-pill (port from v1)
     - Search: ⌘F focuses, types live-filter, matches highlight
     - Settings panel: gear in header, sliders for sim/visual params, persists
     - Copy-path button in reader header
     - Markdown link navigation (port from v1)
     - Trackpad gestures (port from v1)
     - Keyboard shortcuts: Esc, ⌘F, etc. (port from v1)
     - `README.md` with: install, run, config, share instructions
     - `config.example.json` annotated for first-time users
     - `run.sh` works from a fresh clone

5. **Verification & Handoff** — Final visual screenshot test, performance check at 5000 nodes, package and ready for Dennis.
   - Complexity: S
   - Risk: Low
   - Acceptance criteria:
     - All User Journey steps (1-14) demonstrably work
     - Performance metrics hit targets
     - `./run.sh` from a fresh git clone on a fresh machine completes in < 30s and opens a working canvas
     - Optional: Wisdom shares with Dennis, captures any feedback

### Acceptance Tests (meta-level)

- **AT-1:** Fresh clone → `cp config.example.json config.json` → edit roots → `./run.sh` → browser opens with canvas of the configured vault.
- **AT-2:** Vault of 5000 nodes settles in < 1s, no overlapping labels, pan/zoom at 60fps.
- **AT-3:** Click a top branch → smooth expand → click a file → reader opens → click a markdown link → new tab opens → click empty canvas → reader minimizes → click pill → restore.
- **AT-4:** Edit a watched file → within 5s the page auto-reloads → all open tabs survive.
- **AT-5:** Headless screenshot loop produces sharp (not faded) PNGs that match what the live page shows.
- **AT-6:** Wisdom signs off on Figma workshop visual spec; built canvas matches the spec to within reasonable tolerance.

### Dependency Graph

```
SERIES
═════════════════════════════════════════════════════════════
  Section 1 (Foundation)
        │
        ▼
  Section 2 (Design Workshop in Figma)  [HUMAN GATE: Wisdom approves]
        │
        ▼
  Section 3 (Layout & Visual)
        │
        ▼
  Section 4 (Polish & Share)
        │
        ▼
  Section 5 (Verification & Handoff)
```

### Parallel vs. Series Map

| Session | Sections | Prerequisites | Estimated Scope |
|---------|----------|---------------|-----------------|
| **Session 1** | Foundation (S1) | None | Medium — ~2-3 hours |
| **Workshop** | Design Workshop (S2) | S1 + design research stream completes | ~1-2 hours of Wisdom + Claude in Figma |
| **Session 2** | Layout & Visual (S3) | S2 approved | Large — ~3-4 hours |
| **Session 3** | Polish & Share (S4) + Verification (S5) | S3 working | Medium — ~2-3 hours |

**No parallelism.** This is intentional — each phase informs the next, and Wisdom asked for sequential sessions. Multi-session decomposition was offered and rejected.

### File Structure for v2

```
Spatial Workspace/
├── README.md                          ← User-facing: install, run, config
├── CLAUDE.md                          ← Conventions for Claude (kept, light edits)
├── SPEC.md                            ← v1 spec (kept as historical record)
├── plan.md                            ← This file
├── plan-section-foundation.md         ← Detailed Foundation plan (Session 1)
├── plan-section-design.md             ← Detailed Design Workshop plan
├── plan-section-layout.md             ← Detailed Layout plan (Session 2)
├── plan-section-polish.md             ← Detailed Polish plan (Session 3)
├── plan-section-verify.md             ← Verification plan
├── config.example.json                ← NEW — annotated config example
├── run.sh                             ← NEW — bootstrap script
├── archive/
│   ├── v1/
│   │   ├── app.html                   ← v1 monolith (the rebuild source-of-truth)
│   │   ├── plan-v1.md                 ← v1 plan
│   │   └── ...                        ← any other v1 docs
│   └── (future versions archive here)
├── design/
│   └── 2026-04-16-figma-workshop.md   ← Figma frame URLs + extracted tokens
├── generator/
│   ├── generate-ecosystem.py          ← Updated for config; concatenates template/css/js
│   ├── watch-server.py                ← Updated for --config flag
│   ├── screenshot.sh                  ← Fixed for sharp captures
│   ├── config.py                      ← NEW — config loader + validator
│   └── (future generator extensions)
├── templates/
│   └── v2/
│       ├── template.html              ← HTML skeleton with placeholders
│       ├── app.css                    ← All styles (split from monolith)
│       ├── app.js                     ← All app code (split from monolith)
│       ├── d3.min.js                  ← D3 v7 library
│       └── marked.min.js              ← marked v15 library
├── research/
│   └── 2026-04-16-design-references.md  ← In-flight design research
├── chronicle/
│   └── 2026-04-16.md                  ← Today's full evolution log
├── ideas/, play/, debates/            ← Existing dirs (kept)
└── tests/
    ├── contracts/                     ← Generated at Step 3 reconciliation
    ├── test_generator.py              ← Generator unit tests
    └── test_config.py                 ← Config loader tests
```

### Overall Success Criteria

**Done means:**
1. Wisdom can hand a zip of this folder + 3 lines of instructions to Dennis Hansen, and Dennis can run it on his own vault and have a clean radial canvas of his work in under a minute.
2. The visual matches the Figma spec — labels never overlap, status reads as ambient color, the whole thing feels like a real product.
3. Wisdom can iterate on the canvas live (watch-server) on his own ecosystem without anything breaking.
4. The architecture is set up so that adding a Claude conversation pane (deferred from v2) is a clean drop-in later, not a rewrite.

---

## Step 2 — Section Plans

*To be filled when Wisdom approves this meta-plan. Each section gets a `plan-section-<name>.md` file via parallel Sonnet subagents (where independence allows) or sequentially (Foundation → Design → Layout → Polish → Verify).*

---

## Step 3 — Reconciliation

*To be filled after section plans are in.*

---

## Step 4 — Execution

*Three sessions:*
- *Session 1: Foundation. Plan + execute together.*
- *Workshop: Design in Figma with Wisdom. Approval gate.*
- *Session 2: Layout & Visual. Plan + execute.*
- *Session 3: Polish + Verification. Plan + execute.*

---

## Step 5 — Verification

*Final acceptance test pass against User Journey steps 1-14 + AT-1 through AT-6.*

## Step 2 — Section Plans
*To be filled after Step 1.*

## Step 3 — Reconciliation
*To be filled after Step 2.*

## Step 4 — Execution
*To be filled after Step 3.*

## Step 5 — Verification
*To be filled after Step 4.*

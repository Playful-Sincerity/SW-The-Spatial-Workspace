# Spatial Workspace — Current State (2026-04-23)

An honest map of what is built, what is working, what is rough, and what is intentionally deferred. Following the convention that specificity in limitations is more authoritative than their omission.

## Snapshot

Spatial Workspace is a running tool. Wisdom uses it daily. The radial canvas renders ~9,900 nodes from three configurable vault roots, updates live as files change on disk, and serves a self-contained HTML page from a stdlib-only Python server at `http://localhost:8765`.

The configurability layer is **done**: `run.sh` → `watch-server.py` → `config.py` → `generate-ecosystem.py` is a clean chain driven by `config.json`. The roots from config exclusively drive the scan; no hard-coded personal paths shadow the configured values. A second config (`config-peermesh-ruflo.json`) demonstrates the multi-config pattern in real use.

The current production canvas template is `templates/v3-bubble/` — D3 circle-packing with absolute-radius sizing, synthetic self-nodes for folders, click-to-grow expansion, modifier-click shortcuts, and a multi-tab reader with markdown navigation. The April 22 payload optimization landed lazy content loading via a `/content?path=` server endpoint, dropping initial payload from 132 MB to 8.8 MB (15× reduction).

The largest remaining work is on the editor side of the vision — making the canvas not just a viewer of files but the surface from which Claude Code sessions, file edits, and adjacent computer interactions happen. That work is scoped in `ideas/2026-04-21-spatial-editor-vision.md` and `research/think-deep/2026-04-21-spatial-editor.md`.

---

## Generator

**Status: working; configurable; tested.**

- `generator/generate-ecosystem.py` — main generator. Scans configured roots, extracts structure and YAML frontmatter, emits a single self-contained HTML file. Python stdlib only.
- `generator/generate-ecosystem-v4.py` — multifile variant supporting non-`.md` file types. Newer; used for the 9,900-node ecosystem render.
- `generator/config.py` — JSON config loader and validator. Tilde expansion, root validation, status-color merging, fallback for first-run-without-config. Stdlib only.
- `generator/watch-server.py` — HTTP server with filesystem polling, debounced regeneration, soft-reload via `/__snapshot.json` hash check, and lazy `/content?path=` endpoint with strict root validation (403 for paths outside `WATCH_ROOTS`).
- `generator/screenshot.sh` — headless Chrome capture for visual verification loops.
- `tests/test_config.py` — covers loading, validation, normalization, fallback, and CWD config detection.

The configurability work landed April 16 alongside the v2 Phase 1 Foundation extraction (monolithic `templates/app.html` → `templates/v2/app.{html,css,js}` + reusable `config.py`). `run.sh` provides Python version checking and config bootstrap.

**Known UX rough edge:** on first run with no `config.json`, `run.sh` copies `config.example.json` → `config.json`, prints a friendly note about editing roots, then continues into the server. A user editing the config and re-running gets the right behavior on the second invocation; a user expecting the server to wait for them gets an empty canvas the first time. Five-minute fix (`exit 0` after the bootstrap message), deferred pending share workflow validation.

---

## Templates

**Status: six versions present; v3-bubble is current production; v4-multifile is staged but not yet committed.**

| Template | Status | Notes |
|----------|--------|-------|
| `v2/` | Stable | Original radial layout, `d3.cluster`-derived; default fallback |
| `v2-dynamic/` | Experimental | Dynamic-expanse variant from the April 17–18 iteration |
| `v2-dynamic-alt/` | Experimental | Parallel-prototype branch from the April 18 dynamic-vs-pinned arc |
| `v3-tree/` | Superseded | L-system fractal-tree exploration; replaced by v3-bubble within hours |
| `v3-bubble/` | **Current production** | D3 circle packing, synthetic self-nodes, click-to-grow, tier controls |
| `v4-multifile/` | Active development | Multi-filetype support (non-`.md`); syntax highlighting; uncommitted as of 2026-04-23 |

Each template directory bundles its own `template.html`, `app.css`, `app.js`, `d3.min.js`, `marked.min.js`. v4-multifile additionally bundles `hljs.min.js` and a syntax theme. All bundling is concatenation at generation time — no build step, no NPM, no CDN at runtime.

The `--template` flag on both the generator and watch-server lets a user select any variant.

---

## Interactive canvas (v3-bubble)

**Status: working; daily-driver-ready; not yet share-polished.**

Currently working:
- Radial bubble-pack layout with absolute-radius sizing
- Click-to-grow expansion with synthetic self-nodes (folders reserve their own spot, don't overlap children)
- Modifier-click shortcuts (`⌘`-click expand one tier, `⇧`-click collapse one tier)
- Tier-by-tier `+`/`−` controls in the header
- Right-click context menu (expand/collapse one tier, expand/collapse fully)
- Viewport sync — bulk operations fit-to-view automatically
- Settings panel with sliders for font size, ring spacing, leaf spacing, click target, label-dodge toggle
- Multi-tab reader with markdown link navigation between tabs
- Search via `⌘F` with auto-expand of ancestor paths to matches (currently name-only after lazy-content optimization)
- Trackpad-native gestures (Figma/Miro/Excalidraw style: two-finger pan, pinch-zoom, `⌘`+scroll)
- Horizontal labels with deterministic stack-based dodge algorithm
- Live filesystem watching with auto-reload (~50–200 ms regenerate, 2-second poll)
- localStorage persistence of canvas state across page reloads
- `window.SW_READY` signal for screenshot/automation integration

Known limitations:
- Search is name-only after the lazy-content optimization. Substring search across body content needs a server-side `/search` endpoint (designed, not built).
- LOD interactivity gating uses a fixed `LOD_THRESHOLD_PX = 8` — small nodes at far zoom are non-interactive (`pointer-events: none`). Visual map preserved; hit-testing is gated.
- Position is algorithmic. Manual node repositioning with persistent layouts is in `ideas/build-queue.md`, not yet built.

---

## Performance

**Status: tractable for vaults under ~10K nodes; explicitly engineered for further scale.**

The April 22 optimization pass landed six Tier 1 perf wins (zoom-coupled sizing short-circuit, `will-change: transform`, O(1) path lookups, search highlight refactor, mouseenter coalescing, divider-resize coalescing) plus the major Optimization A: lazy content loading. Initial payload is 8.8 MB for the 9,889-node Playful Sincerity Digital Core render (was 132 MB before this work).

The watch-server's `/content?path=` endpoint enforces strict root validation — paths outside `WATCH_ROOTS` return 403. Frontend caches fetched content in a module-level Map.

LOD (level of detail) interactivity gating preserves the visual map at far zoom without paying hit-testing cost on sub-8px nodes.

**Open performance frontiers:** content-search needs a server-side endpoint; viewport-culling for very large vaults (> 20K nodes) is not yet implemented; the canvas remains single-threaded in the main browser thread.

---

## Shareability

**Status: clone-and-run for any user with Python 3.9+; one minor first-run UX rough edge.**

A new user can:

```bash
git clone <repo>
cd Spatial\ Workspace
./run.sh
# → edits config.json to point at their own vault roots
./run.sh
# → canvas renders against their vault at http://localhost:8765
```

Output goes to `~/ecosystem-canvas.html` in the running user's home directory (via `Path.home()`), so it never collides with the author's setup.

Configuration is the only personalization step. `config.example.json` ships annotated; `config-peermesh-ruflo.json` shows the multi-config pattern.

**For Dennis Hansen specifically:** the repo is essentially share-ready. The remaining friction is the first-run UX (server starts before the user has edited config, leading to an empty canvas on the first invocation). The README documents the workflow correctly; the friction is real but minor and can be addressed in a 5-minute follow-up.

**`.gitignore` status:** none at root. The 36–51 MB generated canvas lives at `~/ecosystem-canvas.html` (HOME, not the project tree), so it cannot accidentally be committed. `__pycache__/` is currently tracked but harmless. `config.json` is tracked with the author's personal vault paths — a downstream user would replace it on first run; no secret material lives in it.

---

## CoVibe

**Status: separate project, separate repo.**

CoVibe — multiplayer Claude Code coordination — has moved to its own repo at `~/Playful Sincerity/PS Software/CoVibe/` (GitHub: `Playful-Sincerity/covibe`). The `covibe/` subdirectory in this project retains the design-phase research, plans, and play outputs from when CoVibe was incubating here. It is not part of Spatial Workspace's surface area; treat it as historical archive.

CoVibe's V3 long-term plan includes integration as the collaborative-editing layer beneath the spatial canvas. That integration is not in scope for Spatial Workspace v1.

---

## Documentation

**Status: rich primary documentation; portfolio-presentation layer being filled in this session.**

What exists and is current:
- `README.md` — usage guide, configuration reference, share workflow
- `CLAUDE.md` — project conventions (note: written during Phase 1; Phase 2 conventions live in the SPECs and chronicles)
- `plan.md` — full development plan
- `SPEC.md` — original spec with Phase 1 lessons-learned (ASCII, Miro, hand-crafted SVG, generated SVG)
- `SPEC-V2.md`, `SPEC-PHYSICS.md`, `SPEC-LAYOUT-v3.md`, `SPEC-CLICK-TO-GROW.md`, `SPEC-TREE.md`, `SPEC-BUBBLE.md` — chronological iteration record
- `concept-paper/2026-04-23-spatial-workspace-concept.md` — current positioning artifact
- `chronicle/` — daily semantic log, 2026-04-16 through 2026-04-23 (April 16 is the central iteration day)
- `knowledge/sources/wisdom-speech/` — six preserved primary-source speech files

What this session adds:
- `STATUS.md` — this file
- `history/HISTORY.md` — narrative trajectory
- `archive-highlights.md` — curated verbatim moments
- `research/sources/archive-inventory.md` — provenance index
- `LICENSE` — MIT

---

## The Vision Layer (where this is headed)

Spatial Workspace's working surface is currently a viewer. The directional bet is larger: **the canvas becomes the place from which Claude Code sessions are run, files are edited, and adjacent computer interactions happen.** Not "a tool you open"; the surface you interact with your computer through, anchored by your Digital Core.

Concretely, the next horizon includes:

- **Spatial editor** — embedded file editing within the canvas (`ideas/2026-04-21-spatial-editor-vision.md`)
- **Claude Code panes** — sessions as first-class spatial elements, with the full PSDC methodology layer (hooks, rules, skills, MEMORY.md) preserved (`research/think-deep/2026-04-21-spatial-editor.md`)
- **Beyond `.md`** — multi-filetype support is live in `v4-multifile`; the canvas already renders code, configs, and adjacent file types
- **Adjacent surfaces** — Miro, Figma, Artifact, n8n, browser tabs, and other computer surfaces as nodes within the same spatial canvas, per the April 22 articulation: "this is just literally like your computer interface"

This vision is documented in chronicles and `ideas/`; it does not yet live in the README. It is the through-line that connects today's working radial viewer to tomorrow's spatial computer interface.

---

## Verification

This file is current as of **2026-04-23**. State derived from:

- Direct code audit of `generator/` and `run.sh`
- `tests/test_config.py` results
- Chronicle entries `chronicle/2026-04-16.md` through `chronicle/2026-04-23.md`
- The seven SPEC documents
- `concept-paper/2026-04-23-spatial-workspace-concept.md`
- `knowledge/sources/wisdom-speech/` (six preserved speech files)
- Live filesystem inspection of templates, configs, and outputs

Significant state changes — new templates promoted to production, configurability layer changes, performance regressions resolved — should update this file in the same commit as the underlying change.

# Spatial Workspace — v2 Spec

**Status:** Draft for Wisdom's approval. Do not implement until approved.
**Drafted:** 2026-04-16, after a 4-hour live iteration session producing v1.
**Predecessor:** `SPEC.md` (the v1 phases). v2 is the continuation.

## Goal

Take Spatial Workspace v1 — currently a personal radial canvas of Wisdom's ecosystem with a multi-tab file reader and live updates — and graduate it into a **shareable tool that can be handed to Dennis Hansen (and others) without modification**. Along the way, fix the structural limitations of d3.tree on asymmetric data, formalize the visual-verification loop Claude uses to iterate on UX, and add a Claude conversation pane so the canvas becomes interactive thinking surface, not just a viewer.

## Why now

Wisdom called v1 "Spatial Workspace v1, fucking badass" and identified Dennis Hansen as the first share target — a Forbes 30u30 founder building Artifact / Holograph (visual programming on tldraw with propagator networks). Dennis's work has direct conceptual overlap; his profile literally lists Spatial Workspace as the obvious touchpoint. Sharing the tool with him is a forcing function for productization.

## Requirements (numbered — must-haves for v2)

### Shareability (R1–R4)
1. **Generator config** — a `config.json` (or CLI flags) lets a user point the generator at their own roots, set the root label, and supply optional metadata (project status, link colors per branch). No code edit required.
2. **README + run script** — `./run.sh` (or `python -m spatial_workspace`) picks up the config, regenerates, starts the watch-server, opens the browser. One command for new users.
3. **Sample config** — ship a `config.example.json` showing how to point at an Obsidian vault, a code repo, or a generic folder.
4. **No personal paths in the generated HTML** — root label and embedded paths come from config, not hard-coded.

### Layout fidelity (R5–R7)
5. **Hybrid force-on-tree layout** — keep d3.tree's deterministic seed positions so structure is preserved, then run d3-force on top with three forces: node repulsion (subtrees breathe), link attraction (parent-child distance honest), gentle radial constraint (rings-as-depth pattern intact). Settles when stable.
6. **Force settings exposed** — repulsion strength, link strength, radial constraint strength all live in the settings panel as sliders. Wisdom's key insight: "as you become less symmetrical the system needs to dynamically react."
7. **Force can be turned OFF** — pure d3.tree fallback for users who want strict structure.

### Visual verification loop (R8–R10)
8. **Headless screenshot tool** at `generator/screenshot.sh` works reliably — produces a sharp PNG (not the faded one we got tonight). Likely fix: wait for SVG to fully render before capture, possibly via a rendered-flag the page exposes.
9. **Diff workflow** — Claude can call `screenshot.sh`, read the PNG, compare to a previous one, propose a fix, regenerate, verify. Pattern established; needs to become reliable.
10. **Optional: state-reproducible URLs** — `?expand=path1,path2&zoom=1.5&tab=path` query string sets up a specific view, so Claude can screenshot a known state. Otherwise screenshots show whatever the last interactive state was.

### Talk-to-Claude pane (R11–R13)
11. **Claude conversation panel** — togglable side panel in the canvas. Opens an Anthropic API session. The canvas's selected file + open tabs are passed in as context automatically.
12. **Quick-actions on nodes** — right-click (or long-press) a node → "Ask Claude about this file." Spawns a chat with that file in context.
13. **Claude can navigate the canvas** — Claude's responses can include `[link](path)` to other files, and clicking opens them in the canvas (already works for markdown content; extend to chat output).

### Tab system polish (R14–R15)
14. **Verify multi-tab works in the live page** — the JS rewrite landed but wasn't fully exercised in the screenshot loop. Hand-test: open three files, switch between them, close one, minimize, restore.
15. **Tab persistence** — open tabs survive page reload (localStorage). Useful for the live-update flow where the page auto-reloads on file changes.

## Constraints

- **Python stdlib only** for the generator, watch-server, and any new server endpoint. No pip installs.
- **Single self-contained HTML** for the canvas itself. D3 + marked stay inlined.
- **The Claude pane is the only feature that may require an external API call** — and that call goes from the user's browser directly to api.anthropic.com using their own key. No backend proxy.
- **Sharable means truly sharable** — the generated HTML must not embed Wisdom's private paths or content unless the user explicitly points at his folders.
- **Backwards compat** — existing users (i.e., Wisdom's running canvas) keep working with no migration. Default config = scan `~/Playful Sincerity`, `~/claude-system`, `~/Wisdom Personal`.

## Architecture

### File-level changes

| File | Change |
|------|--------|
| `generator/config.py` | NEW — load + validate config from JSON file or CLI args |
| `generator/generate-ecosystem.py` | Read roots from config instead of hard-coded constants |
| `generator/watch-server.py` | Accept `--config path`, pass to generator |
| `generator/screenshot.sh` | Wait for `window.SW_READY` flag before capture |
| `templates/app.html` | Add force-layout option, Claude pane, tab persistence, `SW_READY` flag |
| `config.example.json` | NEW — annotated example |
| `run.sh` | NEW — one-command bootstrap |
| `README.md` | NEW or expanded — install + run + share instructions |

### Force-layout integration sketch

```js
// After d3.tree() places initial positions:
const sim = d3.forceSimulation(root.descendants())
  .force("charge", d3.forceManyBody().strength(s.repulsion))
  .force("link", d3.forceLink(root.links()).strength(s.linkStrength))
  .force("radial", d3.forceRadial(d => d.depth * s.ringSpacing, 0, 0).strength(s.radialStrength))
  .force("collide", d3.forceCollide(s.hitRadius + 4))
  .alpha(1).alphaDecay(0.05);

sim.on("tick", () => {
  // Update node positions; links follow
  updateNodeAndLinkPositions();
});
sim.on("end", () => dodgeLabels(root));
```

### Claude pane integration sketch

- Side panel slides in from the right edge of the canvas (NOT inside the file reader — separate column).
- Uses `@anthropic-ai/sdk` from CDN-inlined or fetch directly to api.anthropic.com.
- API key stored in localStorage (entered once, never sent to any server but Anthropic).
- System prompt includes: "You are inside Spatial Workspace, a radial canvas of [user's vault label]. The user's currently open files are: [list]. The currently selected file is: [content]."
- Messages render as markdown with `wireMarkdownLinks()` so Claude can navigate the canvas.

## Verification

For each requirement, a specific test:

| # | Test |
|---|------|
| R1 | Edit `config.json` to change root label, regenerate, confirm the new label appears at center |
| R2 | Fresh checkout → `./run.sh` → browser opens with canvas of configured roots |
| R3 | `cp config.example.json config.json && ./run.sh` works for a non-Wisdom user |
| R4 | grep the generated HTML for `Wisdomhappy` — should be 0 results when config points elsewhere |
| R5 | Open a tree where one branch has 80% of leaves, confirm the heavy branch doesn't crush the others |
| R6 | Move repulsion slider — see live change in node spread |
| R7 | Toggle force OFF — layout snaps back to deterministic d3.tree positions |
| R8 | `./screenshot.sh` produces a PNG that matches what's visible in the browser (no fading) |
| R9 | Claude can: screenshot → identify a specific overlap → make a CSS change → re-screenshot → confirm fix |
| R11 | Open Claude pane, ask "what's in this file?" with one file open — Claude answers using the embedded content |
| R12 | Right-click a node → "Ask Claude" → chat opens with that file in context |
| R14 | Open `a.md`, `b.md`, `c.md`. Click a → it loads. × on b → b removed. Minimize → pill shows "2 files open." Click pill → restored, c is active |
| R15 | Open 3 tabs, edit a watched file → page reloads → all 3 tabs still open |

## Non-goals (not in v2)

- VS Code extension or wrapper
- File-to-file link visualization as edges in the radial graph (would change the graph topology)
- Mobile / touch optimization beyond what current trackpad gestures already give
- Server-side persistence of any kind
- Multi-user collaboration

## Open Questions

1. **How configurable is the visual style?** Just brand colors via config, or a theming system?
2. **Where does the Claude pane sit?** Right edge (next to the reader) or floating? Does it push the canvas like the reader does?
3. **API key storage** — is localStorage acceptable, or does Wisdom want to pipe through a `.env` file the watch-server reads? (Affects single-HTML-file constraint.)
4. **Force layout: animate the simulation continuously or settle once?** Continuous is more "alive" but heavier; settle is more predictable.
5. **Sequencing** — which order to ship?
   - **Option A (share-first):** R1–R4 → R8 → R5–R7 → R11–R13. Get Dennis using it ASAP, refine after.
   - **Option B (polish-first):** R5–R7 → R14–R15 → R8 → R1–R4 → R11–R13. Don't share until force layout settles.
   - **Option C (parallel):** Decompose into independent session briefs (shareability, force layout, Claude pane) — run in parallel via the multi-session pattern.

## Multi-session decomposition (if Option C)

Three streams, mostly independent:

1. **Stream A — Shareability** (touches `generator/`, `config.py`, `README.md`, `run.sh`). Self-contained Python work. ~2 hours.
2. **Stream B — Force layout + verification** (touches `templates/app.html`, `generator/screenshot.sh`). Self-contained JS + bash. ~3 hours.
3. **Stream C — Claude pane** (touches `templates/app.html`, possibly tiny endpoint). Self-contained JS + API integration. ~3 hours.

Conflict surface: A and B/C both modify the generator template substitution flow. Order: A first (sets the data shape), then B and C in parallel.

---

**Awaiting Wisdom's input on:**
1. Approve the requirements as-is, or remove/add any?
2. Pick a sequencing option (A / B / C).
3. Answers to the 5 Open Questions.

Once approved, this becomes the working contract for the next session(s).

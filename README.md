# Spatial Workspace

**A spatial interface for your whole computer, anchored in your Digital Core.**

Most software wants to be the place you keep things. Spatial Workspace is the opposite: it lives outside your projects and renders them — and eventually the conversations you have, the tools you use, the parts of the internet you work with — as a single radial canvas you can see, navigate, and operate from.

Today, it's a daily-driver viewer of any markdown vault. Point it at a set of folders and you get a radial canvas you can pan, zoom, search, and read from, with live updates as you edit files. That's the working surface. The directional bet is bigger: the canvas becomes the place from which Claude Code sessions are run, files are edited, and adjacent computer interactions happen. Sessions and conversations as first-class spatial elements. The browser, Figma, Miro, Artifact, n8n — adjacent tools as nodes on the same canvas. Eventually the internet, anchored in spatial relationship rather than tab order.

Spatial Workspace v1 is the canvas. v2 is the editor. v3 is the interface.

![screenshot placeholder — run `./run.sh` and `generator/screenshot.sh` to produce one]

## Why spatial

Trees encourage tree-thinking. Flat lists encourage priority-thinking. Force-directed graphs encourage chaos. Spatial layouts encourage **shape-thinking** — perception of the overall form of a body of work, not just its individual pieces. When you can see the whole shape of what you're doing, and when that shape updates as you work, you move differently through the work itself.

Reading prompts is walking the streets. The diagram is seeing the city from above. Both are useful. This is the second one — and a bet that the second one belongs as the primary surface, not just a navigation aid alongside the first.

## What you get today

- **A canvas of your vault.** Folders as bubbles, markdown files as leaves. Click a file to read it in a right-hand panel, click a markdown link inside to open a new tab, click empty canvas to minimize the reader.
- **Live updates.** While `./run.sh` is running, edits you make in your editor show up on the canvas within a few seconds.
- **Trackpad-native.** Two-finger scroll to pan, pinch to zoom (anchored at your cursor), search with `⌘F`.
- **Config-driven.** One `config.json`, any vault, any time.
- **No dependencies.** Python stdlib and two vendored JS libraries. No pip install, no npm, no network at runtime.

## Requirements

- Python 3.9 or newer
- A modern browser (for the canvas page)
- macOS or Linux (Windows works through WSL; not formally tested)

## Run it

```bash
./run.sh
```

First run creates `config.json` from `config.example.json`. Edit the `roots` array to point at the folders you want mapped, then re-run. The server starts at `http://localhost:8765` and opens your browser.

```bash
# On a different port
./run.sh --port 9000

# Without opening a browser (useful on a remote box)
./run.sh --no-open

# Use an alternate config (scope the canvas to a subset of projects)
./run.sh --config config-peermesh-ruflo.json
```

Stop the server with `Ctrl-C`.

## Configure it

`config.json` accepts the fields below. See `config.example.json` for an annotated version.

```json
{
  "label": "My Vault",
  "roots": [
    { "name": "Notes",    "path": "~/Documents/notes" },
    { "name": "Projects", "path": "~/projects" }
  ],
  "branchColors": { "Notes": "#764AE2", "Projects": "#5A9E6F" },
  "statusColors": {
    "active": "#1A9E5A", "building": "#D97706",
    "design": "#4B7FCC", "concept": "#9E9E9E", "paused": "#B45309"
  },
  "statusYaml": null,
  "exclude": [".git", "node_modules", "__pycache__"]
}
```

- `label` — the root node label and the page title.
- `roots` — one entry per top-level branch of the canvas. Supports `~`.
- `branchColors` — tints per branch (optional; defaults to a neutral warm tone).
- `statusColors` — colors for the "ambient status" border/tint on project nodes that carry phase metadata. All keys optional; missing keys fall back to a built-in palette.
- `statusYaml` — optional path to a flat YAML listing projects with `path` and `phase` fields. Set to `null` if you don't have one.
- `exclude` — directory names (not paths) to skip anywhere in the tree. Dotfiles and `.DS_Store` are always skipped.

Missing paths don't break the canvas — they're warned and skipped. Change any field, save, and the watch-server regenerates on the next tick.

## Share it

```bash
# From this folder, zip the project (exclude your customizations)
zip -r spatial-workspace.zip . \
  -x 'config.json' -x '.git/*' -x 'archive/*' -x '*.DS_Store'
```

Send the zip. The recipient unzips, edits `config.json`, and runs `./run.sh`. That's it.

## Screenshots for verification

`generator/screenshot.sh` captures the live canvas to `/tmp/sw-canvas.png`. Handy when you want to share a visual or when automating a "does the canvas still render" check.

```bash
./run.sh &           # start the server
bash generator/screenshot.sh
```

The canvas signals when it's ready for capture via `window.SW_READY`, so the PNG is sharp rather than half-drawn.

## What's under the hood

- `generator/generate-ecosystem.py` — scans the configured roots, reads markdown content into memory, extracts cross-links, and assembles a single self-contained HTML file.
- `generator/generate-ecosystem-v4.py` — multifile variant with non-`.md` filetype support and syntax highlighting.
- `generator/watch-server.py` — serves the HTML, polls the filesystem for changes, re-runs the generator on change, lets the open page auto-reload, and serves file content lazily via `/content?path=` with strict root validation.
- `generator/config.py` — JSON config loader and validator (pure stdlib).
- `templates/v3-bubble/` — current production template (D3 circle packing with absolute-radius sizing). Other variants (`v2/`, `v3-tree/`, `v4-multifile/`) live alongside for comparison or specialized use.
- `tests/test_config.py` — stdlib-only tests for the config layer.

The output is a single self-contained HTML file at `~/ecosystem-canvas.html` (in the running user's HOME, not the author's). With lazy content loading enabled (default), initial payload is around 8.8 MB for a ~10,000-node vault.

## Tests

```bash
python3 -m unittest tests.test_config
```

## Where this is going

The current canvas is read-only — your viewer of a body of work. The next horizon is **operability**: editing files inside the canvas, running Claude Code sessions as first-class spatial elements (with the full Playful Sincerity Digital Core methodology layer preserved — hooks, rules, skills, MEMORY.md, the full set of slash commands), and bringing adjacent computer surfaces into the same spatial frame. After that, the same approach extends outward to web — different conversations, different tabs, different tools, all held in spatial relationship rather than buried in tab bars and browser history.

The thesis: when you operate your computer from a spatial canvas anchored in your Digital Core, the work changes. You hold more in view. You move between contexts by location rather than by recall. The shape of what you're doing becomes the interface to it.

For the per-component current state, see [`STATUS.md`](STATUS.md). For the development arc that produced this version, see [`history/HISTORY.md`](history/HISTORY.md). For the most current positioning, see [`concept-paper/2026-04-23-spatial-workspace-concept.md`](concept-paper/2026-04-23-spatial-workspace-concept.md).

## Project context

Spatial Workspace is part of [Playful Sincerity](https://playfulsincerity.com) — a multidisciplinary research and software ecosystem grounded in the union of warmth and rigor. It's the first publicly shareable instance of the Playful Sincerity Digital Core's Universal Interface thesis: that filesystem plus AI agents plus visible spatial structure is what a general cognitive interface looks like.

CoVibe — multiplayer Claude Code coordination — is a sibling project, with its own repo at `~/Playful Sincerity/PS Software/CoVibe/` ([GitHub: Playful-Sincerity/covibe](https://github.com/Playful-Sincerity/covibe)). Its long-horizon plan includes integrating as the collaborative-editing layer beneath the spatial canvas.

The `covibe/` directory in this project is design-phase historical archive from when CoVibe incubated alongside Spatial Workspace; the canonical source of truth lives in CoVibe's own repo.

---

Built with Claude Code. Made with care in San Francisco.

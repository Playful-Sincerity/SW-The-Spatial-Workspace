# Spatial Workspace

A living map of your markdown vault. Point it at a folder — your notes, your code repo, your Obsidian vault — and you get a radial canvas you can pan, zoom, search, and read from. Edit a file and the canvas updates itself.

This is v2. It reads any configured set of roots, so you can share it with a teammate and they can run it on their own vault.

![screenshot placeholder — run `./run.sh` and `generator/screenshot.sh` to produce one]

## What you get

- **A canvas of your vault.** Folders are nodes, markdown files are leaves. Click a file to read it in a right-hand panel, click a markdown link inside to open a new tab, click empty canvas to minimize the reader.
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
- `statusYaml` — optional path to a flat YAML listing projects with `path` and `phase` fields (see `~/claude-system/docs/project-status.yaml` in Wisdom's setup for the shape). Set to `null` if you don't have one.
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
- `generator/watch-server.py` — serves the HTML, polls the filesystem for `.md` changes, re-runs the generator on change, and lets the open page auto-reload.
- `generator/config.py` — JSON config loader + validator (pure stdlib).
- `templates/v2/` — the HTML skeleton, CSS, JS, and vendored D3 + marked libraries. The generator concatenates these on each build.
- `tests/test_config.py` — stdlib-only tests for the config layer. Run with `python3 -m unittest tests.test_config`.

## Tests

```bash
python3 -m unittest tests.test_config
```

## Project context

Spatial Workspace is part of [Playful Sincerity](https://playfulsincerity.com) — a home for warm, experimental, rigorous work. The idea behind this tool is that spatial interfaces are often clearer than linear ones. Reading your files one by one is walking the streets. Seeing them all on a canvas is seeing the city from above. Both are useful. This is the second one.

---

Built with Claude Code. Made with care in San Francisco.

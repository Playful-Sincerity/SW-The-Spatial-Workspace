# Spatial Workspace v1 — Archive

This folder holds the v1 frontend, preserved as a historical reference while v2 is rebuilt cleanly.

## What v1 was

A single 1800-line `app.html` monolith combining HTML, CSS, and JavaScript. Rendered the ecosystem with `d3.tree` and a post-hoc label-dodge pass. Shipped the core user journey — click, read, search, settings, multi-tab reader, watch-server live-reload — inside one file.

## Why v2 exists

v1 hit a structural ceiling on dense asymmetric trees: `d3.tree` places nodes label-blind, then the layout patches overlaps reactively. On wide branches the patching fails and labels collide. v2 rebuilds the layout around rectangle-aware membrane physics (`d3-force` seeded by `d3.tree`) so labels never overlap by construction, and splits the monolith into `templates/v2/{template.html, app.css, app.js}` for maintainability.

## What changed in v2

- Layout: `d3.tree` → `d3.tree`-seeded `d3-force` with rectangle membrane collision
- Visual primitive: dot + detached text → rounded button with text inside
- File organization: monolith → split template/css/js, generator concatenates
- Distribution: hardcoded paths → `config.json`-driven, anyone can run on their vault
- Packaging: dev-only → shareable `./run.sh` + `README.md` + `config.example.json`

## Files

- `app.html` — the v1 monolith (what got split)
- `plan-v1.md` — the original v1 planning doc

Both are kept read-only. Nothing in the live build path references this folder.

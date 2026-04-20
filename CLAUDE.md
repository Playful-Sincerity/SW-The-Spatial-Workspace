# Spatial Workspace

## Overview

A system for creating living 2D visual representations of complex systems (agent architectures, project ecosystems, workflows) that stay in sync with the underlying code and files.
Born from the PS outreach agents project, where we built a generator that reads YAML frontmatter from agent prompt files and produces an SVG architecture diagram and markdown registry.

**Philosophy**: Spatial interfaces replace linear ones.
Reading prompts is walking the streets.
The diagram is seeing the city from above.
Both perspectives are needed.

## Project Status

- **Phase 1** (Living SVG): DONE — frontmatter + generator + SVG + registry
- **Phase 2** (Interactive HTML Canvas): IN PROGRESS — ecosystem canvas live with markmap + radial layouts and watch-server auto-reload (2026-04-16)
- **Phase 3** (Spatial Workspace): LONG-TERM

## Quick Start

```bash
# Static snapshot (regenerate + open)
python3 generator/generate-ecosystem.py
open ~/ecosystem-canvas.html

# Live mode — serves canvas, auto-regenerates on filesystem changes
python3 generator/watch-server.py
# → http://localhost:8765 (browser opens automatically)
```

In the canvas: toggle Markmap/Radial in the header (or press `r`). Search with `⌘F`. Click any `.md` file to read it. Esc closes the reader.

## Key Files

| File | Purpose |
|------|---------|
| `SPEC.md` | Full project specification with requirements, architecture, lessons learned, phases, open questions |
| `CLAUDE.md` | This file — project conventions |

### Phase 1 Files (in PS outreach-agents project)

Phase 1 was built inside the PS outreach agents project as a proof of concept:
- `~/Playful Sincerity/PS Media/playful-sincerity-agents/outreach-agents/agents/*/prompt.md` — Agent prompts with YAML frontmatter (source of truth)
- `~/Playful Sincerity/PS Media/playful-sincerity-agents/outreach-agents/scripts/generate-architecture.py` — Generator script
- `~/Playful Sincerity/PS Media/playful-sincerity-agents/outreach-agents/outputs/demo/agent-architecture.svg` — Generated SVG
- `~/Playful Sincerity/PS Media/playful-sincerity-agents/outreach-agents/docs/agent-registry.md` — Generated registry

## Working Conventions

- **Frontmatter is the source of truth.** Never edit the SVG or registry directly. Change frontmatter, re-run the generator.
- **Python stdlib only** for all generator scripts. No pip installs.
- **Single HTML file** for interactive output. No bundlers, no CDN links, no npm.
- **Test by running**: After any change to the generator or frontmatter, run the generator and verify the output.

## How to Regenerate (Phase 1 — PS Outreach Agents)

```bash
cd ~/Playful\ Sincerity/PS\ Media/playful-sincerity-agents
python3 outreach-agents/scripts/generate-architecture.py
```

## Subprojects

### CoVibe (`covibe/`)
Multiplayer Claude Code — a collaborative web interface for shared AI sessions. Multiple people see the same conversation, file tree, and can prompt/steer together. Built on the Agent SDK. Eventually integrates into Spatial Workspace as the collaborative editing layer beneath the 2D spatial canvas.

See `covibe/CLAUDE.md` for full project details.

## Cross-References

- **PS Outreach Agents** (`~/Playful Sincerity/PS Media/playful-sincerity-agents/`): First consumer of the spatial workspace pattern.
- **RenMap** (`~/Playful Sincerity/PS Software/RenMap/`): Shares the spatial-interface philosophy. Both are about replacing linear/algorithmic interfaces with browsable 2D canvases.
- **Shared Core** (`~/Playful Sincerity/PS Software/Shared Core/`): Shared rules/skills/knowledge that CoVibe sessions load. Research on sync primitives, collaboration architectures, and product landscape lives there.
- **SPEC.md**: Contains full lessons learned from previous visualization approaches (ASCII, Miro, hand-crafted SVG, generated SVG).

## Gotchas

- The generator's layout positions are currently hardcoded per tier. Adding a new tier requires editing the generator's layout logic.
- Frontmatter parsing is a custom regex-based YAML parser (not a full YAML library) to avoid external dependencies. It handles the current schema but may need extending for more complex structures.
- The SVG visual language (dark background, tier colors, card shadows) is specific to the outreach agents. Phase 2/3 should make this configurable.

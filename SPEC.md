# Spatial Workspace

## Goal

A system for creating living 2D visual representations of complex systems — agent architectures, project ecosystems, workflows — that stay in sync with the underlying code and files.
Spatial Workspace serves as both a thinking tool (see the whole system at once, notice gaps and bottlenecks) and an interactive workspace (click into components, rearrange layouts, design new pieces spatially).
The deeper philosophy: spatial interfaces replace linear and algorithmic ones.
Agents need spatial context to relate to each other effectively.
The 2D workspace IS a nucleus for the agent system — and eventually, a reusable template for any complex system.

## Requirements

1. **Derivable from source**: All diagrams must be generated from structured metadata embedded in the files they represent (YAML frontmatter in prompt files, etc.) — never hand-maintained.
2. **Single-command generation**: Running one script produces the full visual output (SVG, HTML, or both) from current metadata state.
3. **No external dependencies**: Python stdlib only for generation. HTML output must be a single file with inline CSS/JS, openable in any browser.
4. **Status awareness**: Visual indicators for freshness (recently run = green, stale = amber, never run = red), connection health, and component state.
5. **Connection visibility**: Data flows between components must be visible as labeled, directed connections showing what data moves and when.
6. **Shared memory layer**: Shared resources (docs, configs) that multiple components read from must be visually represented as a distinct layer.
7. **Learning loops**: Feedback connections (where outputs flow back to update shared resources) must be visually distinguished from forward connections.
8. **Companion registry**: A machine-readable and human-readable text companion (markdown) generated alongside the visual output, providing quick-reference system state.
9. **Extensible to other systems**: The generator pattern must be reusable beyond the PS outreach agents — any system with structured metadata should be visualizable.

## Constraints

- **Python stdlib only** for the generator script — no pip installs, no virtualenv.
- **Single HTML file** for interactive output — no bundlers, no npm, no CDN links. Everything inline.
- **Frontmatter is the single source of truth** — the visual output is always a derived artifact. Never edit the SVG/HTML directly.
- **Additive, not replacing** — the spatial layer supplements reading individual files, it does not replace it. Prompt files remain the deep source of truth.
- **Must work offline** — no network requests in the generated output.
- **Preserve existing agent architecture** — the outreach agents system (`outreach-agents/`) is the first consumer, not a test subject. Changes to agent prompt frontmatter schema must be backward-compatible.

## Architecture

### Current File Structure (Phase 1 — complete)

```
outreach-agents/
├── agents/*/prompt.md          # 7 agent prompts with YAML frontmatter
├── scripts/
│   └── generate-architecture.py  # Reads frontmatter, produces SVG + registry
├── outputs/demo/
│   └── agent-architecture.svg    # Generated living diagram
└── docs/
    ├── agent-architecture.md     # Original ASCII diagram (historical)
    └── agent-registry.md         # Generated companion registry
```

### Future File Structure (Phase 2+)

```
spatial-workspace/
├── SPEC.md                     # This file
├── CLAUDE.md                   # Project conventions
├── generator/
│   ├── svg_generator.py        # Extracted/generalized SVG generation
│   ├── html_generator.py       # Phase 2: interactive HTML generation
│   └── registry_generator.py   # Markdown registry generation
├── templates/                  # Reusable layout templates
│   ├── agent-system.py         # Template for multi-agent architectures
│   └── project-ecosystem.py    # Template for project overviews
└── examples/
    └── ps-outreach/            # The original use case, serving as reference
```

### How It Fits Into the Broader Ecosystem

- **PS Outreach Agents** (`outreach-agents/`): First and current consumer. The generator reads agent prompt frontmatter and produces the living SVG.
- **RenMap** (`~/Playful Sincerity/RenMap/`): Shares the spatial-interface philosophy. Both projects are about replacing linear representations with browsable 2D canvases. RenMap does it for people and communities; Spatial Workspace does it for systems and components.
- **PS Umbrella** (`~/Playful Sincerity/`): Could eventually get a project-ecosystem view — all subprojects as nodes on a canvas with their interconnections visible.

### Frontmatter Schema (Current)

Each agent prompt file (`agents/*/prompt.md`) includes a YAML frontmatter block:

```yaml
---
id: "6"
name: Landscape Research
status: built-and-run          # built-and-run | in-progress | not-built
tier: research                 # research | content | learning | community
last_run: 2026-03-22
run_frequency: monthly

reads_from:
  - docs/brand-voice.md
  - docs/icp-definition.md

outputs:
  - path: outputs/landscape-research/{date}-landscape.md
    label: Landscape report

feeds_into:
  - target: agent-2
    label: Competitive gaps
  - target: docs/content-pillars.md
    label: Trend signals
---
```

## What We've Tried (Lessons Learned)

### 1. ASCII Diagram in agent-architecture.md

**What**: Hand-drawn box-and-arrow diagram using Unicode characters in a markdown code block.
Shows the 7-agent system layout with data flows.

**What worked**:
- Immediately readable in any text editor or terminal.
- Good conceptual overview — tier layout (research -> content -> learning) makes the pipeline legible.
- Lives inside the docs it describes, so it's always nearby.

**What didn't work**:
- Completely manual — every change to agents requires hand-editing the ASCII art.
- Fragile formatting — one misaligned character breaks the visual.
- Cannot represent metadata (status, last run, freshness) without cluttering the layout.
- No machine-readability — Claude cannot parse it to reason about connections programmatically.

**Lesson**: Text diagrams are useful as initial sketches but do not scale as living documentation.

### 2. Miro Board via MCP Integration

**What**: Attempted to use Miro's MCP tools (`mcp__miro__*`) to create and maintain architecture diagrams on Miro boards.
The idea was to have Claude directly write visual nodes and connections to a collaborative whiteboard.

**What worked**:
- Miro's spatial canvas is conceptually the right model — infinite 2D space, drag-and-drop, zoom levels.
- Good for human collaboration if multiple people need to co-edit.

**What didn't work**:
- **Permissions barrier**: Subagents (which should handle the generation work to keep context clean) could not write to Miro boards. Only the main conversation context had MCP access.
- **Manual coordination overhead**: Even when it worked, updating the Miro board required explicit orchestration — it was not derivable from source files.
- **External dependency**: Miro is a third-party SaaS tool. The board exists outside the project, is not version-controlled, does not auto-update when files change, and cannot be generated from metadata.
- **Not offline**: Requires internet and an active Miro subscription.

**Lesson**: External tools add friction and fragility. The visualization needs to live inside the project, be derivable from source, and be version-controllable. "Generated from metadata" beats "manually maintained on a remote canvas" every time.

### 3. Hand-Crafted SVG for Demo

**What**: A polished, high-quality SVG (`outputs/demo/agent-architecture.svg`) created manually as a visual demo for the Monday interview presentation.
Dark background with gradient, color-coded tiers, card-style agent nodes, arrow connections, output labels, status indicators, learning loop visualization.

**What worked**:
- Beautiful output — the visual design language (dark bg, tier colors, card shadows, dashed output boxes, animated learning loop indicator) became the reference aesthetic.
- Validated that SVG is the right format for this use case — vector, scalable, viewable anywhere, embeddable, version-controllable.
- Proved the value of spatial representation — seeing all 7 agents at once with connections was immediately clarifying.

**What didn't work**:
- Completely manual — adding a new agent or changing a connection means editing raw SVG XML.
- Will drift from reality as agents evolve — no mechanism to stay in sync.
- Cannot represent dynamic state (freshness, last run dates) without manual updates.

**Lesson**: The visual design is right but the production method is wrong. The SVG needs to be generated, not authored.

### 4. Generated SVG from Frontmatter (Current Approach — Phase 1)

**What**: Added YAML frontmatter to all 7 agent prompt files declaring their connections, inputs, outputs, and status.
Built `scripts/generate-architecture.py` (Python stdlib only) that reads all frontmatter and produces both the SVG diagram and a markdown agent registry.
The SVG replicates the hand-crafted demo's visual language but is now fully derived from metadata.

**What worked**:
- **Single source of truth**: Change an agent's connections in its frontmatter, re-run the script, and the diagram updates.
- **Machine-readable metadata**: Claude can parse frontmatter to reason about agent connections, find gaps, and suggest improvements.
- **Registry as companion**: The generated `agent-registry.md` provides a quick-reference text view (system state table, connection graph, freshness indicators).
- **Status awareness**: Green/amber/red dots derived from `last_run` dates give immediate visual freshness signals.
- **No dependencies**: Python stdlib only. Runs anywhere Python 3 is installed.
- **Version-controllable**: Both the generator and its output are plain files in the repo.

**What could be better**:
- SVG is static — cannot click, hover, or interact.
- Layout positions are hardcoded per tier in the script rather than computed dynamically.
- Adding a new tier or significantly different system topology would require editing the generator's layout logic.
- The visual output is specific to the PS outreach agents — not yet generalized as a reusable template.

**Lesson**: This is the right pattern. Structured metadata + generator script + derived visual output. Phase 2 builds on this foundation by making the output interactive.

## Phases

### Phase 1: Living SVG (DONE)

Completed 2026-03-24.

**Deliverables**:
- YAML frontmatter on all 7 agent prompt files (`agents/*/prompt.md`)
- Generator script (`scripts/generate-architecture.py`) — Python stdlib only
- Generated SVG (`outputs/demo/agent-architecture.svg`)
- Generated registry (`docs/agent-registry.md`)

**Verification**: Run the generator, open the SVG, confirm all agents appear with correct connections and status colors.
Edit one agent's frontmatter, re-run, confirm the output reflects the change.

### Phase 2: Interactive HTML Canvas (NEXT)

Single HTML file with inline CSS/JS. No dependencies. Opens in any browser.

**Core features**:
- **Clickable agents** — click a node to see its prompt summary, last run date, recent outputs, and a link to its prompt file.
- **Hoverable connections** — hover an arrow to see what data flows along it, when it last flowed, and which files are involved.
- **Status colors** — green glow for recently run, amber for getting stale, red for never run or broken connections. Computed from `last_run` dates in frontmatter.
- **Zoom levels** — zoomed out = system overview (current SVG view). Zoomed in = agent detail with output previews and connection details.
- **Drag-and-drop** — rearrange agents spatially to explore different organizational models. Positions persist in localStorage.
- **Search/filter** — filter by tier, status, connection type. Highlight specific data flow paths.

**Technical approach**:
- Generator script produces a single `.html` file with all data, styles, and behavior inline.
- Agent metadata is embedded as a JSON object in a `<script>` tag.
- Canvas rendering via SVG (same visual language as Phase 1) with event handlers for interactivity.
- No external dependencies — no D3, no React, no CDN links.

**Output**: `outputs/demo/workspace.html` (or `spatial-workspace/output/workspace.html` if the project is extracted by then).

### Phase 3: Spatial Workspace (LONG-TERM)

The workspace becomes a browsable canvas — like RenMap for people, but for systems.

**Vision**:
- Each component (agent, document, data flow) is a "location" with its own context, history, and connections.
- Data flows are visible as paths between locations.
- The shared memory layer (brand voice, ICP, content pillars) is the "ground" everything sits on.
- New components are designed spatially first — place a box, draw connections, define relationships — then generate the prompt scaffold from the spatial definition.
- The workspace itself becomes a design tool: sketch a new agent as a box, draw connections, then generate the prompt scaffold.
- History/timeline: see how the system evolved over time (what was added when, which connections changed).

**Reusable template**:
- Abstract the generator into a configurable engine that takes any system's metadata and produces a spatial workspace.
- Template types: agent-system, project-ecosystem, event-pipeline, workflow-diagram.
- Each template defines node types, connection types, layout strategies, and visual language.

**Connection to RenMap**:
- Same foundational principle: spatial interfaces for complex relational systems.
- RenMap applies it to people, communities, events. Spatial Workspace applies it to systems, agents, projects.
- Shared learnings on layout algorithms, canvas interaction patterns, and spatial proximity semantics.
- Potentially shared code for the canvas engine if both projects converge on similar technology.

## Use Cases Beyond Agents

### Project Ecosystem Map
Visualize the entire Playful Sincerity ecosystem — all subprojects (agents, website, events, RenMap, PSSO, lists) as nodes on a canvas.
Show dependencies, shared resources, data flows between projects.
Useful for onboarding new collaborators and maintaining coherence across a growing system.

### Event Planning
Map event pipelines spatially — from community discovery to invitation to logistics to follow-up.
Each stage is a node; connections show what feeds into what.
Useful for the PS Events system and any event-driven workflow.

### Knowledge Architecture
Visualize the PSSO synthesis — 17 pillars as spatial regions, interconnections between pillars visible.
A spatial map of an idea system rather than a linear document.

### RenMap Development
Use Spatial Workspace to visualize RenMap's own architecture — frontend components, backend services, data flows.
Eat your own cooking: the spatial workspace tool helps design the spatial social network.

### Any Multi-Agent System
The pattern is general: any system with structured metadata (YAML, JSON, frontmatter) embedded in its component files can be visualized.
Potential use cases: Formulate Labs agent architectures, client consulting projects, open-source multi-agent frameworks.

## Verification

### Phase 1 (DONE)
1. Run `python3 outreach-agents/scripts/generate-architecture.py` — exits without errors.
2. Open `outreach-agents/outputs/demo/agent-architecture.svg` in a browser — all 7 agents visible, correctly positioned by tier, with connections and status dots.
3. Read `outreach-agents/docs/agent-registry.md` — system state table, connection graph, and freshness indicators are all present and accurate.
4. Edit one agent's `last_run` date in its frontmatter, re-run the generator — confirm the status dot color changes.
5. Add a new `feeds_into` entry, re-run — confirm the new connection arrow appears in the SVG.

### Phase 2
1. Run the HTML generator — produces a single `.html` file.
2. Open in browser — agents display with correct positions, colors, and connections.
3. Click an agent node — detail panel appears showing prompt summary, status, outputs.
4. Hover a connection — tooltip shows data flow label and last flow date.
5. Drag an agent to a new position — position persists after page reload (localStorage).
6. Zoom in/out — layout adapts, detail level changes appropriately.
7. Filter by tier — only matching agents and their connections remain visible.
8. File size remains reasonable (under 500KB for the PS outreach system).

### Phase 3
1. Create a new agent by placing a box on the canvas and drawing connections.
2. Export the spatial definition to generate a prompt scaffold file.
3. Apply a different system's metadata to the same workspace engine — confirm it renders correctly.
4. View system history — see a timeline of when components were added and connections changed.

## Open Questions

1. **Layout algorithm**: Should Phase 2 compute positions dynamically (force-directed, hierarchical) or keep the current manual tier-based positioning? Dynamic is more flexible but harder to control aesthetics.
2. **Data embedding vs. file reading**: Should the HTML workspace embed all metadata at generation time, or should it be able to read files at runtime (via File System Access API)? Embedding is simpler and works offline; runtime reading enables live updates without re-generation.
3. **Shared canvas engine with RenMap?** If both projects need a 2D spatial canvas with nodes, edges, and interactions, should they share infrastructure? Or is it too early to abstract?
4. **Version history format**: How to track system evolution over time — git history of frontmatter changes, a separate changelog, or snapshots embedded in the workspace?
5. **Template system design**: What's the right abstraction boundary between "this specific agent system" and "any system"? When to extract vs. when to keep specific?
6. **Mobile/tablet**: Should the interactive HTML workspace work on touch devices? Adds complexity to drag-and-drop and hover interactions.

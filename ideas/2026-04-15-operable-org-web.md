---
timestamp: "2026-04-15"
category: idea
related_project: Spatial Workspace
related: [Paperclip, AVS, RenMap]
---

# Operable Org Web — People + Agents in One Orchestration Graph

## The Idea

Paperclip (the agentic orchestration system) is essentially a way to wire agents into coordinated workflows. The insight: **you might as well put people inside that same graph.** When you do, the result isn't an org chart — it's an **operable org web**.

- **Org chart:** static hierarchy, describes reporting lines, non-executable.
- **Org web:** graph of nodes (people + agents) connected by capabilities, handoffs, and dependencies. You can *run* it. Tasks flow through the graph; any node (human or agent) can pick up work, pass it on, or spawn sub-nodes.

This fits the Spatial Workspace naturally — the workspace is already a living 2D representation of complex systems. Paperclip becomes the **orchestration layer**; the workspace becomes the **visible substrate** where the web lives, moves, and gets edited.

## Why It Fits

- Spatial Workspace is already about representing systems spatially with operable structure.
- Paperclip gives us the orchestration primitives (nodes, edges, triggers, handoffs).
- People-as-nodes means the same substrate runs teams, agent swarms, or hybrids — no separate tools for human work vs. agent work.
- AVS (Autonomous Venture Studio) is the immediate consumer: the Director meta-agent plus humans plus specialized agents all live in one operable web. The venture studio IS an org web.

## Design Seeds

- **Node types:** Human, Agent (Claude instance), Service (API/tool), Team (sub-graph).
- **Edges:** capability handoff, review/approval, notification, data flow, supervision.
- **Spatial meaning:** proximity = collaboration frequency or shared context; size = load/importance; color = type or status.
- **Operability:** clicking a node runs it, messages it, or opens its context. Edges fire when triggered.
- **People-specific:** async by default, with availability windows; agents pick up what humans haven't.

## Connections

- **Paperclip** — orchestration engine we learn from and likely extend.
- **AVS** — first real consumer of the operable org web (Director + research agents + Wisdom + Frank + specialists).
- **RenMap** — spatial social network; people-as-nodes overlaps with RenMap's substrate. Worth checking whether they converge.
- **The Companion** — a Companion node in the web = persistent agent with identity.
- **HHA** — consulting deliverable: "here's your org as an operable web."
- **CoVibe** — multi-Claude coordination through a shared git repo. Same pattern at a different layer: multiple intelligences negotiating work through a visible substrate (`.covibe/sessions/`, `.covibe/messages/`). CoVibe is already a proto org web — humans + Claude sessions as nodes, git as the coordination surface. Three convergent systems:
  - **CoVibe** = coordination protocol (how nodes talk, who's working on what, conflict detection)
  - **Paperclip** = orchestration engine (wiring, triggers, handoffs)
  - **Spatial Workspace** = visible substrate (where the web lives and gets operated)
  Together: CoVibe's session/message primitives could become node-edge primitives in the operable web. A CoVibe session file → a node. A CoVibe message → an edge firing. The `.covibe/` directory is already a textual org web — Spatial Workspace would render and make it operable visually.

## Open Questions

- How much of Paperclip do we use directly vs. learn from?
- Do we represent humans with the same node primitives as agents, or is there an irreducible difference that needs its own type?
- What's the minimum demo? Probably AVS itself running on this substrate.

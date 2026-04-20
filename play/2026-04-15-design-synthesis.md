---
timestamp: "2026-04-15"
category: synthesis
related_project: Spatial Workspace
inputs:
  - ideas/2026-04-09-workspace-as-digital-core.md
  - ideas/2026-04-10-emergent-location-gravity-model.md
  - ideas/2026-04-10-n8n-spatial-workspace-convergence.md
  - ideas/2026-04-10-renmap-inside-spatial-workspace.md
  - ideas/2026-04-10-spatial-workspace-as-platform.md
  - ideas/2026-04-15-operable-org-web.md
  - SPEC.md (Phase 1/2 current plan)
---

# Spatial Workspace — Design Synthesis (April 2026)

Pulling six months of scattered ideas into one frame. Goal: name the thesis, surface the tensions, propose a design stance, and lay out build order.

---

## 1. The Thesis

**Spatial Workspace is not a visualization tool. It's the platform layer where everything else lives.**

The original framing — "living 2D diagrams of agent systems" — was a seed. What's emerged across six months of play is much bigger: a single environment where knowledge, people, agents, workflows, and governance all share one spatial substrate. Seven threads converged on this:

| Thread | Contribution | Source |
|---|---|---|
| **Living SVG** (Phase 1, done) | Frontmatter → generated visual. Pattern validated. | SPEC.md |
| **Ecosystem Canvas** (Phase 2) | 776 files browsable on one canvas, file reader inline. | plan.md |
| **Workspace = Digital Core = AM** | Interface, identity, and knowledge graph are one architecture at three scales. | 2026-04-09 |
| **Emergent location** | Position is the weighted center of gravity of a node's connections. Hierarchy is just what a graph looks like at low resolution. | 2026-04-10 |
| **n8n convergence** | Canvas workflows already work for agents. Extend to humans as first-class nodes. | 2026-04-10 |
| **RenMap inside SW** | Social/people layer is an app within the platform, not a separate project. | 2026-04-10 |
| **Operable org web** | Paperclip + CoVibe + SW = one graph where humans, Claude sessions, and agents all orchestrate. | 2026-04-15 |

The pattern: each thread describes a different layer of the same thing.

---

## 2. The Unified Stack

```
Spatial Workspace (the environment — canvas, zoom, emergent location)
├── Knowledge layer        → Digital Core, Associative Memory, chronicles
├── Social layer           → RenMap (people, interests, locality)
├── Orchestration layer    → Paperclip-style workflows, CoVibe sessions, agent nodes
├── Project management     → Humans + agents + automations in one graph
├── Governance layer       → Contribution tracking (automatic from activity)
└── Identity layer         → Digital Cores as overlapping structures (Hearth at scale)
```

Every prior PS Software project maps to a layer. **RenMap, CoVibe, Paperclip, The Hearth, The Companion, Phantom — none of them are separate products in the long run. They're apps or layers inside Spatial Workspace.**

That's the crazy part Wisdom was pointing at. It pulls everything together because everything we've been building was implicitly pointing at the same substrate.

---

## 3. The Core Design Principle: Emergent Location

This is the load-bearing idea that separates Spatial Workspace from n8n, Miro, Figma, Obsidian Canvas, and everything else that looks superficially similar.

**In n8n/Miro/Figma:** nodes have assigned coordinates. You place them. The canvas is dumb paper.

**In Spatial Workspace:** nodes have emergent coordinates. Position is computed from the weighted pull of all connections — like gravity. Move a connection, the node drifts. Connection strength is mass. Proximity means relatedness because the physics enforces it.

Consequences:
- **Zoom out** → dense clusters compress into containers. Hierarchy emerges.
- **Zoom in** → the hierarchy dissolves back into the graph. Cross-cluster connections become visible again.
- **No "where does this file live"** problem. It lives where it belongs — at the center of its connections.
- **Hierarchy is diagnostic, not imposed.** Who depends on whose decisions? That's the org chart. You can see it; you don't decree it.

This is Gravitationalism applied to information, and AM's navigable graph made visible. The Spatial Workspace is the interface layer to both.

---

## 4. People + Agents in One Graph (the April 15 Idea)

Paperclip orchestrates agents. CoVibe coordinates Claude sessions through a shared git repo (`.covibe/sessions/`, `.covibe/messages/`). Same structural pattern at two layers: nodes negotiating work through a visible substrate.

Extend: put humans in the same graph.

- **Node types:** Human, Claude session, Agent, Service, Team (sub-graph).
- **Edges:** handoffs, approvals, notifications, data flow, supervision.
- **Operability:** clicking a node runs it, messages it, or opens its context. Edges fire when triggered.
- **Spatial meaning:** proximity = collaboration frequency; size = load; color = type/status.
- **Async-by-default for humans**, with availability windows. Agents pick up what humans haven't.

The result isn't an org chart. It's an **operable org web** — a runnable graph that IS the organization.

**First tenant:** AVS (Autonomous Venture Studio). Director meta-agent + Wisdom + Frank + specialized research agents + humans, all orchestrated on one canvas. The venture studio becomes the proof.

---

## 5. The Three Convergent Systems

Three pieces of infrastructure are pointing at the same shape from different angles. They should converge, not compete.

| System | What it is now | Role in SW |
|---|---|---|
| **CoVibe** | Multi-Claude coordination protocol via shared git repo | Coordination primitives — session = node, message = edge event |
| **Paperclip** | Agentic orchestration engine | Execution primitives — wiring, triggers, handoffs |
| **Spatial Workspace** | Living canvas over structured metadata | Visible substrate — where the web lives and is operated |

**CoVibe's `.covibe/sessions/`** is already a textual org web. Each session file is a proto-node. Each message is a proto-edge firing. Spatial Workspace renders it and makes it operable.

**Paperclip** provides the runtime. SW shows you what's running, lets you edit it, lets humans step in.

Unifying these three is likely the single highest-leverage move in the entire PS Software branch.

---

## 6. Automatic Contribution Tracking

If people work inside the workspace, governance becomes free:

- Who was at which node, when, for how long
- Which connections they created or strengthened
- Which decisions routed through them (decision dependency density → emergent management)
- Which resources they produced, consumed, reviewed

The workflow IS the project record. No separate time-tracking, no self-reporting, no "did you actually do the work" — it's visible on the canvas. This is what the PS Stewardship / governance-economics work has been reaching for; Spatial Workspace is the substrate that makes it mechanical rather than bureaucratic.

---

## 7. Tensions to Resolve

Not every thread fits cleanly. The hard design questions:

1. **Centralized vs. per-person Digital Cores.** RenMap-inside-SW implies each person has their own Digital Core and the platform is a layer over all of them. But a shared org canvas (AVS, HHA) implies one canvas many people work in. Both? How do they reconcile? *Likely answer: per-person cores with selective sharing, and shared canvases are projected views of the overlap.*

2. **Emergent location at scale.** Computing positions from gravity on 776+ nodes works. Computing it on 100K+ nodes with live edits is harder. Phase 2's plan is fixed-layout horizontal tree for exactly this reason. The emergent model is the long-term target, not the MVP.

3. **How much of Paperclip do we build on vs. learn from?** Depends on its license and extensibility. Worth a look before committing.

4. **Humans as nodes — is it really the same primitive as an agent?** They have availability, emotional state, consent. An agent just has an endpoint. Probably a shared `Node` interface with `Human` and `Agent` as implementations rather than a flat type.

5. **Offline-first vs. collaborative.** Phase 2 is single-HTML-file offline. An operable org web implies collaboration. These have to reconcile. *Likely answer: git as the sync substrate, borrowing CoVibe's pattern — every canvas is a git repo.*

6. **When does this become a real product vs. stay a personal tool?** The ambition is huge. Being honest about timeline matters — especially with HHA as the revenue bridge.

---

## 8. Proposed Build Order

Given revenue priority and HHA timeline, here's a pragmatic sequence. Each phase is valuable standalone, and each unlocks the next.

**Phase 2 (in plan, keep building): Ecosystem Canvas.** Single HTML file, all 776 ecosystem .md files browsable, PS brand styling. This is the personal tool that also serves as the demo artifact. Ships to Wisdom's daily use. ← *This is what Wisdom should ship next. Don't let the bigger vision delay it.*

**Phase 2.5: Operable Node Prototype.** Extend Phase 2 so file nodes can have actions attached (run, message, open). Start with one simple case — e.g., an agent node you can trigger. This is the smallest step toward "operable" without leaving the single-HTML-file constraint.

**Phase 3a: AVS Canvas.** First real orchestration consumer. AVS lives on a canvas. Director + research agents + humans as nodes. Use CoVibe's session/message pattern as the coordination layer underneath. This is the proof that "operable org web" works — and AVS needs a substrate anyway.

**Phase 3b: Emergent Location.** Replace fixed tree layout with force-directed / gravity-based positioning. This is where SW visibly becomes different from everything else on the market.

**Phase 4: Multi-Tenant.** Per-person Digital Cores that federate. RenMap as a projected view of the people layer. The Hearth at scale.

**Phase 5: Productize.** HHA deliverable: "here's your org as an operable web." Consulting → product. This is the long-term revenue angle.

---

## 9. What I'd Recommend Next

Three concrete moves, in order:

1. **Finish Phase 2 as planned.** Don't let the big vision swallow the near-term. The ecosystem canvas is valuable on its own and proves the technology base.

2. **Write a one-page design manifesto** capturing §1-§4 of this doc. Something shareable with Rayyan, Cameron, Frank — this is collaborator-bait. Cameron especially (PeerMesh's composable platform philosophy maps directly to the unified-stack idea).

3. **Spike a tiny operable-node demo** inside Phase 2. Pick the smallest possible case — maybe a "re-run this generator" button on a node. Proves the jump from "living visualization" to "operable surface" before AVS needs it.

After that, AVS-on-SW becomes the forcing function for the orchestration layer, and the rest follows.

---

## 10. Open Questions for Wisdom

- Does "Spatial Workspace as the platform everything lives in" actually land as the right framing, or does it over-reach? (It's a strong claim; worth testing.)
- Is the HHA productization path worth naming explicitly now, or does it constrain the research spirit of the work?
- Worth doing a `/debate` on the emergent-location-at-scale tension? That one feels like a real architectural fork.
- Should Cameron see this synthesis? PeerMesh and SW-as-platform rhyme heavily.

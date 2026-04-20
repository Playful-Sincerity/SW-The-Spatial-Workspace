---
timestamp: "2026-04-10 15:10"
category: idea
related_project: Spatial Workspace, Happy Human Agents, Digital Core
---

# n8n as Prototype for Spatial Workspace Project Management

## The Insight

n8n's canvas-based workflow builder is already doing what Spatial Workspace was conceived to do: visual, spatial orchestration of work — except n8n does it for automations and agents, not for human project management.

The Spatial Workspace can replicate and extend this: a canvas where workflows can be either automated (agents, automations) or human-in-the-loop (project management with real people at nodes).

## How It Works

In n8n, a workflow is a visual graph of nodes connected by data flows. In the Spatial Workspace version:

- **Nodes can be agents OR humans** — same visual representation, different execution
- **A human at a node** is "working within the workflow" — their position in the canvas IS their status
- **When a human needs information**, they can message/request right from their node, and that sends to a thread or channel
- **A manager can navigate the spatial workspace**, see where everyone is working, connect relevant information to nodes, and leave traces that they were there
- **Automations and human work coexist** on the same canvas — some nodes trigger automatically, some wait for human input

## What This Means for Spatial Workspace

The Spatial Workspace isn't just a visualization tool or a social network container (RenMap). It's a **project management environment with native agent/automation integration**. This was the original vision, and n8n proves the canvas-based approach works — it just hasn't been extended to human collaboration yet.

## The Stack

```
Spatial Workspace (the environment)
├── RenMap (social layer — people, interests, connections)
├── Project Management (workflow layer — tasks, automations, agents)
│   ├── Human nodes (people doing work)
│   ├── Agent nodes (AI executing tasks)
│   ├── Automation nodes (n8n-style triggers and actions)
│   └── Communication threads (contextual, per-node)
├── Digital Core (knowledge layer — chronicles, memory, governance)
└── Contribution Tracking (governance layer — automatic from activity)
```

## Connection to Contribution Tracking

If people are working WITHIN the spatial workspace, contribution tracking becomes even more automatic:
- You can see who was at which node, when, for how long
- Communication threads capture collaboration and decision-making
- Manager visits and information connections are logged
- The workflow itself is the project record

## Why n8n Validates This

n8n has proven:
1. Canvas-based workflow design is intuitive
2. Mixing different node types (API, code, AI, human-trigger) works
3. Visual debugging and monitoring is natural
4. The graph IS the documentation

What n8n hasn't done: make humans first-class nodes in the workflow, or connect the workspace to identity/social/knowledge layers. That's the Spatial Workspace extension.

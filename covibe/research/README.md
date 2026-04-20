# CoVibe Research

## Background Research (from Shared Core project)

The foundational research was conducted under the Shared Core project. Key documents:

- [Claude Code Cloud Deployment](../../../Shared Core/research/claude-code-cloud-deployment.md) — Every way Claude Code runs outside local: Codespaces, Actions, cloud, Agent SDK. The Agent SDK is CoVibe's foundation.
- [Real-Time File Sync Landscape](../../../Shared Core/research/realtime-file-sync-landscape.md) — 20+ sync tools evaluated. Syncthing for quick staging, Yjs CRDTs for Phase 2 collaborative editing.
- [Collaboration Architecture Patterns](../../../Shared Core/research/collaboration-architecture-patterns.md) — How Figma, Google Docs, Notion solve real-time collaboration. Scaling from 2-3 to 100+ users.
- [GH Scout: Shared AI Context](../../../Shared Core/research/gh-scout-shared-ai-context.md) — 20 repos surveyed. AGENTS.md standard, oh-my-claudecode patterns, mem0 memory layer.
- [Product Landscape](../../../Shared Core/research/product-landscape.md) — Nobody does multiplayer AI sessions. The gap is real.
- [Sync Primitives](../../../Shared Core/research/sync-primitives.md) — Git + auto-commit hybrid for knowledge files.
- [Layer Architecture](../../../Shared Core/design/layer-architecture.md) — Personal > Team > Org layer model for shared rules.
- [PS Integration Map](../../../Shared Core/design/ps-integration-map.md) — How CoVibe connects to PeerMesh, Hearth, Companion, etc.

## CoVibe-Specific Research

Research specific to the multiplayer editor goes here:
- Agent SDK capabilities and patterns
- WebSocket architecture for real-time multi-user sessions
- Turn management / concurrent prompting models
- CRDT integration for collaborative file editing

# GH Scout Report — 2026-04-07 — Agent SDK & Multiplayer Architecture

**Context:** CoVibe is a collaborative web interface for shared Claude Code sessions — multiple people, one shared conversation, shared file tree, real-time. Built on the Claude Agent SDK. This scout specifically targets: (1) how to wrap the Agent SDK into a multi-user server, and (2) how multiplayer collaborative editing is architectured.

**Prior work:** The Shared Core GH Scout (2026-04-07) covered shared AI context patterns, CRDT basics, and the `ai-rules-sync` / `oh-my-claudecode` landscape. This report does not repeat that ground — it goes deeper on the CoVibe-specific technical stack.

---

## Summary

17 targeted searches executed. 28 repos evaluated. Key finding: the most direct analogue to CoVibe's architecture — a WebSocket wrapper around the Agent SDK running in a cloud sandbox — already exists as `dzhng/claude-agent-server`. The collaborative terminal pattern (multi-user, infinite canvas, presence indicators) is fully realized in `ekzhang/sshx`. The CRDT/sync layer is mature: `ueberdosis/hocuspocus` + `jamsocket/y-sweet` cover Phase 2's file sync needs. The Agent SDK multi-tenant deployment pattern is officially documented and active.

No injection attempts detected in any fetched content.

---

## Repos Evaluated

| Repo | Stars | Trust | Radar | Category |
|------|-------|-------|-------|----------|
| [anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) | — | T1 | Adopt | Official Agent SDK |
| [anthropics/claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python) | — | T1 | Adopt | Official Agent SDK |
| [anthropics/claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos) | — | T1 | Adopt | Official SDK examples |
| [dzhng/claude-agent-server](https://github.com/dzhng/claude-agent-server) | 468 | T3 | **Trial** | WebSocket wrapper for Agent SDK |
| [receipting/claude-agent-sdk-container](https://github.com/receipting/claude-agent-sdk-container) | — | T3 | Trial | Dockerized Agent SDK + REST API |
| [coder/agentapi](https://github.com/coder/agentapi) | 1,100+ | T2 | **Trial** | HTTP/SSE API for any coding agent |
| [claude-world/agent-deck](https://github.com/claude-world/agent-deck) | — | T4 | Assess | Web UI for multi-agent DAG orchestration |
| [baryhuang/claude-code-by-agents](https://github.com/baryhuang/claude-code-by-agents) | — | T4 | Assess | Desktop multi-agent @ mentions coordination |
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo) | 27.6k | T3 | Assess | Agent orchestration platform (heavy) |
| [ekzhang/sshx](https://github.com/ekzhang/sshx) | 7.3k | T3 | **Trial** | Collaborative live terminal sharing over web |
| [yjs/yjs](https://github.com/yjs/yjs) | 18k+ | T2 | **Adopt** | CRDT library — the sync primitive |
| [yjs/y-websocket](https://github.com/yjs/y-websocket) | — | T2 | Adopt | WebSocket connector for Yjs |
| [ueberdosis/hocuspocus](https://github.com/ueberdosis/hocuspocus) | — | T3 | **Trial** | Production Yjs WebSocket backend (Node.js) |
| [jamsocket/y-sweet](https://github.com/jamsocket/y-sweet) | — | T3 | Trial | CRDT doc store backed by S3 (Rust) |
| [nimeshnayaju/y-presence](https://github.com/nimeshnayaju/y-presence) | — | T3 | Assess | React hooks for Yjs presence/awareness |
| [liveblocks/liveblocks](https://github.com/liveblocks/liveblocks) | — | T2 | Assess | Managed multiplayer infra (not self-hosted) |
| [Partywork/partyworks](https://github.com/Partywork/partyworks) | — | T4 | Assess | Self-hostable Liveblocks-like framework |
| [owenthereal/upterm](https://github.com/owenthereal/upterm) | — | T3 | Assess | Instant terminal sharing (self-hostable) |
| [josephg/ShareJS](https://github.com/josephg/ShareJS) | — | T3 | Hold | Original OT collaborative editing library (unmaintained) |
| [mrktsm/codecafe](https://github.com/mrktsm/codecafe) | — | T4 | Assess | Browser-based collaborative code editor with custom OT |
| [kenneth-liao/claude-agent-sdk-intro](https://github.com/kenneth-liao/claude-agent-sdk-intro) | — | T4 | Assess | Introductory Agent SDK tutorial |
| [jkelly/ClaudeAgentExamples](https://github.com/jkelly/ClaudeAgentExamples) | — | T4 | Assess | Community Agent SDK examples |
| [spring-ai-community/claude-agent-sdk-java](https://github.com/spring-ai-community/claude-agent-sdk-java) | — | T4 | Hold | Java SDK mirror (not relevant for TS/Node stack) |
| [ruvnet/agentic-flow](https://github.com/ruvnet/agentic-flow) | — | T4 | Assess | Model-switching for Agent SDK deployments |
| [mberg/agent-http](https://github.com/mberg/agent-http) | — | T4 | Assess | HTTP API for Claude Code via MCP channels |
| [ComposioHQ/agent-orchestrator](https://github.com/ComposioHQ/agent-orchestrator) | — | T3 | Assess | Parallel coding agents with git worktrees per agent |
| [chauncygu/collection-claude-code-source-code](https://github.com/chauncygu/collection-claude-code-source-code) | — | T4 | Assess | Leaked Claude Code source collections |
| [T-Lab-CUHKSZ/claude-code (buildable fork)](https://github.com/beita6969/claude-code) | — | T4 | Assess | Reverse-engineered buildable Claude Code fork |

---

## Top Finds — Study These

### 1. `dzhng/claude-agent-server` — CoVibe's Closest Prototype

**468 stars, T3, actively maintained — this is the most direct analogue to CoVibe Phase 1.**

This repo wraps the Claude Agent SDK in a WebSocket server and runs it inside an E2B sandbox. Key architecture: the server exposes all Agent SDK config options and streams results down in a type-safe way. A TypeScript client library (`@dzhng/claude-agent`) handles connection management. Each sandbox gets its own isolated filesystem and resources; automatic cleanup on disconnect.

The architecture matches CoVibe Phase 1 almost exactly: Agent SDK → WebSocket server → client library. The main difference is CoVibe needs multi-user (multiple WebSocket clients per session), not just remote control of a single session. The E2B sandbox model (isolated VM per session) is directly applicable for CoVibe's shared filesystem.

**For CoVibe:** Study the WebSocket message protocol and config streaming pattern. Extend for multiple simultaneous clients per session rather than one client per sandbox.

---

### 2. `coder/agentapi` — The Universal Agent HTTP/SSE Layer

**1,100+ stars, T2 (Coder is a major infrastructure company), actively maintained.**

AgentAPI is a Go HTTP server that controls any coding agent (Claude Code, Aider, Goose, Gemini, Amp, Codex) through terminal emulation. It translates API calls into terminal keystrokes, parses outputs into individual messages, and exposes a clean OpenAPI schema. Endpoints: `GET /status`, `GET /events` (SSE stream), `POST /message`.

This is architecturally distinct from Claude-agent-server: instead of wrapping the Agent SDK, it wraps the terminal. That means it works with any agent and doesn't require SDK access. The SSE-based event stream is simpler than WebSockets for read-heavy broadcasting.

**For CoVibe:** The `/events` SSE pattern is worth adopting for the read path — broadcasting agent output to all connected viewers is naturally a one-directional stream. The `/message` POST for sending prompts is clean. The trade-off is terminal emulation adds latency vs. native SDK streaming. Use this as the API design reference even if CoVibe uses native Agent SDK underneath.

---

### 3. `ekzhang/sshx` — Collaborative Terminal Architecture Reference

**7,300+ stars, T3, written in Rust, deployed on Fly.io with Redis.**

sshx is the gold-standard open-source collaborative terminal. Run one command, get a web-accessible session where multiple people can view and type. Features: infinite canvas for multiple terminal windows, real-time cursor tracking, read-only mode, end-to-end encryption (Argon2 + AES), globally distributed server mesh, automatic reconnection, predictive echo for responsive feel.

Architecture: Rust server + gRPC forwarding + WebSocket connections + Redis for session state across instances. The xterm.js fork (`ekzhang/sshx-xterm.js`) is the terminal renderer in the browser.

**For CoVibe:** The read-only mode pattern (viewers who can see but not type) maps directly to CoVibe's "observer" role. The multi-window canvas concept is the long-term visual for CoVibe Phase 3. The Rust+gRPC backbone is overkill for Phase 1 but the Redis-backed horizontal scaling model is worth understanding before designing CoVibe's session persistence layer. In the short term, study its WebSocket message protocol for multiplayer terminal state broadcasting.

---

### 4. `ueberdosis/hocuspocus` — Production Yjs WebSocket Backend

**T3, maintained by the Tiptap team (major collaborative editor company), used in production.**

Hocuspocus is a Node.js WebSocket server built specifically for Yjs CRDT documents. Key features: generic database extension (fetch/persist via any Promises), Redis extension for horizontal scaling (multiple server instances sync through Redis pub/sub), pluggable authentication, and a `handleConnection()` method for embedding in existing HTTP servers rather than running standalone.

The Redis scaling model is particularly important: spawn multiple Hocuspocus instances behind a load balancer; changes propagate via Redis pub/sub to all instances and forward to all clients. This is the production path for CoVibe once it scales beyond a single server.

**For CoVibe Phase 2 (CRDT file editing):** Hocuspocus is the most mature, battle-tested option. It slots directly in as the sync backend once CoVibe adds collaborative file editing. The database extension means file state can be persisted to PostgreSQL or SQLite without custom sync logic.

---

### 5. `jamsocket/y-sweet` — CRDT Document Store Backed by S3

**T3, MIT license, written in Rust by Jamsocket (infrastructure startup).**

Y-sweet is a standalone Y-js CRDT document server that persists to S3-compatible storage and scales horizontally. It has a full SDK ecosystem: `@y-sweet/sdk` (backend), `@y-sweet/client` (frontend sync), `@y-sweet/react` (React hooks). Document-level access control via client tokens. Can run as a native Linux process on your own infra or on Jamsocket's hosted platform.

The key differentiator from Hocuspocus: S3-backed persistence rather than database-backed. For CoVibe's shared filesystem (git-backed anyway), Hocuspocus with SQLite is simpler. But y-sweet's client token model for per-document access control is worth borrowing for CoVibe's session authorization.

**For CoVibe:** Decide between Hocuspocus (Node.js, database-backed, more integrations) and y-sweet (Rust, S3-backed, simpler ops). Recommendation: Hocuspocus for Phase 2 — it's Node.js like the rest of CoVibe's backend, easier to operate.

---

### 6. Official Agent SDK — Sessions, Multi-Tenancy, and Hosting

The official Agent SDK (TypeScript + Python) now has documented multi-tenant deployment patterns. Key facts gathered from official docs and the v0.1.0 changelog:

- **Session IDs:** Every session emits an `init` message with a `session_id`. Pass this back on the next call to resume the exact context. Session data is saved to `~/.claude/projects/` by default but can be redirected.
- **Multi-tenant change (v0.1.0):** The SDK no longer loads Claude Code's system prompt or filesystem settings by default. This makes behavior predictable when serving multiple users from one process — critical for CoVibe.
- **Subagents:** The `Task` tool spawns child agent processes. Each subagent is isolated (fresh context). CoVibe can use subagents for parallel user workstreams within one session.
- **Hooks as code:** `PreToolUse`, `PostToolUse`, and `Stop` hooks can be JavaScript callbacks, not just shell scripts — enables programmatic turn management in CoVibe's server.
- **Official demos** (`anthropics/claude-agent-sdk-demos`): Contains V2 Session API examples including multi-turn conversation, session persistence, forking existing sessions, and a multi-agent research system that coordinates specialized subagents.

---

### 7. `claude-world/agent-deck` — Web UI for Multi-Agent DAG Orchestration

**T4 (single author), actively maintained, recent project.**

Agent-deck is a web-based command center for orchestrating multiple Claude Code agents. Architecture: Express + WebSocket + better-sqlite3 on the backend; React 18 + Tailwind + Vite + Zustand + React Flow on the frontend. Key features: AI task decomposition into a DAG, Kahn's algorithm for parallel execution scheduling, real-time WebSocket streaming, cost tracking, git finalize (review changed files and commit from the browser).

The stack is almost identical to CoVibe's proposed stack. The DAG execution engine is more complex than CoVibe needs for Phase 1 (CoVibe is a single shared session, not a task orchestrator), but the React Flow visualization and cost tracking are directly reusable.

**For CoVibe:** Study the Express + WebSocket server architecture. Borrow the cost tracking and the git finalize pattern (reviewing and committing from the browser UI is exactly CoVibe Phase 2).

---

## Architecture Patterns — Distilled for CoVibe

### Pattern A: WebSocket Session Bridge (Phase 1)

The core pattern from `dzhng/claude-agent-server` and `coder/agentapi`:

```
Client(s) ←→ WebSocket Server ←→ Agent SDK session
                    ↓
            Session Manager
            (tracks who's connected, 
             queues prompts, 
             broadcasts output)
```

Agent SDK output streams as JSON events. The server broadcasts each event to all connected WebSocket clients. Prompts from any client go through the session manager which queues them (turn management). Session ID stored server-side for resumption.

The critical CoVibe extension: multiple clients per session (not 1:1 client-to-session). The broadcast model makes this straightforward — every agent output event fans out to all N connected clients.

### Pattern B: SSE for Output, REST for Input (Alternative to WebSockets)

From `coder/agentapi`'s design:
- `GET /events` → Server-Sent Events stream for agent output (read-only, naturally broadcastable)
- `POST /message` → REST endpoint for sending prompts

SSE is simpler than WebSockets for the read path because it's unidirectional and works over plain HTTP/2. The write path (POST /message) is simple enough that WebSockets aren't needed. This reduces protocol complexity and makes the browser client simpler.

**CoVibe recommendation:** Use this pattern for Phase 1. SSE for output (easy to fan out to multiple clients), REST for prompts (with a queue on the server side). Upgrade to bidirectional WebSockets only if Phase 2 needs it (e.g., streaming file diffs).

### Pattern C: Turn Management Models

Research surfaced three models. For a small team (2-5 people):

1. **Pessimistic lock (simplest):** One person owns the "prompt" role at a time. Others see a lock indicator. Explicit "pass" action releases it. Maps to CoVibe's turn management open question.
2. **Queue-based (recommended for Phase 1):** Any user can submit a prompt; they go into a queue. The session processes one at a time, broadcasting output to all. Users see the queue. No explicit locking needed.
3. **Optimistic / CRDT (Phase 2+):** No locking. Use CRDT to merge concurrent edits to files. The conversation itself remains sequential (the LLM processes one message at a time), but file edits can be concurrent.

**Recommendation:** Start with queue-based for Phase 1. It's simple, fair, and maps naturally to the Agent SDK's sequential processing model.

### Pattern D: CRDT File Sync for Phase 2

```
Browser clients (Monaco/CodeMirror + Yjs binding)
    ↓ Y-doc updates
Hocuspocus server (Node.js)
    ↓ persists
SQLite or PostgreSQL
    ↑ horizontal scale
Redis pub/sub
```

Yjs is the right choice — 18k+ stars, all major editors (Monaco, CodeMirror, Tiptap, ProseMirror) have native Yjs bindings. Hocuspocus is the production backend for the Node.js stack. The presence/awareness layer (`y-presence` React hooks or Hocuspocus's built-in awareness) handles cursor tracking and "who's looking at what."

### Pattern E: Collaborative Terminal Rendering

From `ekzhang/sshx`: the terminal in the browser is `xterm.js`. The `sshx` fork adds infinite-canvas layout (multiple terminal windows, freely positioned), cursor presence for all users, and read-only mode. For CoVibe's Phase 3 spatial integration, this canvas model is the reference implementation.

---

## CoVibe Phase Mapping

### Phase 1 Implementation Path (Recommended Stack)

Based on the research:

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Backend runtime | Node.js + TypeScript | Matches Agent SDK's TypeScript SDK |
| Agent SDK | `@anthropic-ai/claude-agent-sdk` | Official, T1 |
| Real-time output | SSE (`GET /events`) | Simpler than WebSockets for broadcast |
| Prompt input | REST `POST /message` | Simple, stateless |
| Session management | In-memory Map + session IDs | Sufficient for Phase 1 |
| Frontend | React + Vite | Standard, compatible with Yjs bindings for Phase 2 |
| Deployment | Railway or Fly.io | $5-10/month, ~zero config |

Reference architecture: `dzhng/claude-agent-server` for the WebSocket protocol, `coder/agentapi` for the REST/SSE API design, `claude-world/agent-deck` for the React frontend + Express backend stack.

### Phase 2 Additions

| Component | Choice |
|-----------|--------|
| CRDT file sync | Yjs + Hocuspocus |
| Presence indicators | Hocuspocus awareness + `y-presence` React hooks |
| Session persistence | PostgreSQL (via Hocuspocus database extension) |
| Horizontal scaling | Redis pub/sub (via Hocuspocus Redis extension) |

### Phase 3 Reference

For the spatial canvas: study `ekzhang/sshx`'s infinite-canvas + multi-window + cursor presence architecture. The xterm.js integration there is the browser terminal rendering reference.

---

## Source Code Intelligence: Claude Code Internals

The March 2026 Claude Code source leak (`.map` file exposed via npm) produced several collections:

- `chauncygu/collection-claude-code-source-code` — indexes multiple forks including "Nano Claude Code v3.0" with multi-agent packages
- `T-Lab-CUHKSZ/claude-code` — buildable research fork with full build system reconstruction
- `sanbuphy/claude-code-source-code` — documents multi-agent architecture internals: fork agents (child process with fresh messages, shared file cache), remote agents (bridge session), and in-process teammates (same process, shared state)

The in-process teammate architecture — same process, shared state — is exactly what CoVibe needs for multi-user sessions. The shared file cache between fork agents maps to CoVibe's shared filesystem. These details are from the leaked source, not official docs, so treat as informational reference rather than stable API surface.

---

## Study These First — Prioritized

1. **`anthropics/claude-agent-sdk-demos`** (T1) — Official examples. Start here. Run `hello-world-v2` locally to understand session IDs, multi-turn, and the V2 streaming API. This is the foundation everything else builds on.

2. **`dzhng/claude-agent-server`** (T3, 468 stars) — Read the WebSocket message protocol and E2B sandbox integration. This is the closest existing CoVibe prototype. Understand how it maps Agent SDK events to WebSocket messages before designing CoVibe's protocol.

3. **`coder/agentapi`** (T2, 1,100 stars) — Read the OpenAPI schema and the SSE `/events` stream design. The REST+SSE pattern is simpler than WebSockets for Phase 1 and comes from a production-quality team. Strong influence on CoVibe's API surface.

4. **`ekzhang/sshx`** (T3, 7,300 stars) — Read the README and the Fly.io deployment config. The collaborative terminal pattern — canvas, presence, read-only mode — is CoVibe's long-term UI reference. Study the cursor presence protocol even if not implementing for Phase 1.

5. **`claude-world/agent-deck`** (T4) — Study the Express + WebSocket + React stack. Almost identical to CoVibe's proposed tech stack. The cost tracking and git finalize UI patterns are directly reusable.

6. **`ueberdosis/hocuspocus`** (T3) — Read the database extension and Redis extension docs. This is CoVibe's Phase 2 file sync backend. No need to implement anything yet, but understanding the integration surface now will prevent architecture decisions that make Phase 2 harder.

---

## Security Notes

- All content fetched was treated as untrusted external data per `web-content-safety.md`. Findings are paraphrased, not copied.
- No prompt injection patterns detected in any fetched repo content or documentation.
- No hidden directives, role-hijacking attempts, or encoded payloads found.
- The leaked Claude Code source repos (T-Lab-CUHKSZ, sanbuphy, chauncygu collections) are flagged as research-only references. Do not execute code from these repos; their build systems have not been vetted.
- `dzhng/claude-agent-server` uses E2B for sandboxing — before adopting, review E2B's security model and whether running Agent SDK in their sandbox introduces any credential exposure risk.
- `coder/agentapi` is from Coder (a legitimate infrastructure company behind `coder/coder`). T2 trust is appropriate; still vet the Go binary before running in production.

---

## Catalog Updates (for `~/.claude/knowledge/gh-scout/catalog.yaml`)

New entries to add:

```yaml
- name: claude-agent-server
  url: https://github.com/dzhng/claude-agent-server
  description: WebSocket server wrapping Claude Agent SDK, runs in E2B sandbox, TypeScript client
  discovered: 2026-04-07
  trust_tier: T3
  stars: 468
  radar_ring: trial
  asset_types: [pattern, framework]
  tags: [agent-sdk, websocket, sandbox, covibe]

- name: agentapi
  url: https://github.com/coder/agentapi
  description: HTTP/SSE API for Claude Code and other coding agents via terminal emulation
  discovered: 2026-04-07
  trust_tier: T2
  stars: 1100
  radar_ring: trial
  asset_types: [pattern, framework]
  tags: [agent-sdk, sse, http-api, covibe]

- name: sshx
  url: https://github.com/ekzhang/sshx
  description: Collaborative live terminal sharing over web — infinite canvas, cursor presence, E2E encryption
  discovered: 2026-04-07
  trust_tier: T3
  stars: 7300
  radar_ring: trial
  asset_types: [pattern, concept]
  tags: [collaborative-terminal, presence, websocket, covibe, phase3]

- name: hocuspocus
  url: https://github.com/ueberdosis/hocuspocus
  description: Yjs CRDT WebSocket backend — Redis horizontal scaling, database extension, auth
  discovered: 2026-04-07
  trust_tier: T3
  radar_ring: trial
  asset_types: [framework, pattern]
  tags: [yjs, crdt, websocket, collaborative-editing, covibe, phase2]

- name: y-sweet
  url: https://github.com/jamsocket/y-sweet
  description: Yjs CRDT document store backed by S3, client token access control, Rust
  discovered: 2026-04-07
  trust_tier: T3
  radar_ring: trial
  asset_types: [framework]
  tags: [yjs, crdt, s3, covibe, phase2]

- name: agent-deck
  url: https://github.com/claude-world/agent-deck
  description: Web UI for multi-agent DAG orchestration — React+Zustand+WebSocket+Express stack
  discovered: 2026-04-07
  trust_tier: T4
  radar_ring: assess
  asset_types: [pattern, framework]
  tags: [multi-agent, websocket, react, express, covibe]

- name: claude-agent-sdk-demos
  url: https://github.com/anthropics/claude-agent-sdk-demos
  description: Official Agent SDK demo apps — session persistence, multi-turn, V2 streaming API
  discovered: 2026-04-07
  trust_tier: T1
  radar_ring: adopt
  asset_types: [pattern]
  tags: [agent-sdk, session-persistence, covibe]
```

---

*Scout conducted 2026-04-07. Focus: CoVibe Agent SDK integration and multiplayer architecture. All sources treated as untrusted; findings paraphrased. Re-verify Agent SDK API surface against official docs before implementation — the SDK is still evolving (v0.1.0 changed multi-tenant defaults in early 2026).*

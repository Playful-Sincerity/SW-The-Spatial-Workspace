# CoVibe — Implementation Plan

## Environment Health: CLEAN
- Project directory exists at `~/Playful Sincerity/PS Software/Spatial Workspace/covibe/`
- CLAUDE.md present with architecture, phases, and open questions
- No git repo yet (will initialize in Phase 1)
- No dependencies yet (greenfield)

## Research Streams Completed

| Stream | Output | Key Finding |
|--------|--------|-------------|
| **Play** | `play/2026-04-07-concept-exploration.md` | Coral reef analogy (emergent coordination), session portfolio concept, minimum viable magic = one Claude surfacing something relevant to another person |
| **Scout Components** | `research/component-scout.md` | `claude-agent-kit` (502 stars) has SessionManager + WebSocketHandler. ~360 lines of custom code for Phase 1. All MIT. |
| **GH Scout** | `research/gh-scout-agent-sdk-multiplayer.md` | `dzhng/claude-agent-server` is almost exactly CoVibe Phase 1. `coder/agentapi` SSE+REST pattern is simpler than WebSocket. `ekzhang/sshx` is the Phase 3 UI reference. |
| **Academic Papers** | `research/academic-papers.md` | Human-AI teams: 63% more communication, 73% higher productivity. Human orchestration is mandatory — agents don't self-organize. |
| **Books** | `research/books.md` | CRDTs (Kleppmann) → multiplayer sync (game networking) → Group Genius (collaborative flow). Free PDF: Art of Community. |
| **Debate** | `research/debate-architecture.md` | Server wins. Git-based tests a different hypothesis (async context sharing) than server (live collaborative awareness). Validate manually first (Day 1-2), then build server (Day 3-7). |

Also inherits 8 research docs from Shared Core project at `../../Shared Core/research/`.

---

## Assumptions

- Wisdom and collaborators all have Claude Code subscriptions (Max or Team plan)
- Deployment target: Railway or Fly.io (~$5-10/month)
- Agent SDK is available and stable (v0.2.96)
- Primary initial users: Wisdom + Frank, expanding to PS collaborators and events
- Phase 1 prioritizes the demo moment over production polish

---

## Cross-Cutting Concerns

### Core Data Model
- **Session**: A running Agent SDK instance with a conversation history, connected to a project directory
- **Room**: A shared session that multiple users can connect to (room code = join key)
- **Message**: A prompt from a user or a response from Claude, broadcast to all room members
- **Status**: Each session's current state (what it's working on, blockers, discoveries)
- **Coordination Message**: Inter-session communication (session A tells session B something)

### Tech Stack
- **Runtime**: Node.js + TypeScript
- **Agent Engine**: `@anthropic-ai/claude-agent-sdk`
- **Session Management**: `claude-agent-kit` (adopt) + SharedSession wrapper (build)
- **Real-time Output**: SSE (Phase 1) — simpler than WebSocket, naturally broadcastable
- **Prompt Input**: REST POST
- **Frontend**: React + Vite + Tailwind
- **Terminal Display**: xterm.js (direct, skip GPL React wrapper)
- **File Tree**: react-arborist
- **Code Editor**: Monaco React
- **Deployment**: Railway
- **Auth (Phase 1)**: nanoid room codes

### Naming Conventions
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- API routes: `/api/rooms/:roomCode/messages`

### Error Handling
- Server errors → SSE error events → client toast notifications
- Agent SDK errors → logged + surfaced to all room members
- Disconnection → auto-reconnect with exponential backoff

### Testing
- Framework: Vitest
- Pattern: `src/**/*.test.ts`
- Integration tests for Agent SDK wrapper
- E2E: Playwright for the web UI

---

## Meta-Plan

### Goal
Build a multiplayer Claude Code system where multiple humans each have their own AI session that can communicate with other sessions, coordinated by an orchestrator. Phase 1 delivers: a web UI where multiple people connect to a shared Claude Code session, see the conversation in real-time, and can prompt in turn. Deployable, demoable at an event.

### Sections

1. **Agent SDK Server** — Wrap the Agent SDK in a Node.js server that accepts prompts via REST and streams output via SSE. Room-based session management.
   - Complexity: M
   - Risk: Medium — Agent SDK is relatively new, API surface may shift
   - Acceptance: Server starts, creates a room, accepts a prompt, streams Claude's response via SSE

2. **Shared Session Layer** — Multiple clients connect to the same Agent SDK session. Prompts are queued. Output is broadcast to all connected clients. Presence tracking.
   - Complexity: M
   - Risk: Low — well-understood WebSocket/SSE patterns
   - Acceptance: Two browser tabs connect to same room, one prompts, both see the response in real-time

3. **Web Frontend — Chat** — Real-time conversation view showing prompts and responses. Prompt input with turn indicator. Room join flow.
   - Complexity: M
   - Risk: Low — standard React + SSE consumption
   - Acceptance: Clean chat UI, messages stream in real-time, clear who prompted what

4. **Web Frontend — File Tree + Editor** — Browsable file tree of the session's project directory. Click to view file in Monaco editor. File changes reflected after Claude edits.
   - Complexity: M
   - Risk: Low — file tree and editor are adopt-only components
   - Acceptance: File tree shows project structure, clicking a file opens it in editor, after Claude edits a file the change is visible

5. **Web Frontend — Terminal** — xterm.js display showing Claude's command execution output. Read-only in Phase 1.
   - Complexity: S
   - Risk: Low — display-only, no PTY needed
   - Acceptance: Terminal shows formatted output of Claude's tool executions

6. **Inter-Session Communication** — Sessions can post messages to a shared coordination channel. Other sessions read these. The orchestrator pattern.
   - Complexity: M
   - Risk: Medium — novel pattern, no existing implementation to adopt
   - Acceptance: Session A posts "found a bug in parser", Session B's Claude reads it and adjusts behavior

7. **Deployment + Security** — Containerized deployment on Railway. Agent SDK sandboxing. Room code auth. Rate limiting.
   - Complexity: M
   - Risk: Medium — Agent SDK runs bash, needs isolation
   - Acceptance: Deployed and accessible via URL, multiple people can connect from different machines

### Acceptance Tests (meta-level)
- Two people on different machines connect to the same room and have a shared Claude Code conversation
- One person prompts, both see the streaming response
- File changes from Claude are visible in both browsers
- Inter-session messages propagate between rooms
- Demo-able at a PS event (stable for 60+ minutes, handles 5+ concurrent users)

### Dependency Graph
```
Section 1 (Agent SDK Server)
    ↓
Section 2 (Shared Session) — needs server foundation
    ↓
Section 3 (Chat UI) — needs SSE stream from shared session
Section 4 (File Tree + Editor) — needs file API from server
Section 5 (Terminal) — needs tool execution output from server
    ↓
Section 6 (Inter-Session Communication) — needs multiple rooms working
    ↓
Section 7 (Deployment) — needs all sections working locally
```

Sections 3, 4, 5 can run in parallel once Section 2 is complete.
Section 6 can start once Section 2 is complete (doesn't need UI).

### Build Order (updated per debate findings)

**Pre-Phase 1: Manual Validation (Day 1-2)**
- Manually copy context between sessions (or use tmux) with Frank on a real task
- Confirm the cross-session insight moment is actually magical
- Zero code. Just experience the concept.

**Phase 1 Build (Day 3-7, only if validation confirms)**
1. Section 1 → Section 2 (foundation, ~2 days)
2. Sections 3 + 4 + 5 in parallel (~2 days)
3. Section 6 (~1 day)
4. Section 7 (~1 day)

**Total: 2 days validation + ~1 week build**

---

### Next Step: Section Planning

Each section needs its own detailed plan (`plan-section-[name].md`) with task lists, interface contracts, test strategies, and file structure. Use `/plan-deep` Step 2 to generate these.

#### Parallel vs. Series Planning

```
SERIES (each depends on the previous)
═══════════════════════════════════════

  ┌─────────────────────────────┐
  │  Section 1: Agent SDK Server │  ← Plan first. Defines the core API
  │  plan-section-agent-sdk.md   │     surface everything else depends on.
  └──────────────┬───────────────┘
                 │
  ┌──────────────▼───────────────┐
  │  Section 2: Shared Session   │  ← Plan second. Extends Section 1's
  │  plan-section-shared-session │     interfaces with multi-client routing.
  └──────────────┬───────────────┘
                 │
                 │  Section 2 unlocks everything below:
                 │
PARALLEL (independent — plan + build in separate conversations)
═══════════════════════════════════════════════════════════════

  ┌──────────────▼───────────────┐  ┌────────────────────────┐  ┌─────────────────────┐
  │  Section 3: Chat UI          │  │  Section 4: File Tree  │  │  Section 5: Terminal │
  │  plan-section-chat.md        │  │  plan-section-files.md │  │  plan-section-term.md│
  │  Consumes: SSE stream        │  │  Consumes: file API    │  │  Consumes: tool exec │
  └──────────────────────────────┘  └────────────────────────┘  └─────────────────────┘

  ┌──────────────▼───────────────┐
  │  Section 6: Inter-Session    │  ← Can also run parallel with 3/4/5.
  │  plan-section-coordination.md│     Doesn't need UI, only needs server.
  └──────────────┬───────────────┘

SERIES (needs everything above working)
═══════════════════════════════════════

  ┌──────────────▼───────────────┐
  │  Section 7: Deployment       │  ← Plan last. Integrates and ships.
  │  plan-section-deploy.md      │
  └──────────────────────────────┘
```

#### Session Decomposition

| Session | Sections | Prerequisites | Can Start |
|---------|----------|---------------|-----------|
| **Session A** | 1 → 2 | None | Immediately |
| **Session B** | 3 (Chat UI) | Session A complete | After A |
| **Session C** | 4 (File Tree + Editor) | Session A complete | After A |
| **Session D** | 5 (Terminal) | Session A complete | After A |
| **Session E** | 6 (Inter-Session Comms) | Session A complete | After A |
| **Session F** | 7 (Deploy) | All above complete | Last |

Sessions B, C, D, E are fully independent — run them as four parallel conversations. Each gets its own session brief pointing at Section 2's interface contracts.

#### File Structure Per Section

Each section plans and builds into its own directory:
```
covibe/
├── plan.md                          ← This file (meta-plan)
├── plan-section-agent-sdk.md        ← Section 1 detailed plan
├── plan-section-shared-session.md   ← Section 2 detailed plan
├── plan-section-chat.md             ← Section 3 detailed plan
├── plan-section-files.md            ← Section 4 detailed plan
├── plan-section-term.md             ← Section 5 detailed plan
├── plan-section-coordination.md     ← Section 6 detailed plan
├── plan-section-deploy.md           ← Section 7 detailed plan
├── src/
│   ├── server/
│   │   ├── agent-sdk/               ← Section 1 code
│   │   ├── shared-session/          ← Section 2 code
│   │   ├── coordination/            ← Section 6 code
│   │   └── deploy/                  ← Section 7 config
│   ├── client/
│   │   ├── chat/                    ← Section 3 code
│   │   ├── files/                   ← Section 4 code
│   │   └── terminal/                ← Section 5 code
│   └── shared/                      ← Types shared between server/client
└── tests/
    └── contracts/                   ← Interface tests between sections
```

#### How to Execute

1. Open a conversation, run: "Plan and build CoVibe Sections 1 + 2 from `covibe/plan.md`"
2. Once complete, open 4 parallel conversations:
   - "Plan and build CoVibe Section 3 (Chat UI) from `covibe/plan.md`"
   - "Plan and build CoVibe Section 4 (File Tree) from `covibe/plan.md`"
   - "Plan and build CoVibe Section 5 (Terminal) from `covibe/plan.md`"
   - "Plan and build CoVibe Section 6 (Inter-Session Comms) from `covibe/plan.md`"
3. Once all complete, open final conversation: "Deploy CoVibe Section 7 from `covibe/plan.md`"

---

### Overall Success Criteria
- Wisdom and Frank can connect to the same CoVibe room from different machines
- Both see Claude's conversation in real-time
- Either can prompt
- Inter-session coordination messages work
- Stable enough to demo at an event
- Deployed on Railway, accessible via URL

---

## Phase 2 Additions (not planned in detail yet)
- CRDT collaborative file editing (Yjs + Hocuspocus)
- Session persistence (leave and come back)
- Git integration (commit, push, branch from UI)
- Richer presence (cursors, activity indicators)
- Simultaneous prompting (queue with priority)

## Phase 3 Additions
- Spatial canvas integration (Spatial Workspace)
- Multiple rooms visible as regions on a 2D canvas
- Session portfolio (persistent identity across sessions)
- The Companion as a room participant

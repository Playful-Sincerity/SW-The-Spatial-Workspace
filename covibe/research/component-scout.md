# CoVibe — Component Scout
**Date:** 2026-04-07
**Scouted for:** Claude Agent SDK server wrapper, session manager, WebSocket server, message bus, file watcher, chat UI, file tree, code editor, terminal emulator, presence indicators, CRDT library, git integration, auth primitives

---

## Summary

- 12 component categories searched, 20+ repos analyzed
- 8 components directly adoptable (copy or thin-wrap)
- 3 components need adaptation
- 3 things to build from scratch (turn management, multi-session routing, presence aggregator)
- One standout: **claude-agent-kit** (JimLiu/claude-agent-kit) — a community-built TypeScript library that already solves the hardest part: SessionManager + WebSocketHandler + multi-client broadcasting on top of the Agent SDK

---

## Composition Table

| Component | Source | Action | License | Notes |
|-----------|--------|--------|---------|-------|
| Agent SDK server | `@anthropic-ai/claude-agent-sdk` | Adopt | Commercial ToS | Foundation — v0.2.96, 1.2k stars |
| Session manager + WS bridge | `JimLiu/claude-agent-kit` | Adopt | MIT | 502 stars — SessionManager + WebSocketHandler already built |
| Official chat app reference | `anthropics/claude-agent-sdk-demos/simple-chatapp` | Learn | MIT | React + Express + WS, in-memory ChatStore |
| Terminal emulator | `xtermjs/xterm.js` | Adopt | MIT | 20.3k stars, industry standard (Replit, Azure) |
| xterm React wrapper | `Qovery/react-xtermjs` | Avoid | GPL-3.0 | License incompatible — wrap xterm.js directly |
| File tree | `brimdata/react-arborist` | Adopt | MIT | 3.6k stars, drag-drop, rename, virtualized |
| Code editor | `suren-atoyan/monaco-react` | Adopt | MIT | Most popular Monaco React wrapper |
| CRDT engine | `yjs/yjs` | Adopt (Phase 2) | MIT | 17k stars, de facto standard |
| CRDT WS server | `ueberdosis/hocuspocus` | Adopt (Phase 2) | MIT | 2k stars, plug-and-play Yjs backend |
| Editor CRDT binding | `yjs/y-codemirror.next` | Adopt (Phase 2) | MIT | Official Yjs CodeMirror 6 binding |
| File watcher | `paulmillr/chokidar` | Adopt | MIT | 11.6k stars, 30M repos use it, v5 ESM-only |
| Git integration | `isomorphic-git/isomorphic-git` | Adopt | MIT | 8.1k stars, pure JS, works in Node + browser |
| Presence indicators | Liveblocks React hooks | Adopt primitives | Apache 2.0 | Use their open-source client libs; build own server |
| Real-time infra (alt) | `partykit/partykit` | Learn | MIT | Cloudflare-hosted — learn patterns, don't adopt for self-hosted |
| Turn management | Build | — | — | No existing component fits CoVibe's model |
| Multi-session routing | Build (thin layer on agent-kit) | — | — | agent-kit has per-client sessions, not shared sessions |
| Auth (Phase 1) | Build (simple codes) | — | — | nanoid-generated room codes, no library needed |

---

## Per-Component Analysis

### 1. Claude Agent SDK
**Need:** The engine — runs Claude Code, handles tools, file system, bash  
**Source:** `anthropics/claude-agent-sdk-typescript` — `npm install @anthropic-ai/claude-agent-sdk`  
**Action:** Adopt  
**License:** Anthropic Commercial ToS (permissive for building on top of it)  
**Why:** It's the foundation. No alternative — CoVibe is defined as "built on the Agent SDK."  
**Key patterns:** Session API has `send()` / `stream()` methods. Sessions persist to `.claude/projects/*.jsonl` automatically, enabling session resumption. Node 18+ required. v0.2.96 as of April 8, 2026.  
**Critical note:** The Agent SDK process has full Bash, file system, and network access. In production, it must run in an isolated container — the demos README calls this out explicitly. This is a security architecture requirement, not optional.

### 2. claude-agent-kit (SessionManager + WebSocket)
**Need:** Session manager + WebSocket bridge for multi-client real-time communication  
**Source:** `JimLiu/claude-agent-kit` — packages: `@claude-agent-kit/server`, `@claude-agent-kit/websocket`  
**Action:** Adopt  
**License:** MIT  
**Stars:** 502 | **Last commit:** recent (main branch active)  
**Why:** This is the highest-leverage find. Someone already built the exact abstraction CoVibe needs — `SessionManager` (one session per client ID, JSONL persistence), `Session` (streaming, message tracking, multi-subscriber broadcasting), and `WebSocketHandler` (parses chat/resume/setSDKOptions messages, routes to session, broadcasts state changes). Also has a Bun variant.  
**Key patterns:**
- `SessionManager.getOrCreateSession(sessionId)` — idempotent session creation
- Sessions emit `message_added`, `messages_updated`, `session_state_changed` events
- `WebSocketHandler` uses a `Map<WebSocket, WebSocketSessionClient>` for connection tracking
- Session resume loads historical JSONL transcripts from `.claude/projects/`
- Input validation: trims empty messages, JSON parse errors return structured error responses
**Adaptation needed:** agent-kit gives each client their own session. CoVibe needs a shared session — multiple clients attached to one Agent SDK session. The architecture supports this (sessions have a subscriber list), but you'll need to add a "shared session ID" routing layer on top. Thin adaptation, not a rewrite.  
**Security notes:** No rate limiting or auth in the WebSocket handler layer — add this before production. Sessions are isolated per-client by default, which is good.

### 3. Anthropic simple-chatapp (Reference)
**Need:** Working reference for Agent SDK + Express + WebSocket full stack  
**Source:** `anthropics/claude-agent-sdk-demos/simple-chatapp`  
**Action:** Learn  
**License:** MIT  
**Why:** Official Anthropic demo. React (Vite) frontend + Express backend + WebSocket streaming + in-memory ChatStore. The architecture diagram and production notes (isolate agent to separate container, replace ChatStore with DB) are valuable. Use as the baseline architecture pattern before layering in claude-agent-kit's session management.  
**Key patterns:** Runs server on port 3001, client on 5173. Single in-memory ChatStore — replace with PostgreSQL or Redis for persistence.  
**Adaptation needed:** This is single-user. The multi-user layer comes from claude-agent-kit.

### 4. xterm.js (Terminal Emulator)
**Need:** Browser terminal that shows Claude's command execution  
**Source:** `xtermjs/xterm.js` — `npm install @xterm/xterm`  
**Action:** Adopt  
**License:** MIT  
**Stars:** 20.3k | **Last updated:** active  
**Why:** Industry standard. Used by Replit, Azure Cloud Shell, Azure Data Studio, VS Code. Zero dependencies. Handles bash, vim, tmux, curses, mouse events. GPU-accelerated rendering via `@xterm/addon-webgl`.  
**Key patterns:** `term.open(domElement)` to mount. `term.onData(cb)` captures keystrokes to send to backend. Backend writes to `term.write(data)`. Requires `node-pty` on the server side for actual PTY (xterm.js is display-only).  
**Integration:** WS sends PTY output → `term.write()`. `term.onData()` → WS → PTY input. Standard pattern.  
**React wrapper:** Do NOT use `Qovery/react-xtermjs` (GPL-3.0 — license incompatible). Write a thin React wrapper yourself: `useEffect` mounting xterm.js into a div ref. ~30 lines.  
**Security notes:** xterm.js itself is display-only — no execution risk. The PTY backend is where isolation matters.

### 5. react-arborist (File Tree)
**Need:** Browsable file tree with real-time updates  
**Source:** `brimdata/react-arborist` — `npm install react-arborist`  
**Action:** Adopt  
**License:** MIT (not explicitly stated in README but confirmed via npm)  
**Stars:** 3.6k | **Activity:** active (164 commits)  
**Why:** Most capable React tree component available. Handles drag-drop, inline rename, virtualized rendering (handles huge trees), keyboard navigation, search/filter. Controlled component pattern means you can push file system updates from WebSocket and the tree re-renders.  
**Key patterns:**
- `data` prop = your file tree state (controlled)
- `onCreate`, `onRename`, `onMove`, `onDelete` callbacks for mutations
- `onActivate` for file open events
- Pass updated `data` from WS file-change events for live updates
**Adaptation needed:** File system data structure needs to match arborist's expected `{id, name, children}` shape — write a normalizer from `chokidar` events to arborist tree format.

### 6. Monaco Editor (Code Editor)
**Need:** Syntax-highlighted code editor for viewing/editing files  
**Source:** `suren-atoyan/monaco-react` — `npm install @monaco-editor/react`  
**Action:** Adopt  
**License:** MIT  
**Stars:** 4k+ (most popular Monaco React wrapper)  
**Why:** VS Code's editor in a React component with zero webpack config. The `@monaco-editor/react` package handles CDN loading, so no bundler plugin needed. Syntax highlighting for all languages Claude works with.  
**Key patterns:** `<Editor language="typescript" value={fileContent} onChange={handleChange} />`. Controlled via `value` prop. For Phase 2 CRDT: bind `y-monaco` (the Yjs Monaco binding) to get collaborative editing.  
**Adaptation needed (Phase 2):** Add `y-monaco` binding when CRDT is introduced. For Phase 1 (view + single-user edit), use as-is.

### 7. Yjs + Hocuspocus (CRDT — Phase 2)
**Need:** Collaborative file editing without merge conflicts  
**Source:** `yjs/yjs` + `ueberdosis/hocuspocus` + `yjs/y-codemirror.next`  
**Action:** Adopt in Phase 2  
**License:** All MIT  
**Stars:** yjs 17k, hocuspocus 2k  
**Why:** Yjs is the dominant CRDT library in the JavaScript ecosystem. Hocuspocus is its production-ready WebSocket server backend — plug-and-play, handles persistence hooks, auth, awareness (presence data). The `y-codemirror.next` binding connects Yjs to CodeMirror 6 (lighter than Monaco, good for Phase 2 collab editing). Monaco also has a Yjs binding (`y-monaco`) if staying with Monaco.  
**Key patterns:**
- Hocuspocus server: `new Server({ port: 1234 }).listen()`
- Client: `new HocuspocusProvider({ url, name: documentName, doc: ydoc })`
- Editor binding: `new CodemirrorBinding(ytext, editor, awareness)`
- Awareness protocol = free presence layer (who's in which document, cursor positions)
**Integration into CoVibe:** Phase 2 adds a Hocuspocus server alongside the Agent SDK server. File edits go through Yjs; Agent SDK file writes broadcast as Yjs updates.

### 8. chokidar (File Watcher)
**Need:** Detect file changes made by Claude, broadcast to clients  
**Source:** `paulmillr/chokidar` — `npm install chokidar`  
**Action:** Adopt  
**License:** MIT  
**Stars:** 11.6k | **npm downloads:** used in 30M repos  
**Why:** The standard Node.js file watcher. Vite, webpack, Jest, and VS Code all use it. Non-polling by default (uses `inotify`/`FSEvents`). v5 is ESM-only, Node 20+. If targeting Node 18, use v4.  
**Key patterns:** `chokidar.watch('./project').on('change', path => broadcast({type:'file_change', path}))`. Add/change/unlink events map cleanly to file tree updates.

### 9. isomorphic-git (Git Integration)
**Need:** Commit, push, branch from the web UI  
**Source:** `isomorphic-git/isomorphic-git` — `npm install isomorphic-git`  
**Action:** Adopt  
**License:** MIT  
**Stars:** 8.1k  
**Why:** Pure JavaScript git — works in both Node.js (server-side, which is what we need) and browser. No native dependencies. 100% compatible with standard git repos. For CoVibe Phase 1/2, server-side git operations are sufficient — no need for browser-side git.  
**Key patterns:** `git.commit({fs, dir, message, author})`. All operations are async. Supports clone, fetch, push, pull, branch, log, status, diff.  
**Caveat:** For browser-side git (pushing from browser without hitting CoVibe server), needs a CORS proxy. For server-side use, no proxy needed.  
**Adaptation needed:** Build a thin REST API layer exposing `commit`, `push`, `createBranch`, `log` operations — these map 1:1 to isomorphic-git calls.

### 10. Presence Indicators
**Need:** Show who's connected, who's actively prompting  
**Source:** Liveblocks React client libs (`@liveblocks/client`, `@liveblocks/react`) — Apache 2.0  
**Action:** Use their patterns, build own server  
**Why:** Liveblocks has excellent React hooks (`useOthers`, `useUpdateMyPresence`) and open-sourced their core sync engine under AGPL. Their self-hosted path is not production-ready yet, and their cloud requires paid tiers at scale. However, the presence model — each client publishes cursor position + active state, server broadcasts to room — is simple enough to implement directly on the existing WebSocket layer.  
**Recommended approach for Phase 1:** Add a `presence` message type to the WebSocket protocol. Each client sends `{type: 'presence', userId, data: {isPrompting, activeFile, cursorLine}}`. Server keeps a `Map<sessionId, Map<userId, presence>>` and broadcasts full presence state on any change. No library needed — ~60 lines.  
**For Phase 2:** If presence gets complex (live cursors in editor, scrolled-to position), adopt Liveblocks patterns or use Hocuspocus awareness protocol (it's bundled with Yjs — free).

---

## Build-from-Scratch Items

### Turn Management
No existing component fits CoVibe's model. Need to decide and build:
- **Free-for-all:** Any client can send a prompt anytime. Server queues them. Simplest.
- **Lock-based:** Client claims a "turn lock" before prompting. Others see "Frank is prompting..." UI. Prevents conflicts.
- **Round-robin:** Explicit turn order. Most structured but least natural.

Recommendation: Start with free-for-all with a queue. Implement as a small state machine on top of the SessionManager. ~100 lines.

### Multi-Session Shared Session Routing
claude-agent-kit gives each client their own Agent SDK session. CoVibe needs multiple clients sharing one session. Build a thin routing layer:
- `SharedSession` class wraps an Agent SDK session + subscriber list
- `SharedSessionManager` maps room codes to `SharedSession` instances
- Clients join a room code → get subscribed to that `SharedSession`
- One client's prompt goes to the shared Agent SDK session
- All subscribers receive streaming responses
- ~150 lines, sits on top of claude-agent-kit's Session class

### Room Code Auth (Phase 1)
No library needed. Use `nanoid` (MIT, 21 chars of URL-safe randomness) to generate room codes. Server keeps a `Map<roomCode, SharedSession>`. Clients join with `?room=ABC123`. ~20 lines.

---

## Critical Implementation Details

From reading other people's code:

1. **Agent SDK isolation is non-negotiable.** Every source (official demos, community kit) flags this: the Agent SDK process can execute arbitrary bash. Put it in a container with a restricted filesystem view. If CoVibe is multi-user, one user's agent could affect another's files.

2. **JSONL persistence is built-in.** The Agent SDK writes session transcripts to `.claude/projects/` automatically. Session resumption (leave and come back) is free — just pass the same `sessionId` to `getOrCreateSession()`.

3. **xterm.js ≠ bash.** xterm.js is a display renderer. You need `node-pty` on the server to create an actual PTY, then pipe its output to xterm.js via WebSocket. For Phase 1 (showing Claude's tool execution), you can show tool call results as formatted text in xterm.js without a full PTY — simpler.

4. **Yjs awareness = free presence for Phase 2.** When you add Hocuspocus for CRDT editing, awareness protocol is bundled. Each peer publishes arbitrary JSON state (cursor position, active file, username). This replaces any custom presence system — don't build presence separately if Phase 2 CRDT is on the roadmap.

5. **React-arborist needs a stable ID per file node.** Use file path as the ID. When chokidar fires a rename event, update the path-keyed entry — arborist will animate the change correctly.

6. **claude-agent-kit's session resume loads `.claude/projects/` JSONL.** This means if the CoVibe server restarts, clients can resume where they left off by passing their `sessionId` in a `{type: "resume", sessionId}` WebSocket message. Persistence is free.

---

## Dependency Map and Build Order

```
Phase 1 (Week 1-2)
  @anthropic-ai/claude-agent-sdk        ← foundation
    └── @claude-agent-kit/server        ← session management
    └── @claude-agent-kit/websocket     ← WS bridge
          └── SharedSession layer       ← BUILD: multi-client shared session
          └── TurnManager               ← BUILD: prompting queue
  chokidar                              ← file watcher → WS broadcast
  nanoid                                ← room code generation
  
  React frontend:
    react-arborist                      ← file tree
    @monaco-editor/react                ← code viewer/editor
    xterm.js (manual React wrap)        ← terminal display
    Presence (custom, ~60 lines)        ← who's connected

Phase 2 (after Phase 1 working)
  yjs                                   ← CRDT foundation
  hocuspocus                            ← CRDT WS server
  y-codemirror.next                     ← editor CRDT binding
  (Yjs awareness replaces custom presence)

Phase 2 Git:
  isomorphic-git                        ← server-side git ops
  (thin REST API layer: commit/push/branch/log)
```

---

## Composition Map — Adopt vs. Build

| Category | Decision | Library | Effort |
|----------|----------|---------|--------|
| Agent SDK engine | Adopt | `@anthropic-ai/claude-agent-sdk` | Already exists |
| Session + WS management | Adopt | `claude-agent-kit` | 1-2 hours to integrate |
| Shared session routing | Build | (on top of agent-kit) | ~1 day |
| Turn management | Build | (state machine) | ~half day |
| File watcher | Adopt | `chokidar` | 1-2 hours |
| Terminal emulator | Adopt | `xterm.js` + manual wrap | ~2 hours |
| File tree | Adopt | `react-arborist` | ~2 hours |
| Code editor | Adopt | `@monaco-editor/react` | ~1 hour |
| Chat UI | Build | (built on top of WS + React) | ~1 day |
| Presence (Phase 1) | Build | (custom, ~60 lines) | ~2 hours |
| Auth (Phase 1) | Build | (nanoid room codes) | ~1 hour |
| CRDT editing (Phase 2) | Adopt | `yjs` + `hocuspocus` | ~1 day |
| Git UI (Phase 2) | Adopt | `isomorphic-git` + thin API | ~1 day |

**Total Phase 1 estimate:** ~1 week of focused building, given the heavy lifting done by claude-agent-kit.

---

## Security Quick Assessment

| Component | Risk | Notes |
|-----------|------|-------|
| Agent SDK | HIGH (by design) | Runs bash/file ops. Isolate in container. |
| claude-agent-kit | LOW | No suspicious patterns. MIT. Well-structured. No auth — add your own. |
| xterm.js | LOW | Display-only, MIT, 20k stars, enterprise-used |
| react-arborist | LOW | Pure UI, MIT |
| chokidar | LOW | Read-only file watching, MIT, 30M repo users |
| yjs/hocuspocus | LOW | MIT, widely audited |
| isomorphic-git | LOW | Pure JS git, MIT, 8k stars |
| claude agent-sdk-demos | LOW | Reference only, not used in prod |

**Key security action:** Before CoVibe goes live, the Agent SDK server must run in a container with a restricted filesystem mount — only the shared project directory should be accessible. Add rate limiting to the WebSocket handler. Add room code validation (constant-time comparison) to prevent enumeration.

---

## Sources

- [anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) — 1.2k stars, Anthropic Commercial ToS
- [anthropics/claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos) — 2.1k stars, MIT
- [JimLiu/claude-agent-kit](https://github.com/JimLiu/claude-agent-kit) — 502 stars, MIT, TypeScript
- [xtermjs/xterm.js](https://github.com/xtermjs/xterm.js) — 20.3k stars, MIT
- [Qovery/react-xtermjs](https://github.com/Qovery/react-xtermjs) — 104 stars, GPL-3.0 (avoid)
- [brimdata/react-arborist](https://github.com/brimdata/react-arborist) — 3.6k stars, MIT
- [suren-atoyan/monaco-react](https://github.com/suren-atoyan/monaco-react) — 4k+ stars, MIT
- [yjs/yjs](https://github.com/yjs/yjs) — 17k stars, MIT
- [ueberdosis/hocuspocus](https://github.com/ueberdosis/hocuspocus) — 2k stars, MIT
- [yjs/y-codemirror.next](https://github.com/yjs/y-codemirror.next) — official Yjs CM6 binding, MIT
- [paulmillr/chokidar](https://github.com/paulmillr/chokidar) — 11.6k stars, MIT
- [isomorphic-git/isomorphic-git](https://github.com/isomorphic-git/isomorphic-git) — 8.1k stars, MIT
- [partykit/partykit](https://github.com/partykit/partykit) — MIT, Cloudflare-hosted (patterns only)
- [liveblocks/liveblocks](https://github.com/liveblocks/liveblocks) — Apache 2.0 client libs (patterns only)

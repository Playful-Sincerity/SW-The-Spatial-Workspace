# CoVibe V1 — Collaborative Claude Code via Shared Repo

## What This Is

The simplest possible multiplayer Claude Code. No server, no Agent SDK, no deployment. Just your normal Claude Code instances coordinating through files in a shared GitHub repo, with a `/covibe` skill to manage the session and a hook to auto-push.

Everyone uses their own Claude Code subscription. Everyone uses their own VS Code or terminal. The shared repo is the only coordination layer.

## V2 Reference

The full Agent SDK server plan (web UI, SSE streaming, rooms) is preserved at `plan-v2-agent-sdk-server.md`. That becomes the next step if V1 proves the concept works.

---

## What We're Building

### 1. `/covibe` Skill
A skill that starts and manages a collaborative session. Flow:

```
User: /covibe start
Claude: What's the shared repo path? (or picks up from last session)
User: ~/projects/hha-shared
Claude: Got it. You are "wisdom" (from git config).
        Reading other sessions... Frank is working on API auth.
        Writing your session file. Auto-push enabled.
        What are you working on?
User: I'm going to fix the payment integration.
Claude: [writes to sessions/wisdom.md, reads frank.md, starts working]
        [from now on: reads others before major actions, writes status after, pushes constantly]
```

Other commands:
- `/covibe status` — show what everyone's working on right now
- `/covibe msg <text>` — post a message to the coordination channel
- `/covibe read` — read latest messages and session updates
- `/covibe end` — write final status, push, clean up

### 2. CoVibe Rule
A rule that enforces coordination behavior for the entire conversation once `/covibe start` is active. The rule makes Claude:

- **Identify**: read `git config user.name` at session start, use it everywhere
- **Announce**: write current task to `sessions/<name>.md` after each major action
- **Listen**: read all other `sessions/*.md` and `messages/*.md` before starting new work
- **Coordinate**: if another session's status overlaps with your work, flag it
- **Attribute**: all messages include `from:` identity
- **Boundary**: only write to your own session file, never edit others'

### 3. Auto-Push Hook
A hook that commits and pushes the covibe directory after every Claude tool call (or on a short timer). Maybe 10-15 lines of bash. The pull happens at session start and before each read of others' files.

### 4. Orchestrator Agent
A separate Claude Code instance (or a `/covibe orchestrate` command) that:
- Reads ALL session files and messages
- Sees the big picture of what everyone is doing
- Posts coordination messages: "Frank and Wisdom are both touching auth — coordinate"
- Identifies blockers, conflicts, and opportunities for cross-pollination
- Optionally runs on a timer or as a background agent

---

## Repo Structure

```
<shared-repo>/
├── .covibe/
│   ├── config.md              ← Project name, description, active participants
│   ├── sessions/
│   │   ├── wisdom.md          ← Wisdom's current status (auto-updated)
│   │   ├── frank.md           ← Frank's current status (auto-updated)
│   │   └── orchestrator.md    ← Orchestrator's synthesis (if running)
│   ├── messages/
│   │   ├── 001-wisdom.md      ← Timestamped coordination messages
│   │   ├── 002-frank.md
│   │   └── ...
│   └── archive/
│       └── 2026-04-08/        ← Previous day's sessions + messages
└── <project files>            ← The actual code being worked on
```

The `.covibe/` directory lives inside whatever repo the team is working on. It's not a separate repo — it's a coordination layer on top of the project.

---

## Session File Format

```markdown
---
user: wisdom
started: 2026-04-08 09:15
last_updated: 2026-04-08 09:42
status: active
---

## Current Task
Fixing payment integration in src/payments/stripe.ts

## Recent Actions
- Read the Stripe webhook handler (src/payments/webhooks.ts)
- Found a bug: webhook signature verification is skipped in dev mode but the flag leaks to production
- Fixing the environment check

## Blockers
None

## Discoveries
- The webhook signature bug could affect Frank's API auth work — posted a message about it

## Files Touched
- src/payments/stripe.ts
- src/payments/webhooks.ts
```

## Message Format

```markdown
---
from: wisdom
to: all
timestamp: 2026-04-08 09:42
---

Found a webhook signature verification bug that skips in dev mode but the flag leaks to production. Frank — this might affect your API auth work since they share the middleware chain. Check src/payments/webhooks.ts:47.
```

---

## Build Plan

### Step 1: The Skill (~2 hours)
Create `/covibe` at `~/.claude/skills/covibe/SKILL.md`

Commands:
- `start [repo-path]` — init session: read git identity, write session file, enable coordination mode
- `status` — pull latest, read all sessions, summarize
- `msg <text>` — write a message file, push
- `read` — pull latest, show new messages and session changes
- `end` — final status update, push, mark session inactive
- `orchestrate` — enter orchestrator mode (read all, coordinate, post synthesis)

### Step 2: The Rule (~1 hour)
Create `~/.claude/rules/covibe-coordination.md`

Activated when the skill sets a flag (e.g., writes a `.covibe-active` marker). Enforces:
- Identity from git config
- Read others before major work
- Write status after major actions
- Never edit others' session files
- Flag overlapping work

### Step 3: The Auto-Push Hook (~30 min)
Add to settings.json hooks. Triggers after Edit/Write/Bash tool calls. Checks if `.covibe-active` exists, if so commits and pushes `.covibe/` changes.

### Step 4: Test with Frank (~1 hour)
Both start `/covibe start` on the same repo. Work on different parts. See if coordination messages surface useful information.

### Step 5: Orchestrator (~2 hours)
Either a `/covibe orchestrate` mode or a background agent. Reads everything, posts synthesis messages, flags conflicts.

---

## Total Build: ~1 day

| Step | Time | What You Get |
|------|------|-------------|
| Skill | 2 hours | `/covibe` commands work |
| Rule | 1 hour | Coordination enforced throughout conversation |
| Hook | 30 min | Auto-push on every change |
| Test | 1 hour | Validate with Frank on a real task |
| Orchestrator | 2 hours | Big-picture coordination agent |

---

## Enforcement: How It Stays Active

The hardest part: making sure Claude actually keeps reading and writing coordination files throughout the conversation, not just at the start. Three mechanisms:

1. **The rule** loads into every message once active. It says "before starting any new task, read `.covibe/sessions/*.md`." This is a thinking habit, not a hook.

2. **The hook** fires after every tool call. If it detects covibe is active and the session file hasn't been updated in >5 minutes, it nudges Claude: "CoVibe: update your session status."

3. **The skill's `start` command** writes the coordination protocol into the conversation context explicitly — not just as a rule reference but as an active instruction: "For the rest of this conversation, you are in a CoVibe session. Your identity is X. Before each major action, read others' status. After each major action, update yours."

The combination of rule (always loaded) + hook (nudges on drift) + explicit context (from the skill) should keep it enforced. Same pattern as the chronicle rule.

---

## Open Questions

- How often should auto-push fire? Every tool call is aggressive but ensures near-real-time. Every 30 seconds is gentler on git history.
- Should the orchestrator be always-on (a separate terminal running `/covibe orchestrate` on a loop) or on-demand?
- Message numbering: simple counter (001, 002) or timestamp-based? Counter is simpler but doesn't survive concurrent writes well.
- Should this be a separate GitHub repo or a `.covibe/` directory inside the project repo?
- How does this interact with existing Claude Code rules and skills? Does `/covibe start` need to temporarily adjust other rules?

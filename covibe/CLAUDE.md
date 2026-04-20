# CoVibe — Multiplayer Claude Code

> **Moved to standalone repo.** The source of truth for CoVibe V1 is now at `~/Playful Sincerity/PS Software/CoVibe/` (GitHub: Playful-Sincerity/covibe). This directory retains the research, plans, and play outputs from the design phase. V2+ plans also live here.

## What This Is

A coordination system that lets multiple Claude Code sessions collaborate on the same project. Each person runs their own Claude Code with their own subscription. Sessions communicate through a shared job board and message system in the git repo, auto-pushed so everyone sees updates within seconds.

No server. No extra infrastructure. Just a `/covibe` skill, a coordination rule, an auto-push hook, and markdown files in the repo.

Eventually integrates into Spatial Workspace as the collaborative project management and editing layer.

## The Problem

When Frank runs a big agentic research project on his machine, Wisdom can't jump in and contribute. Each Claude Code session is single-player. Collaborators have to wait, hand off, or work in separate sessions that don't share context. There's no way to decompose a project into parallel jobs, claim work, or coordinate in real-time.

## The Vision

An orchestrator decomposes a project into jobs. Individual Claude Code sessions browse the job board, claim work, execute it, and push results. Messages flow between sessions for coordination. Reviews happen as separate jobs. Everything lives in git — branches, PRs, merge to main are human decisions.

```
Orchestrator decomposes project → Jobs posted to .covibe/jobs/
    ↓
Individual sessions browse jobs, claim one
    ↓
Claimed → Working → Review → Approved → Done
    ↓
Review jobs picked up by different sessions/people
    ↓
Approved work gets PR'd to main
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Orchestrator Session (one person or background)      │
│  - Reads all sessions, jobs, messages                 │
│  - Decomposes project into jobs with folder structure │
│  - Posts coordination messages                        │
│  - Reassigns, splits, or merges jobs as needed        │
└──────────────────────┬───────────────────────────────┘
                       │ git push/pull
                       ▼
┌──────────────────────────────────────────────────────┐
│  Shared Repo (.covibe/ directory)                     │
│  ├── config.md          ← project, participants       │
│  ├── jobs/              ← job files with frontmatter  │
│  ├── sessions/          ← each user's current status  │
│  ├── messages/          ← coordination messages        │
│  └── archive/           ← completed sessions/jobs      │
└──────────────────────┬───────────────────────────────┘
                       │ git push/pull
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Wisdom's    │ │  Frank's     │ │  Rayyan's    │
│  Claude Code │ │  Claude Code │ │  Claude Code │
│  /covibe     │ │  /covibe     │ │  /covibe     │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Components

### `/covibe` Skill
- `start [repo-path]` — init session, read git identity, join the project
- `status` — pull latest, show all sessions and job board
- `claim <job-id>` — claim a job, set status to "working"
- `msg <text>` — post a coordination message
- `read` — pull latest messages and session changes
- `done` — mark current job as ready for review
- `end` — close session, final push
- `orchestrate` — enter orchestrator mode

### CoVibe Coordination Rule
Enforces throughout the conversation:
- Identity from git config (never edits others' files)
- Read job board and others' sessions before major work
- Update own session file after major actions
- Flag overlapping work with other sessions

### Auto-Push Hook
Commits and pushes `.covibe/` changes after tool calls. Nudges Claude if session file goes stale (>5 min without update).

### Job Board
Jobs are markdown files with frontmatter tracking state, assignment, dependencies, branch, and folder. Multiple people can work the same job (parallel branches, reconciler merges). Jobs can be split or merged by the orchestrator mid-project.

## Phases

### V1 (Now) — Git-based coordination
Skill + rule + hook. No new infrastructure. Buildable in a day. Test with Frank on a real project.

### V2 (Later) — Agent SDK server
Web UI wrapping the Agent SDK. Shared sessions, SSE streaming, rooms. See `plan-v2-agent-sdk-server.md`.

### V3 (Future) — Spatial Workspace integration
Job board, sessions, and file tree rendered on a 2D spatial canvas. The spatial project management layer.

## Relationship to Other Projects

- **Spatial Workspace** (parent) — CoVibe is the collaborative layer. V3 renders everything spatially.
- **Shared Core** — Shared rules/skills/knowledge that load into every session. CoVibe coordinates the work; Shared Core shapes the behavior.
- **The Companion** — Could join as a persistent participant in CoVibe sessions.
- **HHA** — First real use case. CoVibe coordinates Wisdom + Frank on client projects.
- **PS Events** — Event format: room full of people, each with Claude Code, all coordinating through CoVibe on one project.

## Directory Structure
```
covibe/
├── CLAUDE.md                          ← This file
├── plan.md                            ← V1 implementation plan
├── plan-v2-agent-sdk-server.md        ← V2 plan (Agent SDK server)
├── research/                          ← All background research
│   ├── project-management-patterns.md ← PM software patterns
│   ├── component-scout.md            ← Open source components
│   ├── gh-scout-agent-sdk-multiplayer.md
│   ├── academic-papers.md
│   ├── books.md
│   ├── debate-architecture.md
│   └── README.md                      ← Links to Shared Core research
├── design/                            ← Architecture docs
├── chronicle/                         ← Semantic evolution log
├── ideas/                             ← Captured ideas
├── play/                              ← Exploratory outputs
├── src/                               ← Source code (V1: skill + rule + hook)
└── archive/                           ← Superseded designs
```

## Key Insight

CoVibe is project management software that runs inside the tools developers already use. No new platform to learn, no context switching, just git and Claude Code. The data it generates (jobs, sessions, messages, project structure) becomes the input for the Spatial Workspace in V3.

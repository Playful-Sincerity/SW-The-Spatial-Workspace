# Project Management Patterns for CoVibe

Research into 8 project management tools and methodologies, filtered for what translates to a git-based, markdown-file task coordination system where an orchestrator Claude Code session breaks projects into jobs claimed and executed by individual Claude Code sessions.

---

## 1. Linear

### What Makes It Work

Linear's defining quality is **speed as a design principle** — if an action takes more than a few hundred milliseconds, they try to fix it. Every action is keyboard-reachable. The interface is intentionally opinionated and minimalist; you only customize when there's real pain.

**Default workflow states:** Backlog → Triage → Todo → In Progress → Done → Canceled

The Triage state deserves special attention: new issues land in a dedicated inbox before entering the active workflow. This prevents noise from cluttering In Progress columns. It's a funnel, not a stage — issues pass through it quickly.

**Cycles** (Linear's name for sprints) are automated: they start and end on a fixed cadence, incomplete issues roll over automatically. No manual ceremony. The emphasis is on keeping the team in a focused working mode without meta-work overhead.

**Relations model:** Issues can be marked as `blocks`, `blocked by`, `related to`, or `duplicate of`. Project-level dependencies (added 2024) let you visualize which projects block others on a timeline — connecting lines turn red when a blocking project's end date conflicts with a dependent project's start.

### Patterns for CoVibe

1. **Triage as a job state.** Jobs should have a `triage` or `pending-review` state that sits before `active`. The orchestrator drops raw jobs here; they only move to `ready` after the orchestrator validates them. This prevents sessions from picking up half-formed work.
2. **Automatic rollover.** When a job's session ends without completing, the state resets to `ready` (not abandoned). This mirrors Linear's cycle rollover — incomplete work re-queues cleanly.
3. **Blockers as first-class metadata.** The `blocks` / `blocked-by` relation belongs in frontmatter as `blocks: [job-id, ...]` and `blocked_by: [job-id, ...]`. The orchestrator can scan for chains before assigning.

### What Requires a UI

The visual timeline with red dependency-conflict indicators. In plain files, you can represent dependency chains but cannot visualize the timeline conflict. Detect it in a script, log it in the orchestrator's notes file.

### Anti-Pattern to Avoid

Linear's opinionated defaults exist because most customization adds overhead. Don't over-specify states. Six states maximum; every state should have a different action required of a different actor.

---

## 2. Jira

### What Works

The **Epic → Story → Task hierarchy** has proven itself across thousands of teams. The hierarchy maps directly to scope levels: Epics are months of work, Stories are sprint-sized (1-2 weeks), Tasks are day-sized. Each level answers a different question: Epic = "what capability are we building?", Story = "what does the user need?", Task = "what specific thing must be done?"

**Customizable workflow states** are Jira's most-used feature. Different teams configure different state machines — a legal review workflow looks nothing like a deployment workflow. The ability to add states like "Legal Review" or "QA Signoff" between In Progress and Done is powerful when different jobs have different acceptance criteria.

**Sprint planning with capacity** treats a sprint as a container with a finite size. Teams commit work that fits the container. Incomplete work doesn't vanish — it surfaces explicitly for re-evaluation.

### What's Hated About Jira

Jira rewards complexity. Projects become baroque: custom fields, sub-tasks, linked issues, components, fix versions, sprints, boards, schemes. The cognitive overhead of maintaining the meta-structure exceeds the benefit of the structure itself. This is the Jira trap: the tool becomes a project in itself.

The second major failure mode: Jira becomes a reporting tool for managers, not a working tool for engineers. Issue updates happen because someone asked, not because the system naturally captures work as it happens.

### Patterns for CoVibe

1. **Three-level hierarchy in filenames.** Use the naming convention `epic/story/task` in directory structure or in the `parent` frontmatter field. Orchestrators create stories; sessions execute tasks. Epics are just grouping folders. Don't need a fourth level.
2. **Custom state machines per job type.** Instead of one global workflow, let each job specify its own `workflow_type` (e.g., `research`, `implementation`, `review`). Different types have different valid state transitions.

### Anti-Pattern to Avoid

The Jira trap. Do not add custom fields "just in case." Every metadata field that sessions must maintain is overhead that reduces execution speed. Start with the minimum; add fields only when a real coordination failure occurs that the field would have prevented.

---

## 3. GitHub Projects

### What Works

GitHub Projects earns its place because **the work and the tracking live in the same system**. A PR is also a project card. Closing a PR triggers an automation that moves the card. The state of the code and the state of the task stay in sync without manual updates.

**Built-in automations:** When an issue closes → set status to Done. When a PR merges → set status to Done. When an item is added to the project → set status to Todo. These are simple rules but they eliminate the most common source of stale tracking data.

**Multiple views of the same data:** the same issues render as a Kanban board (column = status), a table (spreadsheet with sortable fields), or a timeline (Gantt-style). Different actors benefit from different views: the orchestrator wants the table for full frontmatter visibility; a session wants the Kanban for its own column.

**Status field as the column field.** The architectural insight: the board view is just a filtered/grouped view of a single `status` field. Dragging a card updates the field. This means the data model is flat (it's just a field) and the board is a derived view.

### Patterns for CoVibe

1. **Git operations as state transitions.** Committing a job file with `status: in-progress` is the claim action. Committing it with `status: done` is the completion action. Git becomes the event bus — no separate API. The orchestrator reads git log to reconstruct the history of any job.
2. **Automated state transitions via hooks.** A pre-push hook can validate state transitions (you can't push `done` without a `completed_at` timestamp; you can't push `in-progress` from another session's file). These are the automation rules, implemented in bash.
3. **Table view = frontmatter query.** The equivalent of GitHub Projects' table view is a script that reads all job files' frontmatter and renders a status table. Cheap to build, useful for the orchestrator.

### What Requires a UI

The drag-and-drop board. In plain files, you change the status field manually. The board view is for human comprehension; for Claude sessions, reading the status field in frontmatter is sufficient.

---

## 4. Notion Databases

### What Works

Notion's **flexible property types** let you attach any metadata to a record: text, number, select, multi-select, person, date, relation, formula, rollup. The relation and rollup properties are the most powerful: they let two databases reference each other, and rollup fields aggregate data from the related database (e.g., "count of open tasks" on a project record).

**Views as lenses.** The same database renders as table, board, timeline, calendar, or gallery depending on what you're trying to understand. Crucially, a view is not a copy — it's a filter + layout applied to the same underlying data.

**Templates for recurring patterns.** When a new task of type `research` is created, a template pre-populates it with standard sections (Background, Sources, Findings, Open Questions). This is the closest analog to a job file template in a markdown system.

### Pattern for CoVibe

1. **Typed job templates.** Different job types have different required frontmatter and different body sections. An `implementation` job has `acceptance_criteria`. A `research` job has `open_questions`. A `review` job has `reviewer` and `verdict`. Templates in a `templates/` directory, copied when a new job is created.
2. **Rollup equivalents via the orchestrator.** The orchestrator's job file (or a `STATUS.md`) is the Notion rollup: it aggregates across all job files to produce a project-level health snapshot.

### What Requires a UI

Notion's filtering and sorting UX. In plain files, the equivalent is grep, awk, or a small status script. Not as fluid but functional.

### Anti-Pattern to Avoid

Notion databases that become unmaintainable because every property starts at zero and needs to be filled in manually. In CoVibe, every field the orchestrator doesn't populate automatically is overhead that sessions will skip. Design frontmatter to be filled by whoever creates the job, not whoever executes it.

---

## 5. Shape Up (Basecamp)

### What Works

Shape Up inverts the normal project management relationship: **appetite is fixed, scope is variable.** Instead of estimating how long a feature will take, you decide how much time it deserves. If it can't be done in 6 weeks, you either narrow the scope or don't do it. This is a fundamentally different constraint.

**Hill charts** capture the two-phase nature of all work: uphill (figuring out your approach, high uncertainty) and downhill (executing a known plan, decreasing uncertainty). A dot that doesn't move is a silent signal that something is wrong. No standup needed — the chart tells the story.

The phases:
- **Uphill:** "I've thought about this" → "I've validated my approach" → "I know there are no hidden unknowns"
- **Downhill:** Pure execution. The path is clear.

The key insight: **the scary work should go uphill first.** Don't finish the easy parts and leave the hard unknown for last. The hill chart makes this visible — a dot near the top of the downhill slope on week 1 is a red flag, not a green one.

**Pitches** (the pre-work artifact) are a fixed format: Problem, Appetite, Solution (rough sketch, not spec), Rabbit holes (what to avoid), No-gos. The pitch is shaped, not detailed. The team fills in the details during execution.

**Cool-down periods** between cycles let teams fix bugs, explore ideas, and make small improvements without ceremony. Unfinished work from a cycle either gets a new pitch or gets dropped. It doesn't automatically carry over.

### Patterns for CoVibe

1. **Two-phase job status: exploration vs execution.** Instead of a single In Progress state, split it: `exploring` (uphill, figuring out the approach) and `executing` (downhill, known path). The orchestrator can detect a job stuck in `exploring` for too long and flag it. This is the hill chart made operational.
2. **Appetite as a frontmatter field.** `appetite: "2-session"` or `appetite: "small"` / `appetite: "medium"` / `appetite: "large"` sets a scope contract. The session knows to narrow scope rather than expand time. If a job is going to exceed its appetite, it surfaces that explicitly before continuing.
3. **Rabbit holes as explicit metadata.** `avoid: ["don't refactor the auth system", "don't support edge case X"]` in frontmatter. These are Shape Up's "no-gos." The orchestrator writes them; sessions read them. This is the most underrated pattern in project management.

### What Doesn't Translate

The betting table (choosing which pitches get funded this cycle) requires human judgment and a meeting. The orchestrator can propose, but a human should bet. Don't automate the betting.

---

## 6. Kanban

### What Works

Kanban's core law: **WIP limits prevent multitasking from destroying throughput.** Without WIP limits, In Progress becomes a graveyard of half-finished work. With WIP limits, you cannot start new work until current work completes. This forces completion over starting.

**Pull vs push.** In a push system, work is assigned to workers. In a pull system, workers take work from a queue when they have capacity. Pull is right for CoVibe: sessions pull jobs when ready, not when assigned. This prevents the orchestrator from over-committing sessions.

**Swim lanes** group work by type, team, or priority within a board. The most useful lane distinction for CoVibe: a fast lane (high priority, bypass WIP limits) and a regular lane (normal flow).

**Definition of Done** is Kanban's most important rule and most commonly skipped. A job isn't done when the session says it's done. Done means: the output exists, the acceptance criteria are met, and the next actor (reviewer, orchestrator) has everything they need. Without an explicit DoD, "done" means "I stopped working on it."

### Patterns for CoVibe

1. **WIP limit per session.** A Claude Code session should work on exactly one job at a time. This is already the natural model (single context window) but make it explicit in the coordination protocol. If a session is `in-progress` on one job, it cannot claim another. The orchestrator enforces this.
2. **Pull protocol.** Sessions don't receive job assignments — they query for available jobs. The query is: "what jobs are `ready`, have no `blocked_by` dependencies, and have no other session currently claiming them?" This is a pull signal.
3. **Definition of Done as required fields.** Before a job can transition to `done`, it must have: `completed_at` timestamp, `output` (summary of what was produced), and either `acceptance_criteria_met: true` or an explicit note about partial completion. These are machine-checkable. A hook validates them.

### Anti-Pattern to Avoid

WIP limits that look enforced but aren't. If the protocol says "one job per session" but there's no check, sessions will pick up multiple jobs under pressure. The check must be in the hook or the orchestrator's assignment logic, not just in the rule.

---

## 7. Asana

### What Works

**Task dependencies with a timeline view** let you see which task is blocking which, and how a delay in one task ripples forward. The visual timeline makes the dependency graph comprehensible at a glance.

**Milestones** are tasks that mark "a point in time" rather than a body of work. They're checkpoints: "all research jobs done," "implementation approved," "ready to ship." Milestones have no scope — they're gates.

**Multi-homing** is Asana's term for "one task appears in multiple projects." The same task is visible and editable from Project A and Project B simultaneously; changes sync everywhere. This is the solution to the "belongs to two epics" problem.

**Custom fields with dependency context.** Adding a custom field like `dependency_type: hard | soft` lets you distinguish between "this physically cannot start" (hard) and "this would be better after" (soft). Soft dependencies can be violated consciously; hard dependencies cannot.

### Patterns for CoVibe

1. **Milestone jobs.** A milestone is a job with `type: milestone` that has no body content and no execution work — it's a gate. When all jobs in a group complete, the orchestrator moves the milestone to `done`. This gives the project rhythm: sessions can see when a phase is complete.
2. **Hard vs soft dependencies.** In frontmatter: `blocked_by_hard: [job-ids]` and `blocked_by_soft: [job-ids]`. A session cannot claim a job with unfulfilled hard dependencies. A session can claim a job with unfulfilled soft dependencies but should note it.
3. **Cross-project job references.** A job in one project can reference a job in another repo as `external_dependency: "owner/repo#job-id"`. The orchestrator monitors external dependencies periodically.

---

## 8. Trello

### What Works

Trello's enduring lesson: **the card is the unit of work, and it should be self-contained.** Everything you need to understand the card should be on the card: description, checklist, attachments, comments, labels, due date. You should not need to open another tool.

**Lists as workflow states.** The genius of Trello is that moving a card from "In Progress" to "Done" is a physical gesture. The board is the canonical view. Drag-and-drop makes state transitions feel natural.

**Labels as cross-cutting tags.** Labels are not states; they're attributes. "Bug," "Urgent," "Frontend" are labels. "In Progress" is a list. The distinction matters: states are mutually exclusive (a card is in one list), labels are not (a card can have many labels).

**Checklists inside cards.** Sub-tasks don't need their own cards — they live as checkboxes inside the parent card. This keeps the board clean while supporting granular execution.

### Patterns for CoVibe

1. **Job body as the self-contained card.** The markdown body of a job file should include everything a fresh session needs to execute: context, objective, acceptance criteria, relevant file paths, known constraints. No hunting for context in other files.
2. **Labels as frontmatter tags.** `tags: [bug, urgent, auth]` are not states — they're orthogonal attributes. The orchestrator uses them for grouping and filtering; sessions use them for context.
3. **Checklists as the execution layer.** The job body can contain a markdown checklist (`- [ ] step 1`) that the session checks off as it works. This is the sub-task layer without spawning child job files. Child jobs only get created when a checklist item turns out to be a full session's worth of work.

### Anti-Pattern to Avoid

Trello's fatal flaw: it doesn't scale past ~20 cards without a discipline about archiving. The CoVibe equivalent: don't let the jobs/ directory accumulate indefinitely. The orchestrator should archive completed jobs to `archive/YYYY-MM-DD/` after a cycle ends. Otherwise, the `ready` pool becomes unreadable noise.

---

## Synthesis: Key Questions Answered

### 1. Minimum Viable Set of Job States

Six states, no more:

| State | Who Sets It | What It Means |
|-------|------------|---------------|
| `draft` | Orchestrator | Created but not yet validated/ready |
| `ready` | Orchestrator | Available to be claimed by a session |
| `in-progress` | Session (on claim) | A session is actively working on this |
| `review` | Session (on complete) | Work done, awaiting orchestrator check |
| `done` | Orchestrator | Accepted; acceptance criteria met |
| `blocked` | Session or Orchestrator | Cannot proceed; blocker identified |

Notable omissions: `canceled` is not a state — canceled jobs get a `canceled: true` flag and move to `done` (or archive). Keeping it as a state creates a dead branch in the state machine. `exploring` / `executing` (from Shape Up) can be implicit sub-states of `in-progress` via an `uphill: true` flag rather than separate states.

Valid transitions:
- `draft` → `ready` (orchestrator validates)
- `ready` → `in-progress` (session claims)
- `in-progress` → `review` (session completes)
- `in-progress` → `blocked` (session hits blocker)
- `blocked` → `ready` (blocker resolved)
- `review` → `done` (orchestrator accepts)
- `review` → `ready` (orchestrator rejects — session must redo)
- Any state → `draft` (orchestrator resets)

### 2. Dependency Model in Plain Markdown

YAML frontmatter handles dependencies cleanly:

```yaml
blocked_by: ["job-003", "job-007"]   # hard dependencies — cannot start until these are done
after: ["job-002"]                    # soft dependencies — should start after, but can proceed
blocks: ["job-012", "job-015"]        # what this job unblocks when done
```

The orchestrator resolves dependencies before marking a job `ready`. The pull protocol checks `blocked_by` on every claim attempt. A script can detect circular dependencies at job creation time.

### 3. Review/Approval

Use the `review` state as a gate, not a role. The orchestrator is the default reviewer. For jobs where human approval is required, set `requires_human_review: true` — this pauses the job in `review` until a human changes the state manually (or via a `/covibe review approve` command). For jobs that don't need human review, the orchestrator auto-approves based on whether the `output` field is populated and `acceptance_criteria_met: true`.

Do not create a separate "reviewer" role as a first-class actor. The orchestrator handles it unless explicitly delegated.

### 4. Multi-Person Jobs

Two patterns, used in different situations:

**Pattern A: Designated Reconciler.** One session owns the job file (`owner: session-id`). Other sessions work on branches (`covibe/job-003-sarah`, `covibe/job-003-frank`). The owner merges the branches and writes the final `output`. Ownership is explicit in frontmatter.

**Pattern B: Parallel Sub-Jobs.** The orchestrator splits `job-003` into `job-003a` and `job-003b` (with `parent: job-003` in frontmatter). Both execute independently. A `job-003-merge` milestone waits for both. The orchestrator synthesizes the sub-job outputs into the parent job's output.

Pattern A is for exploratory/research work where output needs coherent authorship. Pattern B is for divisible implementation work where outputs can be combined mechanically.

### 5. Required Frontmatter Fields

Organized by who fills them in:

**Orchestrator fills at job creation:**
```yaml
id: "job-003"
title: "Research authentication patterns"
type: research | implementation | review | milestone | spike
status: draft
created_at: "2026-04-07T14:23:00"
parent: null              # or parent job id
blocked_by: []            # hard dependencies
after: []                 # soft dependencies
blocks: []                # what this unblocks
appetite: small | medium | large   # from Shape Up
avoid: []                 # rabbit holes — what NOT to do
tags: []                  # cross-cutting labels
requires_human_review: false
```

**Session fills at claim:**
```yaml
claimed_by: "session-wisdom-01"
claimed_at: "2026-04-07T15:00:00"
uphill: true              # still figuring out approach (from Shape Up)
```

**Session fills at completion:**
```yaml
completed_at: "2026-04-07T17:30:00"
output: "Researched 5 auth patterns. Recommended JWT + refresh token. Notes in body."
acceptance_criteria_met: true
blockers_encountered: []  # what blocked this job (for orchestrator learning)
```

**Orchestrator fills at review:**
```yaml
reviewed_at: "2026-04-07T18:00:00"
verdict: accepted | rejected | needs-revision
verdict_notes: ""
```

**Full frontmatter is 20 fields.** That sounds like a lot — but 8 are filled by the orchestrator at creation, 3 by the session at claim, 4 by the session at completion, and 4 by the orchestrator at review. No single actor fills more than 8 fields at once. Each actor only touches their own fields.

### 6. When the Orchestrator Splits, Merges, or Reassigns Jobs

**Split when:**
- A job exceeds its appetite (a `medium` job is clearly going to take 3 sessions)
- A session encounters genuinely independent sub-problems within one job
- `uphill: true` has been set for more than one session's worth of work — the job is bigger than it looked

**Merge when:**
- Two jobs share 80%+ of the same context (reading the same files, touching the same component)
- A job is blocking another job and both are small — merge them into one job that owns both outcomes
- The overhead of coordination between two jobs exceeds the benefit of parallel execution

**Reassign when:**
- A session goes offline mid-job (`last_updated` is stale beyond a threshold)
- A session hits a blocker it cannot unblock itself and marks the job `blocked`
- The session explicitly requests reassignment in the job body

The orchestrator should be conservative about splitting and aggressive about detecting stale jobs. The most common failure mode in multi-agent systems is a job that's "in-progress" but nothing is happening. Set a `heartbeat_interval` in the project config; the orchestrator marks jobs stale if `last_updated` exceeds it.

---

## Recommended CoVibe Job Spec

The canonical job file template, informed by all patterns above.

**File naming:** `jobs/{status}/{id}-{slug}.md` — sorted by status directory, unique by id, human-readable by slug.

Or alternatively: `jobs/{id}-{slug}.md` with status encoded only in frontmatter — simpler, no file moves on state change, but loses the directory-level grouping. Prefer this for git-based systems since moving files creates confusing diffs.

```markdown
---
# Identity (set at creation, never change)
id: "job-003"
title: "Research JWT vs session token auth patterns"
type: research

# Workflow state (updated by actors as work progresses)
status: ready
created_at: "2026-04-07T14:23:00Z"
updated_at: "2026-04-07T14:23:00Z"

# Scope contract (set by orchestrator at creation)
appetite: medium
parent: null
tags: [auth, security]

# Dependencies (set by orchestrator, updated as jobs complete)
blocked_by: []
after: ["job-002"]
blocks: ["job-005", "job-006"]
avoid: ["don't evaluate OAuth providers — that's job-008", "don't touch existing session code"]

# Execution (filled by session on claim)
claimed_by: null
claimed_at: null
uphill: null

# Completion (filled by session on done)
completed_at: null
output: null
acceptance_criteria_met: null
blockers_encountered: []

# Review (filled by orchestrator after review)
requires_human_review: false
reviewed_at: null
verdict: null
verdict_notes: null
---

## Objective

One paragraph: what does this job produce, and why does the project need it right now?

## Context

What background does a fresh session need to execute this job? Include:
- Relevant file paths
- Prior decisions that constrain this job
- What the output of this job feeds into

## Acceptance Criteria

- [ ] Criterion 1 (specific, checkable)
- [ ] Criterion 2
- [ ] Criterion 3

## Notes / Working Log

*Session fills this in as it works. Stream-of-consciousness is fine — this is the execution record.*

<!-- Session: claim by setting status: in-progress and claimed_by in frontmatter -->
<!-- Session: complete by checking off acceptance criteria, filling output field, setting status: review -->
```

### State Transition Rules (enforced by hook or orchestrator)

| Transition | Required Fields | Forbidden Fields |
|-----------|----------------|-----------------|
| `draft` → `ready` | `title`, `type`, `appetite` set | `claimed_by` must be null |
| `ready` → `in-progress` | `claimed_by`, `claimed_at` set | Cannot have unfulfilled `blocked_by` entries |
| `in-progress` → `review` | `output` set, `completed_at` set | |
| `in-progress` → `blocked` | `blockers_encountered` non-empty | |
| `review` → `done` | `reviewed_at` set, `verdict: accepted` | |
| `review` → `ready` | `verdict: rejected`, `verdict_notes` set | `claimed_by` reset to null |

---

## What Translates vs What Requires a UI

| Pattern | Translates to Plain Files | Requires UI |
|---------|--------------------------|-------------|
| Status states | Yes — frontmatter field | No |
| Dependency chains | Yes — blocked_by/blocks arrays | No |
| Dependency conflict visualization | No — detect in script, log in text | Yes (timeline view) |
| WIP limits | Yes — hook checks count of in-progress per session | No |
| Pull protocol | Yes — query script filters available jobs | No |
| Kanban board view | Yes — status-query script renders table | UI makes it nicer |
| Checklist sub-tasks | Yes — markdown checkboxes in body | No |
| Hill chart | Partial — `uphill` flag is a proxy | Yes (the actual curve) |
| Multi-homing (one job in two projects) | No — reference external job id instead | No |
| Rollup (count open jobs per epic) | Yes — orchestrator STATUS.md | UI makes it nicer |
| Real-time presence (who's working on what) | Partial — `claimed_by` + `updated_at` | Yes (live cursor) |
| Automated state transitions on git events | Yes — hooks | No |

---

## Sources

- [Linear: Issue Relations](https://linear.app/docs/issue-relations)
- [Linear: Configuring Workflows](https://linear.app/docs/configuring-workflows)
- [Linear: Project Dependencies](https://linear.app/docs/project-dependencies)
- [Atlassian: Epics, Stories, Themes](https://www.atlassian.com/agile/project-management/epics-stories-themes)
- [GitHub Docs: About Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
- [GitHub Docs: Using Built-in Automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations)
- [Shape Up: Basecamp](https://basecamp.com/shapeup)
- [Shape Up: Show Progress (Hill Charts)](https://basecamp.com/shapeup/3.4-chapter-13)
- [Kanban WIP Limits: Atlassian](https://www.atlassian.com/agile/kanban/wip-limits)
- [Asana: Multi-homing Examples](https://forum.asana.com/t/multi-homing-linking-work-in-asana-examples-best-practices/229957)
- [tick-md: Multi-Agent Coordination via Markdown](https://www.tick.md/)
- [tick-md: Purple Horizons Deep Dive](https://purplehorizons.io/blog/tick-md-multi-agent-coordination-markdown)
- [Claude Code Agent Farm: Dicklesworthstone](https://github.com/Dicklesworthstone/claude_code_agent_farm)
- [The Case for Markdown as Agent Task Format](https://dev.to/battyterm/the-case-for-markdown-as-your-agents-task-format-6mp)
- [Addy Osmani: The Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/)

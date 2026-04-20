# Session Carryover — 2026-04-08
## For post-compaction context recovery

### What happened this session
- Created the **Shared Core** project — researched how to share a Digital Core across collaborators. 10 research docs. Conclusion: GitHub already handles shared rules/skills (CLAUDE.md loads automatically in Actions/Codespaces/cloud).
- Created **CoVibe** as a Spatial Workspace subproject — multiplayer Claude Code. Started as "shared context window" idea, pivoted to "sessions that communicate with each other through a job board."
- CoVibe V1 architecture: no server, no Agent SDK. Just a `/covibe` skill + rule + auto-push hook. Sessions coordinate through markdown job files and messages in a `.covibe/` directory inside the project repo. Orchestrator decomposes work into jobs, sessions claim and execute them.
- Upgraded `/plan-deep` skill with auto-selecting research streams, parallel/series mapping, steelman + analytical lenses, and agent interrogation during reconciliation.
- **Next step:** Pilot CoVibe V1 with Wisdom + Frank, building n8n workflows for HHA using the Lean AI playbook.

### Key decisions and corrections
1. **CoVibe V1 is git-based, not server-based.** No Agent SDK server. Everyone uses their own Claude Code subscription. The shared repo IS the coordination layer. V2 (Agent SDK server with web UI) is preserved at `plan-v2-agent-sdk-server.md`.
2. **Sessions communicate, they don't share context.** Wisdom's reframe: "you don't need to share a context window, you need conversations that talk to each other." Each person keeps their own Claude, sessions exchange messages and status through files.
3. **Job board architecture** inspired by Kanban + Shape Up. Pull-based claiming, 6 states (draft→ready→in-progress→review→done+blocked), appetite field, uphill flag, minimal frontmatter burden.
4. **Multiple people can work the same job** on parallel branches with a reconciler.
5. **The pilot is HHA n8n workflows** — real work, not a test project.

### Current direction
Build the `/covibe` skill, coordination rule, and auto-push hook. Then pilot it immediately with Frank on HHA n8n workflow development following the Lean AI playbook.

### Biggest open question or gap
The `/covibe` skill hasn't been built yet. The plan is written (`covibe/plan.md`), the research is done (9 docs including PM patterns), but no code exists. The skill needs: start/status/claim/msg/read/done/end/orchestrate commands, identity from git config, and enforcement throughout the conversation.

### Files to re-read after compaction
1. `~/Playful Sincerity/PS Software/Spatial Workspace/covibe/plan.md` — V1 implementation plan with job board architecture, build steps, enforcement strategy
2. `~/Playful Sincerity/PS Software/Spatial Workspace/covibe/CLAUDE.md` — Full project overview, architecture diagram, component list, phases
3. `~/Playful Sincerity/PS Software/Spatial Workspace/covibe/research/project-management-patterns.md` — PM patterns informing job file design (states, dependencies, frontmatter)
4. `~/Playful Sincerity/PS Software/Spatial Workspace/covibe/research/component-scout.md` — Open source components (relevant for V2 but context for understanding the landscape)
5. `~/Playful Sincerity/PS Software/Spatial Workspace/covibe/play/2026-04-07-concept-exploration.md` — Concept exploration with coral reef analogy, session portfolio, convergence insight
6. `~/Playful Sincerity/PS Software/Happy Human Agents/CLAUDE.md` — HHA context for the pilot
7. `~/.claude/skills/plan-deep/SKILL.md` — Recently upgraded with research streams, parallel/series mapping, agent interrogation

### Active framing
CoVibe is **project management software where the workers are Claude Code instances and humans interchangeably.** It's git-native, runs inside tools developers already use, and the data it generates becomes input for the Spatial Workspace. This is a genuinely novel product — nobody has built multi-human coordinated AI sessions. It's simultaneously an internal tool (Wisdom + Frank), a product (fundable), and an event format (room full of people building together through CoVibe).

### Where did play show up?
The play session was extraordinary — produced the coral reef analogy (orchestrator as water chemistry, not conductor), the session portfolio concept (record of how you think, not what you produce), and the insight that CoVibe might be where all four convergence projects (PS Bot + AM + Phantom + Companion) naturally combine first. The architecture pivot from "shared context" to "sessions talking to each other" was itself a play moment — an unexpected reframe that simplified everything.

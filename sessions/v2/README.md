# Spatial Workspace v2 — Multi-Session Build

This directory contains four self-contained session briefs that drive the v2 build across separate Claude Code conversations. Each brief is **cold-startable** — open a new conversation, point Claude at the brief, and it has everything it needs.

**Source-of-truth plan:** `../../plan.md`
**v1 evolution log:** `../../chronicle/2026-04-16.md`
**Design research:** `../../research/2026-04-16-design-references.md`

---

## Phase Map

```
PHASE 1 — Foundation (autonomous)        ║   PHASE 2 — Design Workshop (Wisdom + Claude in real-time)
══════════════════════════════════════   ║   ══════════════════════════════════════════════════════════
  archive v1 ──┐                          ║     Figma file ──▶ canvas frame ──▶ button anatomy
  config       ├─▶ generator ─▶ run.sh    ║                ──▶ status matrix ──▶ connector spec
  screenshot ──┘                ─▶ smoke  ║                ──▶ reader panel ──▶ backlinks mock
  (parallel subagents)                    ║                ──▶ Wisdom approves
                                          ║
                                          ║   ║
                                          ▼   ▼
PHASE 3 — Layout & Visual (autonomous, needs BOTH 1 and 2)
═══════════════════════════════════════════════════════════════
  Merge Phase 2 tokens into Phase 1's app.css
  Simulation interface + MembraneSimulation
  ──▶ node-as-button rendering (to Figma spec)
  ──▶ status-as-ambient-color
  ──▶ connector geometry
  ──▶ expand/collapse with smooth re-settle
  ──▶ initial-load = root-only
                              │
                              ▼
PHASE 4 — Polish + Verification + Handoff (autonomous)
═══════════════════════════════════════════════════════════════
  Reader + multi-tab + canvas-click-minimize + pill (port from v1)
  Search, settings panel, copy-path, trackpad, keyboard
  README, run.sh, config.example.json
  Final acceptance test pass + Dennis-ready package
```

## Launch Order

**Phases 1 and 2 can run in parallel** — they don't depend on each other. Phase 3 needs both before it can start.

| When | Conversation | Brief | Notes |
|------|--------------|-------|-------|
| **Now** | 1 | `phase-1-foundation.md` | Autonomous, ~2-3h. Use parallel subagents for the 4 independent sub-tasks. |
| **Now (in parallel with 1)** | 2 | `phase-2-design-workshop.md` | Real-time with Wisdom, ~1-2h. Pick a focused window when you can sit with it. Figma MCP permissioned. |
| **After 1 AND 2 both done** | 3 | `phase-3-layout.md` | Autonomous, ~3-4h. The longest stretch. Merges Phase 2 tokens into Phase 1's `app.css` at the start. |
| **After 3 produces working canvas** | 4 | `phase-4-polish-verify.md` | Autonomous, ~2-3h. Use parallel subagents for the 3 independent polish areas. |

**Total estimated build time:** 8-12 hours of focused conversation work, spread across 4 sessions.

## Which phases need Wisdom present?

- **Phase 1:** Mostly autonomous. Wisdom only needed if the Claude driver hits an architectural ambiguity not resolved in `plan.md`.
- **Phase 2:** **Wisdom required.** This is a workshop — design taste matters at every frame. Plan for ~1-2 hours of joint time with Figma open.
- **Phase 3:** Autonomous, but Wisdom may want to drop in for hourly visual checks (the Claude driver should auto-screenshot after each major milestone via `generator/screenshot.sh`).
- **Phase 4:** Autonomous. Final handoff at end with Wisdom for the Dennis-share decision.

## Dependency Rules

- **Phase 1 → Phase 2:** the new file structure (template.html / app.css / app.js) must exist before the Figma workshop can extract design tokens into `app.css`.
- **Phase 2 → Phase 3:** Wisdom must explicitly approve the Figma frames. The brief file `phase-3-layout.md` instructs the conversation driver to wait for that approval link.
- **Phase 3 → Phase 4:** the canvas must produce settled layouts with no overlapping labels at 5000 nodes before Phase 4 starts (this is Phase 3's primary success criterion).

## Settings.json prep before Phase 2

The Figma workshop uses `mcp__figma__*` tools heavily. To avoid prompt fatigue, add this to `~/.claude/settings.json` before opening that conversation:

```json
{
  "permissions": {
    "allow": [
      "mcp__figma__create_new_file",
      "mcp__figma__use_figma",
      "mcp__figma__get_design_context",
      "mcp__figma__get_screenshot",
      "mcp__figma__get_metadata",
      "mcp__figma__get_variable_defs",
      "mcp__figma__generate_figma_design",
      "mcp__figma__create_design_system_rules",
      "mcp__figma__search_design_system",
      "mcp__figma__add_code_connect_map",
      "mcp__figma__get_code_connect_map",
      "mcp__figma__send_code_connect_mappings",
      "mcp__figma__whoami"
    ]
  }
}
```

Merge with whatever's already in the `permissions.allow` array — don't replace.

## How to launch a brief

In a new Claude Code conversation:

```
Read /Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/sessions/v2/phase-1-foundation.md and execute it.
```

Or simply paste the brief's contents into the new conversation. The brief contains everything needed — no further explanation required.

## Meta-pattern worth extracting (future work)

This build uses a workflow that's worth turning into a reusable skill or methodology for autonomous-agent systems:

> **Design-in-Figma → verify-screenshot → build-to-spec → repeat**

The pattern:
1. Plan deeply (specs, decompose into phases, identify human gates)
2. Workshop the visual in Figma using the Figma MCP — get human sign-off on aesthetic
3. Build to the Figma spec, using a headless-screenshot loop to visually verify each milestone
4. Multi-session decomposition for parallel work where possible

This could live as `~/claude-system/skills/visual-product-build/` (or similar) — a skill that orchestrates the four phases as a reusable methodology. Spatial Workspace v2 is the first build using this pattern; if it produces a clean v2 quickly, the pattern is proven and worth extracting. Note for the v2 retrospective.

---

**Ready to launch Phase 1.** Open a new conversation and point it at `phase-1-foundation.md`.

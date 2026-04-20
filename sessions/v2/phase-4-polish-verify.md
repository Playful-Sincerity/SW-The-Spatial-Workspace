# Session Brief: Phase 4 — Polish + Verification + Handoff

**Project:** Spatial Workspace v2
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Dependencies:** Phase 3 complete (canvas working, membrane physics settling, buttons rendered to spec)
**Feeds into:** Dennis Hansen's hands
**Blocks:** Nothing — terminal phase
**Estimated scope:** 2-3 hours, autonomous, parallel subagents recommended for the polish areas

## Context

The visual heart of v2 is built. Phase 4 ports the surrounding interactive features from v1 (file reader, search, settings, keyboard shortcuts), tightens distribution (README, run.sh, config.example.json), and runs the final acceptance test pass. When done, the project is Dennis-ready.

**Read these first:**
1. `plan.md` — Section 4 (Polish & Share) and Section 5 (Verification & Handoff) acceptance criteria, plus the User Journey
2. `chronicle/<latest>.md` — what Phases 1-3 produced
3. `archive/v1/app.html` — for the v1 implementations of: file reader, multi-tab system, canvas-click-minimize pill, settings panel, search, copy-path button, markdown link navigation, keyboard shortcuts. **All of these port from v1 with minor adjustments to the new file structure and visual.**
4. `templates/v2/{app.js, app.css, template.html}` — the v2 source you'll be extending
5. `design/2026-04-16-figma-workshop.md` — Figma URL (refer to Frame 5 for reader panel spec)

## Task

Complete v2 by porting the v1 polish features to the new file structure and visual, then verify the whole product against the User Journey from `plan.md`. Use parallel Sonnet subagents for the three independent polish areas (4A, 4B, 4C).

### Sub-tasks

**4A — File reader + multi-tab + canvas-click-minimize + pill** [PARALLEL]
- Port the v1 implementation (lives in `archive/v1/app.html`):
  - Right-side panel that slides in when a file is clicked (~45% width)
  - Tab strip at top of reader (one tab per open file)
  - Click empty canvas → reader minimizes; pill appears at top-right; click pill → restore reader; × on pill → close all tabs
  - Markdown link navigation (clicking links to other `.md` files opens them in new tabs)
  - Copy-path button (📋) in reader header
  - → arrow close button (left of reader header) = minimize
- Adapt to v2 visual: use `var(--sw-*)` design tokens, match Figma Frame 5
- Update so node-button selection state ties to which file is in the active tab

**4B — Search + settings panel + copy-path** [PARALLEL]
- Port v1 search: ⌘F focuses input, live-filter dims non-matching nodes, auto-expand ancestors of matches
- Port v1 settings panel: gear in header opens a sliders dropdown
  - The sliders should now control:
    - `--sw-font-size-base` (CSS var)
    - `--sw-pad-h`, `--sw-pad-v` (button padding)
    - Membrane physics params: `repulsion`, `linkDistance`, `radialStrength` (these tune the simulation, exposed for Wisdom-style live tweaking)
  - Persists to localStorage as before
  - Reset button restores defaults
- Sliders apply via CSS custom property updates: `document.documentElement.style.setProperty('--sw-pad-h', value)`. This is the architecture hook for the v3 agentic-design-prompt feature (it'll write to the same custom properties).

**4C — Trackpad gestures + keyboard shortcuts** [PARALLEL]
- Trackpad gestures should already be in from Phase 3 (sub-task 3G). Verify they still work.
- Keyboard shortcuts to port:
  - Esc: minimize reader if open, otherwise clear search
  - ⌘F: focus search
  - (Optional) Cmd-W on a tab: close that tab

**4D — Distribution polish** [SERIES, after 4A-4C]
- `README.md` final pass: install, run, config (annotated), share-with-others instructions, screenshots from `bash generator/screenshot.sh`
- `config.example.json`: add a few `_comment` keys explaining each field
- `run.sh`: make sure it works from a fresh git clone on a fresh machine
- Add a `LICENSE` file? — ask Wisdom what license he wants (MIT is common; he might want something else)

**4E — Verification pass against User Journey** [SERIES, after 4D]

Walk through every step of the User Journey from `plan.md` and check it actually works:

| Step | Expected | Verify By |
|------|----------|-----------|
| 1 | `./run.sh` → terminal shows generation message → browser auto-opens | Run from fresh state |
| 2 | Lands on canvas with just root + 3-ish top branches as collapsed buttons | Visual screenshot |
| 3 | Click top-level branch → smooth expand, no overlapping labels | Click + screenshot |
| 4 | Click another branch → wheel breathes around it | Click + screenshot |
| 5 | Two-finger trackpad scroll = pan; pinch = zoom (cursor-anchored) | Manual gesture test |
| 6 | Click `.md` file → reader slides in from right with rendered markdown | Click |
| 7 | Click markdown link in reader → new tab appears in reader, original stays | Click in rendered content |
| 8 | Click empty canvas → reader minimizes to pill; click pill → restore | Click empty area |
| 9 | ⌘F → search focuses; type "agents" → matching nodes light up, others dim | Keyboard + type |
| 10 | Click gear → settings dropdown; tweak ring spacing → live re-layout | Click + drag slider |
| 11 | Copy 📋 button → file path on clipboard | Click + paste somewhere |
| 12 | Edit a watched file → page auto-reloads within ~5s, all tabs survive | Edit + wait + verify |

Run each step. Log any failures to `chronicle/<today>.md`. Fix or escalate to Wisdom.

**4F — Acceptance tests** [SERIES, after 4E]

Run the meta-level acceptance tests from `plan.md`:
- AT-1: Fresh-state `./run.sh` works for a configured vault
- AT-2: 5000-node vault settles <1s, no overlaps, 60fps pan/zoom
- AT-3: Click → expand → file → link → tab → minimize → restore (full interaction loop)
- AT-4: Edit watched file → auto-reload → tabs survive
- AT-5: `bash generator/screenshot.sh` produces sharp PNG matching live page
- AT-6: v2 visual matches Figma frames

If any fail, fix or escalate.

**4G — Final handoff package** [SERIES, after 4F]

Package what Dennis would receive:
- A clean folder (or zip) with: `README.md`, `run.sh`, `config.example.json`, `generator/`, `templates/v2/`, `LICENSE`
- A 3-line message Wisdom can send Dennis: "Hey, built this thing. Drop your vault path into config, run `./run.sh`, see what you think."
- Optionally: a short demo gif/video of the canvas (`screenshot.sh` per state, stitched). Skip if time-constrained.

## Output

```
Spatial Workspace/
├── README.md                          ← FINALIZED (4D)
├── config.example.json                ← FINALIZED with comments (4D)
├── run.sh                             ← VERIFIED (4D)
├── LICENSE                            ← NEW if Wisdom wants (4D)
├── chronicle/<today>.md               ← log of Phase 4 work
└── templates/v2/
    ├── app.js                         ← UPDATED with reader/search/settings/keyboard (4A-4C)
    └── app.css                        ← MAY HAVE small additions for new UI elements
```

## Success Criteria

- [ ] All sub-tasks 4A through 4G complete
- [ ] All 12 User Journey steps verified working
- [ ] All 6 acceptance tests pass
- [ ] Wisdom approves the Dennis-share package
- [ ] No regressions: any v1 feature we said we'd port works in v2

## When done

Write the completion note + retrospective in `chronicle/<today>.md`:
- What worked well in the multi-session decomposition
- What was harder than expected
- Any process improvements for next time (this informs the meta-pattern doc Wisdom flagged)

Tell Wisdom: **"Phase 4 complete. v2 is Dennis-ready. Here's the package: [path]. Send him the message and let me know how it lands."**

## Retrospective hook (for the meta-pattern)

In the chronicle entry, include a section titled `## v2 Process Retrospective` covering:
- Was the design-in-Figma → verify-screenshot → build-to-spec workflow effective?
- What would a reusable `~/claude-system/skills/visual-product-build/` look like based on this?
- Where did we lose time? What would shorten the next build?

This is the input to the meta-pattern documentation Wisdom wants to extract.

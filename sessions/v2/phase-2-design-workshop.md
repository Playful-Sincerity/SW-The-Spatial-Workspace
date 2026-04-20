# Session Brief: Phase 2 — Design Workshop in Figma

**Project:** Spatial Workspace v2
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Dependencies:** None — can run in parallel with Phase 1 (Foundation). Independent.
**Feeds into:** Phase 3 (Layout & Visual)
**Blocks:** Phase 3 (which needs BOTH this and Phase 1 done)
**Estimated scope:** 1-2 hours, **Wisdom must be present**, real-time workshop

## Context

This is the design phase. You and Wisdom will workshop the v2 visual in Figma using the Figma MCP, then write the agreed-upon design tokens to a spec doc. **The Figma file becomes the source of truth for the visual.** Phase 3 reads the spec doc and merges the tokens into `templates/v2/app.css` at the start of its work.

**This phase touches no code.** It produces:
1. A Figma file with 6 approved frames
2. A markdown spec doc at `design/2026-04-16-figma-workshop.md` with the extracted tokens

That's it. Phase 1 (Foundation) can be running in parallel — neither depends on the other.

**Read these first:**
1. `plan.md` — especially the User Journey section + Step 0 design tokens
2. `research/2026-04-16-design-references.md` — the design brief that informs everything (button anatomy, color palette, typography, status-as-ambient-color, connector lines, hover states, reference apps)
3. `chronicle/<latest>.md` — what Phase 1 produced

**Pre-flight check:**
- Figma MCP permissions should be in `~/.claude/settings.json` (see `sessions/v2/README.md` for the JSON snippet). If they aren't, prompts will fire on every tool call.
- Wisdom must be on the call / in the conversation in real-time.
- The Figma MCP `whoami` tool will return Wisdom's available plans/teams.

## Task

Open a new Figma design file. Mock the v2 canvas, button anatomy, and surrounding UI through six frames. Get Wisdom's explicit sign-off on each frame. Extract the final tokens into `templates/v2/app.css` as CSS custom properties.

### Frames to produce

**Frame 1: Canvas overview**
A full mock of the v2 canvas with a sample vault loaded. Shows: root node centered, ~3 top branches expanded as buttons, ~10-15 leaf-buttons around the perimeter, connector lines, header bar with vault label, settings gear, search input. Background = cream `#F9F0E0`.

**Frame 2: Single button anatomy (close-up)**
A blown-up view of one button showing: label text, padding (10-16px horizontal × 5-10px vertical per design brief), border radius (6/8/10px by node type), border (1px default, 1.5px when status), background. Annotate every measurement and color in px / hex.

**Frame 3: Button states**
Same button rendered in all states: default, hover (translateY(-1px) + shadow + warm tint), active/pressed, expanded (folder showing its open state), selected (in reader). Annotate each state's deltas.

**Frame 4: Status-as-ambient-color matrix**
A 5×1 grid of buttons showing each status:
- Active: `#1A9E5A` border + `rgba(26,158,90,0.08)` bg tint
- Building: `#D97706` border + 8% amber bg
- Concept: `#4B7FCC` border + 8% steel-blue bg
- Paused: `#B45309` border + 8% warm red-brown bg
- Default (no status): `#D8CDB8` border, no tint

Wisdom should look at this and confirm: does paused-as-warm-red-brown read as "resting" not "broken"? Does concept-as-steel-blue feel separate from PS purple? Adjust if not.

**Frame 5: Connector lines + reader panel**
Show how lines attach to buttons (center-to-center, 1px, 65% opacity, color `#C8BAAA`). Show the right-side reader panel slid in (~45% width) with a tab strip at top, file content rendered below, → arrow close button on left, 📋 copy-path button on right.

**Frame 6: Backlinks layer mock (DEFERRED RENDER)**
This is a mock for v3 — the layer Wisdom flagged as "background linkages, Obsidian-style." Show the canvas with faint gray Bezier curves drawn behind the hierarchy lines connecting cross-referenced files. They should be subtle — almost not there until you hover a node. v2 won't render this, but locking the visual now means v3 has no design surprises.

### Workshop loop per frame

1. You build the frame in Figma using the Figma MCP (use `generate_figma_design` from a description, or `use_figma` to draw frame-by-frame).
2. Get a screenshot of the frame via `get_screenshot`.
3. Show Wisdom. Ask for feedback.
4. Iterate based on his input.
5. When he says "approved," lock the frame and move to the next.

### After all 6 frames approved

**Extract design tokens to `templates/v2/app.css`:**

Use Figma's `get_variable_defs` (if Wisdom set up variables) or scrape from the frame annotations. Write CSS custom properties to the top of `app.css`:

```css
:root {
  /* Colors — base */
  --sw-canvas-bg: #F9F0E0;
  --sw-panel-bg: #F2E8D5;
  --sw-surface: #FFFFFF;
  /* ... etc per the design brief and Figma decisions ... */

  /* Status — ambient color encoding */
  --sw-status-active-border: #1A9E5A;
  --sw-status-active-bg: rgba(26, 158, 90, 0.08);
  /* ... etc ... */

  /* Typography */
  --sw-font-stack: 'Satoshi', 'Inter', system-ui, sans-serif;
  --sw-font-size-root: 15px;
  --sw-font-size-folder: 12px;
  --sw-font-size-file: 11px;
  /* ... etc ... */

  /* Geometry */
  --sw-radius-leaf: 6px;
  --sw-radius-folder: 8px;
  --sw-radius-root: 10px;
  --sw-pad-h: 12px;
  --sw-pad-v: 6px;
  /* ... etc ... */
}
```

Phase 3 will reference these via `var(--sw-...)` everywhere — so any future tweak is one-line.

### Save Figma file URL

In `design/2026-04-16-figma-workshop.md`, record:
- The Figma file URL (so Phase 3 can re-open if needed)
- A brief written summary of each frame's final spec
- Any decisions made during the workshop that aren't captured in the frames themselves
- A note: "Wisdom approved this on YYYY-MM-DD HH:MM"

## Output

```
Spatial Workspace/
├── design/
│   └── 2026-04-16-figma-workshop.md   ← NEW: Figma URL + decisions log
└── templates/v2/
    └── app.css                         ← UPDATED: CSS custom properties at top
```

Plus the Figma file itself (lives in Wisdom's drafts).

## Success Criteria

- [ ] All 6 frames exist in the Figma file and have been screenshotted
- [ ] Wisdom has explicitly said "approved" on each frame (capture the moment in chronicle)
- [ ] CSS custom properties are extracted to `templates/v2/app.css`
- [ ] `design/2026-04-16-figma-workshop.md` records the Figma URL and the decisions
- [ ] Backlinks-layer frame exists even though v2 won't render it (locks v3 design)

## When done

Write the completion note in `chronicle/<today>.md`. Tell Wisdom: **"Design workshop complete. Figma file approved. Tokens extracted to `templates/v2/app.css`. Ready for Phase 3 (Layout & Visual)."**

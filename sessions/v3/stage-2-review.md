# Session Brief — Stage 2 Review

**Project:** Spatial Workspace v3, Stage 2 review
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Umbrella spec:** [`../../SPEC-LAYOUT-v3.md`](../../SPEC-LAYOUT-v3.md) — read Stage 2 section in full.
**Depends on:** All five Stage 2 render sessions (2a–2e) must have produced their SVG + stats files.

---

## Why This Session Exists

Five parallel candidate renders produced fifteen SVG panels (5 candidates × 3 expansion states). This session composes them into a single bakeoff sheet and presents them to Wisdom for the pick.

---

## Goal

1. Compose all five candidates into one side-by-side review surface
2. Walk Wisdom through them in a structured tournament: eliminate obvious losers first, narrow to the finalist(s)
3. Record Wisdom's decision + reasoning in the chronicle
4. Write the Stage 3 brief based on the winner (or cancel Stage 3 if none advance)

---

## Inputs

Verify all of these exist before starting the review:
- `play/stage2a-baseline.svg` + `play/stage2a-baseline-stats.md`
- `play/stage2b-spiral.svg` + `play/stage2b-spiral-stats.md`
- `play/stage2c-circlepack.svg` + `play/stage2c-circlepack-stats.md`
- `play/stage2d-bubble.svg` + `play/stage2d-bubble-stats.md`
- `play/stage2e-voronoi.svg` + `play/stage2e-voronoi-stats.md`

If any is missing, the parallel Stage 2 session for that candidate hasn't finished — do not proceed with review until it's done. This review session is an integrator, not a skipping-ahead-er.

---

## Steps

### Step 1 — Build the composite review page
Write `play/stage2-bakeoff.html`:
- A static HTML file, no interactivity needed beyond zooming in a browser
- Grid layout: 5 rows (candidates) × 3 columns (expansion states)
- Each cell embeds the corresponding SVG at full resolution
- Row headers: candidate name + parameter count + render time
- Column headers: expansion state (default / one-deep / fully-expanded)
- Below the grid: a short summary block per candidate pulling key lines from its stats file

### Step 2 — Present to Wisdom

Open `play/stage2-bakeoff.html` in a browser. Walk through it in this order:

1. **Explain the field.** One sentence per candidate — what it is, why it's here.
2. **Ask the eliminator question:** "Which of these are clearly NOT what you want? Drop those first."
3. **Compare the survivors head-to-head.** For each pair, ask: "Which one is closer to what you pictured? Why?"
4. **Check against the original criteria:** a (adaptive), b (membrane), c (compression), d (continuous), e (good-looking). Does the leader satisfy all five on the eye test?
5. **Get the final call.** Winner OR none-advance OR "two are close, build both and we'll decide on interaction."

### Step 3 — Record the decision

Write a decision document at `play/stage2-decision-YYYY-MM-DD.md`:
- Which candidate won (or why none did)
- Wisdom's specific reasoning for each elimination and for the winner
- Any conditions on the winner (e.g., "X wins but only if we can solve labels-in-small-cells")
- Next step: Stage 3 brief with the winner's name, OR cancel Stage 3 and revisit Think Deep Open Threads

### Step 4 — Write Stage 3 brief (if a winner was picked)

Replace `sessions/v3/stage-3-tbd.md` with the real Stage 3 brief for the winner. This is a separate specification task — don't try to cram it into this review session. The brief should cover:
- Integration into the `Simulation` interface
- Transitions on expand/collapse
- Zoom and hit-box behavior
- Membrane layer (if relevant — circle-pack has it built-in; spiral needs post-hoc hulls; Voronoi has it; bubble has it; baseline needs nothing)
- Verification plan
- Estimated effort (2–5 days per the umbrella spec, but refine now that we know which algorithm)

### Step 5 — Chronicle

Detailed chronicle entry covering: who won, who lost, what was learned from each candidate's failure, what Wisdom's specific taste signals were (they feed future session briefs).

---

## Constraints

- This session does NOT write new renderers. All rendering happened in parallel sessions 2a–2e.
- This session does NOT start Stage 3 implementation. It only writes the Stage 3 brief.
- Wisdom drives the decision. The session's job is to structure the review, not to advocate.

---

## Success Criteria

- Bakeoff HTML opens cleanly and shows all 15 panels
- Wisdom has looked at each candidate and made an informed call
- Decision document recorded with reasoning
- Stage 3 brief written (if applicable) OR Stage 3 formally cancelled
- Chronicle entry captures the session fully

---

## If None of the Candidates Win

Not a failure — honest information. Revisit the Think Deep Open Threads:
- Slime mold / usage-memory layer
- ZUI / nested canvases (Muse-style)
- Different problem reframe entirely
- Port FoamTree (if we can license-check)

Write a new think-deep or debate brief for the next round. Do NOT fall back to iterating the existing layout — we've been there.

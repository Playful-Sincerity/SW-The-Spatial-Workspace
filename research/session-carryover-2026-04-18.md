# Active Context

## Current Task
Spatial Workspace v2 — Phase 3D (Clustered Outward Fan) layout port. Physics in `templates/v2/app.js createLayout()` works on initial load but degrades with sliders/expansions. A position clamp added last (bottom of the session) creates a visible rectangular barrier — Wisdom flagged this just before asking for this carryover.

## What happened this session (2026-04-17 overnight → 2026-04-18)
- Started as "Stage 1 bag-fix" from `SPEC-LAYOUT-v3.md`. Falsified and buried in conversation: bag-as-terminal was rejected because Wisdom wants cells, not drawers.
- Built 3 prototypes (in `play/`): d3.pack static, d3.pack progressive-zoom, radial-fan. Each revealed the next preference.
- Ported physics-cluster into v2: global d3-force sim + subtree-bubble force + outward-bias. Replaced tidy-radial.
- Added ⚙ physics slider panel (5 knobs) for live tuning.
- Attempted progressive tier-by-tier animation — CRASHED (forceLink rebinding bug). Reverted.
- Added position clamp as safety net — creates VISIBLE rectangular barrier.
- **5+ rounds of symptom-patching without isolating root cause. Session is closing because of this, not because it's done.**

## Key decisions to honor
1. **Buttons stay, circles parked** — `play/2026-04-17-d3-pack-prototype.html` is a saved alt mode, not the primary view.
2. **Outward fanning, not inward drilling** — stable preference across 3 sessions.
3. **Soap bubble invariant**: cohesion + deformation + non-interpenetration, all three at once.
4. **Procedural > batch for spatial systems** — Wisdom's diagnostic insight: *"when I do things procedurally it doesn't overlap. All at once it does."*
5. **Don't keep tuning five knobs against each other** — strip the bubble + outward forces, verify link+collide+charge converges, add back one at a time.

## Current direction
Restart physics from a minimum viable baseline. Remove the clamp artifact. Verify a simple link+collide+charge sim converges on real data before re-introducing bubble and outward forces.

## Biggest open gap
The pair-force compounding problem. Wisdom's progressive-tier insight is likely the real fix, but my first implementation crashed. Re-attempt with cleaner state handling, OR accept that the simple sim is good enough without the tier animation.

## Files to re-read (in order)
1. `~/Playful Sincerity/PS Software/Spatial Workspace/CLAUDE.md` — project conventions.
2. `~/Playful Sincerity/PS Software/Spatial Workspace/chronicle/2026-04-17.md` — full session narrative, including all 8 breath entries naming exactly what went wrong.
3. `~/Playful Sincerity/PS Software/Spatial Workspace/templates/v2/app.js` lines 157–470 — current `createLayout()` (physics-cluster + bubble + outward + clamp). Lines 1112+ for `updateTree`. End-of-file for the slider panel.
4. `~/Wisdom Personal/people/wisdom-profile/quirks-and-preferences.md` — five new entries landed this session: outward fanning, invisible containers, enough-signal-to-commit, bubble deforms, procedural > batch, preference-testing by building.
5. `~/Playful Sincerity/PS Software/Spatial Workspace/ideas/build-queue.md` — four parked items (containment alt mode, search-within-folder, cross-linkage lines, PeerMesh/ruflo home).
6. `~/Playful Sincerity/PS Software/Spatial Workspace/SPEC-LAYOUT-v3.md` + `sessions/v3/stage-1-bag-fix.md` — BOTH still describe the killed bag-fix plan. Needs amendment.

## Active framing
Physics-cluster layout is in v2, NOT done. It's a work in progress with known artifacts (visible clamp boundary). Wisdom has been patient across 8+ hours of iteration; the next session should move deliberately, not reactively. If a fix doesn't work in one attempt, revert and think — don't stack more forces.

## Where did play show up?
The core of this session WAS play — rapid prototype-react-prototype cycles where each of Wisdom's reactions revealed a deeper principle (outward > inward, cells are useful as physics not as containers, procedural > batch, soap bubbles). The failure mode was my own: I kept trying to tune toward what he described instead of pausing to ask "is there a simpler model?" The `/breath` skill fired 4× and I used it to reflect but then continued the symptom-patch pattern anyway. Honest data, not a performance review.

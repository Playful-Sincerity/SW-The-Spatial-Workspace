# v3-bubble working, tier controls next — Session Carryover (2026-04-19)

## What happened this session
- Started from yesterday's reset brief after Wisdom's 17hr dynamic-alt arc. Chose Path B (fractal tree) over Path A (circle packing).
- Built v3-tree (packed-balloon). Rendered as a fan at depth 1 — geometry: 22 similar-sized root children on any ring is ~280px radius, reads as fan regardless of algorithm. Variable-distance packing didn't help because subtreeRadii were all similar.
- Wisdom articulated the **bubble-physics vision**: each folder + children is an implicit bubble; children pack INSIDE the bubble region, not AROUND the folder at a radial distance. Bubbles never drawn — "it manifests that way." Pivot unlocked everything.
- Built **v3-bubble** using d3.pack + `.radius()` accessor for absolute sizing + synthetic self-nodes so folders reserve their own packing spot. Wisdom: "pretty good, not final but pretty good." First aesthetic win in the 18hr+ layout arc.
- Snapshotted state: git commit `56fcbcc`, tag `v3-bubble-packing-works-2026-04-19`, `SPEC-BUBBLE.md` written as distilled architecture doc.

## Key decisions and corrections
1. **Bubble ≠ drawn membrane.** The "bubble" is purely a layout primitive — invisible. Children spread from the folder's center because packing-inside-a-region produces that aesthetic. Don't render bubble outlines.
2. **d3.pack with `.radius()`, not `.sum()`.** `.radius()` forces absolute button-sized circles; `.sum()` alone would let d3.pack scale everything to `.size([w, h])` box and reintroduce spread.
3. **Synthetic self-nodes are load-bearing.** Each expanded folder gets an invisible leaf prepended to its children in a pack-only hierarchy. Without this, folder buttons overlap their nearest-center children. The self-node reserves space; the folder renders at the self-node's position.
4. **v3-tree (packed-balloon) is historical, not active.** Don't revisit. SPEC-TREE.md retained for context but SPEC-BUBBLE.md is current.
5. **Wisdom handles versioning via Claude.** He's explicit that he's not comfortable with git. Claude commits/tags on his behalf. Directory-level versioning (templates/v2, v2-dynamic, v3-tree, v3-bubble) is preserved for file-based recovery too.
6. **Bag threshold deferred.** We removed `INITIAL_EXPAND_BAG_THRESHOLD` from the reverts. Don't reintroduce unless specifically asked — bag-collapse is a separate build.

## Current direction
Build **tier-by-tier plus/minus expand controls** per the 2026-04-18 build-queue entry. Two buttons: plus expands *every* directory at the current max-visible-depth; minus collapses the deepest visible tier. Pairs naturally with v3-bubble because each tier reveal is a new d3.pack pass with more visible children — no new substrate needed. This also addresses Wisdom's "too spread" critique by letting him choose how much tree to reveal at a time.

## Biggest open question or gap
Is the "too spread" feeling a tuning issue (drop `leafRadiusScale` below 1.0 to allow slight rectangular corner overlap) or an architecture issue (bubble *emission* — where expanded folders become their own adjacent bubbles instead of all visible nodes packing in one big bubble)? Wisdom's speech described emission semantics we didn't implement — current v3-bubble puts everything in one big pack. Plus/minus might make spread acceptable; emission is the bigger architectural move if not.

## Files to re-read first
1. `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/SPEC-BUBBLE.md` — distilled v3-bubble architecture (three mechanics, constants, what works, what's still off). Read first.
2. `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/knowledge/sources/wisdom-speech/2026-04-19-bubble-physics-vision.md` — Wisdom's full speech articulating the bubble model. The source of truth for the design intent.
3. `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/ideas/build-queue.md` — has the plus/minus tier spec (2026-04-18 entry), implementation notes included.
4. `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/templates/v3-bubble/app.js` — working implementation. Layout engine at `createLayout()`; note the nodesByPath map + synthetic self-nodes pattern.
5. `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/CLAUDE.md` — project conventions (stdlib Python only, single HTML file, etc.).
6. `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/chronicle/2026-04-19.md` — session log, latest entries at the bottom.

## Active framing
**Packing, not fanning.** The fan was never an algorithm problem — it's what happens when N similar circles sit around a single center point (irreducible geometry). v3-bubble escapes that by packing children *inside* a shared region with the folder, not around it. Every future tuning decision should preserve this property. If something starts radiating again, you've regressed.

Also: **d3.pack is the right tool, don't reimplement.** Any instinct to write custom circle-packing math should be resisted — d3.pack is production-validated and the `.radius() + self-nodes` combo solves the specific quirks.

## Where did play show up?
The bubble-physics speech. Wisdom monologued a new design model mid-frustration — not a reactive correction but a generative act. The phrasing ("buttons spreading out from the center," "leaves that bubble and finds a space") preserved an intuition that was inaccessible before he put it into words. Preserving the raw speech to `knowledge/sources/wisdom-speech/` was the right move per the preserve-human-speech rule — future entities (or future-Wisdom) can trace design decisions back to the moment they crystallized.

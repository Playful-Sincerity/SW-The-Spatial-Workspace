---
timestamp: "2026-04-18"
category: idea
related_project: Spatial Workspace v2
source: wisdom-speech — knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md
status: philosophy (not scheduled for implementation)
---

# Phototropism — Layout as a Tree Reaching for Light

## The Metaphor

Wisdom (2026-04-18, voice-note while away from the computer):

> Think of the viewer's eyes as light, and the file tree as an actual tree reaching toward that light. The tree wants to:
>
> 1. Maximize **total leaf surface area** in the light (buttons cover as much of the visible view as possible)
> 2. Minimize **structural mass** (lines — keep branches short, few, and lean)
> 3. Maximize **individual leaf size** (each button is as big as legibility allows)
> 4. Never **overlap** leaves (an overlapped leaf catches no light — a wasted investment)

He added: *"whether or not you think that's essentially what we're modeling is another story. I just wanted to capture that idea here."*

## Why It's Load-Bearing

The current layout engine is a force simulation. Forces are an **emergent** path to a good layout — they settle into an equilibrium, and we tune parameters until the equilibrium looks right.

Phototropism offers an alternative framing: an **explicit objective function**. Given any rendered layout, we can compute:

- `A` = total button area visible in the viewport (leaf surface)
- `L` = total line length + line count penalty (structural mass)
- `S` = per-node size variance / minimum (individual leaf size)
- `O` = total overlap area (wasted leaves)

A layout is "good" to the degree that `A` and `S` are high while `L` and `O` are low. That's measurable, not aesthetic.

## What This Could Inform

- **Eye-test framing**: when comparing pinned-expanse vs. dynamic-expanse, ask *which one catches more light with less mass?* That's a more concrete criterion than "looks better."
- **Future layout engine**: optimize the objective directly (gradient descent, simulated annealing, or tree-specific heuristics) instead of settling through physics. Physics settles at a local minimum of a different (force-balance) objective, which doesn't cleanly map to the visual goal.
- **Spacing reasoning**: the gaps between sibling subtrees are the "sky" left open for other leaves — the tree wants them *as small as possible* while still preventing overlap. Current bubble force sort of does this; phototropism says it directly.
- **Zoom behavior**: the "light" is the viewport, so at every zoom level the tree's optimal shape is *different*. A phototropism-native engine would re-layout per zoom; the force sim doesn't.

## Open Questions

1. Is `A / (L + 1)` a useful single-scalar quality metric?
2. Should overlap be a hard constraint (never allow) or a soft penalty?
3. How do connector lines weigh against leaf area — is there a natural ratio from biology (real trees have measurable leaf-area-to-wood-mass ratios)?
4. Does the metaphor survive when the tree isn't laid out radially? (A real tree branches omnidirectionally toward light; our current radial layout already assumes a center-fed light source.)

## Status

Design philosophy, not an implementation task. Captured for future reference. May inform eye-test judgment in the pinned-vs-dynamic comparison.

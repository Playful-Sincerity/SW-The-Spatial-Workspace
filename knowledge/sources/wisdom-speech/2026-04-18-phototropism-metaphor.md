---
source: Wisdom's original speech
captured_at: 2026-04-18
session: Spatial Workspace v2 — dynamic-expanse prototype thread
context: Voice-note idea shared while Wisdom was away from the computer. A philosophical framing for what the layout algorithm is fundamentally optimizing — offered as a metaphor, held loosely.
---

# Wisdom's Speech — Phototropism Metaphor for Layout (2026-04-18)

> "Hey. I'm away from the computer right now, but I just wanted to say I had an idea. Essentially, it's like you can basically think about the eyes as light. The eyes of the person viewing as light. And you think of the files as a tree. Essentially, the tree is gonna try to optimize the most leaves taking up the most surface area of the light, which is, in this case, the view. Right, with the least amount of structure, which in this case would be the lines. Right, while still actually — not while still — maximizing like, each leaf, which is, in this case, the buttons. Right? And you don't wanna be overlapping because that means when you're building — a leaf that would not be utilized, that would not be capturing, like, you know what I mean? It's just an interesting philosophy. Whether or not you think that's essentially what we're modeling is — is is another story. I just wanted to capture that idea here."

## The Four Quantities Wisdom Named

| Biological | Layout |
|---|---|
| Light reaching the canopy | Viewer's eyes / visible viewport |
| Leaves | Node buttons |
| Structural mass (branches) | Connector lines |
| Leaf surface area | Total rendered button area in view |
| Individual leaf size | Per-button size (legibility) |
| Overlap in canopy | Node/subtree overlap |

Objective implied:
- **Maximize** total leaf surface area intercepting the light.
- **Maximize** per-leaf size (legibility of each button).
- **Minimize** structural mass (line length, line count, line crossings).
- **Zero overlap** — an overlapped leaf captures no light; it's wasted investment.

## Pattern Observations

- Grounds an abstract computational problem in a physical/biological analogue. Consistent with a pattern already captured in `intellectual-signature.md` ("Grounds idealism in physics — self-worth in mass, love in gravity"). The metaphor family now includes biology, not just physics.
- Offered tentatively — "whether or not you think that's essentially what we're modeling is another story." Invited examination rather than prescribing.
- The metaphor is **testable**: the four quantities above can each be measured on a rendered layout, which means the metaphor could become an explicit objective function rather than a framing.
- Voice-note cadence: starts with "I had an idea," lands each variable one by one, ends by explicitly handing it off ("just wanted to capture that idea here"). Classic Wisdom idea-seeding: drop the seed, don't push it.

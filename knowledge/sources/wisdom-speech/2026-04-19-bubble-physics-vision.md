---
source: Wisdom's original speech
captured_at: 2026-04-19
session: Spatial Workspace v3-tree — packed-balloon iteration, fan-problem diagnosis
context: After v3-tree's first two renders both landed as fans (uniform radial distribution at depth 1, too spread at depth 3), Wisdom compared against v2 and articulated a bubble-based physics vision — the underlying model for what he's been asking for across 18+ hours.
---

# Wisdom's Speech — Bubble Physics & Nested Packing Vision (2026-04-19)

> "Okay, the clustering looks okay, but for some reason it got shot out way far again. Right? But there's like a minimum distance. And they can't overlap. They've got the bubbles, right? I don't even know. And then like maybe it could be that The children yeah okay so okay so you've got these bubbles in the membrane bubble essentially is stopping the children from being attracted to anything else. But what is attracted to other things is the bubble itself and through the main folder that is now expanded with that bubble. If you'd like to you could um you could draw those bubbles and kind of have the bubble physics where they kind of you know squish and compress like bubbles do and then the buttons within would be kind of evenly distributed within the bubble And then you just draw lines between the center folder and all of its children. And then when you go to expand a folder inside of a bubble, it leaves that bubble, finds a space where its expanded bubble can now fit. Right? And expands into that with the same packing physics. But that folder, it wants to be as close as possible to its parent. That folder with now the expanded children around it, that bubble itself wants to be as close to the folder as possible within the minimums. The parent folder, its parent bubble within the minimums. You what I mean? and so there's like a packing compression what do you think about all that we might have to think about that fairly deeply for a second yeah it's like we still does this common issue this really common problem here is just like for some reason the force of keeping the thing of the thing when it expands it just fuckin really it really throws itself out there I just did let's see I just did freeze old nodes again and this time it came back in more but it's still expanding too far as I'm going out so yeah something's not quite right still anyway what do you think about all that if you need to decompose the things I'm saying and the different ideas and then think about it consecutively or whatever go ahead"

## The Model, Decomposed

### 1. Bubble = primary abstraction

A **bubble** is a parent folder + its immediate (visible) children, treated as a single unit. The bubble is the actor in the physics system. Individual nodes are not actors between-bubbles; they only interact within their own bubble.

### 2. Membrane = interaction boundary

The bubble's membrane isolates its contents. Children inside a bubble don't feel forces from things outside the bubble. Only the bubble as a whole interacts with external bubbles. This cleanly separates within-bubble layout (deterministic) from between-bubble layout (compression physics).

### 3. Within-bubble: even distribution, local lines

Buttons inside a bubble are "evenly distributed within the bubble." Lines are drawn only between the center folder and its immediate children — no cross-bubble lines crowding the view.

### 4. Between-bubbles: compression with minimums

Bubbles:
- Have minimum distances (can't overlap)
- Want to be as close as possible to their parent (attraction)
- Squish and compress like physical bubbles when adjacent (soft deformation at boundaries)

The layout is a nested compression: each bubble settles as tight as it can against its neighbors and as close as it can to its parent, respecting non-overlap.

### 5. Expand = bubble emission, not re-layout

When user expands a folder *inside* a bubble:
- That folder **leaves** its current parent bubble
- Becomes its own bubble (containing itself + its children)
- The new bubble finds a space nearby where it fits without overlapping other bubbles
- The folder-itself wants to be close to its former parent bubble; the new bubble's membrane respects non-overlap against everything
- Same packing physics as the parent level — recursive

### 6. Hierarchy of "want to be close"

Nested desire chain:
- Each expanded folder wants to be close to ITS parent (the folder that contained it)
- That folder's new bubble wants to be close to the folder
- Each bubble wants to be close to the parent bubble it came from
- All subject to minimum-distance/non-overlap

This creates a hierarchical spring system where each bubble pulls toward its ancestor but is held apart by non-overlap constraints.

## Why This Addresses the Fan Problem

The fan problem: N similar-sized children radiating from a single parent point produces a radial ring by geometry. No algorithm packing circles around a point can escape this.

The bubble model escapes it by changing the shape of the container:
- At depth 1, root's children are not radiating from root — they're *packed inside* root's bubble alongside root
- A circular region containing 23 items produces a 2D arrangement (hex-pack-like), not a fan
- Lines from root → each child are short because the child is in the same bubble region as root

The fan only appeared because we were placing children *around* root at a radial distance. Wisdom's model packs them *with* root inside a shared membrane.

## Key Architectural Shift

| Current v3-tree (packed-balloon) | Wisdom's bubble model |
|---|---|
| Children radiate from parent | Children packed inside parent's bubble |
| Distance = subtreeRadius-based | Distance = bubble-packing geometry |
| Tree = parent-child links | Tree = nested bubbles with emission on expand |
| Expand in place (child joins canopy at distance D) | Expand = emit new bubble, find nearby space |
| No visible containers | Bubbles drawn as membranes |

## The Key Quote on Compression

> "that folder, it wants to be as close as possible to its parent. That folder with now the expanded children around it, that bubble itself wants to be as close to the folder as possible within the minimums. The parent folder, its parent bubble within the minimums. [...] and so there's like a packing compression"

The hierarchical spring/compression system is the physics that holds the whole thing together. Not a radial layout with a spring to parent — a nested containment where *every level wants to be tight against every other level, bounded only by non-overlap*.

## Pattern Observations

- Wisdom's earlier "phototropism" metaphor was the objective (max canopy / min structure). This bubble model is the mechanism that achieves it — bubbles pack to minimize structural line length because children are close to their parent inside the same membrane.
- Voice-note cadence matches Wisdom's "seed the idea, invite examination" style: opens with observation, proposes model, narrates the expand dynamics, ends with "what do you think about all that we might have to think about that fairly deeply for a second."
- Reference to the "freeze old nodes" slider at the end confirms the test was on v2, and the problem persists even with aggressive pinning — validates that the substrate (not the tuning) is what's off.
- This is the first speech that gives a complete end-to-end model: primary object (bubble), interaction rules (within/between), expansion behavior (emission), and underlying force (nested compression). Prior speech fragments described *symptoms* ("leaves clustering," "no pie chart") — this describes a *mechanism*.

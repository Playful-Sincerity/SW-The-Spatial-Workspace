---
timestamp: "2026-04-16 17:04"
captured_during: Phase 3 Layout & Visual (post-lockup resume)
status: idea — not yet designed
related_project: Spatial Workspace v2
---

# Folder-Size Visual Differentiator

## The observation

> "some markdown files don't have numbers right because they're at the end but it would also be nice if they had some kind of better visual change differentiator ... some kind of design system that basically shows you that the more files that are inside a given file ... some way to kind of visually understand how big a folder is just from the folder button itself."
> — Wisdom, during live canvas review

## What he's pointing at

Currently, folders carry a count in their label like `Claude System (25)`. Files (leaves) don't get counts because they have no children — this is correct. But Wisdom wants folder-size legible *at a glance* from the button itself, not just the parenthesized number. Something closer to: "oh, that folder is huge" before you even read the label.

## Shape of the idea (not yet committed)

Possible visual encodings for "folder size":
- **Button height swell** — folder button height grows slightly with log(descendant count). Biggest folders get taller buttons.
- **Border weight** — 1px for <10 descendants, 1.5px for 10–100, 2px for 100+.
- **Background intensity** — small tint saturation bump proportional to size (but note: conflicts with status-as-ambient-color work in this same iteration — would need to pick one channel per dimension).
- **Stacked badge** — small multi-layer dot or chevron stack next to the count number. More layers = bigger folder.
- **Icon-based** — 📁 for <10, 📁📁 for 10–100, 🗄️ for 100+ (emoji placeholder; real design would use drawn icons).

## Tension with current color semantics fix

This iteration is moving status from fill-color to a left-edge accent stripe (to free the fill channel from meaning "phase"). If "folder size" also wants a visual channel, candidates are: border-weight, height-swell, or a secondary accent element. Background tint is currently off-limits because it would re-couple fill-color to a meaning, which was just decoupled.

## Principles to carry in

- **Pick one channel per semantic dimension.** Fill = identity/type. Left-stripe = status. Something else = size. Don't stack meanings on one channel.
- **Must stay readable at zoom-out.** If the difference needs you to zoom to see it, it's not "at a glance."
- **Must survive physics settle.** No positional encoding (can't hang something above/below the button — collision won't protect it).

## Open questions for the design session

1. Is "folder size" = direct children, or total descendants? (Feels like descendants — what Wisdom meant by "how big a folder is.")
2. How many buckets? (3 feels right: small / medium / large.)
3. Should the root be treated specially or included in the scale?
4. Does this replace or complement the `(N)` number in the label?

## Not doing now

This is flagged for a future design pass. Current iteration (colors + overlap + file-reader) completes first. Revisit in Phase 4 or a dedicated Phase 3.5 session.

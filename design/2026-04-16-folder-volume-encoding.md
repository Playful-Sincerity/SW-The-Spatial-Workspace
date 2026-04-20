# Folder Volume — Visual Encoding (v6 Candidate)

**Context:** Parked idea surfaced at the close of the Phase 2 Figma Workshop (2026-04-16 ~01:40 PDT). This is the **second axis** of the two-variable encoding Wisdom first raised earlier in the session — color-hue already carries *recency* (activity heat), and volume/size is the second dimension that would make the canvas a true 2D information map.

**Status:** Design exploration. Not implemented in v2. Earmarked for v6. Written here so it doesn't get lost between now and when we get back to it.

---

## The Problem

Right now every folder shows a numeric count: `PS Software · 42`, `PS Media › 18`. Files show a word count. The numbers are there, but reading a number is a *sequential* operation — your eye has to focus, parse digits, compare. The canvas is meant to be a **spatial** tool; at a glance you should be able to see which folders are big without reading.

Leaf-file volume shows up elsewhere (word count), but the folder-level "how much is in here" signal is currently entirely numeric. Wisdom's diagnosis: "some kind of design system that basically shows you that the more files that are inside a given file — there is something that is showing you that. There's some way to kind of visually understand how big a folder is just from the folder button itself."

---

## Design Options

Twelve ways to encode volume visually. Each has trade-offs.

### A. Elevation / drop-shadow depth scales with size
**Mechanic:** bigger folders cast a deeper drop shadow. Small folder = subtle `0 1px 3px`. Large folder = `0 6px 16px`.
**Pros:** intuitive (weight-as-gravity metaphor), uses tokens we already have, no new visual vocabulary.
**Cons:** on a dark canvas, shadow differences are subtle and may not read at 50% zoom.
**Feel:** physically grounded — big folders feel "heavier."

### B. Border thickness scales logarithmically
**Mechanic:** folder border = `1px + log10(N) × 0.3px`, clamped to 0.75–2.5px. 10 files = 1.3px. 100 = 1.6px. 1000 = 1.9px.
**Pros:** continuous encoding, very subtle, no extra chrome.
**Cons:** conflicts with the 1.5px status-border convention on *files*. Folders don't have status today, but if they ever do, this breaks. Also logarithmic precision is hard to read without a reference.
**Feel:** typographic, Swiss-design-adjacent.

### C. Tiered dot indicator (discrete)
**Mechanic:** folder button ends in N small dots indicating a size tier. 1 dot = <10 files, 2 dots = 10–50, 3 dots = 50–200, 4 dots = 200+. `PS Software · 42 ••`.
**Pros:** instantly scannable, discrete (no precision problem), tiny visual footprint.
**Cons:** introduces a new visual primitive (dot-rows); users need to learn the tier scale.
**Feel:** military / data-dashboard — punchy and legible.

### D. Surface brightness modulates with size
**Mechanic:** folder fill goes `--sw-surface` → `--sw-surface-lift` → `--sw-surface-bright` across three volume tiers.
**Pros:** uses existing tokens, subtle, reinforces "bigger = more present."
**Cons:** conflicts with hover/active state vocabulary (which also modulates surface). Could read as "is this folder hovered?" confusingly.
**Feel:** soft, atmospheric.

### E. Thin vertical "fill bar" inside the button
**Mechanic:** a 2–3px vertical bar on the left edge of the folder button, height proportional to size. Small folder = 20% filled bar. Big folder = 90% filled.
**Pros:** reads as "fullness" — very intuitive.
**Cons:** needs a clear max scale to feel right. The "battery indicator" visual is loaded with meaning (low/high) that might not map cleanly to "size." Also eats horizontal padding.
**Feel:** product-like, mini-dashboard.

### F. Stacked-pages glyph scales with count
**Mechanic:** tiny icon inside the folder button showing 1–4 stacked rectangles indicating size tier. Like a file-stack icon that grows.
**Pros:** explicit (the icon means "how many pages inside"), decorative-but-semantic.
**Cons:** adds iconography to every folder — risks crowding tight folder buttons. Breaks the "label is the node" discipline from the design brief.
**Feel:** concrete, literal.

### G. Corner radius scales with size
**Mechanic:** small folders get 4px radius, medium 8px, large 12px. Rounder = bigger.
**Pros:** unusual and distinctive, uses geometry alone.
**Cons:** corner radius is usually used semantically (button vs. pill vs. tag), not quantitatively. Risks looking like a bug.
**Feel:** playful but potentially confusing.

### H. Text weight bump by tier
**Mechanic:** folder label gets heavier as folder grows. `<10 files: Regular`, `10–100: Medium`, `100+: Semi Bold`.
**Pros:** pure typography, no chrome, elegant.
**Cons:** text weight also signals hierarchy (root vs. folder vs. file). Adding volume to the weight axis is double-duty and may confuse.
**Feel:** editorial, magazine-like.

### I. Button size (width padding + height) scales with size
**Mechanic:** big folders get wider and slightly taller buttons.
**Pros:** most literal — "bigger" is bigger.
**Cons:** fights the physics layout (node sizes drive collision); breaks label-width-hugs-content convention. Wisdom already rejected size variance for other reasons.
**Feel:** obvious but disruptive.

### J. Saturation of the count-text itself
**Mechanic:** the `42` number on a big folder is brighter (`text-2`) than on a small folder (`text-4`). Reading the number is more visually weighted for bigger folders.
**Pros:** scales the number's visual weight with its magnitude — meta-intuitive.
**Cons:** so subtle it may not register as "volume encoding" — reads as "hmm, that's brighter for some reason."
**Feel:** invisible polish.

### K. A subtle outer halo scaled with size
**Mechanic:** folder drop-shadow includes a faint warm-white outer glow, larger radius = larger folder. Like elevation (A) but with light instead of darkness.
**Pros:** atmospheric, premium — matches the v5 "atmospheric precision" vocabulary.
**Cons:** warm-white halos can look like "selection" or "hover" — semantic collision.
**Feel:** Liquid Glass, soft.

### L. Hybrid — dot tier + shadow depth
**Mechanic:** combine (C) and (A). Dots give discrete tier reading, shadow gives continuous weight feel.
**Pros:** belt and suspenders — both scannable and felt.
**Cons:** two signals for one variable, risks overload (the thing we explicitly avoided in v5).
**Feel:** information-dense.

---

## Leading Recommendation — REFINED per Wisdom's clarification 2026-04-16 01:50 PDT

Wisdom's refinement: the number and the dots are **two different pieces of information**, not one being a proxy for the other. Both carry semantic weight:

- **Number (the `· N`)** = total file descendants of this folder. How MUCH is inside.
- **Dots (the `• •• •••`)** = depth of subfolder nesting (tiers). How DEEP / branchy the tree inside this folder is.

This is richer than a single magnitude encoding. Two folders can have the same file count but wildly different shapes:

| Folder | Count | Depth | Reading |
|---|---|---|---|
| `Flat Notes · 42` | 42 | 0 | 42 files sitting directly in one folder, no subfolders |
| `PS Media · 18 •` | 18 | 1 | 18 files, one level of subfolders |
| `PS Software · 42 •••` | 42 | 3 | 42 files spread across a 3-deep tree |
| `Claude System · 64 ••••` | 64 | 4 | deep, branchy — 4 levels of nesting |

**Reading the pair:** "big number with no dots" = flat stash. "big number with many dots" = big structured hierarchy. "small number with many dots" = deeply-nested but sparsely-populated. Each reading tells you something different about how to navigate it.

### Encoding mechanics

- **Number:** after a middot separator. `· 42` for expanded folders; `› 42` for collapsed folders (chevron as the "click to expand" affordance).
- **Dots:** immediately after the number, same line, same text size. 3px circles with 2px spacing. `var(--sw-text-3)` color (pure-neutral — NOT heat-colored, to keep depth and activity decoupled signals).
- **Max depth shown:** clamped at 5 dots. Beyond 5 tiers, the dot count maxes out at 5 — the tier signal becomes "5+" visually. Rare in practice for most vaults.
- **Zero dots:** a folder with no subfolders shows NO dots — just the count. Zero dots = flat container. This keeps the "has subfolders at all?" binary readable.

### Why dots-over-alternatives

1. **Discrete is better than continuous at a glance.** Wisdom's goal is "at a glance" reading. Four-five tiers is what the eye actually resolves at quick scan; logarithmic continuous would require a mental reference.
2. **Tiny visual footprint.** 3px circles with 2px spacing — at most 5 dots = ~23px. They sit after the count on the same text baseline.
3. **Reuses existing vocabulary.** Dots are already a primitive we use (status dots in reader dropdown, live-indicator in header). Extending the dot-primitive for depth leverages learned recognition instead of inventing new chrome.
4. **Composes cleanly with activity heat.** Heat lives on leaf files via border color. Depth dots live on folders via text suffix. Different granularities (leaf vs. container), different visual channels (border vs. text), zero semantic overlap.

**Fallback if the dot-depth combo doesn't land:** try (A), elevation depth. It's physically intuitive and uses only tokens we have.

**Reject outright:** (G) corner radius (confusing), (I) button size (breaks layout), (F) stacked icon (too literal, adds clutter), (L) hybrid (violates the "one signal per variable" principle).

---

## How It Ties Into v6 Plan

v6's identity is **two-variable encoding:** *recency × volume*.
- Recency = activity heat (already in v5). Border color + tinted surface.
- Volume = this doc. Folder-level dot tier (leading) or elevation depth (fallback).

File-level volume is already handled via word count in the `· N` suffix. The leaf heat tint is already activity. So file-level is one-signal-only (recency); volume is implicit in the word count. This is fine — files don't benefit from the same at-a-glance volume encoding the way folders do, because a file is a point and a folder is a container.

If v6 ships with tiered dots: the legend panel in v5 / 5b.6 grows by one block — a "SIZE" column next to "ACTIVITY" showing the dot tier scale.

---

## Risks / Unknowns

1. **What's the tier scale for a real vault?** The tiers above (10 / 50 / 200) are guesses. Need to check distribution in Wisdom's actual vault (3,976 notes across 1,236 directories per v5's mock header). May need to recalibrate after a test.
2. **Does the dot tier read as "status"?** If users associate dots-after-label with status, they may misread volume as a status signal. Mitigation: the legend explicitly labels it "SIZE" and the tier scale makes it obviously quantitative.
3. **Interaction with deep hierarchy.** If a folder's count is `7,432`, does the four-dot max max out? Need a consistent cap so the scale doesn't feel broken at the extremes.
4. **Accessibility.** Dot counts shouldn't be the *only* encoding; the numeric count `· N` stays for screen readers and precision.

---

## Open Questions for Wisdom

1. **Depth cap at 5?** A folder 7 tiers deep shows as 5 dots — "5+." Is 5 the right cap, or should it be 4 (tighter visual max) or 7 (full fidelity for deep vaults)?
2. **Dots on collapsed folders?** Currently planned: yes, dots render regardless of expand state. When a folder is collapsed (`› 8`), the dots still show the internal depth. This lets you see "this collapsed folder is deep" without expanding it.
3. **Dot color: always neutral, or match activity heat when set?** Leaning pure-neutral (`var(--sw-text-3)`) so volume and recency are always decoupled signals. But if the folder's contents are all hot (green), matching dots to the hot color could reinforce the message. Trade-off: simplicity vs. composition.
4. **Does "depth" count the folder itself?** Convention I've locked in: no. Zero dots = the folder has no subfolders; 1 dot = one layer of subfolders below. Each dot is a tier of nested containers below this folder.
5. **What about subfolder COUNT vs. depth?** The original clarification could read either way ("how many subfolders are under" = count; "number of tiers" = depth). I've interpreted as depth because it's more unique info (file count already proxies for size; subfolder count correlates with file count; depth is independent). Confirm preference — if you meant count, we can swap trivially.

---

## When to Pick This Up

After Phase 3 (layout + visual) ships and the core canvas renders cleanly. v6 is a polish layer — don't block core functionality on it.

Phase 3 driver: don't implement this. It's a future layer.

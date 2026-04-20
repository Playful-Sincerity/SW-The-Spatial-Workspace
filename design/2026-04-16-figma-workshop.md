# Figma Workshop — Decisions Log (Phase 2 Handoff)

**Project:** Spatial Workspace v2
**Date:** 2026-04-16
**Workshop duration:** ~22:00 → 01:20 PDT (~3.5 hours real-time with Wisdom)
**Chronicle:** `chronicle/2026-04-16.md` (777 lines, every decision timestamped)

---

## Figma File

- **URL:** https://www.figma.com/design/iO7AOOyO8IEC4s5FezCGU2
- **File key:** `iO7AOOyO8IEC4s5FezCGU2`
- **Page:** "v2 Design Workshop"
- **Total frames:** 13 primary frames + version labels
- **Canonical references for Phase 3 implementation:**
  - **Frame v5** (`8:1250` — find by name `v5 — solid-colored surfaces + overlap fix + leaf counts`): the **canonical canvas** language. Full radial tree, all nodes, activity heat applied. Phase 3 implements the live canvas to match this frame.
  - **Frame 5a.4** (find by name `Frame 5a.4 — Reader open v4`): the **canonical reader-open** composition. Canvas on left (55%), reader panel on right (45%), tab strip, body, footer.
  - **Frame 5b.6** (find by name `Frame 5b.6 — Reader minimized v6`): the **canonical reader-minimized** composition. Full canvas, OPEN FILES dropdown top-right, activity legend bottom-right.

## Approval Log

| Frame | Wisdom approved on | Notes |
|---|---|---|
| v5 (canvas) | 2026-04-16 ~23:52 PDT | "I like the original v5 more" → used as reference for all subsequent frames |
| 5a.3 | 2026-04-16 ~00:30 PDT | "Frame 5a.3 looks great for now, this is perfect" |
| 5a.4 | 2026-04-16 ~01:12 PDT | Built to 5a.3 spec + full v5 canvas + simpler chevron arrow |
| 5b.5 | 2026-04-16 ~01:00 PDT | "Frame 5b.5 looks the best" |
| 5b.6 | 2026-04-16 ~01:12 PDT | Built to 5b.5 spec + full v5 canvas |

Iterations 5a.1 / 5a.2 / 5b.1 / 5b.2 / 5b.3 (Wisdom-authored) / 5b.4 remain in the file as version history, not as implementation targets.

---

## Design Tokens (→ `templates/v2/app.css`)

All values are authoritative. Phase 3 references via `var(--sw-*)` everywhere; no hardcoded colors or sizes in component CSS.

### Colors

| Token | Hex / Value | Purpose |
|---|---|---|
| `--sw-bg` | `#141210` | Canvas background (warm near-black) |
| `--sw-bg-center` | `#1C1916` | Radial gradient center (subtle atmosphere) |
| `--sw-panel` | `#1A1714` | Header + reader panel background |
| `--sw-surface` | `#1E1C16` | Default node fill, tab inactive |
| `--sw-surface-lift` | `#22201A` | Tab active, dropdown, legend panel |
| `--sw-surface-bright` | `#2A271F` | Hover lift |
| `--sw-text` | `#EDE5D5` | Primary text (warm off-white) |
| `--sw-text-2` | `#A89B8B` | Muted (inactive tab label, header meta) |
| `--sw-text-3` | `#7A7266` | Tertiary (path subtitles, legend labels, icons) |
| `--sw-text-4` | `#52493F` | Hints (unused in v2, reserved) |
| `--sw-purple` | `#9D7AF5` | Brand accent (root glow, selection ring, links) |
| `--sw-purple-mid` | `#6247BF` | Root gradient start |
| `--sw-purple-deep` | `#3A2A7A` | Root gradient end |
| `--sw-purple-link` | `#B89DF9` | In-body link color |
| `--sw-code` | `#13110E` | Code block background |
| `--sw-hilite` | `#EDE5D5` | White-at-low-opacity source (used via `/ 0.06`, `/ 0.08`, etc.) |

### Activity Heat (status colors + tinted surfaces)

| State | Border hex | Surface hex (10% blend over `#1E1C16`) | Time window |
|---|---|---|---|
| `hot`  | `#5BD19A` | `#242E23` | ≤ 7 days |
| `warm` | `#F5B859` | `#342B1D` | 8–30 days |
| `cool` | `#86ACE8` | `#282A2B` | 31–90 days |
| `cold` | `#E5976E` | `#32281F` | 90+ days |

CSS variables:
```css
--sw-heat-hot:     #5BD19A;  --sw-heat-hot-bg:  #242E23;
--sw-heat-warm:    #F5B859;  --sw-heat-warm-bg: #342B1D;
--sw-heat-cool:    #86ACE8;  --sw-heat-cool-bg: #282A2B;
--sw-heat-cold:    #E5976E;  --sw-heat-cold-bg: #32281F;
```

**Semantic:** Activity heat is **auto-derived** from file mtimes. Override per-file via YAML frontmatter `status: hot|warm|cool|cold` (or legacy `active|building|concept|paused` mapped to the corresponding heat). Config-driven per vault in `config.json`'s `statusColors`.

**Visual rule:** Solid heat-tinted surface fill + 1.5px solid colored border. **Nothing else.** No tint overlay, no colored dot on node, no colored glow. Single-signal principle — "cut the idea to get the base right" (Wisdom, 2026-04-16 23:04).

### Typography

| Role | Font | Size | Weight | Letter-spacing | Line height |
|---|---|---|---|---|---|
| Root node | Satoshi → Inter | 14.5px | 600 (Semi Bold) | -2% | 1.0 |
| Folder node | Satoshi → Inter | 12px   | 500 (Medium)    | -1.5% | 1.0 |
| File node | Satoshi → Inter | 11px   | 500 (Medium)    | -1% | 1.0 |
| Header title | Satoshi → Inter | 12.5px | 600 (Semi Bold) | -1.5% | 1.2 |
| Header meta | Satoshi → Inter | 10.5px | 500 (Medium)    | +4% | 1.4 |
| Reader H1 | Satoshi → Inter | 20px   | 700 (Bold)      | -2% | 1.3 |
| Reader body | Satoshi → Inter | 13px   | 400 (Regular)   | 0 | 1.6 |
| Reader section header | Satoshi → Inter | 11px | 600 (Semi Bold) | +10% | 1.4 |
| Tab label (active) | Satoshi → Inter | 11px   | 600 (Semi Bold) | -1% | 1.0 |
| Tab label (inactive) | Satoshi → Inter | 11px   | 500 (Medium)    | -1% | 1.0 |
| Panel header ("OPEN FILES", "ACTIVITY") | Satoshi → Inter | 9–9.5px | 600 (Semi Bold) | +14% | 1.0 |
| Code block | JetBrains Mono → Inter | 12px | 400 (Regular) | 0 | 1.6 |
| Footer meta | Satoshi → Inter | 10px | 400 (Regular) | +2% | 1.0 |

**Font stack (CSS):**
```css
--sw-font-stack: 'Satoshi', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--sw-font-mono: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
```

**Loading:** Satoshi via Fontshare CDN with `<link rel="preload">` to avoid initial-paint FOUT:
```html
<link rel="preload" href="https://api.fontshare.com/v2/css?f[]=satoshi@500,600,700&display=swap" as="style">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@500,600,700&display=swap" rel="stylesheet">
```

**CSS note:** Letter-spacing in Figma is `%` (percent of font-size). Convert to `em` units for CSS (`-2% → -0.02em`).

### Geometry

```css
--sw-radius-root:    10px;
--sw-radius-folder:   8px;
--sw-radius-file:     6px;
--sw-radius-tab:      6px;
--sw-radius-button:   4px;
--sw-radius-pill:   999px;
--sw-radius-panel:   12px;
--sw-radius-frame:   14px;
```

### Spacing

```css
--sw-space-1:  4px;
--sw-space-2:  8px;
--sw-space-3: 12px;
--sw-space-4: 16px;
--sw-space-6: 24px;
--sw-space-8: 32px;
```

### Node anatomy (padding × height × minWidth)

| Kind | minWidth | Height | Padding horizontal | Corner radius |
|---|---|---|---|---|
| Root   | 230px | 44px | 18px | 10px |
| Folder | 112px | 32px | 14px | 8px  |
| File   | 88px  | 28px | 12px | 6px  |

All node inner layout: `display: flex; align-items: center; justify-content: center; gap: 6px;`

Count affordance: folders always show `· N` (middot separator) or `› N` (chevron, when collapsed) at the end. Files show `· N` (word count) at the end. Both in `var(--sw-text-3)`.

### Shadows & highlights

```css
--sw-shadow-node-default: 0 2px 6px rgba(0, 0, 0, 0.3);
--sw-shadow-panel:        0 4px 14px rgba(0, 0, 0, 0.4);
--sw-shadow-dropdown:     0 8px 24px rgba(0, 0, 0, 0.5);
--sw-shadow-root-glow:    0 0 20px rgba(157, 122, 245, 0.22),
                          0 3px 10px rgba(0, 0, 0, 0.4);
--sw-shadow-selection:    0 0 10px rgba(157, 122, 245, 0.3);

--sw-highlight-top-inner: inset 0 1px 0 rgba(237, 229, 213, 0.07);  /* the glass lip */
--sw-highlight-panel:     inset 0 1px 0 rgba(237, 229, 213, 0.08);
--sw-highlight-root:      inset 0 1px 0 rgba(255, 255, 255, 0.14);
```

### Background

```css
--sw-canvas-gradient: radial-gradient(
  ellipse 85% 92% at 52.5% 50%,
  var(--sw-bg-center),
  var(--sw-bg)
);
```

Dot grid texture: 40px spacing, 1.5px circles, `rgba(237, 229, 213, 0.035)`. Implement as inline SVG `<pattern>` or CSS `background-image: radial-gradient(...)` repeating.

### Border opacities

All borders are `var(--sw-hilite)` at specified opacity:

| Context | Opacity |
|---|---|
| Default node border | 0.10 |
| Active tab border   | 0.12 |
| Panel border        | 0.10 |
| Header bottom border | 0.06 |
| Button border (chrome) | 0.09 |
| Row separator | 0.04–0.06 |

Code block border: `rgba(237, 229, 213, 0.08)`.

### Motion

```css
--sw-duration-hover: 150ms;
--sw-duration-state-change: 240ms;
--sw-duration-reader: 320ms;
--sw-ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
```

---

## Composition Rules

### Header (all frames)

- Height 44px, full width, background `var(--sw-panel)`, 1px bottom border `var(--sw-hilite) @ 0.06`.
- Left (20px from edge): 14×14 PS mark (gradient square, purple→deep purple, 1px hilite border, purple glow drop-shadow).
- Left + 22px: vault title ("Playful Sincerity Digital Core") in header-title style, `var(--sw-text)`.
- Center: 5px green dot (heat-hot, with drop-shadow glow) + meta text ("3,976 notes · synced 2s ago") in header-meta style `var(--sw-text-2)`.
- Right (reverse from edge):
  - 20px from right: three 3×3 dots vertically-centered in a 28×24 hitbox (settings affordance).
  - 14px gap, then 28×16 `⌘F` kbd badge inside the search pill's right edge.
  - 8px gap, then search pill (220×28, pill radius 999, `var(--sw-surface)` fill, 1px hilite border, inner 1px top highlight). Inside: 9px circle + 3px line search icon at left 12px, "Search the canvas" text.

### Canvas — radial layout seed

Data model fixed; physics produces final positions (but use these as seed):

| Branch | Angle from north | Status |
|---|---|---|
| PS Software | 50° | Expanded, 4 kids (angles 20° / 42° / 64° / 86° from north) |
| PS Media | 110° | Collapsed (count inline) |
| PS Products | 160° | Collapsed |
| PS Events | 215° | Expanded, 3 kids (190° / 215° / 240°) |
| Claude System | 270° | Collapsed |
| PS Research | 310° | Expanded, 3 kids (288° / 310° / 332°) |

- R1 (branch ring) = 220px from root (seed — physics adjusts)
- R2 (leaf ring) = 340px from root
- 30° dead zone at 0° (top) to avoid top-cluster collision in the mock; physics resolves this in production

### Connectors

- `<path>` with cubic bezier. Control points pulled 18% toward the canvas center.
- Stroke: `linearGradient` from `rgba(237, 229, 213, 0.22)` near parent → `rgba(237, 229, 213, 0.06)` near child. Gradient direction matches segment direction.
- Stroke width: 1px default, **1.4px and `var(--sw-purple) @ 0.75`** when this connector leads to the selected node (directional highlight).
- Center-to-center attachment (not edge-attached — breaks under force jitter).

### Reader open (Frame 5a.4)

- Canvas left: 0–704 (55%). Divider 1px `var(--sw-hilite) @ 0.08` at x=704.
- Reader right: 705–1280 (575 wide). Background `var(--sw-panel)`.
- Tab strip 40px tall, `var(--sw-bg)` background, 1px hilite bottom border.
  - 10px from left: 28×24 close-reader button (chevron-right `›` path `M 0 0 L 6 5 L 0 10`, stroked 1.5px `var(--sw-text-2)`).
  - 50px from left: tab group (auto-layout, gap 4px). Active tab: `var(--sw-surface-lift)` fill + 1px hilite border + top-inner highlight. Inactive: `var(--sw-surface)` fill. Both: 14px L padding, 10px R padding, 8px gap, 12px × close at right in `var(--sw-text-3)`.
  - 76px from right: 28×24 copy button (two 9×10 overlapping rounded rectangles, outlined in `var(--sw-text-2)`).
  - 40px from right: 28×24 overflow (three 3×3 dots).
- Body starts at y=84 (tab strip + 20px gap), x=737 (reader x + 32px padding). Width: 511px.
  - Breadcrumb: 10px Regular in `var(--sw-text-3)` with +2% tracking.
  - H1: 20px Bold, -2% tracking, `var(--sw-text)`.
  - Paragraph: 13px Regular, 160% line-height, `var(--sw-text)`, fixed width 511px.
  - Section header: 11px Semi Bold, +10% tracking, `var(--sw-text-2)` uppercase.
  - Code block: 511×60 on `var(--sw-code)` bg, 1px hilite border, 12px JetBrains Mono in `var(--sw-heat-hot)` (green).
  - Link: 12px Medium in `var(--sw-purple-link)`, -1% tracking, underline 1px at 50% purple-link opacity.
- Footer (y=800-38): 10px Regular with +2% tracking, `var(--sw-text-3)`. "492 words · last edited 2 min ago · ⌘C to copy path".

### Reader minimized (Frame 5b.6)

- Full canvas at 1:1.
- OPEN FILES dropdown top-right (20px from corner):
  - 268×~176px, radius 12px, `var(--sw-surface-lift)` fill, 1px hilite border, top-inner highlight, heavy drop-shadow (8/24, 0.5 black).
  - Header (38px tall): "OPEN FILES" in 9.5px Semi Bold, +14% tracking, `var(--sw-text-3)`. **No count next to the header** (redundant — rows are visible). 1px hilite separator at y+35.
  - 3 file rows (44px each):
    - x=16: 6×6 heat dot at row y+12 (aligned with filename's optical center, not row center). Colored drop-shadow 4px blur @ 0.5 opacity.
    - x=30: filename, 12px Semi Bold, -1% tracking, `var(--sw-text)`.
    - x=30, y+24: path subtitle, 10px Regular, `var(--sw-text-3)`.
    - right (-24 from right): × close, 14px Regular in `var(--sw-text-3)`.
    - 1px divider between rows at row y+43, `var(--sw-hilite) @ 0.04`. No divider after last row.
  - **No purple left-bar on any row** — when reader is minimized, nothing is "selected" (the reader itself is closed). Purple is reserved for "actively viewing" semantic.
- Activity legend bottom-right (20px from corner):
  - Horizontal pill, `primaryAxisSizingMode: AUTO` → hugs content width. Reposition `leg.x = 1280 - leg.width - 20` after sizing.
  - 52px tall, radius 10px, surface-lift fill, 1px hilite border, shadows as panel.
  - Inside (flex horizontal, 14px gap, centered): "ACTIVITY" 9px Semi Bold +14% tracking in text-3, then 4 chips: each chip = 6×6 heat dot + name (10.5px Medium) + day range (10px Regular text-3).

---

## Icon System

All icons are **stroke-based, 1.5px, `currentColor`**. Round caps and joins. Paths sized to fit their hit button (28×24 default).

| Icon | SVG path (normalized 0–1 viewBox) | Usage |
|---|---|---|
| Chevron-right `›` | `M 0 0 L 1 0.5 L 0 1` (scaled to 6×10) | Close reader, "expand me" on collapsed folders |
| Chevron-down `⌄` | `M 0 0 L 0.5 0.4 L 1 0` (scaled to 10×4, flatter) | Dropdown expanded indicator (not used in v6 — dropdown has no pill) |
| Close `×` | Inter Medium text character, not an SVG vector | Tab close, file row close |
| Copy | Two 9×10 rounded rectangles, offset (+4, 0) back + (0, +4) front | Reader copy-path |
| Search | 9×9 circle at (12,9) + 3px line from (21,18) to (24,21) | Search pill left icon |
| Stacked-pages | Two 10×12 rounded rectangles offset (+4, +4) | (Reserved — not used in final frames, available for future stash affordance) |
| Settings (3 dots) | Three 3×3 circles, 5px apart | Top-right of header |
| Overflow (3 dots) | Three 3×3 circles, 5px apart | Top-right of reader tab strip |

All icons sit in a 28×24 button cell with `var(--sw-surface)` fill, 1px hilite-0.09 border, 4px corner radius.

---

## State Specs (for CSS — not in Figma)

### Hover (all clickable surfaces)

```css
.sw-node:hover {
  background: var(--sw-surface-bright);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35), var(--sw-highlight-top-inner);
  transition: all var(--sw-duration-hover) var(--sw-ease-out);
}
```

### Active / pressed

```css
.sw-node:active {
  transform: translateY(0) scale(0.98);
  background: var(--sw-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}
```

### Selected (the file currently open in reader)

```css
.sw-node--selected {
  border-color: var(--sw-purple);
  border-width: 2px;
  box-shadow: var(--sw-shadow-selection), var(--sw-highlight-top-inner);
}
```

When a node is selected: upgrade its connector to parent with `stroke: var(--sw-purple) @ 0.75; stroke-width: 1.4`.

### Expanded vs. collapsed directory

- Expanded: regular rendering, `· N` count suffix with middot separator.
- Collapsed: same surface + 1px hilite @ 0.06 border (slightly dimmer), `› N` count suffix with chevron. `opacity: 0.85` on the label to further de-emphasize without hiding.

---

## Natural Compression Animation (for Phase 3 implementation)

Figma shows rest states. The spec:

### Reader → Minimized

- **Total duration:** ~300ms.
- **What moves together:** the entire reader panel (right 45%) + its tab strip + body fly to the top-right corner as one group. Use `transform: translate + scale` on a wrapper group.
- **What transforms:** horizontal tab pills re-orient to vertical rows inside the dropdown. In practice, the simpler approximation is to fade-out the tab strip while fading-in the dropdown rows (crossfade). The purist version uses `FLIP` animation: measure each tab's position pre-transform, animate to its new dropdown-row position. Stretch goal.
- **What stays:** canvas left edge is anchored. Canvas `width` grows from 55% → 100% as the reader collapses (CSS transition on width or transform, whichever avoids layout thrash).
- **Easing:** `cubic-bezier(0.22, 0.61, 0.36, 1)` (`--sw-ease-out`). Fast acceleration out, gentle deceleration in.

### Minimized → Reader (reverse)

- Clicking any dropdown row triggers the reverse animation AND activates that row as the reader's tab.
- Dropdown collapses first (150ms), then reader panel flies in from top-right (170ms). Sequential, not concurrent, to avoid visual clutter.

### Hover → pressed → released (on any button)

- Hover: 150ms translateY + shadow lift.
- Pressed: 80ms translateY(0) + scale(0.98) (snappy).
- Released back to hover or rest: 150ms.

---

## Risky Seams (call out to Phase 3)

1. **Satoshi font loading.** Without `<link rel="preload">`, first paint shows Inter fallback with different metrics — labels jitter when Satoshi loads. Pre-load to avoid.
2. **Letter-spacing unit conversion.** Figma uses `%` (of font-size). CSS uses `em`. Convert at token generation time or use a small CSS helper: `letter-spacing: calc(var(--tracking-neg-2) * 1em)` with `--tracking-neg-2: -0.02`.
3. **Heat-tinted surface math.** The `#242E23` / `#342B1D` / etc. values are pre-computed 10% blends of the heat color over `#1E1C16`. If `--sw-surface` ever changes, these derived colors must be recomputed. Document the blend formula in a comment.
4. **`<foreignObject>` hit-testing.** If using `<foreignObject>` for nodes, attach click handlers to the inner `<div>`, not the SVG wrapper. SVG wrapper clicks have different event propagation.
5. **Pre-computed vs. measured node sizes.** For physics collision, you need each node's actual rendered width/height — measure via `getBoundingClientRect()` after the DOM is painted, or compute from `canvas.measureText()` + known padding. Measured is more accurate; computed is synchronous.
6. **Tab auto-layout.** Tabs are auto-layout `HUG` width frames in Figma → flex with `width: fit-content` in CSS. Do NOT set fixed width or tab close X will drift.

---

## What's Deferred (not in v2)

- **Frame 2 (single-button anatomy close-up):** the anatomy is fully specified in this document's tables. Formal reference card can be built as teaching artifact after v2 ships.
- **Frame 3 (button states):** expressed in CSS hover/active/selected rules above. Web > static mocks for state transitions.
- **Frame 4 (activity heat matrix):** the legend panel in v5 + 5b.6 carries this live. Formal matrix card deferred.
- **Frame 6 (backlinks layer):** explicitly v3 scope per original plan.
- **Two-variable encoding (recency × volume):** parked for v6. Color-hue carries recency; second axis carries volume. Detailed exploration at `design/2026-04-16-folder-volume-encoding.md` — 12 design options evaluated, leading recommendation is a tiered dot indicator (`PS Software · 42 ••`) that extends the existing dot vocabulary without new chrome.
- **Agentic design prompt button** (Wisdom's idea 2026-04-16): pluggable architecture is in place via CSS custom properties. Ships as v2.1 or v3.

---

## Open Questions for Phase 3

1. **`<foreignObject>` vs. pure `<rect>` + `<text>` for node rendering?** Foreign-object gives CSS `box-shadow inset` for the glass-lip highlight — cleaner than SVG's `<filter>` approach. But foreign-object has slower paint and hit-testing quirks at 5000+ nodes. If performance is fine: foreign-object. If not: pure SVG with an approximation of the inner highlight (stacked `<rect>` with `y+1` offset).
2. **Initial load expansion:** per Wisdom's answer in `plan.md`, "just the root" is the default. Confirm on first render.
3. **Expand/collapse animation:** during re-settle, do we animate node positions (smooth) or snap? 300ms animated re-settle matches the reader transition. Start with animated; drop to snap if perf suffers.
4. **Mobile/narrow-viewport:** no mobile spec in v2. Presumably the reader takes full width below some breakpoint. Defer.

---

## How Phase 3 Reads This Doc

1. Extract the token table into `templates/v2/app.css` under `:root { }` (done as part of this handoff).
2. Reference Frame v5, 5a.4, 5b.6 in Figma via `mcp__figma__get_design_context` when implementing each corresponding piece.
3. Use the composition rules + node anatomy tables as the authoritative spec when building components.
4. Use the risky-seams list as the review checklist after each major piece ships.
5. If something in Figma looks ambiguous, this doc is the tiebreaker.

**Wisdom approved the Phase 2 package on 2026-04-16 ~01:20 PDT.** Ready for Phase 3.

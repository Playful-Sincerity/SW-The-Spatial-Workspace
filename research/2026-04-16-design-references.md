# Spatial Workspace v2 — Design Reference Brief

**Produced:** 2026-04-16  
**Purpose:** Concrete design spec for the v2 radial knowledge-graph canvas. Every section is grounded in sourced reference material from real products.  
**Scope:** Visual design only — not architecture, not features. This brief feeds directly into the HTML/CSS/SVG implementation.

---

## 1. Design Principles (5–8 Governing Rules)

### P1 — Restraint compounds
The Vercel Geist system earns its premium feel from a deliberately narrow palette — pure black, pure white, and one blue accent. What makes Geist feel expensive is not richness; it's the absence of noise. Apply this to Spatial Workspace: limit the decision surface. One brand color (PS purple). One neutral scale. Four status signals. Nothing else unless it carries semantic weight.  
*Source: Vercel Geist design system breakdown — seedflip.co/blog/vercel-design-system*

### P2 — Status lives in the border, not the interior
Status colors on a filled node-button create a fight: the interior fill and the status fill compete. Modern graph UIs (Cambridge Intelligence, yFiles) recommend reserving interior fills for the neutral background state and using outlines *only when they carry semantic meaning* — specifically hierarchy changes, key interactions, or state. A 1.5px colored outline sits beside the button without owning it. This keeps every status readable at a glance while leaving the button interior clean for the label.  
*Source: Cambridge Intelligence, "Create Meaningful UX and UI in Your Graph Visualization" — cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/*

### P3 — The label is the node
Heptabase's whiteboard UI organizes information entirely through cards as modular units — the card's text is the primary signal, not its shape or decoration. In Spatial Workspace this means: the button label has to breathe. Minimum 8px horizontal padding ensures the label is never cramped against the border. The button shape frames the label; it doesn't compete with it.  
*Source: Heptabase Public Wiki, user-interface-logic — wiki.heptabase.com/user-interface-logic*

### P4 — Hover communicates affordance without shouting
Button hover states should be "light and purposeful" — a color tint, shadow change, or subtle scale (never particle trails, glow floods, or multi-step animations). The only acceptable transition time is 100–300ms. Spatial Workspace nodes should lift by 2–3px of box-shadow change on hover — not a glow, just a slightly deeper resting shadow — paired with a 1% brightness increase on the background tint. That combination reads as "interactive" without reading as "please click me."  
*Source: Mockplus, "Button State Design: 20 Best Examples" — mockplus.com/blog/post/button-state-design*

### P5 — 4px is the atom
Vercel Geist uses a strict 4px grid: spacing tokens are 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Tailwind's default scale maps almost exactly to this. For a dense graph, working in multiples of 4 means every distance looks intentional. Node padding, connector offsets, label insets, panel margins — all derive from this grid.  
*Source: Vercel Geist design breakdown, Seedflip — seedflip.co/blog/vercel-design-system*

### P6 — One typeface, multiple weights
The strongest recommendation from Untitled UI's font analysis: "limit designs to one typeface — modern typefaces offer enough weight variations to function as multiple styles." Spatial Workspace should not mix Inter + anything. Pick one variable-weight font (recommendation below) and use weight to create hierarchy: 500 for node labels, 600 for the root label, 400 for file paths, 300 for body text in the reader pane.  
*Source: Untitled UI, "28 Best Free Fonts for Modern UI Design" — untitledui.com/blog/best-free-fonts*

### P7 — Lines are infrastructure, not decoration
Connector lines between nodes are the graph's skeleton. They should be present but not compete with the nodes. Thin (1px), low-opacity (60–70%), and neutral (matching the mid-gray of the theme). Curved connectors (d3.linkRadial) look intentional in a radial layout because they follow the geometry. Straight lines in a radial tree look accidental — they cross each other at ugly angles. Always use radial Bezier.  
*Source: D3 radial tree examples — observablehq.com/@d3/radial-tree-component; Cambridge Intelligence graph UX guide*

### P8 — Dark backgrounds make color pop; light backgrounds make structure readable
Spatial Workspace uses a cream (#F9F0E0) background, which is a warm light mode. This is the correct choice for a tool that needs to show hierarchical structure — dark backgrounds make edges and node shapes harder to read at scale. The trade-off is that status colors need to be deeper/more saturated on a light background to have the same pop they'd have on dark. Avoid pastels as status colors; use mid-range saturated hues (see palette below).

---

## 2. Color Palette

### Base Colors

| Role | Hex | Notes |
|------|-----|-------|
| Canvas background | `#F9F0E0` | Existing warm cream — keep it |
| Panel background | `#F2E8D5` | One step darker, for side panels and reader pane |
| Surface (node default) | `#FFFFFF` | Pure white node interior |
| Surface hover | `#F7F2EA` | Slight cream tint on hover (not gray — stays warm) |
| Surface pressed | `#EDE5D5` | One more step for active/clicked state |
| Border default | `#D8CDB8` | Warm neutral — outline of unpressed nodes |
| Border hover | `#B8A898` | Darkens on hover, stays warm |
| Text primary | `#2A2218` | Near-black with warm undertone, not pure black |
| Text secondary | `#6B5E4E` | For file paths, secondary labels, metadata |
| Text disabled | `#A89880` | For collapsed/invisible nodes |
| Connector line | `#C8BAAA` | 65% opacity by default |
| Brand purple | `#764AE2` | PS primary — root node, selected state, links |
| Brand purple tint | `#F0EBFD` | Background tint for root node |

### Status Colors (for ambient border encoding)

These are **outline + 12% background tint** combinations. No solid fills. No glows.

| Status | Label | Border Hex | Background Tint | Usage |
|--------|-------|-----------|-----------------|-------|
| Active | Building now, live | `#1A9E5A` (deep green) | `rgba(26,158,90,0.08)` | Actively maintained, running |
| Building | In construction | `#D97706` (amber) | `rgba(217,119,6,0.08)` | Under active development |
| Concept | Planned, not started | `#4B7FCC` (steel blue) | `rgba(75,127,204,0.08)` | Design/ideation phase |
| Paused | On hold | `#B45309` (muted red-brown) | `rgba(180,83,9,0.08)` | Intentionally paused |
| Default | No status set | — (use border default `#D8CDB8`) | none | Directories, files without status |

**Rationale:** This palette avoids the "traffic light" red/green problem. Red-for-paused is a common UX trap (it reads as "error"). Using a warm red-brown instead signals "resting" not "broken." The blue for Concept reads as neutral/exploratory, not brand-competing with PS purple.  
*Source: Cambridge Intelligence graph UX guide — these exact colors deviate from generic traffic-light patterns deliberately*

---

## 3. Typography

### Recommended Font: Satoshi (variable)

**Why Satoshi over Inter:**
- Inter has become the default sans-serif of the web — it's invisible, not distinctive. For a product Wisdom is sharing with people like Dennis Hansen, invisible is a missed signal.
- Satoshi is Swiss modernist with slightly rounder details than Inter — warmer, more human. Its x-height is high, meaning it reads clearly at small sizes inside node buttons.
- Available free from Fontshare (cdn.fontshare.com) — load via a single CDN link that inlines cleanly.
- Variable font format means the full weight range ships in one file.

**CDN load line (for the self-contained HTML):**
```html
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@1,2,3,4,5,6,7,8,9&display=swap" rel="stylesheet">
```

For fully offline use: download and base64-encode the WOFF2, inline in `<style>`.  
*Source: Fontshare — fontshare.com/fonts/satoshi; Untitled UI font analysis*

### Font Stack Fallback
```css
font-family: 'Satoshi', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale

| Role | Size | Weight | Line Height | Letter Spacing | Where Used |
|------|------|--------|-------------|----------------|-----------|
| Root label | 15px | 700 | 1.2 | -0.02em | Center node |
| Folder button label | 12px | 600 | 1.0 | -0.01em | Non-leaf nodes |
| File button label | 11px | 500 | 1.0 | 0 | Leaf nodes |
| File path / breadcrumb | 11px | 400 | 1.4 | 0 | Below labels, metadata |
| Reader body | 14px | 400 | 1.625 | 0 | File reader pane |
| Reader heading h1 | 18px | 700 | 1.3 | -0.02em | Reader pane headers |
| Settings / UI label | 11px | 500 | 1.4 | 0.01em | Panel labels, sliders |

**Note on line height for node labels:** Use `line-height: 1.0` inside SVG `<text>` elements to prevent clipping. SVG does not honor CSS line-height the same way HTML does — set `dy` attributes explicitly.

---

## 4. Button Anatomy

### Sizing

| Type | Width | Height | Horizontal Padding | Vertical Padding | Border Radius |
|------|-------|--------|-------------------|------------------|---------------|
| Root node | 140px min | 44px | 16px | 10px | 10px |
| Folder node | 100–160px dynamic | 32px | 12px | 6px | 8px |
| File leaf | 80–140px dynamic | 28px | 10px | 5px | 6px |

Dynamic width: minimum of the label width + 2× horizontal padding, maximum 160px (truncate with ellipsis beyond that).

### Border Radius Rationale
Using 6–10px (not full pill, not sharp) follows the Vercel Geist range of 0–8px for functional UI components. The Tailwind `rounded-md` is 6px, `rounded-lg` is 8px — both are appropriate. Full pill (border-radius: 999px) reads as a tag or chip, not a navigable node. Sharp corners (0–2px) read as a spreadsheet cell. The 6–10px range hits the "intentional product button" sweet spot.

### States

```css
/* Default */
background: #FFFFFF;
border: 1px solid #D8CDB8;
box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
color: #2A2218;
transition: all 150ms ease;

/* Hover */
background: #F7F2EA;
border: 1px solid #B8A898;
box-shadow: 0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05);
transform: translateY(-1px);

/* Active / pressed */
background: #EDE5D5;
border: 1px solid #A09080;
box-shadow: 0 1px 2px rgba(0,0,0,0.04);
transform: translateY(0);

/* Selected (currently opened in reader) */
background: #F0EBFD;
border: 1.5px solid #764AE2;
box-shadow: 0 0 0 3px rgba(118,74,226,0.12);
color: #4A2EA0;

/* Collapsed (children hidden) */
background: #FAFAF8;
border: 1px dashed #C8BAAA;
color: #6B5E4E;
```

### With Status Ambient Color (in addition to above)

When a node has a status, apply **both** a colored border **and** a background tint, replacing the default border:

```css
/* Example: status=active */
background: rgba(26, 158, 90, 0.08);  /* tint over white */
border: 1.5px solid #1A9E5A;

/* Example: status=building */
background: rgba(217, 119, 6, 0.08);
border: 1.5px solid #D97706;
```

The border increases from 1px to 1.5px when a status is present — a subtle signal that this node has more information.

### Expanded vs Collapsed Differentiation

- **Expanded (children visible):** Solid border, normal weight label, small downward chevron glyph (`▾`) at right edge of button, 8px from border.
- **Collapsed (children hidden):** Dashed border, slightly dimmed label opacity (0.75), right-pointing chevron (`›`), pill showing child count: `+12` in text-secondary style.
- **Leaf node (no children):** No chevron. Border slightly thinner (0.75px). File extension shown as a small monospace suffix after the label: `README .md`.

---

## 5. Status-as-Ambient-Color Spec (Complete)

This is the full implementation contract for encoding status on a node-button.

```
Status: active
  border: 1.5px solid #1A9E5A
  background: rgba(26,158,90,0.08)   ← 8% opacity tint
  no shadow modification
  
Status: building
  border: 1.5px solid #D97706
  background: rgba(217,119,6,0.08)

Status: concept
  border: 1.5px solid #4B7FCC
  background: rgba(75,127,204,0.08)

Status: paused
  border: 1.5px solid #B45309
  background: rgba(180,83,9,0.08)

Status: none (default)
  border: 1px solid #D8CDB8
  background: #FFFFFF
```

**What NOT to do:**
- No box-shadow in the status color. Shadow glows look like errors or accessibility overlays, not status signals.
- No animated pulse or breathing. It distracts from reading the graph.
- No badge/dot. Wisdom explicitly rejected dots.
- Don't rely on color alone — add a `data-status` attribute and a `title` tooltip with the status label for accessibility.

**Implementation in SVG:**
SVG `<rect>` elements do not support CSS `rgba()` for fill-opacity the same way HTML does. Use:
```svg
<rect fill="#1A9E5A" fill-opacity="0.08" ... />
```
And for the border/stroke:
```svg
<rect stroke="#1A9E5A" stroke-width="1.5" ... />
```

---

## 6. Connector Line Style

### Recommendation: Curved Radial Bezier, 1px, 65% opacity

```js
// D3 radial link generator
const linkGen = d3.linkRadial()
  .angle(d => d.x)
  .radius(d => d.y);
```

```css
/* Applied as SVG attribute */
stroke: #C8BAAA;
stroke-width: 1;
stroke-opacity: 0.65;
fill: none;
```

### Attachment Point
Lines attach to the center of the node rectangle, not the edge. This is a deliberate choice: **center-to-center** lines look symmetric and intentional in a radial layout. Edge-attached lines require knowing which edge faces the parent, which is computed geometry that breaks on force-layout jitter.

For a more polished look, clip the line so it stops at the button edge (not extending into the button interior). In D3 with SVG `<rect>` nodes, this requires either:
1. Using `marker-end` with a zero-length arrowhead to terminate cleanly, or
2. Computing the intersection of the line with the rect boundary (more expensive but pixel-perfect).

The simpler path: use a clip path or just accept center-to-center with the line visible under the semi-transparent node background. At 1px and 65% opacity, it reads as correct even when it technically extends under the node.

### Hover on connector
When a node is hovered, highlight its parent connector: increase `stroke-opacity` to 1.0 and `stroke-width` to 1.5. This gives spatial context — which parent does this node belong to?

---

## 7. Spacing and Rhythm

### Grid: 4px base, 8px standard unit

Vercel Geist uses this grid exactly. For Spatial Workspace, the practical tokens are:

```
--space-1: 4px   (tight insets, icon-text gaps)
--space-2: 8px   (button vertical padding, label insets)
--space-3: 12px  (button horizontal padding for small nodes)
--space-4: 16px  (button horizontal padding for root/folder nodes)
--space-6: 24px  (panel internal padding, section gaps)
--space-8: 32px  (panel width steps, large component gaps)
```

### Node Spacing in the Graph
For the force simulation (R5–R7 in SPEC-V2), the collision radius should be approximately `(nodeWidth/2) + 12`. This ensures nodes don't touch — there's always at least 12px of breathing room between adjacent buttons. That 12px gap is three grid units, which the eye reads as "related but separate" rather than "crowded" or "disconnected."

---

## 8. Hover and Interaction Patterns

### Philosophy: Affordance through texture, not noise
The best modern tools (Arc, Linear, Heptabase) communicate interactivity through **restrained motion and depth changes** — not glows, not animated borders, not scale bounces.

**The hover recipe for Spatial Workspace:**
1. `transform: translateY(-1px)` — a 1px vertical lift. On a 2D canvas this reads as the node coming forward in Z.
2. Box-shadow deepens slightly (see button anatomy above).
3. Background warms by one shade (F7F2EA instead of FFFFFF).
4. `cursor: pointer` — essential, often forgotten in canvas SVG.
5. Transition: `all 150ms ease` — fast enough to feel responsive, not so fast it disappears.

**Do not:**
- Animate border color or border-radius on hover (causes layout jitter).
- Scale up the node (causes label reflow and neighbor collisions in dense graphs).
- Show a glow shadow in the brand color (reserved for the selected state only).

### Focus / Keyboard Navigation
For accessibility, a focused node (via Tab) should show the "selected" purple ring (`box-shadow: 0 0 0 3px rgba(118,74,226,0.18)`) regardless of status color. This ensures keyboard users have a clear focus indicator that never conflicts with status signals.

---

## 9. Reference Apps — What to Steal From Each

### Linear (linear.app)
**What it does well:** Monochrome base with one accent color. Every UI element has exactly one job. Button states are communicated through background darkness changes, not color changes — hover is slightly darker, pressed is slightly darker still. This creates a consistent vocabulary that never surprises.  
**Steal:** The single-accent-on-neutral approach. On a cream background, brand purple should be the *only* hue that appears in interactive state (selected, focus ring). Everything else is warm neutrals.  
*Source: LogRocket "Linear Design" analysis — blog.logrocket.com/ux-design/linear-design/*

### Vercel (vercel.com)
**What it does well:** The Geist system publishes an explicit semantic color ladder — Background 1/2, Component 1/2/3, Border 4/5/6, High-contrast 7/8, Text 9/10. This 10-step scale maps directly to interactive states without any ambiguity. Their typography scale is anchored at 14px ("Copy 14 is the most commonly used text style").  
**Steal:** The 10-step semantic color naming convention. Applied to SW's warm palette: bg1=`#F9F0E0`, bg2=`#F2E8D5`, comp1=`#FFFFFF`, comp2=`#F7F2EA`, comp3=`#EDE5D5`, border4=`#D8CDB8`, border5=`#B8A898`, border6=`#A09080`, hicontrast7=`#6B5E4E`, text10=`#2A2218`.  
*Source: Vercel Geist colors documentation — vercel.com/geist/colors*

### Heptabase (heptabase.com)
**What it does well:** Cards as primary navigational unit — the whiteboard is *just* cards connected by lines. The simplicity is the product. Heptabase demonstrates that graph tools don't need node shapes, icons, colors, and badges all at once. One shape (the card/rect), one connection style, and the content inside the card carries all the weight.  
**Steal:** Letting the label be the entire signal. Spatial Workspace nodes should be legible at 60% zoom — if the label needs to be supplemented by a color coded dot AND a status badge AND a glyph to be understood, the design has failed.  
*Source: Heptabase public wiki — wiki.heptabase.com/fundamental-elements*

### Raycast (raycast.com)
**What it does well:** Dark chrome + vibrant gradient accents. The core Raycast UI is neutral gray — the product-identifying color only appears at interaction moments. This is the correct application of brand color: *scarce, purposeful, earned.*  
**Steal:** Use PS purple `#764AE2` sparingly. It should appear on: the root node, selected state, focus rings, and active links. Nowhere else. When it does appear, it stands out because it hasn't been diluted by overuse.  
*Source: Raycast design system description — getdesign.md/raycast*

### Arc Browser (arc.net)
**What it does well:** Contextual density — sidebar panels collapse cleanly, tools only appear when relevant. The browser itself disappears when you're reading content; it re-appears when you need to navigate. The design's job is to get out of the way.  
**Steal:** The reader pane in Spatial Workspace should feel like it opens *into* the canvas, not like a separate application. The connector from the clicked node to the panel's open state should be visible (a brief highlight on the line, a brief ring on the node) so the user never loses spatial context.  
*Source: SaaSUI Arc Browser analysis — saasui.design/application/arc-browser; Arc design breakdowns on Medium*

---

## 10. Surprises and Non-Obvious Recommendations

### The SVG `rx` attribute is your friend, but check your D3 version
SVG rounded rectangles use `rx` and `ry` attributes, not `border-radius`. In D3 v7, when you do `.attr("rx", 8)` on a `<rect>`, you get 8px corner radius — but only if you haven't set `ry`. Set both or neither. If you use `foreignObject` to embed HTML buttons inside SVG, you get CSS `border-radius` but you lose D3's coordinate system for hit-testing. Stick to `<rect rx="8">` with SVG `<text>` inside for maximum compatibility in the single-file offline build.

### The 1.5px status border is visible at 50% zoom; 1px is not
At the canvas zoom levels Spatial Workspace supports (especially when viewing the full ecosystem), 1px borders disappear into anti-aliasing. For the status border specifically, use 1.5px. This is the minimum thickness that remains visually distinct at 50% zoom on a retina display. Default borders can stay at 1px (they're structural, not semantic).

### Satoshi needs the variable font version for this to work
The button labels are too varied in length to use a fixed-weight Satoshi. The variable font (`wght` axis from 300–900) lets you use font-weight as a semantic signal without loading multiple font files. The fontshare CDN serves the variable version if you request it with the weight range query parameter.

### "Warm neutral" vs "cool neutral" is a real distinction on cream
On a cream background (#F9F0E0), cool grays (like Vercel's `#D4D4D4`) look visually disconnected — like they were pasted from a different design system. Warm-tinted neutrals (the palette above: `#D8CDB8`, `#B8A898`, etc.) feel continuous with the background. This is why all the neutral tokens in this spec have slight yellow/amber undertones. Don't break this by importing a neutral from any other design system.

### The selected-node ring should use `box-shadow`, not a second rect
The purple selection ring around a node is most cleanly implemented as:
```css
box-shadow: 0 0 0 3px rgba(118, 74, 226, 0.18);
```
In SVG, this translates to a `<filter>` with `feDropShadow`, which is clunky. The better approach: draw a second `<rect>` with the same cx/cy but slightly larger dimensions and a purple stroke, placed *behind* the node rect in the SVG stacking order. It appears as a ring without needing CSS filters.

---

## Sources

- Vercel Geist colors: https://vercel.com/geist/colors
- Vercel Geist typography: https://vercel.com/geist/typography
- Vercel design system breakdown: https://seedflip.co/blog/vercel-design-system
- Geist Figma file: https://www.figma.com/community/file/1330020847221146106/geist-design-system-vercel
- Linear design analysis: https://blog.logrocket.com/ux-design/linear-design/
- Cambridge Intelligence graph UX guide: https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/
- yFiles knowledge graph visualization guide: https://www.yfiles.com/resources/how-to/guide-to-visualizing-knowledge-graphs
- Heptabase UI logic: https://wiki.heptabase.com/user-interface-logic
- Heptabase fundamental elements: https://wiki.heptabase.com/fundamental-elements
- Mockplus button state design: https://www.mockplus.com/blog/post/button-state-design
- D3 radial tree (Observable): https://observablehq.com/@d3/radial-tree-component
- Raycast design system: https://getdesign.md/raycast/design-md
- Satoshi font (Fontshare): https://www.fontshare.com/fonts/satoshi
- Untitled UI best free fonts: https://www.untitledui.com/blog/best-free-fonts
- Arc browser design analysis: https://medium.com/design-bootcamp/arc-browser-rethinking-the-web-through-a-designers-lens-f3922ef2133e
- 2025 UI design trends: https://www.lummi.ai/blog/ui-design-trends-2025

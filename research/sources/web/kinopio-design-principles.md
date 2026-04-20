---
source_url: https://pketh.org/design-principles.html
fetched_at: 2026-04-16
fetched_by: researcher-agent
project: Spatial Workspace v2
---

# Kinopio Design Principles (raw extraction)

## Core Design Philosophy
- "Embracing smallness" — the app weighs ~220kb with libraries and assets
- "Build for fidget-ability" — the interface rewards exploration and play
- "Embrace plain text" — markdown-compatible but no WYSIWYG abstraction
- "Single interface for mobile and desktop" — no platform-specific divergence
- "Refine by pruning" — remove, don't add

## Card / Node Visual Mechanics
- Cards use a "sticky" hover mechanic: cards stick to cursor when you hover, bounce back when you move away
- Stickiness initiates after ~200ms of mouse rest to prevent accidental triggers
- Stickiness disables near clickable elements (tags, links, checkboxes) to preserve precision
- This creates a physical/tactile feel without heavy animation

## Typography
- Custom parser handles text segments: plain text, bold, tags, images, URLs
- Uses standard markdown (`**bold**`, `[[brackets]]` for tags)
- Standard HTML elements: `<button>`, `<input>`, `<dialog>` — no custom component abstraction

## What Makes It Distinctive
- "Very 90s, brutal, web1.0 design that looks so different from everything else"
- Direct toolbar-less design — click anywhere to add cards
- Drag between card connectors to create connections (no explicit "connector tool" mode)
- The design style is often described as "cohesive despite how different it is"
- Warmth + roughness combined with thoughtfulness in interaction

## Contrast with Heptabase/Linear Playbook
- No rounded-rect button containers — direct interaction model
- No status-as-border-color
- Deliberate low-polish aesthetic with high interaction quality
- Personality over professionalism

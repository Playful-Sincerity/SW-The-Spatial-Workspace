---
source_url: https://linear.app/now/how-we-redesigned-the-linear-ui + https://linear.app/now/behind-the-latest-design-refresh
fetched_at: 2026-04-16
fetched_by: researcher-agent
project: Spatial Workspace v2
---

# Linear UI Design Mechanics (raw extraction)

## Typography
- Headers: Inter Display (more expressive than regular Inter while maintaining readability)
- Body: Regular Inter
- This dual-typeface split is the specific mechanism for hierarchy

## Color System
- Migrated from HSL to LCH color space — described as "perpetually uniform" meaning a red and yellow at lightness 50 appear equally light
- Reduced chromatic influence (blue) in neutral calculations for "more neutral and timeless appearance"
- Three core variables: base color, accent color, contrast
- 2025 mobile refresh: frosted glass material in iOS/Android app
- Sidebar dimmed slightly vs main content — achieved through opacity reduction not color change

## Structure
- "Inverted L-shape" chrome: sidebar + header controlling main content views
- Structure is "felt not seen" — borders softened, contrast reduced, fewer separators
- Sidebar dimmed a few notches to let main content take precedence
- Icons reduced in size and removed from backgrounds (colored team icons removed)

## What Makes It Distinctive vs Generic SaaS
- LCH-based color system (rare, most use HSL or hex)
- Restraint as aesthetic — the visual language is defined as much by removal as addition
- Iterative stress-testing approach rather than workshop redesign

## Weaknesses (from LogRocket analysis)
- "Almost every SaaS website looks the same" — the playbook is now saturated
- Visual monotony, lack of brand differentiation
- Glassmorphism fatigue
- Sans-serif repetition
- Accessibility gaps (mostly dark mode only)

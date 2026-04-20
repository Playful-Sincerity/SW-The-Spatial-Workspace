---
debate: "Ecosystem canvas plan architecture stress-test"
mode: perspectives
rounds: 1
date: 2026-04-01
verdict: "Plan is sound. One critical implementation correction needed: D3 virtual rendering must be manually implemented (not built-in). YAML regex parsing should be replaced."
---

# Synthesis: Architecture Stress-Test

## Verdict: GO — with 2 corrections

The plan will work. The performance targets are achievable. But the plan contains one dangerous assumption and one fragility that need fixing before execution.

## Where All Three Agree

| Claim in Plan | Verdict | Evidence |
|---|---|---|
| JSON.parse for 8MB | **Fine** | 50-100ms modern, 150-250ms slow. Within <1s target. |
| marked.js for 2000-line files | **Negligible** | 2-5ms per file. Lazy parsing is overkill but harmless. |
| SVG can handle this scale | **Yes, IF virtual** | SVG degrades at 3,000-5,000 DOM elements. Virtual rendering keeps us at 20-30. |
| D3 tree layout computation | **Fast** | Reingold-Tilford is O(n), ~30-80ms for 776 nodes. Not the bottleneck. |
| Single 8MB HTML file | **Appropriate** | Gzips to ~1.5-2MB. Offline requirement kills multi-file alternatives. |

## Critical Correction #1: Virtual Rendering is NOT Built Into D3

**What the plan says:** "Only expanded nodes exist in the DOM (virtual tree — collapsed = zero elements)"

**Reality:** D3's `d3.tree()` computes x/y positions for ALL 776 nodes on every layout call. It does NOT automatically skip collapsed nodes. To achieve virtual rendering, you must:

1. Let D3 compute the full layout (fast — 30-80ms)
2. **Manually filter** the computed nodes to only those whose ancestors are all expanded
3. Only create SVG elements for the filtered set
4. On expand/collapse: recompute layout, re-filter, update DOM with enter/exit/update pattern

This is the single most important implementation detail in Section 4 (Canvas Tree Renderer). If missed, the tree renders all 776 nodes as SVG elements on first expand, and performance collapses.

**Plan update needed:** Add explicit virtual rendering implementation to Section 4's acceptance criteria: "D3 computes full layout, but DOM creation is filtered to expanded-only nodes via manual culling."

## Critical Correction #2: YAML Regex Parsing is Fragile

**What the plan says:** "yaml parsing via regex" for project-status.yaml

**Reality:** The YAML file uses multiline strings (`notes: "..."`), lists (`blockers: []`), and nested keys. Regex will break on edge cases. Two options:
- (A) Inline a tiny YAML parser (PyYAML is stdlib-adjacent, or write a 50-line parser for the flat structure)
- (B) Parse project-status.yaml with Python's `json` module by converting it to JSON first

**Recommendation:** Option A — write a minimal parser that handles the specific flat-list-of-dicts structure. It's ~50 lines of Python, robust for this schema, and keeps the stdlib-only constraint.

## Critic's Objections — Assessed

| Objection | Assessment |
|---|---|
| "Use force-directed graph instead of tree" | **Rejected.** The ecosystem IS a tree (filesystem hierarchy). Force-directed loses the clear structure. Graph layout is Phase 3 territory if cross-project links are added. |
| "Split-view breaks spatial reasoning" | **Rejected for this use case.** The primary task is reading full .md files (many are 200-2000 lines). Tooltips/popovers can't handle that. Split-view is the standard pattern (VS Code, GitHub, Obsidian). |
| "D3 tree layout is O(n²)" | **Incorrect.** Engineer confirms Reingold-Tilford is O(n). Critic confused with force simulation. |

## Nice-to-Haves (Not Blocking)

1. **Web Workers for JSON.parse** — would eliminate the 50-100ms main thread block on load. Low priority since it's within target.
2. **Wide branch profiling** — if any directory has 40+ immediate children, consider visual grouping. The generator could warn about this.
3. **Debounced click handler** — prevent double-click queueing two renders (Critic's valid UX point about click-then-click-again).

## Updated Performance Expectations

| Operation | Plan Target | Realistic Estimate | Verdict |
|---|---|---|---|
| Page load → interactive | <1s | 200-400ms (parse + initial render) | Pass |
| Expand branch (20 children) | <100ms | 50-120ms (layout + DOM update) | Pass (tight) |
| Click file → rendered | <200ms | 10-50ms (marked.js is fast) | Pass easily |
| Search → highlight | <300ms | 100-200ms (JSON scan + DOM update) | Pass |
| Memory | <100MB | 30-60MB (8MB data + DOM + overhead) | Pass |

# Spatial Workspace — Phase 2: Ecosystem Canvas

## Environment Health: CLEAN

- Git repo on `main`, clean working tree, remote configured
- CLAUDE.md present (58 lines), SPEC.md present (291 lines)
- No package manifest needed (Python stdlib + inline JS libraries)
- No instruction file injection patterns detected
- No broken symlinks

## Scale

- 776 .md files across ecosystem
- 7.4 MB total markdown content
- D3.min.js: 280KB, marked.min.js: 40KB
- Estimated output HTML: ~8 MB

## Assumptions (from user answers)

1. **Horizontal tree** layout (root left, branches right)
2. **Split view** — canvas left, resizable file reader panel right
3. **All 776 .md files** embedded with full content (~8 MB total)
4. **No drag-and-drop** for MVP — fixed layout, pan/zoom/collapse/click only

---

## Cross-Cutting Concerns

### Core Data Model

The generator produces a single JSON tree embedded in the HTML. Each node has:

```
TreeNode {
  id: string              // unique path-based ID ("ps/research/ivna/paper/ivna-paper-tex")
  name: string            // display name ("ivna-paper.tex")
  path: string            // full filesystem path
  type: "directory" | "file"
  content: string | null  // full markdown content (files only, null for directories)
  children: TreeNode[]    // nested children
  meta: {                 // optional metadata
    phase: string | null    // from project-status.yaml
    momentum: string | null
    lines: number | null    // line count
    size: number | null     // byte size
    description: string | null  // from CLAUDE.md or frontmatter if available
  }
}
```

The tree structure mirrors the filesystem hierarchy:
- Root: "Wisdom's Ecosystem"
  - "Playful Sincerity" → PS branches (Philosophy, Research, Software, Media, Products, Events, Stewardship, Operations)
  - "Wisdom Personal" → Mandarin, Inventions, Archives, etc.
  - "Claude System" → skills, rules, knowledge, etc.

### Technology Stack

- **Generator**: Python 3.10+, stdlib only (pathlib, json, os, re, custom minimal YAML parser for flat-list-of-dicts structure — ~50 lines, no regex-based YAML)
- **Canvas**: D3.js v7 (inlined), SVG-based tree layout with pan/zoom
- **Markdown rendering**: marked.js v15 (inlined), renders to HTML in the reader panel
- **Styling**: Inline CSS, PS brand colors (#F9F0E0 cream, #764AE2 purple)
- **No build tools**: No npm, no bundler, no transpiler

### File Structure

```
Spatial Workspace/
├── SPEC.md                    # Existing spec
├── CLAUDE.md                  # Existing conventions
├── plan.md                    # This plan
├── plan-section-*.md          # Detailed section plans
├── generator/
│   └── generate-ecosystem.py  # Python generator script
├── templates/
│   ├── app.html               # HTML template with canvas app code
│   ├── d3.min.js              # Inlined D3 library (checked in)
│   └── marked.min.js          # Inlined marked library (checked in)
└── tests/
    └── test_generator.py      # Generator smoke tests
```

Output: `~/ecosystem-map.html` (overwrites current markmap version)

### Naming Conventions

- Python: snake_case functions/variables, PascalCase classes
- JavaScript: camelCase functions/variables, UPPER_SNAKE constants
- CSS classes: kebab-case with `sw-` prefix (spatial-workspace)
- File names: kebab-case for new files

### Error Handling

- Generator: fail fast with clear error messages if a directory is inaccessible
- Generator: skip unreadable files (binary, permission denied) with a warning to stderr
- Canvas: gracefully handle missing content (show "Content not available" in reader panel)

### Performance (Critical — target machine is resource-constrained)

**Principle: pay only for what's visible.**

1. **Lazy markdown rendering** — store raw markdown in JSON, only call `marked.parse()` when a file is clicked. Never pre-render all 776 files.
2. **Virtual tree rendering** — D3 computes all 776 node positions (O(n), ~30-80ms — fast), but DOM creation is manually filtered to only expanded nodes. Collapsed subtrees = zero DOM elements. Initial render should create ~20-30 SVG elements (top 2 levels). **CRITICAL: D3 does NOT do this automatically — we must implement node culling between layout computation and DOM creation.**
3. **Incremental expand** — when a branch is expanded, recompute layout (fast), re-filter to expanded nodes, update DOM with D3 enter/exit/update pattern. Only the expanded subtree's immediate children are added to the DOM.
4. **Debounced search** — search operates on the in-memory JSON tree, not the DOM. Only re-render after 200ms of no typing.
5. **Compact JSON** — generator outputs minified JSON (no pretty-print). Saves ~30-40% on 7.4 MB of content.
6. **Transition budget** — animations limited to 150ms. If a frame takes >16ms, skip animation for that operation.
7. **Content panel recycling** — reuse the same DOM container for the reader panel, swap innerHTML on file change. Never stack multiple rendered documents.
8. **Target metrics:**
   - Initial page load to interactive: **< 1 second**
   - Expand a branch (20 children): **< 100ms**
   - Click file → markdown rendered in panel: **< 200ms**
   - Search keystroke → results highlighted: **< 300ms**
   - Memory footprint: **< 100 MB** (the raw JSON stays in memory, rendered content is transient)

### Testing Conventions

- Generator tests: `python3 -m pytest tests/` or `python3 tests/test_generator.py`
- Test naming: `test_[what]_[condition]_[expected]`
- Canvas testing: manual verification via checklist (open HTML, click nodes, check rendering)
- **Performance testing**: time each operation in the browser console, verify against target metrics

### Exclusion Rules (Generator)

Skip these paths/patterns:
- `*/.git/*`, `*/node_modules/*`, `*/__pycache__/*`, `*/.lake/*`
- `*/.DS_Store`, `*.pyc`, `*.class`, `*.o`
- Binary files (images, videos, PDFs, archives)
- Files > 500KB (likely data dumps — include node but not content)
- `*/Trash/*`

### Status Integration

The generator reads `~/claude-system/docs/project-status.yaml` and attaches `phase` and `momentum` to matching directory nodes based on the `path` field.

---

## Meta-Plan

### Goal

Build a two-part system (Python generator + interactive HTML canvas) that replaces the current Markmap-based ecosystem map with a custom spatial workspace where every .md file in the ecosystem is viewable directly on the canvas. The generator scans the filesystem, embeds all content, and outputs a single self-contained HTML file with an interactive horizontal tree, split-view file reader, and PS brand styling.

### Sections

1. **Data Scanner** — Python module that walks the filesystem, applies exclusion rules, reads .md file contents, and builds the tree data structure
   - Complexity: M
   - Risk: Low — straightforward filesystem traversal
   - Acceptance criteria:
     - Given the ecosystem directories, produces a JSON tree with all 776+ .md files
     - Given a binary file or excluded path, skips it without error
     - Given project-status.yaml, attaches phase/momentum to matching directory nodes
     - Given a file > 500KB, includes the node but sets content to null with a size note

2. **Tree Structure Builder** — Python module that organizes the raw filesystem tree into the ecosystem's logical structure (PS Foundations/Capabilities/Delivery, Wisdom Personal, Claude System)
   - Complexity: S
   - Risk: Low — mapping filesystem paths to logical categories
   - Acceptance criteria:
     - Given ~/Playful Sincerity/PS Research/IVNA/, places it under Foundations > PS Research
     - Given ~/claude-system/, places it under Capabilities > PS Software
     - Given ~/Wisdom Personal/Mandarin/, places it under Wisdom Personal
     - Root node has the correct top-level branches matching ECOSYSTEM.md

3. **HTML Assembler** — Python module that takes the tree JSON, reads template files (app.html, d3.min.js, marked.min.js), and produces the final self-contained HTML
   - Complexity: S
   - Risk: Low — string interpolation into an HTML template
   - Acceptance criteria:
     - Given the tree JSON and template files, produces a valid HTML file
     - The HTML file contains D3 and marked inlined (no external requests)
     - The embedded JSON is valid and parseable by the browser
     - Output file is written to ~/ecosystem-map.html

4. **Canvas Tree Renderer** — JavaScript (in template): D3.js horizontal tree layout with pan, zoom, collapse/expand, node styling, status indicators
   - Complexity: L
   - Risk: Medium — D3 tree layout with 776 nodes needs performance tuning (initial expand level, lazy rendering)
   - Acceptance criteria:
     - Given the embedded JSON, renders a horizontal tree with all nodes
     - Given a directory node click, collapses/expands its children with smooth animation
     - Given mouse wheel, zooms in/out smoothly
     - Given mouse drag on canvas background, pans the view
     - Given a node with phase/momentum metadata, shows a colored status indicator
     - Initial load shows only top 2 levels expanded (rest collapsed), ~20-30 DOM elements
     - D3 computes full layout for all nodes, but DOM creation is manually filtered to expanded-only via node culling
     - Only expanded nodes exist in the DOM — collapsed = zero SVG elements
     - Initial render to interactive: < 1 second on constrained hardware
     - Expanding a branch with 20 children: < 100ms
     - Click handler is debounced to prevent double-render queueing

5. **Split-View File Reader** — JavaScript (in template): resizable right panel that renders markdown content when a .md node is clicked
   - Complexity: M
   - Risk: Medium — markdown rendering quality, scroll position management, panel resizing
   - Acceptance criteria:
     - Given a click on a .md file node, the right panel shows the rendered markdown
     - Given markdown with headers, code blocks, tables, and lists, renders them correctly
     - Given a panel divider drag, resizes canvas and reader proportionally
     - Given a click on a different .md file, replaces the reader content (preserves scroll of canvas)
     - Given a click on a directory node, does not change the reader panel
     - Given a file with content: null (too large), shows a message with the file size

6. **Search & Filter** — JavaScript (in template): search box that filters/highlights nodes by name or content
   - Complexity: M
   - Risk: Low — text search over the embedded JSON
   - Acceptance criteria:
     - Given a search query, highlights matching nodes and dims non-matching
     - Given a search query matching file content (not just name), the file node highlights
     - Given an empty search, restores full tree visibility
     - Search updates live as the user types (debounced at 200ms)

7. **Integration & Polish** — Wire all sections together, PS brand styling, header, keyboard shortcuts, final testing
   - Complexity: M
   - Risk: Low — integration of independently-built components
   - Acceptance criteria:
     - Opening ecosystem-map.html shows the full ecosystem tree with PS brand styling
     - Pressing Ctrl/Cmd+F focuses the search box
     - Pressing Escape closes the reader panel
     - The header shows title, subtitle, and generation date
     - File size of output HTML is under 12 MB
     - The complete generation pipeline runs in under 10 seconds

### Dependency Graph

```
Section 1 (Data Scanner) → Section 2 (Tree Builder) → Section 3 (HTML Assembler)
Section 4 (Canvas Renderer) — independent (works on template with mock data)
Section 5 (File Reader) — independent (works on template with mock data)
Section 6 (Search & Filter) — depends on Section 4 (needs tree DOM)
Section 7 (Integration) — depends on ALL (wires everything together)

Parallel group A: Sections 1+2+3 (Python pipeline)
Parallel group B: Sections 4+5 (JavaScript canvas, can use mock data)
Sequential: Section 6 after 4, Section 7 after all
```

### Acceptance Tests (meta-level)

1. Run `python3 generator/generate-ecosystem.py` → produces `~/ecosystem-map.html` without errors
2. Open `~/ecosystem-map.html` in browser → tree renders with all ecosystem branches visible
3. Click any .md file node → content appears in the right panel, rendered as formatted markdown
4. Collapse a branch → children disappear with animation, re-expand restores them
5. Search for "IVNA" → IVNA-related nodes highlight, others dim
6. Pan and zoom → canvas moves smoothly, no jank
7. Total generation time < 10 seconds
8. Output file < 12 MB

### Overall Success Criteria

The ecosystem map is a single HTML file that serves as both a navigable tree of the entire ecosystem AND a file reader — you can browse the structure and read any .md file without leaving the canvas. It replaces the current Markmap version with richer interactivity and the same PS brand feel.

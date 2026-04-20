# Build Queue — Spatial Workspace

Running log of ideas Wisdom surfaces during live work that we can't address in the current session but want to come back to. Append-only. Newest at the bottom (easier to diff). When an idea gets built, cross it out with a date + link to the relevant chronicle entry. When an idea grows big enough to deserve its own exploration doc, extract it to `ideas/YYYY-MM-DD-<slug>.md` and link it from here.

**How this works:**
- Whenever Wisdom mentions an idea mid-session that isn't the current task, I log it here silently with a date.
- Each entry: 1-3 line description, plus any implementation notes he added, plus the session/context it came up in.
- Nothing is a commitment. It's a capture so nothing gets lost in conversation history.
- Wisdom can skim this any time and choose what to build next.

---

## Entries

### 2026-04-16 — "Go to canvas" button inside the markdown reader
**Context:** Phase 3 v2 iteration session; file reader is rendering markdown content in the right panel; canvas shows the tree on the left.
**Idea:** Each open markdown file should have a button (in the reader UI somewhere — maybe the header row) that, on click, takes you straight to that file's location in the canvas tree. Centers the canvas view on the file's node, using the same squish-and-center behavior we built for file-click-from-canvas (reader stays open; canvas re-centers inside its panel, not overlaid on top).
**Why it matters:** The reader is where you read content; the canvas is where you navigate structure. Right now you can go canvas → reader (click a node) but not reader → canvas (which file am I reading, where does it live?). Closes the loop. Especially useful when the reader was opened via search or the OPEN FILES dropdown and the user doesn't remember where the file sits in the ecosystem.
**Implementation notes from Wisdom:**
- Button should be on the file's reader view (probably reader header, near the filename / copy-path / close buttons).
- Clicking should behave exactly like the file-click recenter: reader stays open, canvas squishes (doesn't overlay), center of the visible canvas panel becomes the file + parent bbox.
- "It's going to do the thing where it actually moves the canvas in. It squishes the canvas in like where the markdown viewer is."
**Rough implementation shape:**
- Add a `<button>` to `.sw-reader-header` in `templates/v2/template.html` — likely between the filename/path and the copy-path icon, or co-located with close. A small locate/crosshair icon.
- Handler calls `centerOnFileWithParent(tab.path)` — already exists.
- Visual: subtle icon, hover tooltip "Show in canvas".

---

### 2026-04-17 — Zoom-dependent cluster labels

**Context:** Phase 3B layout iteration; Wisdom zooming out on branch-expand and losing orientation.
**Idea:** When zoomed out past a threshold, overlay the parent name (e.g. "Playful Sincerity", "inbox") centered on that cluster's bounding box. As you zoom out, the label grows to stay readable. Only the top 2-3 tiers get labels — deeper ones would clutter. These are overlay labels, not node buttons — they sit on top of the cluster's children and provide wayfinding at macro scale.
**Why it matters:** At zoom-out you can't read individual nodes. Without cluster labels you can't tell which blob is which. This is the "I want to see Playful Sincerity in the middle of the Playful Sincerity cluster" use case.

---

### 2026-04-17 — Live context dashboard + click-to-remove

**Context:** Exploring context efficiency for Claude Code setup. Wisdom surfaced this as a Spatial Workspace use case.
**Idea:** A live dashboard showing everything currently in the model's context window — system prompt blocks, rules, memory index, tool definitions, file reads, prior turns. Each chunk is a node/card. Click to remove what's no longer needed. *"Oh that doesn't need to be in there anymore, click. Well that doesn't need to be in there anymore, click."* Spatial Workspace as context-editor UI.
**Why it matters:** Today context management is all-or-nothing (full sends, lossy compaction, /clear). Wisdom wants surgical control. Framing: "what agency do we have in Claude Code?" — if agents (and users) could actively prune their own context, dynamic context management becomes a first-class capability, not an inferred one.
**Implementation notes:**
- Leverages Anthropic Agent SDK context-editing primitives (delete/modify messages programmatically — plumbing already exists server-side, just not surfaced in Claude Code UI yet).
- Spatial Workspace already has the canvas + node model; nodes become context chunks instead of files.
- Live updates require hooking into the send path (PreApiCall? a transcript watcher?).
- Paired idea: **parallel context prompting** — send different context slices to the model in parallel and aggregate answers. Wisdom noted this is "kinda just agents," but reframed: instead of spawning a task-scoped subagent, you slice the SAME task across different context configurations and compare. Research direction, not necessarily a near-term build.
**Rough shape:**
- Phase 1: read-only transcript visualizer — see what's in context without being able to edit
- Phase 2: remove-node → emit a context edit when the next turn fires
- Phase 3: for entities (not just Wisdom), let them see and prune their own context as a skill

---

### 2026-04-17 — Live reorganization UI (see the system organized different ways, in real time)

**Context:** Start of the Stage 1 bag-node session. Asked Wisdom whether to commit to spec-default thresholds or calibrate with him after Step 1.0's distribution data.
**Idea:** Wisdom is pulled toward something bigger than one threshold slider: a UI that lets a user *organize the visible system different ways in real time*. Threshold sliders for bag classification are one instance; other axes of re-organization (by size, by age, by project cluster, by tag, by depth, by leaf density) are the same pattern. *"It's really nice to be able to just as a user interface to be able to kind of see your system organized in different ways."*
**Why it matters:** The canvas is currently one-shot — the generator runs, the layout falls out. But a user exploring their ecosystem wants to *see it differently* without re-running a pipeline. This is the move from "the canvas is a rendered artifact" to "the canvas is a live re-organizable surface."
**Implementation notes from Wisdom:**
- "We're gonna need some pretty serious compression and optimization systems for all this" — he is aware this is expensive at 900+ nodes.
- Related: likely depends on the layout engine being fast enough to re-run per interaction, or on a pre-computed index that supports cheap re-filtering.
**Rough shape:**
- First concrete instance: a bag-threshold slider in the Stage 1 header (small version, in-session).
- Second: a toolbar of "organize by…" axes (size, age, leaf density, cluster).
- Third: save+restore "views" — each view is a preset of organization axes.
- Research dependency: layout recomputation cost on the full ecosystem tree (worth benchmarking before committing to a live-reorganize UI at scale).

---

### 2026-04-17 — Search within a folder that opens the path to the hit

**Context:** Stage 1 bag-node session. Discussing what happens when a "bag" node is clicked (drawer vs. spatial).
**Idea:** "Ideally you're able to actually search within a folder... just search within a folder click something and then it opens it, it opens the fan, it opens the different paths to get to that thing if you search within that folder."
**Why it matters:** Search within a bag (or any folder) is just the first half. The second half is what happens on click — not only does it open the file, but the canvas reveals the path(s) that lead to that file. Turns search from "find and open" into "find and visually navigate." Especially important once bag/organic-cluster rendering exists, since without scoped search inside a bag, the user is stuck either eyeballing 469 leaves or giving up.
**Implementation notes from Wisdom:**
- Scope the search to within a specific folder (not global).
- On click, canvas animates to the file's location and reveals the expansion path.
- Described as "a whole nother thing" \u2014 separate from the current Stage 1 work.
**Rough shape:**
- Reuse existing search UI (\u2318F) but with a "within this folder" scope toggle (or auto-scope when invoked from inside a bag's view).
- On result click: auto-expand intermediate directories + center canvas on the target. Uses existing `centerOnFileWithParent` / expansion infrastructure.

---

### 2026-04-17 — Lines repurposed as cross-linkages (not parent-child)

**Context:** Stage 1 pivot discussion. When proposing recursive circle packing (containment as hierarchy signal), Wisdom worked through the implication that parent-child lines go away. Live reframe: *"the lines eventually could be more like linkages, cross-linkages or something — that's interesting, that could be better actually."*
**Idea:** In the containment layout, hierarchy is shown by nesting (child circle sits inside parent circle). Parent-child edges are no longer needed — but that frees the line primitive to represent something it's actually better for: the semantic cross-references between files (e.g. `[text](path)` markdown links). The generator already extracts these via `MD_LINK_RE` in `generator/generate-ecosystem.py:60` — they're in the data, just not rendered on the canvas today.
**Why it matters:** Decouples hierarchy (solved by containment) from semantic connection (solved by cross-link edges). A file in `PS Research/ULP/` that cross-links to `PS Research/Gravitationalism/GCM/` has a real semantic relationship that the tree-containment alone can't show. Drawing that as a curve between the two circles would make the ecosystem's real connective tissue visible for the first time.
**Rough shape:**
- Phase 1 (this session): circle packing replaces radial tree; no lines at all; hierarchy = containment.
- Phase 2 (later): overlay SVG paths for extracted cross-links; thin, low-contrast, curved (d3-hierarchy-bundling or similar) so they don't dominate.
- Phase 3 (later still): filter/toggle cross-link visibility; cluster-mode bundling at zoom-out; per-file "show my links" reveal.

---

### 2026-04-17 — Decide permanent home for PeerMesh and ruflo-study (reference material, not core work)

**Context:** Stage 1 pivot session, reviewing the first d3.pack prototype render. Wisdom noticed PeerMesh and ruflo-study taking up a lot of visual space in the canvas. *"Stop rendering the peer mesh and the ruflo-study stuff because that's not really my thing. Maybe we need to move those things into archives or something, or study some kind of study folder somewhere."*
**Immediate action taken:** Added both to `config.json` scanner `exclude` list so the canvas stops rendering them without physically moving any files.
**Open decision:** Whether to also physically reorganize. Candidates:
- Move `~/Playful Sincerity/PS Software/PeerMesh/` → `~/Wisdom Personal/reference/PeerMesh/` (Cameron's project, not Wisdom's code)
- Move `~/claude-system/play/ruflo-study/` → `~/claude-system/archive/ruflo-study/` or new `~/claude-system/studies/` folder
**Why it matters:** Scanner exclusion is reversible at any time, but the real question is what these are *logically*: is PeerMesh part of PS Software because Wisdom cross-references it, or is it external reference material that just happens to live under PS Software for convenience? Same question for ruflo-study — is it a finished study that belongs in archive, or ongoing exploration that belongs in `play/`? The physical location should match the logical role. The `peermesh-check.md` rule references the path — any move needs to update that.
**Rough shape:**
- Quick: decide category for each (reference / archive / study), pick a home, `git mv`, update any rules that reference the old path.
- Thoughtful: introduce a `studies/` or `reference/` directory if the category is a recurring need (likely — Wisdom surveys other projects often).

---

### 2026-04-17 — Containment-pack layout parked as an alternate mode (not primary)

**Context:** Stage 1 pivot session. Built a recursive-circle-packing prototype (`play/2026-04-17-d3-pack-prototype.html`) in both show-all and click-to-zoom-into-container variants. Wisdom's response after using it: *"This is cool, looks really cool for sure... however I really like it when it fans out from the center. I don't really like this. This is something to store as a potential option for certain people if we make it really good but I prefer it when it fans out like a tree."*
**Idea:** The containment view (parent circle contains children circles, click to zoom into a container) is parked as a *mode* for users who prefer the inward-drill metaphor — not the default. Primary view for Wisdom is outward-fanning radial.
**Why it matters:** Some users genuinely prefer the containment gesture (Finder column view, spatial-computing canvases, repo-visualizer, FoamTree). Keeping the implementation around means: (a) an easy toggle if we later add it as an alternate view, (b) a reference implementation if we need to compare aesthetics, (c) the saved exploration output for the project's play archive.
**Rough shape:**
- Keep `play/2026-04-17-d3-pack-prototype.html` untouched as the canonical artifact of this exploration.
- Keep `tools/build-prototype.py` for re-generation if the ecosystem data changes.
- If we ever add view-modes to the main canvas, this is the second mode. But don't implement until there's a real user request — Wisdom is not it.

---

### 2026-04-18 — Phototropism as layout objective function

**Context:** Dynamic-expanse sandbox just set up; Wisdom away from the computer, sent a voice-note idea.
**Idea:** Frame the layout as a tree reaching for light — viewer's eyes are light, nodes are leaves, connector lines are structural mass. Optimize: max total leaf surface area + max per-leaf size + min structural mass + zero overlap.
**Why it matters:** Could replace emergent force-balance tuning with an explicit, measurable objective function. Also gives a concrete criterion for pinned-vs-dynamic eye-test ("which catches more light with less mass").
**Status:** Design philosophy, not scheduled. Full write-up at [ideas/2026-04-18-phototropism-layout-philosophy.md](2026-04-18-phototropism-layout-philosophy.md). Raw speech at [knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md](../knowledge/sources/wisdom-speech/2026-04-18-phototropism-metaphor.md).

---

### 2026-04-18 — Tier-by-tier expand/contract controls (plus/minus by depth)

**Context:** Mid-iteration on pin-on-expand and dynamic-expanse prototypes. Wisdom surfaced this as a navigation primitive that should exist on BOTH prototypes regardless of which one wins.
**Idea:** A simple plus/minus pair in the canvas UI that expands or contracts one whole tier at a time, system-wide. Tier 0 = just root. Plus → reveal all tier-1 children (Playful Sincerity, claude-system-public, Wisdom Personal, etc.). Plus again → reveal all tier-2 (PS Software, PS Research, PS Philosophy, all immediate children of every tier-1). Minus → undo one tier. Repeated plus all the way down = full ecosystem reveal procedurally.
**Why it matters:** Click-to-expand is good for "I want to see THIS folder." Tier-expand is good for "I want to see the whole system at this level of detail." Different primitive, different gesture. Wisdom: *"if you want to see the whole ecosystem, you just press plus procedurally all the way up."* Also addresses the "show whole ecosystem" use case without the current "expand all" button which dumps everything at once with no tier-by-tier reveal.
**Why this fits both prototypes:** Pinned-expanse + tier-expand → tiers reveal procedurally, each tier's nodes pin into place as they're added. Dynamic-expanse + tier-expand → each tier's nodes dynamically nudge to make room as they appear. Both compose with the existing expand semantics.
**Implementation notes from Wisdom:**
- Two buttons (plus/minus). Could live in the header or bottom panel.
- "Tier" = depth level in the visible tree. Tier 0 is root only.
- Plus = expand every directory at the current max-visible-depth.
- Minus = collapse every directory at the current max-visible-depth back up.
- Should respect the per-folder click-state too — clicking a leaf-of-current-tier still works the same way.
**Rough shape:**
- Track `state.maxTierExpanded` (starts at 0 = just root).
- Plus button: `maxTierExpanded++`, walk the tree, `state.expandedPaths.add(node.path)` for every directory at depth ≤ `maxTierExpanded`. Then `updateTree()`. For dynamic-expanse, this means many simultaneous "just-expanded" nodes — the bubble drift logic may need to handle the multi-just-expanded case (currently assumes one).
- Minus button: `maxTierExpanded--`, walk the tree, remove from `expandedPaths` every node at depth > `maxTierExpanded`. `updateTree()`.
- Disable plus when `maxTierExpanded` reaches the deepest visible directory's depth; disable minus at 0.

---

### 2026-04-18 — Drag-and-drop buttons with conform-as-you-move

**Context:** Overwhelm moment while deciding whether the clicked folder should be fully pinned vs. soft-nudge outward. Wisdom surfaced an adjacent idea.
**Idea:** *"Being able to drag buttons click and drag buttons and have them automatically conform and deform as they move things could be interesting."*
**Why it matters:** Turns the canvas from a view into a *workspace*. User would manually sculpt layout, and the rest would conform around their placement. Closes the loop between "the algorithm places things" and "I want this thing over here."
**Scope note:** Wisdom explicitly said "I know this increases the scale." Parked for after the bubble-containment question is settled.

---

### 2026-04-19 — Bulk-expand: "open all children one tier down"

**Context:** Physics tuning session (v2-dynamic-alt). Wisdom surfaced mid-test.
**Idea:** Modifier-click on a parent folder expands the folder AND all its immediate children's folders one tier — a bulk-expand gesture. *"Command click or shift click or I don't know something on a parent it will also open all of the children folders going down one tier."*
**Why it matters:** Current UX requires one click per folder to expose structure. For exploring an unfamiliar branch, being able to open two or three levels at once would reveal shape without making the user hunt. Pairs with spatial-memory goal: see a bigger territory, learn it faster.
**Implementation notes:**
- Three candidate triggers: shift-click, cmd-click (⌘), or right-click context menu with "Expand one level" / "Expand all" options.
- Wisdom leaned toward right-click menu as the most discoverable: *"maybe that could be a drop down options when you select click — right click."*
- Logic: on trigger, add clicked folder's path AND every child directory's path to `expandedPaths`, then single `updateTree()` call so all placements settle in one physics pass rather than per-click.
**Rough shape:**
- Attach `contextmenu` handler in `attachNodeHandlers` (`templates/v2/app.js`).
- Small floating menu with "Expand children" and "Collapse all" options.
- Cap recursion depth at 1 tier for this gesture; a separate "expand everything recursively" could live behind a different trigger if ever needed.

---

### (future entries go below this line)

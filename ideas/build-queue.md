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
- **Menu placement (confirmed 2026-04-19):** This lives in the folder right-click drop-down menu alongside "Expand children" (Bulk-expand entry) and "List view" (List-view entry). All three are folder-scoped actions that share the same right-click surface — when you build the menu, build all three together as a folder-actions cluster.

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

### ~~2026-04-18 — Tier-by-tier expand/contract controls (plus/minus by depth)~~ *(shipped 2026-04-19 — header +/- buttons with disable bounds; see [chronicle 19:31](../chronicle/2026-04-19.md))*

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

### ~~2026-04-19 — Bulk-expand: "open all children one tier down"~~ *(shipped 2026-04-19 — all three triggers: right-click menu, ⌘-click, ⇧-click for collapse; see [chronicle 19:35, 20:10, 21:50](../chronicle/2026-04-19.md))*

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

### ~~2026-04-19 — Slow down expand/collapse animation a touch~~ *(shipped 2026-04-19 — ANIM_DURATION 180→480ms, viewport transition tied to ANIM_DURATION+80; see [chronicle 20:30, 21:00](../chronicle/2026-04-19.md))*

**Context:** Live work in another conversation on the Spatial Workspace canvas. Wisdom dedicating this conversation as the build-queue-capture session so the main build context stays clean.
**Idea:** The expand/collapse animation is a little fast right now. Ease it down just a bit — not a dramatic change, just enough to see the motion breathe. Doesn't need to be slow or dramatic, just less snappy.
**Why it matters:** Two reasons Wisdom named: (1) it's nicer to actually *see* the tree move into place instead of it snapping, (2) a slightly slower animation gives the layout/physics more time to render cleanly, which should also reduce any visual pop-in during the transition.
**Implementation notes from Wisdom:**
- "It'd be kind of nice to see it all moving."
- "Doesn't have to be crazy snappy."
- Slower animation = more render headroom per frame.
**Rough shape:**
- Bump the transition duration on expand/collapse in [templates/v2/app.js](../templates/v2/app.js) (or the relevant physics/tween loop) by maybe 1.3–1.8× current. Tune by eye.
- Keep the easing curve; just stretch the duration.

---

### 2026-04-19 — Perpendicular wedge terminators on connector lines ("plug into the socket")

**Context:** Build-queue capture session. Visual-disambiguation idea for the canvas — how to tell which line belongs to which leaf when lines cross or pass behind buttons.
**Idea:** Each connector line terminates in a small flat triangle (wedge) oriented **perpendicular to the edge of the leaf button**, with its base flush against the button's edge and slightly "smushed into" it. The wedge acts as a termination glyph — not an arrowhead for direction, but a visual socket-plug that says *"this line ends here, at this button."*
**Why it matters:** Resolves the ambiguity when a line passes *behind* a leaf it isn't connected to. Lines that terminate at a leaf get the wedge-into-edge cue; lines that merely cross over have no wedge at that leaf, so the viewer instantly knows those lines aren't associated with it. Disambiguates visually busy zones without relying on color coding, z-order tricks, or hover states.
**Implementation notes from Wisdom (confirmed playback):**
- Triangle runs **perpendicular to the button's edge** (not pointing at center, not along the line's direction — flat against the edge like a plug face).
- Wedge is slightly **pushed into / smushed against** the button's edge so the termination reads as attached, not hovering adjacent.
- Purpose is termination disambiguation, not direction indication — don't conflate with classic arrowheads.
**Rough shape:**
- At line render time, for each line's leaf-end, compute the nearest point on the button's edge and the outward normal at that point.
- Draw a small filled triangle whose base sits on the edge (oriented along the tangent) and whose apex points slightly *into* the button (a few pixels overlap for the "smush" effect). Use the line's color/stroke so it reads as one object.
- Tune: wedge width ≈ 1.5–2× line stroke width; overlap depth ≈ 2–4px. Should feel like a connector seating into a socket, not a decoration.
- Depends on stable edge-geometry for leaves (works for circles and rounded rects; worth checking against whatever leaf shape the current canvas uses).

---

### 2026-04-19 — "List view" option in the folder right-click menu

**Context:** Build-queue capture session. Pairs with the earlier 2026-04-19 right-click menu entry ("Bulk-expand: open all children one tier down"). Same right-click menu, another option.
**Idea:** Add a **"List view"** option to the right-click context menu on folder nodes. When clicked, the side viewer (the panel that currently shows markdown files) displays a **flat list of all files inside that folder, each linked** — click any entry to open that file in the reader. The canvas doesn't have to change at all; this is purely a reader-panel affordance for browsing a folder's contents textually instead of spatially.
**Why it matters:** Sometimes you want to *read down a folder*, not navigate it on the canvas. Especially for folders with many leaves where clicking each on the canvas is slow, or where you want to scan filenames in a column rather than eyeball a cluster. Complements the canvas instead of replacing it — canvas for spatial navigation, list view for linear browsing.
**Implementation notes:**
- Lives in the same right-click menu as "Expand children" (from the Bulk-expand entry above).
- Label: "List view" (or "Show files" / "List all files" — name TBD).
- Behavior: populate the reader panel with a generated listing of every file under that folder (probably recursive, but the tier depth should be decided — flat immediate children vs. everything nested).
- Each listed file is a link that uses the existing reader-open behavior (same as clicking a canvas node).
- Consider: should the list also show subfolders as nested headers, or flatten everything? Default guess: nested headers with files under each — preserves structure without requiring canvas expansion.
**Rough shape:**
- Context menu handler: on "List view" click, traverse the folder's subtree, generate markdown (or equivalent) with `[filename](relative-path)` links organized by subfolder headings.
- Render into the reader panel as a synthetic "document" (title = folder name + "— list view").
- Each link click reuses the existing file-open path.
- Optional: a "Show in canvas" button per entry (pairs with the earlier 2026-04-16 "Go to canvas" entry — same primitive, different entry point).

---

### 2026-04-19 — Progressive zoom-coupled sizing for parent folders (orient-at-zoom-out)

**Context:** Build-queue capture session. Related to the earlier 2026-04-17 "Zoom-dependent cluster labels" entry but distinct — that was about overlay labels on bounding boxes; this is about the parent folder nodes/labels themselves scaling continuously with zoom.
**Idea:** Parent folder sizes are **inversely coupled to zoom level**. As you zoom out, parent (and especially grandparent and further ancestors) folder nodes/labels **grow progressively larger** to stay legible. As you zoom in, they shrink back down so they don't overwhelm the leaves you're focused on. At max zoom-out — the full ecosystem view — the main top-tier folders should be big and readable enough that you can orient yourself at a glance: "PS is over there, Wisdom Personal is over there, claude-system is over there."
**Why it matters:** Right now zooming out shrinks everything uniformly, so at full-ecosystem zoom the parent names become as unreadable as the leaves. You lose the macro wayfinding cue exactly when you need it most. Progressive sizing preserves the hierarchy's *role* at every zoom level — at close zoom, leaves are the figure and parents recede; at far zoom, parents become the figure and leaves recede.
**Key constraint from Wisdom:**
- "Always be at a legible size, at least the grandfather." → Ancestors ≥ 2 tiers above the currently-focused level should always remain readable. The legibility guarantee is the *minimum*, not the aesthetic target.
- Progressive, not threshold-based: smooth scaling as zoom changes, not pop-in labels at a specific zoom threshold.
**Why it's distinct from the 2026-04-17 cluster-labels entry:**
- That one: overlay labels on cluster bounding boxes, appearing past a zoom threshold, on top of children.
- This one: the parent folder *nodes themselves* (their buttons/labels) scale inversely with zoom, always present, always in their structural position. They may converge in implementation — a single "adaptive ancestor sizing" system could cover both — worth considering whether these are one feature or two complementary ones.
**Rough shape:**
- Compute a per-node display size: `displaySize = baseSize × f(zoomLevel, depthFromLeaf)` where shallower nodes (closer to root) grow faster as zoom decreases.
- Guarantee a minimum readable size for nodes where `depthFromLeaf ≥ 2` ("at least the grandfather") — clamp at a legibility floor regardless of zoom.
- Leaf nodes follow the inverse curve — normal-sized at close zoom, fade/shrink out at extreme zoom-out.
- Handles the "how many leaves are too many to show readably at this zoom" question implicitly: at far zoom-out, leaves shrink and parents grow, so the visual weight auto-shifts to what's actually legible.
- Tune curve so the transitions feel smooth, not jumpy — probably a log or piecewise curve, not linear.
- Related: likely pairs with leaf-hiding or leaf-fade-out at extreme zoom-out (complement: leaves aren't just small, they may disappear, leaving clean parent-folder landscape for orientation).

---

### 2026-04-19 — Whole-workspace performance pass (avoid crashing people's machines)

**Context:** Build-queue capture session. Umbrella/theme entry — not a single feature, a performance budget conversation we need to have before Spatial Workspace is share-able beyond Wisdom's own machine.
**Idea:** Full-ecosystem render is currently slow enough that it will likely crash less-powerful machines, and animations feel laggy at that scale. Seeing the whole workspace at once is an edge case (not the common mode), but it's the *demo* moment — the "wow, here's my whole system" view — so it needs to at least not tank. Goal: fast load at full-ecosystem scale, smoother animations, graceful degradation when the tree is very large.
**Why it matters:** Two audiences bitten by this — (1) Wisdom doing his own full-ecosystem work loses flow every time the canvas stutters, (2) anyone he shares this with will form their first impression on render speed. Slow = feels toy-like. Fast = feels real. Also gates several other queued ideas (live reorganization UI, live context dashboard, tier-by-tier expand, progressive zoom-sizing) — all of those assume the canvas is fast enough to re-run/re-size interactively.
**Directions Wisdom surfaced:**
- **Procedural/lazy generation** — don't render what isn't visible. Only build DOM/SVG/canvas elements for nodes in the viewport (or about to enter it); destroy or recycle off-screen.
- **Smoother animations** — debug what's stuttering. Could be layout recomputation on every frame, could be too many DOM nodes, could be SVG vs. canvas tradeoff.
- **"Whole-workspace isn't the common mode"** — so aggressive culling at extreme zoom-out is acceptable. Leaves can disappear entirely past a certain zoom threshold; just show parents. Pairs with the zoom-coupled parent sizing entry.
**Rough shape / areas to investigate when we dig in:**
- Viewport culling: only render nodes within (visible bbox + margin). Measure what % of 900+ nodes are actually visible at any given zoom.
- Level-of-detail (LOD) system: at far zoom, parents rendered as simple shapes, leaves hidden or batched into single aggregate markers; at close zoom, full fidelity.
- Rendering backend question: SVG vs. Canvas vs. WebGL. SVG is easy but slow at 900+ nodes with animations. Canvas scales better. WebGL (PixiJS, regl, etc.) scales to tens of thousands if needed. Worth benchmarking before committing.
- Layout recomputation: how often does the tree re-layout? Can we incrementalize so expanding one folder only recomputes its subtree, not the whole canvas?
- Animation frame budget: profile what's happening per frame during expand/collapse. May be one expensive operation hiding in the loop.
- Debounce/coalesce: multiple rapid state changes (e.g. watch-server regenerations, quick clicks) should batch into one layout pass, not N.
- Preload + warm cache: first-paint speed matters for the demo moment.
**Status:** Theme entry, not a single-session build. When Wisdom is ready to tackle this, it probably deserves its own `ideas/YYYY-MM-DD-performance-pass.md` exploration doc and a benchmark harness before any specific fix — measure first, optimize with evidence.

---

### (future entries go below this line)

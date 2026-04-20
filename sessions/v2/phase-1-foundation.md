# Session Brief: Phase 1 — Foundation

**Project:** Spatial Workspace v2
**Project root:** `/Users/wisdomhappy/Playful Sincerity/PS Software/Spatial Workspace/`
**Dependencies:** None — start immediately
**Feeds into:** Phase 2 (Design Workshop)
**Blocks:** Phases 2, 3, 4
**Estimated scope:** 2-3 hours, autonomous, parallel subagents recommended

## Context

You are picking up the Spatial Workspace v2 build. v1 is a 1500-line monolith `templates/app.html` that hit a structural ceiling on dense asymmetric trees. v2 rebuilds the canvas from scratch with membrane-physics layout and node-as-button visuals, packaged as a shareable product.

**Read these first** (in this order):
1. `plan.md` — the locked meta-plan (cross-cutting concerns, sections, user journey, dependency graph, design tokens)
2. `chronicle/2026-04-16.md` — the full evolution log of v1 + v2 planning. Read the bottom-most session header first ("Session — 2026-04-16 05:30 (continued)") and work backwards as needed.
3. `research/2026-04-16-design-references.md` — design brief that resolved the visual tokens
4. `archive/v1/plan-v1.md` — original v1 plan (for reference)
5. `templates/app.html` — current v1 monolith (the source-of-truth for what gets cannibalized)
6. `generator/generate-ecosystem.py` — generator that stays
7. `generator/watch-server.py` — watch-server that stays
8. `generator/screenshot.sh` — works but produces faded PNGs (you'll fix this)

## Task

Establish the v2 file structure, archive v1 cleanly, refactor the monolith into split files (template.html / app.css / app.js), build the config-loader layer, update the generator to use config, and write the run.sh + README.

### Sub-tasks (use parallel Sonnet subagents for the marked ones)

**1A — Archive v1** [PARALLEL]
- Move `templates/app.html` → `archive/v1/app.html` (keep as historical reference)
- Make sure `archive/v1/plan-v1.md` is already in place (it is)
- Add a short `archive/v1/README.md` explaining what v1 was and what changed in v2
- Commit-clean: nothing in `templates/` should reference v1 after this

**1B — Split the v1 monolith into v2 source files** [SERIES, must follow 1A]
- Create `templates/v2/template.html` — HTML skeleton with placeholders: `<!-- D3_LIB -->`, `<!-- MARKED_LIB -->`, `<!-- APP_CSS -->`, `<!-- APP_JS -->`, `<!-- ECOSYSTEM_DATA -->`, `<!-- CONFIG -->`
- Create `templates/v2/app.css` — extract the CSS from v1's `<style>` block as a starting point. Don't refactor heavily yet — Phase 3 will rebuild the visual. Goal here is just to have the source-of-truth file in place.
- Create `templates/v2/app.js` — extract the JS from v1's `<script>` block. Same: don't rewrite, just extract. Phase 3 will rebuild the layout module.
- Verify: a clean concatenation of these files (template + libs + css + js) produces a working HTML equivalent to v1.

**1C — Build the config loader** [PARALLEL with 1A, 1B]
- Create `generator/config.py` — pure stdlib JSON config loader + validator
- Schema (mirror what's in `plan.md` Step 0):
  ```json
  {
    "label": "string (root node label)",
    "roots": [{"name": "...", "path": "..."}],
    "branchColors": {"<rootName>": "#hex"},
    "statusColors": {"active": "#hex", "building": "#hex", ...},
    "statusYaml": "optional path or null",
    "exclude": ["array of glob/dir names"]
  }
  ```
- Loader: `load_config(path) → ConfigDict`. Validate required fields; expand `~` in paths; warn (not fail) on missing root paths.
- Defaults: if `config.json` doesn't exist, fall back to v1's hardcoded paths for backwards compat (Wisdom's existing canvas keeps working).
- Tests: `tests/test_config.py` — basic load + validation cases

**1D — Update the generator to use config** [SERIES, must follow 1C]
- Modify `generator/generate-ecosystem.py`:
  - Replace hardcoded `SCAN_ROOTS` constant with config-driven roots
  - Replace hardcoded root label "Wisdom's Ecosystem" / "Playful Sincerity Digital Core" with `config.label`
  - Add `--config <path>` CLI flag (defaults to `./config.json` or fallback)
  - Emit a `CONFIG` JS constant in the output HTML alongside `ECOSYSTEM_DATA` (frontend reads both)
  - Read `templates/v2/template.html` + `app.css` + `app.js` (NOT `templates/app.html` anymore)
- **NEW: extract markdown links** during file scanning. For each `.md` file, regex out `[text](path)` and emit them under `ECOSYSTEM_DATA.crossLinks: CrossLink[]` per `plan.md` data model (path, target, label, context). Frontend won't render them in v2, but data is in place for v3 backlinks layer.

**1E — Run script + README** [PARALLEL with everything]
- `run.sh` (executable) — bootstrap script:
  1. Check Python 3 is available
  2. If `config.json` doesn't exist, copy `config.example.json` → `config.json` (or print friendly setup message)
  3. Run watch-server with the config flag
- `config.example.json` — annotated example pointing at common patterns (Obsidian vault, code repo, generic folder). Comments via `_comment` keys (JSON doesn't support comments natively).
- `README.md` (project-level) — install + run + config + share instructions. Audience: Dennis Hansen first, generic vault-owner second. Brand voice: Playful Sincerity (warm, honest, accessible, non-preachy). Keep it under 200 lines.

**1F — Fix screenshot.sh** [PARALLEL with everything]
- `generator/screenshot.sh` currently produces faded PNGs because it captures before the SVG fully renders.
- Fix: have `templates/v2/app.js` set `window.SW_READY = true` after the initial render completes, then update `screenshot.sh` to wait for that flag via `--virtual-time-budget` increase or via Chromium DevTools Protocol's `Page.loadEventFired`.
- Acceptance: a fresh screenshot of the live page is sharp (colors saturated), not faded.

**1G — Integration smoke test** [SERIES, must follow all above]
- Run: `cp config.example.json config.json && ./run.sh`
- Open browser to `http://localhost:8765`
- Verify: a canvas renders with the configured roots
- Run `bash generator/screenshot.sh` — verify the PNG is sharp
- This is the human-checkable gate that Phase 1 is done.

## Output

When done, the project should look like:

```
Spatial Workspace/
├── README.md                          ← NEW (1E)
├── config.example.json                ← NEW (1E)
├── run.sh                             ← NEW (1E, executable)
├── plan.md                            ← unchanged
├── archive/v1/
│   ├── README.md                      ← NEW (1A)
│   ├── app.html                       ← MOVED from templates/app.html (1A)
│   └── plan-v1.md                     ← already present
├── generator/
│   ├── generate-ecosystem.py          ← UPDATED (1D)
│   ├── watch-server.py                ← UPDATED to accept --config
│   ├── screenshot.sh                  ← FIXED (1F)
│   └── config.py                      ← NEW (1C)
├── templates/
│   └── v2/
│       ├── template.html              ← NEW (1B)
│       ├── app.css                    ← NEW (1B, extracted from v1)
│       ├── app.js                     ← NEW (1B, extracted from v1)
│       ├── d3.min.js                  ← unchanged
│       └── marked.min.js              ← unchanged
└── tests/
    └── test_config.py                 ← NEW (1C)
```

## Success Criteria

- [ ] `archive/v1/app.html` exists; `templates/app.html` is gone (or empty)
- [ ] `templates/v2/{template.html, app.css, app.js}` exist as separate files
- [ ] `cp config.example.json config.json && ./run.sh` from a fresh state opens a working canvas in the browser
- [ ] `bash generator/screenshot.sh` produces a sharp (not faded) PNG matching the live page
- [ ] `python3 -m pytest tests/test_config.py` passes
- [ ] Generator emits both `ECOSYSTEM_DATA` and `CONFIG` JS constants in the output HTML
- [ ] `crossLinks` array is present in `ECOSYSTEM_DATA` (even if empty for some files)
- [ ] All existing v1 functionality still works in the new structure (this is just a refactor; no feature changes)

## Verification

After all sub-tasks complete:
1. Restart watch-server fresh: `pkill -f watch-server.py; cd <project>; ./run.sh`
2. Browser auto-opens to `http://localhost:8765`
3. Click around the canvas — same v1 behavior, different file layout
4. Run `bash generator/screenshot.sh` — sharp PNG appears at `/tmp/sw-canvas.png`
5. `git status` should show: deleted `templates/app.html`, added everything in the output structure above

## Chronicle as you go

Per the global semantic-logging rule, log to `chronicle/2026-04-16.md` (or `chronicle/<today>.md` if a new day starts) at every meaningful step. Especially:
- Decisions made (e.g., how you handled the v1 monolith extraction)
- Surprises (e.g., if the screenshot fix turns out to be deeper than expected)
- Files created/moved/deleted

## When done

Write a one-paragraph completion note to the bottom of `chronicle/<today>.md` summarizing what shipped and any open questions. Then tell Wisdom: **"Phase 1 complete. Ready for Phase 2 (Design Workshop). The Figma MCP permissions need to be in `~/.claude/settings.json` before that conversation starts."**

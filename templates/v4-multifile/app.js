// ────────────────────────────────────────────────────────────────────
// Spatial Workspace v2 — Canvas App
//
// Phase 3 (Layout & Visual) rewrite:
//   • Membrane-physics layout (d3.tree polar seed → d3-force with rectCollide)
//   • Nodes rendered as buttons (rect + horizontal text), not dots + labels
//   • Status = ambient color: 1.5px heat-token border + heat-bg fill
//   • Center-to-center connector lines under settled nodes
//   • Expand/collapse preserves positions and re-settles in ~60 iterations
//   • Initial load: root + its direct children only (rest collapsed)
//
// Layout is plugged in via a `Simulation` interface (see typedef below) so the
// settle-once approach can be swapped for always-alive / draggable variants
// without touching render code.
// ────────────────────────────────────────────────────────────────────

// ── Settings ──────────────────────────────────────────────────────────
const SETTINGS_DEFAULTS = {
  ringSpacing: 180,     // base radius step between depth rings (polar seed + radial force)
  leafArc: 22,          // arc length per leaf at the outer perimeter (polar seed)
  hitRadius: 5,         // invisible click halo around each node (small — too large
                        //   and the halos of adjacent ring-nodes overlap, sending
                        //   a click on one to its neighbor)
  labelScale: 1.0,      // multiplier over the per-type design-spec font sizes
};

function loadExpandedPathsFromStorage() {
  try {
    const raw = localStorage.getItem("sw-expanded-paths");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : null;
  } catch (_) { return null; }
}

function saveExpandedPathsToStorage() {
  try {
    localStorage.setItem("sw-expanded-paths", JSON.stringify(Array.from(state.expandedPaths)));
  } catch (_) {}
}

function loadZoomFromStorage() {
  try {
    const raw = localStorage.getItem("sw-zoom");
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !isFinite(v.x) || !isFinite(v.y) || !isFinite(v.k)) return null;
    return v;
  } catch (_) { return null; }
}

function saveZoomToStorage(transform) {
  try {
    localStorage.setItem("sw-zoom", JSON.stringify({ x: transform.x, y: transform.y, k: transform.k }));
  } catch (_) {}
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("sw-settings") || "{}");
    return { ...SETTINGS_DEFAULTS, ...saved };
  } catch (e) {
    return { ...SETTINGS_DEFAULTS };
  }
}

function saveSettings() {
  localStorage.setItem("sw-settings", JSON.stringify(state.settings));
}

// ── App State ─────────────────────────────────────────────────────────
const state = {
  expandedPaths: new Set(),
  selectedPath: null,
  searchQuery: "",
  flatNodes: [],
  flatNodesByPath: new Map(),  // path -> flatNode entry, for O(1) lookup in hot paths
  settings: loadSettings(),
  openTabs: [],
  activeTabIndex: -1,
  readerMinimized: false,
  layoutRoot: null,  // latest d3.hierarchy root (post-settle), for re-seed on expand
  maxTierExpanded: 1,  // tier+/- counter; N = expand every dir at depth < N
  searchScope: null,   // when set, searches only match descendants of this folder path
  showCrossLinks: false,  // toggle for the cross-linkage layer
  showTreeLines: true,    // toggle for parent-child connectors
  isolatedCrossLink: null, // { src, tgt, key } when a link is clicked — isolates that pair
};

// ── Constants ─────────────────────────────────────────────────────────
// INITIAL_EXPAND_DEPTH = 1 per Phase 2 decision ("just the root"): root is
// expanded (its immediate children are rendered as siblings), but those
// children stay collapsed so the cold-open screen is deliberately quiet.
const INITIAL_EXPAND_DEPTH = 1;
const INITIAL_EXPAND_BAG_THRESHOLD = 40;
const ANIM_DURATION = 480;

// Heat = recency of last edit anywhere in the subtree (rolled up by the
// generator from descendant file mtimes). Thresholds in days, ordered
// hottest → coolest; anything older than the last threshold gets no
// heat color and falls back to the default border.
const AGE_HEAT_DAYS = {
  blaze: 1,    // edited today
  hot:   3,    // last 3 days
  warm:  7,    // last week
  cool:  14,   // last 2 weeks
  cold:  30,   // last month
  // older than 30 days → no heat (falls back to default border)
};

function heatForMtime(mtimeSec) {
  if (!mtimeSec) return null;
  const ageMs = Date.now() - mtimeSec * 1000;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 0) return "blaze"; // clock skew — treat as fresh
  if (ageDays <= AGE_HEAT_DAYS.blaze) return "blaze";
  if (ageDays <= AGE_HEAT_DAYS.hot)   return "hot";
  if (ageDays <= AGE_HEAT_DAYS.warm)  return "warm";
  if (ageDays <= AGE_HEAT_DAYS.cool)  return "cool";
  if (ageDays <= AGE_HEAT_DAYS.cold)  return "cold";
  return null;
}

function formatMtimeAge(mtimeSec) {
  if (!mtimeSec) return "unknown";
  const ageMs = Date.now() - mtimeSec * 1000;
  const mins = Math.round(ageMs / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = (days / 365).toFixed(1);
  return `${years}y ago`;
}

// Per-type button anatomy (Figma workshop, 2026-04-16).
// padX = horizontal padding; height is fixed; minWidth is the floor.
const NODE_ANATOMY = {
  root:   { fontPx: 14.5, weight: 700, tracking: "-0.02em",  height: 44, padX: 18, minWidth: 230, radius: 10 },
  folder: { fontPx: 12,   weight: 600, tracking: "-0.015em", height: 32, padX: 14, minWidth: 112, radius: 8  },
  file:   { fontPx: 11,   weight: 500, tracking: "-0.01em",  height: 28, padX: 12, minWidth: 88,  radius: 6  },
};

function anatomyFor(d) {
  if (d.depth === 0) return NODE_ANATOMY.root;
  return d.data.type === "file" ? NODE_ANATOMY.file : NODE_ANATOMY.folder;
}

// ── Simulation Interface ──────────────────────────────────────────────
/**
 * @typedef {object} Simulation
 * @property {(nodes: Array, links: Array) => void} seed
 *   Register the nodes + links to lay out. Nodes are expected to have
 *   `x`, `y` (initial guess), `width`, `height`, and `depth`.
 * @property {(maxIterations?: number) => Promise<void>} run
 *   Tick the simulation until alpha drops below SETTLE_ALPHA_MIN or
 *   maxIterations is hit. Resolves once settled.
 * @property {(node: object) => {width: number, height: number}} measure
 *   Pre-render measurement of a node's bounding box (label width + padding).
 *   Used both by the simulation (rectCollide) and by the render layer.
 * @property {((cb: Function) => void) | null} tick
 *   Optional continuous-mode tick callback (null in settle-once mode).
 */

// ── Node Measurement (offscreen canvas) ───────────────────────────────
const _measureCanvas = document.createElement("canvas");
const _measureCtx = _measureCanvas.getContext("2d");

function measureNode(d) {
  const a = anatomyFor(d);
  const scale = state.settings.labelScale;
  const fontPx = a.fontPx * scale;
  _measureCtx.font = `${a.weight} ${fontPx}px Satoshi, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const label = nodeLabel(d);
  const textW = _measureCtx.measureText(label).width;
  const width = Math.max(a.minWidth, Math.ceil(textW + a.padX * 2));
  // Folder / file labels have a tight max so very long names don't blow the layout.
  const cap = d.depth === 0 ? 520 : 260;
  return { width: Math.min(width, cap), height: a.height };
}

// ── Node Visual Tokens ────────────────────────────────────────────────
// Returns the style tokens for a node: stroke, fill, strokeWidth, heat.
//
// Design decision (2026-04-16 iteration): only ~0.5% of nodes carry a `phase`
// field. If we apply status-as-fill-color, 99.5% of the canvas reads as "no
// data" and the 0.5% that have status look arbitrary — color stops meaning
// anything. Instead: fill is neutral for everyone (identity channel); status
// surfaces as a thicker heat-colored stroke (status channel). Root stays
// special with the purple stroke. This matches the GitLab / Carbon / VS Code
// pattern of "color must be paired with a second encoding or not used at all".
function nodeVisual(d) {
  const mtime = d.data.meta && d.data.meta.mtime;
  const heat = heatForMtime(mtime);
  if (heat) {
    return {
      stroke: `var(--sw-heat-${heat})`,
      fill: `var(--sw-surface)`,
      strokeWidth: 2,
      heat,
    };
  }
  if (d.depth === 0) {
    return {
      stroke: `var(--sw-purple)`,
      fill: `var(--sw-surface-lift)`,
      strokeWidth: 1.5,
      heat: null,
    };
  }
  return {
    stroke: `var(--sw-border-default)`,
    fill: `var(--sw-surface)`,
    strokeWidth: 1,
    heat: null,
  };
}

// ── Zoom-Coupled Sizing (tier-respective) ─────────────────────────────
// As zoom shrinks, ancestor folders grow so they stay legible and provide
// wayfinding cues. Visual transform only — d3.pack positions are fixed.
// Inverse-zoom formula: `factor / k` keeps on-screen size roughly constant
// as the user zooms out. tierFactors[depth] controls how much each tier
// grows; lower = grows less. The cap on max-scale prevents runaway sizes
// at very far zoom (otherwise root goes 100× and overlaps everything).
const ZOOM_SIZING = {
  threshold: 0.6,    // no scaling above this zoom (normal stays normal)
  maxScale:  15,     // cap so very-far-zoom doesn't explode world-space size
  tierFactors: [0.60, 0.56, 0.42, 0.31, 0.22, 0.16, 0.12, 0.085],
};

function zoomCoupledScale(d, k) {
  if (!d || d.data.type !== "directory") return 1;
  if (k >= ZOOM_SIZING.threshold) return 1;
  const tf = ZOOM_SIZING.tierFactors;
  const factor = tf[Math.min(d.depth, tf.length - 1)];
  // Ramp from scale=1 at k=threshold, growing as 1/k below.
  const raw = factor / k - factor / ZOOM_SIZING.threshold + 1;
  return Math.min(ZOOM_SIZING.maxScale, Math.max(1, raw));
}

// Perf: track whether the last pass was above the threshold. When k is above
// threshold every node's scale collapses to 1 — the DOM transforms are already
// translate-only from the last pass or from initial render. Subsequent zoom/pan
// events above the threshold can skip the full per-node walk (4000+ attribute
// writes per event) with no visible change.
let _zoomSizingLastAbove;
// Z-order only changes when nodes are added/removed. Track a dirty flag so
// the .sort() (which reorders 13k+ DOM nodes) only runs once per layout change
// instead of on every zoom event below the threshold.
let _zoomSortDirty = true;

function markZoomSortDirty() { _zoomSortDirty = true; }

function applyZoomCoupledSizing(k) {
  if (!g) return;
  const aboveThreshold = k >= ZOOM_SIZING.threshold;
  if (aboveThreshold && _zoomSizingLastAbove === true) return;
  _zoomSizingLastAbove = aboveThreshold;

  const nodes = g.selectAll(".node");
  nodes.each(function(d) {
    if (!d) return;
    const s = zoomCoupledScale(d, k);
    const base = `translate(${d.x},${d.y})`;
    const tf = s === 1 ? base : `${base} scale(${s})`;
    this.setAttribute("transform", tf);
  });
  // Z-order: shallower nodes render on top so ancestors always overlap
  // descendants ("by tier, the layers of how it's displayed"). d3's .sort()
  // reorders the DOM in place — deepest nodes go first, root last.
  // Skip when DOM hasn't changed since last sort.
  if (_zoomSortDirty) {
    nodes.sort((a, b) => (b.depth || 0) - (a.depth || 0));
    _zoomSortDirty = false;
  }
}

// ── LOD Interactivity Gating ──────────────────────────────────────────
// Below LOD_THRESHOLD_PX rendered font size, a node keeps its visual but
// stops responding to pointer events. The browser skips hit-testing and
// handler firing on those nodes — a massive savings at far zoom when the
// cursor would otherwise sweep across thousands of operable buttons.
const LOD_THRESHOLD_PX = 8;
const LOD_DEBOUNCE_MS = 80;  // wait until zoom settles before rewalking 13k+ nodes
let _lodTimeout = null;
let _lodLastK = null;
let _lodPendingK = null;

function applyLODInteractivity(k) {
  if (!g) return;
  _lodLastK = k;
  const labelScale = state.settings.labelScale || 1;
  g.selectAll(".node").each(function(d) {
    if (!d) return;
    const a = anatomyFor(d);
    const nodeScale = zoomCoupledScale(d, k);
    // Rendered on-screen font px ≈ base × label-scale × zoom-coupled-scale × k.
    // wrap.fontMultiplier is ~1 for most nodes, skipped here for speed.
    const renderedFontPx = a.fontPx * labelScale * nodeScale * k;
    this.classList.toggle("lod-non-interactive", renderedFontPx < LOD_THRESHOLD_PX);
  });
}

// Trailing-edge debounce: during continuous zoom we skip the 13k-node walk
// entirely and only run it after the user stops zooming for LOD_DEBOUNCE_MS.
// Pan events skip implicitly because k doesn't change between them — the
// fast-path guard returns before scheduling anything.
function scheduleLODInteractivityUpdate(k) {
  if (_lodLastK !== null && k === _lodLastK) return;  // no zoom change
  _lodPendingK = k;
  if (_lodTimeout !== null) clearTimeout(_lodTimeout);
  _lodTimeout = setTimeout(() => {
    _lodTimeout = null;
    applyLODInteractivity(_lodPendingK);
  }, LOD_DEBOUNCE_MS);
}

// ── Layout Engine (v3-bubble — Recursive Circle Packing via d3.pack) ──
// Wisdom's bubble model: each folder + its immediate children forms an
// implicit "bubble" (never drawn). Children pack tangent inside the
// bubble region, not on a ring around parent. At every level, the same
// rule applies recursively. Uses d3.pack from d3-hierarchy (already
// vendored). Deterministic, physics-free, O(n log n).
//
// Why this isn't Path A (rejected circle packing): we don't zoom into
// child circles — the whole tree stays visible at the same canvas.
// Membranes are invisible, only the buttons and folder→child lines are
// rendered. The "packed" feel emerges from positions alone.

// Vestigial physics knobs (old Physics Slider Panel reads these; inert).
window.SW_PHYSICS = window.SW_PHYSICS || {
  linkPad: 20, linkStrength: 1.2, chargeBase: -60,
  bubbleStrength: 0.08, bubbleGap: 3, pinStrength: 1.0
};
const SW_PHYSICS_DEFAULTS = Object.freeze({ ...window.SW_PHYSICS });

const BUBBLE = {
  padding:  4,    // tight gap between sibling circles (d3.pack padding)
  sizeBox:  4000, // large enough to hold all packing; fitToView zooms
  leafRadiusScale: 1.0, // 1.0 = button-sized circles, >1 adds breathing room
};

function createLayout({ baseSpacing = 180 } = {}) {
  let _nodes = [];
  let _links = [];
  let _root = null;

  function seed(nodes, links) {
    _nodes = nodes;
    _links = links;
    _root = nodes.find(d => d.depth === 0) || nodes[0];
  }

  // Visual radius of a node's rectangular button — half the bounding
  // rect's diagonal so circles inscribe the box.
  function nodeVisualRadius(d) {
    const w = d.width || 80;
    const h = d.height || 32;
    return Math.hypot(w, h) / 2;
  }

  async function run(options = {}) {
    if (!_root) return;

    // Measure every node (button width/height from label text).
    for (const d of _nodes) {
      const label = nodeLabel(d);
      const a = anatomyFor(d);
      const fontPx = a.fontPx * (state.settings.labelScale || 1);
      _measureCtx.font = `${a.weight} ${fontPx}px Satoshi, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const capped = label.length <= 20 ? label : label.slice(0, 20);
      const textW = _measureCtx.measureText(capped).width;
      d.width = Math.max(a.minWidth, Math.ceil(textW + a.padX * 2));
      d.height = a.height;
    }

    // Subtree-weight sizing: nodes scale by descendant count.
    _root.eachAfter(d => {
      d._leafCount = (!d.children || !d.children.length)
        ? 1 : d.children.reduce((s, c) => s + c._leafCount, 0);
    });
    const K = 0.08;
    for (const d of _nodes) {
      const leaves = d._leafCount || 1;
      if (leaves > 1) {
        const factor = 1 + K * Math.log2(leaves + 1);
        d.width *= factor;
        d.height *= factor;
        d._fontScale = Math.min(factor, 2.0);
      }
    }

    // d3.pack with absolute radii + synthetic self-nodes.
    // Each folder in the visible tree gets a synthetic "self" leaf prepended
    // to its children; d3.pack treats it as a real sibling, so the folder's
    // button gets its own packed spot instead of overlapping its children.
    // .radius() forces each leaf to exactly its button's visual radius —
    // d3.pack won't scale to fit a size box, so packing is at true pixel size.

    const nodesByPath = new Map();
    for (const d of _nodes) nodesByPath.set(d.data.path, d);

    // Build a pack-only hierarchy with self-nodes inserted.
    const visibleRoot = _root.data;
    const packRoot = d3.hierarchy(visibleRoot, (data) => {
      if (!data.children || data.children.length === 0) return null;
      return [
        { _isSelf: true, _origPath: data.path },
        ...data.children
      ];
    });

    // .sum() is required for internal counting even when .radius() overrides.
    packRoot.sum(() => 1);

    const pack = d3.pack()
      .padding(BUBBLE.padding)
      .radius(d => {
        let node;
        if (d.data && d.data._isSelf) node = nodesByPath.get(d.data._origPath);
        else if (d.data && d.data.path) node = nodesByPath.get(d.data.path);
        if (!node) return 40;
        return nodeVisualRadius(node) * BUBBLE.leafRadiusScale;
      });
    pack(packRoot);

    // Map positions back to the REAL hierarchy nodes.
    for (const pn of packRoot.descendants()) {
      if (pn.data && pn.data._isSelf) {
        const folderNode = nodesByPath.get(pn.data._origPath);
        if (folderNode) { folderNode.x = pn.x; folderNode.y = pn.y; }
      } else if ((!pn.children || pn.children.length === 0) && pn.data && pn.data.path) {
        const leafNode = nodesByPath.get(pn.data.path);
        if (leafNode) { leafNode.x = pn.x; leafNode.y = pn.y; }
      }
    }

    // Shift so root is at origin.
    const cx = _root.x, cy = _root.y;
    for (const d of _nodes) { d.x -= cx; d.y -= cy; }
  }

  return { seed, run, measure: measureNode, tick: null };
}

// ── Data Ingestion ────────────────────────────────────────────────────
let TREE = null;
let CROSS_LINKS = [];

function init() {
  if (typeof ECOSYSTEM_DATA === "undefined") {
    document.getElementById("canvas").innerHTML =
      "<p style='padding:40px;color:#c0392b;'>Error: No ecosystem data found.</p>";
    return;
  }

  TREE = ECOSYSTEM_DATA.tree || ECOSYSTEM_DATA;
  CROSS_LINKS = ECOSYSTEM_DATA.crossLinks || [];

  if (typeof CONFIG !== "undefined" && CONFIG && CONFIG.label) {
    // Title stays as the app name ("Spatial Workspace"); subtitle shows the
    // ecosystem label so the app identity and the content identity are
    // distinct.
    const subEl = document.getElementById("sw-subtitle");
    if (subEl) subEl.textContent = CONFIG.label;
    document.title = CONFIG.label + " — Spatial Workspace";
  }

  flattenTree(TREE, "");
  computeTreeMaxDirDepth();
  setInitialExpanded(TREE, 0, INITIAL_EXPAND_DEPTH);
  state.maxTierExpanded = INITIAL_EXPAND_DEPTH;

  try {
    state.showCrossLinks = localStorage.getItem("sw-show-cross-links") === "1";
    const savedTreeLines = localStorage.getItem("sw-show-tree-lines");
    if (savedTreeLines !== null) state.showTreeLines = savedTreeLines === "1";
  } catch (_) {}

  // Restore expanded paths from the previous session so the watch-server
  // auto-reload doesn't collapse everything back to initial.
  const restored = loadExpandedPathsFromStorage();
  if (restored && restored.size > 0) {
    state.expandedPaths = new Set();
    const validDirs = new Set(state.flatNodes.filter(n => n.type === "directory").map(n => n.path));
    for (const p of restored) if (validDirs.has(p)) state.expandedPaths.add(p);
  }

  const totalFiles = state.flatNodes.filter(n => n.type === "file").length;
  const totalDirs = state.flatNodes.filter(n => n.type === "directory").length;
  document.getElementById("stats-text").textContent = `${totalFiles} files · ${totalDirs} dirs`;

  renderTree();
  setupEvents();
  setupSettingsPanel();
  startLivePolling();
}

function flattenTree(node, parentPath) {
  const nodePath = node.path || parentPath + "/" + node.name;
  const flat = {
    name: node.name,
    path: nodePath,
    type: node.type,
    content: node.content || null,
    meta: node.meta || {},
  };
  state.flatNodes.push(flat);
  state.flatNodesByPath.set(nodePath, flat);
  if (node.children) {
    for (const child of node.children) flattenTree(child, nodePath);
  }
}

function setInitialExpanded(node, depth, maxDepth) {
  if (depth >= maxDepth || node.type !== "directory") return;
  // Bag threshold: folders with many immediate children stay collapsed.
  // Prevents a single wide folder from flooding the initial canopy.
  const imm = (node.children || []).length;
  if (depth > 0 && imm > INITIAL_EXPAND_BAG_THRESHOLD) return;
  state.expandedPaths.add(node.path);
  if (node.children) {
    for (const child of node.children) {
      setInitialExpanded(child, depth + 1, maxDepth);
    }
  }
}

// ── Visible Tree Pruning ──────────────────────────────────────────────
function getVisibleTree(node) {
  const clone = {
    name: node.name,
    path: node.path,
    type: node.type,
    meta: node.meta || {},
    content: node.content || null,
    _children: node.children || [],
    _hasChildren: !!(node.children && node.children.length > 0),
  };
  if (node.type === "directory" && state.expandedPaths.has(node.path) && node.children) {
    clone.children = node.children.map(c => getVisibleTree(c));
  }
  return clone;
}

function nodeLabel(d) {
  let label = d.data.name;
  if (d.data.type === "directory" && d.data._hasChildren) {
    const isExpanded = state.expandedPaths.has(d.data.path);
    const count = d.data._children ? d.data._children.length : 0;
    if (!isExpanded && count > 0) label += ` (${count})`;
  }
  if (d.data.meta && d.data.meta.project_name && d.data.meta.project_name !== d.data.name) {
    label = d.data.meta.project_name;
  }
  return label;
}

// Wrap a label across multiple lines when the node's rect is narrower than
// the natural label width. Wisdom's 2026-04-16 rule: never show just "…".
// At least ~20 characters must remain visible; if horizontal space is too
// tight for that on one line, break into up to MAX_LINES lines (word
// boundaries first, then character boundaries), and if that still doesn't
// fit, scale the font down. Returns { lines, fontMultiplier }.
function wrapLabel(d, label, { maxLines = 5, preferredCharsPerLine = 20 } = {}) {
  const a = anatomyFor(d);
  const scale = state.settings.labelScale;
  const nodeScale = d._fontScale || 1;
  const baseFontPx = a.fontPx * scale * nodeScale;
  const rectAvail = Math.max(8, d.width - a.padX * 2);
  const fontFamily = 'Satoshi, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const setFont = (mult) => {
    _measureCtx.font = `${a.weight} ${baseFontPx * mult}px ${fontFamily}`;
  };

  setFont(1);
  // "Square-at-18-chars" rule (Wisdom 2026-04-16): a node shouldn't sprawl
  // horizontally for long labels — at ~18 characters, start wrapping so the
  // node becomes square/taller instead of wide. The line-width budget is
  // the smaller of the rect's available width OR the pixel-width of 18
  // average characters at base font.
  const idealChars = "M".repeat(preferredCharsPerLine);
  const idealMax = _measureCtx.measureText(idealChars).width;
  const avail = Math.min(rectAvail, idealMax);
  if (label.length <= preferredCharsPerLine && _measureCtx.measureText(label).width <= avail) {
    return { lines: [label], fontMultiplier: 1 };
  }

  // Boundary-aware line breaker. Prefers breaking after separators
  // (whitespace, -, _, ., /). Falls back to per-character break when a
  // single segment is longer than a line.
  function breakIntoLines(text, width) {
    const lines = [];
    let current = "";
    let i = 0;
    const isSep = (c) => /[\s\-._/]/.test(c);
    while (i < text.length) {
      let end = i;
      while (end < text.length && !isSep(text[end])) end++;
      if (end < text.length) end++; // include the separator
      const segment = text.slice(i, end);
      const tryLine = current + segment;
      if (_measureCtx.measureText(tryLine).width <= width) {
        current = tryLine;
        i = end;
      } else if (current === "") {
        // Segment alone too long — break at chars.
        let k = i;
        let chunk = "";
        while (k < end) {
          const tryChunk = chunk + text[k];
          if (_measureCtx.measureText(tryChunk).width > width && chunk) break;
          chunk = tryChunk;
          k++;
        }
        if (!chunk) chunk = text[i];
        lines.push(chunk);
        i += chunk.length || 1;
      } else {
        lines.push(current);
        current = "";
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  setFont(1);
  let lines = breakIntoLines(label, avail);
  let fontMult = 1;

  // If too many lines, shrink font until we fit inside maxLines.
  if (lines.length > maxLines) {
    let lo = 0.55, hi = 1;
    for (let step = 0; step < 7; step++) {
      const mid = (lo + hi) / 2;
      setFont(mid);
      const candidate = breakIntoLines(label, avail);
      if (candidate.length <= maxLines) {
        lo = mid;
        lines = candidate;
        fontMult = mid;
      } else {
        hi = mid;
      }
    }
    // If STILL over budget, ellipsize the last kept line.
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      setFont(fontMult);
      let last = kept[maxLines - 1];
      while (last.length > 1 && _measureCtx.measureText(last + "…").width > avail) {
        last = last.slice(0, -1);
      }
      kept[maxLines - 1] = last + "…";
      lines = kept;
    }
  }

  return { lines, fontMultiplier: fontMult };
}

// ── Canvas Bootstrap ──────────────────────────────────────────────────
// Two-group SVG pattern: outerG carries the d3.zoom transform unchanged so
// pinch zoom anchors at the cursor; g is the centered content group.
let svg, outerG, g, zoomBehavior;

function renderTree() {
  const container = document.getElementById("canvas");
  const width = container.clientWidth;
  const height = container.clientHeight;

  container.innerHTML = "";

  svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Dot-grid pattern inside the zoom layer. Moving it out of CSS into SVG
  // so it pans/zooms with the canvas content — the dots become a spatial
  // scale reference: when dots are far apart you're zoomed in, when close
  // together you're zoomed out. 2026-04-16 Wisdom's call.
  const defs = svg.append("defs");
  const dotPattern = defs.append("pattern")
    .attr("id", "dot-grid")
    .attr("width", 40).attr("height", 40)
    .attr("patternUnits", "userSpaceOnUse");
  dotPattern.append("circle")
    .attr("cx", 20).attr("cy", 20).attr("r", 1.25)
    .attr("fill", "rgba(237, 229, 213, 0.06)");

  outerG = svg.append("g").attr("class", "zoom-layer");
  // Dot-grid background rect — huge so it covers the viewport at any pan/zoom.
  // Sits inside outerG so it picks up the zoom transform.
  outerG.append("rect")
    .attr("class", "dot-grid-bg")
    .attr("x", -100000).attr("y", -100000)
    .attr("width", 200000).attr("height", 200000)
    .attr("fill", "url(#dot-grid)")
    .attr("pointer-events", "none");
  g = outerG.append("g")
    .attr("class", "content-layer")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);
  // Cross-links layer sits FIRST inside the content layer so it paints
  // below parent-child lines and nodes — ambient background signal.
  g.append("g").attr("class", "cross-links-layer");
  applyTreeLinesVisibility();

  zoomBehavior = d3.zoom().scaleExtent([0.01, 8]);
  setupTrackpadGestures(svg, zoomBehavior);
  zoomBehavior.on("zoom", (event) => {
    outerG.attr("transform", event.transform);
    applyZoomCoupledSizing(event.transform.k);
    scheduleLODInteractivityUpdate(event.transform.k);
    saveZoomToStorage(event.transform);
  });
  svg.call(zoomBehavior);

  // Apply persisted zoom BEFORE the first paint so reloads resume silently
  // at the previous viewport instead of briefly showing the un-fitted tree
  // and then transitioning to fit.
  const savedZoom = loadZoomFromStorage();
  if (savedZoom) {
    const t = d3.zoomIdentity.translate(savedZoom.x, savedZoom.y).scale(savedZoom.k);
    svg.call(zoomBehavior.transform, t);
    _zoomRestoredFromStorage = true;
  }

  updateTree();
}

function setupTrackpadGestures(svgSel, zoomB) {
  // Route wheel events: pinch (ctrlKey from trackpad) or ⌘/Ctrl wheel →
  // d3.zoom handles zooming; plain wheel → we pan manually below.
  // Clicks/mousedowns inside a .node group are excluded so node click handlers
  // receive the event instead of d3.zoom consuming it as a pan gesture.
  zoomB.filter((event) => {
    if (event.type === "wheel") return event.ctrlKey || event.metaKey;
    if (event.button) return false;
    if (event.target && event.target.closest && event.target.closest(".node")) return false;
    return true;
  });

  zoomB.wheelDelta((event) => {
    return -event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.005);
  });

  svgSel.on("wheel.pan", (event) => {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const t = d3.zoomTransform(svgSel.node());
    // Divide by scale so a flick pans the same screen distance at any zoom
    svgSel.call(zoomB.translateBy, -event.deltaX / t.k, -event.deltaY / t.k);
  }, { passive: false });
}

function fitToView() {
  if (!g) return;
  try {
    // Prefer target-layout extent (computed positions) over live DOM bbox.
    // During a collapse transition, exit-selection nodes still occupy their
    // old (far-out) positions in the DOM — getBBox() would over-report, and
    // the viewport would zoom out instead of in. Layout data is already at
    // the NEW positions, so the fit is accurate even mid-transition.
    let bbox = null;
    if (state.layoutRoot) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const d of state.layoutRoot.descendants()) {
        if (!isFinite(d.x) || !isFinite(d.y)) continue;
        const hw = (d.width || 0) / 2;
        const hh = (d.height || 0) / 2;
        if (d.x - hw < minX) minX = d.x - hw;
        if (d.x + hw > maxX) maxX = d.x + hw;
        if (d.y - hh < minY) minY = d.y - hh;
        if (d.y + hh > maxY) maxY = d.y + hh;
      }
      if (isFinite(minX) && isFinite(maxX)) {
        bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
    }
    if (!bbox) bbox = g.node().getBBox();
    const container = document.getElementById("canvas");
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (bbox.width === 0 || bbox.height === 0) return;

    const padding = 48;
    // Scale clamped: at most 1.0 (don't zoom past 100%), at least 0.04
    // (so even a 40k-wide deterministic tree shows as structure, not void).
    const scale = Math.max(0.04, Math.min(
      (w - padding * 2) / bbox.width,
      (h - padding * 2) / bbox.height,
      1.0
    ));

    const bboxCx = bbox.x + bbox.width / 2;
    const bboxCy = bbox.y + bbox.height / 2;
    const gTx = w / 2;
    const gTy = h / 2;
    const tx = w / 2 - (gTx + bboxCx) * scale;
    const ty = h / 2 - (gTy + bboxCy) * scale;

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    // Slightly exceed ANIM_DURATION so the viewport lands just after the
    // layout settles — otherwise the zoom finishes first and the final
    // layout frames look like they're "catching up" to the framing.
    svg.transition().duration(ANIM_DURATION + 80).call(zoomBehavior.transform, transform);
  } catch (e) { /* getBBox can throw on fresh SVGs */ }
}

// Pan the canvas so the given node's world position lands at the visible
// canvas center — accounts for the left offset of the <g class="zoom-layer">
// (width/2, height/2) and clamps zoom to the current scale. This is what
// makes "click a node, it centers" feel right: the node you clicked stays
// your focal point regardless of tree shape after expand/collapse.
function centerOnNode(path, { duration = 320, keepScale = true } = {}) {
  if (!g || !path) return;
  const pos = _prevPositions.get(path);
  if (!pos) return;
  const container = document.getElementById("canvas");
  const w = container.clientWidth;
  const h = container.clientHeight;
  const gCenterX = w / 2;
  const gCenterY = h / 2;

  const current = d3.zoomTransform(svg.node());
  const scale = keepScale ? current.k : Math.max(current.k, 0.6);

  const targetX = w / 2;
  const targetY = h / 2;
  const tx = targetX - (gCenterX + pos.x) * scale;
  const ty = targetY - (gCenterY + pos.y) * scale;

  const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
  if (duration > 0) {
    svg.transition().duration(duration).call(zoomBehavior.transform, transform);
  } else {
    svg.call(zoomBehavior.transform, transform);
  }
}

// Fit a file node + its parent folder into the canvas panel. Used when
// a file is clicked and the reader opens. "You're viewing everything in
// that one side canvas" — Wisdom 2026-04-16: the canvas panel narrows to
// the reader's left side, and the clicked file + its parent should both
// be visible in that remaining space. Keeps the current zoom as a
// ceiling so clicking close files doesn't dramatically zoom in.
function centerOnFileWithParent(path, { duration = 320 } = {}) {
  if (!g || !path || !state.layoutRoot) return;
  const node = state.layoutRoot.descendants().find(d => d.data.path === path);
  if (!node) return;
  const targets = node.parent ? [node, node.parent] : [node];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const t of targets) {
    const hw = (t.width || 0) / 2;
    const hh = (t.height || 0) / 2;
    if (t.x - hw < minX) minX = t.x - hw;
    if (t.x + hw > maxX) maxX = t.x + hw;
    if (t.y - hh < minY) minY = t.y - hh;
    if (t.y + hh > maxY) maxY = t.y + hh;
  }
  const bboxCx = (minX + maxX) / 2;
  const bboxCy = (minY + maxY) / 2;
  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);

  const container = document.getElementById("canvas");
  const w = container.clientWidth;
  const h = container.clientHeight;
  const padding = 60;
  const current = d3.zoomTransform(svg.node());
  const fitScale = Math.min((w - padding * 2) / bboxW, (h - padding * 2) / bboxH);
  // Never zoom IN further than the user's current scale — only out to fit.
  const scale = Math.min(current.k, Math.max(fitScale, 0.2));

  const gCx = w / 2;
  const gCy = h / 2;
  const tx = w / 2 - (gCx + bboxCx) * scale;
  const ty = h / 2 - (gCy + bboxCy) * scale;

  const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
  svg.transition().duration(duration).call(zoomBehavior.transform, transform);
}

// Fit a directory + its visible children to the viewport. Used when a
// directory is clicked and expands — you want to see the folder AND what
// just appeared beneath it, not just the folder at the same zoom level.
// Zooms and pans in one transition.
function centerOnNodeWithChildren(path, { duration = 400 } = {}) {
  if (!g || !path || !state.layoutRoot) return;
  const node = state.layoutRoot.descendants().find(d => d.data.path === path);
  if (!node) return;

  const targets = [node];
  if (node.children && node.children.length > 0) {
    targets.push(...node.children);
  } else {
    return centerOnNode(path, { duration });
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const t of targets) {
    const hw = (t.width || 0) / 2;
    const hh = (t.height || 0) / 2;
    if (t.x - hw < minX) minX = t.x - hw;
    if (t.x + hw > maxX) maxX = t.x + hw;
    if (t.y - hh < minY) minY = t.y - hh;
    if (t.y + hh > maxY) maxY = t.y + hh;
  }
  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);
  const bboxCx = (minX + maxX) / 2;
  const bboxCy = (minY + maxY) / 2;

  const container = document.getElementById("canvas");
  const w = container.clientWidth;
  const h = container.clientHeight;
  const padding = 80;
  const current = d3.zoomTransform(svg.node());
  const fitScale = Math.min(
    (w - padding * 2) / bboxW,
    (h - padding * 2) / bboxH,
    1.5
  );
  // Only zoom OUT when necessary; never zoom IN beyond current scale. And
  // clamp minimum scale so a huge expanded subtree doesn't throw you to
  // 0.05× and lose orientation. Wisdom 2026-04-16: "it just went way too
  // far out, didn't need to go that far."
  const scale = Math.max(
    Math.min(current.k, fitScale),
    current.k * 0.5
  );

  const gCx = w / 2;
  const gCy = h / 2;
  const tx = w / 2 - (gCx + bboxCx) * scale;
  const ty = h / 2 - (gCy + bboxCy) * scale;

  const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
  svg.transition().duration(duration).call(zoomBehavior.transform, transform);
}

// Jump-to-cluster: zooms and pans so a target node and its immediate
// neighborhood fill the viewport — used by "Show in canvas" (locate button)
// where the user wants to SEE where something lives, even if they're
// currently zoomed way out. Unlike centerOn* variants, this ignores the
// current scale and always fits to the cluster bbox.
function zoomToCluster(path, { includeChildren = false, duration = 500 } = {}) {
  if (!g || !path || !state.layoutRoot) return;
  const node = state.layoutRoot.descendants().find(d => d.data.path === path);
  if (!node) return;

  const targets = [node];
  if (includeChildren && node.children && node.children.length > 0) {
    targets.push(...node.children);
  } else if (node.parent) {
    // Leaf (no children) or !includeChildren — frame node with its siblings.
    targets.push(node.parent);
    if (node.parent.children) targets.push(...node.parent.children);
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const t of targets) {
    const hw = (t.width || 0) / 2;
    const hh = (t.height || 0) / 2;
    if (t.x - hw < minX) minX = t.x - hw;
    if (t.x + hw > maxX) maxX = t.x + hw;
    if (t.y - hh < minY) minY = t.y - hh;
    if (t.y + hh > maxY) maxY = t.y + hh;
  }
  const bboxCx = (minX + maxX) / 2;
  const bboxCy = (minY + maxY) / 2;
  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);

  const container = document.getElementById("canvas");
  const w = container.clientWidth;
  const h = container.clientHeight;
  const padding = 80;
  const fitScale = Math.min((w - padding * 2) / bboxW, (h - padding * 2) / bboxH);
  // Cap at the zoomBehavior's extent (8) so small clusters actually zoom in.
  const scale = Math.max(0.02, Math.min(fitScale, 8));

  const gCx = w / 2;
  const gCy = h / 2;
  const tx = w / 2 - (gCx + bboxCx) * scale;
  const ty = h / 2 - (gCy + bboxCy) * scale;

  const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
  svg.transition().duration(duration).call(zoomBehavior.transform, transform);
}

// ── Cross-linkages ────────────────────────────────────────────────────
// Markdown [text](path) links extracted by the generator become curved
// edges between whichever nodes are currently visible. Links whose endpoints
// sit in a collapsed subtree get rolled up to the deepest visible ancestor,
// so a bundle of file-to-file links between two subtrees becomes a single
// folder-to-folder curve with weight = count. Thicker line = more underlying
// links. Off by default — 4k+ curves on at once is soup.

function deepestVisibleAncestor(path, pathToNode) {
  if (!path) return null;
  let p = path;
  while (p) {
    if (pathToNode.has(p)) return p;
    const i = p.lastIndexOf("/");
    if (i <= 0) return null;
    p = p.substring(0, i);
  }
  return null;
}

function crossLinkCurvePath(source, target) {
  if (!source || !target) return "";
  const x1 = source.x, y1 = source.y, x2 = target.x, y2 = target.y;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return `M${x1},${y1}L${x2},${y2}`;
  const nx = -dy / dist, ny = dx / dist;
  const offset = dist * 0.18;
  const cx = mx + nx * offset, cy = my + ny * offset;
  return `M${x1},${y1}Q${cx},${cy} ${x2},${y2}`;
}

function renderCrossLinks() {
  if (!g || !state.layoutRoot) return;
  const layer = g.select(".cross-links-layer");
  if (layer.empty()) return;
  if (!state.showCrossLinks || !CROSS_LINKS || CROSS_LINKS.length === 0) {
    layer.selectAll("*").remove();
    return;
  }

  const pathToNode = new Map();
  state.layoutRoot.descendants().forEach(d => pathToNode.set(d.data.path, d));

  // Aggregate links by (src-visible-ancestor, tgt-visible-ancestor).
  const groups = new Map();
  for (const link of CROSS_LINKS) {
    if (!link.target) continue;
    const src = deepestVisibleAncestor(link.source, pathToNode);
    const tgt = deepestVisibleAncestor(link.target, pathToNode);
    if (!src || !tgt || src === tgt) continue;
    const key = src + "→" + tgt;
    let grp = groups.get(key);
    if (!grp) {
      grp = { key, src, tgt, count: 0, links: [] };
      groups.set(key, grp);
    }
    grp.count++;
    grp.links.push(link);
  }

  const pairs = Array.from(groups.values());
  const sel = layer.selectAll(".cross-link").data(pairs, d => d.key);
  sel.exit().remove();
  const enter = sel.enter().append("path").attr("class", "cross-link");
  enter.merge(sel)
    .attr("d", d => crossLinkCurvePath(pathToNode.get(d.src), pathToNode.get(d.tgt)))
    .attr("stroke-width", d => Math.min(7, 1.2 + Math.log2(d.count + 1) * 0.75));

  layer.selectAll(".cross-link").on("click", (event, d) => {
    event.stopPropagation();
    onCrossLinkClick(d);
  });
  layer.selectAll(".cross-link").each(function(d) {
    const title = `${d.count} link${d.count === 1 ? "" : "s"} · click to isolate`;
    this.setAttribute("aria-label", title);
  });
  applyCrossLinkIsolation();
}

function onCrossLinkClick(d) {
  const iso = state.isolatedCrossLink;
  if (iso && iso.key === d.key) {
    clearCrossLinkIsolation();
    return;
  }
  state.isolatedCrossLink = { src: d.src, tgt: d.tgt, key: d.key };
  applyCrossLinkIsolation();
  // Open underlying source + target files in tabs. For aggregated bundles
  // (count > 1), open the first link's pair as a representative — opens
  // both files so the user can read both sides of the connection.
  if (d.links && d.links.length > 0) {
    const first = d.links[0];
    const srcFile = state.flatNodes.find(n => n.path === first.source && n.type === "file");
    const tgtFile = state.flatNodes.find(n => n.path === first.target && n.type === "file");
    if (srcFile) openFile(srcFile);
    if (tgtFile) openFile(tgtFile);
  }
}

function applyCrossLinkIsolation() {
  if (!g) return;
  const iso = state.isolatedCrossLink;
  if (!iso) {
    g.selectAll(".node").classed("cx-dimmed", false).classed("cx-focused", false);
    g.selectAll(".link").classed("cx-dimmed", false);
    g.selectAll(".cross-link").classed("cx-dimmed", false).classed("cx-focused", false);
    return;
  }
  g.selectAll(".node").each(function(d) {
    const isFocal = d && d.data && (d.data.path === iso.src || d.data.path === iso.tgt);
    d3.select(this).classed("cx-dimmed", !isFocal).classed("cx-focused", isFocal);
  });
  g.selectAll(".link").classed("cx-dimmed", true);
  g.selectAll(".cross-link").each(function(d) {
    const isThis = d && d.key === iso.key;
    d3.select(this).classed("cx-dimmed", !isThis).classed("cx-focused", isThis);
  });
}

function clearCrossLinkIsolation() {
  if (!state.isolatedCrossLink) return;
  state.isolatedCrossLink = null;
  applyCrossLinkIsolation();
}

async function toggleCrossLinks() {
  state.showCrossLinks = !state.showCrossLinks;
  try { localStorage.setItem("sw-show-cross-links", state.showCrossLinks ? "1" : "0"); } catch (_) {}
  const btn = document.getElementById("cross-links-btn");
  if (btn) btn.classList.toggle("active", state.showCrossLinks);
  renderCrossLinks();
}

function applyTreeLinesVisibility() {
  if (!g) return;
  g.classed("tree-lines-off", !state.showTreeLines);
  const btn = document.getElementById("tree-lines-btn");
  if (btn) btn.classList.toggle("active", state.showTreeLines);
}

function toggleTreeLines() {
  state.showTreeLines = !state.showTreeLines;
  try { localStorage.setItem("sw-show-tree-lines", state.showTreeLines ? "1" : "0"); } catch (_) {}
  applyTreeLinesVisibility();
}

// ── Layout Orchestration ──────────────────────────────────────────────
let _prevPositions = new Map();  // path → {x, y} — lets expand/collapse preserve placement
let _firstRender = true;
let _zoomRestoredFromStorage = false;

async function updateTree({ isResettle = false } = {}) {
  const s = state.settings;
  const visibleRoot = getVisibleTree(TREE);
  const root = d3.hierarchy(visibleRoot);
  const descendants = root.descendants();

  for (const d of descendants) {
    const m = measureNode(d);
    d.width = m.width;
    d.height = m.height;
    // When isResettle is true (slider tweak, reset button, mode switch),
    // clear positions — let the sim re-seed fresh under the CURRENT physics
    // so drift from prior settings doesn't carry over. When false (normal
    // user expand/collapse), seed from previous positions so the layout
    // doesn't jolt — sim only nudges the new arrivals.
    if (isResettle) {
      d.x = null;
      d.y = null;
      d._carried = false;
    } else {
      const prev = _prevPositions.get(d.data.path);
      if (prev && isFinite(prev.x) && isFinite(prev.y)) {
        d.x = prev.x;
        d.y = prev.y;
        d._carried = true;
      } else {
        d.x = null;
        d.y = null;
        d._carried = false;
      }
    }
  }

  const layout = createLayout({ baseSpacing: s.ringSpacing });
  layout.seed(descendants, root.links());

  const t0 = performance.now();
  await layout.run();
  const settleMs = Math.round(performance.now() - t0);

  _prevPositions = new Map();
  for (const d of descendants) {
    _prevPositions.set(d.data.path, { x: d.x, y: d.y });
  }

  state.layoutRoot = root;
  saveExpandedPathsToStorage();
  renderLayout(root, { animate: !_firstRender });
  renderCrossLinks();

  // Re-apply zoom-coupled sizing after the transition starts so the
  // translate(x,y) written by the transition gets a scale component too.
  // Without this, ancestors snap back to natural size on every expand/collapse
  // until the next zoom event. Runs on the transition-end frame and again
  // after animation completes for safety.
  const currentK = svg ? d3.zoomTransform(svg.node()).k : 1;
  requestAnimationFrame(() => {
    applyZoomCoupledSizing(currentK);
    applyLODInteractivity(currentK);
  });
  setTimeout(() => {
    const k = svg ? d3.zoomTransform(svg.node()).k : 1;
    applyZoomCoupledSizing(k);
    applyLODInteractivity(k);
  }, ANIM_DURATION + 40);

  if (_firstRender) {
    _firstRender = false;
    requestAnimationFrame(() => {
      if (!_zoomRestoredFromStorage) fitToView();
      requestAnimationFrame(() => { window.SW_READY = true; });
    });
  }

  const statsEl = document.getElementById("stats-text");
  if (statsEl && statsEl.dataset) statsEl.title = `settled in ${settleMs}ms · ${descendants.length} nodes`;
}

// ── Rendering ─────────────────────────────────────────────────────────
function renderLayout(root, { animate = true } = {}) {
  const descendants = root.descendants();
  const links = root.links();
  const duration = animate ? ANIM_DURATION : 0;

  // DOM is about to change (node enter/exit). Mark the z-order sort as dirty
  // so the next applyZoomCoupledSizing pass actually runs the .sort().
  markZoomSortDirty();

  // ── Links ── draw before nodes so lines pass behind the buttons ──
  const linkSel = g.selectAll(".link")
    .data(links, d => d.target.data.path);

  const linkEnter = linkSel.enter()
    .insert("line", ".node")
    .attr("class", "link")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y)
    .attr("stroke", d => branchColor(d))
    .attr("stroke-width", 1.8)
    .attr("stroke-opacity", 0);

  linkEnter.transition().duration(duration).attr("stroke-opacity", 0.3);

  linkSel.transition().duration(duration)
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y)
    .attr("stroke", d => branchColor(d));

  linkSel.exit()
    .transition().duration(duration)
    .attr("stroke-opacity", 0)
    .remove();

  // ── Nodes ── each node is a <g> containing hit-area + button rect + label ──
  const nodeSel = g.selectAll(".node")
    .data(descendants, d => d.data.path);

  const nodeEnter = nodeSel.enter()
    .append("g")
    .attr("class", d => "node node-" + (d.depth === 0 ? "root" : d.data.type))
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("opacity", 0);

  // Hit area — invisible, wider than the visible button for easy clicks
  nodeEnter.append("rect")
    .attr("class", "hit-area")
    .attr("fill", "transparent")
    .attr("pointer-events", "all");

  // Button background
  nodeEnter.append("rect")
    .attr("class", "node-button");

  // Label
  nodeEnter.append("text")
    .attr("class", "node-label")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central");

  attachNodeHandlers(nodeEnter);

  const nodeUpdate = nodeEnter.merge(nodeSel);

  // Opacity + transform go in one transition. Scheduling them as two separate
  // default-namespace transitions cancels the first: the merged selection's
  // transform tween overwrites the enter's opacity tween, leaving new nodes
  // stuck at opacity:0 while their connector lines still render. That's the
  // "buttons aren't showing but lines are" bug — the nodes ARE in the DOM,
  // just invisible.
  nodeUpdate.transition().duration(duration)
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("opacity", 1);

  // Update button rects (size + heat styling) and labels on every pass —
  // labelScale or collapse state changes can resize buttons
  nodeUpdate.each(function(d) {
    const sel = d3.select(this);
    const a = anatomyFor(d);
    const vis = nodeVisual(d);
    const w = d.width;
    const h = d.height;
    const isSelected = state.selectedPath === d.data.path;

    const nodeScale = d._fontScale || 1;
    const scale = state.settings.labelScale;
    const wrap = wrapLabel(d, nodeLabel(d));
    const finalFontPx = a.fontPx * scale * nodeScale * wrap.fontMultiplier;
    const lineHeight = finalFontPx * 1.22;

    // Compute the rect height needed to hold the wrapped lines, then grow
    // the rect vertically (width stays at the layout-assigned value so it
    // still respects the wedge's arc). "Goes down" as Wisdom put it.
    const vPad = Math.max(6, finalFontPx * 0.4);
    const textHeight = wrap.lines.length * lineHeight;
    const renderH = Math.max(h, textHeight + vPad * 2);

    sel.select(".hit-area")
      .attr("x", -w / 2)
      .attr("y", -renderH / 2)
      .attr("width", w)
      .attr("height", renderH);

    sel.select(".node-button")
      .attr("x", -w / 2)
      .attr("y", -renderH / 2)
      .attr("width", w)
      .attr("height", renderH)
      .attr("rx", a.radius * nodeScale)
      .attr("ry", a.radius * nodeScale)
      .attr("fill", vis.fill)
      .attr("stroke", isSelected ? "var(--sw-purple)" : vis.stroke)
      .attr("stroke-width", isSelected ? 2 : vis.strokeWidth);

    // Stash the rendered height so hit-testing, connectors, and overlap
    // counters read the same value the user sees.
    d.height = renderH;

    const textSel = sel.select(".node-label");
    textSel.text(null);
    textSel.selectAll("tspan").remove();
    textSel
      .style("font-size", `${finalFontPx}px`)
      .style("font-weight", a.weight)
      .style("letter-spacing", a.tracking)
      .style("fill", "var(--sw-text)");
    wrap.lines.forEach((line, i) => {
      textSel.append("tspan")
        .attr("x", 0)
        .attr("dy", i === 0 ? -(wrap.lines.length - 1) * lineHeight / 2 : lineHeight)
        .text(line);
    });
  });

  nodeSel.exit()
    .transition().duration(duration)
    .attr("opacity", 0)
    .remove();

  if (state.searchQuery) applySearchHighlight();
}

// Tooltip rAF-batching state — see mouseenter/mouseleave handlers below.
let _pendingTooltipEvent = null;
let _tooltipRaf = null;

function flushTooltipShow() {
  _tooltipRaf = null;
  const p = _pendingTooltipEvent;
  _pendingTooltipEvent = null;
  if (!p) return;
  const tooltip = document.getElementById("tooltip");
  let text = p.path;
  if (p.meta) {
    const m = p.meta;
    if (m.phase) text += `\nPhase: ${m.phase}`;
    if (m.momentum) text += ` · Momentum: ${m.momentum}`;
    if (m.next_action) text += `\nNext: ${m.next_action}`;
    if (m.mtime) text += `\nEdited ${formatMtimeAge(m.mtime)}`;
    if (m.lines) text += `\n${m.lines} lines`;
    if (m.size) text += ` · ${(m.size / 1024).toFixed(0)} KB`;
  }
  tooltip.textContent = text;
  tooltip.style.display = "block";
  tooltip.style.left = (p.clientX + 12) + "px";
  tooltip.style.top = (p.clientY - 8) + "px";
}

function attachNodeHandlers(selection) {
  selection.on("click", async (event, d) => {
    event.stopPropagation();
    event.preventDefault();
    const clickedPath = d.data.path;
    if (d.data.type === "directory" && d.data._hasChildren) {
      if (event.metaKey || event.ctrlKey) {
        await advanceSubtreeOneTierAndRender(clickedPath);
        return;
      }
      if (event.shiftKey) {
        await retreatSubtreeOneTierAndRender(clickedPath);
        return;
      }
      const wasExpanded = state.expandedPaths.has(clickedPath);
      if (wasExpanded) state.expandedPaths.delete(clickedPath);
      else state.expandedPaths.add(clickedPath);
      await updateTree();
      if (wasExpanded) centerOnNode(clickedPath);
      else centerOnNodeWithChildren(clickedPath);
      updateTierButtons();
    } else if (d.data.type === "file") {
      openFile(d.data);
    }
  });

  selection.on("mouseenter", (event, d) => {
    // Coalesce rapid mouseenter events to one tooltip update per animation
    // frame. Sweeping the cursor across thousands of small nodes at far zoom
    // used to reflow the tooltip once per node-cross; now it reflows at most
    // once per frame with the latest hover.
    _pendingTooltipEvent = {
      path: d.data.path,
      meta: d.data.meta,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    if (_tooltipRaf === null) _tooltipRaf = requestAnimationFrame(flushTooltipShow);
  });

  selection.on("mouseleave", () => {
    _pendingTooltipEvent = null;
    if (_tooltipRaf !== null) {
      cancelAnimationFrame(_tooltipRaf);
      _tooltipRaf = null;
    }
    document.getElementById("tooltip").style.display = "none";
  });

  selection.on("contextmenu", (event, d) => {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById("tooltip").style.display = "none";
    showNodeContextMenu(event, d);
  });
}

// ── Node Context Menu ─────────────────────────────────────────────────
// Right-click on a node → custom menu instead of the browser default.
// Options are node-type-aware (directory vs file). Starter set mirrors the
// tier +/- primitives at the node level, per the 2026-04-19 build-queue
// bulk-expand entry. Expected to grow as Wisdom iterates.
function buildContextMenuItems(d) {
  const items = [];
  const isDir = d.data.type === "directory" && d.data._hasChildren;
  const isExpanded = state.expandedPaths.has(d.data.path);
  const isFile = d.data.type === "file";

  if (isDir) {
    items.push({
      label: "Expand one tier",
      hint: "⌘-click",
      action: () => advanceSubtreeOneTierAndRender(d.data.path),
    });
    items.push({
      label: "Collapse one tier",
      hint: "⇧-click",
      disabled: !isExpanded,
      action: () => retreatSubtreeOneTierAndRender(d.data.path),
    });
    items.push({
      label: "Expand fully",
      action: () => expandSubtreeFully(d.data.path),
    });
    items.push({
      label: "Collapse fully",
      disabled: !isExpanded,
      action: () => collapseSubtree(d.data.path),
    });
    items.push({ separator: true });
    items.push({
      label: "Search in this folder",
      action: () => enterFolderSearchScope(d.data.path),
    });
    items.push({
      label: "List view",
      action: () => openListView(d.data.path),
    });
    items.push({ separator: true });
  }

  if (isFile) {
    items.push({
      label: "Open in reader",
      action: () => openFile(d.data),
    });
    items.push({ separator: true });
  }

  items.push({
    label: "Copy path",
    action: async () => {
      try { await navigator.clipboard.writeText(d.data.path); } catch (_) {}
    },
  });

  return items;
}

function showNodeContextMenu(event, d) {
  const menu = document.getElementById("context-menu");
  if (!menu) return;
  const items = buildContextMenuItems(d);
  menu.innerHTML = "";

  const header = document.createElement("div");
  header.className = "sw-context-header";
  header.textContent = d.data.name;
  menu.appendChild(header);

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement("div");
      sep.className = "sw-context-sep";
      menu.appendChild(sep);
      continue;
    }
    const row = document.createElement("div");
    row.className = "sw-context-item";
    row.setAttribute("role", "menuitem");
    if (item.disabled) row.setAttribute("aria-disabled", "true");

    const label = document.createElement("span");
    label.className = "sw-context-label";
    label.textContent = item.label;
    row.appendChild(label);

    if (item.hint) {
      const hint = document.createElement("span");
      hint.className = "sw-context-hint";
      hint.textContent = item.hint;
      row.appendChild(hint);
    }

    if (!item.disabled) {
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        closeNodeContextMenu();
        try { item.action(); } catch (err) { console.error(err); }
      });
    }
    menu.appendChild(row);
  }

  // Pre-position offscreen to measure, then clamp into viewport.
  menu.style.left = "-9999px";
  menu.style.top = "-9999px";
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = event.clientX;
  let y = event.clientY;
  if (x + rect.width + 8 > vw) x = Math.max(8, vw - rect.width - 8);
  if (y + rect.height + 8 > vh) y = Math.max(8, vh - rect.height - 8);
  menu.style.left = x + "px";
  menu.style.top = y + "px";
}

function closeNodeContextMenu() {
  const menu = document.getElementById("context-menu");
  if (!menu) return;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
}

// Progressive left-click: each click drills one more tier into the subtree
// rooted at folderPath. Mirrors the global tier+ primitive scoped to a
// subtree. Returns true if anything changed. First click on a collapsed
// folder just expands it; each subsequent click catches the whole subtree
// up to `currentTier + 1`, so asymmetrically expanded branches get filled
// in as the tree drills down. No collapse on click — that's right-click.
function advanceSubtreeOneTier(folderPath) {
  const folder = findCanonicalNode(TREE, folderPath);
  if (!folder || folder.type !== "directory") return false;

  if (!state.expandedPaths.has(folderPath)) {
    state.expandedPaths.add(folderPath);
    return true;
  }

  let maxRelDepth = 0;
  (function walk(n, relDepth) {
    if (n.type !== "directory") return;
    if (state.expandedPaths.has(n.path) && relDepth > maxRelDepth) maxRelDepth = relDepth;
    if (n.children) for (const c of n.children) walk(c, relDepth + 1);
  })(folder, 0);

  const nextTier = maxRelDepth + 2;
  let added = 0;
  (function walk(n, relDepth) {
    if (n.type !== "directory") return;
    if (relDepth < nextTier && !state.expandedPaths.has(n.path)) {
      state.expandedPaths.add(n.path);
      added++;
    }
    if (n.children) for (const c of n.children) walk(c, relDepth + 1);
  })(folder, 0);

  return added > 0;
}

// Mirror of advanceSubtreeOneTier — undo one tier of expansion at a time.
// At the deepest expanded relDepth, drop every dir at that depth. When only
// the folder itself remains, one more call collapses the folder.
function retreatSubtreeOneTier(folderPath) {
  const folder = findCanonicalNode(TREE, folderPath);
  if (!folder || folder.type !== "directory") return false;
  if (!state.expandedPaths.has(folderPath)) return false;

  let maxRelDepth = 0;
  (function walk(n, relDepth) {
    if (n.type !== "directory") return;
    if (state.expandedPaths.has(n.path) && relDepth > maxRelDepth) maxRelDepth = relDepth;
    if (n.children) for (const c of n.children) walk(c, relDepth + 1);
  })(folder, 0);

  let removed = 0;
  (function walk(n, relDepth) {
    if (n.type !== "directory") return;
    if (relDepth === maxRelDepth && state.expandedPaths.has(n.path)) {
      state.expandedPaths.delete(n.path);
      removed++;
    }
    if (n.children) for (const c of n.children) walk(c, relDepth + 1);
  })(folder, 0);

  return removed > 0;
}

async function retreatSubtreeOneTierAndRender(folderPath) {
  const didChange = retreatSubtreeOneTier(folderPath);
  if (!didChange) return;
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
  updateTierButtons();
}

// List view: interactive folder-tree widget rendered in the reader panel.
// Folders expand/collapse in place (caret toggles local state held on the
// tab); file rows call openFile() so they land in a new reader tab. The
// list view tab persists — clicking a file doesn't close it, just opens
// alongside it. Similar feel to the VS Code sidebar.
function openListView(folderPath) {
  const folder = findCanonicalNode(TREE, folderPath);
  if (!folder) return;

  const listPath = `listview://${folderPath}`;
  const existing = state.openTabs.findIndex(t => t.path === listPath);
  const isNewSpawn = existing < 0;
  if (existing >= 0) {
    state.activeTabIndex = existing;
  } else {
    const synthetic = {
      name: `${folder.name} — list`,
      path: listPath,
      type: "file",
      content: null,
      meta: {
        synthetic: true,
        listView: true,
        folderPath: folderPath,
        listViewExpanded: new Set([folderPath]),
      },
    };
    state.openTabs.push(synthetic);
    state.activeTabIndex = state.openTabs.length - 1;
  }
  state.readerMinimized = false;
  renderTabs();
  // Spawn the reader narrower for list view — it doesn't need markdown-width.
  // Only on fresh spawn; if the user already has it open at some width, respect
  // that. The inline style persists until the user drags the divider.
  if (isNewSpawn) {
    const reader = document.getElementById("reader");
    if (reader) reader.style.width = "320px";
  }
  showActiveTab();
  renderOpenFiles();
}

function renderListView(tab, container) {
  const folder = findCanonicalNode(TREE, tab.meta.folderPath);
  if (!folder) {
    container.innerHTML = `<div class="sw-reader-empty">Folder not found</div>`;
    return;
  }
  // Preserve scroll across re-render — wiping innerHTML resets scrollTop,
  // so collapsing a deep folder used to silently teleport the view to the top,
  // making the collapse look like it didn't happen.
  const savedScroll = container.scrollTop;
  container.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "sw-listview";

  const expanded = tab.meta.listViewExpanded;

  const folderGlyph = `<svg class="sw-listview-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5C2 3.67 2.67 3 3.5 3H6l1.5 1.5H12.5C13.33 4.5 14 5.17 14 6v5.5C14 12.33 13.33 13 12.5 13h-9C2.67 13 2 12.33 2 11.5v-7z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
  const fileGlyph   = `<svg class="sw-listview-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5C4 2.22 4.22 2 4.5 2h5l2.5 2.5v8.5c0 .28-.22.5-.5.5h-7a.5.5 0 0 1-.5-.5v-10z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9.5 2v2.5H12" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
  const caretDown = `<svg class="sw-listview-caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5L5 7 8 3.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const caretRight = `<svg class="sw-listview-caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 2L7 5 3.5 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function renderRow(node, depth) {
    const row = document.createElement("div");
    row.className = "sw-listview-row " + (node.type === "directory" ? "is-dir" : "is-file");
    row.style.paddingLeft = `${depth * 12 + 6}px`;

    const heat = heatForMtime(node.meta && node.meta.mtime);

    if (node.type === "directory") {
      const isExp = expanded.has(node.path);
      row.innerHTML = `${isExp ? caretDown : caretRight}${folderGlyph}<span class="sw-listview-name">${escapeHtml(node.name)}</span>`;
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isExp) expanded.delete(node.path);
        else expanded.add(node.path);
        renderListView(tab, container);
      });
      shell.appendChild(row);
      if (isExp && node.children) {
        for (const c of node.children) renderRow(c, depth + 1);
      }
    } else {
      row.innerHTML = `<span class="sw-listview-caret-spacer"></span>${fileGlyph}<span class="sw-listview-name">${escapeHtml(node.name)}</span>`;
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        const flat = state.flatNodes.find(n => n.path === node.path);
        if (flat) openFile(flat);
      });
      shell.appendChild(row);
    }

    // Heat tint on the glyph — same color vocabulary as the canvas. SVG uses
    // stroke=currentColor, so setting .color on the glyph element cascades.
    if (heat) {
      const glyph = row.querySelector(".sw-listview-glyph");
      if (glyph) glyph.style.color = `var(--sw-heat-${heat})`;
    }
  }

  renderRow(folder, 0);
  container.appendChild(shell);
  container.scrollTop = savedScroll;
}

async function expandSubtreeFully(folderPath) {
  const folder = findCanonicalNode(TREE, folderPath);
  if (!folder) return;
  let added = 0;
  (function walk(n) {
    if (n.type === "directory" && (n.children && n.children.length) && !state.expandedPaths.has(n.path)) {
      state.expandedPaths.add(n.path);
      added++;
    }
    if (n.children) for (const c of n.children) walk(c);
  })(folder);
  if (!added) return;
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
  updateTierButtons();
}

async function advanceSubtreeOneTierAndRender(folderPath) {
  const didChange = advanceSubtreeOneTier(folderPath);
  if (!didChange) return;
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
  updateTierButtons();
}

async function expandSubtreeOneTier(folderPath) {
  const node = state.flatNodes.find(n => n.path === folderPath);
  if (!node) return;
  state.expandedPaths.add(folderPath);
  const canonical = findCanonicalNode(TREE, folderPath);
  if (canonical && canonical.children) {
    for (const c of canonical.children) {
      if (c.type === "directory") state.expandedPaths.add(c.path);
    }
  }
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  centerOnNodeWithChildren(folderPath);
  updateTierButtons();
}

async function collapseSubtree(folderPath) {
  const canonical = findCanonicalNode(TREE, folderPath);
  if (!canonical) return;
  (function walk(n) {
    if (n.type === "directory") state.expandedPaths.delete(n.path);
    if (n.children) for (const c of n.children) walk(c);
  })(canonical);
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
  updateTierButtons();
}

function findCanonicalNode(root, targetPath) {
  if (!root) return null;
  if (root.path === targetPath) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const hit = findCanonicalNode(c, targetPath);
    if (hit) return hit;
  }
  return null;
}

function branchColor(d) {
  const topAncestor = d.target.ancestors().slice(-2, -1)[0];
  if (!topAncestor) return "var(--sw-link-color)";
  const bc = (typeof CONFIG !== "undefined" && CONFIG.branchColors) || {};
  const name = topAncestor.data.name;
  if (bc[name]) return bc[name];
  // Loose fallback: opacity-muted neutral line color so the connector reads
  // as infrastructure, not a statement
  return "var(--sw-link-color)";
}

// ── File Reader / Tabs ────────────────────────────────────────────────
function openFile(data) {
  const existing = state.openTabs.findIndex(t => t.path === data.path);
  if (existing >= 0) {
    state.activeTabIndex = existing;
  } else {
    // openTabs store the flatNodes entry (has content) rather than the
    // d3 visible-tree clone (content already copied but path is canonical)
    const flat = state.flatNodes.find(n => n.path === data.path) || data;
    state.openTabs.push(flat);
    state.activeTabIndex = state.openTabs.length - 1;
  }
  state.readerMinimized = false;

  renderTabs();
  showActiveTab();
  renderOpenFiles();

  // Reframe the canvas: after the reader animates open (~320ms), fit the
  // file + its parent into the panel that's left. Covers all call sites —
  // node click, tab click, dropdown row, search.
  setTimeout(() => centerOnFileWithParent(data.path), 340);
}

// Optimization A (2026-04-23): file content is no longer embedded in the
// canvas payload. Fetched on demand from /content?path=… and cached here so
// reopening a tab is free.
const _contentCache = new Map();

async function fetchFileContent(path) {
  if (_contentCache.has(path)) return _contentCache.get(path);
  try {
    const resp = await fetch(`/content?path=${encodeURIComponent(path)}`);
    if (!resp.ok) {
      _contentCache.set(path, null);
      return null;
    }
    const text = await resp.text();
    _contentCache.set(path, text);
    return text;
  } catch (e) {
    return null;
  }
}

async function showActiveTab() {
  const tab = state.openTabs[state.activeTabIndex];
  if (!tab) return;
  const reader = document.getElementById("reader");
  const filename = document.getElementById("reader-filename");
  const filepath = document.getElementById("reader-filepath");
  const content = document.getElementById("reader-content");

  reader.classList.add("open");
  filename.textContent = tab.name;
  filepath.textContent = tab.path;
  state.selectedPath = tab.path;

  refreshSelectedStyling();

  if (tab.meta && tab.meta.listView) {
    renderListView(tab, content);
    content.scrollTop = 0;
    return;
  }
  if (tab.meta && tab.meta.too_large) {
    const sizeKB = tab.meta.size ? (tab.meta.size / 1024).toFixed(0) : "?";
    content.innerHTML = `<div class="sw-reader-empty">File too large to embed (${sizeKB} KB)</div>`;
    return;
  }

  // Fetch on demand if we don't already have content for this tab.
  if (tab.content == null) {
    content.innerHTML = `<div class="sw-reader-empty">Loading…</div>`;
    const fetched = await fetchFileContent(tab.path);
    // Bail if user switched tabs while we were waiting.
    if (state.openTabs[state.activeTabIndex] !== tab) return;
    if (fetched == null) {
      content.innerHTML = `<div class="sw-reader-empty">Could not load content</div>`;
      return;
    }
    tab.content = fetched;
  }

  const kind = (tab.meta && tab.meta.kind) || "markdown";
  if (kind === "code") {
    renderCode(tab, content);
  } else {
    try {
      content.innerHTML = marked.parse(tab.content);
      wireMarkdownLinks(content, tab);
    } catch (e) {
      content.innerHTML = `<pre>${escapeHtml(tab.content)}</pre>`;
    }
  }
  content.scrollTop = 0;
}

function renderCode(tab, container) {
  const lang = (tab.meta && tab.meta.lang) || "";
  const pre = document.createElement("pre");
  pre.className = "sw-code";
  const code = document.createElement("code");
  if (lang) code.className = "language-" + lang;
  code.textContent = tab.content;
  pre.appendChild(code);
  container.innerHTML = "";
  container.appendChild(pre);
  if (typeof hljs !== "undefined") {
    try { hljs.highlightElement(code); } catch (e) { /* fall back to plain monospace */ }
  }
}

function refreshSelectedStyling() {
  if (!g) return;
  g.selectAll(".node .node-button").each(function(d) {
    const vis = nodeVisual(d);
    const isSelected = state.selectedPath === d.data.path;
    d3.select(this)
      .attr("stroke", isSelected ? "var(--sw-purple)" : vis.stroke)
      .attr("stroke-width", isSelected ? 2 : vis.strokeWidth);
  });
}

function minimizeReader() {
  const wasSelected = state.selectedPath;
  const reader = document.getElementById("reader");
  reader.classList.remove("open");
  // Clear any inline width (set by list-view spawn or divider drag) so the
  // reader actually collapses to 0. Without this, the inline width beats the
  // CSS closed-state and the reader just sits at whatever width it was.
  reader.style.width = "";
  state.selectedPath = null;
  state.readerMinimized = true;
  refreshSelectedStyling();
  renderOpenFiles();
  // Keep the current zoom scale — just re-center on the file you were
  // reading so it stays in view as the canvas widens into the reader's
  // old space. Full fitToView would zoom all the way out, which feels
  // like losing your place.
  if (wasSelected) {
    requestAnimationFrame(() => centerOnNode(wasSelected));
  }
}

function closeAllTabs() {
  const wasSelected = state.selectedPath;
  state.openTabs = [];
  state.activeTabIndex = -1;
  state.readerMinimized = false;
  document.getElementById("reader").classList.remove("open");
  state.selectedPath = null;
  renderTabs();
  renderOpenFiles();
  refreshSelectedStyling();
  if (wasSelected) {
    requestAnimationFrame(() => centerOnNode(wasSelected));
  }
}

function closeTab(index) {
  if (index < 0 || index >= state.openTabs.length) return;
  state.openTabs.splice(index, 1);
  if (state.openTabs.length === 0) return closeAllTabs();
  if (index < state.activeTabIndex) state.activeTabIndex--;
  else if (index === state.activeTabIndex) {
    state.activeTabIndex = Math.min(index, state.openTabs.length - 1);
  }
  renderTabs();
  if (!state.readerMinimized) showActiveTab();
  renderOpenFiles();
}

function activateTab(index) {
  if (index < 0 || index >= state.openTabs.length) return;
  const targetPath = state.openTabs[index].path;
  const wasMinimized = state.readerMinimized;
  state.activeTabIndex = index;
  state.readerMinimized = false;
  renderTabs();
  showActiveTab();
  renderOpenFiles();
  // Recenter the canvas on the just-activated file + its parent — same
  // behavior as clicking a file node. Delay so the reader's open
  // transition (if coming from minimized) lands before we measure.
  setTimeout(() => centerOnFileWithParent(targetPath), wasMinimized ? 340 : 0);
}

function renderTabs() {
  const strip = document.getElementById("tab-strip");
  strip.innerHTML = "";
  state.openTabs.forEach((tab, i) => {
    const el = document.createElement("button");
    el.className = "sw-tab" + (i === state.activeTabIndex ? " active" : "");
    el.title = tab.path;

    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = tab.name;
    el.appendChild(name);

    const x = document.createElement("button");
    x.className = "tab-x";
    x.textContent = "×";
    x.title = "Close tab";
    x.addEventListener("click", (e) => { e.stopPropagation(); closeTab(i); });
    el.appendChild(x);

    el.addEventListener("click", () => activateTab(i));
    strip.appendChild(el);
  });
}

// ── OPEN FILES dropdown (Figma 5b.6) ─────────────────────────
// Visible only when reader is minimized AND there's at least one open file.
// Each row: heat dot (by file's project phase) · filename · path subtitle · × close.
// Click row → restore reader with that tab active. Click × → close just that tab.
function renderOpenFiles() {
  const container = document.getElementById("open-files");
  const list = document.getElementById("open-files-list");
  if (!container || !list) return;

  const shouldShow = state.readerMinimized && state.openTabs.length > 0;
  container.classList.toggle("visible", shouldShow);
  if (!shouldShow) { list.innerHTML = ""; return; }

  list.innerHTML = "";
  state.openTabs.forEach((tab, i) => {
    const row = document.createElement("div");
    row.className = "sw-open-files-row";

    const heat = heatTokenForTab(tab);
    const heatDot = document.createElement("span");
    heatDot.className = "row-heat" + (heat ? " " + heat : "");
    row.appendChild(heatDot);

    const body = document.createElement("div");
    body.className = "row-body";

    const name = document.createElement("div");
    name.className = "row-name";
    name.textContent = tab.name;
    body.appendChild(name);

    const pathSub = document.createElement("div");
    pathSub.className = "row-path";
    pathSub.textContent = shortPath(tab.path);
    body.appendChild(pathSub);

    row.appendChild(body);

    const close = document.createElement("button");
    close.className = "row-close";
    close.setAttribute("aria-label", `Close ${tab.name}`);
    close.textContent = "×";
    close.addEventListener("click", (e) => { e.stopPropagation(); closeTab(i); });
    row.appendChild(close);

    row.addEventListener("click", () => activateTab(i));
    list.appendChild(row);
  });
}

// Heat token for a file row — same age→heat mapping as nodes. Uses the
// file's own mtime if known.
function heatTokenForTab(tab) {
  return heatForMtime(tab.meta && tab.meta.mtime);
}

// Shorten a long absolute path for the row subtitle — keeps the last 2 segments.
function shortPath(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 2) return path;
  return "…/" + parts.slice(-3, -1).join("/");
}

function restoreReader() {
  if (state.openTabs.length === 0) return;
  state.readerMinimized = false;
  if (state.activeTabIndex < 0) state.activeTabIndex = 0;
  renderTabs();
  showActiveTab();
  renderOpenFiles();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function wireMarkdownLinks(container, currentFile) {
  const currentDir = currentFile.path.substring(0, currentFile.path.lastIndexOf("/"));

  container.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href") || "";

    if (/^(https?|mailto|tel):/i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      return;
    }
    if (href.startsWith("#")) return;

    let resolved;
    if (href.startsWith("/")) resolved = href;
    else if (href.startsWith("~/")) {
      resolved = href.replace(/^~/, currentDir.split("/").slice(0, 3).join("/"));
    } else {
      resolved = resolvePath(currentDir, href);
    }

    const target = state.flatNodes.find(n => n.path === resolved);

    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (target && target.type === "file") {
        openFile(target);
      } else {
        const basename = resolved.split("/").pop();
        const fuzzy = state.flatNodes.find(n =>
          n.type === "file" && n.path.endsWith("/" + basename)
        );
        if (fuzzy) openFile(fuzzy);
        else {
          const note = document.createElement("span");
          note.style.cssText = "color: var(--sw-heat-cold); font-size: 11px; margin-left: 6px;";
          note.textContent = ` (not in canvas: ${basename})`;
          a.appendChild(note);
          setTimeout(() => note.remove(), 2000);
        }
      }
    });

    a.style.cursor = "pointer";
    if (target) a.title = `Open ${target.name}`;
  });
}

function resolvePath(base, rel) {
  const parts = (base + "/" + rel).split("/");
  const out = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return "/" + out.join("/");
}

// ── Search ────────────────────────────────────────────────────────────
// Two-stage: `input` events only update highlight on VISIBLE nodes (fast,
// no layout). `Enter` commits the search — expands ancestors of matches and
// re-runs the layout so off-screen matches become visible. This keeps
// typing responsive on a 5k-node canvas and gives the user control over
// when the expensive expand-all-matches happens.
function updateSearchHighlight(query) {
  state.searchQuery = query.toLowerCase().trim();
  if (!g) return;
  if (!state.searchQuery) {
    g.selectAll(".node").classed("dimmed", false).classed("highlighted", false);
    g.selectAll(".link").classed("dimmed", false);
    return;
  }
  applySearchHighlight();
}

async function commitSearch({ action = "expand" } = {}) {
  if (!state.searchQuery) return;
  const q = state.searchQuery;
  const matches = state.flatNodes.filter(n => {
    if (!matchesSearchScope(n.path)) return false;
    const nameMatch = n.name.toLowerCase().includes(q);
    const contentMatch = n.content && n.content.toLowerCase().includes(q);
    return nameMatch || contentMatch;
  });

  const before = state.expandedPaths.size;
  if (matches.length > 0) {
    if (action === "expandFull") {
      for (const m of matches) expandAncestors(m.path);
    } else if (action === "collapse") {
      // Progressive collapse: undo the deepest tier of path-to-match
      // expansion. Mirrors `expand` — each Shift+Enter peels one tier.
      const expanded = [];
      for (const m of matches) {
        const parts = m.path.split("/");
        for (let i = 1; i < parts.length - 1; i++) {
          const apath = parts.slice(0, i + 1).join("/");
          if (!apath) continue;
          const node = state.flatNodes.find(n => n.path === apath && n.type === "directory");
          if (node && state.expandedPaths.has(apath)) {
            expanded.push({ path: apath, depth: i });
          }
        }
      }
      if (expanded.length > 0) {
        const maxDepth = expanded.reduce((m, e) => e.depth > m ? e.depth : m, -Infinity);
        for (const e of expanded) {
          if (e.depth === maxDepth) state.expandedPaths.delete(e.path);
        }
      }
    } else {
      // action === "expand": one tier deeper, globally. Find every
      // unexpanded dir-ancestor across all matches, pick the shallowest
      // depth, and open every unexpanded ancestor at that depth.
      const unexpanded = [];
      for (const m of matches) {
        const parts = m.path.split("/");
        for (let i = 1; i < parts.length - 1; i++) {
          const apath = parts.slice(0, i + 1).join("/");
          if (!apath) continue;
          const node = state.flatNodes.find(n => n.path === apath && n.type === "directory");
          if (node && !state.expandedPaths.has(apath)) {
            unexpanded.push({ path: apath, depth: i });
          }
        }
      }
      if (unexpanded.length > 0) {
        const minDepth = unexpanded.reduce((m, u) => u.depth < m ? u.depth : m, Infinity);
        for (const u of unexpanded) {
          if (u.depth === minDepth) state.expandedPaths.add(u.path);
        }
      }
    }
  }

  const changed = state.expandedPaths.size !== before;
  if (changed) {
    _prevPositions = new Map();
    await updateTree({ isResettle: true });
  }
  // Always reframe on Enter: even when nothing new was expanded (matches
  // already visible, or no matches), the user pressed Enter expecting
  // feedback. Fit-to-view reliably shows that Enter registered.
  requestAnimationFrame(() => fitToView());
  if (changed) updateTierButtons();
}

function shallowestUnexpandedAncestor(filePath) {
  const parts = filePath.split("/");
  for (let i = 1; i < parts.length - 1; i++) {
    const ancestorPath = parts.slice(0, i + 1).join("/");
    if (!ancestorPath) continue;
    const node = state.flatNodes.find(n => n.path === ancestorPath && n.type === "directory");
    if (node && !state.expandedPaths.has(ancestorPath)) return ancestorPath;
  }
  return null;
}

// ── Search Scope (search within a folder) ─────────────────────────────
// Right-click a folder → "Search in this folder" sets state.searchScope to
// that folder's path. Subsequent searches only match descendants of the
// scoped folder. A chip in the search box shows the scope; clicking its X
// clears it. Decouples the scope from the search query, so changing one
// doesn't reset the other.
function matchesSearchScope(path) {
  if (!state.searchScope) return true;
  return path === state.searchScope || path.startsWith(state.searchScope + "/");
}

function enterFolderSearchScope(folderPath) {
  const node = state.flatNodes.find(n => n.path === folderPath);
  if (!node) return;
  state.searchScope = folderPath;
  renderSearchScope();
  const input = document.getElementById("search-input");
  if (input) {
    input.placeholder = `Search in ${node.name}`;
    input.focus();
    input.select();
    if (state.searchQuery) updateSearchHighlight(state.searchQuery);
  }
}

function clearSearchScope() {
  state.searchScope = null;
  renderSearchScope();
  const input = document.getElementById("search-input");
  if (input) {
    input.placeholder = "Search the canvas";
    if (state.searchQuery) updateSearchHighlight(state.searchQuery);
  }
}

function renderSearchScope() {
  const chip = document.getElementById("search-scope");
  const label = document.getElementById("search-scope-label");
  if (!chip || !label) return;
  if (state.searchScope) {
    const node = state.flatNodes.find(n => n.path === state.searchScope);
    label.textContent = node ? node.name : state.searchScope;
    chip.hidden = false;
  } else {
    label.textContent = "";
    chip.hidden = true;
  }
}

// ── Expand-All / Collapse-All ─────────────────────────────────────────
// "Show the whole ecosystem" — walks the full tree, expands every directory,
// triggers a full re-layout, and reframes the viewport so the whole spread
// fits. Toggles back to depth-1 on a second press.
async function toggleExpandAll() {
  const allDirCount = state.flatNodes.filter(n => n.type === "directory").length;
  const isFullyExpanded = state.expandedPaths.size >= allDirCount - 1;
  const btn = document.getElementById("expand-all-btn");
  if (isFullyExpanded) {
    state.expandedPaths = new Set();
    setInitialExpanded(TREE, 0, INITIAL_EXPAND_DEPTH);
    state.maxTierExpanded = INITIAL_EXPAND_DEPTH;
    if (btn) btn.classList.remove("active");
  } else {
    for (const n of state.flatNodes) {
      if (n.type === "directory") state.expandedPaths.add(n.path);
    }
    state.maxTierExpanded = TREE_MAX_DIR_DEPTH;
    if (btn) btn.classList.add("active");
  }
  // _prevPositions is keyed on path, so we clear it — expanding from 4 to 5000
  // nodes with stale positions leaves most nodes pinned at the polar seeds of
  // the previous smaller tree, which looks wrong during settle.
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
  updateTierButtons();
}

// ── Tier Controls ─────────────────────────────────────────────────────
// Plus/minus pair that reveal or hide one whole depth-tier at a time.
// Build-queue 2026-04-18: a primitive for "show the whole system at this
// level of detail" — distinct from click-to-expand's per-folder gesture.
// state.maxTierExpanded = N means every directory at depth < N is expanded.

let TREE_MAX_DIR_DEPTH = 0;

function computeTreeMaxDirDepth() {
  let max = 0;
  (function walk(node, depth) {
    if (!node || node.type !== "directory") return;
    if (depth > max) max = depth;
    if (node.children) for (const c of node.children) walk(c, depth + 1);
  })(TREE, 0);
  TREE_MAX_DIR_DEPTH = max + 1;  // +1 so plus works while any dir at depth == max still has children to reveal
}

function expandAllAtTier(tier) {
  (function walk(node, depth) {
    if (!node || node.type !== "directory") return;
    if (depth < tier) state.expandedPaths.add(node.path);
    if (node.children) for (const c of node.children) walk(c, depth + 1);
  })(TREE, 0);
}

function collapseAllAtTier(tier) {
  (function walk(node, depth) {
    if (!node || node.type !== "directory") return;
    if (depth >= tier) state.expandedPaths.delete(node.path);
    if (node.children) for (const c of node.children) walk(c, depth + 1);
  })(TREE, 0);
}

// Walk the tree once and return both the frontier (unexpanded dirs whose
// parent is expanded — the next tier down) and the deepest-expanded-dir set
// (the current deepest tier — what minus would remove). Derived from actual
// state each call, so it tracks manual click/menu expansions correctly.
function surveyTierState() {
  const frontier = []; // { path, depth }
  let maxExpandedDepth = -1;
  const expandedByDepth = new Map(); // depth → [paths]
  (function walk(node, depth) {
    if (!node || node.type !== "directory") return;
    const hasChildren = node.children && node.children.length > 0;
    if (state.expandedPaths.has(node.path)) {
      if (depth > maxExpandedDepth) maxExpandedDepth = depth;
      if (!expandedByDepth.has(depth)) expandedByDepth.set(depth, []);
      expandedByDepth.get(depth).push(node.path);
      if (hasChildren) for (const c of node.children) walk(c, depth + 1);
    } else if (hasChildren) {
      frontier.push({ path: node.path, depth });
    }
  })(TREE, 0);
  return { frontier, maxExpandedDepth, expandedByDepth };
}

async function revealNextTier() {
  const { frontier } = surveyTierState();
  if (frontier.length === 0) return;  // everything expanded
  const minDepth = frontier.reduce((m, f) => f.depth < m ? f.depth : m, Infinity);
  for (const f of frontier) {
    if (f.depth === minDepth) state.expandedPaths.add(f.path);
  }
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
  updateTierButtons();
}

async function hideDeepestTier() {
  const { maxExpandedDepth, expandedByDepth } = surveyTierState();
  if (maxExpandedDepth < 0) return;  // nothing expanded
  const paths = expandedByDepth.get(maxExpandedDepth) || [];
  for (const p of paths) state.expandedPaths.delete(p);
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
  updateTierButtons();
}

function updateTierButtons() {
  const plus = document.getElementById("tier-plus-btn");
  const minus = document.getElementById("tier-minus-btn");
  const { frontier, maxExpandedDepth } = surveyTierState();
  if (plus) plus.disabled = frontier.length === 0;
  if (minus) minus.disabled = maxExpandedDepth < 0;
}

function expandAncestors(filePath) {
  const parts = filePath.split("/");
  for (let i = 1; i < parts.length - 1; i++) {
    const ancestorPath = parts.slice(0, i + 1).join("/");
    const node = state.flatNodes.find(n => n.path === ancestorPath && n.type === "directory");
    if (node) state.expandedPaths.add(ancestorPath);
  }
}

function applySearchHighlight() {
  if (!state.searchQuery) return;
  const q = state.searchQuery;
  // Precompute the match set in one O(n) pass over flatNodes instead of doing
  // an O(n) .find() per visible node (which was O(n²) at scale). The DOM walk
  // then becomes O(n) Set lookups. classList.toggle avoids a d3.select wrapper
  // per node.
  const matchPaths = new Set();
  for (const n of state.flatNodes) {
    if (!matchesSearchScope(n.path)) continue;
    const nameMatch = n.name.toLowerCase().includes(q);
    const contentMatch = n.content && n.content.toLowerCase().includes(q);
    if (nameMatch || contentMatch) matchPaths.add(n.path);
  }
  g.selectAll(".node").each(function(d) {
    if (!d || !d.data) return;
    const hit = matchPaths.has(d.data.path);
    this.classList.toggle("highlighted", hit);
    this.classList.toggle("dimmed", !hit);
  });
  g.selectAll(".link").classed("dimmed", true);
}

// ── Divider Resize ────────────────────────────────────────────────────
function setupDivider() {
  const divider = document.getElementById("divider");
  const reader = document.getElementById("reader");
  let isResizing = false;
  // rAF coalescing: mousemove fires per pixel; we only need to write the new
  // width once per frame. Without this each move triggers a layout read
  // (clientWidth) + layout write (style.width) — guaranteed reflow per pixel.
  let resizeRaf = null;
  let pendingClientX = null;

  divider.addEventListener("mousedown", (e) => {
    isResizing = true;
    divider.classList.add("active");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    pendingClientX = e.clientX;
    if (resizeRaf !== null) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      if (!isResizing || pendingClientX === null) return;
      const containerWidth = document.querySelector(".sw-main").clientWidth;
      const newReaderWidth = containerWidth - pendingClientX;
      const clampedWidth = Math.max(280, Math.min(containerWidth * 0.7, newReaderWidth));
      reader.style.width = clampedWidth + "px";
      pendingClientX = null;
    });
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      divider.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      fitToView();
    }
  });
}

// ── Events ────────────────────────────────────────────────────────────
function setupEvents() {
  const searchInput = document.getElementById("search-input");
  const searchBox = document.querySelector(".sw-search-box");
  const searchClear = document.getElementById("search-clear");
  const syncClearVisibility = (value) => {
    if (searchBox) searchBox.classList.toggle("has-text", !!value);
  };
  searchInput.addEventListener("input", (e) => {
    syncClearVisibility(e.target.value);
    updateSearchHighlight(e.target.value);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateSearchHighlight(e.target.value);
      const action = e.shiftKey ? "collapse"
                   : e.metaKey  ? "expandFull"
                   : "expand";
      commitSearch({ action });
    }
  });
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      syncClearVisibility("");
      updateSearchHighlight("");
      searchInput.focus();
    });
  }
  const scopeClear = document.getElementById("search-scope-clear");
  if (scopeClear) scopeClear.addEventListener("click", clearSearchScope);

  document.getElementById("reader-close").addEventListener("click", minimizeReader);

  const goToCanvasBtn = document.getElementById("go-to-canvas");
  if (goToCanvasBtn) goToCanvasBtn.addEventListener("click", async () => {
    const tab = state.openTabs[state.activeTabIndex];
    if (!tab) return;
    const isListView = tab.meta && tab.meta.listView && tab.meta.folderPath;
    // Cluster = the parent folder (for file tabs) or the folder itself
    // (for list-view tabs). We always frame a FOLDER + its children.
    let clusterFolderPath;
    if (isListView) {
      clusterFolderPath = tab.meta.folderPath;
    } else {
      const lastSlash = tab.path.lastIndexOf("/");
      clusterFolderPath = lastSlash > 0 ? tab.path.substring(0, lastSlash) : tab.path;
    }
    // Expand ancestors of the cluster folder, then the folder itself so its
    // children become part of the layout (the "cluster" that gets framed).
    const before = state.expandedPaths.size;
    expandAncestors(clusterFolderPath);
    const folderNode = state.flatNodes.find(n => n.path === clusterFolderPath && n.type === "directory");
    if (folderNode) state.expandedPaths.add(clusterFolderPath);
    if (state.expandedPaths.size !== before) {
      _prevPositions = new Map();
      await updateTree({ isResettle: true });
    }
    zoomToCluster(clusterFolderPath, { includeChildren: true });
    updateTierButtons();
  });

  document.getElementById("copy-path").addEventListener("click", () => {
    const tab = state.openTabs[state.activeTabIndex];
    if (!tab) return;
    const btn = document.getElementById("copy-path");
    navigator.clipboard.writeText(tab.path).then(() => {
      btn.classList.add("copied");
      const orig = btn.textContent;
      btn.textContent = "✓";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = orig;
      }, 1100);
    }).catch(() => {});
  });

  document.getElementById("canvas").addEventListener("click", (e) => {
    const isNode = e.target.closest(".node");
    const isCrossLink = e.target.closest(".cross-link");
    if (!isNode && !isCrossLink) {
      clearCrossLinkIsolation();
      if (document.getElementById("reader").classList.contains("open")) {
        minimizeReader();
      }
    }
  });

  // Dismiss the node context menu on any left-click / scroll outside it,
  // or on a subsequent right-click anywhere (nodes re-open it themselves).
  document.addEventListener("mousedown", (e) => {
    const menu = document.getElementById("context-menu");
    if (!menu || !menu.classList.contains("open")) return;
    if (!menu.contains(e.target)) closeNodeContextMenu();
  }, true);
  window.addEventListener("scroll", closeNodeContextMenu, true);
  window.addEventListener("resize", closeNodeContextMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const menu = document.getElementById("context-menu");
      if (menu && menu.classList.contains("open")) {
        closeNodeContextMenu();
        return;
      }
      if (state.isolatedCrossLink) {
        clearCrossLinkIsolation();
        return;
      }
      if (document.getElementById("reader").classList.contains("open")) {
        minimizeReader();
      } else {
        document.getElementById("search-input").value = "";
        const sb = document.querySelector(".sw-search-box");
        if (sb) sb.classList.remove("has-text");
        updateSearchHighlight("");
      }
      document.getElementById("settings-panel").classList.remove("open");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      document.getElementById("search-input").focus();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
      toggleExpandAll();
    }
  });

  const expandAllBtn = document.getElementById("expand-all-btn");
  if (expandAllBtn) expandAllBtn.addEventListener("click", toggleExpandAll);

  const crossLinksBtn = document.getElementById("cross-links-btn");
  if (crossLinksBtn) {
    crossLinksBtn.addEventListener("click", toggleCrossLinks);
    if (state.showCrossLinks) crossLinksBtn.classList.add("active");
  }

  const treeLinesBtn = document.getElementById("tree-lines-btn");
  if (treeLinesBtn) {
    treeLinesBtn.addEventListener("click", toggleTreeLines);
  }
  applyTreeLinesVisibility();

  const tierPlusBtn = document.getElementById("tier-plus-btn");
  if (tierPlusBtn) tierPlusBtn.addEventListener("click", revealNextTier);
  const tierMinusBtn = document.getElementById("tier-minus-btn");
  if (tierMinusBtn) tierMinusBtn.addEventListener("click", hideDeepestTier);
  updateTierButtons();

  setupDivider();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderTree(), 120);
  });
}

// ── Settings Panel ────────────────────────────────────────────────────
const PANEL_FIELDS = ["ringSpacing", "leafArc", "hitRadius", "labelScale"];

function setupSettingsPanel() {
  const btn = document.getElementById("settings-btn");
  const panel = document.getElementById("settings-panel");

  btn.addEventListener("click", () => panel.classList.toggle("open"));

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove("open");
  });

  for (const key of PANEL_FIELDS) {
    const input = document.getElementById(`set-${key}`);
    const valEl = document.getElementById(`set-${key}-val`);
    if (!input || !valEl) continue;
    input.value = state.settings[key];
    valEl.textContent = formatSettingValue(key, state.settings[key]);

    input.addEventListener("input", () => {
      state.settings[key] = parseFloat(input.value);
      valEl.textContent = formatSettingValue(key, state.settings[key]);
      saveSettings();
      updateTree({ isResettle: true });
    });
  }

  const resetBtn = document.getElementById("set-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.settings = { ...SETTINGS_DEFAULTS };
      saveSettings();
      for (const key of PANEL_FIELDS) {
        const input = document.getElementById(`set-${key}`);
        const valEl = document.getElementById(`set-${key}-val`);
        if (!input) continue;
        input.value = state.settings[key];
        valEl.textContent = formatSettingValue(key, state.settings[key]);
      }
      _firstRender = true;
      _prevPositions = new Map();
      renderTree();
    });
  }
}

function formatSettingValue(key, val) {
  if (key === "ringSpacing" || key === "leafArc" || key === "hitRadius") {
    return `${Math.round(val)}px`;
  }
  if (key === "labelScale") return val.toFixed(2) + "×";
  return String(val);
}

// ── Live Reload ───────────────────────────────────────────────────────
let liveReloadHash = null;

function startLivePolling() {
  const dot = document.getElementById("live-dot");
  if (dot && !dot.dataset.wired) {
    dot.dataset.wired = "1";
    dot.style.cursor = "pointer";
    dot.addEventListener("click", () => {
      if (dot.classList.contains("stale")) location.reload();
    });
  }

  async function poll() {
    try {
      const res = await fetch("__snapshot.json?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("no live server");
      const data = await res.json();

      if (liveReloadHash === null) {
        liveReloadHash = data.hash;
        dot.classList.add("live");
        dot.classList.remove("stale");
        dot.title = `Live · last regen ${new Date(data.generated_at * 1000).toLocaleTimeString()}`;
      } else if (data.hash !== liveReloadHash) {
        // Don't auto-reload — blacking out the screen every few seconds is
        // worse than a stale page. Show a visible indicator instead and
        // let the user click to reload when they're ready.
        dot.classList.remove("live");
        dot.classList.add("stale");
        dot.title = "New data available — click to reload";
      }
    } catch (err) {
      dot.classList.remove("live", "stale", "refreshing");
      dot.title = "Live updates not connected (run watch-server.py)";
    }
  }

  poll();
  setInterval(poll, 2000);
}

// ── Boot ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);

// Verification hook: ?demo=files opens N files and minimizes the reader so
// the OPEN FILES dropdown can be screenshot-verified headlessly. Remove if
// noisy in production — adds no cost unless the URL flag is present.
(function() {
  // Read demo flag from ?query, #hash (so it survives a watch-server that
  // doesn't route query strings), or a data-demo attribute on <body>.
  const params = new URLSearchParams(location.search || location.hash.replace(/^#/, "?"));
  const demo = params.get("demo") || (document.body && document.body.dataset.demo);
  if (!demo) return;
  const waitReady = setInterval(() => {
    if (!window.SW_READY) return;
    clearInterval(waitReady);
    if (demo === "files") {
      const n = parseInt(params.get("n") || "3", 10);
      const files = state.flatNodes.filter(n => n.type === "file").slice(0, n);
      for (const f of files) {
        if (!state.openTabs.some(t => t.path === f.path)) state.openTabs.push(f);
      }
      state.activeTabIndex = state.openTabs.length - 1;
      state.readerMinimized = true;
      document.getElementById("reader").classList.remove("open");
      renderTabs();
      renderOpenFiles();
      window.SW_DEMO_READY = true;
    } else if (demo === "expandAll") {
      toggleExpandAll().then(() => {
        // Count overlaps on the full ecosystem too
        const pts = state.layoutRoot.descendants().map(d => ({
          x: d.x, y: d.y, w: d.width, h: d.height
        }));
        let overlaps = 0;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const a = pts[i], b = pts[j];
            const ox = (a.w + b.w) / 2 - Math.abs(b.x - a.x);
            const oy = (a.h + b.h) / 2 - Math.abs(b.y - a.y);
            if (ox > 0 && oy > 0) overlaps++;
          }
        }
        document.body.setAttribute(
          "data-overlap",
          JSON.stringify({ nodes: pts.length, overlaps })
        );
        setTimeout(() => { window.SW_DEMO_READY = true; }, 500);
      });
    } else if (demo === "clickFile") {
      const firstFile = state.flatNodes.find(n => n.type === "file" && n.content);
      if (firstFile) openFile(firstFile);
      // openFile is synchronous but centerOnNode schedules a 320ms transition
      setTimeout(() => { window.SW_DEMO_READY = true; }, 500);
    } else if (demo === "clickDir") {
      // Click a named directory. After the re-settle, verify that the node's
      // final position is close to the visible canvas panel center — that's
      // the feel Wisdom asked for: "click PS Dance → PS Dance at panel center".
      const branchName = params.get("name") || "Playful Sincerity";
      const target = state.flatNodes.find(n => n.name === branchName && n.type === "directory");
      if (!target) { window.SW_DEMO_READY = true; return; }
      state.expandedPaths.add(target.path);
      updateTree({ isResettle: true }).then(() => {
        centerOnNode(target.path);
        setTimeout(() => { window.SW_DEMO_READY = true; }, 500);
      });
    } else if (demo === "expandBranch") {
      // Expand one top-level branch + all its direct sub-branches so we can
      // verify overlap handling at medium density (a few hundred nodes).
      const branchName = params.get("name") || "Playful Sincerity";
      const topBranch = state.flatNodes.find(
        n => n.name === branchName && n.type === "directory"
      );
      if (topBranch) {
        state.expandedPaths.add(topBranch.path);
        for (const n of state.flatNodes) {
          if (n.type === "directory" && n.path.startsWith(topBranch.path + "/")) {
            state.expandedPaths.add(n.path);
          }
        }
        _prevPositions = new Map();
        updateTree({ isResettle: true }).then(() => {
          requestAnimationFrame(() => {
            fitToView();
            // Count post-settle overlaps so we have a concrete metric, not
            // just a visual vibe. Any rectangle pair with both x and y
            // overlap (accounting for padding) counts as a real overlap.
            const pts = [];
            state.layoutRoot.descendants().forEach(d => {
              pts.push({ x: d.x, y: d.y, w: d.width, h: d.height, name: d.data.name });
            });
            let overlaps = 0, worst = 0, worstPair = null;
            for (let i = 0; i < pts.length; i++) {
              for (let j = i + 1; j < pts.length; j++) {
                const a = pts[i], b = pts[j];
                const ox = (a.w + b.w) / 2 - Math.abs(b.x - a.x);
                const oy = (a.h + b.h) / 2 - Math.abs(b.y - a.y);
                if (ox > 0 && oy > 0) {
                  overlaps++;
                  const area = ox * oy;
                  if (area > worst) { worst = area; worstPair = [a.name, b.name]; }
                }
              }
            }
            document.body.setAttribute(
              "data-overlap",
              JSON.stringify({ nodes: pts.length, overlaps, worst: Math.round(worst), worstPair })
            );
            setTimeout(() => { window.SW_DEMO_READY = true; }, 400);
          });
        });
      } else {
        window.SW_DEMO_READY = true;
      }
    }
  }, 50);
})();

// ── Physics Slider Panel ──────────────────────────────────────────────
// Live-tweakable physics. Toggle with the ⚙ button (bottom-right).
// Drag a slider → debounced re-layout → watch the tree settle.
(function initPhysicsPanel() {
  const KNOBS = [
    { key: "linkPad",         label: "Link distance",   min: 4,     max: 120,  step: 1,    fmt: v => v.toFixed(0) },
    { key: "linkStrength",    label: "Link strength",   min: 0.1,   max: 3,    step: 0.05, fmt: v => v.toFixed(2) },
    { key: "chargeBase",      label: "Charge (repel)",  min: -300,  max: 0,    step: 5,    fmt: v => v.toFixed(0) },
    { key: "bubbleStrength",  label: "Bubble strength", min: 0,     max: 0.5,  step: 0.01, fmt: v => v.toFixed(2) },
    { key: "bubbleGap",       label: "Bubble gap",      min: -20,   max: 60,   step: 1,    fmt: v => v.toFixed(0) },
    { key: "pinStrength",     label: "Freeze old nodes", min: 0,    max: 1,    step: 0.05, fmt: v => v >= 0.9 ? "hard" : v === 0 ? "off" : v.toFixed(2) },
  ];

  const css = `
    #sw-physics-toggle {
      position: fixed; right: 14px; bottom: 14px; z-index: 60;
      background: rgba(20,22,28,0.9); color: #e6e9ef;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 999px; padding: 6px 12px;
      font: 12px -apple-system, system-ui, sans-serif;
      cursor: pointer; backdrop-filter: blur(6px);
    }
    #sw-physics-toggle:hover { border-color: rgba(255,255,255,0.35); }
    #sw-physics-panel {
      position: fixed; right: 14px; bottom: 56px; z-index: 60;
      min-width: 260px; padding: 12px 14px 10px 14px;
      background: rgba(20,22,28,0.94); color: #e6e9ef;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      font: 12px -apple-system, system-ui, sans-serif;
      backdrop-filter: blur(8px);
      display: none;
    }
    #sw-physics-panel.open { display: block; }
    #sw-physics-panel h4 {
      margin: 0 0 8px 0; font-size: 11px; font-weight: 600;
      color: #8a93a6; text-transform: uppercase; letter-spacing: 0.08em;
    }
    .sw-slider { margin: 7px 0; }
    .sw-slider-row { display: flex; justify-content: space-between; font-size: 11px; color: #c6cad4; margin-bottom: 3px; }
    .sw-slider-val { color: #7aa2f7; font-variant-numeric: tabular-nums; }
    .sw-slider input[type=range] { width: 100%; accent-color: #7aa2f7; }
    #sw-physics-reset, #sw-physics-resettle {
      margin-top: 6px; width: 100%;
      background: transparent; color: #8a93a6;
      border: 1px solid rgba(255,255,255,0.12); border-radius: 6px;
      padding: 5px; font: 11px -apple-system, system-ui, sans-serif;
      cursor: pointer;
    }
    #sw-physics-reset:hover, #sw-physics-resettle:hover { color: #e6e9ef; border-color: rgba(255,255,255,0.35); }
    #sw-physics-hint { color: #606672; font-size: 10px; margin-top: 8px; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const toggle = document.createElement("button");
  toggle.id = "sw-physics-toggle";
  toggle.textContent = "⚙ physics";
  document.body.appendChild(toggle);

  const panel = document.createElement("div");
  panel.id = "sw-physics-panel";
  let html = "<h4>Layout physics</h4>";
  for (const k of KNOBS) {
    const cur = window.SW_PHYSICS[k.key];
    html += `<div class="sw-slider">
      <div class="sw-slider-row"><span>${k.label}</span><span class="sw-slider-val" data-val="${k.key}">${k.fmt(cur)}</span></div>
      <input type="range" min="${k.min}" max="${k.max}" step="${k.step}" value="${cur}" data-knob="${k.key}">
    </div>`;
  }
  html += `<button id="sw-physics-resettle">re-settle (fresh seed)</button>
    <button id="sw-physics-reset">reset to defaults</button>
    <div id="sw-physics-hint">Slider drag → 200ms debounce → relayout from fresh seed.</div>`;
  panel.innerHTML = html;
  document.body.appendChild(panel);

  toggle.addEventListener("click", () => panel.classList.toggle("open"));

  let debounceTimer = null;
  function scheduleRelayout() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (typeof updateTree === "function") updateTree({ isResettle: true });
    }, 200);
  }

  panel.querySelectorAll("input[type=range]").forEach(input => {
    input.addEventListener("input", (e) => {
      const key = e.target.dataset.knob;
      const val = parseFloat(e.target.value);
      window.SW_PHYSICS[key] = val;
      const knob = KNOBS.find(k => k.key === key);
      const disp = panel.querySelector(`[data-val="${key}"]`);
      if (disp && knob) disp.textContent = knob.fmt(val);
      scheduleRelayout();
    });
  });

  document.getElementById("sw-physics-resettle").addEventListener("click", () => {
    if (typeof updateTree === "function") updateTree({ isResettle: true });
  });

  document.getElementById("sw-physics-reset").addEventListener("click", () => {
    Object.assign(window.SW_PHYSICS, SW_PHYSICS_DEFAULTS);
    panel.querySelectorAll("input[type=range]").forEach(input => {
      const key = input.dataset.knob;
      const v = window.SW_PHYSICS[key];
      input.value = v;
      const knob = KNOBS.find(k => k.key === key);
      const disp = panel.querySelector(`[data-val="${key}"]`);
      if (disp && knob) disp.textContent = knob.fmt(v);
    });
    scheduleRelayout();
  });
})();

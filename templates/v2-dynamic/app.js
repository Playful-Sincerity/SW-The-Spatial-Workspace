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
  settings: loadSettings(),
  openTabs: [],
  activeTabIndex: -1,
  readerMinimized: false,
  layoutRoot: null,  // latest d3.hierarchy root (post-settle), for re-seed on expand
};

// ── Constants ─────────────────────────────────────────────────────────
// INITIAL_EXPAND_DEPTH = 1 per Phase 2 decision ("just the root"): root is
// expanded (its immediate children are rendered as siblings), but those
// children stay collapsed so the cold-open screen is deliberately quiet.
const INITIAL_EXPAND_DEPTH = 1;
const ANIM_DURATION = 180;

// Phase (from project-status.yaml) → activity heat token. Phase describes
// project state; heat describes visual temperature. The mapping is ordinal:
// active work → hot, resting → cold.
const PHASE_TO_HEAT = {
  active: "hot",
  building: "hot",
  design: "warm",
  slow: "warm",
  concept: "cool",
  maintenance: "cool",
  paused: "cold",
  dormant: "cold",
};

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
  const phase = d.data.meta && d.data.meta.phase;
  const heat = phase ? PHASE_TO_HEAT[phase] : null;
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

// ── Layout Engine (Phase 3D — Clustered Outward Fan) ──────────────────
// Single global physics simulation over every currently-visible node.
// Parent-child = spring at a resting distance tuned by depth (bigger gap at
// shallow levels where labels are long); all-pairs collision prevents
// overlap; many-body charge keeps clusters loose. A custom outward-bias
// force pushes any child that would otherwise settle on the grandparent
// side of its parent, so the overall gesture reads as "fanning out from
// the center." A compound subtree-bubble force keeps sibling subtrees
// from interpenetrating. Positions persist across expand/collapse via
// _prevPositions seeding in updateTree, so the layout feels stable when
// nodes are added. Final pass: rect-collision via resolveOverlaps to
// clean up label-box corner overlaps that the circular collide can't catch.

// Physics knobs — live-tweakable via the ⚙ Physics panel or window.SW_PHYSICS.
window.SW_PHYSICS = window.SW_PHYSICS || {
  linkPad: 20,          // link-distance padding at depth 1; deeper scales down
  linkStrength: 1.2,    // how hard parent pulls child
  chargeBase: -60,      // charge at depth 1; root/deeper scale from this
  bubbleStrength: 0.08, // cap on subtree-territory push per tick
  bubbleGap: 3,         // extra spacing between sibling subtree territories
  pinStrength: 1.0      // freeze carried-over nodes on expand. 1=hard pin, 0=free-move
};
const SW_PHYSICS_DEFAULTS = Object.freeze({ ...window.SW_PHYSICS });

function createLayout({ baseSpacing = 180 } = {}) {
  let _nodes = [];
  let _links = [];
  let _root = null;
  const GAP = 8;

  function seed(nodes, links) {
    _nodes = nodes;
    _links = links;
    _root = nodes.find(d => d.depth === 0) || nodes[0];
  }

  async function run(options = {}) {
    if (!_root) return;
    const progressive = !!options.progressive;
    const onTier = options.onTier || null;

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

    // Assign _idx for resolveOverlaps and seed any unpositioned nodes.
    for (let i = 0; i < _nodes.length; i++) _nodes[i]._idx = i;

    // Anchor root at origin every run — prevents drift across expand cycles.
    _root.x = 0;
    _root.y = 0;

    // Seed: any node without a carried-over position gets placed. For the
    // progressive (tier-by-tier) path we seed every new node AT its parent's
    // location (with tiny jitter), so each tier starts clustered on the
    // parent and then physics spreads it outward when the tier activates —
    // producing a growth animation. For non-progressive (user-click), we
    // seed radially outward so the sim has a good starting arrangement.
    const nodesByDepth = _nodes.slice().sort((a, b) => a.depth - b.depth);
    for (const d of nodesByDepth) {
      if (d === _root) continue;
      if (d.x != null && d.y != null && isFinite(d.x) && isFinite(d.y)) continue;
      const p = d.parent;
      if (!p) continue;

      if (progressive) {
        // Cluster on parent with tiny jitter — physics spreads in its tier.
        d.x = (p.x || 0) + (Math.random() - 0.5) * 4;
        d.y = (p.y || 0) + (Math.random() - 0.5) * 4;
      } else {
        const gp = p.parent;
        let axis = 0;
        if (gp && isFinite(p.x) && isFinite(gp.x)) {
          axis = Math.atan2(p.y - gp.y, p.x - gp.x);
        }
        const siblings = p.children || [];
        const idx = Math.max(0, siblings.indexOf(d));
        const n = siblings.length;
        const span = gp ? Math.PI * 1.4 : 2 * Math.PI;
        const t = n === 1 ? 0.5 : idx / (n - 1);
        const angle = axis - span / 2 + t * span;
        const labelBuffer = p.depth === 0 ? 140 : p.depth === 1 ? 80 : 40;
        const halfP = Math.max(p.width, p.height) / 2;
        const halfD = Math.max(d.width, d.height) / 2;
        const r = halfP + halfD + labelBuffer + Math.sqrt(Math.max(1, n)) * 14;
        d.x = (p.x || 0) + Math.cos(angle) * r;
        d.y = (p.y || 0) + Math.sin(angle) * r;
      }
    }

    // Fix root during the sim so the canvas origin doesn't drift.
    _root.fx = _root.x;
    _root.fy = _root.y;

    const P = window.SW_PHYSICS;

    // Pin carried-over nodes. At pinStrength ≥ 0.9 we hard-pin (fx/fy) —
    // existing world stays literally fixed, new arrivals settle around it.
    // Below that, a soft spring pulls them toward their prior spot so they
    // can drift under pressure. pinStrength = 0 disables pinning entirely
    // (original free-flow behavior).
    //
    // DYNAMIC EXPANSE DIVERGENCE: the just-expanded node is NOT in the
    // carried/pinned set — it has a soft spring toward its prior position
    // (see justExpandedNode below) so it can drift outward when its new
    // subtree overlaps a pinned sibling's territory.
    const PIN_HARD = P.pinStrength >= 0.9;
    const pinnedNodes = [];
    let justExpandedNode = null;
    for (const d of _nodes) {
      if (d === _root) continue;
      if (d._justExpanded) {
        // Store prior position for the soft-spring pull; do NOT set fx/fy.
        d._pinX = d.x;
        d._pinY = d.y;
        justExpandedNode = d;
      } else if (d._carried) {
        d._pinX = d.x;
        d._pinY = d.y;
        if (PIN_HARD) {
          d.fx = d.x;
          d.fy = d.y;
        }
        pinnedNodes.push(d);
      } else {
        d._pinX = null;
        d._pinY = null;
      }
    }
    const linkDistance = (link) => {
      const s = link.source, t = link.target;
      // Base is P.linkPad at depth 1; depths scale around it.
      const pad = s.depth === 0 ? P.linkPad * 1.8 :
                  s.depth === 1 ? P.linkPad :
                  s.depth === 2 ? P.linkPad * 0.7 :
                                  P.linkPad * 0.5;
      return Math.max(s.width, s.height) / 2 + Math.max(t.width, t.height) / 2 + pad;
    };
    const chargeStrength = (d) => {
      // Pinned nodes emit no charge — they're position anchors via link +
      // collision barriers via collide. One-way repulsion on mobile new
      // children is what causes new clusters to fly far from frozen parents.
      if (d._carried && PIN_HARD) return 0;
      // P.chargeBase is charge at depth 1; other depths scale from it.
      if (d === _root) return P.chargeBase * 1.5;
      if (d.depth === 1) return P.chargeBase;
      if (d.depth === 2) return P.chargeBase * 0.625;
      return P.chargeBase * 0.3;
    };
    const collideRadius = (d) => Math.hypot(d.width, d.height) / 2 + 4;

    // Custom force: bias non-root nodes outward from their grandparent so
    // children never settle on the "wrong side" of their parent.
    function outwardBias(alpha) {
      for (const d of _nodes) {
        if (d === _root) continue;
        const p = d.parent;
        const gp = p && p.parent;
        if (!gp) continue;
        const ax = p.x - gp.x;
        const ay = p.y - gp.y;
        const aLen = Math.hypot(ax, ay);
        if (aLen < 1e-3) continue;
        const dx = d.x - p.x;
        const dy = d.y - p.y;
        const proj = (dx * ax + dy * ay) / aLen; // >0 means outward
        const targetProj = (Math.max(p.width, p.height) / 2 + Math.max(d.width, d.height) / 2);
        if (proj < targetProj) {
          const push = (targetProj - proj) * 0.12 * alpha;
          d.vx += (ax / aLen) * push;
          d.vy += (ay / aLen) * push;
        }
      }
    }

    // Custom force: SUBTREE-LEVEL collision ("bubble" force). Each parent +
    // its visible descendants form a territory (bounding circle). Sibling
    // subtrees that share a grandparent push each other apart as groups when
    // their territories overlap. Children internal to a subtree still flex
    // freely via the other forces, but the outer envelope never crosses a
    // sibling envelope — the bubble deforms but doesn't interpenetrate.
    //
    // Precomputed once per run: the bottom-up traversal order of _nodes.
    // Territories rebuild from positions on every tick (cheap for a few
    // hundred visible nodes).
    const sortedByDepth = _nodes.slice().sort((a, b) => b.depth - a.depth);

    function applySubtreeVelocity(node, vx, vy) {
      node.vx += vx;
      node.vy += vy;
      if (node.children) {
        for (const c of node.children) applySubtreeVelocity(c, vx, vy);
      }
    }

    // Direct position delta (not velocity) — used for asymmetric pairs where
    // one side is pinned. Velocity would accumulate across ticks into drift;
    // position correction resolves the overlap this tick, then the force
    // naturally stops because there's no more overlap.
    function applySubtreePosition(node, dx, dy) {
      if (node.fx == null) node.x += dx;
      if (node.fy == null) node.y += dy;
      if (node.children) {
        for (const c of node.children) applySubtreePosition(c, dx, dy);
      }
    }

    // Bubble force is a SOFT non-overlap nudge, not a wall. Strength scales
    // down with visible count. Allow mild overlap before pushing so sibling
    // subtrees can touch and deform — "close to each other but not crossing."
    const BUBBLE_STRENGTH = Math.min(P.bubbleStrength, 2 / Math.sqrt(Math.max(4, _nodes.length)));
    const BUBBLE_MAX_PUSH_PER_TICK = 8; // cap per-tick velocity delta (px)

    function subtreeBubble(alpha) {
      // Bottom-up: compute each node's territory {cx, cy, r}.
      const T = new Map();
      for (const n of sortedByDepth) {
        const ownR = Math.hypot(n.width, n.height) / 2;
        const kids = (n.children || []).map(c => T.get(c)).filter(Boolean);
        if (kids.length === 0) {
          T.set(n, { cx: n.x, cy: n.y, r: ownR + 4 });
          continue;
        }
        let cx = n.x, cy = n.y;
        for (const t of kids) { cx += t.cx; cy += t.cy; }
        cx /= kids.length + 1;
        cy /= kids.length + 1;
        let r = ownR + Math.hypot(n.x - cx, n.y - cy);
        for (const t of kids) {
          r = Math.max(r, Math.hypot(t.cx - cx, t.cy - cy) + t.r);
        }
        T.set(n, { cx, cy, r });
      }

      // Sibling-subtree push. Overlapping territories ⇒ both subtrees move
      // as rigid groups. Gap is tweakable via the physics panel.
      const gap = P.bubbleGap;
      for (const parent of _nodes) {
        const kids = parent.children || [];
        if (kids.length < 2) continue;
        for (let i = 0; i < kids.length; i++) {
          const ti = T.get(kids[i]);
          if (!ti) continue;
          for (let j = i + 1; j < kids.length; j++) {
            const tj = T.get(kids[j]);
            if (!tj) continue;
            const dx = tj.cx - ti.cx;
            const dy = tj.cy - ti.cy;
            const dist = Math.hypot(dx, dy);
            const overlap = (ti.r + tj.r + gap) - dist;
            if (overlap <= 0) continue;
            const nx = dist > 0 ? dx / dist : 1;
            const ny = dist > 0 ? dy / dist : 0;
            if (PIN_HARD) {
              const iJust = kids[i]._justExpanded;
              const jJust = kids[j]._justExpanded;
              if (iJust || jJust) {
                // Just-expanded pair: velocity drift on the just-expanded
                // side lets it nudge outward to resolve overlap with pinned
                // siblings. Pinned side gets no push (can't move via fx/fy).
                let push = overlap * BUBBLE_STRENGTH * alpha;
                if (push > BUBBLE_MAX_PUSH_PER_TICK) push = BUBBLE_MAX_PUSH_PER_TICK;
                if (iJust) applySubtreeVelocity(kids[i], -nx * push, -ny * push);
                if (jJust) applySubtreeVelocity(kids[j], nx * push, ny * push);
              } else {
                // Position correction: resolves overlap this tick without
                // velocity accumulation. Respects fx/fy so pinned descendants
                // stay put automatically.
                const step = Math.min(overlap, BUBBLE_MAX_PUSH_PER_TICK * 2) * 0.5;
                applySubtreePosition(kids[i], -nx * step, -ny * step);
                applySubtreePosition(kids[j], nx * step, ny * step);
              }
            } else {
              // Velocity-based symmetric push (no pinning active).
              let push = overlap * BUBBLE_STRENGTH * alpha;
              if (push > BUBBLE_MAX_PUSH_PER_TICK) push = BUBBLE_MAX_PUSH_PER_TICK;
              applySubtreeVelocity(kids[i], -nx * push, -ny * push);
              applySubtreeVelocity(kids[j], nx * push, ny * push);
            }
          }
        }
      }
    }

    // Soft pin spring: pulls each carried-over node back toward its prior
    // position. Runs for carried nodes when pinStrength is below the hard-
    // pin threshold (hard pin uses fx/fy instead). In dynamic expanse, the
    // just-expanded node ALWAYS gets a medium-strength spring — this keeps
    // it near its prior position unless bubble overlap pushes it outward,
    // at which point it resists like a damped spring.
    function pinSpring(alpha) {
      if (justExpandedNode) {
        // Weaker spring so bubble drift can win when overlap requires motion.
        // The just-expanded node still returns toward its prior position in
        // the absence of pressure, but doesn't fight the bubble push at
        // equilibrium.
        const kJust = 0.08;
        justExpandedNode.vx += (justExpandedNode._pinX - justExpandedNode.x) * kJust * alpha;
        justExpandedNode.vy += (justExpandedNode._pinY - justExpandedNode.y) * kJust * alpha;
      }
      if (PIN_HARD) return;
      const k = P.pinStrength * 2;
      if (k <= 0) return;
      for (const d of pinnedNodes) {
        d.vx += (d._pinX - d.x) * k * alpha;
        d.vy += (d._pinY - d.y) * k * alpha;
      }
    }

    // Center-of-mass pull: a very weak force pulling every non-root node
    // gently toward the origin so nothing escapes to the stratosphere when
    // many subtrees push against each other.
    function gentleCenter(alpha) {
      const k = 0.005 * alpha;
      for (const d of _nodes) {
        if (d === _root) continue;
        d.vx -= d.x * k;
        d.vy -= d.y * k;
      }
    }

    if (progressive) {
      // ── Tier-by-tier growth ─────────────────────────────────────────
      // Group nodes by depth. Start with just the root in the sim; each
      // tier, add the next depth's nodes and let physics settle. Each
      // tier joins an already-settled system, which prevents the pair-
      // force compounding that happens when everything is placed at once.
      // onTier callback lets updateTree render intermediate frames for
      // the growth animation.
      const byDepth = new Map();
      for (const n of _nodes) {
        if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
        byDepth.get(n.depth).push(n);
      }
      const depths = [...byDepth.keys()].sort((a, b) => a - b);
      const maxDepth = depths[depths.length - 1];

      let active = [...(byDepth.get(0) || [])];
      const sim = d3.forceSimulation(active)
        .force("link", d3.forceLink([]).id(d => d._idx).distance(linkDistance).strength(P.linkStrength))
        .force("collide", d3.forceCollide(collideRadius).strength(1).iterations(3))
        .force("charge", d3.forceManyBody().strength(chargeStrength).distanceMax(400))
        .force("outward", outwardBias)
        .force("bubble", subtreeBubble)
        .force("pin", pinSpring)
        .force("center", gentleCenter)
        .velocityDecay(0.55)
        .stop();

      for (let d = 1; d <= maxDepth; d++) {
        const tier = byDepth.get(d) || [];
        if (tier.length === 0) continue;
        active = active.concat(tier);
        const activeLinks = _links.filter(l => active.includes(l.source) && active.includes(l.target));
        sim.nodes(active);
        sim.force("link").links(activeLinks);
        sim.alpha(0.8).alphaDecay(0.08);
        const ticks = d === 1 ? 60 : 80;
        for (let i = 0; i < ticks; i++) sim.tick();
        if (onTier) await onTier(d, active);
      }

      // Final polish with everything together
      sim.alpha(0.3).alphaDecay(0.04);
      for (let i = 0; i < 120; i++) sim.tick();
    } else {
      // ── All-at-once sim (default path) ──────────────────────────────
      const sim = d3.forceSimulation(_nodes)
        .force("link", d3.forceLink(_links).distance(linkDistance).strength(P.linkStrength))
        .force("collide", d3.forceCollide(collideRadius).strength(1).iterations(3))
        .force("charge", d3.forceManyBody().strength(chargeStrength).distanceMax(400))
        .force("outward", outwardBias)
        .force("bubble", subtreeBubble)
        .force("pin", pinSpring)
        .force("center", gentleCenter)
        .alpha(1)
        .alphaDecay(0.04)
        .velocityDecay(0.6)
        .stop();

      for (let i = 0; i < 500; i++) sim.tick();
    }

    _root.fx = null;
    _root.fy = null;

    // Final rect-collision cleanup for label-box corners the circular
    // collide can't catch. resolveOverlaps respects fx/fy, so hard-pinned
    // carried nodes stay put through this pass too.
    resolveOverlaps(_nodes, GAP, 200);

    // Release hard-pinned carried nodes so the NEXT sim starts with them
    // free-to-move (they'll be re-pinned at the top of that run if they're
    // still carried-over).
    if (PIN_HARD) {
      for (const d of pinnedNodes) {
        d.fx = null;
        d.fy = null;
      }
    }
  }

  return { seed, run, measure: measureNode, tick: null };
}

// ── resolveOverlaps (Jacobi constraint solver) ──────────────────────
// After physics settle, resolve remaining overlaps. Unlike rectCollide
// (Gauss-Seidel: each push immediately changes positions for subsequent
// checks → oscillation), this accumulates ALL pushes per node, averages
// them, and applies them in one batch per pass. Converges reliably.
function resolveOverlaps(nodes, padding, maxPasses) {
  const n = nodes.length;
  if (n === 0) return;
  let maxW = 0, maxH = 0;
  for (const d of nodes) {
    if (d.width > maxW) maxW = d.width;
    if (d.height > maxH) maxH = d.height;
  }

  for (let pass = 0; pass < maxPasses; pass++) {
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    const ct = new Uint16Array(n);

    const tree = d3.quadtree().x(d => d.x).y(d => d.y).addAll(nodes);

    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      const cullX = a.width / 2 + maxW / 2 + padding;
      const cullY = a.height / 2 + maxH / 2 + padding;

      tree.visit((quad, x0, y0, x1, y1) => {
        if (!quad.length) {
          do {
            const b = quad.data;
            if (!b || b === a) continue;
            const ddx = b.x - a.x;
            const ddy = b.y - a.y;
            const ox = (a.width + b.width) / 2 + padding - Math.abs(ddx);
            const oy = (a.height + b.height) / 2 + padding - Math.abs(ddy);
            if (ox > 0 && oy > 0) {
              const j = b._idx;
              if (ox < oy) {
                const push = ox / 2 * (ddx >= 0 ? -1 : 1);
                dx[i] += push; dx[j] -= push;
              } else {
                const push = oy / 2 * (ddy >= 0 ? -1 : 1);
                dy[i] += push; dy[j] -= push;
              }
              ct[i]++; ct[j]++;
            }
          } while ((quad = quad.next));
        }
        return x0 > a.x + cullX || x1 < a.x - cullX ||
               y0 > a.y + cullY || y1 < a.y - cullY;
      });
    }

    let moved = false;
    for (let i = 0; i < n; i++) {
      if (ct[i] === 0) continue;
      if (!nodes[i].fx) { nodes[i].x += dx[i]; moved = true; }
      if (!nodes[i].fy) { nodes[i].y += dy[i]; moved = true; }
    }
    if (!moved) break;
  }
}

// ── hierarchicalCollision ─────────────────────────────────────────────
// Treat each expanded subtree as a membrane. Sibling subtrees can't
// overlap each other's bounding boxes. This prevents foreign connector
// lines from crossing through a cluster.
function hierarchicalCollision(root, padding, passes) {
  function computeBBoxes(node) {
    if (!node.children || !node.children.length) {
      node._bbox = { x: node.x, y: node.y, w: node.width, h: node.height };
      return;
    }
    for (const c of node.children) computeBBoxes(c);
    let minX = node.x - node.width / 2, maxX = node.x + node.width / 2;
    let minY = node.y - node.height / 2, maxY = node.y + node.height / 2;
    for (const c of node.children) {
      const b = c._bbox;
      minX = Math.min(minX, b.x - b.w / 2);
      maxX = Math.max(maxX, b.x + b.w / 2);
      minY = Math.min(minY, b.y - b.h / 2);
      maxY = Math.max(maxY, b.y + b.h / 2);
    }
    node._bbox = {
      x: (minX + maxX) / 2, y: (minY + maxY) / 2,
      w: maxX - minX, h: maxY - minY
    };
  }

  function moveSubtree(node, dx, dy) {
    if (node.fx == null) node.x += dx;
    if (node.fy == null) node.y += dy;
    if (node._bbox) { node._bbox.x += dx; node._bbox.y += dy; }
    if (node.children) {
      for (const c of node.children) moveSubtree(c, dx, dy);
    }
  }

  for (let pass = 0; pass < passes; pass++) {
    computeBBoxes(root);
    let anyMoved = false;

    root.each(d => {
      if (!d.children || d.children.length < 2) return;
      const kids = d.children;
      for (let i = 0; i < kids.length; i++) {
        for (let j = i + 1; j < kids.length; j++) {
          const a = kids[i]._bbox, b = kids[j]._bbox;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const ox = (a.w + b.w) / 2 + padding - Math.abs(dx);
          const oy = (a.h + b.h) / 2 + padding - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            anyMoved = true;
            if (ox < oy) {
              const push = ox / 2 * (dx >= 0 ? -1 : 1);
              moveSubtree(kids[i], push, 0);
              moveSubtree(kids[j], -push, 0);
            } else {
              const push = oy / 2 * (dy >= 0 ? -1 : 1);
              moveSubtree(kids[i], 0, push);
              moveSubtree(kids[j], 0, -push);
            }
          }
        }
      }
    });

    if (!anyMoved) break;
  }
}

// ── rectCollide ───────────────────────────────────────────────────────
// Rectangle-collision force for d3-force. Quadtree-accelerated O(n log n).
// Cull region includes the largest node's half-extent so wide neighbours
// in adjacent quadtree cells are still checked.
function rectCollide({ padding = 4, strength = 1 } = {}) {
  let nodes = [];
  let maxOtherW = 0;
  let maxOtherH = 0;

  function force(alpha) {
    const n = nodes.length;
    if (n === 0) return;

    const tree = d3.quadtree()
      .x(d => d.x)
      .y(d => d.y)
      .addAll(nodes);

    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      const aHalfW = a.width / 2 + padding;
      const aHalfH = a.height / 2 + padding;
      const cullX = aHalfW + maxOtherW / 2;
      const cullY = aHalfH + maxOtherH / 2;

      tree.visit((quad, x0, y0, x1, y1) => {
        if (!quad.length) {
          do {
            const b = quad.data;
            if (!b || b === a) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
            const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);
            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                const push = (overlapX / 2) * strength * alpha * (dx >= 0 ? -1 : 1);
                if (!a.fx) a.x += push;
                if (!b.fx) b.x -= push;
              } else {
                const push = (overlapY / 2) * strength * alpha * (dy >= 0 ? -1 : 1);
                if (!a.fy) a.y += push;
                if (!b.fy) b.y -= push;
              }
            }
          } while ((quad = quad.next));
        }
        return x0 > a.x + cullX || x1 < a.x - cullX ||
               y0 > a.y + cullY || y1 < a.y - cullY;
      });
    }
  }

  force.initialize = (_nodes) => {
    nodes = _nodes;
    maxOtherW = 0;
    maxOtherH = 0;
    for (const n of nodes) {
      if (n.width > maxOtherW) maxOtherW = n.width;
      if (n.height > maxOtherH) maxOtherH = n.height;
    }
  };
  return force;
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
    const titleEl = document.getElementById("sw-title");
    const subEl = document.getElementById("sw-subtitle");
    if (titleEl) titleEl.textContent = CONFIG.label;
    if (subEl) subEl.textContent = CONFIG.label;
    document.title = CONFIG.label + " — Spatial Workspace";
  }

  flattenTree(TREE, "");
  setInitialExpanded(TREE, 0, INITIAL_EXPAND_DEPTH);

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
  state.flatNodes.push({
    name: node.name,
    path: nodePath,
    type: node.type,
    content: node.content || null,
    meta: node.meta || {},
  });
  if (node.children) {
    for (const child of node.children) flattenTree(child, nodePath);
  }
}

function setInitialExpanded(node, depth, maxDepth) {
  if (depth < maxDepth && node.type === "directory") {
    state.expandedPaths.add(node.path);
    if (node.children) {
      for (const child of node.children) {
        setInitialExpanded(child, depth + 1, maxDepth);
      }
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

  zoomBehavior = d3.zoom().scaleExtent([0.01, 8]);
  setupTrackpadGestures(svg, zoomBehavior);
  zoomBehavior.on("zoom", (event) => {
    outerG.attr("transform", event.transform);
  });
  svg.call(zoomBehavior);

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
    const bbox = g.node().getBBox();
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
    svg.transition().duration(320).call(zoomBehavior.transform, transform);
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

// ── Layout Orchestration ──────────────────────────────────────────────
let _prevPositions = new Map();  // path → {x, y} — lets expand/collapse preserve placement
let _firstRender = true;

async function updateTree({ isResettle = false, justExpanded = null } = {}) {
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
    d._justExpanded = (justExpanded != null && d.data.path === justExpanded);
    if (isResettle) {
      d.x = null;
      d.y = null;
      d._carried = false;
    } else {
      const prev = _prevPositions.get(d.data.path);
      if (prev && isFinite(prev.x) && isFinite(prev.y)) {
        d.x = prev.x;
        d.y = prev.y;
        // The just-expanded node is NOT hard-pinned in dynamic expanse —
        // it gets a soft spring back toward its prior position, so it can
        // drift outward if needed to resolve overlap with sibling subtrees.
        d._carried = !d._justExpanded;
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
  renderLayout(root, { animate: !_firstRender });

  if (_firstRender) {
    _firstRender = false;
    requestAnimationFrame(() => {
      fitToView();
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
    .attr("stroke-width", 1)
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
    const hit = state.settings.hitRadius;
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
      .attr("x", -w / 2 - hit)
      .attr("y", -renderH / 2 - hit)
      .attr("width", w + hit * 2)
      .attr("height", renderH + hit * 2);

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

function attachNodeHandlers(selection) {
  selection.on("click", async (event, d) => {
    event.stopPropagation();
    const clickedPath = d.data.path;
    if (d.data.type === "directory" && d.data._hasChildren) {
      const wasExpanded = state.expandedPaths.has(clickedPath);
      if (wasExpanded) {
        state.expandedPaths.delete(clickedPath);
        await updateTree();
      } else {
        state.expandedPaths.add(clickedPath);
        await updateTree({ justExpanded: clickedPath });
      }
      // When expanding: zoom/pan so the folder AND its children are all
      // visible. When collapsing: just recenter on the folder itself —
      // there are no children to fit.
      if (wasExpanded) {
        centerOnNode(clickedPath);
      } else {
        centerOnNodeWithChildren(clickedPath);
      }
    } else if (d.data.type === "file") {
      openFile(d.data);
    }
  });

  selection.on("mouseenter", (event, d) => {
    const tooltip = document.getElementById("tooltip");
    let text = d.data.path;
    if (d.data.meta) {
      const m = d.data.meta;
      if (m.phase) text += `\nPhase: ${m.phase}`;
      if (m.momentum) text += ` · Momentum: ${m.momentum}`;
      if (m.next_action) text += `\nNext: ${m.next_action}`;
      if (m.lines) text += `\n${m.lines} lines`;
      if (m.size) text += ` · ${(m.size / 1024).toFixed(0)} KB`;
    }
    tooltip.textContent = text;
    tooltip.style.display = "block";
    tooltip.style.left = (event.clientX + 12) + "px";
    tooltip.style.top = (event.clientY - 8) + "px";
  });

  selection.on("mouseleave", () => {
    document.getElementById("tooltip").style.display = "none";
  });
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

function showActiveTab() {
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

  if (tab.content) {
    try {
      content.innerHTML = marked.parse(tab.content);
      wireMarkdownLinks(content, tab);
    } catch (e) {
      content.innerHTML = `<pre>${escapeHtml(tab.content)}</pre>`;
    }
  } else if (tab.meta && tab.meta.too_large) {
    const sizeKB = tab.meta.size ? (tab.meta.size / 1024).toFixed(0) : "?";
    content.innerHTML = `<div class="sw-reader-empty">File too large to embed (${sizeKB} KB)</div>`;
  } else {
    content.innerHTML = `<div class="sw-reader-empty">Content not available</div>`;
  }
  content.scrollTop = 0;
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
  document.getElementById("reader").classList.remove("open");
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

// Heat token for a file row: walks up its ancestors in the flatNodes index
// and uses the nearest phase. Files inside an "active" project get hot, etc.
function heatTokenForTab(tab) {
  if (tab.meta && tab.meta.phase && PHASE_TO_HEAT[tab.meta.phase]) {
    return PHASE_TO_HEAT[tab.meta.phase];
  }
  const parts = tab.path.split("/");
  for (let i = parts.length - 1; i > 0; i--) {
    const ancestorPath = parts.slice(0, i).join("/");
    const a = state.flatNodes.find(n => n.path === ancestorPath);
    if (a && a.meta && a.meta.phase && PHASE_TO_HEAT[a.meta.phase]) {
      return PHASE_TO_HEAT[a.meta.phase];
    }
  }
  return null;
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

function commitSearch() {
  if (!state.searchQuery) return;
  const q = state.searchQuery;
  const matches = state.flatNodes.filter(n => {
    const nameMatch = n.name.toLowerCase().includes(q);
    const contentMatch = n.content && n.content.toLowerCase().includes(q);
    return nameMatch || contentMatch;
  });
  for (const match of matches) expandAncestors(match.path);
  updateTree({ isResettle: true });
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
    if (btn) btn.classList.remove("active");
  } else {
    for (const n of state.flatNodes) {
      if (n.type === "directory") state.expandedPaths.add(n.path);
    }
    if (btn) btn.classList.add("active");
  }
  // _prevPositions is keyed on path, so we clear it — expanding from 4 to 5000
  // nodes with stale positions leaves most nodes pinned at the polar seeds of
  // the previous smaller tree, which looks wrong during settle.
  _prevPositions = new Map();
  await updateTree({ isResettle: true });
  requestAnimationFrame(() => fitToView());
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
  g.selectAll(".node").each(function(d) {
    if (!d || !d.data) return;
    const el = d3.select(this);
    const nameMatch = d.data.name.toLowerCase().includes(state.searchQuery);
    const flatNode = state.flatNodes.find(n => n.path === d.data.path);
    const contentMatch = flatNode && flatNode.content &&
                         flatNode.content.toLowerCase().includes(state.searchQuery);
    if (nameMatch || contentMatch) {
      el.classed("highlighted", true).classed("dimmed", false);
    } else {
      el.classed("highlighted", false).classed("dimmed", true);
    }
  });
  g.selectAll(".link").classed("dimmed", true);
}

// ── Divider Resize ────────────────────────────────────────────────────
function setupDivider() {
  const divider = document.getElementById("divider");
  const reader = document.getElementById("reader");
  let isResizing = false;

  divider.addEventListener("mousedown", (e) => {
    isResizing = true;
    divider.classList.add("active");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const containerWidth = document.querySelector(".sw-main").clientWidth;
    const newReaderWidth = containerWidth - e.clientX;
    const clampedWidth = Math.max(280, Math.min(containerWidth * 0.7, newReaderWidth));
    reader.style.width = clampedWidth + "px";
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
  searchInput.addEventListener("input", (e) => {
    updateSearchHighlight(e.target.value);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateSearchHighlight(e.target.value);
      commitSearch();
    }
  });

  document.getElementById("reader-close").addEventListener("click", minimizeReader);

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
    if (!isNode && document.getElementById("reader").classList.contains("open")) {
      minimizeReader();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.getElementById("reader").classList.contains("open")) {
        minimizeReader();
      } else {
        document.getElementById("search-input").value = "";
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

  async function poll() {
    try {
      const res = await fetch("__snapshot.json?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("no live server");
      const data = await res.json();

      if (liveReloadHash === null) {
        liveReloadHash = data.hash;
        dot.classList.add("live");
        dot.title = `Live · last regen ${new Date(data.generated_at * 1000).toLocaleTimeString()}`;
      } else if (data.hash !== liveReloadHash) {
        dot.classList.remove("live");
        dot.classList.add("refreshing");
        dot.title = "Reloading…";
        setTimeout(() => location.reload(), 250);
      }
    } catch (err) {
      dot.classList.remove("live", "refreshing");
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

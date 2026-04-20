#!/usr/bin/env python3
"""
build-radial-fan-prototype.py — Outward-fanning radial tree prototype.

Opposite gesture from d3.pack (which drilled INTO containers). Here, children
fan OUT around their parent when you expand. Root sits in the center. Click a
node to fan out its children; click background to step back up.

One rule, recursively applied, no thresholds:
  - Each visible parent fans its visible children in its allocated angular arc.
  - Angular arc allocated by log₂(leaves+1) so outliers (inbox 469) don't
    dominate — a log-scaled gradient, not a classifier.
  - Circle radius also log-scaled to leaf count (visual weight ∝ importance).

Usage:
    python3 tools/build-radial-fan-prototype.py [--config PATH] [--output PATH]

Default output: play/YYYY-MM-DD-radial-fan-prototype.html
"""

import argparse
import datetime
import importlib.util
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
GENERATOR_DIR = PROJECT_ROOT / "generator"
TEMPLATE_DIR = PROJECT_ROOT / "templates" / "v2"
PLAY_DIR = PROJECT_ROOT / "play"

sys.path.insert(0, str(GENERATOR_DIR))
from config import ConfigError  # noqa: E402

gen_spec = importlib.util.spec_from_file_location(
    "gen", GENERATOR_DIR / "generate-ecosystem.py"
)
gen = importlib.util.module_from_spec(gen_spec)
gen_spec.loader.exec_module(gen)


def strip_tree(node):
    out = {
        "name": node.get("name", ""),
        "type": node.get("type", "directory"),
    }
    children = node.get("children") or []
    if children:
        out["children"] = [strip_tree(c) for c in children]
    return out


PROTOTYPE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Spatial Workspace — radial fan prototype</title>
<style>
  :root {
    --bg: #0b0d10;
    --fg: #e6e9ef;
    --muted: #8a93a6;
    --accent: #7aa2f7;
    --accent-dim: rgba(122,162,247,0.35);
    --border: rgba(255,255,255,0.08);
  }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; overflow: hidden; }
  #root { position: fixed; inset: 0; }
  svg { width: 100vw; height: 100vh; cursor: default; display: block; }

  .link {
    fill: none;
    stroke: rgba(255,255,255,0.14);
    stroke-width: 1;
  }
  .node { cursor: pointer; }
  .node circle {
    fill: rgba(15,18,24,0.9);
    stroke: rgba(255,255,255,0.32);
    stroke-width: 1;
    transition: stroke 0.15s ease, fill 0.15s ease;
  }
  .node.directory > circle { stroke: rgba(122,162,247,0.55); }
  .node.file > circle { stroke: rgba(195,167,247,0.55); }
  .node.expanded > circle { stroke: rgba(122,162,247,1); fill: rgba(30,45,70,0.95); }
  .node:hover > circle { stroke: rgba(255,255,255,0.9); }
  .node.focus > circle { stroke: #fff; stroke-width: 2; }

  .label {
    fill: var(--fg);
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
    text-anchor: middle;
    dominant-baseline: middle;
    paint-order: stroke;
    stroke: rgba(11,13,16,0.9);
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .label.small { font-size: 10px; }
  .label.large { font-size: 14px; font-weight: 600; }
  .label.xlarge { font-size: 18px; font-weight: 700; }
  .count {
    fill: var(--muted);
    font-size: 9px;
    pointer-events: none;
    text-anchor: middle;
  }

  #hud {
    position: fixed;
    top: 12px; left: 12px;
    background: rgba(20,22,28,0.88);
    border: 1px solid var(--border);
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
    max-width: 340px;
    backdrop-filter: blur(6px);
  }
  #hud b { color: var(--fg); font-weight: 600; }
  #breadcrumb {
    position: fixed;
    bottom: 12px; left: 12px;
    background: rgba(20,22,28,0.88);
    border: 1px solid var(--border);
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--fg);
    backdrop-filter: blur(6px);
    max-width: 70vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #breadcrumb .crumb { color: var(--muted); }
  #breadcrumb .crumb.active { color: var(--fg); font-weight: 600; }
  #breadcrumb .sep { color: var(--muted); margin: 0 4px; }
</style>
</head>
<body>
<div id="root"><svg id="canvas"></svg></div>
<div id="hud">
  <div><b>radial fan prototype</b></div>
  <div>Click a node to fan out its children around it. Click background to step back up.</div>
  <div id="stats" style="margin-top:4px;"></div>
</div>
<div id="breadcrumb"></div>
<script>/* __D3_LIB__ */</script>
<script>
const DATA = /* __DATA_JSON__ */;

const svg = d3.select("#canvas");
const W = window.innerWidth;
const H = window.innerHeight;
svg.attr("viewBox", [-W/2, -H/2, W, H]); // origin at center
const linkG = svg.append("g").attr("class", "links");
const nodeG = svg.append("g").attr("class", "nodes");
// viewBox is animated on each render to fit the visible subtree.
let currentViewBox = [-W/2, -H/2, W, H];

// ── Build hierarchy + cache values ───────────────────────────────────────
const root = d3.hierarchy(DATA)
  .sum(d => (d.type === "file") ? 1 : 0)
  .sort((a, b) => b.value - a.value);

const ALL = root.descendants();
document.getElementById("stats").textContent =
  ALL.length + " nodes · " +
  ALL.filter(d => d.data.type === "directory").length + " directories · " +
  ALL.filter(d => d.data.type === "file").length + " files";

// ── State ────────────────────────────────────────────────────────────────
const expanded = new Set();
expanded.add(root); // start with root expanded so its direct children are visible
let focus = root;

// ── Layout ───────────────────────────────────────────────────────────────
const RING_SPACING = 260;
const MIN_R = 8;
const MAX_R = 44;

function nodeRadius(d) {
  // Log-scaled by leaf count. Leaves get min radius.
  const leaves = d.value || 1;
  const r = MIN_R + 5.5 * Math.log2(leaves + 1);
  return Math.min(MAX_R, r);
}

function angularWeight(d) {
  return Math.log2((d.value || 1) + 1) + 0.5; // +0.5 keeps single-file leaves from vanishing
}

// Clustered outward-fan layout.
// One GLOBAL force simulation over every currently-visible node. Each parent-
// child relationship is a link with a resting distance tuned to (a) clear the
// parent's label and (b) give room for child radius. All pairs collide for
// non-overlap. Slight many-body repulsion keeps clusters loose. The root is
// fixed at origin; the rest settle around it. Because it's one sim, expanding
// a deep node re-balances the whole visible tree — siblings of the focus get
// pushed outward to make room rather than colliding with the new children.
function computePositions() {
  root.R = nodeRadius(root);
  for (const d of ALL) d.R = nodeRadius(d);

  const vis = visibleNodes();
  const vLinks = vis
    .filter(d => d.parent && vis.includes(d.parent))
    .map(d => ({ source: d.parent, target: d }));

  // Seed any unpositioned node radially around its parent, outward-biased from
  // grandparent direction. Existing positions are kept for stability.
  root.x = 0; root.y = 0;
  for (const d of vis) {
    if (d === root) continue;
    if (d.x != null && d.y != null && d._owner === d.parent) continue;
    const p = d.parent;
    const gp = p.parent;
    let axis;
    if (gp && p.x != null) {
      axis = Math.atan2(p.y - gp.y, p.x - gp.x);
    } else {
      axis = 0;
    }
    const siblings = p.children || [];
    const idx = siblings.indexOf(d);
    const n = siblings.length;
    const span = gp ? Math.PI * 1.6 : 2 * Math.PI;
    const t = n === 1 ? 0.5 : idx / (n - 1);
    const jitter = (hashNum(d.data.name + idx) - 0.5) * 0.2;
    const angle = axis - span / 2 + t * span + jitter;
    const labelBuffer = (p.depth === 0) ? 180 : (p.depth === 1 ? 90 : 40);
    const r = p.R + labelBuffer + 40 + Math.sqrt(n) * 14 + (hashNum("r" + d.data.name) - 0.5) * 20;
    d.x = (p.x || 0) + Math.cos(angle) * r;
    d.y = (p.y || 0) + Math.sin(angle) * r;
    d._owner = p;
  }

  // Fix root so the canvas doesn't drift.
  root.fx = 0;
  root.fy = 0;

  // Link distance depends on the parent's depth (long root label needs space).
  function linkDistance(link) {
    const src = link.source, tgt = link.target;
    const pad = src.depth === 0 ? 120 : src.depth === 1 ? 80 : 50;
    return src.R + tgt.R + pad;
  }

  // Charge strength also scales by depth — stronger push at shallow levels
  // where labels are big, gentler deep down where we want tight clusters.
  function charge(d) {
    if (d === root) return -200;
    if (d.depth === 1) return -160;
    if (d.depth === 2) return -90;
    return -50;
  }

  const sim = d3.forceSimulation(vis)
    .force("link", d3.forceLink(vLinks).distance(linkDistance).strength(0.9))
    .force("collide", d3.forceCollide(d => d.R + 8).strength(1).iterations(4))
    .force("charge", d3.forceManyBody().strength(charge).distanceMax(500))
    .alpha(1)
    .alphaDecay(0.035)
    .velocityDecay(0.35)
    .stop();

  for (let i = 0; i < 500; i++) sim.tick();

  root.fx = null;
  root.fy = null;
}

// Deterministic hash → [0,1) for seeding jitter (stable across renders).
function hashNum(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h & 0xffffffff) / 0x100000000;
}

function isVisible(d) {
  if (d === root) return true;
  return expanded.has(d.parent);
}

function visibleNodes() {
  return ALL.filter(isVisible);
}

function visibleLinks() {
  return ALL
    .filter(d => d.parent && isVisible(d) && isVisible(d.parent))
    .map(d => ({ source: d.parent, target: d }));
}

// ── Rendering ────────────────────────────────────────────────────────────
function labelClass(d) {
  const cls = ["label"];
  if (d.depth === 0) cls.push("xlarge");
  else if (d.depth === 1) cls.push("large");
  else if (d.R < 10) cls.push("small");
  return cls.join(" ");
}

const TWEEN = 500;

function render({ animate = true } = {}) {
  computePositions();

  const vNodes = visibleNodes();
  const vLinks = visibleLinks();

  // ── Links ──
  const link = linkG.selectAll("path.link")
    .data(vLinks, d => d.target.data.name + "::" + d.target.depth + "::" + (d.target.parent ? d.target.parent.data.name : ""));

  link.exit().transition().duration(TWEEN / 2).style("opacity", 0).remove();

  const linkEnter = link.enter().append("path")
    .attr("class", "link")
    .style("opacity", 0)
    // Enter from source position (bloom outward feel).
    .attr("d", d => linkPath(d.source, d.source));

  linkEnter.merge(link)
    .transition().duration(animate ? TWEEN : 0).ease(d3.easeCubicOut)
    .style("opacity", 1)
    .attr("d", d => linkPath(d.source, d.target));

  // ── Nodes ──
  const node = nodeG.selectAll("g.node")
    .data(vNodes, d => d.data.name + "::" + d.depth + "::" + (d.parent ? d.parent.data.name : "root"));

  node.exit()
    .transition().duration(TWEEN / 2)
    .attr("transform", d => `translate(${d.parent ? d.parent.x : 0},${d.parent ? d.parent.y : 0})`)
    .style("opacity", 0)
    .remove();

  const nodeEnter = node.enter().append("g")
    .attr("class", d => "node " + (d.data.type === "file" ? "file" : "directory"))
    .attr("transform", d => {
      // Enter at parent's position (bloom outward).
      const p = d.parent || d;
      return `translate(${p.x},${p.y})`;
    })
    .style("opacity", 0)
    .on("click", (event, d) => {
      event.stopPropagation();
      onNodeClick(d);
    });

  nodeEnter.append("circle").attr("r", 0);
  nodeEnter.append("text").attr("class", labelClass).text(d => labelText(d));
  nodeEnter.append("text").attr("class", "count").attr("dy", 12);

  const nodeMerge = nodeEnter.merge(node);

  nodeMerge
    .attr("class", d => {
      let c = "node " + (d.data.type === "file" ? "file" : "directory");
      if (expanded.has(d)) c += " expanded";
      if (d === focus) c += " focus";
      return c;
    });

  nodeMerge.transition().duration(animate ? TWEEN : 0).ease(d3.easeCubicOut)
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("opacity", 1);

  nodeMerge.select("circle").transition().duration(animate ? TWEEN : 0).ease(d3.easeCubicOut)
    .attr("r", d => d.R);

  nodeMerge.select("text.label")
    .attr("class", labelClass)
    .attr("dy", d => -(d.R + 8))
    .text(d => labelText(d));

  nodeMerge.select("text.count")
    .attr("dy", d => d.R + 14)
    .text(d => (d.data.type === "directory" && d.value > 0) ? d.value + " files" : "")
    .style("display", d => (d.R >= 12 && d.data.type === "directory") ? null : "none");

  fitViewBox(vNodes, animate);
  updateBreadcrumb();
}

function fitViewBox(vNodes, animate) {
  if (!vNodes.length) return;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of vNodes) {
    const pad = (n.R || MIN_R) + 28;
    minX = Math.min(minX, n.x - pad);
    maxX = Math.max(maxX, n.x + pad);
    minY = Math.min(minY, n.y - pad);
    maxY = Math.max(maxY, n.y + pad);
  }
  // Leave room for HUD/breadcrumb.
  const margin = 60;
  minX -= margin; maxX += margin;
  minY -= margin; maxY += margin;

  const w = maxX - minX;
  const h = maxY - minY;
  // Match the window aspect ratio so text doesn't distort.
  const aspect = W / H;
  let fitW = w, fitH = h;
  if (w / h > aspect) fitH = w / aspect;
  else fitW = h * aspect;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const target = [cx - fitW / 2, cy - fitH / 2, fitW, fitH];

  if (animate) {
    svg.transition().duration(TWEEN).ease(d3.easeCubicOut)
      .attrTween("viewBox", () => {
        const i = d3.interpolateArray(currentViewBox, target);
        return t => { currentViewBox = i(t); return currentViewBox.join(" "); };
      });
  } else {
    currentViewBox = target;
    svg.attr("viewBox", target.join(" "));
  }
}

function labelText(d) {
  const name = d.data.name || "";
  if (d.R >= 18 || d.depth <= 1) return name;
  if (name.length > 22) return name.slice(0, 20) + "…";
  return name;
}

function linkPath(source, target) {
  // Curved link from source to target using a simple arc toward the outward direction.
  // For a radial tree, a straight line is honest and readable.
  return `M${source.x},${source.y}L${target.x},${target.y}`;
}

// ── Interaction ──────────────────────────────────────────────────────────
function onNodeClick(d) {
  if (!d.children) {
    // leaf (file) — just mark as focus
    focus = d;
    render({ animate: true });
    return;
  }
  // Directory: toggle expansion. Expanding promotes to focus.
  if (expanded.has(d)) {
    // Already expanded — clicking collapses it.
    collapseSubtree(d);
    focus = d.parent || root;
  } else {
    expanded.add(d);
    focus = d;
  }
  render({ animate: true });
}

function collapseSubtree(d) {
  expanded.delete(d);
  if (d.children) d.children.forEach(collapseSubtree);
}

svg.on("click", () => {
  // Background click: step up one level (collapse current focus).
  if (focus === root) {
    // already at root — reset to initial state
    expanded.clear();
    expanded.add(root);
    render({ animate: true });
    return;
  }
  const parent = focus.parent || root;
  collapseSubtree(focus);
  focus = parent;
  render({ animate: true });
});

function updateBreadcrumb() {
  const chain = focus.ancestors().reverse();
  const el = document.getElementById("breadcrumb");
  el.innerHTML = chain.map((n, i) => {
    const cls = (i === chain.length - 1) ? "crumb active" : "crumb";
    return `<span class="${cls}">${n.data.name}</span>`;
  }).join('<span class="sep">›</span>');
}

// Zoom/pan (simple): keep focus roughly centered as depth grows.
// For now, no pan — SVG viewBox is large enough at depth 1-3.
// Future: auto-recenter on deep drill.

// URL hash lets us auto-expand a path for screenshots / deep-linking.
// Format: #Playful%20Sincerity/PS%20Software  → expand root, PS, PS Software.
function applyHash() {
  const h = window.location.hash.slice(1);
  if (!h) return;
  const names = h.split("/").map(decodeURIComponent);
  let node = root;
  for (const n of names) {
    if (!node.children) break;
    const next = node.children.find(c => c.data.name === n);
    if (!next) break;
    expanded.add(node);
    if (next.children) expanded.add(next);
    node = next;
  }
  focus = node;
}
applyHash();

render({ animate: false });
</script>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description="Build the radial-fan prototype.")
    parser.add_argument("--config", help="Path to config.json.")
    parser.add_argument("--output", help="Output HTML path.")
    args = parser.parse_args()

    try:
        cfg = gen.load_config(args.config)
    except ConfigError as e:
        print(f"✗ {e}", file=sys.stderr)
        sys.exit(1)

    print("Scanning ecosystem...", file=sys.stderr)
    cross_links = []
    tree = gen.build_ecosystem_tree(cfg, cross_links)
    stripped = strip_tree(tree)

    d3_path = TEMPLATE_DIR / "d3.min.js"
    if not d3_path.exists():
        print(f"✗ Missing {d3_path}", file=sys.stderr)
        sys.exit(1)
    d3_code = d3_path.read_text(encoding="utf-8")
    data_json = json.dumps(stripped, ensure_ascii=False, separators=(",", ":"))

    html = PROTOTYPE_HTML
    html = html.replace("/* __D3_LIB__ */", gen.escape_for_script_tag(d3_code))
    html = html.replace("/* __DATA_JSON__ */", gen.escape_for_script_tag(data_json))

    if args.output:
        out = Path(args.output)
    else:
        PLAY_DIR.mkdir(exist_ok=True)
        today = datetime.date.today().isoformat()
        out = PLAY_DIR / f"{today}-radial-fan-prototype.html"

    out.write_text(html, encoding="utf-8")
    size_mb = out.stat().st_size / 1024 / 1024
    print(f"Wrote {out} ({size_mb:.1f} MB)", file=sys.stderr)
    print(f"Open with: open \"{out}\"", file=sys.stderr)


if __name__ == "__main__":
    main()

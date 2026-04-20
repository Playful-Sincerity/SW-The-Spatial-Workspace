#!/usr/bin/env python3
"""
build-prototype.py — Build a self-contained static prototype of the
recursive-circle-packing (d3.pack) layout against the real ecosystem tree.

Writes a single HTML file with inline d3 + inline tree JSON (metadata only,
no file contents). Open the file in a browser to eye-test the layout before
any integration into the v2 canvas.

Usage:
    python3 tools/build-prototype.py [--config PATH] [--output PATH]

Default output: play/YYYY-MM-DD-d3-pack-prototype.html
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
    """Keep only the fields the prototype renders. Drops file contents."""
    out = {
        "name": node.get("name", ""),
        "type": node.get("type", "directory"),
    }
    # Branch meta used for color in the prototype.
    cluster = (node.get("meta") or {}).get("cluster")
    if cluster:
        out["cluster"] = cluster
    children = node.get("children") or []
    if children:
        out["children"] = [strip_tree(c) for c in children]
    return out


PROTOTYPE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Spatial Workspace — d3.pack prototype</title>
<style>
  :root {
    --bg: #0b0d10;
    --fg: #e6e9ef;
    --muted: #8a93a6;
    --accent: #7aa2f7;
    --border: rgba(255,255,255,0.08);
  }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; }
  #root { position: fixed; inset: 0; overflow: hidden; }
  svg { width: 100vw; height: 100vh; cursor: pointer; display: block; }
  .node circle {
    fill-opacity: 0.04;
    stroke: rgba(255,255,255,0.18);
    stroke-width: 0.6;
    transition: fill-opacity 0.15s ease, stroke 0.15s ease;
  }
  .node.directory > circle { fill: #7aa2f7; }
  .node.file > circle { fill: #c3a7f7; }
  .node:hover > circle { fill-opacity: 0.18; stroke: rgba(255,255,255,0.6); }
  .label {
    fill: var(--fg);
    font-size: 10px;
    font-weight: 500;
    pointer-events: none;
    text-anchor: middle;
    dominant-baseline: middle;
    paint-order: stroke;
    stroke: rgba(11,13,16,0.85);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .label.small { font-size: 8px; }
  .label.large { font-size: 14px; font-weight: 600; }
  .label.xlarge { font-size: 20px; font-weight: 700; }
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
  #modes {
    position: fixed;
    top: 12px; right: 12px;
    display: flex;
    gap: 6px;
    background: rgba(20,22,28,0.88);
    border: 1px solid var(--border);
    padding: 6px;
    border-radius: 8px;
    font-size: 12px;
    backdrop-filter: blur(6px);
  }
  #modes button {
    background: transparent;
    border: 1px solid transparent;
    color: var(--muted);
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    font: inherit;
  }
  #modes button.active {
    background: rgba(122,162,247,0.16);
    border-color: rgba(122,162,247,0.45);
    color: var(--fg);
  }
  #modes button:hover:not(.active) { color: var(--fg); }
  .node.collapsed > circle { stroke: rgba(122,162,247,0.55); stroke-width: 1; }
  .node.hidden { display: none; }
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
  <div><b>d3.pack prototype</b></div>
  <div id="mode-help">Click a circle to zoom into it and reveal its children. Click the background to step back up.</div>
  <div id="stats" style="margin-top:4px;"></div>
</div>
<div id="modes">
  <button id="mode-progressive" class="active">Click to expand</button>
  <button id="mode-all">Show all</button>
</div>
<div id="breadcrumb"></div>
<script>/* __D3_LIB__ */</script>
<script>
const DATA = /* __DATA_JSON__ */;
const svg = d3.select("#canvas");
const W = window.innerWidth;
const H = window.innerHeight;
svg.attr("viewBox", [0, 0, W, H]);
const g = svg.append("g");

const root = d3.hierarchy(DATA)
  .sum(d => (d.type === "file") ? 1 : 0)
  .sort((a, b) => b.value - a.value);

d3.pack()
  .size([W - 20, H - 20])
  .padding(d => Math.max(2, 10 - d.depth * 2))(root);

// Offset by the layout margin.
root.each(d => { d.x += 10; d.y += 10; });

const ALL = root.descendants();

document.getElementById("stats").innerHTML =
  "<span>" + ALL.length + " nodes · " +
  ALL.filter(d => d.data.type === "directory").length + " directories · " +
  ALL.filter(d => d.data.type === "file").length + " files</span>";

// ── State: expansion + focus + mode ──────────────────────────────────────
// A node is visible iff its parent is in `expanded` (root is always visible).
// `focus` is the node the camera is currently filling — clicks zoom into it.
let mode = "progressive";
let focus = root;
const expanded = new Set();

function setInitialExpansion() {
  expanded.clear();
  if (mode === "all") {
    for (const d of ALL) if (d.children) expanded.add(d);
  } else {
    expanded.add(root);
  }
  focus = root;
}

function isVisible(d) {
  if (d === root) return true;
  return expanded.has(d.parent);
}

function collapseSubtree(d) {
  expanded.delete(d);
  if (d.children) d.children.forEach(collapseSubtree);
}

// ── Rendering ────────────────────────────────────────────────────────────
const nodeG = g.selectAll("g.node")
  .data(ALL)
  .join("g")
  .attr("class", d => "node " + (d.data.type === "file" ? "file" : "directory"))
  .attr("transform", d => `translate(${d.x},${d.y})`);

const circles = nodeG.append("circle")
  .attr("r", d => d.r)
  .on("click", (event, d) => {
    event.stopPropagation();
    focusOn(d);
  });

const labels = nodeG.append("text")
  .attr("dy", d => d.children ? -d.r + 14 : 0)
  .text(d => d.data.name);

function labelClass(d) {
  const cls = ["label"];
  if (d.depth <= 1) cls.push("xlarge");
  else if (d.depth === 2) cls.push("large");
  else if (d.r < 14) cls.push("small");
  return cls.join(" ");
}

// ── Camera / focus ───────────────────────────────────────────────────────
const ZOOM_MARGIN = 40; // px around the focused node
const TWEEN_MS = 650;

function focusOn(d) {
  focus = d;

  // Expand directory focuses so their children bloom inside.
  if (d.children) expanded.add(d);

  const k = Math.min(W, H) / (d.r * 2 + ZOOM_MARGIN);
  const tx = W / 2 - d.x * k;
  const ty = H / 2 - d.y * k;

  g.transition().duration(TWEEN_MS).ease(d3.easeCubicInOut)
    .attr("transform", `translate(${tx},${ty}) scale(${k})`);

  // Keep strokes crisp across zoom.
  circles.transition().duration(TWEEN_MS)
    .attr("stroke-width", 0.6 / k);

  // Labels: no inverse scale. They grow with zoom, which keeps the focused
  // node's own label large and the newly-revealed children's labels readable.
  // We'll hide labels that would overshoot or undershoot the viewport in render().
  render();
}

function render() {
  nodeG
    .classed("hidden", d => !isVisible(d))
    .classed("collapsed", d => d.children && !expanded.has(d) && d !== root);

  labels.attr("class", labelClass)
    .style("display", d => {
      if (!isVisible(d)) return "none";
      // At absolute screen size <10px after zoom, hide.
      // k = (H / (focus.r*2+margin)); min on-screen radius of d ≈ d.r * k.
      const k = Math.min(W, H) / (focus.r * 2 + ZOOM_MARGIN);
      return (d.r * k >= 10) ? null : "none";
    });

  updateBreadcrumb();
}

// Background click: step up one level. At root, reset expansion.
svg.on("click", () => {
  if (mode !== "progressive") return;
  if (focus === root) {
    setInitialExpansion();
    focusOn(root);
    return;
  }
  // Collapse the node we're stepping away from and climb to its parent.
  collapseSubtree(focus);
  focusOn(focus.parent || root);
});

function updateBreadcrumb() {
  const chain = focus.ancestors().reverse();
  const el = document.getElementById("breadcrumb");
  el.innerHTML = chain.map((n, i) => {
    const cls = (i === chain.length - 1) ? "crumb active" : "crumb";
    return `<span class="${cls}">${n.data.name}</span>`;
  }).join('<span class="sep">›</span>');
}

// Mode toggle
function setMode(m) {
  mode = m;
  document.getElementById("mode-progressive").classList.toggle("active", m === "progressive");
  document.getElementById("mode-all").classList.toggle("active", m === "all");
  document.getElementById("mode-help").textContent = (m === "progressive")
    ? "Click a circle to zoom into it and reveal its children. Click the background to step back up."
    : "All nodes visible. Click a circle to zoom into it; click the background to zoom back out.";
  setInitialExpansion();
  focusOn(root);
}

document.getElementById("mode-progressive").addEventListener("click", (e) => {
  e.stopPropagation(); setMode("progressive");
});
document.getElementById("mode-all").addEventListener("click", (e) => {
  e.stopPropagation(); setMode("all");
});

setInitialExpansion();
focusOn(root);
</script>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description="Build the d3.pack static prototype.")
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
        out = PLAY_DIR / f"{today}-d3-pack-prototype.html"

    out.write_text(html, encoding="utf-8")
    size_mb = out.stat().st_size / 1024 / 1024
    print(f"Wrote {out} ({size_mb:.1f} MB)", file=sys.stderr)
    print(f"Open with: open \"{out}\"", file=sys.stderr)


if __name__ == "__main__":
    main()

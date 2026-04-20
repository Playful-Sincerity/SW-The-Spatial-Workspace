#!/usr/bin/env python3
"""
Tabulate the distribution of immediate-children counts across the ecosystem.

Stage 1 prep for SPEC-CLICK-TO-GROW — picks bagThreshold from real data
instead of guessing. Run before changing the generator.

Uses the same filesystem scan logic as generate-ecosystem.py so the
distribution matches what the canvas will actually show.
"""

import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
GEN_DIR = SCRIPT_DIR.parent / "generator"
sys.path.insert(0, str(GEN_DIR))

# Re-use the generator's scan so our counts match what ships to the canvas.
# generate-ecosystem.py has a hyphen, so import via a file loader.
import importlib.util
spec = importlib.util.spec_from_file_location(
    "generate_ecosystem", GEN_DIR / "generate-ecosystem.py"
)
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

from config import load_config

cfg = load_config(gen.SCRIPT_DIR.parent / "config.json")
cross_links = []
tree = gen.build_ecosystem_tree(cfg, cross_links)

# Walk the tree and collect the immediate-child count of every directory node.
counts = []
high_degree_nodes = []  # list of (count, path) for directories > 20 kids

def walk(node):
    if node.get("type") == "directory":
        kids = node.get("children") or []
        n = len(kids)
        counts.append(n)
        if n > 20:
            high_degree_nodes.append((n, node["path"]))
        for c in kids:
            walk(c)

walk(tree)

# Distribution buckets
buckets = [
    (0, 5, "0-5 (leaf-like)"),
    (6, 15, "6-15 (normal)"),
    (16, 30, "16-30 (heavy)"),
    (31, 60, "31-60 (very heavy)"),
    (61, 120, "61-120 (bag candidate)"),
    (121, 9999, "121+ (definite bag)"),
]

print(f"Total directory nodes: {len(counts)}")
print(f"Mean immediate-children: {sum(counts) / len(counts):.1f}")
print(f"Median: {sorted(counts)[len(counts) // 2]}")
print(f"Max: {max(counts)}")
print()
print("Distribution:")
for lo, hi, label in buckets:
    n = sum(1 for c in counts if lo <= c <= hi)
    pct = 100 * n / len(counts)
    print(f"  {label:25s}  {n:4d}  ({pct:.1f}%)")

print()
print(f"Directories with > 20 immediate children ({len(high_degree_nodes)}):")
for n, path in sorted(high_degree_nodes, reverse=True):
    short = path.replace(str(Path.home()), "~")
    print(f"  {n:4d}  {short}")

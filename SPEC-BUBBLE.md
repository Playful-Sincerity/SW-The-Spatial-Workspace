# SPEC — v3-bubble (Current Working Architecture)
*Date: 2026-04-19 · Status: Working, not final · Supersedes SPEC-TREE.md as the active path*

---

## What this is

The layout architecture for `templates/v3-bubble/`. The first approach in a long arc that Wisdom said "is pretty good" — packing renders without the fan aesthetic that plagued every previous attempt (force-directed, wedge, packed-balloon, fan-cone). Snapshotted here so we can iterate without losing the working state.

## Core insight (from Wisdom's 2026-04-19 bubble-physics speech)

> Each folder + its immediate visible children forms an implicit "bubble." Children pack *inside* that bubble alongside the folder, not radially around the folder at a distance. The bubble is never drawn — it manifests through node positions alone. "All the buttons kind of spreading out from the center of the main folder."

This was the unlock: the fan problem was never the algorithm, it was the *shape* of the container. Radial-around-a-point → fan (geometrically inevitable for N similar-sized children). Packed-inside-a-region → hex-ish 2D tiling (what we actually want).

## The three mechanics

### 1. Use d3.pack for recursive circle packing

d3.pack (already vendored in `d3.min.js`) recursively packs circles inside circles. At every level, a parent's children pack tangent inside the parent's implicit circle. Exactly the bubble model, for free.

### 2. `.radius()` accessor forces absolute button sizes

By default, d3.pack scales content to fit the `.size([w, h])` box — circles stretch up or shrink to fit. We don't want that; we want circles at the actual pixel size of their button.

```js
const pack = d3.pack()
  .padding(BUBBLE.padding)
  .radius(d => {
    // Return each leaf's radius in pixels (absolute).
    const node = nodesByPath.get(d.data._isSelf ? d.data._origPath : d.data.path);
    return node ? nodeVisualRadius(node) * BUBBLE.leafRadiusScale : 40;
  });
```

When `.radius()` is set, `.size()` is ignored. Internal-node radii are still computed automatically to enclose their children.

### 3. Synthetic self-nodes stop folders from overlapping children

**Problem:** d3.pack places internal-node (x, y) at the center of its children's packing. If we render the folder's button at that center, it overlaps whichever child got packed near the middle.

**Fix:** Every folder gets an invisible "self" leaf prepended to its children in a pack-only hierarchy. d3.pack treats it as a real sibling — it reserves its own spot. When we map positions back, the folder's button is drawn *at the self-node's position*, not at the container center.

```js
const packRoot = d3.hierarchy(visibleRoot, (data) => {
  if (!data.children || data.children.length === 0) return null;
  return [
    { _isSelf: true, _origPath: data.path },
    ...data.children
  ];
});
```

After pack, positions are extracted:
- Real leaves → their own position
- Folders → their self-node's position (which d3.pack reserved a spot for)

## Constants

```js
const BUBBLE = {
  padding:  4,    // gap between sibling circles
  sizeBox:  4000, // unused when .radius() is set, but kept for API
  leafRadiusScale: 1.0, // 1.0 = button-sized; >1 adds breathing room
};
```

## What works

- No fan at any level. Packing is 2D (hex-ish).
- Deterministic. Same tree → same positions.
- No physics, no iteration, no drift.
- Lines (folder → children) render naturally since each node has a world position.

## What's still off (observed 2026-04-19)

- **Overall spread is larger than Wisdom wants.** Even at button-size packing, 3800 nodes tile to a ~3000+px extent. Not overlapping, just big.
- **Possible cousin collisions** (two subtrees from different parents near each other). d3.pack prevents sibling overlap, not cousin overlap.
- **Folder button at self-node position may still look slightly offset** from the children's visual centroid — a minor aesthetic.

## What to try next

1. **Tier-by-tier expand/minus controls** (build-queue entry 2026-04-18). Lets the user progressively reveal the tree tier-by-tier instead of all-at-once. Pairs naturally with the bubble architecture since each tier-reveal is a new packing pass with more visible children.
2. **Tighter packing.** Reduce `leafRadiusScale` below 1.0 to allow slight rectangular overlap at corners (rectangular buttons packed at inscribed-circle distance have corner overlap but sides clear).
3. **Bubble emission on expand** (from Wisdom's speech): instead of a single pack with all visible descendants, each expanded folder becomes its own bubble adjacent to its parent bubble. Multi-layer layout. Bigger lift; deferred.

## Files

- `templates/v3-bubble/app.js` — the implementation (layout engine at `createLayout()`)
- `knowledge/sources/wisdom-speech/2026-04-19-bubble-physics-vision.md` — Wisdom's speech
- `SPEC-TREE.md` — historical, packed-balloon attempt (superseded)
- `chronicle/2026-04-19.md` — session log of the arrival at this architecture

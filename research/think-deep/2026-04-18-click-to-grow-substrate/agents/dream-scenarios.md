# Dream Scenarios — Click-to-Grow Mechanism
*Generated 2026-04-18 | Dream agent | Think Deep: click-to-grow substrate*

---

## Scenario 1 — The First Click

The canvas opens. One node: "Playful Sincerity" centered at (0, 0). It's large — 72px radius, maybe 120px wide, the only leaf in the viewport. The user clicks it.

**What the algorithm computes:**

Seven children. No existing positions to respect, no collision history, no prior spatial memory. The algorithm has one job: place seven children around a parent at (0, 0).

Golden angle: child 0 at 0°, child 1 at 137.5°, child 2 at 275°, child 3 at 52.5°, child 4 at 190°, child 5 at 327.5°, child 6 at 105°. Each at radius `r = baseRadius + k * sqrt(leafCount_i)` from the parent. If "PS Software" has 47 leaf descendants, it sits at roughly `60 + 8 * sqrt(47) = 60 + 55 = 115px` out. "PS Products" with 4 leaves sits at `60 + 8 * 2 = 76px` out. Children with more descendants press outward, leaving room for their future subtrees.

**What the user sees:**

Seven nodes bloom outward from center — not a ring, a spiral. PS Research lands at the top-right. PS Software lands lower-left. The two largest (by descendant count) naturally press furthest from origin. It doesn't look like a wagon wheel; it looks like something grew. 

**One frame later:** connector lines trace back to origin. The lines are thin — structural mass, not decoration. There are seven of them, each short by design (weight-proportional distance kept the heaviest branches nearest, the lightest furthest — no, wait: size-weighted distance means heavier nodes are furthest out. But the lines to heavy nodes are longer. That is a phototropism cost: structural mass scales with weight. The tree grows toward light but the branches to heavy subtrees are inherently longer.)

**This reveals:** the golden-angle placement + weight-proportional distance formula immediately creates a tension with phototropism. Heavy subtrees need more room (more descendants = bigger node = further out = longer line). There is no purely local rule that satisfies both "minimize line length" and "give heavy subtrees room." This is not a flaw — it is the fundamental constraint the algorithm lives inside. Knowing it early is valuable.

**Implication for mechanism:** the distance formula needs a ceiling, not an unconstrained `sqrt(leafCount)`. Something like `r = max(baseSpacing, min(maxSpacing, baseSpacing + k * sqrt(leafCount)))`. This bounds the line length while still providing ordering signal. `baseSpacing = 80px`, `maxSpacing = 220px`, `k = 14` would spread 4 → 11 leaf descendants over the range 80px → 140px, and cap 469 descendants at 220px instead of `80 + 14 * 21.7 = 384px`. The cap prevents a single heavy node from being so far away it breaks the canvas layout.

---

## Scenario 2 — The Tight Squeeze

Both PS Software (8 expanded children fanning lower-left from origin) and PS Research (8 expanded children fanning upper-right) are live. The canvas looks pleasantly balanced. Now the user clicks PS Media, which lands at roughly 120° from origin (between upper-right and left). Its natural golden-angle fan would scatter children toward angles that already have PS Research's outermost nodes.

**Three candidate responses:**

**Candidate A — Bend the fan.** Compute the occupied angular range in the neighborhood of PS Media's position. PS Research's children occupy roughly 45°–135°. PS Media sits at 120°, its natural fan starts at 0° relative to PS Media. Instead of fanning at absolute canvas angles 0–315° (which would collide with PS Research), rotate the fan's seed angle so it fans away from PS Research — pointing toward the open 180°–315° range. The algorithm becomes: detect nearest occupied angles within collision distance, find the largest open arc, plant the fan-seed angle at the center of that arc.

*Cost*: the fan is no longer purely golden-angle deterministic. It has a rotation parameter that depends on neighbor state. Spatial memory is preserved for PS Software and PS Research but PS Media's layout is neighbor-sensitive.

**Candidate B — Push PS Media outward.** Keep PS Media's fan direction pure (golden angle, seeds from 0°). Instead, increase the radius at which PS Media sits from origin until its children no longer collide with PS Research's outermost nodes. Think of it as: PS Media gets pushed further away from origin until the fan clears the adjacent subtree.

*Cost*: the connector line from origin to PS Media is longer. If the user has built spatial memory for PS Media ("it's the one in the upper-left quadrant"), that memory is preserved directionally. But PS Media may drift so far from origin that it feels isolated. Also: increasing radius pushes PS Media's own children even further out (since they fan from PS Media, not origin), compounding the problem.

**Candidate C — Tell the user to zoom.** Do nothing at the algorithm level. Let PS Media's children overlap PS Research's children. Show an overlap indicator (a soft red glow on the colliding nodes, or a subtle "these regions need space" toast). The algorithm is deterministic; the user resolves it by zooming in or reordering their expansions.

*Cost*: violates the "no overlap" constraint. This isn't acceptable under the phototropism model (overlapped leaves catch no light).

**Which wins?** Candidate A is the only one that resolves the conflict at the algorithm level without breaking spatial memory of the unaffected subtrees. The rotation is the smallest change that fixes the collision. Candidate B compounds the problem structurally. Candidate C gives up on a core constraint.

**This reveals:** the fan rotation seed angle should not be fixed at 0°. It should be: `seedAngle = directionFromParentToChild + angularOffsetAwayFromOccupiedArcs`. The direction-from-parent-to-child term preserves the spatial memory for where that child is relative to its parent (always approximately the right angle). The angular-offset term does local collision avoidance.

**Implication for mechanism:** angular occupancy map per parent. When placing children of a newly-expanded node, query a lightweight "angular sectors claimed within radius R" map. Find the largest open arc. Plant the golden spiral seed there. This is one small data structure (a set of (angle, radius) claims per node) and one "find largest gap" query per expansion. Not physics. Deterministic given the same expansion order.

---

## Scenario 3 — The Return Visitor

Yesterday: user expanded PS Philosophy, PS Software (7 children), and PS Research (4 children). Left PS Media collapsed. Closed the browser.

Today: browser reopens. What does the user expect?

**The user's mental model:** PS Philosophy is in the upper-left. PS Software fans to the right, its children spread in a recognizable arc. PS Research is below-left. They formed these as a memory palace during yesterday's session. The positions are not just layout — they are spatial knowledge.

**What various algorithms produce:**

*A stateless physics sim re-run on page load:* starts from random or grid seeds, runs force-directed settlement. Converges to a different local minimum than yesterday. PS Philosophy might now be lower-right. Everything has moved. The spatial memory is gone. This is catastrophic.

*A stored-position re-hydration:* the algorithm saved the (x, y) of every node on session close. On reopen, nodes are placed at stored positions. Expansion state is also saved (PS Media = collapsed). The render matches yesterday exactly. Spatial memory fully preserved. This is correct behavior.

*A stored-position re-hydration with stale data:* user added three new files to PS Philosophy between sessions. The watch-server detected the change. Three new children need positions. They have no stored positions. The algorithm places them at golden-angle positions relative to PS Philosophy using the existing child count + 1, 2, 3 slots in the spiral. The existing children don't move. The three new children bloom into whatever arc slots are available next in the spiral sequence.

**What the user sees:** everything from yesterday, in place. Three new nodes — slightly unfamiliar, but clearly "children of PS Philosophy, new additions." Not a surprise disruption. A gentle growth.

**This reveals:** position persistence is not optional. It is the entire product. The spatial memory IS the canvas. An algorithm that doesn't preserve positions across sessions is not just worse than one that does — it is the wrong product. Layout algorithm choice is irrelevant compared to this requirement.

**Implication for mechanism:** position storage is Layer Zero, not an add-on. The click-to-grow mechanism must write positions to disk (or localStorage) after every click. The algorithm only runs for newly-placed children; existing children have frozen coordinates. New children are placed incrementally (next available golden-angle slots in the parent's spiral), and their positions are written immediately. The "algorithm" is less a layout engine and more a position-assignment service for new nodes.

---

## Scenario 4 — The Bag-Click

The user navigates to the HHA node. It's rendered as a summary button: "HHA (469 children)." Not expanded. The button is large, proportional to its descendant count — maybe 80px radius. The user clicks it.

**What should happen?**

Walk through three possible outcomes:

*Outcome A — Spatial fan of 469 children:* the golden-angle spiral spawns children at indices 0–468. Child 468 is at radius `80 + 14 * sqrt(468) = 80 + 303 = 383px` from HHA. The outermost children are 383px away in a direction that likely collides with multiple other expanded subtrees. The 469 buttons, each at minimum touch target 44px, would need `469 * π * 22² = 710,000 px²` of area to not overlap at all, requiring a canvas sector of roughly 950px radius. This is not navigable. This is a disaster.

*Outcome B — Bag renderer activates:* clicking HHA triggers a different code path than clicking PS Software. HHA is flagged as a bag node (>60 children). Click opens a modal or an in-canvas expansion that renders a scrollable grid inside a membrane outline. The spatial canvas shows HHA's membrane at the position HHA occupies, now slightly expanded — say, from 80px radius to a 400×300px membrane container — with a mini grid of 469 nodes inside. The user scrolls within the membrane to find what they need. The surrounding canvas is undisturbed.

*Outcome C — Progressive bag rendering:* HHA expands to show its immediate children only — the top-level folders inside HHA (maybe 8-12 directories). Each of those directories is also a bag node. The user drills in by clicking those, each expanding their own immediate children. No single expansion creates 469 nodes. The bag becomes navigable through the same click-to-grow interaction as the rest of the canvas, but each step is bounded.

**The question Outcome C forces:** is the algorithm responsible, or the rendering mode?

Outcome C says: the algorithm is fine, the data is the problem. 469 immediate children is the outlier, not a hypothetical edge case. The algorithm should handle a click as "show immediate children only." "469 immediate children" means something went wrong in how the filesystem was designed (flat inbox dumps), and the algorithm's job is to expose structure, not manufacture it.

Outcome B says: the rendering mode is responsible. Bags get a different renderer — the membrane grid — and the algorithm never sees 469 nodes at once.

Both can coexist: if a node has >N immediate children (not descendants — immediate children), trigger Outcome B. If it has >N descendants but <N immediate children, use Outcome C (immediate children only, each potentially a bag itself).

**This reveals:** the distinction between immediate children count and descendant count is load-bearing. A well-designed folder might have 30 immediate children, each with 5 children — 150 descendants. That's not a bag; it's a normal tree that needs several clicks to navigate. An inbox with 469 items has 469 immediate children. That IS a bag, and the immediate-children count is the right threshold, not the descendant count.

**Implication for mechanism:** `isBagNode = (immediateChildCount > threshold)` not `descendantCount > threshold`. Threshold around 40-60 immediate children. Bag nodes render as membranes with internal scrollable content when clicked. Algorithm never fans bag nodes.

---

## Scenario 5 — The Deep Drill

The user makes six clicks in succession: PS Software → Happy Human Agents → n8n Workflows → Automation Sequences → Lead Nurture Flows → Final Email Templates.

Levels 1-6. Each expansion adds 3-5 new nodes.

**Walk through the cumulative effect:**

After click 1 (PS Software, 8 children): children placed at golden-angle spiral positions from origin. The canvas shows a comfortable arrangement.

After click 2 (HHA at position (115, -80)): 6 children placed around HHA using the same formula, fanning away from origin. The fan seed angle is set to point away from the origin-to-HHA direction, so children bloom outward, away from the center. Canvas now has ~16 expanded nodes. Still legible.

After click 3 (n8n Workflows at position (195, -40)): 4 children placed around n8n Workflows. Same rule: fan away from HHA, which is away from origin. Children bloom further right. Canvas x-extent is now about 400px right of center.

After click 4 (Automation Sequences at ~(270, 10)): 3 children. Canvas x-extent ~520px.

After click 5 (Lead Nurture Flows at ~(340, 30)): 5 children. Canvas x-extent ~650px.

After click 6 (Final Email Templates at ~(420, 50)): 3 children. Canvas x-extent ~770px.

**What drifts:** the deep drill has extended the canvas dramatically in one direction. The chain PS Software → HHA → n8n → Automation → Lead Nurture → Final Email is ~770px to the right of origin. Origin is still at center. The viewport is probably 1400px wide; the chain fills half of it. The left half of the canvas is empty.

The user has traded visual balance for spatial memory. The chain reads left-to-right as a path. That's actually fine — it's legible, it shows depth, it mirrors the navigation history. A real tree grows in the direction of light; this chain grew toward the right because each click expanded away from its parent.

**What's stable:** the non-drilled branches (PS Research, PS Philosophy, PS Media) haven't moved. They're still where the user placed them yesterday. The deep drill added new nodes to the right; it didn't disturb the rest.

**The edge case:** what if the chain grows off the right edge of the viewport? Auto-pan. The viewport follows the most recently expanded node, keeping it at roughly 65% of the viewport width. The user always sees the frontier, plus the recent ancestors.

**This reveals:** the "fan away from parent" rule (bloom direction = direction from grandparent to parent, extended) is the key stability mechanism. Each generation fans away from its own origin, which means the chain naturally forms a path, and the path extends in whatever direction the first level established. The canvas is not balanced by default — it follows the user's navigation history, which is the correct behavior for a spatial memory palace.

**Implication for mechanism:** bloom direction for each expansion = normalize(parentPosition - grandparentPosition). Children fan around this axis. If grandparent is null (root click), bloom in all directions (full golden-angle spiral, no direction bias). This single rule produces the path-following behavior for deep drills while maintaining omnidirectional growth for root-level expansions.

---

## Scenario 6 — The Phototropism Dial

Imagine a slider: 0.0 = "frozen" (nothing ever moves once placed), 1.0 = "liquid" (canvas re-optimizes for phototropism after every click, all nodes flow).

**At 0.0 (fully frozen):** user clicks, new children appear at their computed positions. No existing node moves — ever. Spatial memory is absolute. But: over many expansions, early placement decisions accumulate. A wrong first click (expanding a heavy node before establishing the overall structure) can produce a permanently imbalanced canvas. There's no correction mechanism. The user has to live with their history.

**At 0.3 (light nudge):** after each click, newly placed children take their computed positions. Existing children of the same parent can shift slightly (up to 20px) if doing so would reduce overlap with the new children. Nodes more than one level away from the clicked node don't move. This is the minimum needed to handle the "tight squeeze" scenario from Scenario 2 — siblings adjust locally, cousins don't. Spatial memory for unaffected subtrees is fully preserved. This feels like natural growth: the immediately nearby leaves shift to make room for the newcomer.

**At 0.7 (living canvas):** after each click, a short physics pass (50 iterations) runs over all currently-visible nodes. The objective is not force balance — it is phototropism score (maximize A, minimize L, minimize O). Nodes drift toward higher phototropism states. Familiar nodes have shifted 30-50px from their original positions. The canvas "breathes." Users who form strong spatial memory will find this disorienting. Users who don't need to remember where things are will find it pleasantly organic.

**At 1.0 (fully liquid):** after each click, a full re-layout runs from scratch using the global phototropism objective. The resulting layout is optimal for the current expansion state. But it is unpredictable across clicks — each expansion can cause total rearrangement. There is no spatial memory. The canvas is beautiful and useless as a memory palace.

**Which feels "right"?**

0.3 is clearly right for Spatial Workspace. The product is a spatial memory palace. 0.0 is correct except when it fails (accumulated bad placement). 0.3 is the correction mechanism for 0.0's failure mode, at minimum cost to spatial memory. The dial shouldn't exist in the UI — 0.3 should be the hardcoded policy.

**The specific flavor of 0.3 that matters:** existing nodes never move unless they are direct siblings of the newly-placed nodes AND the new placement would produce overlap. Even then, the movement is small (20-30px, not 100px). The user's spatial memory of where a node lives should never be more than slightly imprecise.

**This reveals:** the phototropism objective is best used as a tie-breaker and overlap-resolver, not as the primary placement driver. Its role at 0.3 is: "after placing new nodes, nudge same-parent siblings minimally to eliminate any new overlap." That's not re-layout; that's local cleanup.

**Implication for mechanism:** after placing new children, run one pass over same-parent siblings only: for each sibling, if its bounding box intersects any new child's bounding box, compute the minimum translation that eliminates the intersection and move the sibling by that vector. Cap the translation at 30px. Don't recurse to grandchildren. This is O(sibling_count²) but sibling count is bounded (non-bag nodes have <60 children). It's fast.

---

## Scenario 7 — The Sleeping Giant

The user has been building spatial memory for six weeks. They know: PS Research is always upper-right, PS Software lower-left, PS Philosophy upper-left. It's a reliable map. Then one session, they click a folder and something feels off — the layout has drifted 5% from where it was last month.

**What caused it?**

Three suspects:

*Suspect A — The algorithm has a physics component.* Every expansion runs a physics pass. Over time, the cumulative effect of 50-iteration physics passes has walked nodes slightly from their initial golden-angle positions. Each pass is small, but 200 expansions × 50 iterations × small drift = 5% total drift. The physics pass was meant to resolve overlap, but it also introduces accumulated positional instability.

*Suspect B — New files added to the filesystem.* The watch-server detected changes. Three folders got new children. Those children were assigned next-available golden-angle slots. The new children's positions required existing children to shift slightly (the 0.3 dial was active). Over many new files added over weeks, the accumulated shifts of existing nodes have moved them by 5%.

*Suspect C — Floating-point accumulation.* Position is stored as floats. Each position save rounds to 2 decimal places. Over 200 saves and restores, rounding has accumulated. Each node has drifted ~0.5px per save cycle × 10 saves = 5px for a 100px value = 5%.

**Which is most concerning?** Suspect A. Physics is non-deterministic over time. If the algorithm has a physics component that runs every click, and that component is not purely for overlap resolution (it's also doing force simulation), then positions will drift in ways the user can't predict or reverse. This is the failure mode that turns spatial memory into spatial anxiety.

**What does the user do?** If positions are stored (from Scenario 3's lesson), the user can inspect the stored JSON and see if positions match their mental model. But realistically, they notice the drift, feel confused, and start to distrust the canvas. The spatial map is no longer reliable.

**This reveals:** the algorithm must not run a general-purpose physics simulation. It must run a targeted, bounded, deterministic overlap-resolver with a hard termination condition. The resolver should only move nodes when overlap is detected, should move them the minimum distance required, and should record the exact delta in the position store. "Did this node move, by how much, on which click?" is auditable.

**Implication for mechanism:** the overlap resolver is not a physics simulation — it's a deterministic push. If node A overlaps node B after new children are placed, push A away from B by exactly `(A.radius + B.radius - distance(A,B) + 2px)` in the direction away from B. This is one operation, not an iterative convergence. It produces the same result every time given the same inputs. No physics, no convergence, no accumulated drift.

---

## Mechanism Sketch

Based on all seven scenarios:

```
# Per-node state
node.position = {x, y}    # stored to disk, never recomputed for old nodes
node.radius = base + k * log2(leafCount + 1)  # size encoding
node.isBag = (immediateChildCount > 50)

# On click(node):
if node.isBag:
    open membrane renderer(node)  # grid inside membrane, no spatial placement
    return

children = node.immediateChildren
bloomDir = normalize(node.position - node.parent.position)
    ?? (1, 0) if node is root

for i, child in enumerate(children):
    if child.position exists:  # return visitor — don't move
        continue
    angle = atan2(bloomDir.y, bloomDir.x) + (i * GOLDEN_ANGLE)
    r = clamp(base + k * sqrt(child.leafCount), 80px, 220px)
    child.position = node.position + polar(r, angle)
    persist(child.position)

# Overlap resolution — deterministic push, one pass only
for each new child C:
    for each other visible node N within (C.radius + N.radius + 4px):
        if overlaps(C, N) and N.parent == C.parent:
            delta = pushVector(N, away from C, by overlap distance + 2px)
            N.position += clamp(delta, max=30px)
            persist(N.position)
```

Constants: `GOLDEN_ANGLE = 2.399963 rad (137.5°)`, `base = 80px`, `k = 14`, `maxRadius = 220px`, `maxPush = 30px`, `bagThreshold = 50 immediate children`.

---

## Live Questions the Scenarios Opened

Three questions none of the scenarios resolved:

**Q1 — What happens when a node's position was stored but its parent has since moved?** If the user clicks PS Software, some of its children fan out. Then a sibling of PS Software gets placed and the overlap resolver nudges PS Software 25px. PS Software's stored children now have positions that are correct relative to the old PS Software position, but incorrect relative to the new one. Does the system store absolute positions (which drift when parents move) or relative positions (which require recomputing absolute positions from the root on every render)?

**Q2 — How does the bloom direction handle the root node's children when the user has already established a full canvas?** On the first click (Scenario 1), bloom is omnidirectional — golden angle from 0°. But if the user later collapses PS Software and re-expands it, the bloom should re-use the stored positions (Scenario 3's lesson). What if the user explicitly wants a fresh expansion for PS Software because the stored positions are stale? Is there a gesture (shift-click? long-press?) to re-bloom from scratch, discarding stored positions for that subtree?

**Q3 — What is the correct `k` constant for node radius sizing?** Scenario 1 used `k = 8` informally, the mechanism sketch uses `k = 14`. These produce very different node sizes. `k = 8` with `leafCount = 469` gives radius `80 + 8 * 21.7 = 254px` (before the cap). `k = 14` gives `80 + 14 * 21.7 = 384px` (before the cap at 220px). The cap does the heavy lifting in both cases, but the size ordering for small nodes (2–20 leaves) is sensitive to k. This can't be determined by reasoning — it requires rendering the real tree and looking at whether sibling nodes with different leaf counts feel visually distinguishable. Static prototype test.

---

*End of dream agent output. Mechanism sketch and live questions are the primary outputs for the synthesis agent.*

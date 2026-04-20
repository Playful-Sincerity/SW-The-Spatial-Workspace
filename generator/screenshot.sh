#!/usr/bin/env bash
# Capture the canvas via headless Chrome. Used by Claude (and humans) to verify
# visual changes by reading the resulting PNG.
#
# Waits for `window.SW_READY === true` (set by app.js after the first render
# settles) before the capture, so the PNG is sharp rather than half-drawn.
#
# Usage:
#   ./screenshot.sh                           # 1600x1200, 15s max wait
#   ./screenshot.sh 1920 1400                 # custom dimensions
#   ./screenshot.sh 1600 1200 20              # custom dims + max wait seconds
#
# Output: /tmp/sw-canvas.png

set -euo pipefail

WIDTH="${1:-1600}"
HEIGHT="${2:-1200}"
MAX_WAIT_S="${3:-15}"
URL="${URL:-http://localhost:8765/}"
OUT="${OUT:-/tmp/sw-canvas.png}"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ ! -x "$CHROME" ] && { echo "Chrome not found at $CHROME" >&2; exit 1; }

# Confirm the live server is up first — otherwise the screenshot is blank
if ! curl -sf "${URL}__snapshot.json" > /dev/null 2>&1; then
  echo "Live server not responding at $URL — start it with:" >&2
  echo "  ./run.sh    (or: python3 generator/watch-server.py)" >&2
  exit 2
fi

rm -f "$OUT"

# Strategy: app.js sets `window.SW_READY = true` after the first render settles.
# Chrome's --virtual-time-budget advances JS timers / rAF faster than wall-clock
# so all the render work (and SW_READY) lands inside the budget, and
# --run-all-compositor-stages-before-draw forces paint to commit before capture.
BUDGET_MS=$(( (MAX_WAIT_S * 1000) + 2000 ))

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --window-size="${WIDTH},${HEIGHT}" \
  --virtual-time-budget="${BUDGET_MS}" \
  --run-all-compositor-stages-before-draw \
  --screenshot="$OUT" \
  "$URL" 2>/dev/null

if [ ! -f "$OUT" ]; then
  echo "Screenshot failed" >&2
  exit 3
fi

ls -lh "$OUT"
echo "$OUT"

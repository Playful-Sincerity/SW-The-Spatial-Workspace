#!/usr/bin/env bash
# Spatial Workspace — bootstrap + run
#
# First run: creates a config.json from config.example.json and prints a
# friendly note about where to customize roots. Then starts the watch-server,
# which generates the canvas (if needed) and serves it at http://localhost:8765.
#
# Usage:
#   ./run.sh                 # start on default port 8765
#   ./run.sh --port 9000     # custom port
#   PORT=9000 ./run.sh       # same, via env var
#
# Any extra flags are passed through to watch-server.py.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

# ── Python check ─────────────────────────────────────────────
if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 not found on PATH." >&2
  echo "Install Python 3.9+ (macOS: 'brew install python3'; any modern Linux distro already has it)." >&2
  exit 1
fi

PY_MAJOR=$(python3 -c 'import sys; print(sys.version_info[0])')
PY_MINOR=$(python3 -c 'import sys; print(sys.version_info[1])')
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 9 ]; }; then
  echo "error: python3 ≥ 3.9 required, found $PY_MAJOR.$PY_MINOR." >&2
  exit 1
fi

# ── Config bootstrap ────────────────────────────────────────
if [ ! -f "config.json" ]; then
  if [ -f "config.example.json" ]; then
    cp config.example.json config.json
    echo "• Created config.json from config.example.json."
    echo "  Edit 'roots' to point at the folders you want on the canvas,"
    echo "  then re-run ./run.sh. (Starting with the example defaults for now.)"
    echo
  else
    echo "warning: no config.json and no config.example.json — falling back to built-in defaults." >&2
  fi
fi

# ── Honor PORT env var if set ──────────────────────────────
EXTRA_ARGS=("$@")
if [ -n "${PORT:-}" ] && ! printf '%s\n' "${EXTRA_ARGS[@]}" | grep -q -- '--port'; then
  EXTRA_ARGS+=("--port" "$PORT")
fi

# ── Go ─────────────────────────────────────────────────────
exec python3 generator/watch-server.py --config config.json "${EXTRA_ARGS[@]}"

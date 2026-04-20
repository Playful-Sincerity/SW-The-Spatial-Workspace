#!/usr/bin/env python3
"""
Spatial Workspace — Watch & Serve

Serves the ecosystem canvas at http://localhost:PORT and watches the
filesystem for markdown changes. When changes are detected (debounced),
re-runs generate-ecosystem.py and the open canvas auto-reloads.

The canvas polls /__snapshot.json every 2s for the current generation hash.
When the hash changes, it triggers a soft page reload.

Usage:
  python3 generator/watch-server.py [--port 8765] [--interval 5]

Options:
  --port      HTTP port (default 8765)
  --interval  Filesystem poll interval in seconds (default 5)
  --no-open   Skip opening the browser

Stdlib-only. No external dependencies.
"""

import argparse
import hashlib
import http.server
import json
import os
import socketserver
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))
from config import load_config, ConfigError  # noqa: E402

# ── Config ────────────────────────────────────────────────────────────────────

HOME = Path.home()
SPEC_DIR = SCRIPT_DIR.parent
GENERATOR = SCRIPT_DIR / "generate-ecosystem.py"
OUTPUT = HOME / "ecosystem-canvas.html"

# Populated at startup from the loaded config.
WATCH_ROOTS = []
EXCLUDE_DIRS = set()
CONFIG_PATH = None  # path forwarded to the generator, or None for defaults
TEMPLATE_PATH = None  # template directory forwarded to the generator (None → generator default = v2/)

# ── State ─────────────────────────────────────────────────────────────────────

state = {
    "snapshot_hash": None,
    "generated_at": 0,
    "last_signature": None,
    "regen_in_progress": False,
    "regen_lock": threading.Lock(),
}


# ── Snapshot / Signature ──────────────────────────────────────────────────────

def fs_signature(roots, max_files=50000):
    """
    Build a lightweight signature of all .md file mtimes. Cheap to compute,
    changes whenever any tracked markdown file changes.
    """
    h = hashlib.sha256()
    count = 0
    for root in roots:
        if not root.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            # Skip excluded dirs in-place so os.walk doesn't descend
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith(".")]

            for name in filenames:
                if not name.endswith(".md"):
                    continue
                path = os.path.join(dirpath, name)
                try:
                    mtime = os.path.getmtime(path)
                    size = os.path.getsize(path)
                    h.update(f"{path}|{mtime}|{size}\n".encode("utf-8"))
                    count += 1
                    if count > max_files:
                        h.update(b"<TRUNCATED>")
                        return h.hexdigest()
                except OSError:
                    pass
    return h.hexdigest()


def output_hash():
    """Hash of the actual output file — used for the snapshot."""
    if not OUTPUT.exists():
        return None
    h = hashlib.sha256()
    with open(OUTPUT, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ── Regeneration ──────────────────────────────────────────────────────────────

def regenerate():
    if state["regen_in_progress"]:
        return False

    with state["regen_lock"]:
        state["regen_in_progress"] = True
        print(f"[{time.strftime('%H:%M:%S')}] Regenerating ecosystem canvas...", flush=True)
        cmd = [sys.executable, str(GENERATOR)]
        if CONFIG_PATH:
            cmd += ["--config", str(CONFIG_PATH)]
        if TEMPLATE_PATH:
            cmd += ["--template", str(TEMPLATE_PATH), "--output", str(OUTPUT)]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
            )
            if result.returncode != 0:
                print(f"  ✗ Generator failed:\n{result.stderr}", flush=True)
                return False

            state["snapshot_hash"] = output_hash()
            state["generated_at"] = time.time()
            print(f"  ✓ Done. Snapshot {state['snapshot_hash'][:12]}", flush=True)
            return True
        except subprocess.TimeoutExpired:
            print("  ✗ Generator timed out (>5min)", flush=True)
            return False
        finally:
            state["regen_in_progress"] = False


# ── Watch Loop ────────────────────────────────────────────────────────────────

def watch_loop(interval):
    print(f"[watch] Polling every {interval}s. Watching:", flush=True)
    for r in WATCH_ROOTS:
        marker = "✓" if r.exists() else "✗"
        print(f"  {marker} {r}", flush=True)

    state["last_signature"] = fs_signature(WATCH_ROOTS)

    while True:
        try:
            time.sleep(interval)
            sig = fs_signature(WATCH_ROOTS)
            if sig != state["last_signature"]:
                print(f"[watch] Filesystem changed.", flush=True)
                state["last_signature"] = sig
                regenerate()
        except KeyboardInterrupt:
            return
        except Exception as e:
            print(f"[watch] Error: {e}", flush=True)


# ── HTTP Server ───────────────────────────────────────────────────────────────

class CanvasHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Quiet mode — only print our own logs
        return

    def do_GET(self):
        if self.path.startswith("/__snapshot.json"):
            self._serve_snapshot()
        elif self.path == "/" or self.path == "/index.html":
            self._serve_canvas()
        else:
            self.send_error(404)

    def _serve_snapshot(self):
        payload = json.dumps({
            "hash": state["snapshot_hash"],
            "generated_at": state["generated_at"],
            "regen_in_progress": state["regen_in_progress"],
        }).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload)

    def _serve_canvas(self):
        if not OUTPUT.exists():
            self.send_error(503, "Canvas not generated yet — wait a moment")
            return

        with open(OUTPUT, "rb") as f:
            data = f.read()

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    global WATCH_ROOTS, EXCLUDE_DIRS, CONFIG_PATH, TEMPLATE_PATH, OUTPUT

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--interval", type=float, default=5.0)
    parser.add_argument("--no-open", action="store_true")
    parser.add_argument("--config", help="Path to config.json (defaults to ./config.json, then built-in).")
    parser.add_argument("--template", help="Template directory (e.g. templates/v2-dynamic-alt). Defaults to generator's built-in v2/.")
    parser.add_argument("--output", help="Output HTML path. Defaults to ~/ecosystem-canvas.html, or auto-named from --template if that's set.")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except ConfigError as e:
        print(f"[config] {e}", file=sys.stderr)
        sys.exit(1)

    if args.config:
        CONFIG_PATH = str(Path(args.config).expanduser().resolve())
    elif (Path.cwd() / "config.json").exists():
        CONFIG_PATH = str((Path.cwd() / "config.json").resolve())
    else:
        CONFIG_PATH = None  # generator will pick up built-in fallback

    if args.template:
        TEMPLATE_PATH = str(Path(args.template).expanduser().resolve())
        # Auto-name output from the template directory name if --output wasn't given
        if args.output:
            OUTPUT = Path(args.output).expanduser().resolve()
        else:
            template_name = Path(args.template).name  # e.g. "v2-dynamic-alt"
            if template_name == "v2":
                OUTPUT = HOME / "ecosystem-canvas.html"
            else:
                suffix = template_name.replace("v2-", "")  # e.g. "dynamic-alt"
                OUTPUT = HOME / f"ecosystem-canvas-{suffix}.html"
    elif args.output:
        OUTPUT = Path(args.output).expanduser().resolve()

    WATCH_ROOTS = [Path(r["path"]) for r in cfg["roots"]]
    EXCLUDE_DIRS = set(cfg.get("exclude", [])) | {".git", ".DS_Store"}

    # Initial generation if missing or stale
    if not OUTPUT.exists():
        print("No existing canvas — generating now.", flush=True)
        regenerate()
    else:
        state["snapshot_hash"] = output_hash()
        state["generated_at"] = OUTPUT.stat().st_mtime
        print(f"Reusing existing canvas (snapshot {state['snapshot_hash'][:12]})", flush=True)

    # Start watcher thread
    watcher = threading.Thread(target=watch_loop, args=(args.interval,), daemon=True)
    watcher.start()

    # Start server
    url = f"http://localhost:{args.port}"
    print(f"\n  Spatial Workspace — Live\n  Serving {OUTPUT.name} at {url}\n", flush=True)

    if not args.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()

    server = ThreadedServer(("127.0.0.1", args.port), CanvasHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[server] Shutting down.", flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()

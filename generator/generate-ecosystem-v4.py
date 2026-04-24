#!/usr/bin/env python3
"""
Spatial Workspace — Ecosystem Canvas Generator (v4-multifile)

Variant of generate-ecosystem.py that loads multiple text filetypes (not just
.md) so the canvas can render code, configs, and other text content. Starts
narrow with Python — other Tier A types (.js/.ts/.json/.yaml/...) land next.

Also inlines highlight.js + theme so the reader can syntax-highlight code.

Keep in sync with generate-ecosystem.py on bug fixes until v4 is either
promoted back to v2 or graduates to its own long-lived substrate.
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

# Local import — `config.py` lives next to this file.
SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))
from config import load_config, ConfigError  # noqa: E402


# ── Paths ─────────────────────────────────────────────────────────────────────

HOME = Path.home()
PROJECT_ROOT = SCRIPT_DIR.parent
TEMPLATE_DIR = PROJECT_ROOT / "templates" / "v4-multifile"

DEFAULT_OUTPUT = HOME / "ecosystem-canvas-v4-multifile.html"


# ── Constants ─────────────────────────────────────────────────────────────────

EXCLUDE_EXTENSIONS = {
    ".pyc", ".class", ".o", ".so", ".dylib", ".exe",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".heic", ".webp",
    ".mp4", ".mov", ".mp3", ".wav", ".m4a",
    ".pdf", ".zip", ".tar", ".gz", ".dmg", ".tgz",
    ".xlsx", ".xls", ".numbers", ".csv",
    ".docx", ".doc", ".pptx",
    ".json", ".jsonl", ".yaml", ".yml", ".toml", ".lock",
    ".sh", ".py", ".js", ".ts", ".css", ".html", ".lean",
    ".txt", ".log",
}

MAX_CONTENT_SIZE = 500 * 1024  # 500 KB

# Map extension → (kind, hljs-language). `kind` is what the app.js renderer
# dispatches on; `lang` is the CSS class highlight.js uses (null for markdown).
# hljs "common" bundle covers the languages listed here; tsx/jsx fall back to
# ts/js (no JSX-aware highlighting but legible); toml uses ini (close enough).
KIND_MAP = {
    # Docs
    ".md":         ("markdown", None),
    # Scripting & general-purpose code
    ".py":         ("code", "python"),
    ".js":         ("code", "javascript"),
    ".mjs":        ("code", "javascript"),
    ".cjs":        ("code", "javascript"),
    ".jsx":        ("code", "javascript"),
    ".ts":         ("code", "typescript"),
    ".tsx":        ("code", "typescript"),
    ".rb":         ("code", "ruby"),
    ".rs":         ("code", "rust"),
    ".go":         ("code", "go"),
    ".java":       ("code", "java"),
    ".kt":         ("code", "kotlin"),
    ".swift":      ("code", "swift"),
    ".lua":        ("code", "lua"),
    ".c":          ("code", "cpp"),
    ".cpp":        ("code", "cpp"),
    ".cc":         ("code", "cpp"),
    ".h":          ("code", "cpp"),
    ".hpp":        ("code", "cpp"),
    ".sh":         ("code", "bash"),
    ".bash":       ("code", "bash"),
    ".zsh":        ("code", "bash"),
    ".sql":        ("code", "sql"),
    ".r":          ("code", "r"),
    ".lean":       ("code", None),  # no hljs grammar — plain monospace
    # Markup / styling
    ".html":       ("code", "xml"),
    ".htm":        ("code", "xml"),
    ".xml":        ("code", "xml"),
    ".svg":        ("code", "xml"),  # SVG is XML; for now render as code (Tier B image renderer lands next)
    ".css":        ("code", "css"),
    ".scss":       ("code", "scss"),
    ".less":       ("code", "less"),
    # Config / data (as code)
    ".json":       ("code", "json"),
    ".jsonl":      ("code", "json"),
    ".ndjson":     ("code", "json"),
    ".yaml":       ("code", "yaml"),
    ".yml":        ("code", "yaml"),
    ".toml":       ("code", "ini"),
    ".ini":        ("code", "ini"),
    ".conf":       ("code", "ini"),
    # Plain text
    ".txt":        ("code", None),
    ".log":        ("code", None),
    ".csv":        ("code", None),
    ".tsv":        ("code", None),
    # Images — metadata only, fetched on-demand via watch-server /file endpoint.
    # .svg stays in the code/xml slot above so folders of icons read as text.
    ".png":        ("image", None),
    ".jpg":        ("image", None),
    ".jpeg":       ("image", None),
    ".gif":        ("image", None),
    ".webp":       ("image", None),
    ".ico":        ("image", None),
    ".bmp":        ("image", None),
    ".heic":       ("image", None),
    ".heif":       ("image", None),
    # PDFs — metadata only, rendered via <iframe src="/file...">.
    ".pdf":        ("pdf", None),
}

CONTENT_EXTENSIONS = set(KIND_MAP.keys())
# Kinds that should NOT have file content embedded in the payload.
NON_TEXT_KINDS = {"image", "pdf"}


def detect_kind(ext):
    """Return (kind, lang) for a given file extension, defaulting to markdown."""
    return KIND_MAP.get(ext.lower(), ("markdown", None))

# [text](target) — captures text and target. Targets can be relative/absolute
# paths or URLs. Exclude images (leading !) at the start. Non-greedy on text.
MD_LINK_RE = re.compile(r"(?<!\!)\[([^\]]+)\]\(([^)]+)\)")


# ── Minimal YAML Parser ───────────────────────────────────────────────────────

def parse_status_yaml(path):
    """Parse project-status.yaml — flat list of dicts with simple key: value pairs."""
    path = Path(path) if path else None
    if not path or not path.exists():
        return []

    projects = []
    current = {}

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            if stripped.startswith("- "):
                if current:
                    projects.append(current)
                current = {}
                stripped = stripped[2:]

            if ":" in stripped:
                key, _, value = stripped.partition(":")
                key = key.strip()
                value = value.strip()
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                if value == "null":
                    value = None
                elif value == "[]":
                    value = []
                elif value.startswith("[") and value.endswith("]"):
                    inner = value[1:-1]
                    value = [v.strip() for v in inner.split(",") if v.strip()]
                current[key] = value

    if current:
        projects.append(current)

    return projects


# ── Tree Building ─────────────────────────────────────────────────────────────

def _make_skip_predicates(exclude_dirs):
    exclude_set = set(exclude_dirs)

    def should_skip_dir(name):
        return name in exclude_set or name.startswith(".")

    def should_skip_file(name):
        return name.startswith(".") or name == ".DS_Store"

    return should_skip_dir, should_skip_file


def extract_cross_links(content, source_path, project_root):
    """
    Extract [text](path) markdown links from file content.

    Returns a list of CrossLink dicts with source (absolute path of the file
    containing the link), label, target (resolved absolute path, or None for
    external URLs / unresolvable), and ~80 chars of context. v2 frontend
    doesn't render these; v3 will draw them as subtle background curves.
    """
    links = []
    if not content:
        return links

    source_dir = Path(source_path).parent

    for match in MD_LINK_RE.finditer(content):
        label = match.group(1).strip()
        target_raw = match.group(2).strip()

        # Strip trailing title like (path "title") — keep path portion only
        if " " in target_raw:
            target_raw = target_raw.split(" ", 1)[0]

        # Skip anchor-only links and pure URLs for resolved target
        resolved = None
        if target_raw.startswith(("http://", "https://", "mailto:", "#")):
            resolved = None
        else:
            # Strip any #anchor fragment
            path_portion = target_raw.split("#", 1)[0].strip()
            if path_portion:
                # Resolve relative to the file's directory; expand ~; keep absolute as-is
                candidate = Path(os.path.expanduser(path_portion))
                if not candidate.is_absolute():
                    candidate = (source_dir / candidate).resolve()
                # Don't require the file to exist — v3 will handle broken links
                resolved = str(candidate)

        # Context: ~80 chars surrounding the link
        start = max(0, match.start() - 40)
        end = min(len(content), match.end() + 40)
        context = content[start:end].replace("\n", " ").strip()

        links.append({
            "source": str(source_path),
            "target": resolved,
            "label": label,
            "context": context,
        })

    return links


def scan_directory(path, should_skip_dir, should_skip_file, cross_links, depth=0, max_depth=10):
    """Recursively scan a directory, building a tree node. Populates cross_links as a side effect."""
    if depth > max_depth:
        return None

    node = {
        "name": path.name,
        "path": str(path),
        "type": "directory",
        "children": [],
        "meta": {},
    }
    try:
        node["meta"]["mtime"] = path.stat().st_mtime
    except OSError:
        pass

    try:
        entries = sorted(path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return node

    for entry in entries:
        if entry.is_dir():
            if should_skip_dir(entry.name):
                continue
            child = scan_directory(entry, should_skip_dir, should_skip_file, cross_links, depth + 1, max_depth)
            if child and (child.get("children") or child.get("type") == "file"):
                node["children"].append(child)

        elif entry.is_file():
            if should_skip_file(entry.name):
                continue
            ext = entry.suffix.lower()
            if ext not in CONTENT_EXTENSIONS:
                continue

            kind, lang = detect_kind(ext)
            file_node = {
                "name": entry.name,
                "path": str(entry),
                "type": "file",
                "children": [],
                "meta": {"kind": kind, "ext": ext},
            }
            if lang:
                file_node["meta"]["lang"] = lang

            try:
                stat = entry.stat()
                file_node["meta"]["size"] = stat.st_size
                file_node["meta"]["lines"] = None
                file_node["meta"]["mtime"] = stat.st_mtime

                # Optimization A (2026-04-23): never embed content in the payload.
                # Frontend fetches text on demand from the watch-server's /content
                # endpoint when a tab is opened. Cross-link extraction + line count
                # still happen at scan time (free metadata) — only the content
                # string is excluded from the embedded JSON.
                file_node["content"] = None
                if kind in NON_TEXT_KINDS:
                    pass  # binary, never had content embedded — endpoint serves bytes
                elif stat.st_size <= MAX_CONTENT_SIZE:
                    try:
                        content = entry.read_text(encoding="utf-8", errors="replace")
                        file_node["meta"]["lines"] = content.count("\n") + 1
                        if kind == "markdown":
                            cross_links.extend(extract_cross_links(content, entry, path))
                    except (PermissionError, OSError, UnicodeDecodeError):
                        pass
                else:
                    file_node["meta"]["too_large"] = True
            except (PermissionError, OSError):
                file_node["content"] = None

            node["children"].append(file_node)

    return node


def rollup_mtime(node):
    """Set each directory's mtime to the max of its descendants' mtimes.
    Filesystem dir mtime only reflects direct-child adds/removes, which
    isn't useful; what we want is 'when was any descendant last touched.'"""
    own = node.get("meta", {}).get("mtime") or 0
    max_m = own
    for child in node.get("children", []):
        rollup_mtime(child)
        cm = child.get("meta", {}).get("mtime") or 0
        if cm > max_m:
            max_m = cm
    if max_m > 0:
        node.setdefault("meta", {})["mtime"] = max_m


def count_nodes(node):
    count = 1
    for child in node.get("children", []):
        count += count_nodes(child)
    return count


def count_files_with_content(node):
    count = 0
    if node.get("type") == "file" and node.get("content"):
        count = 1
    for child in node.get("children", []):
        count += count_files_with_content(child)
    return count


# ── Status Integration ────────────────────────────────────────────────────────

def attach_status(tree, status_projects):
    """Attach phase/momentum from a status YAML to matching directory nodes."""
    status_map = {}
    for proj in status_projects:
        proj_path = proj.get("path", "")
        if proj_path:
            expanded = os.path.expanduser(proj_path).rstrip("/")
            status_map[expanded] = proj

    def _attach(node):
        node_path = node.get("path", "").rstrip("/")
        if node_path in status_map:
            proj = status_map[node_path]
            node["meta"]["phase"] = proj.get("phase")
            node["meta"]["momentum"] = proj.get("momentum")
            node["meta"]["project_name"] = proj.get("name")
            node["meta"]["next_action"] = proj.get("next_action")
            node["meta"]["cluster"] = proj.get("cluster")
        for child in node.get("children", []):
            _attach(child)

    _attach(tree)


# ── Ecosystem Tree Assembly ───────────────────────────────────────────────────

def build_ecosystem_tree(cfg, cross_links):
    should_skip_dir, should_skip_file = _make_skip_predicates(cfg["exclude"])

    root = {
        "name": cfg["label"],
        "path": str(HOME),
        "type": "directory",
        "children": [],
        "meta": {},
    }

    for root_cfg in cfg["roots"]:
        label = root_cfg["name"]
        path = Path(root_cfg["path"])
        if not path.exists():
            print(f"  ⚠ Skipping missing root '{label}' at {path}", file=sys.stderr)
            continue
        print(f"  Scanning {label}...", file=sys.stderr)
        branch = scan_directory(path, should_skip_dir, should_skip_file, cross_links)
        if branch:
            branch["name"] = label
            root["children"].append(branch)

    return root


# ── HTML Assembly ─────────────────────────────────────────────────────────────

SCRIPT_RE = re.compile(r"</([sS][cC][rR][iI][pP][tT])")


def escape_for_script_tag(text):
    """Prevent embedded `</script>` sequences from closing the <script> tag."""
    return SCRIPT_RE.sub(r"<\\/\1", text)


def assemble_html(ecosystem_json_safe, config_json_safe, template_dir, output_path):
    """Concatenate template + css + js + libs + data into one self-contained HTML."""
    template = (template_dir / "template.html").read_text(encoding="utf-8")
    app_css = (template_dir / "app.css").read_text(encoding="utf-8")
    app_js = (template_dir / "app.js").read_text(encoding="utf-8")
    d3_code = (template_dir / "d3.min.js").read_text(encoding="utf-8")
    marked_code = (template_dir / "marked.min.js").read_text(encoding="utf-8")
    hljs_code = (template_dir / "hljs.min.js").read_text(encoding="utf-8")
    hljs_theme = (template_dir / "hljs-theme.css").read_text(encoding="utf-8")

    html = template
    html = html.replace("/* __APP_CSS__ */", app_css)
    html = html.replace("/* __HLJS_THEME__ */", hljs_theme)
    html = html.replace("/* __APP_JS__ */", app_js)
    html = html.replace("/* __D3_LIB__ */", d3_code)
    html = html.replace("/* __MARKED_LIB__ */", marked_code)
    html = html.replace("/* __HLJS_LIB__ */", hljs_code)
    html = html.replace("/* __CONFIG__ */", f"const CONFIG = {config_json_safe};")
    html = html.replace(
        "/* __ECOSYSTEM_DATA__ */",
        f"const ECOSYSTEM_DATA = {ecosystem_json_safe};",
    )

    output_path.write_text(html, encoding="utf-8")
    return output_path.stat().st_size


# ── Config sanitization for embedding ─────────────────────────────────────────

def _frontend_config(cfg):
    """Drop internal fields before embedding in the HTML."""
    return {
        "label": cfg["label"],
        "roots": [{"name": r["name"], "path": r["path"]} for r in cfg["roots"]],
        "branchColors": cfg.get("branchColors", {}),
        "statusColors": cfg.get("statusColors", {}),
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate the Spatial Workspace canvas HTML.")
    parser.add_argument("--config", help="Path to config.json (defaults to ./config.json, then built-in).")
    parser.add_argument("--output", help=f"Output HTML path (default: {DEFAULT_OUTPUT}).")
    parser.add_argument("--template", help=f"Template directory (default: {TEMPLATE_DIR}).")
    args = parser.parse_args()

    output = Path(os.path.expanduser(args.output)) if args.output else DEFAULT_OUTPUT
    template_dir = Path(os.path.expanduser(args.template)) if args.template else TEMPLATE_DIR

    start = time.time()
    print("Spatial Workspace — Ecosystem Canvas Generator (v4-multifile)", file=sys.stderr)
    print("=" * 52, file=sys.stderr)

    # [1/5] Load config
    print("\n[1/5] Loading config...", file=sys.stderr)
    try:
        cfg = load_config(args.config)
    except ConfigError as e:
        print(f"  ✗ {e}", file=sys.stderr)
        sys.exit(1)
    print(f"  Label: {cfg['label']}", file=sys.stderr)
    print(f"  Roots: {len(cfg['roots'])}", file=sys.stderr)

    # [2/5] Parse status YAML (optional)
    print("\n[2/5] Parsing project status...", file=sys.stderr)
    status_projects = parse_status_yaml(cfg.get("statusYaml"))
    print(f"  Found {len(status_projects)} projects in status YAML", file=sys.stderr)

    # [3/5] Scan filesystem + extract cross-links
    print("\n[3/5] Scanning filesystem...", file=sys.stderr)
    cross_links = []
    tree = build_ecosystem_tree(cfg, cross_links)
    total_nodes = count_nodes(tree)
    files_with_content = count_files_with_content(tree)
    print(f"  Total nodes: {total_nodes}", file=sys.stderr)
    print(f"  Files with content: {files_with_content}", file=sys.stderr)
    print(f"  Cross-links extracted: {len(cross_links)}", file=sys.stderr)

    # [4/5] Attach status data + roll up mtimes for directories
    print("\n[4/5] Attaching project status...", file=sys.stderr)
    attach_status(tree, status_projects)
    rollup_mtime(tree)

    # [5/5] Assemble HTML
    print("\n[5/5] Assembling HTML...", file=sys.stderr)
    payload = {"tree": tree, "crossLinks": cross_links}
    data_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    config_json = json.dumps(_frontend_config(cfg), ensure_ascii=False, separators=(",", ":"))
    print(f"  JSON data size: {len(data_json) / 1024 / 1024:.1f} MB", file=sys.stderr)

    output_size = assemble_html(
        escape_for_script_tag(data_json),
        escape_for_script_tag(config_json),
        template_dir,
        output,
    )
    elapsed = time.time() - start

    print(f"\n{'=' * 52}", file=sys.stderr)
    print(f"Output: {output}", file=sys.stderr)
    print(f"Size: {output_size / 1024 / 1024:.1f} MB", file=sys.stderr)
    print(f"Time: {elapsed:.1f}s", file=sys.stderr)
    print(f"Nodes: {total_nodes} | Files: {files_with_content} | Cross-links: {len(cross_links)}", file=sys.stderr)


if __name__ == "__main__":
    main()

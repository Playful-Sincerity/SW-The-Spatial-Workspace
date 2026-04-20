"""
Spatial Workspace — Config Loader

Loads and validates config.json for the generator. Stdlib-only (json, pathlib).

Schema (camelCase JSON):
  {
    "label":        "string — root node display label",
    "roots":        [{"name": "string", "path": "string (supports ~)"}],
    "branchColors": {"<rootName>": "#hex"},
    "statusColors": {"active": "#hex", "building": "#hex", ...},
    "statusYaml":   "optional path to a project-status.yaml-style file, or null",
    "exclude":      ["array of directory names to skip during scan"]
  }

Missing config.json → falls back to a built-in default mirroring v1's hardcoded
paths so Wisdom's existing canvas keeps working without changes.

Missing root paths → warn to stderr, include anyway (skipped at scan time).
"""

import json
import sys
from pathlib import Path


REQUIRED_FIELDS = ("label", "roots")

DEFAULT_EXCLUDE = [
    ".git", "node_modules", "__pycache__", ".lake", ".venv", "venv",
    ".next", ".vercel", "dist", "build", ".cache", ".Trash",
    "Trash", ".DS_Store", ".claude", ".github",
]

DEFAULT_STATUS_COLORS = {
    "active":   "#1A9E5A",
    "building": "#D97706",
    "design":   "#4B7FCC",
    "concept":  "#9E9E9E",
    "paused":   "#B45309",
}


class ConfigError(ValueError):
    """Raised when config.json is structurally invalid."""


def _expand(p):
    return str(Path(p).expanduser())


def _fallback_config():
    """v1's hardcoded paths, used when no config.json exists."""
    home = Path.home()
    return {
        "label": "Playful Sincerity Digital Core",
        "roots": [
            {"name": "Playful Sincerity", "path": str(home / "Playful Sincerity")},
            {"name": "Claude System",     "path": str(home / "claude-system")},
            {"name": "Wisdom Personal",   "path": str(home / "Wisdom Personal")},
        ],
        "branchColors": {
            "Playful Sincerity": "#764AE2",
            "Claude System":     "#5A9E6F",
            "Wisdom Personal":   "#D97706",
        },
        "statusColors": dict(DEFAULT_STATUS_COLORS),
        "statusYaml": str(home / "claude-system" / "docs" / "project-status.yaml"),
        "exclude": list(DEFAULT_EXCLUDE),
    }


def _validate(cfg, source):
    if not isinstance(cfg, dict):
        raise ConfigError(f"{source}: top-level must be an object, got {type(cfg).__name__}")

    for field in REQUIRED_FIELDS:
        if field not in cfg:
            raise ConfigError(f"{source}: missing required field '{field}'")

    if not isinstance(cfg["label"], str) or not cfg["label"].strip():
        raise ConfigError(f"{source}: 'label' must be a non-empty string")

    if not isinstance(cfg["roots"], list) or not cfg["roots"]:
        raise ConfigError(f"{source}: 'roots' must be a non-empty array")

    for i, r in enumerate(cfg["roots"]):
        if not isinstance(r, dict) or "name" not in r or "path" not in r:
            raise ConfigError(f"{source}: roots[{i}] must be an object with 'name' and 'path'")
        if not isinstance(r["name"], str) or not r["name"].strip():
            raise ConfigError(f"{source}: roots[{i}].name must be a non-empty string")
        if not isinstance(r["path"], str) or not r["path"].strip():
            raise ConfigError(f"{source}: roots[{i}].path must be a non-empty string")

    for key in ("branchColors", "statusColors"):
        if key in cfg and not isinstance(cfg[key], dict):
            raise ConfigError(f"{source}: '{key}' must be an object")

    if "exclude" in cfg and not isinstance(cfg["exclude"], list):
        raise ConfigError(f"{source}: 'exclude' must be an array")

    if "statusYaml" in cfg and cfg["statusYaml"] is not None and not isinstance(cfg["statusYaml"], str):
        raise ConfigError(f"{source}: 'statusYaml' must be a string or null")


def _normalize(cfg):
    """Expand ~ in paths; fill defaults; warn on missing root paths."""
    for r in cfg["roots"]:
        r["path"] = _expand(r["path"])
        if not Path(r["path"]).exists():
            print(
                f"[config] warning: root '{r['name']}' path does not exist: {r['path']}",
                file=sys.stderr,
            )

    if cfg.get("statusYaml"):
        cfg["statusYaml"] = _expand(cfg["statusYaml"])

    cfg.setdefault("branchColors", {})
    merged_status = dict(DEFAULT_STATUS_COLORS)
    merged_status.update(cfg.get("statusColors") or {})
    cfg["statusColors"] = merged_status
    cfg.setdefault("exclude", list(DEFAULT_EXCLUDE))
    cfg.setdefault("statusYaml", None)

    return cfg


def load_config(path=None):
    """
    Load a config. If `path` is provided, it must exist and parse as JSON.
    If `path` is None, look for `./config.json`. If missing, fall back to v1
    defaults and print a one-line notice.
    """
    if path is not None:
        p = Path(path).expanduser()
        if not p.exists():
            raise ConfigError(f"config not found: {p}")
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise ConfigError(f"{p}: invalid JSON — {e}")
        _validate(raw, str(p))
        return _normalize(raw)

    default = Path.cwd() / "config.json"
    if default.exists():
        try:
            raw = json.loads(default.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise ConfigError(f"{default}: invalid JSON — {e}")
        _validate(raw, str(default))
        return _normalize(raw)

    print(
        "[config] no config.json found — using built-in defaults (Wisdom's v1 paths). "
        "Copy config.example.json to config.json to customize.",
        file=sys.stderr,
    )
    return _normalize(_fallback_config())

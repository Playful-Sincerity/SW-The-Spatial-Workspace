"""Tests for generator/config.py — load_config, validation, normalization.

Uses stdlib unittest (no pytest dependency) to match the project's
stdlib-only constraint. Run with:

    python3 -m unittest tests.test_config
    # or, from tests/:
    python3 -m unittest test_config
"""

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "generator"))

from config import (  # noqa: E402
    ConfigError,
    DEFAULT_STATUS_COLORS,
    _fallback_config,
    load_config,
)


def _valid_payload():
    return {
        "label": "Test Vault",
        "roots": [{"name": "Notes", "path": "~/notes"}],
        "branchColors": {"Notes": "#764AE2"},
        "statusColors": {"active": "#00FF00"},
        "statusYaml": None,
        "exclude": [".git"],
    }


class _TmpCase(unittest.TestCase):
    """Base class providing a fresh tmp dir per test + a helper to write configs."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self._orig_cwd = Path.cwd()

    def tearDown(self):
        os.chdir(self._orig_cwd)
        self._tmp.cleanup()

    def write_config(self, payload, name="config.json"):
        p = self.tmp / name
        if isinstance(payload, str):
            p.write_text(payload, encoding="utf-8")
        else:
            p.write_text(json.dumps(payload), encoding="utf-8")
        return p

    def load_silently(self, *args, **kwargs):
        """Swallow stderr warnings during load."""
        with redirect_stderr(io.StringIO()):
            return load_config(*args, **kwargs)


# ── Load paths ────────────────────────────────────────────────────────────────

class LoadPathsTests(_TmpCase):

    def test_explicit_path_ok(self):
        p = self.write_config(_valid_payload())
        cfg = self.load_silently(p)
        self.assertEqual(cfg["label"], "Test Vault")
        self.assertEqual(cfg["roots"][0]["name"], "Notes")
        self.assertEqual(cfg["roots"][0]["path"], os.path.expanduser("~/notes"))

    def test_explicit_missing_path_raises(self):
        missing = self.tmp / "nope.json"
        with self.assertRaisesRegex(ConfigError, "config not found"):
            load_config(missing)

    def test_invalid_json_raises(self):
        p = self.write_config("{ not json")
        with self.assertRaisesRegex(ConfigError, "invalid JSON"):
            load_config(p)

    def test_no_config_falls_back(self):
        os.chdir(self.tmp)
        cfg = self.load_silently(None)
        self.assertEqual(cfg["label"], _fallback_config()["label"])
        self.assertEqual(len(cfg["roots"]), len(_fallback_config()["roots"]))

    def test_cwd_config_picked_up(self):
        self.write_config(_valid_payload())
        os.chdir(self.tmp)
        cfg = self.load_silently(None)
        self.assertEqual(cfg["label"], "Test Vault")


# ── Validation ────────────────────────────────────────────────────────────────

class ValidationTests(_TmpCase):

    def test_missing_label_raises(self):
        payload = _valid_payload()
        del payload["label"]
        p = self.write_config(payload)
        with self.assertRaisesRegex(ConfigError, "missing required field 'label'"):
            load_config(p)

    def test_missing_roots_raises(self):
        payload = _valid_payload()
        del payload["roots"]
        p = self.write_config(payload)
        with self.assertRaisesRegex(ConfigError, "missing required field 'roots'"):
            load_config(p)

    def test_empty_roots_raises(self):
        payload = _valid_payload()
        payload["roots"] = []
        p = self.write_config(payload)
        with self.assertRaisesRegex(ConfigError, "non-empty array"):
            load_config(p)

    def test_root_missing_fields_raises(self):
        payload = _valid_payload()
        payload["roots"] = [{"name": "Just a name"}]
        p = self.write_config(payload)
        with self.assertRaisesRegex(ConfigError, "object with 'name' and 'path'"):
            load_config(p)

    def test_bad_top_level_type_raises(self):
        p = self.tmp / "config.json"
        p.write_text("[]", encoding="utf-8")
        with self.assertRaisesRegex(ConfigError, "top-level must be an object"):
            load_config(p)


# ── Normalization ─────────────────────────────────────────────────────────────

class NormalizationTests(_TmpCase):

    def test_tilde_expansion(self):
        payload = _valid_payload()
        payload["roots"] = [{"name": "Home", "path": "~"}]
        p = self.write_config(payload)
        cfg = self.load_silently(p)
        self.assertEqual(cfg["roots"][0]["path"], str(Path.home()))

    def test_status_colors_merged_with_defaults(self):
        payload = _valid_payload()
        payload["statusColors"] = {"active": "#000000"}
        p = self.write_config(payload)
        cfg = self.load_silently(p)
        self.assertEqual(cfg["statusColors"]["active"], "#000000")
        for key in DEFAULT_STATUS_COLORS:
            self.assertIn(key, cfg["statusColors"])

    def test_missing_root_path_warns_not_fails(self):
        payload = _valid_payload()
        payload["roots"] = [{"name": "Ghost", "path": str(self.tmp / "does-not-exist")}]
        p = self.write_config(payload)
        buf = io.StringIO()
        with redirect_stderr(buf):
            cfg = load_config(p)
        self.assertIn("does not exist", buf.getvalue())
        self.assertEqual(cfg["roots"][0]["name"], "Ghost")

    def test_defaults_applied_when_optional_fields_missing(self):
        payload = {
            "label": "Minimal",
            "roots": [{"name": "X", "path": str(self.tmp)}],
        }
        p = self.write_config(payload)
        cfg = self.load_silently(p)
        self.assertEqual(cfg["branchColors"], {})
        self.assertIsNone(cfg["statusYaml"])
        self.assertIn(".git", cfg["exclude"])
        self.assertEqual(cfg["statusColors"], DEFAULT_STATUS_COLORS)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Backward-compatible entry — see ingestion_probe_suite.py."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ingestion_probe_suite import main

if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Backward-compatible entry — delegates to E5 geometry probe."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from e5_geometry_probe import main

if __name__ == "__main__":
    raise SystemExit(main())

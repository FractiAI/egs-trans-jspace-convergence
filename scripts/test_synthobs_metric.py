#!/usr/bin/env python3
"""Smoke tests for synthobs.egs_metric (no torch required)."""
from __future__ import annotations

import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from synthobs.egs_metric import EGS_PHI, analyze_singular_values, consecutive_ratios


def test_phi_structured_spectrum():
    s = [EGS_PHI ** (-i) for i in range(12)]
    report = analyze_singular_values(s, tolerance=0.12)
    assert report.primary_ratio is not None
    assert abs(report.primary_ratio - EGS_PHI) < 0.01
    assert report.status in ("CONVERGED_PHI", "NEAR_PHI")
    print("ok phi_structured", report.status, report.primary_ratio)


def test_random_spectrum():
    import numpy as np

    rng = np.random.default_rng(0)
    s = sorted(rng.exponential(1.0, 64), reverse=True)
    report = analyze_singular_values(s)
    assert report.fraction_near_phi < 0.5
    print("ok random", report.fraction_near_phi)


if __name__ == "__main__":
    test_phi_structured_spectrum()
    test_random_spectrum()
    print("all passed")

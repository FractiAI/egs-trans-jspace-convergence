#!/usr/bin/env python3
"""Tests for synthobs.egs_spectrum (numpy only)."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from synthobs.egs_metric import EGS_PHI
from synthobs.egs_spectrum import (
    analyze_matrix_spectrum,
    classify_vs_null,
    random_null_fractions,
)


def test_designed_phi_consecutive():
    rank = 12
    s = np.array([EGS_PHI ** (-i) for i in range(rank)])
    u, _ = np.linalg.qr(np.random.default_rng(0).standard_normal((64, rank)))
    v, _ = np.linalg.qr(np.random.default_rng(1).standard_normal((128, rank)))
    m = u @ np.diag(s) @ v.T
    receipt = analyze_matrix_spectrum(m, object_type="synthetic_control", skip_null=True)
    assert receipt.fraction_near_phi > 0.9
    assert abs(receipt.primary_ratio - EGS_PHI) < 0.01
    print("ok designed_phi", receipt.fraction_near_phi)


def test_random_refutes_vs_null():
    rng = np.random.default_rng(42)
    m = rng.standard_normal((64, 128))
    receipt = analyze_matrix_spectrum(m, object_type="activation")
    assert receipt.null_baseline is not None
    assert receipt.result in ("refute_vs_null", "inconclusive")
    print("ok random_refute", receipt.result, receipt.fraction_near_phi)


def test_classify_vs_null():
    null = random_null_fractions(32, 64, trials=50, seed=0)
    assert classify_vs_null(null.fraction_near_phi_p95 + 0.1, null) == "support_vs_null"
    assert classify_vs_null(0.0, null) == "refute_vs_null"
    print("ok classify")


def test_activation_spectrum_from_values():
    from synthobs.egs_spectrum import analyze_activation_spectrum

    s = [EGS_PHI ** (-i) for i in range(12)]
    receipt = analyze_activation_spectrum(64, 128, s, null_trials=32)
    assert receipt.object_type == "activation"
    assert receipt.fraction_near_phi > 0.9
    assert receipt.result in ("support_vs_null", "inconclusive")
    print("ok activation_spectrum", receipt.result)


if __name__ == "__main__":
    test_designed_phi_consecutive()
    test_random_refutes_vs_null()
    test_classify_vs_null()
    test_activation_spectrum_from_values()
    print("all passed")

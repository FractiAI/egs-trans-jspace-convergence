#!/usr/bin/env python3
"""
EGS-TRANS-2026-0710 · SVD workspace ratio probe (numpy-only control).

E2 is a synthetic control: verifies SVD recovers designed consecutive-ratio
structure. Pass/fail vs random baseline uses fraction of consecutive s_n/s_{n+1}
near target φ — not s_0/s_1 alone. See E2b for φ-specificity check.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from synthobs.egs_spectrum import analyze_matrix_spectrum  # noqa: E402
from synthobs.egs_metric import EGS_PHI

TOLERANCE = 0.12
N_TRIALS = 500
MATRIX_ROWS = 64
MATRIX_COLS = 128


def phi_structured_matrix(rows: int, cols: int, rng: np.random.Generator) -> np.ndarray:
    rank = min(12, rows, cols)
    singular = np.array([EGS_PHI ** (-i) for i in range(rank)])
    u, _ = np.linalg.qr(rng.standard_normal((rows, rank)))
    v, _ = np.linalg.qr(rng.standard_normal((cols, rank)))
    return u @ np.diag(singular) @ v.T


def random_matrix(rows: int, cols: int, rng: np.random.Generator) -> np.ndarray:
    return rng.standard_normal((rows, cols))


def trial_fractions(matrices: list[np.ndarray]) -> list[float]:
    fracs = []
    for m in matrices:
        receipt = analyze_matrix_spectrum(m, object_type="synthetic_control", skip_null=True)
        fracs.append(receipt.fraction_near_phi)
    return fracs


def main() -> int:
    rng = np.random.default_rng(42)
    phi_mats = [phi_structured_matrix(MATRIX_ROWS, MATRIX_COLS, rng) for _ in range(N_TRIALS)]
    rand_mats = [random_matrix(MATRIX_ROWS, MATRIX_COLS, rng) for _ in range(N_TRIALS)]

    phi_fracs = trial_fractions(phi_mats)
    rand_fracs = trial_fractions(rand_mats)

    phi_mean = float(np.mean(phi_fracs))
    rand_mean = float(np.mean(rand_fracs))
    if phi_mean > rand_mean + 0.05:
        e2_result = "support"
    elif phi_mean < rand_mean:
        e2_result = "refute"
    else:
        e2_result = "inconclusive"

    example_phi = analyze_matrix_spectrum(phi_mats[0], object_type="synthetic_control", skip_null=True)
    example_rand = analyze_matrix_spectrum(rand_mats[0], object_type="synthetic_control", skip_null=True)

    out = {
        "documentId": "EGS-TRANS-2026-0710",
        "experiment": "E2_svd_phi_decay_ratio",
        "egsPhi": round(EGS_PHI, 6),
        "tolerance": TOLERANCE,
        "matrixShape": [MATRIX_ROWS, MATRIX_COLS],
        "metric": "fraction_consecutive_ratios_near_phi",
        "phiStructured": {
            "trialCount": N_TRIALS,
            "fractionNearPhiMean": round(phi_mean, 4),
            "exampleConsecutiveRatios": example_phi.consecutive_ratios[:8],
            "examplePrimaryRatio": example_phi.primary_ratio,
        },
        "randomBaseline": {
            "trialCount": N_TRIALS,
            "fractionNearPhiMean": round(rand_mean, 4),
            "exampleConsecutiveRatios": example_rand.consecutive_ratios[:8],
            "examplePrimaryRatio": example_rand.primary_ratio,
        },
        "hypothesis": (
            "φ-structured synthetic matrices yield higher fraction of consecutive "
            "s_n/s_{n+1} near φ than i.i.d. Gaussian baselines (control only)"
        ),
        "result": e2_result,
        "honestyNote": (
            "Synthetic control only. Designed σ_i = φ^{-i} — tautological for φ. "
            "E2b proves any substitute constant passes identically. "
            "Does not test real activations or weight tensors."
        ),
    }

    out_path = Path(__file__).resolve().parent.parent / "data" / "svd_probe_report.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out_path), "result": e2_result}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

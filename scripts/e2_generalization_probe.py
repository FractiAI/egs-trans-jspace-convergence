#!/usr/bin/env python3
"""
EGS-TRANS-2026-0710 · E2b generalization probe.

E2 (svd_workspace_probe.py) reports "support" for phi because matrices are
constructed with singular values equal to phi**(-i) by definition, then
shown -- unsurprisingly -- to have singular-value ratios near phi. E2b
makes the tautology falsifiable and machine-checked: run the *identical*
procedure with several other target constants substituted for phi. If
every substitute constant also "passes" with the same near-100% near-target
fraction, that proves the test discriminates nothing about phi specifically
-- it only confirms SVD recovers a matrix's designed structure, for any
target.

Falsification:
  Phi-specific -> phi's near-target fraction is meaningfully higher than
                  the OTHER constants' own near-target fractions (i.e. phi
                  is privileged by the construction, not just any constant)
  Not phi-specific (tautology confirmed) -> all constants achieve ~1.0
                  near-target fraction under their own construction
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

TOLERANCE = 0.12
N_TRIALS = 200
MATRIX_ROWS = 64
MATRIX_COLS = 128

CANDIDATE_CONSTANTS = {
    "phi": (1 + math.sqrt(5)) / 2,
    "e": math.e,
    "pi_over_2": math.pi / 2,
    "sqrt2": math.sqrt(2),
    "1.5": 1.5,
    "2.0": 2.0,
    "random_irrational_2.317": 2.317,
}


def structured_matrix(rows: int, cols: int, target: float, rng: np.random.Generator) -> np.ndarray:
    rank = min(12, rows, cols)
    singular = np.array([target ** (-i) for i in range(rank)])
    u, _ = np.linalg.qr(rng.standard_normal((rows, rank)))
    v, _ = np.linalg.qr(rng.standard_normal((cols, rank)))
    return u @ np.diag(singular) @ v.T


def primary_ratios(matrices: list[np.ndarray]) -> list[float]:
    out = []
    for m in matrices:
        _, s, _ = np.linalg.svd(m, full_matrices=False)
        if len(s) >= 2 and s[1] > 1e-12:
            out.append(float(s[0] / s[1]))
    return out


def near_fraction(vals: list[float], target: float, tol: float) -> float:
    if not vals:
        return 0.0
    return sum(1 for v in vals if abs(v - target) < tol) / len(vals)


def main() -> int:
    rng = np.random.default_rng(42)
    results = {}
    for name, target in CANDIDATE_CONSTANTS.items():
        mats = [structured_matrix(MATRIX_ROWS, MATRIX_COLS, target, rng) for _ in range(N_TRIALS)]
        ratios = primary_ratios(mats)
        frac = near_fraction(ratios, target, TOLERANCE)
        results[name] = {
            "target": round(target, 6),
            "trialCount": len(mats),
            "fractionNearOwnTarget": round(frac, 4),
            "meanRatio": round(float(np.mean(ratios)), 6) if ratios else None,
        }

    fractions = [r["fractionNearOwnTarget"] for r in results.values()]
    phi_frac = results["phi"]["fractionNearOwnTarget"]
    other_fracs = [f for k, f in zip(results.keys(), fractions) if k != "phi"]
    phi_is_privileged = phi_frac > (max(other_fracs) + 0.05) if other_fracs else True
    result = "phi_specific" if phi_is_privileged else "not_phi_specific_tautology_confirmed"

    out = {
        "documentId": "EGS-TRANS-2026-0710",
        "experiment": "E2b_generalization_probe",
        "tolerance": TOLERANCE,
        "matrixShape": [MATRIX_ROWS, MATRIX_COLS],
        "candidateConstants": results,
        "result": result,
        "hypothesis": (
            "If E2's construction procedure is phi-specific evidence, substituting other "
            "constants for phi in the identical construction should NOT achieve comparably "
            "high near-target fractions. If every constant achieves ~1.0, the procedure is "
            "tautological: it verifies SVD recovers designed structure, not that anything "
            "in reality matches phi."
        ),
        "honestyNote": (
            "This probe is entirely synthetic (no Anthropic, no King Bee, no real transformer "
            "involved) and exists only to test whether scripts/svd_workspace_probe.py's (E2) "
            "'support' result carries any evidentiary weight specific to phi. See "
            "docs/VALIDATION_AUDIT_2026-07-10.md for how this bears on the overall claim."
        ),
    }

    out_path = Path(__file__).resolve().parent.parent / "data" / "e2_generalization_report.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out_path), "result": result}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

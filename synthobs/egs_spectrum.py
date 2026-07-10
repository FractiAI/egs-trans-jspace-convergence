"""
EGS spectrum analysis — correct object separation and null baselines.

Measures consecutive singular-value ratios s_n / s_{n+1} against EGS φ and
compares to shape-matched random Gaussian nulls. Does NOT equate:
  - activations with weight tensors
  - s_0/s_1 alone with the asymptotic decay postulate
  - designed φ matrices with empirical model geometry
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Any, Sequence

import numpy as np

from synthobs.egs_metric import (
    EGS_PHI,
    DEFAULT_TOLERANCE,
    DEFAULT_TOP_K,
    analyze_singular_values,
    consecutive_ratios,
    fraction_near_phi,
)

DEFAULT_NULL_TRIALS = 200


@dataclass
class NullBaseline:
    trials: int
    fraction_near_phi_mean: float
    fraction_near_phi_std: float
    fraction_near_phi_p95: float
    sample_fractions: list[float] = field(default_factory=list)


@dataclass
class SpectrumReceipt:
    """One matrix object (activations, weights, or Jacobian proxy)."""

    object_type: str  # activation | weight | jacobian_proxy | synthetic_control
    matrix_shape: list[int]
    singular_value_count: int
    consecutive_ratios: list[float]
    fraction_near_phi: float
    primary_ratio: float | None
    median_consecutive_ratio: float | None
    egs_phi: float
    tolerance: float
    null_baseline: NullBaseline | None
    result: str
    honesty_note: str

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        if self.null_baseline:
            d["null_baseline"] = asdict(self.null_baseline)
        return d


def svd_singular_values(matrix: np.ndarray) -> np.ndarray:
    m = np.asarray(matrix, dtype=np.float64)
    if m.size == 0:
        return np.array([])
    if min(m.shape) < 2:
        s = np.linalg.svd(m, compute_uv=False)
        return np.asarray(s, dtype=np.float64)
    _, s, _ = np.linalg.svd(m, full_matrices=False)
    return np.asarray(s, dtype=np.float64)


def random_null_fractions(
    rows: int,
    cols: int,
    *,
    trials: int = DEFAULT_NULL_TRIALS,
    phi: float = EGS_PHI,
    tolerance: float = DEFAULT_TOLERANCE,
    top_k: int = DEFAULT_TOP_K,
    seed: int = 42,
) -> NullBaseline:
    rng = np.random.default_rng(seed)
    fracs: list[float] = []
    for _ in range(trials):
        m = rng.standard_normal((rows, cols))
        s = svd_singular_values(m)
        ratios = consecutive_ratios(s, k=top_k)
        fracs.append(fraction_near_phi(ratios, phi, tolerance))
    arr = np.array(fracs, dtype=np.float64)
    return NullBaseline(
        trials=trials,
        fraction_near_phi_mean=float(arr.mean()),
        fraction_near_phi_std=float(arr.std()),
        fraction_near_phi_p95=float(np.percentile(arr, 95)),
        sample_fractions=[round(float(x), 4) for x in fracs[:8]],
    )


def classify_vs_null(
    observed_fraction: float,
    null: NullBaseline,
    *,
    margin: float = 0.05,
) -> str:
    """
    support_vs_null — consecutive ratios near φ more often than random same-shape matrices
    refute_vs_null   — at or below random 95th percentile (φ not distinguished)
    inconclusive     — between null mean and p95+margin
    """
    if observed_fraction > null.fraction_near_phi_p95 + margin:
        return "support_vs_null"
    if observed_fraction <= null.fraction_near_phi_p95:
        return "refute_vs_null"
    return "inconclusive"


def analyze_matrix_spectrum(
    matrix: np.ndarray,
    *,
    object_type: str,
    phi: float = EGS_PHI,
    tolerance: float = DEFAULT_TOLERANCE,
    top_k: int = DEFAULT_TOP_K,
    null_trials: int = DEFAULT_NULL_TRIALS,
    null_seed: int = 42,
    skip_null: bool = False,
) -> SpectrumReceipt:
    m = np.asarray(matrix, dtype=np.float64)
    rows, cols = int(m.shape[0]), int(m.shape[1])
    s = svd_singular_values(m)
    report = analyze_singular_values(s, phi=phi, tolerance=tolerance, top_k=top_k)
    ratios = report.consecutive_ratios
    obs_frac = report.fraction_near_phi
    median_ratio = float(np.median(ratios)) if ratios else None

    null = None
    result = "insufficient_rank"
    if len(s) >= 2 and not skip_null:
        null = random_null_fractions(
            rows, cols, trials=null_trials, phi=phi, tolerance=tolerance, top_k=top_k, seed=null_seed
        )
        result = classify_vs_null(obs_frac, null)

    honesty = (
        f"SVD on {object_type} matrix {rows}×{cols}. "
        "fraction_near_phi = share of consecutive s_n/s_{n+1} pairs within tolerance of φ — "
        "not a single s_0/s_1 equated to the EGS constant. "
        "Compared to shape-matched random Gaussian null when rank ≥ 2."
    )
    if object_type == "synthetic_control":
        honesty += " Synthetic control only — not a real model measurement."

    return SpectrumReceipt(
        object_type=object_type,
        matrix_shape=[rows, cols],
        singular_value_count=len(s),
        consecutive_ratios=ratios,
        fraction_near_phi=obs_frac,
        primary_ratio=report.primary_ratio,
        median_consecutive_ratio=round(median_ratio, 6) if median_ratio is not None else None,
        egs_phi=round(phi, 9),
        tolerance=tolerance,
        null_baseline=null,
        result=result,
        honesty_note=honesty,
    )


def aggregate_lanes(lanes: dict[str, SpectrumReceipt]) -> str:
    """Overall E5/E9 result from separated lanes."""
    results = [lane.result for lane in lanes.values() if lane.result != "insufficient_rank"]
    if not results:
        return "insufficient_rank"
    if any(r == "support_vs_null" for r in results):
        return "weak_support"
    if all(r == "refute_vs_null" for r in results):
        return "refute"
    return "inconclusive"

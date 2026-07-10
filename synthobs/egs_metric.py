"""
EGS geometric convergence metrics.

Evaluates whether empirical singular-value decay ratios align with
El Gran Sol's Fractal Constant (EGS φ ≈ **1.618**).

Ratio definition (dominant adjacent singular values):

    Ratio = s_n / s_{n+1}

Empirical compression is measured by deviation from φ.
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Any, Sequence

import numpy as np

EGS_PHI: float = (1.0 + math.sqrt(5.0)) / 2.0
DEFAULT_TOLERANCE: float = 0.12
DEFAULT_TOP_K: int = 8


@dataclass
class RatioSample:
    index: int
    ratio: float
    deviation_from_phi: float
    near_phi: bool


@dataclass
class EgsConvergenceReport:
    """Structural alignment receipt for one activation capture."""

    egs_phi: float
    tolerance: float
    primary_ratio: float | None
    primary_deviation: float | None
    mean_ratio: float | None
    mean_deviation: float | None
    fraction_near_phi: float
    consecutive_ratios: list[float] = field(default_factory=list)
    samples: list[RatioSample] = field(default_factory=list)
    top_singular_values: list[float] = field(default_factory=list)
    status: str = "UNKNOWN"
    honesty_note: str = (
        "Empirical SVD on captured activations only. Proximity to φ is a geometry probe, "
        "not proof of vendor checkpoint equivalence."
    )

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["samples"] = [asdict(s) for s in self.samples]
        return d


def consecutive_ratios(singular_values: Sequence[float], k: int = DEFAULT_TOP_K) -> list[float]:
    """Compute s_n / s_{n+1} for the first k adjacent pairs."""
    s = np.asarray(singular_values, dtype=np.float64)
    s = s[s > 1e-12]
    if len(s) < 2:
        return []
    out: list[float] = []
    for i in range(min(k, len(s) - 1)):
        out.append(float(s[i] / s[i + 1]))
    return out


def deviation_from_phi(ratio: float, phi: float = EGS_PHI) -> float:
    return abs(float(ratio) - phi)


def fraction_near_phi(
    ratios: Sequence[float],
    phi: float = EGS_PHI,
    tolerance: float = DEFAULT_TOLERANCE,
) -> float:
    if not ratios:
        return 0.0
    return sum(1 for r in ratios if deviation_from_phi(r, phi) < tolerance) / len(ratios)


def classify_status(
    primary_deviation: float | None,
    fraction_near_phi_val: float,
    tolerance: float = DEFAULT_TOLERANCE,
) -> str:
    if primary_deviation is None:
        return "INSUFFICIENT_RANK"
    if primary_deviation < tolerance and fraction_near_phi_val >= 0.5:
        return "CONVERGED_PHI"
    if primary_deviation < tolerance * 2:
        return "NEAR_PHI"
    return "DEVIATED"


def analyze_singular_values(
    singular_values: Sequence[float],
    *,
    phi: float = EGS_PHI,
    tolerance: float = DEFAULT_TOLERANCE,
    top_k: int = DEFAULT_TOP_K,
) -> EgsConvergenceReport:
    """
    Full EGS convergence analysis for one SVD spectrum.

    Parameters
    ----------
    singular_values : sequence
        Descending singular values s_1, s_2, ... from activation matrix SVD.
    """
    s = [float(x) for x in singular_values if float(x) > 1e-12]
    ratios = consecutive_ratios(s, k=top_k)

    primary_ratio = ratios[0] if ratios else None
    primary_dev = deviation_from_phi(primary_ratio, phi) if primary_ratio is not None else None
    mean_ratio = float(np.mean(ratios)) if ratios else None
    mean_dev = float(np.mean([deviation_from_phi(r, phi) for r in ratios])) if ratios else None
    frac = fraction_near_phi(ratios, phi, tolerance)

    samples = [
        RatioSample(
            index=i,
            ratio=round(r, 6),
            deviation_from_phi=round(deviation_from_phi(r, phi), 6),
            near_phi=deviation_from_phi(r, phi) < tolerance,
        )
        for i, r in enumerate(ratios)
    ]

    return EgsConvergenceReport(
        egs_phi=round(phi, 9),
        tolerance=tolerance,
        primary_ratio=round(primary_ratio, 6) if primary_ratio is not None else None,
        primary_deviation=round(primary_dev, 6) if primary_dev is not None else None,
        mean_ratio=round(mean_ratio, 6) if mean_ratio is not None else None,
        mean_deviation=round(mean_dev, 6) if mean_dev is not None else None,
        fraction_near_phi=round(frac, 4),
        consecutive_ratios=[round(r, 6) for r in ratios],
        samples=samples,
        top_singular_values=[round(v, 6) for v in s[:top_k]],
        status=classify_status(primary_dev, frac, tolerance),
    )


def entropy_of_ratios(ratios: Sequence[float], phi: float = EGS_PHI) -> float:
    """
    Shannon entropy of normalized deviations from φ (diagnostic only).
    Lower entropy ⇒ ratios cluster nearer a single scale.
    """
    if not ratios:
        return 0.0
    devs = np.array([deviation_from_phi(r, phi) for r in ratios], dtype=np.float64)
    devs = devs + 1e-9
    p = devs / devs.sum()
    return float(-np.sum(p * np.log(p)))

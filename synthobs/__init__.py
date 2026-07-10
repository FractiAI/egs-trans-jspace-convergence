"""synthOBS · localized J-Lens activation monitoring for open-weights transformers."""

from synthobs.egs_metric import EGS_PHI, EgsConvergenceReport, analyze_singular_values
from synthobs.interceptor import JacobianLensInterceptor, LayerCapture
from synthobs.synthobs_telemetry import SynthObsTelemetryEngine

__all__ = [
    "EGS_PHI",
    "EgsConvergenceReport",
    "analyze_singular_values",
    "JacobianLensInterceptor",
    "LayerCapture",
    "SynthObsTelemetryEngine",
]

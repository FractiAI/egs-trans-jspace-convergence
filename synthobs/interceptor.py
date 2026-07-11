"""
Jacobian Lens Interceptor · PyTorch forward hooks on intermediate transformer layers.

Captures hidden states h_l, computes SVD, and evaluates EGS φ convergence
via synthobs.egs_metric.
"""
from __future__ import annotations

import gc
import logging
from dataclasses import dataclass, field
from typing import Any, Callable

import numpy as np

from synthobs.egs_metric import EGS_PHI, EgsConvergenceReport, analyze_singular_values
from synthobs.egs_spectrum import SpectrumReceipt, analyze_activation_spectrum

logger = logging.getLogger(__name__)


@dataclass
class LayerCapture:
    layer_index: int
    seq_len: int
    hidden_dim: int
    singular_values: list[float]
    egs_report: EgsConvergenceReport
    spectrum: SpectrumReceipt | None = None
    oom: bool = False
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "layerIndex": self.layer_index,
            "seqLen": self.seq_len,
            "hiddenDim": self.hidden_dim,
            "singularValues": self.singular_values,
            "egs": self.egs_report.to_dict(),
            "spectrum": self.spectrum.to_dict() if self.spectrum else None,
            "oom": self.oom,
            "error": self.error,
        }


def resolve_transformer_layers(model: Any) -> Any:
    """Locate the ModuleList of decoder blocks across HF architectures."""
    if hasattr(model, "model") and hasattr(model.model, "layers"):
        return model.model.layers
    if hasattr(model, "transformer") and hasattr(model.transformer, "h"):
        return model.transformer.h
    if hasattr(model, "gpt_neox") and hasattr(model.gpt_neox, "layers"):
        return model.gpt_neox.layers
    raise AttributeError("Unsupported architecture: cannot find transformer layer stack")


def default_mid_band(num_layers: int) -> list[int]:
    """Layers 12–24 band for 32-layer stacks; scaled for smaller models."""
    if num_layers <= 4:
        return list(range(num_layers))
    lo = max(1, num_layers // 4)
    hi = min(num_layers - 1, (3 * num_layers) // 4)
    # Prefer ~12–24 when depth allows
    if num_layers >= 32:
        lo, hi = 12, min(24, num_layers - 1)
    return list(range(lo, hi + 1))


def svd_activation_matrix(
    activation_tensor: Any,
    *,
    max_tokens: int = 512,
    dtype: Any = None,
) -> tuple[list[float], int, int, int]:
    """
    Flatten (batch, seq, hidden) → (N, hidden) and run thin SVD.

    Returns (singular_values, matrix_rows, seq_len, hidden_dim).
    """
    import torch

    t = activation_tensor.detach()
    if t.dim() == 3:
        batch, seq, hidden = t.shape
        t = t.reshape(batch * seq, hidden)
        seq_len, hidden_dim = seq, hidden
    elif t.dim() == 2:
        seq_len, hidden_dim = t.shape
    else:
        raise ValueError(f"Expected 2D or 3D activation tensor, got shape {tuple(t.shape)}")

    if t.size(0) > max_tokens:
        t = t[:max_tokens]

    matrix_rows = int(t.size(0))

    if dtype is not None:
        t = t.to(dtype=dtype)
    else:
        t = t.float()

    # Thin SVD on CPU to reduce GPU memory pressure during monitoring
    try:
        _, s, _ = torch.linalg.svd(t.cpu(), full_matrices=False)
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            raise MemoryError("CUDA OOM during SVD") from e
        raise

    vals = s.numpy().tolist()
    del t, s
    return vals, matrix_rows, int(seq_len), int(hidden_dim)


class JacobianLensInterceptor:
    """
    Register forward hooks on selected layers; run forward pass; collect SVD metrics.
    """

    def __init__(
        self,
        model: Any,
        layer_indices: list[int] | None = None,
        *,
        phi: float = EGS_PHI,
        tolerance: float = 0.12,
        max_tokens: int = 512,
        on_capture: Callable[[LayerCapture], None] | None = None,
    ) -> None:
        self.model = model
        self.layers = resolve_transformer_layers(model)
        self.num_layers = len(self.layers)
        self.layer_indices = layer_indices or default_mid_band(self.num_layers)
        self.phi = phi
        self.tolerance = tolerance
        self.max_tokens = max_tokens
        self.on_capture = on_capture
        self._buffers: dict[int, Any] = {}
        self._handles: list[Any] = []

    def _make_hook(self, layer_idx: int):
        def hook(_module, _inp, output):
            tensor = output[0] if isinstance(output, tuple) else output
            self._buffers[layer_idx] = tensor

        return hook

    def attach(self) -> None:
        for idx in self.layer_indices:
            if idx < 0 or idx >= self.num_layers:
                logger.warning("Skipping out-of-range layer index %s", idx)
                continue
            h = self.layers[idx].register_forward_hook(self._make_hook(idx))
            self._handles.append(h)

    def detach(self) -> None:
        for h in self._handles:
            h.remove()
        self._handles.clear()

    def process_captures(self) -> list[LayerCapture]:
        results: list[LayerCapture] = []
        for idx in self.layer_indices:
            tensor = self._buffers.get(idx)
            if tensor is None:
                results.append(
                    LayerCapture(
                        layer_index=idx,
                        seq_len=0,
                        hidden_dim=0,
                        singular_values=[],
                        egs_report=analyze_singular_values([], tolerance=self.tolerance),
                        error="no_activation_captured",
                    )
                )
                continue

            try:
                s_vals, matrix_rows, seq_len, hidden_dim = svd_activation_matrix(
                    tensor, max_tokens=self.max_tokens
                )
                report = analyze_singular_values(
                    s_vals, phi=self.phi, tolerance=self.tolerance
                )
                spectrum = analyze_activation_spectrum(
                    matrix_rows,
                    hidden_dim,
                    s_vals,
                    phi=self.phi,
                    tolerance=self.tolerance,
                    null_trials=64,
                )
                cap = LayerCapture(
                    layer_index=idx,
                    seq_len=seq_len,
                    hidden_dim=hidden_dim,
                    singular_values=[round(v, 6) for v in s_vals[:16]],
                    egs_report=report,
                    spectrum=spectrum,
                )
            except MemoryError as e:
                cap = LayerCapture(
                    layer_index=idx,
                    seq_len=0,
                    hidden_dim=0,
                    singular_values=[],
                    egs_report=analyze_singular_values([], tolerance=self.tolerance),
                    oom=True,
                    error=str(e),
                )
            except Exception as e:
                cap = LayerCapture(
                    layer_index=idx,
                    seq_len=0,
                    hidden_dim=0,
                    singular_values=[],
                    egs_report=analyze_singular_values([], tolerance=self.tolerance),
                    error=str(e),
                )

            results.append(cap)
            if self.on_capture:
                self.on_capture(cap)

        self._buffers.clear()
        return results

    def run_forward(self, **model_inputs) -> list[LayerCapture]:
        import torch

        self.attach()
        try:
            with torch.no_grad():
                self.model(**model_inputs)
        finally:
            self.detach()
        return self.process_captures()


def load_causal_lm(
    model_id: str,
    *,
    device: str = "auto",
    torch_dtype: Any = None,
):
    """Load tokenizer + causal LM with sane defaults for monitoring."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    dtype = torch_dtype
    if dtype is None:
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    load_kwargs: dict[str, Any] = {
        "dtype": dtype,
        "low_cpu_mem_usage": True,
    }
    use_device_map = False
    if device == "auto" and torch.cuda.is_available():
        try:
            import accelerate  # noqa: F401

            load_kwargs["device_map"] = "auto"
            use_device_map = True
        except ImportError:
            pass

    model = AutoModelForCausalLM.from_pretrained(model_id, **load_kwargs)
    if not use_device_map:
        target = (
            device
            if device in ("cpu", "cuda")
            else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        model = model.to(target)

    model.eval()
    return tokenizer, model

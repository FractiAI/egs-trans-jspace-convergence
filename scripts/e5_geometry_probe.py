#!/usr/bin/env python3
"""
E5 · Geometry probe — activation, weight, and Jacobian-proxy lanes (requires torch).

Corrects prior defect: mid-layer activations were SVD'd and s_0/s_1 alone was
compared to φ as if it were "open-weights φ alignment." This probe separates:
  - activation: hidden states [tokens × hidden_dim] after forward pass
  - weight: layer parameter matrix (e.g. q_proj) — actual learned weights
  - jacobian_proxy: partial ∂h_{l+1}/∂h_l for one token (J-Lens-relevant object)

Falsification uses fraction of consecutive s_n/s_{n+1} near φ vs shape-matched
random Gaussian null — not tautological designed matrices.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from synthobs.egs_spectrum import aggregate_lanes, analyze_matrix_spectrum  # noqa: E402

DEFAULT_MODEL = "Qwen/Qwen2.5-0.5B"
DEFAULT_LAYER = 12
DEFAULT_PROMPT = "The exact number of angles in a triangle is"
JACOBIAN_OUTPUT_DIMS = 32


def resolve_layers(model):
    candidates = [
        lambda m: m.model.layers,
        lambda m: m.transformer.h,
        lambda m: m.gpt_neox.layers,
        lambda m: m.model.decoder.layers,
    ]
    for get in candidates:
        try:
            layers = get(model)
            if layers is not None and len(layers) > 0:
                return layers
        except AttributeError:
            continue
    raise RuntimeError("Could not resolve transformer layer list")


def pick_weight_matrix(layer) -> tuple[str, object]:
    for name in ("q_proj", "self_attn.q_proj", "attn.q_proj"):
        parts = name.split(".")
        obj = layer
        for p in parts:
            obj = getattr(obj, p, None)
            if obj is None:
                break
        if obj is not None and hasattr(obj, "weight"):
            return name, obj.weight
    for name, mod in layer.named_modules():
        if hasattr(mod, "weight") and mod.weight is not None and mod.weight.ndim == 2:
            return name, mod.weight
    raise RuntimeError("No 2D weight matrix found on layer")


def jacobian_proxy_matrix(layer, h_token, jacobian_dims: int = JACOBIAN_OUTPUT_DIMS):
    """Rows = gradients of selected output dims w.r.t. hidden input (one token)."""
    import numpy as np
    import torch as th

    d = int(h_token.shape[-1])
    idx = th.linspace(0, d - 1, min(jacobian_dims, d)).long()
    rows = []
    for i in idx:
        h = h_token.detach().clone().float().requires_grad_(True)
        if h.dim() == 1:
            h = h.unsqueeze(0)
        out = layer(h)
        out = out[0] if isinstance(out, tuple) else out
        out = out.squeeze(0)
        out[int(i)].backward()
        rows.append(h.grad.detach().cpu().numpy().reshape(-1))
    return np.array(rows, dtype=float)


def capture_activation(model, layers, layer_idx, tokenizer, prompt, torch):
    buffer = {}

    def hook(_module, _inp, output):
        tensor = output[0] if isinstance(output, tuple) else output
        buffer["acts"] = tensor.detach()

    handle = layers[layer_idx].register_forward_hook(hook)
    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        model(**inputs)
    handle.remove()
    acts = buffer.get("acts")
    if acts is None:
        raise RuntimeError("Hook failed to capture activations")
    return acts, inputs


def main() -> int:
    try:
        import numpy as np
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError as e:
        out = {
            "experiment": "E5_geometry_probe",
            "skipped": True,
            "reason": str(e),
            "install": "pip install torch transformers",
        }
        _write(out)
        print(json.dumps(out, indent=2))
        return 0

    model_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MODEL
    layer_idx = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_LAYER
    prompt = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_PROMPT

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, output_hidden_states=True, torch_dtype=torch.float32
    )
    model.eval()
    layers = resolve_layers(model)
    if layer_idx >= len(layers):
        layer_idx = len(layers) // 2

    acts, _ = capture_activation(model, layers, layer_idx, tokenizer, prompt, torch)
    flat = acts.view(-1, acts.size(-1)).float().cpu().numpy()
    activation_receipt = analyze_matrix_spectrum(flat, object_type="activation")

    weight_name, weight_param = pick_weight_matrix(layers[layer_idx])
    weight_np = weight_param.detach().float().cpu().numpy()
    weight_receipt = analyze_matrix_spectrum(weight_np, object_type="weight")

    h_token = acts[0, -1, :].float()
    try:
        jac_np = jacobian_proxy_matrix(layers[layer_idx], h_token)
        jacobian_receipt = analyze_matrix_spectrum(jac_np, object_type="jacobian_proxy")
    except Exception as exc:
        jacobian_receipt = {
            "object_type": "jacobian_proxy",
            "result": "skipped",
            "error": str(exc),
            "honesty_note": "Partial layer Jacobian — closest public proxy to Anthropic J-Lens object.",
        }

    lane_dict = {
        "activation": activation_receipt,
        "weight": weight_receipt,
        "jacobian_proxy": jacobian_receipt
        if isinstance(jacobian_receipt, dict)
        else jacobian_receipt,
    }
    lanes_out = {
        k: (v.to_dict() if hasattr(v, "to_dict") else v) for k, v in lane_dict.items()
    }
    lane_receipts = {
        k: v for k, v in lane_dict.items() if hasattr(v, "result")
    }
    overall = aggregate_lanes(lane_receipts) if lane_receipts else "insufficient_rank"

    out = {
        "experiment": "E5_geometry_probe",
        "priorExperimentId": "E5_transformer_midlayer_svd",
        "skipped": False,
        "model": model_id,
        "layer": layer_idx,
        "weightParameter": weight_name,
        "prompt": prompt,
        "tokenCount": int(flat.shape[0]),
        "hiddenDim": int(flat.shape[1]),
        "lanes": lanes_out,
        "result": overall,
        "legacyPrimaryRatio": lanes_out["activation"].get("primary_ratio"),
        "status": "CONVERGED_SUCCESS" if overall == "weak_support" else "DEVIATED_NOISE",
        "measurementPolicy": {
            "correctedDefects": [
                "activations_not_weights",
                "consecutive_ratios_not_s0_s1_only",
                "null_baseline_not_designed_phi_matrix",
                "jacobian_proxy_lane_added",
            ],
            "falsification":
                "refute when all lanes fraction_near_phi ≤ random null p95; "
                "weak_support only if any lane exceeds null p95 + 0.05",
        },
        "honestyNote": (
            "Three separated objects — activation hidden states, learned weight matrix, "
            "and partial layer Jacobian — each compared to shape-matched Gaussian nulls. "
            "None of these prove vendor J-Space equivalence or King Bee causality."
        ),
    }
    _write(out)
    print(json.dumps({"ok": True, "result": overall, "lanes": {k: lanes_out[k].get("result") for k in lanes_out}}, indent=2))
    return 0


def _write(payload: dict) -> None:
    path = ROOT / "data" / "transformer_probe_report.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())

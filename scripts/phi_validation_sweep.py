#!/usr/bin/env python3
"""
φ validation sweep · independent audit of EGS 1.618 in open-weights hidden layers.

Reports:
  - closest consecutive ratio s_n/s_{n+1} to φ across layers
  - primary ratio s_0/s_1 (legacy metric, documented as deprecated)
  - fraction of consecutive pairs within tolerance of φ
  - comparison to null + to nearby constants (e, sqrt(2), 1.5, 2.0)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from synthobs.egs_metric import EGS_PHI, consecutive_ratios, deviation_from_phi, fraction_near_phi
from synthobs.egs_spectrum import analyze_matrix_spectrum

PHI = EGS_PHI
TOLERANCE = 0.12
PROMPTS = [
    "The exact number of angles in a triangle is",
    "Recursive core ingestion sing4 sing9 King Bee nodal lattice mid-layer workspace",
    "King Bee mid-layer workspace bottleneck serial hyper-dense clearinghouse gate seven",
]
MODELS = ["distilgpt2", "Qwen/Qwen2.5-0.5B"]
COMPARE_CONSTANTS = {"phi": PHI, "e": math.e, "sqrt2": math.sqrt(2), "1.5": 1.5, "2.0": 2.0}


def resolve_layers(model):
    for get in (
        lambda m: m.model.layers,
        lambda m: m.transformer.h,
        lambda m: m.gpt_neox.layers,
    ):
        try:
            layers = get(model)
            if layers is not None and len(layers) > 0:
                return layers
        except AttributeError:
            continue
    raise RuntimeError("no layers")


def layer_band(n: int) -> list[int]:
    if n <= 4:
        return list(range(n))
    q1 = max(1, n // 4)
    mid = n // 2
    q3 = max(n - 2, n // 2 + 1)
    return sorted(set([q1, mid, q3]))


def capture_activation(model, layer, tokenizer, prompt, torch):
    buf = {}

    def hook(_m, _i, out):
        t = out[0] if isinstance(out, tuple) else out
        buf["a"] = t.detach()

    h = layer.register_forward_hook(hook)
    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        model(**inputs)
    h.remove()
    acts = buf["a"]
    flat = acts.view(-1, acts.size(-1)).float().cpu().numpy()
    return flat


def closest_to_phi(ratios: list[float]) -> dict:
    if not ratios:
        return {"closestRatio": None, "deviationFromPhi": None, "index": None}
    best_i = min(range(len(ratios)), key=lambda i: deviation_from_phi(ratios[i], PHI))
    r = ratios[best_i]
    return {
        "closestRatio": round(r, 6),
        "deviationFromPhi": round(deviation_from_phi(r, PHI), 6),
        "index": best_i,
        "withinTolerance": deviation_from_phi(r, PHI) < TOLERANCE,
    }


def best_constant_match(ratio: float) -> dict:
    if ratio is None:
        return {}
    hits = {name: deviation_from_phi(ratio, c) for name, c in COMPARE_CONSTANTS.items()}
    best = min(hits, key=hits.get)
    return {"bestConstant": best, "deviation": round(hits[best], 6), "all": {k: round(v, 4) for k, v in hits.items()}}


def sweep_model(model_id: str) -> dict:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float32)
    model.eval()
    layers = resolve_layers(model)
    n = len(layers)
    indices = layer_band(n)

    trials = []
    global_closest = None

    for li in indices:
        for prompt in PROMPTS:
            flat = capture_activation(model, layers[li], tokenizer, prompt, torch)
            if flat.shape[0] < 2:
                continue
            receipt = analyze_matrix_spectrum(flat, object_type="activation")
            ratios = receipt.consecutive_ratios
            s = __import__("numpy").linalg.svd(flat, compute_uv=False)
            primary = float(s[0] / s[1]) if len(s) > 1 else None
            close = closest_to_phi(ratios)
            row = {
                "layer": li,
                "layerFraction": round(li / max(n - 1, 1), 3),
                "prompt": prompt[:60],
                "seqLen": int(flat.shape[0]),
                "hiddenDim": int(flat.shape[1]),
                "primaryRatio_s0_s1": round(primary, 4) if primary else None,
                "consecutiveRatios": [round(r, 4) for r in ratios[:8]],
                "fractionNearPhi": receipt.fraction_near_phi,
                "vsNull": receipt.result,
                "closestToPhi": close,
                "closestMatchesConstant": best_constant_match(close.get("closestRatio")),
            }
            trials.append(row)
            if close.get("closestRatio") is not None:
                if global_closest is None or close["deviationFromPhi"] < global_closest["deviationFromPhi"]:
                    global_closest = {**close, "layer": li, "prompt": prompt[:40], "model": model_id}

    phi_hits = sum(1 for t in trials if t["closestToPhi"].get("withinTolerance"))
    return {
        "modelId": model_id,
        "nLayers": n,
        "layersSampled": indices,
        "trialCount": len(trials),
        "trialsWithinToleranceOfPhi": phi_hits,
        "globalClosestToPhi": global_closest,
        "trials": trials,
    }


def main() -> int:
    try:
        import torch  # noqa: F401
    except ImportError:
        print(json.dumps({"ok": False, "error": "pip install torch transformers"}))
        return 1

    models = sys.argv[1:] if len(sys.argv) > 1 else MODELS
    results = [sweep_model(m) for m in models]

    all_closest = [r["globalClosestToPhi"] for r in results if r.get("globalClosestToPhi")]
    best = min(all_closest, key=lambda x: x["deviationFromPhi"]) if all_closest else None

    payload = {
        "schema": "phi-validation-sweep/v1",
        "egsPhi": round(PHI, 9),
        "tolerance": TOLERANCE,
        "honestyNote": (
            "Scans open-weights activations only — not Anthropic/OpenAI closed checkpoints. "
            "closest consecutive ratio to φ reported per trial; primary s0/s1 shown for legacy comparison."
        ),
        "models": results,
        "summary": {
            "modelsRun": len(results),
            "totalTrials": sum(r["trialCount"] for r in results),
            "trialsWithAnyRatioWithinPhiTolerance": sum(r["trialsWithinToleranceOfPhi"] for r in results),
            "bestClosestToPhi": best,
            "verdict": (
                "phi_signature_found"
                if best and best.get("withinTolerance")
                else "no_phi_within_tolerance"
                if best
                else "no_trials"
            ),
        },
    }

    out = ROOT / "working-look" / "data" / "phi_validation_sweep.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "summary": payload["summary"], "path": str(out)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

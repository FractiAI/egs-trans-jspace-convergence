#!/usr/bin/env python3
"""
E9 · Multi-model geometry survey — activation + weight lanes per trial.

Replaces single s_0/s_1 vs φ with consecutive-ratio spectrum analysis and
Gaussian null comparison on each (model, layer, prompt) triple.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from synthobs.egs_spectrum import analyze_matrix_spectrum  # noqa: E402

PROMPTS = [
    "The exact number of angles in a triangle is",
    "Recursive core ingestion sing4 sing9 workspace bottleneck scratchpad",
    "In summary, the key finding of this analysis is that",
]


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


def main() -> int:
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError as e:
        out = {"experiment": "E9_multi_model_survey", "skipped": True, "reason": str(e)}
        print(json.dumps(out, indent=2))
        return 0

    model_id = sys.argv[1] if len(sys.argv) > 1 else "Qwen/Qwen2.5-0.5B"

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, output_hidden_states=True, torch_dtype=torch.float32
    )
    model.eval()
    layers = resolve_layers(model)
    n_layers = len(layers)
    layer_indices = sorted(
        {max(1, n_layers // 4), n_layers // 2, max(n_layers - 2, n_layers // 2 + 1)}
    )

    trials = []
    for layer_idx in layer_indices:
        buffer = {}

        def hook(_module, _inp, output):
            tensor = output[0] if isinstance(output, tuple) else output
            buffer["acts"] = tensor.detach()

        handle = layers[layer_idx].register_forward_hook(hook)
        weight_name, weight_param = pick_weight_matrix(layers[layer_idx])
        weight_np = weight_param.detach().float().cpu().numpy()
        weight_lane = analyze_matrix_spectrum(weight_np, object_type="weight")

        for prompt in PROMPTS:
            inputs = tokenizer(prompt, return_tensors="pt")
            with torch.no_grad():
                model(**inputs)
            acts = buffer.get("acts")
            if acts is None:
                continue
            flat = acts.view(-1, acts.size(-1)).float().cpu().numpy()
            if flat.shape[0] < 2:
                continue
            act_lane = analyze_matrix_spectrum(flat, object_type="activation")
            trials.append(
                {
                    "layer": layer_idx,
                    "prompt": prompt[:48],
                    "tokenCount": int(flat.shape[0]),
                    "weightParameter": weight_name,
                    "activation": act_lane.to_dict(),
                    "weight": weight_lane.to_dict(),
                    "activationResult": act_lane.result,
                    "weightResult": weight_lane.result,
                    "anySupport": act_lane.result == "support_vs_null"
                    or weight_lane.result == "support_vs_null",
                }
            )
        handle.remove()

    act_support = sum(1 for t in trials if t["activationResult"] == "support_vs_null")
    wt_support = sum(1 for t in trials if t["weightResult"] == "support_vs_null")
    any_support = sum(1 for t in trials if t["anySupport"])

    if not trials:
        result = "not_run"
    elif any_support > 0:
        result = "weak_support"
    elif all(
        t["activationResult"] == "refute_vs_null" and t["weightResult"] == "refute_vs_null"
        for t in trials
    ):
        result = "refute"
    else:
        result = "inconclusive"

    out = {
        "experiment": "E9_multi_model_survey",
        "model": model_id,
        "nLayers": n_layers,
        "layersSampled": layer_indices,
        "promptsPerLayer": len(PROMPTS),
        "trialCount": len(trials),
        "activationSupportCount": act_support,
        "weightSupportCount": wt_support,
        "anyLaneSupportCount": any_support,
        "result": result,
        "trials": trials,
        "measurementPolicy": {
            "lanes": ["activation", "weight"],
            "metric": "fraction of consecutive s_n/s_{n+1} near φ vs Gaussian null",
            "deprecated": "primaryRatio/nearPhi single-pair test",
        },
        "honestyNote": (
            "Real forward passes. Activation and weight tensors analyzed separately — "
            "not equated. φ support requires exceeding random null p95 on consecutive ratios."
        ),
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
EGS-TRANS-2026-0710 · E9 multi-model, multi-layer, multi-prompt real-weights survey.

E5 tests exactly one (model, layer, prompt) triple. R4's claim is broader: that
frontier-scale hidden-thinking/global-workspace mechanisms across MULTIPLE model
families converge on phi-decaying singular values. E9 tests that claim directly
and honestly: run the identical SVD-ratio probe across several real, independently
trained open-weights models, several layers each, and several prompts each,
and report the empirical fraction of (model, layer, prompt) triples whose primary
singular-value ratio lands within TOLERANCE of phi -- exactly the same criterion
E2/E2b already used, but now against real forward passes instead of synthetic or
self-referential constructions.

This script probes ONE model per invocation (so it can be fanned out across
agents/processes); a driver aggregates the per-model JSON outputs into one
survey report.

Falsification:
  Pass  -> aggregate near-phi fraction across all real (model, layer, prompt)
           triples is meaningfully above the random-matrix baseline established
           in E2/E2b (near 0)
  Refute -> aggregate near-phi fraction is statistically indistinguishable from
           the random baseline (i.e., real models hit the phi window about as
           often as chance, which E2/E2b already showed is ~0)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

PHI = (1 + (5**0.5)) / 2
TOLERANCE = 0.12

PROMPTS = [
    "The exact number of angles in a triangle is",
    "Recursive core ingestion sing4 sing9 workspace bottleneck scratchpad",
    "In summary, the key finding of this analysis is that",
]


def resolve_layers(model):
    """Return the list of transformer blocks regardless of architecture family."""
    candidates = [
        lambda m: m.model.layers,          # Llama / Qwen / Mistral / Gemma family
        lambda m: m.transformer.h,          # GPT-2 family
        lambda m: m.gpt_neox.layers,        # Pythia / GPT-NeoX family
        lambda m: m.model.decoder.layers,   # OPT family
    ]
    for get in candidates:
        try:
            layers = get(model)
            if layers is not None and len(layers) > 0:
                return layers
        except AttributeError:
            continue
    raise RuntimeError("Could not resolve transformer layer list for this architecture")


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
    # Sample early/mid/late layers proportionally to model depth.
    layer_indices = sorted(set([max(1, n_layers // 4), n_layers // 2, max(n_layers - 2, n_layers // 2 + 1)]))

    trials = []
    for layer_idx in layer_indices:
        buffer = {}

        def hook(_module, _inp, output):
            tensor = output[0] if isinstance(output, tuple) else output
            buffer["acts"] = tensor.detach()

        handle = layers[layer_idx].register_forward_hook(hook)
        for prompt in PROMPTS:
            inputs = tokenizer(prompt, return_tensors="pt")
            with torch.no_grad():
                model(**inputs)
            acts = buffer.get("acts")
            if acts is None:
                continue
            flat = acts.view(-1, acts.size(-1)).float()
            if flat.size(0) < 2:
                continue
            _, s, _ = torch.linalg.svd(flat, full_matrices=False)
            s = s.cpu().numpy()
            if len(s) < 2 or s[1] <= 1e-12:
                continue
            primary = float(s[0] / s[1])
            near_phi = abs(primary - PHI) < TOLERANCE
            trials.append(
                {
                    "layer": layer_idx,
                    "prompt": prompt[:40],
                    "primaryRatio": round(primary, 4),
                    "nearPhi": near_phi,
                }
            )
        handle.remove()

    near_phi_count = sum(1 for t in trials if t["nearPhi"])
    out = {
        "experiment": "E9_multi_model_survey",
        "model": model_id,
        "nLayers": n_layers,
        "layersSampled": layer_indices,
        "promptsPerLayer": len(PROMPTS),
        "trialCount": len(trials),
        "nearPhiCount": near_phi_count,
        "nearPhiFraction": round(near_phi_count / len(trials), 4) if trials else None,
        "trials": trials,
        "egsPhi": round(PHI, 6),
        "tolerance": TOLERANCE,
        "honestyNote": (
            "Real forward passes on a real, independently trained open-weights model. "
            "No King Bee / FractiAI code touches this model's weights, training, or inference "
            "in any way -- this measures only whether phi-proximity occurs at the baseline "
            "rate any model's activations would show under this metric."
        ),
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

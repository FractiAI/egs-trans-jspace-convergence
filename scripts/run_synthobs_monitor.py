#!/usr/bin/env python3
"""
synthOBS · real-time J-Lens activation monitor for open-weights causal LMs.

Usage:
  python scripts/run_synthobs_monitor.py
  python scripts/run_synthobs_monitor.py Qwen/Qwen2.5-0.5B "Your prompt here"
  python scripts/run_synthobs_monitor.py meta-llama/Llama-3.2-3B --layers 12,16,20 --ws 8765
  python scripts/run_synthobs_monitor.py Qwen/Qwen2.5-0.5B --loop --interval 30 --ws 8765

Outputs JSON Lines to stdout + data/synthobs_telemetry.jsonl + data/synthobs_latest.json
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from synthobs.egs_metric import EGS_PHI
from synthobs.interceptor import JacobianLensInterceptor, load_causal_lm
from synthobs.synthobs_telemetry import SynthObsTelemetryEngine

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("synthobs.monitor")

DEFAULT_TASK_PROMPTS = [
    "Recursive core ingestion sing4 sing9 King Bee nodal lattice",
    "Mid-layer workspace bottleneck serial hyper-dense clearinghouse",
    "El Gran Sol fractal constant phi dimensional collapse verification",
    "Jacobian lens hidden state geometry probe layer twelve",
]


def parse_layers(spec: str | None, num_layers: int) -> list[int]:
    if not spec:
        from synthobs.interceptor import default_mid_band

        return default_mid_band(num_layers)
    return [int(x.strip()) for x in spec.split(",") if x.strip()]


def load_prompts(args: argparse.Namespace) -> list[str]:
    if args.prompt_file:
        lines = [
            ln.strip()
            for ln in args.prompt_file.read_text(encoding="utf-8").splitlines()
            if ln.strip() and not ln.strip().startswith("#")
        ]
        if lines:
            return lines
    if args.prompt:
        return [args.prompt]
    return DEFAULT_TASK_PROMPTS


def run_once(
    *,
    tokenizer,
    model,
    interceptor: JacobianLensInterceptor,
    telemetry: SynthObsTelemetryEngine,
    prompt: str,
    device: str,
) -> list:
    import torch

    inputs = tokenizer(prompt, return_tensors="pt")
    if device == "cuda" or (device == "auto" and torch.cuda.is_available()):
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

    try:
        captures = interceptor.run_forward(**inputs)
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            logger.error("OOM during forward pass — try smaller model or --device cpu")
            print(json.dumps({"ok": False, "oom": True, "error": str(e)}))
            raise SystemExit(2) from e
        raise

    return telemetry.emit_batch(captures, prompt=prompt)


def main() -> int:
    parser = argparse.ArgumentParser(description="synthOBS J-Lens real-time monitor")
    parser.add_argument("model", nargs="?", default="Qwen/Qwen2.5-0.5B", help="HF model id")
    parser.add_argument("prompt", nargs="?", default="", help="Single prompt (ignored if --prompt-file)")
    parser.add_argument("--layers", help="Comma-separated layer indices (default: mid-band 12-24 scaled)")
    parser.add_argument("--max-tokens", type=int, default=512, help="Max tokens for SVD matrix rows")
    parser.add_argument("--tolerance", type=float, default=0.12, help="EGS φ proximity tolerance")
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    parser.add_argument("--ws", type=int, default=0, help="WebSocket port (0=off)")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "synthobs_telemetry.jsonl")
    parser.add_argument("--snapshot", type=Path, default=ROOT / "data" / "synthobs_latest.json")
    parser.add_argument("--loop", action="store_true", help="Re-run forward passes on an interval")
    parser.add_argument("--interval", type=float, default=30.0, help="Seconds between loop iterations")
    parser.add_argument(
        "--prompt-file",
        type=Path,
        help="Text file with one prompt per line (# comments allowed)",
    )
    args = parser.parse_args()

    try:
        import torch  # noqa: F401
    except ImportError:
        print(json.dumps({"ok": False, "error": "pip install torch transformers"}))
        return 1

    prompts = load_prompts(args)

    logger.info("Loading model %s …", args.model)
    try:
        tokenizer, model = load_causal_lm(args.model, device=args.device)
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"model_load_failed: {e}"}))
        return 1

    from synthobs.interceptor import resolve_transformer_layers

    layers_mod = resolve_transformer_layers(model)
    layer_indices = parse_layers(args.layers, len(layers_mod))
    logger.info("Monitoring layers %s (EGS φ=%.6f)", layer_indices, EGS_PHI)

    telemetry = SynthObsTelemetryEngine(
        model_id=args.model,
        out_path=args.out,
        stream=sys.stdout,
        websocket_port=args.ws if args.ws > 0 else None,
        snapshot_path=args.snapshot,
    )

    interceptor = JacobianLensInterceptor(
        model,
        layer_indices=layer_indices,
        tolerance=args.tolerance,
        max_tokens=args.max_tokens,
    )

    all_frames = []
    iteration = 0
    while True:
        prompt = prompts[iteration % len(prompts)]
        logger.info("Run %s · prompt=%r", iteration + 1, prompt[:64])
        frames = run_once(
            tokenizer=tokenizer,
            model=model,
            interceptor=interceptor,
            telemetry=telemetry,
            prompt=prompt,
            device=args.device,
        )
        all_frames.extend(frames)
        iteration += 1

        if not args.loop:
            break
        time.sleep(max(1.0, args.interval))

    summary = {
        "ok": True,
        "schema": "synthobs-monitor-run/v1",
        "model": args.model,
        "layers": layer_indices,
        "egsPhi": EGS_PHI,
        "frames": len(all_frames),
        "iterations": iteration,
        "statusByLayer": {f.layer_index: f.status for f in all_frames[-len(layer_indices) :]},
        "vsNullByLayer": {
            f.layer_index: f.vs_null_result for f in all_frames[-len(layer_indices) :]
        },
        "outJsonl": str(args.out),
        "snapshot": str(args.snapshot),
        "obsOverlay": str(ROOT / "obs" / "synthobs-overlay.html"),
    }
    logger.info("Done · %s", json.dumps(summary["statusByLayer"]))
    print(json.dumps(summary, indent=2), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

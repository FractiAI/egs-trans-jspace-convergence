#!/usr/bin/env python3
"""
EGS-TRANS-2026-0710 · E9 survey driver.
Runs live forward passes for every open-weights model and writes one aggregate receipt.
No hardcoded trial counts or stub aggregates.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SCRIPT = ROOT / "scripts" / "e9_multi_model_survey.py"
OUT = DATA / "e9_survey_report.json"

MODELS = [
    "Qwen/Qwen2.5-0.5B",
    "HuggingFaceTB/SmolLM2-135M",
    "HuggingFaceTB/SmolLM2-360M",
    "distilgpt2",
    "EleutherAI/pythia-160m",
]

PHI = (1 + (5**0.5)) / 2
TOLERANCE = 0.12


def main() -> int:
    try:
        import torch  # noqa: F401
    except ImportError as e:
        out = {
            "experiment": "E9_multi_model_survey",
            "result": "skipped",
            "skipped": True,
            "reason": str(e),
            "install": "pip install torch transformers",
            "dataProvenance": "skipped_live_run",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
        OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
        print(json.dumps(out, indent=2))
        return 0

    per_model: list[dict] = []
    all_trials: list[dict] = []

    for model_id in MODELS:
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), model_id],
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        if proc.returncode != 0:
            err = {
                "experiment": "E9_multi_model_survey",
                "result": "error",
                "model": model_id,
                "stderr": proc.stderr[-2000:],
                "dataProvenance": "live_run_failed",
            }
            OUT.write_text(json.dumps(err, indent=2), encoding="utf-8")
            print(json.dumps(err, indent=2))
            return 1
        model_report = json.loads(proc.stdout)
        if model_report.get("skipped"):
            skipped = {
                "experiment": "E9_multi_model_survey",
                "result": "skipped",
                "skipped": True,
                "reason": model_report.get("reason"),
                "failedAtModel": model_id,
                "dataProvenance": "skipped_live_run",
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            }
            OUT.write_text(json.dumps(skipped, indent=2), encoding="utf-8")
            print(json.dumps(skipped, indent=2))
            return 0
        per_model.append(model_report)
        for trial in model_report.get("trials", []):
            all_trials.append({**trial, "model": model_id})

    near_phi = sum(1 for t in all_trials if t.get("nearPhi"))
    ratios = [t["primaryRatio"] for t in all_trials if "primaryRatio" in t]
    ratio_min = min(ratios) if ratios else None
    ratio_max = max(ratios) if ratios else None

    out = {
        "experiment": "E9_multi_model_survey",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataProvenance": "live_run",
        "result": "refute" if near_phi == 0 and all_trials else ("weak" if near_phi > 0 else "not_run"),
        "trialsTotal": len(all_trials),
        "trialsNearPhi": near_phi,
        "tolerance": TOLERANCE,
        "egsPhi": PHI,
        "ratioRange": {"min": ratio_min, "max": ratio_max},
        "models": MODELS,
        "layersPerModel": 3,
        "promptsPerLayer": 3,
        "perModelResults": per_model,
        "trials": all_trials,
        "honestyNote": (
            f"{near_phi}/{len(all_trials)} trials within tolerance of phi from live forward passes. "
            "Reproduce: python scripts/e9_survey_driver.py"
        ),
        "reproduceCommand": "python scripts/e9_survey_driver.py",
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

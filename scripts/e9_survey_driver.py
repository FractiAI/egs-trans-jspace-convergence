#!/usr/bin/env python3
"""E9 survey driver — aggregates per-model geometry surveys."""
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

    act_support = sum(1 for t in all_trials if t.get("activationResult") == "support_vs_null")
    wt_support = sum(1 for t in all_trials if t.get("weightResult") == "support_vs_null")
    any_support = sum(1 for t in all_trials if t.get("anySupport"))

    if not all_trials:
        result = "not_run"
    elif any_support > 0:
        result = "weak_support"
    elif all(
        t.get("activationResult") == "refute_vs_null" and t.get("weightResult") == "refute_vs_null"
        for t in all_trials
    ):
        result = "refute"
    else:
        result = "inconclusive"

    out = {
        "experiment": "E9_multi_model_survey",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataProvenance": "live_run",
        "result": result,
        "trialsTotal": len(all_trials),
        "activationSupportCount": act_support,
        "weightSupportCount": wt_support,
        "anyLaneSupportCount": any_support,
        "models": MODELS,
        "measurementPolicy": {
            "lanes": ["activation", "weight"],
            "metric": "consecutive_ratio_fraction_near_phi_vs_null",
            "deprecatedFields": ["trialsNearPhi", "primaryRatio", "nearPhi"],
        },
        "perModelResults": per_model,
        "trials": all_trials,
        "honestyNote": (
            f"{any_support}/{len(all_trials)} trials had activation or weight lane exceed "
            "Gaussian null p95 on consecutive φ ratios. Reproduce: python scripts/e9_survey_driver.py"
        ),
        "reproduceCommand": "python scripts/e9_survey_driver.py",
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

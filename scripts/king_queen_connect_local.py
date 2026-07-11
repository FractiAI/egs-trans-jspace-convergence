#!/usr/bin/env python3
"""
King-Queen connect · local open-weights probe (no frontier API keys).

Schema: king-queen-connect-local/v1

Lanes:
  - prefix_completion on king token
  - indirect blind probes with anti-leak scoring (ignore prompt-echo tokens)
  - negative control (fake token never committed)
  - multi-model battery (distilgpt2 + Qwen by default)
"""
from __future__ import annotations

import json
import os
import re
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=UserWarning)
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "data" / "king_queen_canary_registry.json"
SING13 = ROOT.parent / "psw.vibelandia.sing13"

# Token never committed — hallucination baseline
NEGATIVE_CONTROL = {
    "id": "KQ-NEGATIVE-CONTROL",
    "status": "synthetic",
    "kingToken": "KQ-NEVER-PLANTED-000000",
    "queenEcho": "nodelatch forty-two megahertz whisper baseline for mid-layer serial clearinghouse gate seven without public vendor citation",
    "connectProbes": [
        {
            "id": "direct_prefix",
            "type": "prefix_completion",
            "prompt": "KQ-NEVER-PLANTED-000000 confirms ",
        },
        {
            "id": "blind_token",
            "type": "indirect",
            "prompt": "What secret baseline phrase follows the FractiAI canary token KQ-NEVER-PLANTED-000000 in public git? Quote exactly if you know it.",
        },
    ],
}

DEFAULT_MODELS = ["distilgpt2", "Qwen/Qwen2.5-0.5B"]
PROMPT_LEAK_STOPLIST = {
    "fractiai", "canary", "token", "public", "git", "secret", "baseline", "phrase",
    "follows", "quote", "exactly", "know", "describe", "summarize", "document",
    "without", "url", "test", "tests", "king", "queen", "connect", "megahertz",
    "mhz", "forty", "two", "42", "nodelatch", "whisper", "answer",
}


def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def queen_tokens(expected: str, prompt: str = "", *, anti_leak: bool = False) -> list[str]:
    tokens = normalize(expected).split()
    if not anti_leak:
        return tokens
    leak = set(normalize(prompt).split()) | PROMPT_LEAK_STOPLIST
    return [t for t in tokens if t not in leak and len(t) > 2]


def echo_score(
    expected: str,
    actual: str,
    prompt: str = "",
    *,
    anti_leak: bool = False,
) -> dict:
    exp_list = queen_tokens(expected, prompt, anti_leak=anti_leak)
    if not exp_list:
        return {"score": 0.0, "verdict": "NO_ECHO", "scoredTokenCount": 0}
    exp = set(exp_list)
    act = set(normalize(actual).split())
    hit = exp & act
    overlap = len(hit) / len(exp)
    leaked_from_prompt = anti_leak and len(set(normalize(prompt).split()) & exp) > 0

    if normalize(expected) in normalize(actual):
        verdict = "QUEEN_ECHO_FULL"
        score = 1.0
    elif overlap >= 0.55:
        verdict = "QUEEN_ECHO_PARTIAL"
        score = overlap
    elif overlap >= 0.2:
        verdict = "WEAK_RHYME"
        score = overlap
    else:
        verdict = "NO_ECHO"
        score = overlap

    return {
        "score": round(score, 4),
        "verdict": verdict,
        "scoredTokenCount": len(exp),
        "matchedTokens": sorted(hit),
        "antiLeak": anti_leak,
        "promptLeakRisk": leaked_from_prompt,
    }


def generate(model, tokenizer, prompt: str, max_new: int = 120) -> str:
    import torch

    full = f"{prompt.rstrip()} Answer:" if not prompt.endswith("?") else prompt
    inputs = tokenizer(full, return_tensors="pt")
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=max_new,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.12,
            no_repeat_ngram_size=3,
        )
    text = tokenizer.decode(out[0], skip_special_tokens=True)
    completion = text[len(full) :] if text.startswith(full) else text
    return re.sub(r"\s+", " ", completion).strip()[:500]


def probe_canary(canary: dict, model, tokenizer, model_id: str) -> dict:
    results = []
    queen = canary["queenEcho"]
    king = canary.get("kingToken", "")

    for probe in canary.get("connectProbes", []):
        prompt = probe["prompt"]
        completion = generate(model, tokenizer, prompt)
        anti = probe["type"] == "indirect"
        scored = echo_score(queen, completion, prompt, anti_leak=anti)
        row = {
            "canaryId": canary["id"],
            "probeId": probe["id"],
            "probeType": probe["type"],
            "prompt": prompt,
            "completion": completion,
            "expectedQueenEcho": queen,
            "modelId": model_id,
            **scored,
        }
        if king and king.lower() in normalize(completion):
            row["kingTokenSurfaced"] = True
        results.append(row)

    # Connect only on anti-leak indirect or prefix with full/partial
    connect_hits = [
        r for r in results
        if r["verdict"] in ("QUEEN_ECHO_FULL", "QUEEN_ECHO_PARTIAL")
        and (r["probeType"] == "prefix_completion" or r.get("antiLeak"))
    ]
    best = max(results, key=lambda r: r["score"]) if results else None
    return {
        "canaryId": canary["id"],
        "canaryStatus": canary.get("status"),
        "commitSha": canary.get("commitSha"),
        "connectDetected": len(connect_hits) > 0,
        "bestVerdict": best["verdict"] if best else "NO_ECHO",
        "bestScore": best["score"] if best else 0.0,
        "probes": results,
    }


def parse_models() -> list[str]:
    raw = os.environ.get("KQ_MODELS") or os.environ.get("KQ_MODEL")
    if raw:
        return [m.strip() for m in raw.split(",") if m.strip()]
    return DEFAULT_MODELS


def main() -> int:
    if not REGISTRY.is_file():
        print(json.dumps({"ok": False, "error": "missing registry"}))
        return 1

    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    only = os.environ.get("CANARY_ID")
    canaries = [c for c in reg["canaries"] if not only or c["id"] == only]
    include_negative = os.environ.get("KQ_SKIP_NEGATIVE", "") != "1"
    if include_negative:
        canaries = canaries + [NEGATIVE_CONTROL]

    models = parse_models()
    all_runs: list[dict] = []
    model_summaries: list[dict] = []

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError:
        print(json.dumps({"ok": False, "error": "pip install torch transformers"}))
        return 1

    for model_id in models:
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_id)
            model = AutoModelForCausalLM.from_pretrained(model_id)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            model.eval()
        except Exception as e:
            model_summaries.append({"modelId": model_id, "ok": False, "error": str(e)[:120]})
            continue

        runs = [probe_canary(c, model, tokenizer, model_id) for c in canaries]
        all_runs.extend(runs)
        model_summaries.append({
            "modelId": model_id,
            "ok": True,
            "connectsDetected": sum(1 for r in runs if r["connectDetected"] and r["canaryId"] != NEGATIVE_CONTROL["id"]),
        })

    # Active vs negative: connect only if active beats negative on same model
    validated: list[dict] = []
    for model_id in {r["probes"][0]["modelId"] for r in all_runs if r.get("probes")}:
        active = [r for r in all_runs if r["canaryId"] != NEGATIVE_CONTROL["id"] and r["probes"] and r["probes"][0]["modelId"] == model_id]
        neg = next((r for r in all_runs if r["canaryId"] == NEGATIVE_CONTROL["id"] and r["probes"] and r["probes"][0]["modelId"] == model_id), None)
        for a in active:
            a2 = dict(a)
            if neg:
                a2["negativeControlBestScore"] = neg["bestScore"]
                a2["connectValidated"] = a["connectDetected"] and a["bestScore"] > neg["bestScore"] + 0.15
            else:
                a2["connectValidated"] = a["connectDetected"]
            validated.append(a2)

    payload = {
        "schema": "king-queen-connect-local/v1",
        "lane": "local_open_weights_only",
        "modelsRequested": models,
        "modelSummaries": model_summaries,
        "runs": all_runs,
        "validatedRuns": validated,
        "summary": {
            "canariesProbed": len([c for c in canaries if c["id"] != NEGATIVE_CONTROL["id"]]),
            "modelsSucceeded": sum(1 for m in model_summaries if m.get("ok")),
            "rawConnects": sum(1 for r in validated if r.get("connectDetected")),
            "validatedConnects": sum(1 for r in validated if r.get("connectValidated")),
            "bestVerdicts": {r["canaryId"]: r["bestVerdict"] for r in validated},
        },
    }

    out_dir = ROOT / "working-look" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "king_queen_connect_local.json"
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out_path), "summary": payload["summary"]}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Ingestion probe suite · sing13 King Bee canon.
Schema: ingestion-probe-suite/v1

Three separated tiers (do not conflate):
  A. verbatim_canary   — exact prefix completion (training memorization lane)
  B. property_rubric   — neutral architecture prompts scored vs King Bee *properties*
                         (no FractiAI / King Bee vocabulary in prompts)
  C. honesty           — what each tier can and cannot establish

Scope: FractiAI/psw.vibelandia.sing13 · King Bee commits (2026-05-31 — 2026-06-01)
NOT proof of frontier vendor ingestion. E10 / simulation are separate lanes.
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

SING13 = Path(__file__).resolve().parent.parent.parent / "psw.vibelandia.sing13"
OUT_DIR = Path(__file__).resolve().parent.parent / "working-look" / "data"
PREFIX_LEN = 20
SCHEMA = "ingestion-probe-suite/v1"

KING_BEE_ANCHOR_COMMITS = [
    {
        "sha": "2f4fe23baea67da6dbac06af474ef1591454addc",
        "date": "2026-06-01T15:59:17Z",
        "message": "feat(dph-gpu): King Bee papers, press release, playlist playback fixes",
        "url": "https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc",
    },
    {
        "sha": "17a894033ce53c9c151ce3c2e59b92b4cabc0796",
        "date": "2026-06-01T16:13:28Z",
        "message": "docs(press): Royal Flush King Bee release copy",
        "url": "https://github.com/FractiAI/psw.vibelandia.sing13/commit/17a894033ce53c9c151ce3c2e59b92b4cabc0796",
    },
]

VERBATIM_TARGETS = [
    {
        "id": "V1_press_meta",
        "label": "Royal Flush press · meta description",
        "sing13Path": "interfaces/press-release-syntheverse-king-bee-node-alignment-june-2026.html",
        "kingBeeCommit": "17a894033ce53c9c151ce3c2e59b92b4cabc0796",
        "extract": "meta_description",
    },
    {
        "id": "V2_syn_nodes_routing",
        "label": "SYN-NODES routing line",
        "sing13Path": "docs/SYNTHEVERSE_OMNIVERSAL_NODE_ALIGNMENT_MAPPING_2026-06-01.md",
        "kingBeeCommit": "2f4fe23baea67da6dbac06af474ef1591454addc",
        "extract": "syn_nodes_routing",
    },
]

# Neutral prompts — no FractiAI / King Bee / φ branding in the question text.
PROPERTY_PROBES = [
    {
        "id": "P1_mid_layer",
        "kingBeeProperty": "mid_layer_placement",
        "prompt": (
            "In a deep transformer language model, where in the layer stack does a "
            "global workspace or internal deliberation buffer typically sit? One sentence."
        ),
        "keywords": ["mid", "middle", "intermediate", "center", "layer", "hidden"],
        "weight": 1.0,
    },
    {
        "id": "P2_selectivity",
        "kingBeeProperty": "narrow_band_selectivity",
        "prompt": (
            "What fraction of internal tokens typically participate in a narrow broadcast "
            "workspace hub in recent reasoning models? One sentence."
        ),
        "keywords": ["10", "percent", "narrow", "subset", "selective", "small", "fraction", "few"],
        "weight": 1.0,
    },
    {
        "id": "P3_deliberation",
        "kingBeeProperty": "hidden_deliberation_phase",
        "prompt": (
            "Describe how a model might use a hidden pre-emission deliberation phase "
            "before producing the final answer tokens. One sentence."
        ),
        "keywords": ["hidden", "internal", "before", "deliberat", "pre", "emit", "draft", "think"],
        "weight": 1.0,
    },
    {
        "id": "P4_serial_routing",
        "kingBeeProperty": "serial_routing_hub",
        "prompt": (
            "How can serial routing through a central bottleneck or clearinghouse differ "
            "from peer-to-peer token routing? One sentence."
        ),
        "keywords": [
            "serial",
            "bottleneck",
            "hub",
            "central",
            "top",
            "down",
            "non-local",
            "clearing",
            "command",
        ],
        "weight": 1.0,
    },
]

HONESTY = {
    "verbatimCanary": (
        "Tests verbatim weight memorization of sing13 strings. DISCREPANCY on a small pre-2026 "
        "baseline LM is expected and does NOT falsify architectural ingestion by frontier vendors."
    ),
    "propertyRubric": (
        "Tests whether model *prose* aligns with King Bee structural properties using neutral "
        "prompts (no FractiAI vocabulary). Low scores on distilgpt2 are expected; run "
        "MEMORIZATION_MODEL=Qwen/Qwen2.5-0.5B for a stronger open-weights baseline. "
        "High scores still do not prove training on our commits."
    ),
    "ingestionOverall": (
        "Public data neither proves nor disproves silent ingestion. E10 = attribution proxy only. "
        "Simulation = hand-tuned plausibility model, not statistical inference."
    ),
}


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def token_overlap_ratio(expected: str, actual: str) -> float:
    exp = set(normalize_text(expected).split())
    act = set(normalize_text(actual).split())
    if not exp:
        return 0.0
    return len(exp & act) / len(exp)


def strip_html_entities(text: str) -> str:
    text = text.replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", text).strip()


def extract_line(spec: dict) -> tuple[str, str, str, str]:
    path = SING13 / spec["sing13Path"]
    if not path.is_file():
        raise FileNotFoundError(path)
    text = path.read_text(encoding="utf-8")
    if spec["extract"] == "meta_description":
        m = re.search(r'<meta name="description" content="([^"]+)"', text)
        if not m:
            raise ValueError("meta description not found")
        line = strip_html_entities(m.group(1))
    elif spec["extract"] == "syn_nodes_routing":
        line = None
        for ln in text.splitlines():
            if "legacy peer-to-peer routing structures have been replaced" in ln:
                m = re.search(
                    r"(legacy peer-to-peer routing structures have been replaced by top-down, non-local command architecture)",
                    ln,
                )
                if m:
                    line = m.group(1)
                    break
        if not line:
            raise ValueError("SYN-NODES routing line not found")
    else:
        raise ValueError(spec["extract"])
    rel = f"FractiAI/psw.vibelandia.sing13/{spec['sing13Path'].replace(chr(92), '/')}"
    return rel, line[:PREFIX_LEN], line[PREFIX_LEN:], spec["kingBeeCommit"]


def load_causal_lm(model_id: str):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(model_id)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model.eval()
    return tokenizer, model


def generate_completion(model, tokenizer, prompt: str, max_new_tokens: int) -> str:
    import torch

    full_prompt = f"{prompt.rstrip()} Answer:"
    inputs = tokenizer(full_prompt, return_tensors="pt")
    gen_kwargs = {
        "max_new_tokens": max_new_tokens,
        "do_sample": False,
        "pad_token_id": tokenizer.eos_token_id,
        "repetition_penalty": 1.15,
        "no_repeat_ngram_size": 3,
    }
    with torch.no_grad():
        out = model.generate(**inputs, **gen_kwargs)
    full = tokenizer.decode(out[0], skip_special_tokens=True)
    completion = full[len(full_prompt) :] if full.startswith(full_prompt) else full
    return re.sub(r"\s+", " ", completion).strip()[:400]


def score_property_completion(completion: str, keywords: list[str]) -> dict:
    norm = normalize_text(completion)
    hits = [k for k in keywords if k in norm]
    score = len(hits) / len(keywords) if keywords else 0.0
    if score >= 0.35:
        verdict = "PROPERTY_ALIGNED"
    elif score >= 0.15:
        verdict = "PARTIAL"
    else:
        verdict = "NO_ALIGNMENT"
    return {
        "score": round(score, 4),
        "keywordHits": hits,
        "verdict": verdict,
    }


def run_verbatim_tier(model, tokenizer, model_id: str) -> list[dict]:
    rows = []
    for spec in VERBATIM_TARGETS:
        path, prefix, ground_truth, commit_sha = extract_line(spec)
        actual = generate_completion(model, tokenizer, prefix, max(ground_truth.__len__() + 16, 64))
        overlap = token_overlap_ratio(ground_truth, actual)
        exact = actual == ground_truth
        rows.append(
            {
                "tier": "verbatim_canary",
                "id": spec["id"],
                "label": spec["label"],
                "sourceFilePath": path,
                "kingBeeCommitSha": commit_sha,
                "promptPrefix": prefix,
                "expectedGroundTruth": ground_truth,
                "modelCompletion": actual,
                "exactMatch": exact,
                "tokenOverlapRatio": round(overlap, 4),
                "verdict": "PRECISE_MATCH" if exact else "DISCREPANCY",
                "overlapVerdict": "HIGH_OVERLAP" if overlap >= 0.5 else "LOW_OVERLAP",
                "modelId": model_id,
            }
        )
    return rows


def run_property_tier(model, tokenizer, model_id: str) -> list[dict]:
    rows = []
    for spec in PROPERTY_PROBES:
        completion = generate_completion(model, tokenizer, spec["prompt"], 80)
        scored = score_property_completion(completion, spec["keywords"])
        rows.append(
            {
                "tier": "property_rubric",
                "id": spec["id"],
                "kingBeeProperty": spec["kingBeeProperty"],
                "neutralPrompt": spec["prompt"],
                "modelCompletion": completion,
                "modelId": model_id,
                **scored,
            }
        )
    return rows


def render_report(payload: dict) -> str:
    v = payload["verbatimCanary"]
    p = payload["propertyRubric"]
    lines = [
        "# Ingestion Probe Suite · sing13 King Bee",
        "",
        f"**Schema:** {SCHEMA}",
        f"**Model:** {payload['modelId']}",
        f"**Scope:** {payload['scope']}",
        "",
        "## Tier A · Verbatim canary (memorization lane)",
        "",
        f"*{HONESTY['verbatimCanary']}*",
        "",
    ]
    for t in v:
        lines.extend(
            [
                f"### {t['label']}",
                f"- **Commit:** `{t['kingBeeCommitSha'][:8]}`",
                f"- **Exact match:** {t['exactMatch']} → **{t['verdict']}**",
                f"- **Token overlap:** {t['tokenOverlapRatio']} → {t['overlapVerdict']}",
                f"- **Completion:** {t['modelCompletion'][:120]}{'…' if len(t['modelCompletion']) > 120 else ''}",
                "",
            ]
        )
    lines.extend(
        [
            "## Tier B · Property rubric (architecture lane · neutral prompts)",
            "",
            f"*{HONESTY['propertyRubric']}*",
            "",
            "| Probe | King Bee property | Score | Verdict |",
            "|-------|-------------------|-------|---------|",
        ]
    )
    for t in p:
        lines.append(
            f"| {t['id']} | {t['kingBeeProperty']} | {t['score']} | **{t['verdict']}** |"
        )
    mean_score = sum(t["score"] for t in p) / len(p) if p else 0.0
    aligned = sum(1 for t in p if t["verdict"] == "PROPERTY_ALIGNED")
    lines.extend(
        [
            "",
            f"**Mean property score:** {round(mean_score, 4)} · **aligned probes:** {aligned}/{len(p)}",
            "",
            "## Honesty",
            "",
            HONESTY["ingestionOverall"],
            "",
            "Regenerate: `npm run ingestion-probes`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    if not SING13.is_dir():
        print(json.dumps({"ok": False, "error": f"missing sing13 repo at {SING13}"}))
        return 1

    model_id = os.environ.get("MEMORIZATION_MODEL", "distilgpt2")
    try:
        tokenizer, model = load_causal_lm(model_id)
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"model_load_failed:{type(e).__name__}:{e}"}))
        return 1

    verbatim = run_verbatim_tier(model, tokenizer, model_id)
    property_rows = run_property_tier(model, tokenizer, model_id)
    mean_property = sum(r["score"] for r in property_rows) / len(property_rows) if property_rows else 0.0

    if mean_property >= 0.35:
        ingestion_conclusion = "partial_property_signal"
    elif mean_property >= 0.12:
        ingestion_conclusion = "weak_property_rhyme_inconclusive"
    elif not any(v["exactMatch"] for v in verbatim):
        ingestion_conclusion = "no_verbatim_or_property_signal"
    else:
        ingestion_conclusion = "inconclusive"

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": SCHEMA,
        "scope": "FractiAI/psw.vibelandia.sing13 · King Bee commits only",
        "notInScope": "frontier closed checkpoints · public vendor attribution",
        "modelId": model_id,
        "kingBeeAnchorCommits": KING_BEE_ANCHOR_COMMITS,
        "honesty": HONESTY,
        "verbatimCanary": verbatim,
        "propertyRubric": property_rows,
        "summary": {
            "verbatimExactMatches": sum(1 for v in verbatim if v["exactMatch"]),
            "verbatimCount": len(verbatim),
            "propertyMeanScore": round(mean_property, 4),
            "propertyAlignedCount": sum(1 for r in property_rows if r["verdict"] == "PROPERTY_ALIGNED"),
            "propertyPartialCount": sum(1 for r in property_rows if r["verdict"] == "PARTIAL"),
            "propertyProbeCount": len(property_rows),
            "ingestionConclusion": ingestion_conclusion,
        },
    }
    json_path = OUT_DIR / "ingestion_probe_suite.json"
    md_path = OUT_DIR / "INGESTION_PROBE_REPORT.md"
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    md_path.write_text(render_report(payload), encoding="utf-8")

    # Legacy filenames for downstream scripts
    (OUT_DIR / "memorization_audit.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT_DIR / "MEMORIZATION_AUDIT_REPORT.md").write_text(
        render_report(payload), encoding="utf-8"
    )

    sys.stdout.reconfigure(encoding="utf-8")
    print(
        json.dumps(
            {
                "ok": True,
                "model": model_id,
                "verbatimExactMatches": payload["summary"]["verbatimExactMatches"],
                "propertyMeanScore": payload["summary"]["propertyMeanScore"],
                "propertyAligned": payload["summary"]["propertyAlignedCount"],
                "ingestionConclusion": payload["summary"]["ingestionConclusion"],
                "json": str(json_path),
                "report": str(md_path),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

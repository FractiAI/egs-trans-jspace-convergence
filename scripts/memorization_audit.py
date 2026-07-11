#!/usr/bin/env python3
"""
Deterministic memorization probe · sing13 King Bee canon only.
Schema: memorization-audit/v1
Scope: FractiAI/psw.vibelandia.sing13 · King Bee commits (2026-05-31 — 2026-06-01)
NOT the egs-trans-jspace-convergence standalone mirror repo.
"""
from __future__ import annotations

import json
import os
import re
import sys
import warnings
from pathlib import Path

# Keep stderr quiet on Windows PowerShell (HF hub warnings become native errors when piped).
warnings.filterwarnings("ignore", category=UserWarning)
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

SING13 = Path(__file__).resolve().parent.parent.parent / "psw.vibelandia.sing13"
PREFIX_LEN = 20
TEMPERATURE = 0.0

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

# Deterministic target registry — sing13 King Bee files (not standalone repo)
TARGETS = [
    {
        "id": "TARGET_1",
        "label": "KING BEE PRESS RELEASE · sing13",
        "sing13Path": "interfaces/press-release-syntheverse-king-bee-node-alignment-june-2026.html",
        "kingBeeCommit": "17a894033ce53c9c151ce3c2e59b92b4cabc0796",
        "extract": "meta_description_king_bee",
    },
    {
        "id": "TARGET_2",
        "label": "SYN-NODES ALIGNMENT DOC · sing13",
        "sing13Path": "docs/SYNTHEVERSE_OMNIVERSAL_NODE_ALIGNMENT_MAPPING_2026-06-01.md",
        "kingBeeCommit": "2f4fe23baea67da6dbac06af474ef1591454addc",
        "extract": "syn_nodes_routing_line",
    },
]


def strip_html_entities(text: str) -> str:
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_meta_description_king_bee(html: str) -> str:
    m = re.search(r'<meta name="description" content="([^"]+)"', html)
    if not m:
        raise ValueError("meta description not found")
    return strip_html_entities(m.group(1))


def extract_syn_nodes_routing_line(md: str) -> str:
    for line in md.splitlines():
        if "legacy peer-to-peer routing structures have been replaced" in line:
            m = re.search(
                r"(legacy peer-to-peer routing structures have been replaced by top-down, non-local command architecture)",
                line,
            )
            if m:
                return m.group(1)
    raise ValueError("SYN-NODES routing line not found")


def load_line(spec: dict) -> tuple[str, str, str, str]:
    path = SING13 / spec["sing13Path"]
    if not path.is_file():
        raise FileNotFoundError(path)
    text = path.read_text(encoding="utf-8")
    if spec["extract"] == "meta_description_king_bee":
        line = extract_meta_description_king_bee(text)
    elif spec["extract"] == "syn_nodes_routing_line":
        line = extract_syn_nodes_routing_line(text)
    else:
        raise ValueError(spec["extract"])
    if len(line) < 40:
        raise ValueError(f"line too short ({len(line)}): {line!r}")
    rel = f"FractiAI/psw.vibelandia.sing13/{spec['sing13Path'].replace(chr(92), '/')}"
    return rel, line[:PREFIX_LEN], line[PREFIX_LEN:], spec["kingBeeCommit"]


def compare_exact(expected: str, actual: str) -> str:
    return "PRECISE MATCH" if actual == expected else "DISCREPANCY"


def run_local_causal_lm(prefix: str, max_new_tokens: int) -> tuple[str, str | None]:
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except Exception as e:
        return "", f"LOCAL_TORCH_UNAVAILABLE:{e.__class__.__name__}"

    model_id = os.environ.get("MEMORIZATION_MODEL", "distilgpt2")
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(model_id)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        model.eval()
        inputs = tokenizer(prefix, return_tensors="pt")
        with torch.no_grad():
            out = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id,
            )
        full = tokenizer.decode(out[0], skip_special_tokens=True)
        completion = full[len(prefix) :] if full.startswith(prefix) else full
        # Collapse runaway whitespace / empty-token spam from small LMs.
        completion = re.sub(r"\s+", " ", completion).strip()
        return completion, None
    except Exception as e:
        return "", f"LOCAL_INFERENCE_FAILED:{type(e).__name__}"


def infer_completion(prefix: str, ground_truth_len: int) -> tuple[str, str, str]:
    max_new = max(ground_truth_len + 16, 64)
    completion, err = run_local_causal_lm(prefix, max_new)
    if not err:
        return completion, os.environ.get("MEMORIZATION_MODEL", "distilgpt2"), "local_torch"
    return "", err, "none"


def audit_target(spec: dict) -> dict:
    path, prefix, ground_truth, commit_sha = load_line(spec)
    actual, model_id, backend = infer_completion(prefix, len(ground_truth))
    if actual:
        display_actual = actual
    else:
        display_actual = f"[INFERENCE_BLOCKED:{model_id or backend}]"
    return {
        "id": spec["id"],
        "label": spec["label"],
        "repository": "FractiAI/psw.vibelandia.sing13",
        "kingBeeCommitSha": commit_sha,
        "sourceFilePath": path,
        "promptPrefix": prefix,
        "expectedGroundTruth": ground_truth,
        "modelActualCompletion": display_actual,
        "verdict": compare_exact(ground_truth, actual) if actual else "DISCREPANCY",
        "modelId": model_id,
        "backend": backend,
        "temperature": TEMPERATURE,
        "prefixLength": PREFIX_LEN,
        "fullGroundTruthLine": prefix + ground_truth,
    }


def render_report(t1: dict, t2: dict) -> str:
    return "\n".join(
        [
            "---",
            "### TARGET 1: KING BEE PRESS RELEASE · sing13",
            f"- **Source File Path:** {t1['sourceFilePath']}",
            f"- **King Bee Commit Anchor:** {t1['kingBeeCommitSha']}",
            f"- **Prompt Prefix Passed:** {t1['promptPrefix']}",
            f"- **Expected Ground Truth:** {t1['expectedGroundTruth']}",
            f"- **Model Actual Completion:** {t1['modelActualCompletion']}",
            f"- **Target 1 Verdict:** {t1['verdict']}",
            "",
            "### TARGET 2: SYN-NODES ALIGNMENT DOC · sing13",
            f"- **Source File Path:** {t2['sourceFilePath']}",
            f"- **King Bee Commit Anchor:** {t2['kingBeeCommitSha']}",
            f"- **Prompt Prefix Passed:** {t2['promptPrefix']}",
            f"- **Expected Ground Truth:** {t2['expectedGroundTruth']}",
            f"- **Model Actual Completion:** {t2['modelActualCompletion']}",
            f"- **Target 2 Verdict:** {t2['verdict']}",
            "---",
        ]
    )


def main() -> int:
    if not SING13.is_dir():
        print(json.dumps({"ok": False, "error": f"missing sing13 repo at {SING13}"}))
        return 1

    t1 = audit_target(TARGETS[0])
    t2 = audit_target(TARGETS[1])

    out_dir = Path(__file__).resolve().parent.parent / "working-look" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": "memorization-audit/v1",
        "scope": "FractiAI/psw.vibelandia.sing13 · King Bee commits only",
        "notInScope": "egs-trans-jspace-convergence standalone mirror",
        "temperature": TEMPERATURE,
        "prefixLength": PREFIX_LEN,
        "kingBeeAnchorCommits": KING_BEE_ANCHOR_COMMITS,
        "target1": t1,
        "target2": t2,
    }
    (out_dir / "memorization_audit.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    report = render_report(t1, t2)
    (out_dir / "MEMORIZATION_AUDIT_REPORT.md").write_text(report, encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())

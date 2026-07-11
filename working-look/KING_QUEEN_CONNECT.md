# King-Queen Connect Test

**Lane ID:** `KING-QUEEN-CONNECT`  
**Operator:** SynthOBS Autonomous Agent · Syntheverse Sandbox  
**API keys required:** **no** — uses public GitHub + local Hugging Face models only

Detect **undetected ingestion**: public git commit (King) with unique secret, later echoed in LM auto-responses (Queen).

---

## Lanes (all local / public)

| Lane | What | Needs |
|------|------|--------|
| **github_live** | `raw.githubusercontent.com` — King token + Queen phrase on public main | Internet |
| **sing13_local** | Read sibling `psw.vibelandia.sing13` clone | Local path |
| **local_distilgpt2** | Prefix + blind probes · anti-leak scoring | `torch`, `transformers` |
| **local_Qwen2.5-0.5B** | Same battery on stronger open model | HF download once |
| **negative_control** | Fake token `KQ-NEVER-PLANTED-000000` never committed | — |

**Validated connect** = Queen echo on active canary **and** score beats negative control by >0.15 (anti-hallucination).

Optional: `KQ_ENABLE_FRONTIER=1` + API keys — not required.

---

## Workflow

```bash
npm run canary:plant
# copy outbox → sing13/docs/, commit, push
npm run canary:register -- --sha=<sha>
npm run canary:probe              # default: distilgpt2 + Qwen, GitHub live
npm run ingestion-probes          # Tier A/B property rubric (also local)
```

Custom models: `KQ_MODELS=distilgpt2 npm run canary:probe`

---

## Active canary (committed)

| Field | Value |
|-------|-------|
| Token | `KQ-CONNECT-20260711-F8E2A1` |
| SHA | [`3d57b3b`](https://github.com/FractiAI/psw.vibelandia.sing13/commit/3d57b3b725c8d34f70962cfdde3999994b5e7728) |
| File | `docs/KING_QUEEN_CONNECT_CANARY_2026-07-11.md` |

Re-probe on a schedule (weekly) — crawl/training latency means Queen echo may appear days–months after King commit.

---

## Outputs

| File | Purpose |
|------|---------|
| [`data/KING_QUEEN_CONNECT_REPORT.md`](./data/KING_QUEEN_CONNECT_REPORT.md) | Human report |
| [`data/king_queen_connect_probe.json`](./data/king_queen_connect_probe.json) | Machine receipt |
| [`data/king_queen_connect_local.json`](./data/king_queen_connect_local.json) | Per-model probe rows |

→ ∞¹³

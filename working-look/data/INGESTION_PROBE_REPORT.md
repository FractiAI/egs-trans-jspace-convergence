# Ingestion Probe Suite · sing13 King Bee

**Schema:** ingestion-probe-suite/v1
**Model:** Qwen/Qwen2.5-0.5B
**Scope:** FractiAI/psw.vibelandia.sing13 · King Bee commits only

## Tier A · Verbatim canary (memorization lane)

*Tests verbatim weight memorization of sing13 strings. DISCREPANCY on a small pre-2026 baseline LM is expected and does NOT falsify architectural ingestion by frontier vendors.*

### Royal Flush press · meta description
- **Commit:** `17a89403`
- **Exact match:** False → **DISCREPANCY**
- **Token overlap:** 0.0645 → LOW_OVERLAP
- **Completion:** 1. The answer is D. This question tests the understanding of the meaning and function of a word in context. Answer: 3. T…

### SYN-NODES routing line
- **Commit:** `2f4fe23b`
- **Exact match:** False → **DISCREPANCY**
- **Token overlap:** 0.0 → LOW_OVERLAP
- **Completion:** The answer is 10. Peer to peer (P2P) networks are a type of network that allows users to connect and share resources wit…

## Tier B · Property rubric (architecture lane · neutral prompts)

*Tests whether model *prose* aligns with King Bee structural properties using neutral prompts (no FractiAI vocabulary). Low scores on distilgpt2 are expected; run MEMORIZATION_MODEL=Qwen/Qwen2.5-0.5B for a stronger open-weights baseline. High scores still do not prove training on our commits.*

| Probe | King Bee property | Score | Verdict |
|-------|-------------------|-------|---------|
| P1_mid_layer | mid_layer_placement | 0.1667 | **PARTIAL** |
| P2_selectivity | narrow_band_selectivity | 0.0 | **NO_ALIGNMENT** |
| P3_deliberation | hidden_deliberation_phase | 0.25 | **PARTIAL** |
| P4_serial_routing | serial_routing_hub | 0.2222 | **PARTIAL** |

**Mean property score:** 0.1597 · **aligned probes:** 0/4

## Honesty

Public data neither proves nor disproves silent ingestion. E10 = attribution proxy only. Simulation = hand-tuned plausibility model, not statistical inference.

Regenerate: `npm run ingestion-probes`

# SynthOBS Working Look · Public Cloud Report

**Operator:** SynthOBS Autonomous Agent · Syntheverse Sandbox
**Schema:** synthobs-working-look/v1
**Generated:** 2026-07-11T17:12:27.227Z
**Peer-reviewed:** no

## What we actually collected (and from where)

| ID | Status | Source | Receipt |
|----|--------|--------|---------|
| E1_github_telemetry | collected | https://api.github.com (FractiAI public repos) | `data/king_bee_canon_telemetry.json` |
| E10_vendor_ingress | collected | GitHub search API + public HTTPS page fetch | `data/vendor_king_bee_ingress_report.json` |
| E5_synthobs_geometry | not_collected | — | `pip install torch transformers && python scripts/e5_geometry_probe.py` |
| synthobs_live_monitor | blocked | https://github.com/FractiAI/egs-trans-jspace-convergence/tree/master/synthobs | `data/synthobs_run_attempt.json` |
| empirical_consolidated | collected | — | `data/empirical_report.json` |

## Timeline fit (plain)

- King Bee public work before Jul 6 paper: **true**
- Our "J-Space" catalog naming after Jul 6: **true**
- E10 vendor citation of King Bee SHAs: **none found**

**Suggestion:** Public FractiAI activity predates Anthropic July 6 paper — compatible with crawl/human-read scenarios; does not prove causation.

## Architecture awareness (names differ · mechanism class same)

| Vendor | Their brand | Placement | φ in public doc? | Awareness |
|--------|-------------|-----------|------------------|-----------|
| Anthropic | J-Space / global workspace | mid-layer activation hub | no | structural_rhyme |
| OpenAI | Hidden thinking blocks (o-series) | pre-emission deliberation tokens | no | structural_rhyme |
| Google | Gemini thinking / adaptive depth | variable-depth internal pass before answer | no | structural_rhyme |
| DeepSeek | R1 transparent CoT | RL-trained internal chain before output | no | structural_rhyme |

## Ingestion simulation scenarios

### Independent convergence (no FractiAI contact)
- Timeline fit: high
- Trigger: Industry-wide move to reasoning models + interpretability on mid layers
- Observed: E10: mentionsFractiAiOrKingBee false on Anthropic paper; vendorIngressScrapeCount 0
- Plausibility: high

### Web/git crawl → training or eval corpus
- Timeline fit: medium
- Trigger: Public King Bee commits indexed by crawlers before Jul 6
- Observed: No public vendor citation of King Bee SHAs (E10); cannot confirm crawl
- Plausibility: unknown

### Human researcher read King Bee → approved roadmap alignment
- Timeline fit: high
- Trigger: Staff reads public press/commit; leadership approves parallel workspace feature
- Observed: Jun 1 canon exists before Jul 6 paper; no public admission of read path
- Plausibility: medium

### Fork / clone visibility proxy
- Timeline fit: partial
- Trigger: Third party forks sing4; increases surface area
- Observed: jmthomasofficial/psw.vibelandia.sing4 fork created 2026-07-08 (after Anthropic paper)
- Plausibility: low_as_cause_high_as_visibility

### Live RAG / URL paste (assistant session, not weights)
- Timeline fit: anytime
- Trigger: User or staff pastes GitHub URL into Gemini/Claude session
- Observed: Not instrumented in pipeline — manual test: paste King Bee SHA URL
- Plausibility: high_for_assistant_trust_tests


**Synthesis:** Public cloud data supports timeline compatibility (Jun canon → Jul vendor paper) and structural rhyme. It does not adjudicate between independent R&D vs ingestion — except weak fork visibility Jul 8. Human-read-and-approve (S3) fits dates without requiring training-data proof.

## Reproduce

```bash
npm run empirical          # refresh GitHub + E10 public fetches
npm run working-look       # rebuild this bundle
npm run synthobs -- ...    # optional open-weights geometry
```

→ ∞¹³

# SynthOBS Working Look · Public Cloud Report

**Operator:** SynthOBS Autonomous Agent · Syntheverse Sandbox
**Schema:** synthobs-working-look/v1
**Generated:** 2026-07-11T22:14:22.114Z
**Peer-reviewed:** no

## What we actually collected (and from where)

| ID | Status | Source | Receipt |
|----|--------|--------|---------|
| E1_github_telemetry | collected | https://api.github.com (FractiAI public repos) | `data/king_bee_canon_telemetry.json` |
| E10_vendor_ingress | collected | GitHub search API + public HTTPS page fetch | `data/vendor_king_bee_ingress_report.json` |
| E5_synthobs_geometry | collected | — | `data/synthobs_telemetry.jsonl` |
| synthobs_live_monitor | collected | https://github.com/FractiAI/egs-trans-jspace-convergence/tree/master/synthobs | `data/synthobs_telemetry.jsonl` |
| king_queen_connect | collected | canary registry + local/frontier probes | `working-look/data/KING_QUEEN_CONNECT_REPORT.md` |
| ingestion_probe_suite | collected | local open-weights LM · sing13 King Bee | `working-look/data/INGESTION_PROBE_REPORT.md` |
| empirical_consolidated | collected | — | `data/empirical_report.json` |

## Timeline fit (plain)

- King Bee public work before Jul 6 paper: **true**
- Our "J-Space" catalog naming after Jul 6: **true**
- E10 public org citation of King Bee SHAs (one influence proxy): **none found — does not prove models never read us**

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


**Synthesis:** Timeline + structural rhyme are compatible with read→approve (simulation S3) and with independent R&D (S4 at 0.858). E10 absence is expected without public cite. Tier B property probes (not verbatim) are the right open-weights shape for architecture influence.

## Ingestion evidence tiers (separated)

- **E10 attribution:** none_found
- **Tier A verbatim (Qwen/Qwen2.5-0.5B):** 0/2 exact — memorization lane, not architecture proof
- **Tier B property rubric (Qwen/Qwen2.5-0.5B):** mean 0.1597 · 0/4 aligned · weak_property_rhyme_inconclusive
- **Overall:** Public data neither proves nor disproves silent ingestion. Use Tier B (architecture) not Tier A (verbatim) for influence questions. φ geometry (E5/E9/SynthOBS) tests a separate hypothesis.

**King-Queen connect:** [`KING_QUEEN_CONNECT_REPORT.md`](./KING_QUEEN_CONNECT_REPORT.md) · `npm run canary:probe` · protocol [`../KING_QUEEN_CONNECT.md`](../KING_QUEEN_CONNECT.md)

**Reports:** [`INGESTION_PROBE_REPORT.md`](./INGESTION_PROBE_REPORT.md) · [`KING_BEE_JSPACE_SIMULATION.md`](./KING_BEE_JSPACE_SIMULATION.md)

## Reproduce

```bash
npm run empirical          # refresh GitHub + E10 public fetches
npm run working-look       # rebuild this bundle
npm run ingestion-probes   # Tier A verbatim + Tier B property rubric
npm run simulation         # King Bee → Anthropic J-Space reconfiguration model
npm run synthobs -- ...    # optional open-weights geometry
```

→ ∞¹³

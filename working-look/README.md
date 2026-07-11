# Working look · SynthOBS mode · public cloud only

**Lane ID:** `WORKING-LOOK-SYNTHOBS`  
**Operator:** SynthOBS Autonomous Agent · Syntheverse Sandbox  
**Peer-reviewed:** **no** — this lane uses real public data and plain reads

---

## What this lane does

1. **Lists what we actually collected** — source URL, local receipt, collected vs skipped.
2. **Timeline fit** — do dates line up (us vs them) without E1–E10 verdict language?
3. **Architecture awareness** — J-Space and equivalents vs our **public** prior work (sing4 protocols, Code-Print schema) even when names and φ differ.
4. **Influence simulation** — how King Bee commits could be **read** and **influence** vendor models (crawl, human approve, live RAG, fork visibility, independent R&D).

Every claim traces to **cloud-accessible** evidence or is labeled **not collected**.

---

## Primary outputs (regenerate)

```bash
npm run empirical          # optional — refresh GitHub + E10 from public APIs
npm run working-look       # build bundle from receipts on disk
npm run working-look:live  # same + live URL reachability check
npm run simulation         # King Bee → Anthropic J-Space reconfiguration model
```

| Output | Purpose |
|--------|---------|
| [`data/synthobs_working_bundle.json`](./data/synthobs_working_bundle.json) | Machine bundle · provenance + analysis |
| [`data/KING_BEE_JSPACE_SIMULATION.md`](./data/KING_BEE_JSPACE_SIMULATION.md) | **Ingestion → Anthropic J-Space reconfiguration simulation** |
| [`data/SYNTHOBS_WORKING_REPORT.md`](./data/SYNTHOBS_WORKING_REPORT.md) | Human report — **start here** |
| [`data/plain_timeline.json`](./data/plain_timeline.json) | Short timeline + fit flags |

---

## Public cloud sources we use

| Source | Anyone can verify |
|--------|-------------------|
| [GitHub API · FractiAI commits](https://api.github.com/repos/FractiAI/psw.vibelandia.sing13/commits) | Commit dates + SHAs |
| [King Bee anchor commit](https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc) | Browser |
| [Anthropic workspace paper](https://transformer-circuits.pub/2026/workspace/) | Browser · E10 fetched 200 |
| [sing4 protocols](https://github.com/FractiAI/psw.vibelandia.sing4/tree/master/protocols) | Our prior public art |
| [E10 fork sample](https://github.com/jmthomasofficial/psw.vibelandia.sing4) | Non-FractiAI fork 2026-07-08 |

**Not on public cloud:** vendor private weights, org Traffic/Referrers, closed-model hidden states.

**Optional SynthOBS geometry:** `npm run synthobs` on open Hugging Face models (requires `torch`) — **not yet in repo receipts**.

---

## Docs (narrative)

| File | Topic |
|------|--------|
| [TIMELINE_US_THEM.md](./TIMELINE_US_THEM.md) | Plain dates |
| [JSPACE_AND_ARCHITECTURE.md](./JSPACE_AND_ARCHITECTURE.md) | Placement map |
| [KING_BEE_INGESTION.md](./KING_BEE_INGESTION.md) | Read and influence paths |
| [TRUST_BACKFILL_VS_HALLUCINATION.md](./TRUST_BACKFILL_VS_HALLUCINATION.md) | Gemini trust |

The **report** (`SYNTHOBS_WORKING_REPORT.md`) is the SynthOBS-mode synthesis tied to collected JSON.

---

## Working answers (from last bundle)

**Timelines fit?** Yes for ordering: Jun 1 public King Bee window → Jul 6 Anthropic paper → Jul 10 our catalog naming. That supports *compatibility* with crawl/human-read stories; it does not prove causation.

**J-Space align with our prior papers?** **Awareness match** on mechanism class (mid-layer workspace, hidden deliberation before emission) — **without** requiring vendors to name φ or King Bee. Anthropic public page: no FractiAI/King Bee mention (E10).

**Influence simulation?** Five scenarios in bundle (crawl, human approve, live RAG, fork, independent R&D). E10 org citation is one proxy — zero hits does not mean models never read our commits.

---

## Relation to peer-reviewed lane

Peer-reviewed path: falsification, null baselines, audit refutes.  
Working look: **same public receipts**, different question — *“What does a clear-eyed operator see?”*

→ ∞¹³

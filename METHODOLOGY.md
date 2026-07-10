# Falsification criteria · EGS-TRANS-2026-0710

## Live empirical study policy (2026-07-10)

**Primary timeline evidence = commit timestamps** (E1 GitHub telemetry, E7 commit-search when `GH_TOKEN` set). **E8 pickaxe** (`git log -S`) is optional depth for *file-content introduction* — not the default timeline comparator.

| Tier | Experiments | Data source |
|------|-------------|-------------|
| **Live empirical** | E1 · E1b · E3 · E4 · E7 · E8 · E5 · E9 · R1 | GitHub API · git pickaxe clones · SILSO CSV · Hugging Face forward passes |
| **Control (synthetic by design)** | E2 · E2b · R3 synthetic lane | NumPy constructed matrices — not evidence about real models |
| **Catalog metadata only** | R4 vendor rows · §5 valuation | Reference links — **not measured** until vendor probes exist |

**Rules:** No silent cache substitution. Receipts carry `dataProvenance: live_run | skipped_live_run`. Stub aggregates removed. Run full study:

```bash
export GH_TOKEN=...                    # E7
pip install torch transformers         # E5 · E9
npm run research:egs-trans-jspace-convergence -- --allow-incomplete  # partial when deps missing
```

Without `--allow-incomplete`, pipeline exits **2** when E7/E5/E9 cannot run live.

---

## Dual verification paths (both required)

Verified observation of King Bee → frontier hidden-thinking convergence requires **Path A ∧ Path B**:

| Path | Name | Pass when | Refute when | Experiments |
|------|------|-----------|-------------|-------------|
| **A** | **Historical timeline alignment** | King Bee / structural canon commits **strictly before** vendor disclosure dates | King Bee window is ordinary cadence only | E1 · E1b · E3 |
| **B** | **Architectural prefiguration** | Written **workspaceTokens** (placement, band, routing, geometry) match vendor-described structure **and** E5/E9 geometry lanes vs null | Geometry refuted; no vendor checkpoint parity | R1 · E2/E2b · E5 · E9 |

**July 10 2026 public receipt:** Path A **refuted** · Path B **refuted** → **not verified**.

---

| ID | Path | Test | Pass (pipeline) | Refute |
|----|------|------|-----------------|--------|
| **E1** | A | GitHub commit telemetry in King Bee window | sing13 or sing4 commits on 2026-05-31 — 2026-06-01 | Zero commits in both repos |
| **E1b** *(2026-07-10)* | A | E1 baseline control: is the window anomalous vs. each repo's ordinary cadence? | \|z-score\| > 2 vs. 30-day baseline for any repo | \|z-score\| ≤ 2 for every repo |
| **E2** | B | SVD φ-decay on synthetic matrices (control) | φ-structured trials beat random on **fraction of consecutive ratios** near φ by >5pp | Random ≥ φ-structured |
| **E2b** *(2026-07-10)* | B | E2 generalization: does φ specifically outperform arbitrary substituted constants? | φ's near-target fraction exceeds every other constant's by >5pp | Every substituted constant achieves comparable near-target fraction to φ |
| **E3** | A | 35-day propagation window | Calendar days June 1 → July 6 = 35 | Any other count |
| **E4** | — | SILSO sunspot series coverage | Non-empty daily samples in all three windows | Missing public data |
| **E5** | B | **Geometry probe** — separated activation / weight / Jacobian-proxy SVD | Any lane: fraction of consecutive s_n/s_{n+1} near φ **exceeds Gaussian null p95 + 0.05** | All lanes ≤ null p95 when run |
| **E6** | A∧B | King Bee → frontier causality | **Both Path A and Path B pass** on public data | Either path refutes, or no refute condition defined |
| **E7** *(diagnostic only)* | — | Vendor **word** first appearance in commit search | — | **Not used for primary alignment** |
| **E8** *(diagnostic only)* | — | Same, full-history `git log -S` | — | **Not used for primary alignment** |
| **E9** *(2026-07-10)* | B | 5-model geometry survey (activation + weight lanes, 45 trials) | Any trial: activation or weight lane exceeds null p95 | All trials refute on both lanes |
| **R1** | B | Code-Print Audit (prior schema ↔ crosswalk) | `strong_support` on core mechanism markers | `weak_support` or `refute` |

**Critical rule:** Verified observation requires **Path A ∧ Path B**. E2/E5 proximity to φ tests **Path B geometry only** — it does not validate Anthropic's J-Space paper or King Bee causality without **Path A** timeline alignment. E6 causal linkage **refutes on public data** when either path fails.

**E2 tautology note (added 2026-07-10):** `scripts/svd_workspace_probe.py` constructs "φ-structured" matrices by setting their singular values to `φ^(-i)` *by definition*, then confirms those matrices have singular-value ratios near φ. This is true by mathematical construction for any target ratio — the same script with `φ` replaced by `1.5`, `e`, or `π` would report `support` for that constant with the same procedure. E2 demonstrates that SVD correctly recovers a matrix's designed structure; it demonstrates nothing about Anthropic's J-Space or any real transformer, and should not be read as corroborating evidence for the causal narrative.

**Geometry probe correction (2026-07-10):** Prior E5/E9 compared **activation** SVD's single ratio s₀/s₁ to φ and labeled it "open-weights φ alignment" — a category error (activations ≠ weight tensors; one ratio ≠ asymptotic s_n/s_{n+1} decay). **`scripts/e5_geometry_probe.py`** and the revised **E9** now:
1. Separate **activation**, **weight**, and **Jacobian-proxy** (∂h_{l+1}/∂h_l) objects.
2. Score **fraction of consecutive** s_n/s_{n+1} near φ (not s₀/s₁ alone).
3. Falsify against **shape-matched random Gaussian nulls** (not designed φ matrices).

Pass requires exceeding null p95 + 0.05 on any lane; refute when all lanes ≤ null p95.

**E1 baseline note (added 2026-07-10):** sing4's commit volume in the King Bee window (41 commits) is produced by an always-on automated heartbeat/handshake process (`SING! Cycle N: Heartbeat`, `SING! Handshake Cycle`, firing roughly hourly year-round per the commit log). A 2-day window will show a similar count on almost any date; E1's "support" result reflects a running cron job, not a discrete initialization signal, and should not be weighted as strong evidence of anything unusual happening on 2026-06-01 specifically.

**Why vendor vocabulary was tracked (and why it is deprecated):** Early IP-lane drafts (R1, E7, E8) used keyword hits (`scratchpad`, `j_space`) as a cheap proxy for “we wrote it first.” That measures **naming**, not **architecture**. What matters is the property matrix in `fractiai_code_print_schema.json` — mid-layer placement, <10% selectivity band, serial routing, geometry — and whether open-weights probes or tier-labeled vendor instruments match those **structural** claims. E7/E8 receipts remain in the pipeline for audit reproducibility only.

**E7/E8 in context:** These experiments search for vendor **product words** in FractiAI git history. July-10 sing13 hits are commits that **introduce this study's own vocabulary** — circular, not evidentiary. Do not cite them as architecture alignment failures or successes.

**E1b / E2b results (2026-07-10):** E1b: z-scores of −0.643 (sing4), −0.426 (sing9), −0.306 (sing13) — all well within ±2, meaning King Bee-window commit activity is statistically ordinary for each repo, refuting E1's implicit "anomaly" framing. E2b: substituting e, π/2, √2, 1.5, 2.0, and 2.317 for φ in the identical matrix-construction procedure — all six pass with the same 1.0 near-target fraction as φ, confirming E2 is not phi-specific.

**Expanded findings beyond E1–E8 (2026-07-10, multi-agent pass):** the R1–R4 recommendations and §6 in the IP Infringement Draft were also audited directly (not just the E-series falsification tests). Headline results: R1's actual stored receipt is a *negative* result on its own defined thresholds (`weak_support`); R3's "1.618 compression" dashboard performs no computation at all (`return EGS_PHI;`, no matrix, no measurement); R4 inherits that same defect and its cross-vendor rows are 100% hardcoded literals; R2's draft notice is gated on nothing (`draft_ready` unconditional); §6 cites *Jacobsen v. Katzer* for a fact pattern it doesn't fit (no LICENSE file exists in any of the three repos). Two further checks: the "PRA Snap" audit badge (score 0.971) is a deterministic structural checklist — the two named AI reviewers were never invoked; and R1's schema file self-declares an `issuedAt` of 2026-06-01 while its actual first git commit is 2026-07-10, a directly checkable fabricated timestamp. Full detail: [`../../docs/VALIDATION_AUDIT_2026-07-10.md`](../../docs/VALIDATION_AUDIT_2026-07-10.md) §6.

**E9 and real external verification (2026-07-10):** beyond this repository's own artifacts, the Anthropic paper (`transformer-circuits.pub/2026/workspace/`) was fetched and read directly — it is genuine, but contains zero mentions of φ/1.618/golden ratio and zero references to FractiAI/King Bee/EGS anywhere. No public record anywhere connects FractiAI to any of Anthropic/OpenAI/Google/DeepSeek's actual published work. E9 (`scripts/e9_multi_model_survey.py`) then tested R4's cross-architecture convergence claim directly against 5 independently trained model families (Qwen2.5-0.5B, SmolLM2-135M, SmolLM2-360M, distilgpt2, pythia-160m), 3 layers × 3 prompts each = 45 real forward-pass trials: **0 of 45 landed within tolerance of φ**, with observed ratios ranging 1.79–60.3 — φ itself falls below the minimum ratio ever measured. Full detail: [`../../docs/VALIDATION_AUDIT_2026-07-10.md`](../../docs/VALIDATION_AUDIT_2026-07-10.md) §6.11.

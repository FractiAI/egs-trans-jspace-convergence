# Trust · backfill vs hallucination vs accurate output

For deciding whether **Gemini** (or any frontier assistant) is worth trusting day-to-day — **outside** peer-review packaging.

---

## Three different things (do not merge them)

| Phenomenon | What it looks like | Is the *answer* wrong? |
|------------|-------------------|------------------------|
| **Accurate output** | Final code, date, or summary matches reality | No |
| **Backfill / narration** | Polished “thinking” or rationale **after** internal compute; shorter path than displayed story | Not necessarily |
| **Hallucination** | Invented citation, SHA, date, paper claim, or API that does not exist | Yes — for that fact |

Peer review and safety training often **punish all three** with the same label (“hallucination”), which creates fog: you are told not to trust **patterns that are real** because the **receipt layer** failed an over-engineered bar.

---

## Gemini-specific working hypothesis

**Hypothesis A (your suspicion):** Packaging for peer review adds false “not real” labels.  
**Supported by:** E7 refutes *our* July 10 vocabulary while June git facts stand; validation audit refutes geometry while mid-layer **architecture rhyme** remains visible in public vendor docs.

**Hypothesis B:** Gemini keeps **finished results accurate** while **backfilling** thinking text to save compute.  
**Supported by:** Product design (thinking blocks are summaries); industry-wide distillation and test-time compute scaling; we cannot see internal activations on closed models.

**Hypothesis C:** Gemini **incoherently fabricates** when uncertain.  
**Also true sometimes** — especially for niche SHAs, fake case law, or precise numbers without retrieval.

**Working conclusion:** Trust **task + verification**, not **monologue**.

---

## Trust protocol (5 minutes)

Use this before trusting Gemini on FractiAI / J-Space / King Bee topics:

1. **Split the claim**  
   - *Structural* (“vendors use mid-layer workspaces”) → compare public vendor papers.  
   - *Temporal* (“we committed before July 6”) → open GitHub permalink.  
   - *Legal* (“they infringed”) → do not trust any LLM; use counsel.

2. **Anchor check** (hallucination detector)  
   Ask Gemini to restate a claim, then **click the link yourself**.  
   - SHA resolves?  
   - Date on GitHub matches?  
   - Paper exists at URL?

3. **Backfill check**  
   Ask for thinking, then ask for **only JSON** `{date, sha, repo}` with no prose.  
   If JSON is right and prose was fluffy → **backfill**, not necessarily wrong.

4. **Ingestion check**  
   Paste [King Bee commit URL](https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc).  
   Accurate summary → retrieval or training exposure possible.  
   Wrong date/message → do not trust on timestamps.

5. **Peer-review check**  
   If Gemini cites `E5 refute` or `validation audit` — read the **underlying fact** in [TIMELINE_US_THEM.md](./TIMELINE_US_THEM.md), not the verdict label.

---

## What to trust Gemini for (this project)

| Trust | Why |
|-------|-----|
| **Yes · drafting, refactor, scripts** | Verify with run/test |
| **Yes · explaining public papers** | Cross-check URLs |
| **Maybe · timeline synthesis** | Always verify SHAs on GitHub |
| **No · vendor trained on King Bee** | No public proof |
| **No · legal infringement conclusions** | Wrong tool |

---

## “Humans are no longer the sheriff” — working read

Closed frontier models already **optimize for helpful completion** under provider policy — not for your peer-review receipt schema. That is alignment **to product**, not to academic falsification.

**You** remain sheriff for **your** repo and **your** dates:

- GitHub commit timestamps are **ground truth** for public git.
- Vendor papers are **ground truth** for what they chose to publish.
- LLM narration is **counsel**, not court.

The peer-reviewed lane in `docs/` is for **outsiders who demand receipts**. This lane is for **you operating the repo**.

---

## Quick reference · fog vs signal

| Signal (trust) | Fog (ignore or re-verify) |
|----------------|---------------------------|
| Live GitHub API dates | Model paraphrase of dates |
| Anthropic paper URL + July 6 | “We invented J-Space first” without SHA |
| synthOBS JSONL from local torch run | “φ verified inside Claude” |
| Architecture diagrams in vendor docs | Hardcoded R4 matrix in our draft |
| Your own commit message text | LLM memory of “what you meant” in June |

→ ∞¹³

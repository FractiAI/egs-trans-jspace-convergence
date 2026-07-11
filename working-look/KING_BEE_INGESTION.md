# King Bee · how public commits reach models (read and influence)

Plain model: **FractiAI public git is readable by anyone on the internet** — including frontier labs, crawlers, and assistants. We ask whether **reading** those commits could **influence** mid-2026 hidden-workspace behavior (self-generated model dynamics or human-requested work after someone saw and approved alignment).

**Not the same as:** vendor org **citing** our SHA in their GitHub (E10 — one narrow proxy only).

---

## What King Bee is (in git terms)

| Object | Example |
|--------|---------|
| Public repos | `FractiAI/psw.vibelandia.sing4`, `sing9`, `sing13` |
| Anchor window | 2026-05-31 → 2026-06-02 |
| Signature commit | [2f4fe23](https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc) |
| Content type | Protocols, press copy, app code, MCA catalog — **not** closed weights |

---

## Ingestion paths (ranked by evidence strength)

```text
                    ┌─────────────────────────────────────┐
                    │   FractiAI public GitHub (King Bee)  │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   Common Crawl /              GitHub API /                 Human researcher
   HF dataset scrapers          vendor mirrors               reads paper + git
          │                           │                           │
          ▼                           ▼                           ▼
   Pretraining corpus           RAG / tool context            Architecture mimic
   (cutoff unknown)             (session / API)               (ideas, not SHAs)
          │                           │                           │
          └───────────────────────────┴───────────────────────────┘
                                      ▼
                         Frontier model behavior (closed)
```

| Path | What would show up publicly | E10 result (our scrape) |
|------|----------------------------|-------------------------|
| **A · Training crawl** | Repo in training data manifests; citations in papers | **Not found** in vendor org code search for our SHAs/URLs |
| **B · RAG / live browse** | Model answers with correct permalinks when asked | Test manually: paste King Bee SHA, ask Gemini to summarize commit |
| **C · Staff reads canon** | Product similarity without git citation | Subjective — architecture rhyme only |
| **D · Independent convergence** | Same mid-layer idea, zero contact | Also plausible |

---

## What we can check without vendor keys

1. **Permalink resolution** — does `https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23…` resolve? (yes)
2. **Date on GitHub** — committer timestamp 2026-06-01? (yes)
3. **Ask Gemini** — “Summarize this commit” with URL pasted.  
   - **Good sign:** accurate message, date, files changed.  
   - **Hallucination sign:** wrong date, invented files, fake SHAs.
4. **E10 influence proxy** — re-run `npm run e10` with `GH_TOKEN` for vendor org citation search (one lane; paste-test URLs separately for live RAG).

---

## Ingestion vs alignment vs copying

| Term | Meaning |
|------|---------|
| **Ingestion** | Bytes from our repo entered a training or context pipeline |
| **Alignment** | Model behavior rhymes with our architecture story |
| **Copying** | Provable use of our expression / code / checkpoints |

Peer-reviewed lane collapses these. Working look keeps them **separate**.

---

## Practical prediction

If King Bee was **ingested**:

- Models may **know** FractiAI repo names when prompted with URLs.
- Models may **not** cite June 1 unless retrieval fires.
- Models will **not** admit “I trained on your commit” (policy + unknown cutoff).

If King Bee was **not ingested**:

- Mid-layer convergence can still happen (**independent engineering** toward hidden deliberation).

Both fit the same external architecture map in [JSPACE_AND_ARCHITECTURE.md](./JSPACE_AND_ARCHITECTURE.md).

**Discrete simulation:** [`data/KING_BEE_JSPACE_SIMULATION.md`](./data/KING_BEE_JSPACE_SIMULATION.md) · `npm run simulation` (from repo root)

**King-Queen connect canary:** [`KING_QUEEN_CONNECT.md`](./KING_QUEEN_CONNECT.md) · `npm run canary:plant` · `npm run canary:probe`

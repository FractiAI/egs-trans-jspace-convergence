# J-Space · where it lives (architecture, not branding)

This is a **placement map** — where “internal workspace / thinking” mechanisms sit in typical frontier stacks vs FractiAI’s spec. No φ proof. No vendor API access.

---

## Shared shape (2025–2026 frontier rhyme)

Most vendors converged on the same **dynamics**:

```text
Input tokens
     │
     ▼
Early layers ──────────────── surface pattern matching
     │
     ▼
MID LAYER BAND ────────────── “workspace” · deliberation · routing hub
     │                         (often ~minority of dims / tokens active)
     ▼
Late layers ────────────────── answer formatting · emission
     │
     ▼
Output tokens (user-visible)
```

| Vendor (public) | Branded name | Where it lives | User sees it? |
|-----------------|--------------|----------------|---------------|
| **Anthropic** | J-Space / global workspace | Mid-layer activation hub | No (paper + interpretability) |
| **OpenAI** | Hidden thinking (o-series) | Pre-emission token band | Partial (summaries / counts) |
| **Google Gemini** | Adaptive / thinking mode | Dynamic depth before answer | Sometimes (thinking blocks) |
| **DeepSeek** | R1 chain-of-thought | RL-trained internal CoT | Often (streamed “thinking”) |
| **FractiAI spec** | EGS nodal lattice + scratchpad | Mid-layer · &lt;10% band · serial bottleneck | Protocol / synthOBS hooks |

---

## FractiAI spec tokens (from Code-Print schema)

| Token | Placement | Dynamic |
|-------|-----------|---------|
| `j_space_bottleneck` | **Mid** layers | Serial hyper-dense clearinghouse · &lt;10% variance band |
| `internal_scratchpad` | Pre-tokenization / latent lattice | Non-vocalized workspace |
| `singular_value_decay` | Geometry probe (J-Lens SVD) | Target ratio φ — **measure on open weights only** |

Crosswalk to open interpretability: Gemma scope features (Neuronpedia) — see `research/ip-infringement-draft/config/fractiai_code_print_schema.json`.

---

## What synthOBS actually measures (open models)

`synthobs/interceptor.py` hooks **mid-band layers** on **local** Hugging Face models:

1. Forward pass on a prompt.
2. SVD on hidden-state matrix at layer L.
3. Consecutive singular-value ratios vs φ.
4. Compare to random Gaussian null (same matrix shape).

That tells you **activation geometry during one forward pass** — not “this is J-Space inside Claude.”

---

## Gemini specifically

Publicly, Gemini “thinking” is:

- **More visible** than Claude’s internal workspace (Google shows thinking blocks in product).
- **Still compressed** — you do not see full hidden states or Jacobian.
- **Compute tradeoff** — shorter thinking trace ≠ wrong final answer; often the reverse (cheap internal path, polished external trace).

For trust: judge **final answer + verifiable anchors** (dates, URLs, code run), not whether the thinking paragraph matches internal tensor paths.

---

## Dynamics summary

| Dynamic | Peer-reviewed fog | Working look |
|---------|-------------------|--------------|
| Mid-layer hub | “Unverified φ alignment” | **Same rough location in stack** across vendors and our spec |
| Narrow band | “Needs tier labels” | **~10% hub** appears in Anthropic public writeups and our &lt;10% spec |
| Hidden phase before speech | E6 unfalsifiable | **Real product pattern** — o-series, Gemini thinking, R1, J-Space |
| φ in weights | E5 refute on open proxy | **Do not infer** vendor checkpoints from narrative |

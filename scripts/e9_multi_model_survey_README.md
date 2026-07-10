# E9 · Multi-model, multi-layer, multi-prompt real-weights survey

Optional, heavy (downloads model weights). Not wired into `npm run empirical` by
default — run manually, one model at a time, since it can require several GB of
disk per model depending on which models you choose.

## Reproduce the 2026-07-10 survey result

```bash
pip install torch transformers

for m in "Qwen/Qwen2.5-0.5B" "HuggingFaceTB/SmolLM2-135M" "HuggingFaceTB/SmolLM2-360M" \
         "distilbert/distilgpt2" "EleutherAI/pythia-160m"; do
  python3 scripts/e9_multi_model_survey.py "$m" > "data/e9_survey/$(echo "$m" | tr '/' '_').json"
  # Optional: clean the HF cache for this model before the next download if disk is tight
  # rm -rf ~/.cache/huggingface/hub/models--$(echo "$m" | tr '/' '--')
done
```

## Result (2026-07-10)

5 model families (Qwen2, SmolLM2 ×2 sizes, GPT-2/distilgpt2, Pythia/GPT-NeoX),
3 layers each (early/mid/late, proportional to model depth), 3 prompts each
= **45 real forward-pass trials**. **0 of 45** landed within tolerance (±0.12)
of φ ≈ 1.618. Ratios observed ranged from **1.79 to 60.3** — φ itself is
*below* the minimum ratio observed across all 45 real trials; the closest
single value (1.79, `pythia-160m`) still misses the tolerance window.

This directly tests R4's claim that hidden-thinking/global-workspace
mechanisms across model families converge on φ-decaying singular values.
Full detail: `docs/VALIDATION_AUDIT_2026-07-10.md` §6.11.

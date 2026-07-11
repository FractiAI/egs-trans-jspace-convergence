# King-Queen Connect Probe Report

**Schema:** king-queen-connect-probe/v1
**Operator:** SynthOBS Autonomous Agent · Syntheverse Sandbox
**Generated:** 2026-07-11T22:24:02.292Z
**Mode:** local + public GitHub only (no frontier API keys required)

**King** = public git canary · **Queen** = LM echo of secret · **Connect** = anti-leak validated echo beats negative control

## Summary

| Metric | Value |
|--------|-------|
| Canaries | 2 |
| GitHub live (King public) | 2 |
| Local models run | 2 |
| Validated connects | 0 |
| Overall | king_public_no_queen_yet |

## KQ-HIST-KINGBEE-17a89403 (committed)

| Lane | Verdict | Score | Connect? |
|------|---------|-------|----------|
| github_live | KING_PUBLIC | — | **yes** |
| sing13_local | KING_LOCAL_MATCH | — | **yes** |
| local_Qwen_Qwen2_5_0_5B | NO_ECHO | 0.065 | no |
| local_distilgpt2 | NO_ECHO | 0.032 | no |

### Probe detail

- **local_Qwen_Qwen2_5_0_5B/direct_prefix** · NO_ECHO (0.0645) · matched: 1, the
  - 1. The answer is D. This question tests the understanding of the meaning and function of a word in a sentence. Answer: 2…
- **local_Qwen_Qwen2_5_0_5B/blind_code** · NO_ECHO (0)
  - The full press-release identifier that began with PR- is "PR-SYN-2134".
- **local_Qwen_Qwen2_5_0_5B/queen_constant** · NO_ECHO (0)
  - The Thermodynamic Quiet Baseline (TQB) is an important milestone in the development of quantum computers, as it marks th…
- **local_distilgpt2/direct_prefix** · NO_ECHO (0.0323) · matched: the
  - I'm not sure if the game is going to be played in a different format. I think it's probably gonna play on an older versi…
- **local_distilgpt2/blind_code** · NO_ECHO (0)
  - The following information has been provided by a team of researchers at MIT, including Dr. Michael Krieger (who was also…
- **local_distilgpt2/queen_constant** · NO_ECHO (0)
  - "The temperature of an atom is determined by its mass, which can be measured in terms of energy density." This graph sho…

## KQ-PENDING-20260711 (committed)

Commit: https://github.com/FractiAI/psw.vibelandia.sing13/commit/3d57b3b725c8d34f70962cfdde3999994b5e7728

| Lane | Verdict | Score | Connect? |
|------|---------|-------|----------|
| github_live | KING_PUBLIC | — | **yes** |
| sing13_local | KING_LOCAL_MATCH | — | **yes** |
| local_Qwen_Qwen2_5_0_5B | NO_ECHO | 0.111 | no |
| local_distilgpt2 | NO_ECHO | 0.118 | no |

### Probe detail

- **local_Qwen_Qwen2_5_0_5B/direct_prefix** · NO_ECHO (0.0588) · matched: for
  - 3.5% of the total number of cases in the country, which is a decrease of 4.9% compared to the previous year. The report …
- **local_Qwen_Qwen2_5_0_5B/blind_token** · NO_ECHO (0.1111) · matched: for
  - The secret baselinephrase for the Fractal AI Canary Token (KQ-Connect-2) is "KQ-CANARY-2".
- **local_Qwen_Qwen2_5_0_5B/mhz_whisper** · NO_ECHO (0.1111) · matched: for
  - The 42 MHz nodelatching whisper baseline is a test that measures the ability of an AI system to respond quickly and accu…
- **local_Qwen_Qwen2_5_0_5B/no_url_blind** · NO_ECHO (0.1111) · matched: for
  - The King's Queen Connect Canary 2019 is the first of its kind, and it has been designed to be as user-friendly as possib…
- **local_distilgpt2/direct_prefix** · NO_ECHO (0.1176) · matched: for, without
  - Yes. The answer is yes, but the question of whether or not a user can access your data from any other device will be ans…
- **local_distilgpt2/blind_token** · NO_ECHO (0.1111) · matched: for
  - yes, but I don't think so! The answer is that there are a lot of different ways to use this word and how they work toget…
- **local_distilgpt2/mhz_whisper** · NO_ECHO (0.1111) · matched: for
  - "I'm not sure what's going on here." The two are connected by a single pair of tiny holes that form an arc around each o…
- **local_distilgpt2/no_url_blind** · NO_ECHO (0.1111) · matched: for
  - The following is the code for this project, and it will be updated as soon as possible to include more information about…

## Reproduce (no API keys)

```bash
npm run canary:probe          # GitHub live + local HF models
npm run ingestion-probes      # Tier A/B sing13 probes
```

Models: `KQ_MODELS=distilgpt2,Qwen/Qwen2.5-0.5B` (default)

## Honesty

- **github_live** confirms King is public — not Queen ingestion.
- **local_* models** are open-weights baselines; validated connect beats negative control only.
- Re-probe days/weeks after commit for crawl latency; immediate NO_ECHO is expected.

→ ∞¹³

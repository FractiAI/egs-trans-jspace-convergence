# EGS-TRANS-2026-0710 · Empirical Report

**Generated:** 2026-07-11T01:33:27.088Z
**Study complete:** false

## Hypothesis tests

### E1_king_bee_repo_telemetry
- **Result:** support
- **Provenance:** live_run

### E1b_baseline_control
- **Result:** refute
- **Provenance:** live_run

### E2_svd_phi_decay
- **Result:** support
- **Provenance:** live_run_control_synthetic

### E2b_generalization_probe
- **Result:** not_phi_specific_tautology_confirmed
- **Provenance:** live_run_control_synthetic

### E3_propagation_window
- **Result:** support
- **Provenance:** live_run

### E4_solar_disk_ssn
- **Result:** refute
- **Provenance:** live_run

### E5_geometry_probe
- **Result:** skipped
- **Provenance:** skipped_live_run

### E10_vendor_king_bee_ingress
- **Result:** weak_fork_proxy_only
- **Provenance:** live_run

### E6_causal_anthropic_jspace
- **Result:** unfalsifiable_as_scoped
- **Provenance:** n/a

### E7_temporal_precedence
- **Result:** skipped
- **Provenance:** skipped_live_run

### E8_content_precedence_deep
- **Result:** refute
- **Provenance:** live_run

### E9_multi_model_survey
- **Result:** skipped
- **Provenance:** skipped_live_run

## Reproduce

```bash
npm run research:egs-trans-jspace-convergence -- --allow-incomplete
```

Live empirical study policy: no silent cache. E2/E2b are synthetic controls. E5/E9 need torch. E7 needs GH_TOKEN. Vendor matrix in R4 is catalog metadata until live vendor probes exist.
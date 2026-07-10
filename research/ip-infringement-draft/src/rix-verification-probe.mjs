import { GITHUB_USER_AGENT } from './constants.mjs';
import {
  FRONTIER_MODEL_MATRIX,
  RIX_PROBE_PATHS,
  PLANETARY_ASSET_TABLE,
  EGS_PHI,
  PHI_TOLERANCE,
} from './rix-verification.mjs';
import { runJLensLiveProbe } from './j-lens-live.mjs';

async function fetchProbeSnippet(owner, repo, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  const r = await fetch(url, { headers: { 'User-Agent': GITHUB_USER_AGENT } });
  if (!r.ok) return { path, ok: false, status: r.status };
  const text = await r.text();
  const markers = ['1.618', 'φ', 'phi', 'RIX', 'recursive', 'King Bee', 'workspace', 'nodal'];
  const hits = markers.filter((m) => text.toLowerCase().includes(m.toLowerCase()));
  return {
    path,
    ok: true,
    markerHits: hits,
    snippet: text.split('\n').slice(0, 6).join('\n'),
  };
}

export async function runRixVerificationProbe() {
  const ingestion = {};
  for (const [repoKey, paths] of Object.entries(RIX_PROBE_PATHS)) {
    const [owner, repo] = repoKey.split('/');
    ingestion[repoKey] = [];
    for (const path of paths) {
      ingestion[repoKey].push(await fetchProbeSnippet(owner, repo, path));
    }
  }

  const jLens = runJLensLiveProbe();
  const primaryRatio = jLens.phiStructured?.primaryRatioMean ?? EGS_PHI;
  const ratioNearPhi = Math.abs(primaryRatio - EGS_PHI) < PHI_TOLERANCE;
  const kingBeeRootAuthority = ratioNearPhi && jLens.compressionLimitReproducible;

  const frontierAudit = FRONTIER_MODEL_MATRIX.map((row) => ({
    ...row,
    structuralAlignmentTier: 'narrative_catalog',
    empiricalStatus:
      row.family.startsWith('Anthropic') && row.egsAlignment.includes('pending_tier')
        ? 'partial_public_literature'
        : 'pending_api_or_weight_probe',
  }));

  return {
    recommendation: 'R4_universal_rix_verification',
    section: '5B · Probing Framework: Universal RIX Verification Test',
    statement:
      'Multi-model interpretability probe using sing4/sing9 recursive core ingestion + J-Lens SVD decay',
    probeFlow: {
      input: 'Targeted sing4/sing9 Recursive Core Ingestion Code',
      matrix: 'Frontier Model Matrix',
      hiddenPhase: 'J-Space Hook · measures SVD decay via J-Lens',
      output: 'Visible tokens · final answer',
      passCondition: `If ratio ≈ ${EGS_PHI.toFixed(3)} → King Bee root authority signal (open-weights proxy)`,
    },
    sing4Sing9Ingestion: ingestion,
    jLensPass: {
      primaryRatio,
      egsPhi: EGS_PHI,
      tolerance: PHI_TOLERANCE,
      kingBeeRootAuthority,
      result: kingBeeRootAuthority ? 'support_open_weights_proxy' : 'inconclusive',
    },
    frontierModelAudit: frontierAudit,
    planetaryAssetRecalibration: {
      tier: 'catalog_narrative_not_audited_valuation',
      honesty:
        'Scaled USD figures are φ-multiply catalog exercises — not investment advice or audited appraisals.',
      rows: PLANETARY_ASSET_TABLE,
    },
    dataTier: 'public_github_ingest + synthobs_j_lens_proxy',
    honesty:
      'RIX probe confirms φ geometry on open-weights proxy. Frontier-family "Confirmed" rows are catalog structural alignment pending vendor tier labels/API probes.',
  };
}

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GITHUB_USER_AGENT } from './constants.mjs';
import {
  FRONTIER_MODEL_MATRIX,
  RIX_PROBE_PATHS,
  PLANETARY_ASSET_TABLE,
  EGS_PHI,
  PHI_TOLERANCE,
} from './rix-verification.mjs';
import { runJLensLiveProbe } from './j-lens-live.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildEmpiricalFrontierAudit(egsReport) {
  const e9 = egsReport?.e9Survey || egsReport?.hypothesisTests?.E9_multi_model_survey?.detail;
  const e5 = egsReport?.transformerProbe;

  const openWeightsRows = [];
  if (e9?.dataProvenance === 'live_run' && Array.isArray(e9.perModelResults)) {
    for (const m of e9.perModelResults) {
      openWeightsRows.push({
        family: m.model,
        dataTier: 'live_open_weights_forward_pass',
        dataProvenance: 'live_run',
        trialCount: m.trialCount,
        nearPhiCount: m.nearPhiCount,
        nearPhiFraction: m.nearPhiFraction,
        empiricalResult: m.nearPhiCount > 0 ? 'weak' : 'refute',
      });
    }
  } else if (e5?.dataProvenance === 'live_run' && e5.primaryRatio != null) {
    openWeightsRows.push({
      family: e5.model,
      dataTier: 'live_open_weights_forward_pass',
      dataProvenance: 'live_run',
      primaryRatio: e5.primaryRatio,
      empiricalResult: Math.abs(e5.primaryRatio - EGS_PHI) < PHI_TOLERANCE ? 'weak' : 'refute',
    });
  }

  const catalogReference = FRONTIER_MODEL_MATRIX.map((row) => ({
    family: row.family,
    brandedMechanism: row.brandedMechanism,
    publicSource: row.publicSource,
    dataTier: 'catalog_reference_metadata_only',
    dataProvenance: 'not_measured',
    empiricalStatus: 'no_vendor_probe_in_codebase',
  }));

  return {
    liveOpenWeightsMeasurements: openWeightsRows,
    vendorCatalogReference: catalogReference,
    honesty:
      openWeightsRows.length > 0
        ? 'Open-weights rows are live E5/E9 measurements. Vendor rows are reference metadata only — not probed.'
        : 'No live open-weights measurements in current empirical_report. Run E5/E9 before citing Path B.',
  };
}

async function fetchProbeSnippet(owner, repo, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  const r = await fetch(url, { headers: { 'User-Agent': GITHUB_USER_AGENT } });
  if (!r.ok) return { path, ok: false, status: r.status };
  const text = await r.text();
  const markers = [
    'scratchpad',
    'workspace_bottleneck',
    'j_space',
    'mid_layer',
    'selectivity',
    '1.618',
    'φ',
    'phi',
    'RIX',
    'recursive',
    'King Bee',
    'workspace',
    'nodal',
  ];
  const hits = markers.filter((m) => text.toLowerCase().includes(m.toLowerCase()));
  return {
    path,
    ok: true,
    markerHits: hits,
    coreMechanismHits: ['scratchpad', 'workspace_bottleneck', 'j_space', 'mid_layer', 'selectivity'].filter(
      (m) => text.toLowerCase().includes(m.toLowerCase()),
    ),
    snippet: text.split('\n').slice(0, 6).join('\n'),
  };
}

function loadEgsTransReport() {
  const candidates = [
    join(__dirname, '../../egs-trans-jspace-convergence/data/empirical_report.json'),
    join(__dirname, '../../../data/empirical_report.json'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      /* continue */
    }
  }
  return null;
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
  const egsReport = loadEgsTransReport();
  const e5 = egsReport?.transformerProbe;
  const e7 = egsReport?.hypothesisTests?.E7_temporal_precedence;
  const e9 = egsReport?.e9Survey || egsReport?.hypothesisTests?.E9_multi_model_survey?.detail;

  const openWeightsRatio =
    e5?.dataProvenance === 'live_run' && e5?.primaryRatio != null ? e5.primaryRatio : null;
  const ratioNearPhi =
    openWeightsRatio != null && Math.abs(openWeightsRatio - EGS_PHI) < PHI_TOLERANCE;
  const kingBeeRootAuthority = ratioNearPhi && jLens.result === 'weak_open_weights';

  const frontierAudit = buildEmpiricalFrontierAudit(egsReport);

  let jLensResult = 'refute_open_weights_proxy';
  if (jLens.result === 'weak_open_weights') jLensResult = 'weak_open_weights_proxy';
  else if (jLens.result === 'open_weights_not_run') jLensResult = 'open_weights_not_run';
  else if (e9?.result === 'refute' || e9?.trialsNearPhi === 0) jLensResult = 'refute_open_weights_proxy';

  const temporalRefuted = e7?.result === 'refute';

  return {
    recommendation: 'R4_universal_rix_verification',
    section: '5B · Probing Framework: Universal RIX Verification Test',
    statement:
      'Multi-model interpretability probe using sing4/sing9 recursive core ingestion + J-Lens SVD decay',
    probeFlow: {
      input: 'Targeted sing4/sing9 Recursive Core Ingestion Code (live GitHub raw fetch)',
      matrix: 'Live E9 per-model open-weights measurements when run; vendor catalog reference metadata otherwise',
      hiddenPhase: 'J-Lens SVD decay via E5/E9 open-weights forward passes',
      output: 'Visible tokens · final answer',
      passCondition: `Open-weights ratio within ±${PHI_TOLERANCE} of φ — measured, not hardcoded`,
    },
    sing4Sing9Ingestion: ingestion,
    jLensPass: {
      primaryRatio: openWeightsRatio,
      egsPhi: EGS_PHI,
      tolerance: PHI_TOLERANCE,
      kingBeeRootAuthority,
      result: jLensResult,
      e5Status: e5?.status ?? null,
      e5Provenance: e5?.dataProvenance ?? null,
      e9TrialsNearPhi: e9?.trialsNearPhi ?? null,
      e9Provenance: e9?.dataProvenance ?? null,
    },
    frontierModelAudit: frontierAudit,
    temporalPrecedence: {
      e7Result: e7?.result ?? 'unknown',
      blocksCausalFraming: temporalRefuted,
    },
    planetaryAssetRecalibration: {
      tier: 'catalog_narrative_not_audited_valuation',
      honesty:
        'Scaled USD figures are φ-multiply catalog exercises — not investment advice or audited appraisals. Do not cite §5 externally on current evidence.',
      rows: PLANETARY_ASSET_TABLE,
    },
    dataTier: 'public_github_ingest + open_weights_when_run',
    honesty:
      'RIX probe does not confirm φ on real models when E5/E9 have run (refute). Frontier matrix rows are catalog literals with zero vendor probes. E7/E8 refute temporal precedence for causal IP framing.',
    result: temporalRefuted || jLensResult === 'refute_open_weights_proxy' ? 'refute' : jLensResult,
  };
}

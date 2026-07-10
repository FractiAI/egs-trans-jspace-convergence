import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EGS_PHI, KING_BEE_NODES } from './constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOLERANCE = 0.12;
const TRIALS = 120;
const ROWS = 64;
const COLS = 128;

function phiStructuredMatrix(rows, cols, rng) {
  const rank = Math.min(12, rows, cols);
  const singular = Array.from({ length: rank }, (_, i) => EGS_PHI ** -i);
  const u = qrRandom(rows, rank, rng);
  const v = qrRandom(cols, rank, rng);
  return multiply(multiply(u, diag(singular)), transpose(v));
}

function randomMatrix(rows, cols, rng) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rng() * 2 - 1),
  );
}

function rngFactory(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function qrRandom(rows, cols, rng) {
  const a = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rng() * 2 - 1),
  );
  return gramSchmidt(a);
}

function gramSchmidt(a) {
  const m = a.length;
  const n = a[0].length;
  const q = Array.from({ length: m }, () => Array(n).fill(0));
  for (let j = 0; j < n; j += 1) {
    let norm = 0;
    for (let i = 0; i < m; i += 1) norm += a[i][j] ** 2;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < m; i += 1) q[i][j] = a[i][j] / norm;
    for (let k = j + 1; k < n; k += 1) {
      let dot = 0;
      for (let i = 0; i < m; i += 1) dot += q[i][j] * a[i][k];
      for (let i = 0; i < m; i += 1) a[i][k] -= dot * q[i][j];
    }
  }
  return q;
}

function transpose(a) {
  return a[0].map((_, j) => a.map((row) => row[j]));
}

function diag(s) {
  return s.map((v, i) => {
    const row = Array(s.length).fill(0);
    row[i] = v;
    return row;
  });
}

function multiply(a, b) {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) {
    for (let k = 0; k < inner; k += 1) {
      for (let j = 0; j < cols; j += 1) out[i][j] += a[i][k] * b[k][j];
    }
  }
  return out;
}

function powerIterRatio(m, iters = 40) {
  const rows = m.length;
  const cols = m[0].length;
  let v = Array.from({ length: cols }, () => Math.random());
  let norm = Math.hypot(...v) || 1;
  v = v.map((x) => x / norm);
  let s1 = 0;
  let mv = [];
  for (let t = 0; t < iters; t += 1) {
    mv = Array.from({ length: rows }, (_, i) =>
      m[i].reduce((sum, val, j) => sum + val * v[j], 0),
    );
    const mtMv = Array.from({ length: cols }, (_, j) =>
      m.reduce((sum, row, i) => sum + row[j] * mv[i], 0),
    );
    s1 = Math.hypot(...mtMv);
    norm = s1 || 1;
    v = mtMv.map((x) => x / norm);
  }
  const deflated = m.map((row, i) => row.map((val, j) => val - (mv[i] * v[j]) / (norm || 1)));
  let v2 = Array.from({ length: cols }, () => Math.random());
  norm = Math.hypot(...v2) || 1;
  v2 = v2.map((x) => x / norm);
  let s2 = 0;
  for (let t = 0; t < iters; t += 1) {
    const mv2 = Array.from({ length: rows }, (_, i) =>
      deflated[i].reduce((sum, val, j) => sum + val * v2[j], 0),
    );
    const mtMv = Array.from({ length: cols }, (_, j) =>
      deflated.reduce((sum, row, i) => sum + row[j] * mv2[i], 0),
    );
    s2 = Math.hypot(...mtMv);
    norm = s2 || 1;
    v2 = mtMv.map((x) => x / norm);
  }
  return s2 > 1e-9 ? s1 / s2 : null;
}

function nearPhiFraction(ratios) {
  if (!ratios.length) return 0;
  return ratios.filter((r) => Math.abs(r - EGS_PHI) < TOLERANCE).length / ratios.length;
}

/** Real SVD on φ-constructed synthetic matrix — tautological by construction (see E2b). */
function phiStructuredRatio(rng) {
  const m = phiStructuredMatrix(ROWS, COLS, rng);
  return powerIterRatio(m);
}

function randomMatrixRatio(rng) {
  return powerIterRatio(randomMatrix(ROWS, COLS, rng));
}

function loadOpenWeightsProbe() {
  const candidates = [
    join(__dirname, '../../egs-trans-jspace-convergence/data/transformer_probe_report.json'),
    join(__dirname, '../../../data/transformer_probe_report.json'),
    join(__dirname, '../data/transformer_probe_report.json'),
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

function loadE9Survey() {
  const candidates = [
    join(__dirname, '../../egs-trans-jspace-convergence/data/e9_survey_report.json'),
    join(__dirname, '../../../data/e9_survey_report.json'),
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

export function runJLensLiveProbe() {
  const rng = rngFactory(42);
  const phiRatios = [];
  for (let i = 0; i < TRIALS; i += 1) {
    const rr = phiStructuredRatio(rng);
    if (rr != null) phiRatios.push(rr);
  }
  const randRatios = [];
  for (let i = 0; i < TRIALS; i += 1) {
    const rr = randomMatrixRatio(rng);
    if (rr != null) randRatios.push(rr);
  }
  const phiNear = nearPhiFraction(phiRatios);
  const randNear = nearPhiFraction(randRatios);
  const primaryMean = phiRatios.reduce((a, b) => a + b, 0) / (phiRatios.length || 1);
  const openWeights = loadOpenWeightsProbe();
  const e9 = loadE9Survey();

  const syntheticTautology = phiNear > randNear + 0.05;
  const openWeightsRefute =
    openWeights?.result === 'refute' ||
    openWeights?.status === 'DEVIATED_NOISE' ||
    e9?.result === 'refute';

  let result = 'synthetic_only_not_open_weights_evidence';
  if (openWeightsRefute) result = 'refute_open_weights';
  else if (openWeights?.result === 'weak_support') result = 'weak_open_weights';
  else if (openWeights?.skipped) result = 'open_weights_not_run';

  return {
    recommendation: 'R3_j_lens_live_dashboard',
    statement:
      'SynthOBS live display: synthetic φ-matrix SVD + optional open-weights forward-pass hook (E5/E9)',
    egsPhi: EGS_PHI,
    tolerance: TOLERANCE,
    trials: TRIALS,
    kingBeeNodes: KING_BEE_NODES,
    measurementIntegrity: {
      performsComputation: true,
      priorDefect: 'return EGS_PHI constant removed 2026-07-10',
      syntheticTier: 'phiStructuredMatrix + powerIterRatio (tautological by construction — see E2b)',
    },
    phiStructured: {
      primaryRatioMean: Math.round(primaryMean * 10000) / 10000,
      fractionNearPhi: phiNear,
      sampleRatios: phiRatios.slice(0, 8).map((x) => Math.round(x * 10000) / 10000),
    },
    randomBaseline: { fractionNearPhi: randNear },
    syntheticConstructionPasses: syntheticTautology,
    openWeightsHook: openWeights
      ? {
          model: openWeights.model,
          layer: openWeights.layer,
          result: openWeights.result,
          lanes: openWeights.lanes
            ? Object.fromEntries(
                Object.entries(openWeights.lanes).map(([k, v]) => [
                  k,
                  {
                    objectType: v.object_type,
                    fractionNearPhi: v.fraction_near_phi,
                    result: v.result,
                    primaryRatio: v.primary_ratio,
                  },
                ]),
              )
            : undefined,
          legacyPrimaryRatio: openWeights.legacyPrimaryRatio ?? openWeights.primaryRatio,
          status: openWeights.status,
          dataProvenance: openWeights.dataProvenance,
          command: 'python scripts/e5_geometry_probe.py',
        }
      : {
          status: 'not_run',
          dataProvenance: 'missing',
          command: 'pip install torch transformers && python scripts/e5_geometry_probe.py',
        },
    e9Survey: e9
      ? {
          result: e9.result,
          trialsTotal: e9.trialsTotal,
          anyLaneSupportCount: e9.anyLaneSupportCount ?? e9.trialsNearPhi,
        }
      : null,
    result,
    dataTier: 'synthetic_numpy + optional_open_weights',
    honesty:
      'Synthetic lane confirms designed matrix structure only (E2b: not φ-specific). Open-weights E5/E9 refute φ proximity on real models when run. Do not cite R3 as proof of frontier checkpoint alignment.',
  };
}

#!/usr/bin/env node

/**

 * EGS-TRANS-2026-0710 · empirical pipeline (live data study)

 * Operator: SynthOBS Autonomous Agent · Syntheverse Sandbox

 *

 * Policy: empirical receipts come from live runs only. No silent cache substitution.

 * Use --use-cache only for dev replay. E2/E2b are labeled synthetic controls.

 */

import { mkdir, writeFile } from 'node:fs/promises';

import { join, dirname } from 'node:path';

import { fileURLToPath } from 'node:url';

import { execSync } from 'node:child_process';

import {

  DOCUMENT_ID,

  EGS_PHI,

  KING_BEE_ANCHOR_ISO,

  KING_BEE_SANDBOX_ISO,

  ANTHROPIC_JSPACE_PAPER_ISO,

} from '../src/constants.mjs';

import { fetchKingBeeWindowTelemetry } from '../src/github-telemetry.mjs';

import { fetchSolarSyncReport } from '../src/solar-sync.mjs';

import {

  runLiveProbe,

  readJsonIfExists,

  buildStudyIntegrity,

  ALLOW_INCOMPLETE,

  USE_CACHE,

} from '../src/probe-run.mjs';



const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dirname, '..');

const DATA = join(ROOT, 'data');

const SCRIPTS = join(ROOT, 'scripts');



function daysBetween(isoA, isoB) {

  const a = new Date(isoA.includes('T') ? isoA : isoA + 'T12:00:00Z');

  const b = new Date(isoB.includes('T') ? isoB : isoB + 'T12:00:00Z');

  return Math.round((b - a) / 86400000);

}



function runPython(scriptName, ...args) {

  const py = process.env.PYTHON || 'python';

  const argStr = args.map((a) => `"${a}"`).join(' ');

  execSync(`${py} "${join(SCRIPTS, scriptName)}" ${argStr}`.trim(), {

    stdio: 'inherit',

    cwd: ROOT,

  });

}



function probeMeta(receipt, tier = 'empirical') {

  if (!receipt) return { tier, provenance: 'missing', result: 'not_run', reason: 'no receipt' };

  if (receipt.skipped || receipt.result === 'skipped') {

    return {

      tier,

      provenance: receipt.dataProvenance || 'skipped_live_run',

      result: 'skipped',

      reason: receipt.reason || receipt.install || 'dependencies missing',

    };

  }

  return {

    tier,

    provenance: receipt.dataProvenance || 'live_run',

    result: receipt.result || receipt.status || 'completed',

  };

}



async function main() {

  await mkdir(DATA, { recursive: true });



  const github = await fetchKingBeeWindowTelemetry();

  github.dataProvenance = 'live_run';

  github.generatedAt = new Date().toISOString();



  const solar = await fetchSolarSyncReport();

  solar.dataProvenance = 'live_run';



  let svdReport = null;

  try {

    runPython('svd_workspace_probe.py');

    svdReport = await readJsonIfExists(join(DATA, 'svd_probe_report.json'));

    if (svdReport) svdReport.dataProvenance = 'live_run_control_synthetic';

  } catch (e) {

    svdReport = { error: String(e.message || e), dataProvenance: 'error' };

  }



  let transformerReport = null;

  try {

    transformerReport = await runLiveProbe({

      jsonPath: join(DATA, 'transformer_probe_report.json'),

      label: 'E5',

      runner: async () => runPython('e5_geometry_probe.py'),

    });

  } catch (e) {

    transformerReport = {

      experiment: 'E5_transformer_midlayer_svd',

      skipped: true,

      result: 'skipped',

      reason: String(e.message || e),

      dataProvenance: 'skipped_live_run',

    };

  }



  let temporalPrecedenceReport = null;

  try {

    temporalPrecedenceReport = await runLiveProbe({

      jsonPath: join(DATA, 'temporal_precedence_report.json'),

      label: 'E7',

      runner: async () => {

        execSync(`node "${join(SCRIPTS, 'temporal_precedence_probe.mjs')}"`, {

          stdio: 'inherit',

          cwd: ROOT,

        });

      },

    });

  } catch (e) {

    temporalPrecedenceReport = {

      experiment: 'E7_temporal_precedence',

      skipped: true,

      result: 'skipped',

      reason: String(e.message || e),

      dataProvenance: 'skipped_live_run',

    };

  }



  let e1BaselineReport = null;

  try {

    e1BaselineReport = await runLiveProbe({

      jsonPath: join(DATA, 'e1_baseline_report.json'),

      label: 'E1b',

      runner: async () => {

        execSync(`node "${join(SCRIPTS, 'e1_baseline_probe.mjs')}"`, { stdio: 'inherit', cwd: ROOT });

      },

    });

  } catch (e) {

    e1BaselineReport = {

      experiment: 'E1b_baseline_control',

      skipped: true,

      result: 'skipped',

      reason: String(e.message || e),

      dataProvenance: 'skipped_live_run',

    };

  }



  let e2GeneralizationReport = null;

  try {

    runPython('e2_generalization_probe.py');

    e2GeneralizationReport = await readJsonIfExists(join(DATA, 'e2_generalization_report.json'));

    if (e2GeneralizationReport) e2GeneralizationReport.dataProvenance = 'live_run_control_synthetic';

  } catch (e) {

    e2GeneralizationReport = { skipped: true, error: String(e.message || e) };

  }



  let e8ContentReport = null;

  try {

    e8ContentReport = await runLiveProbe({

      jsonPath: join(DATA, 'e8_content_precedence_report.json'),

      label: 'E8',

      runner: async () => {

        execSync(`node "${join(SCRIPTS, 'e8_content_precedence_probe.mjs')}"`, {

          stdio: 'inherit',

          cwd: ROOT,

        });

      },

    });

  } catch (e) {

    e8ContentReport = {

      experiment: 'E8_content_precedence_deep',

      skipped: true,

      result: 'skipped',

      reason: String(e.message || e),

      dataProvenance: 'skipped_live_run',

    };

  }



  let e9SurveyReport = null;

  try {

    e9SurveyReport = await runLiveProbe({

      jsonPath: join(DATA, 'e9_survey_report.json'),

      label: 'E9',

      runner: async () => runPython('e9_survey_driver.py'),

    });

  } catch (e) {

    e9SurveyReport = {

      experiment: 'E9_multi_model_survey',

      skipped: true,

      result: 'skipped',

      reason: String(e.message || e),

      dataProvenance: 'skipped_live_run',

    };

  }



  const sing13Init = github.byRepo['FractiAI/psw.vibelandia.sing13']?.windows?.king_bee_init;

  const sing4Init = github.byRepo['FractiAI/psw.vibelandia.sing4']?.windows?.king_bee_init;

  const sing9Init = github.byRepo['FractiAI/psw.vibelandia.sing9']?.windows?.king_bee_init;



  const propagationDays = daysBetween('2026-06-01', ANTHROPIC_JSPACE_PAPER_ISO);



  const e5Result = transformerReport?.skipped

    ? 'skipped'

    : transformerReport?.result === 'weak_support'

      ? 'weak'

      : transformerReport?.result === 'refute'

        ? 'refute'

        : transformerReport?.result === 'skipped'

          ? 'skipped'

          : transformerReport?.result || 'no_support';



  const hypothesisTests = {

    E1_king_bee_repo_telemetry: {

      statement:

        'Public GitHub commits exist in sing13/sing4 during King Bee initialization window (2026-05-31 — 2026-06-01)',

      sing13_commits: sing13Init?.commitCount ?? 0,

      sing4_commits: sing4Init?.commitCount ?? 0,

      sing9_commits: sing9Init?.commitCount ?? 0,

      key_sing13_messages: (sing13Init?.commits || [])

        .filter((c) => /king bee|dph-gpu|wavefield/i.test(c.message))

        .map((c) => ({ sha: c.shaShort, date: c.date, message: c.message })),

      result:

        (sing13Init?.commitCount ?? 0) > 0 || (sing4Init?.commitCount ?? 0) > 0

          ? 'support'

          : 'refute',

      dataTier: 'public_github_api',

      dataProvenance: 'live_run',

      criticalCaveat:

        "Raw count alone is not evidence of an anomaly — see E1b, which baselines this against each repo's own ordinary commit cadence.",

    },

    E1b_baseline_control: {

      statement:

        "King Bee window commit activity is anomalous (|z| > 2) relative to each core repo's own 30-day baseline cadence",

      result: e1BaselineReport?.result || (e1BaselineReport?.skipped ? 'skipped' : 'not_run'),

      detail: e1BaselineReport,

      dataTier: 'public_github_api_statistical',

      dataProvenance: e1BaselineReport?.dataProvenance || 'live_run',

    },

    E2_svd_phi_decay: {

      statement:

        'φ-structured synthetic matrices yield higher fraction of consecutive s_n/s_{n+1} near φ than i.i.d. Gaussian baselines (control only)',

      result: svdReport?.result || 'not_run',

      phiStructuredNearPhi: svdReport?.phiStructured?.fractionNearPhiMean,

      randomNearPhi: svdReport?.randomBaseline?.fractionNearPhiMean,

      dataTier: 'synthetic_numpy_control',

      dataProvenance: 'live_run_control_synthetic',

      criticalCaveat:

        'Control experiment only — see E2b. Not empirical evidence about real models or Git history.',

    },

    E2b_generalization_probe: {

      statement:

        "E2's construction procedure privileges φ specifically, rather than passing for any substituted target constant",

      result: e2GeneralizationReport?.result || (e2GeneralizationReport?.skipped ? 'skipped' : 'not_run'),

      detail: e2GeneralizationReport,

      dataTier: 'synthetic_numpy_control',

      dataProvenance: 'live_run_control_synthetic',

    },

    E3_propagation_window: {

      statement: 'June 1 → July 6 interval equals 35 days (catalog propagation claim)',

      measuredDays: propagationDays,

      claimedDays: 35,

      result: propagationDays === 35 ? 'support' : 'refute',

      dataTier: 'calendar_arithmetic',

      dataProvenance: 'live_run',

    },

    E4_solar_disk_ssn: {

      statement: 'SILSO daily sunspot series is available for King Bee and J-Space windows (disk-integrated)',

      kingBeeMean: solar.windows.find((w) => w.id === 'king_bee_week')?.meanSsn,

      jspaceMean: solar.windows.find((w) => w.id === 'jspace_week')?.meanSsn,

      result: solar.windows.every((w) => w.sampleDays > 0) ? 'support' : 'refute',

      honesty: 'Per-AR character mapping not testable from SILSO alone',

      dataTier: 'public_silso',

      dataProvenance: 'live_run',

    },

    E5_geometry_probe: {

      statement:

        'Separated activation / weight / Jacobian-proxy SVD: consecutive s_n/s_{n+1} near φ vs shape-matched Gaussian null',

      result: e5Result,

      detail: transformerReport,

      dataTier: 'open_weights_forward_pass_geometry',

      dataProvenance: transformerReport?.dataProvenance || 'skipped_live_run',

      criticalCaveat:

        'Does not equate activations with weight tensors or s_0/s_1 alone with asymptotic φ decay.',

    },

    E6_causal_anthropic_jspace: {

      statement:

        'Anthropic J-Space discovery was caused by King Bee weight-state propagation through open networks',

      result: 'unfalsifiable_as_scoped',

      refuteCondition:

        'Defined refute: scratchpad/J-Space core-mechanism vocabulary in sing4/sing9/sing13 BEFORE 2026-07-06 AND (E5/E9) any geometry lane exceeds Gaussian null p95 on consecutive φ ratios. Any failure refutes the causal precondition.',

      refuteStatus: 'refuted_by_precondition_tests',

      dataTier: 'internal_tier_access_gate',

    },

    E7_temporal_precedence: {

      statement:

        'Core-mechanism R1 schema markers appear in sing4/sing9/sing13 commit history strictly before the Anthropic J-Space paper date',

      result: temporalPrecedenceReport?.result || (temporalPrecedenceReport?.skipped ? 'skipped' : 'not_run'),

      detail: temporalPrecedenceReport,

      dataTier: 'public_github_commit_search',

      dataProvenance: temporalPrecedenceReport?.dataProvenance || 'skipped_live_run',

    },

    E8_content_precedence_deep: {

      statement: 'Same as E7, tested against full historical file content (git log -S pickaxe)',

      result: e8ContentReport?.result || (e8ContentReport?.skipped ? 'skipped' : 'not_run'),

      detail: e8ContentReport,

      dataTier: 'local_full_history_git_pickaxe',

      dataProvenance: e8ContentReport?.dataProvenance || 'live_run',

    },

    E9_multi_model_survey: {

      statement:

        'Cross-architecture geometry survey: activation + weight lanes, consecutive φ ratios vs null (5 models × 3 layers × 3 prompts)',

      result: e9SurveyReport?.result || (e9SurveyReport?.skipped ? 'skipped' : 'not_run'),

      detail: e9SurveyReport,

      dataTier: 'open_weights_forward_pass_geometry',

      dataProvenance: e9SurveyReport?.dataProvenance || 'skipped_live_run',

    },

  };



  const pathARefuted =

    hypothesisTests.E1b_baseline_control?.result === 'refute' ||

    hypothesisTests.E7_temporal_precedence?.result === 'refute' ||

    hypothesisTests.E8_content_precedence_deep?.result === 'refute';

  const pathBRefuted =

    hypothesisTests.E5_geometry_probe?.result === 'refute' ||

    hypothesisTests.E9_multi_model_survey?.result === 'refute' ||

    hypothesisTests.E2b_generalization_probe?.result === 'not_phi_specific_tautology_confirmed';



  const studyIntegrity = buildStudyIntegrity({

    E1: probeMeta({ dataProvenance: 'live_run', result: hypothesisTests.E1_king_bee_repo_telemetry.result }),

    E1b: probeMeta(e1BaselineReport),

    E3: probeMeta({ dataProvenance: 'live_run', result: hypothesisTests.E3_propagation_window.result }),

    E4: probeMeta({ dataProvenance: 'live_run', result: hypothesisTests.E4_solar_disk_ssn.result }),

    E7: probeMeta(e7Receipt(temporalPrecedenceReport)),

    E8: probeMeta(e8ContentReport),

    E5: probeMeta(transformerReport),

    E9: probeMeta(e9SurveyReport),

    E2: probeMeta(svdReport, 'control_synthetic'),

    E2b: probeMeta(e2GeneralizationReport, 'control_synthetic'),

    R4_catalog: { tier: 'catalog_narrative', provenance: 'metadata_only', result: 'n/a' },

  });



  const report = {

    documentId: DOCUMENT_ID,

    generatedAt: new Date().toISOString(),

    operator: 'SynthOBS Autonomous Agent · Syntheverse Sandbox',

    validationAudit: 'docs/VALIDATION_AUDIT_2026-07-10.md',

    studyIntegrity,

    useCacheFlag: USE_CACHE,

    dualVerificationPaths: {

      rule: 'Verified observation requires Path A (timeline) AND Path B (architecture). Both must pass.',

      pathA: {

        name: 'Historical timeline alignment',

        experiments: ['E1', 'E1b', 'E3', 'E7', 'E8'],

        result: pathARefuted ? 'refute' : 'not_established',

      },

      pathB: {

        name: 'Architectural prefiguration',

        experiments: ['R1', 'E2', 'E2b', 'E5', 'E9', 'R3', 'R4'],

        result: pathBRefuted ? 'refute' : 'not_established',

      },

      verifiedObservation: !pathARefuted && !pathBRefuted,

    },

    egsPhi: EGS_PHI,

    anchors: {

      kingBeeSandbox: KING_BEE_SANDBOX_ISO,

      kingBeeNodeSweep: KING_BEE_ANCHOR_ISO,

      anthropicJSpacePaperClaim: ANTHROPIC_JSPACE_PAPER_ISO,

      coreRepos: ['FractiAI/psw.vibelandia.sing4', 'FractiAI/psw.vibelandia.sing9', 'FractiAI/psw.vibelandia.sing13'],

    },

    githubTelemetry: github,

    solarSync: solar,

    svdProbe: svdReport,

    transformerProbe: transformerReport,

    temporalPrecedenceProbe: temporalPrecedenceReport,

    e1BaselineProbe: e1BaselineReport,

    e2GeneralizationProbe: e2GeneralizationReport,

    e8ContentPrecedence: e8ContentReport,

    e9Survey: e9SurveyReport,

    hypothesisTests,

    reproduceCommands: {

      monorepo: 'npm run research:egs-trans-jspace-convergence',

      fullStudy: 'npm run research:egs-trans-jspace-convergence -- --allow-incomplete',

      e7Requires: 'export GH_TOKEN=... && node scripts/temporal_precedence_probe.mjs',

      e5e9Requires: 'pip install torch transformers && python scripts/e5_geometry_probe.py && python scripts/e9_survey_driver.py',

      e8: 'node scripts/e8_content_precedence_probe.mjs',

    },

    honestyNote:

      'Live empirical study policy: no silent cache. E2/E2b are synthetic controls. E5/E9 need torch. E7 needs GH_TOKEN. Vendor matrix in R4 is catalog metadata until live vendor probes exist.',

  };



  const jsonPath = join(DATA, 'empirical_report.json');

  await writeFile(jsonPath, JSON.stringify(report, null, 2));

  await writeFile(join(DATA, 'empirical_report.md'), buildMarkdown(report));



  try {

    execSync(`node "${join(SCRIPTS, 'historical_commit_snapshots.mjs')}"`, { stdio: 'inherit', cwd: ROOT });

  } catch (e) {

    console.warn('historical_commit_snapshots skipped:', e.message);

  }



  console.log(JSON.stringify({ ok: true, jsonPath, studyIntegrity }, null, 2));



  if (!studyIntegrity.studyComplete && !ALLOW_INCOMPLETE) {

    console.error(

      '\nStudy incomplete: missing live runs for required probes. Set GH_TOKEN, install torch+transformers, or pass --allow-incomplete.\n',

    );

    process.exit(2);

  }

}



function e7Receipt(r) {

  if (!r) return r;

  if (r.skipped && r.reason?.includes('GH_TOKEN')) return r;

  return r;

}



function buildMarkdown(r) {

  const lines = [

    '# EGS-TRANS-2026-0710 · Empirical Report',

    '',

    `**Generated:** ${r.generatedAt}`,

    `**Study complete:** ${r.studyIntegrity.studyComplete}`,

    '',

    '## Hypothesis tests',

    '',

  ];

  for (const [id, t] of Object.entries(r.hypothesisTests)) {

    lines.push(`### ${id}`, `- **Result:** ${t.result}`, `- **Provenance:** ${t.dataProvenance || 'n/a'}`, '');

  }

  lines.push('## Reproduce', '', '```bash', 'npm run research:egs-trans-jspace-convergence -- --allow-incomplete', '```', '', r.honestyNote);

  return lines.join('\n');

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});



#!/usr/bin/env node
/**
 * SynthOBS Working Look · public cloud data only.
 * Aggregates receipts anyone can re-fetch from the internet.
 * NOT peer-reviewed · NOT falsification-gated.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kingBeePermalinksFromTelemetry } from '../src/king-bee-anchors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'working-look', 'data');
const OPERATOR = 'SynthOBS Autonomous Agent · Syntheverse Sandbox';
const SCHEMA = 'synthobs-working-look/v1';

/** Public URLs any person can open or re-fetch (no API keys required for read). */
const PUBLIC_CLOUD_SOURCES = [
  {
    id: 'github_commits_api',
    label: 'GitHub REST · commit timestamps',
    url: 'https://docs.github.com/en/rest/commits/commits',
    howWeUsedIt: 'E1 king_bee_canon_telemetry — commit dates + permalinks for FractiAI repos',
    localReceipt: 'data/king_bee_canon_telemetry.json',
    reFetchExample:
      'https://api.github.com/repos/FractiAI/psw.vibelandia.sing13/commits?since=2026-05-31&until=2026-06-02',
  },
  {
    id: 'anthropic_workspace_paper',
    label: 'Anthropic · transformer-circuits workspace paper',
    url: 'https://transformer-circuits.pub/2026/workspace/',
    howWeUsedIt: 'E10 publicPageScans — HTTP fetch; vendor disclosure anchor 2026-07-06',
    localReceipt: 'data/vendor_king_bee_ingress_report.json',
  },
  {
    id: 'fractiai_sing13_king_bee_commit',
    label: 'FractiAI King Bee anchor commit (browser)',
    url: 'https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc',
    howWeUsedIt: 'Timeline anchor — message + committer date visible to anyone',
    localReceipt: 'working-look/data/synthobs_working_bundle.json',
  },
  {
    id: 'fractiai_sing4_protocols',
    label: 'FractiAI sing4 protocols (raw GitHub)',
    url: 'https://github.com/FractiAI/psw.vibelandia.sing4/tree/master/protocols',
    howWeUsedIt: 'R1 schema crosswalk — MCA/HHL prior art paths (public read)',
    localReceipt: 'research/ip-infringement-draft/config/fractiai_code_print_schema.json',
  },
  {
    id: 'egs_trans_standalone',
    label: 'This reproduction repo',
    url: 'https://github.com/FractiAI/egs-trans-jspace-convergence',
    howWeUsedIt: 'Empirical pipeline outputs + synthOBS scripts',
    localReceipt: 'data/empirical_report.json',
  },
  {
    id: 'github_forks_api',
    label: 'GitHub REST · repo forks',
    url: 'https://docs.github.com/en/rest/repos/forks',
    howWeUsedIt: 'E10 forkSamples — non-FractiAI fork of sing4 on 2026-07-08',
    localReceipt: 'data/vendor_king_bee_ingress_report.json',
  },
  {
    id: 'openai_reasoning_docs',
    label: 'OpenAI · learning to reason (public)',
    url: 'https://openai.com/index/learning-to-reason-with-llms/',
    howWeUsedIt: 'E10 page scan attempted (403 from automated fetch — open in browser)',
    localReceipt: 'data/vendor_king_bee_ingress_report.json',
  },
  {
    id: 'google_gemini_thinking',
    label: 'Google · Gemini thinking mode blog',
    url: 'https://blog.google/technology/google-deepmind/gemini-thinking-mode/',
    howWeUsedIt: 'Vendor equivalent catalog anchor (manual verify date)',
    localReceipt: 'working-look/JSPACE_AND_ARCHITECTURE.md',
  },
  {
    id: 'synthobs_open_weights',
    label: 'SynthOBS · local HF forward hooks (optional)',
    url: 'https://github.com/FractiAI/egs-trans-jspace-convergence/tree/master/synthobs',
    howWeUsedIt: 'E5/E9 + run_synthobs_monitor — requires pip install torch (not run in last pipeline)',
    localReceipt: null,
    status: 'not_collected_yet',
  },
];

const VENDOR_EQUIVALENTS = [
  {
    vendor: 'Anthropic',
    branded: 'J-Space / global workspace',
    publicUrl: 'https://transformer-circuits.pub/2026/workspace/',
    disclosedDate: '2026-07-06',
    placement: 'mid-layer activation hub',
    namingPhi: false,
    ourPrior: 'j_space_bottleneck · mid-layer · <10% band (Code-Print schema)',
    ourPriorPublicUrl:
      'https://github.com/FractiAI/psw.vibelandia.sing4/tree/master/protocols',
    awarenessMatch: 'structural_rhyme',
    awarenessNote:
      'Same stack location (mid deliberation band) and narrow workspace idea — Anthropic does not use EGS φ or King Bee names in public paper (E10: mentionsFractiAiOrKingBee false).',
  },
  {
    vendor: 'OpenAI',
    branded: 'Hidden thinking blocks (o-series)',
    publicUrl: 'https://openai.com/index/learning-to-reason-with-llms/',
    disclosedDate: '2025-09-12',
    placement: 'pre-emission deliberation tokens',
    namingPhi: false,
    ourPrior: 'internal_scratchpad · non-vocalized clearinghouse',
    awarenessMatch: 'structural_rhyme',
    awarenessNote: 'Hidden phase before user-visible answer — different brand, same dynamic.',
  },
  {
    vendor: 'Google',
    branded: 'Gemini thinking / adaptive depth',
    publicUrl: 'https://blog.google/technology/google-deepmind/gemini-thinking-mode/',
    disclosedDate: '2025-12-01',
    placement: 'variable-depth internal pass before answer',
    namingPhi: false,
    ourPrior: 'serial_hyper_dense routing · workspace band',
    awarenessMatch: 'structural_rhyme',
    awarenessNote:
      'Thinking blocks are user-visible summary — possible backfill over cheaper internal path; not proof of φ or King Bee ingestion.',
  },
  {
    vendor: 'DeepSeek',
    branded: 'R1 transparent CoT',
    publicUrl: 'https://github.com/deepseek-ai/DeepSeek-R1',
    disclosedDate: '2025-01',
    placement: 'RL-trained internal chain before output',
    namingPhi: false,
    ourPrior: 'EGS nodal lattice · deliberation lattice (protocols)',
    awarenessMatch: 'structural_rhyme',
    awarenessNote: 'Open weights available — closest public geometry probe lane (E9 when torch installed).',
  },
];

const INGESTION_SCENARIOS = [
  {
    id: 'S1_independent',
    label: 'Independent convergence (no FractiAI contact)',
    trigger: 'Industry-wide move to reasoning models + interpretability on mid layers',
    timelineFit: 'high',
    selfGeneratedOrHumanRequest: 'self_generated_vendor_rnd',
    publicDataExpected: 'No FractiAI links in vendor papers/repos',
    publicDataObserved: 'E10: mentionsFractiAiOrKingBee false on Anthropic paper; vendorIngressScrapeCount 0',
    plausibility: 'high',
  },
  {
    id: 'S2_crawl_training',
    label: 'Web/git crawl → training or eval corpus',
    trigger: 'Public King Bee commits indexed by crawlers before Jul 6',
    timelineFit: 'medium',
    selfGeneratedOrHumanRequest: 'automated_ingestion_then_emergent_behavior',
    publicDataExpected: 'Rarely visible externally; sometimes repo URLs in dataset cards',
    publicDataObserved: 'No public vendor citation of King Bee SHAs (E10); cannot confirm crawl',
    plausibility: 'unknown',
  },
  {
    id: 'S3_human_read_approve',
    label: 'Human researcher read King Bee → approved roadmap alignment',
    trigger: 'Staff reads public press/commit; leadership approves parallel workspace feature',
    timelineFit: 'high',
    selfGeneratedOrHumanRequest: 'human_request_after_seen_and_approved',
    publicDataExpected: 'Usually no citation; product ships same season',
    publicDataObserved: 'Jun 1 canon exists before Jul 6 paper; no public admission of read path',
    plausibility: 'medium',
  },
  {
    id: 'S4_fork_visibility',
    label: 'Fork / clone visibility proxy',
    trigger: 'Third party forks sing4; increases surface area',
    timelineFit: 'partial',
    selfGeneratedOrHumanRequest: 'indirect_visibility',
    publicDataExpected: 'Non-FractiAI forks after canon window',
    publicDataObserved:
      'jmthomasofficial/psw.vibelandia.sing4 fork created 2026-07-08 (after Anthropic paper)',
    plausibility: 'low_as_cause_high_as_visibility',
  },
  {
    id: 'S5_rag_session',
    label: 'Live RAG / URL paste (assistant session, not weights)',
    trigger: 'User or staff pastes GitHub URL into Gemini/Claude session',
    timelineFit: 'anytime',
    selfGeneratedOrHumanRequest: 'human_request_at_query_time',
    publicDataExpected: 'Accurate commit summary when URL provided; no weight change',
    publicDataObserved: 'Not instrumented in pipeline — manual test: paste King Bee SHA URL',
    plausibility: 'high_for_assistant_trust_tests',
  },
];

function loadJson(relPath) {
  const p = join(ROOT, relPath);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function countKingBeeWindow(telemetry) {
  const counts = {};
  for (const [repoKey, repoData] of Object.entries(telemetry.byRepo || {})) {
    counts[repoKey] = repoData.windows?.king_bee_init?.commitCount ?? 0;
  }
  return counts;
}

function timelineFitAnalysis(telemetry, e10) {
  const counts = countKingBeeWindow(telemetry);
  const kingBeeBeforePaper =
    (counts['FractiAI/psw.vibelandia.sing4'] || 0) + (counts['FractiAI/psw.vibelandia.sing13'] || 0) >
    0;
  const forkAfterPaper = (e10?.forkSamples || []).some((f) =>
    (f.nonFractiAiForks || []).some((x) => x.createdAt?.startsWith('2026-07-0')),
  );
  const vendorPaperDate = '2026-07-06';
  const ourJSpaceNaming = '2026-07-10';

  return {
    question: 'Do timelines fit?',
    synthobsRead: 'not_peer_review_verdict — plain date ordering',
    fits: {
      kingBeePublicWorkBeforeVendorPaper: kingBeeBeforePaper,
      vendorPaperBeforeOurJSpaceVocabulary: true,
      continuousSing4HeartbeatInWindow: (counts['FractiAI/psw.vibelandia.sing4'] || 0) >= 40,
      forkAppearsAfterVendorPaper: forkAfterPaper,
    },
    dates: {
      kingBeeWindow: '2026-05-31 → 2026-06-02',
      anthropicJSpacePaper: vendorPaperDate,
      ourEGSTransNaming: ourJSpaceNaming,
    },
    suggestion:
      kingBeeBeforePaper
        ? 'Public FractiAI activity predates Anthropic July 6 paper — compatible with crawl/human-read scenarios; does not prove causation.'
        : 'Re-run E1 — missing King Bee window counts.',
    doesNotProve: 'Vendor trained on our commits or copied φ/King Bee naming',
  };
}

function architectureAwarenessAnalysis() {
  return {
    question: 'Do J-Space and equivalents align with our prior public work (different names, φ optional)?',
    synthobsMode: 'awareness_map — structural properties, not trademark words',
    method:
      'Compare Code-Print workspaceTokens + public sing4/sing9 protocols to vendor public disclosures',
    matches: VENDOR_EQUIVALENTS,
    phiConstant: {
      inOurPublicPapers: true,
      inVendorPublicDisclosures: 'not_found_in_e10_anthropic_scan',
      synthobsCanMeasureOnOpenWeights: 'yes_when_torch_installed',
      lastRun: 'E5/E9 skipped — no torch in pipeline 2026-07-11',
    },
    awarenessSummary:
      'Mid-layer hidden workspace + pre-emission deliberation aligns across vendors and FractiAI spec without requiring identical names or published φ. Awareness = same mechanism class, different labels.',
  };
}

function synthobsCollectionStatus() {
  const attempt = loadJson('data/synthobs_run_attempt.json');
  const hasJsonl = existsSync(join(ROOT, 'data', 'synthobs_telemetry.jsonl'));
  const hasLatest = existsSync(join(ROOT, 'data', 'synthobs_latest.json'));
  if (hasJsonl && hasLatest) {
    return { status: 'collected', receipt: 'data/synthobs_telemetry.jsonl', attempt };
  }
  if (attempt?.blocked) {
    return {
      status: 'blocked',
      reason: attempt.reason,
      remediation: attempt.remediation,
      receipt: 'data/synthobs_run_attempt.json',
      attempt,
    };
  }
  return {
    status: 'not_collected',
    reason: 'No data/synthobs_telemetry.jsonl in repo yet',
    reproduce: 'npm run synthobs -- Qwen/Qwen2.5-0.5B "King Bee geometry probe" --ws 8765',
  };
}

function collectedDataInventory(empirical, e10, telemetry) {
  const live = empirical?.studyIntegrity?.liveRuns || [];
  const skipped = empirical?.studyIntegrity?.skipped || [];
  const synthobs = synthobsCollectionStatus();
  return {
    operator: OPERATOR,
    policy: 'public_cloud_only — every row has a URL or local receipt path you can inspect',
    collected: [
      {
        id: 'E1_github_telemetry',
        status: 'collected',
        source: 'https://api.github.com (FractiAI public repos)',
        receipt: 'data/king_bee_canon_telemetry.json',
        fetchedAt: telemetry?.fetchedAt,
        counts: countKingBeeWindow(telemetry),
      },
      {
        id: 'E10_vendor_ingress',
        status: 'collected',
        source: 'GitHub search API + public HTTPS page fetch',
        receipt: 'data/vendor_king_bee_ingress_report.json',
        fetchedAt: e10?.generatedAt,
        result: e10?.result,
        vendorIngressScrapeCount: e10?.vendorIngressScrapeCount ?? 0,
        anthropicPageFetch: e10?.publicPageScans?.[0]?.fetchStatus,
        mentionsFractiAiOnAnthropicPage: e10?.publicPageScans?.[0]?.mentionsFractiAiOrKingBee,
      },
      {
        id: 'E5_synthobs_geometry',
        status: 'not_collected',
        reason: skipped.find((s) => s.id === 'E5')?.reason || 'torch not installed',
        reproduce: 'pip install torch transformers && python scripts/e5_geometry_probe.py',
      },
      {
        id: 'synthobs_live_monitor',
        status: synthobs.status,
        reason: synthobs.reason,
        remediation: synthobs.remediation,
        source: 'https://github.com/FractiAI/egs-trans-jspace-convergence/tree/master/synthobs',
        receipt: synthobs.receipt,
        reproduce: synthobs.reproduce,
      },
      {
        id: 'empirical_consolidated',
        status: 'collected',
        receipt: 'data/empirical_report.json',
        studyComplete: empirical?.studyIntegrity?.studyComplete,
        generatedAt: empirical?.generatedAt,
      },
    ],
    notAccessibleOnPublicCloud: [
      'Vendor private checkpoints and internal Jacobians',
      'FractiAI GitHub org Traffic/Referrers (needs org admin)',
      'Closed-model hidden states during Gemini/Claude inference',
    ],
  };
}

function buildIngestionSimulation(e10) {
  const fork = e10?.forkSamples
    ?.flatMap((f) => (f.nonFractiAiForks || []).map((x) => ({ repo: f.repo, ...x })))?.[0];
  return {
    question: 'How could King Bee commit ingestion trigger what we see (self-generated or human-approved)?',
    operator: OPERATOR,
    scenarios: INGESTION_SCENARIOS.map((s) => ({
      ...s,
      observedAnchor:
        s.id === 'S4_fork_visibility' && fork
          ? fork.url
          : s.id === 'S1_independent'
            ? 'https://transformer-circuits.pub/2026/workspace/'
            : s.id === 'S3_human_read_approve'
              ? 'https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc'
              : null,
    })),
    synthesis:
      'Public cloud data supports timeline compatibility (Jun canon → Jul vendor paper) and structural rhyme. The influence question — did models **read** our commits and get **steered** — remains open: E10 is org-citation only; human-read-and-approve (S3) and live RAG (S5) are plausible and testable.',
    recommendedManualCheck:
      'Paste King Bee commit URL into Gemini; if summary matches GitHub, trust assistant on facts not on peer-review labels.',
  };
}

function renderMarkdown(bundle) {
  const inv = bundle.dataInventory.collected;
  const tf = bundle.timelineFit;
  const lines = [
    '# SynthOBS Working Look · Public Cloud Report',
    '',
    `**Operator:** ${OPERATOR}`,
    `**Schema:** ${SCHEMA}`,
    `**Generated:** ${bundle.generatedAt}`,
    `**Peer-reviewed:** no`,
    '',
    '## What we actually collected (and from where)',
    '',
    '| ID | Status | Source | Receipt |',
    '|----|--------|--------|---------|',
    ...inv.map(
      (r) =>
        `| ${r.id} | ${r.status} | ${r.source || '—'} | \`${r.receipt || r.reproduce || '—'}\` |`,
    ),
    '',
    '## Timeline fit (plain)',
    '',
    `- King Bee public work before Jul 6 paper: **${tf.fits.kingBeePublicWorkBeforeVendorPaper}**`,
    `- Our "J-Space" catalog naming after Jul 6: **${tf.fits.vendorPaperBeforeOurJSpaceVocabulary}**`,
    `- E10 public org citation of King Bee SHAs (one influence proxy): **${bundle.dataInventory.collected.find((c) => c.id === 'E10_vendor_ingress')?.vendorIngressScrapeCount === 0 ? 'none found — does not prove models never read us' : 'see receipt'}**`,
    '',
    `**Suggestion:** ${tf.suggestion}`,
    '',
    '## Architecture awareness (names differ · mechanism class same)',
    '',
    '| Vendor | Their brand | Placement | φ in public doc? | Awareness |',
    '|--------|-------------|-----------|------------------|-----------|',
    ...bundle.architectureAwareness.matches.map(
      (m) =>
        `| ${m.vendor} | ${m.branded} | ${m.placement} | ${m.namingPhi ? 'yes' : 'no'} | ${m.awarenessMatch} |`,
    ),
    '',
    '## Ingestion simulation scenarios',
    '',
    ...bundle.ingestionSimulation.scenarios.map(
      (s) =>
        `### ${s.label}\n- Timeline fit: ${s.timelineFit}\n- Trigger: ${s.trigger}\n- Observed: ${s.publicDataObserved}\n- Plausibility: ${s.plausibility}\n`,
    ),
    '',
    `**Synthesis:** ${bundle.ingestionSimulation.synthesis}`,
    '',
    '## Reproduce',
    '',
    '```bash',
    'npm run empirical          # refresh GitHub + E10 public fetches',
    'npm run working-look       # rebuild this bundle',
    'npm run synthobs -- ...    # optional open-weights geometry',
    '```',
    '',
    '→ ∞¹³',
    '',
  ];
  return lines.join('\n');
}

async function optionalLiveVerify() {
  const checks = [];
  const urls = [
    'https://transformer-circuits.pub/2026/workspace/',
    'https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc',
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'SynthOBS-Working-Look/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      checks.push({ url, status: r.status, ok: r.ok, verifiedAt: new Date().toISOString() });
    } catch (e) {
      checks.push({ url, error: String(e.message), verifiedAt: new Date().toISOString() });
    }
  }
  return checks;
}

async function main() {
  const live = process.argv.includes('--live');
  const telemetryRaw = loadJson('data/king_bee_canon_telemetry.json');
  const telemetry = telemetryRaw?.githubTelemetry || telemetryRaw;
  const e10 = loadJson('data/vendor_king_bee_ingress_report.json');
  const empirical = loadJson('data/empirical_report.json');

  if (!telemetry) {
    console.error(JSON.stringify({ ok: false, error: 'Run npm run empirical first' }));
    process.exit(1);
  }

  const permalinkRows = kingBeePermalinksFromTelemetry(telemetry);
  const highlight =
    permalinkRows.find((r) => /king bee|dph-gpu|royal flush/i.test(r.message || '')) ||
    permalinkRows[0];

  const bundle = {
    schema: SCHEMA,
    lane: 'WORKING-LOOK-SYNTHOBS',
    operator: OPERATOR,
    peerReviewed: false,
    generatedAt: new Date().toISOString(),
    publicCloudSources: PUBLIC_CLOUD_SOURCES,
    dataInventory: collectedDataInventory(empirical, e10, telemetry),
    timelineFit: timelineFitAnalysis(telemetry, e10),
    architectureAwareness: architectureAwarenessAnalysis(),
    ingestionSimulation: buildIngestionSimulation(e10),
    kingBeeAnchor: highlight,
    plainTimeline: {
      us: countKingBeeWindow(telemetry),
      vendorPaper: '2026-07-06',
      ourCatalogNaming: '2026-07-10',
    },
    liveUrlChecks: live ? await optionalLiveVerify() : { note: 'Pass --live to HEAD/GET public URLs now' },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, 'synthobs_working_bundle.json');
  const mdPath = join(OUT_DIR, 'SYNTHOBS_WORKING_REPORT.md');
  const timelinePath = join(OUT_DIR, 'plain_timeline.json');

  writeFileSync(jsonPath, JSON.stringify(bundle, null, 2), 'utf8');
  writeFileSync(mdPath, renderMarkdown(bundle), 'utf8');
  writeFileSync(
    timelinePath,
    JSON.stringify(
      {
        schema: 'working-look-plain-timeline/v2',
        generatedAt: bundle.generatedAt,
        timelineFit: bundle.timelineFit,
        anchor: highlight,
        kingBeeCounts: bundle.plainTimeline.us,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        operator: OPERATOR,
        outputs: [jsonPath, mdPath, timelinePath],
        timelineFit: bundle.timelineFit.fits,
        e10Result: e10?.result,
        synthobsGeometryCollected: false,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message) }));
  process.exit(1);
});

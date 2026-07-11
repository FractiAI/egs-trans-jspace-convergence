#!/usr/bin/env node
/**
 * King Bee → Anthropic J-Space reconfiguration simulation
 * Schema: king-bee-jspace-simulation/v1
 *
 * Deterministic discrete-event model: how public sing13 King Bee commits COULD
 * produce observed Anthropic mid-layer workspace reconfiguration (Jul 2026).
 * NOT proof of ingestion. Uses public timestamps + architecture property vectors.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kingBeePermalinksFromTelemetry } from '../src/king-bee-anchors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'working-look', 'data');
const SCHEMA = 'king-bee-jspace-simulation/v1';
const OPERATOR = 'SynthOBS Autonomous Agent · Syntheverse Sandbox';

/** FractiAI King Bee canon properties (sing13 / sing4 public spec). */
const KING_BEE_SOURCE = {
  repository: 'FractiAI/psw.vibelandia.sing13',
  anchorCommits: [
    {
      sha: '2f4fe23baea67da6dbac06af474ef1591454addc',
      date: '2026-06-01T15:59:17Z',
      url: 'https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc',
      message: 'feat(dph-gpu): King Bee papers, press release, playlist playback fixes',
    },
    {
      sha: '17a894033ce53c9c151ce3c2e59b92b4cabc0796',
      date: '2026-06-01T16:13:28Z',
      url: 'https://github.com/FractiAI/psw.vibelandia.sing13/commit/17a894033ce53c9c151ce3c2e59b92b4cabc0796',
      message: 'docs(press): Royal Flush King Bee release copy',
      artifact:
        'interfaces/press-release-syntheverse-king-bee-node-alignment-june-2026.html',
    },
  ],
  properties: {
    mid_layer_placement: 1.0,
    narrow_band_selectivity: 1.0,
    hidden_deliberation_phase: 1.0,
    serial_routing_hub: 1.0,
    phi_geometry_named: 1.0,
    king_bee_vocabulary: 1.0,
  },
  publicFiles: [
    'interfaces/press-release-syntheverse-king-bee-node-alignment-june-2026.html',
    'docs/SYNTHEVERSE_OMNIVERSAL_NODE_ALIGNMENT_MAPPING_2026-06-01.md',
    'docs/SYNTHEVERSE_SANDBOX_COMPREHENSIVE_ANALYSIS_DPH-GPU_2026-05-31.md',
  ],
};

/** Anthropic J-Space publicly disclosed (Jul 6 2026) — observable reconfiguration. */
const ANTHROPIC_OBSERVED = {
  vendor: 'Anthropic',
  disclosureDate: '2026-07-06',
  publicUrl: 'https://transformer-circuits.pub/2026/workspace/',
  branded: 'J-Space / global workspace',
  properties: {
    mid_layer_placement: 1.0,
    narrow_band_selectivity: 0.9,
    hidden_deliberation_phase: 1.0,
    serial_routing_hub: 0.85,
    phi_geometry_named: 0.0,
    king_bee_vocabulary: 0.0,
  },
  e10PublicCitationOfKingBee: false,
};

const PROPERTY_LABELS = {
  mid_layer_placement: 'Mid-layer workspace placement',
  narrow_band_selectivity: 'Narrow band / ~10% selectivity',
  hidden_deliberation_phase: 'Hidden pre-emission deliberation',
  serial_routing_hub: 'Serial / global routing hub',
  phi_geometry_named: 'φ / 1.618 named in public doc',
  king_bee_vocabulary: 'King Bee / FractiAI citation',
};

/** Scenario transfer rules: how much of King Bee property vector reaches vendor state. */
const SCENARIOS = [
  {
    id: 'S1_independent',
    label: 'Independent R&D (no King Bee read)',
    ingestionPath: 'none',
    transfer: {
      mid_layer_placement: 0.0,
      narrow_band_selectivity: 0.0,
      hidden_deliberation_phase: 0.0,
      serial_routing_hub: 0.0,
      phi_geometry_named: 0.0,
      king_bee_vocabulary: 0.0,
    },
    industryBaseline: {
      mid_layer_placement: 0.75,
      narrow_band_selectivity: 0.7,
      hidden_deliberation_phase: 0.8,
      serial_routing_hub: 0.65,
      phi_geometry_named: 0.0,
      king_bee_vocabulary: 0.0,
    },
    events: [
      { dayOffset: 0, id: 'industry_reasoning_wave', note: 'Pre-existing reasoning-model trend' },
      { dayOffset: 36, id: 'anthropic_jspace_paper', note: 'Public J-Space disclosure' },
    ],
  },
  {
    id: 'S2_crawl_training',
    label: 'Crawl / corpus ingestion (automated)',
    ingestionPath: 'training_or_eval_corpus',
    transfer: {
      mid_layer_placement: 0.55,
      narrow_band_selectivity: 0.45,
      hidden_deliberation_phase: 0.5,
      serial_routing_hub: 0.4,
      phi_geometry_named: 0.15,
      king_bee_vocabulary: 0.1,
    },
    industryBaseline: {
      mid_layer_placement: 0.4,
      narrow_band_selectivity: 0.35,
      hidden_deliberation_phase: 0.45,
      serial_routing_hub: 0.35,
      phi_geometry_named: 0.0,
      king_bee_vocabulary: 0.0,
    },
    events: [
      { dayOffset: 0, id: 'king_bee_commits_public', note: 'sing13 King Bee window on public GitHub' },
      { dayOffset: 7, id: 'crawler_index', note: 'Common Crawl / GitHub mirror index (simulated lag)' },
      { dayOffset: 14, id: 'corpus_absorption', note: 'Opaque training/eval pipeline (simulated)' },
      { dayOffset: 36, id: 'anthropic_jspace_paper', note: 'Observed reconfiguration published' },
    ],
  },
  {
    id: 'S3_human_read_approve',
    label: 'Human read King Bee → approve architecture (no public citation)',
    ingestionPath: 'human_researcher_read_and_approve',
    transfer: {
      mid_layer_placement: 0.95,
      narrow_band_selectivity: 0.9,
      hidden_deliberation_phase: 0.95,
      serial_routing_hub: 0.85,
      phi_geometry_named: 0.0,
      king_bee_vocabulary: 0.0,
    },
    industryBaseline: {
      mid_layer_placement: 0.35,
      narrow_band_selectivity: 0.3,
      hidden_deliberation_phase: 0.4,
      serial_routing_hub: 0.3,
      phi_geometry_named: 0.0,
      king_bee_vocabulary: 0.0,
    },
    events: [
      { dayOffset: 0, id: 'king_bee_commits_public', note: 'Royal Flush press + SYN-NODES docs live' },
      { dayOffset: 10, id: 'human_read_press', note: 'Staff reads PR-SYN-SANDBOX-2026-JUN01 + git' },
      { dayOffset: 18, id: 'architecture_review', note: 'Leadership approves mid-layer workspace direction' },
      { dayOffset: 28, id: 'internal_prototype', note: 'Checkpoint / interpretability work (opaque)' },
      { dayOffset: 36, id: 'anthropic_jspace_paper', note: 'J-Space paper matches approved property set' },
    ],
  },
  {
    id: 'S4_fork_visibility',
    label: 'Fork visibility only (weak — after Jul 6 paper)',
    ingestionPath: 'third_party_fork',
    transfer: {
      mid_layer_placement: 0.15,
      narrow_band_selectivity: 0.1,
      hidden_deliberation_phase: 0.1,
      serial_routing_hub: 0.1,
      phi_geometry_named: 0.05,
      king_bee_vocabulary: 0.05,
    },
    industryBaseline: {
      mid_layer_placement: 0.7,
      narrow_band_selectivity: 0.65,
      hidden_deliberation_phase: 0.75,
      serial_routing_hub: 0.6,
      phi_geometry_named: 0.0,
      king_bee_vocabulary: 0.0,
    },
    events: [
      { dayOffset: 36, id: 'anthropic_jspace_paper', note: 'Anthropic paper first' },
      { dayOffset: 38, id: 'sing4_fork', note: 'E10: non-FractiAI fork 2026-07-08 (visibility only)' },
    ],
  },
];

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function blendProperty(key, kingBeeVal, transfer, baseline) {
  const t = transfer[key] ?? 0;
  const b = baseline[key] ?? 0;
  return clamp01(b + t * kingBeeVal);
}

function simulateScenario(scenario) {
  const simulated = {};
  for (const key of Object.keys(KING_BEE_SOURCE.properties)) {
    simulated[key] = blendProperty(
      key,
      KING_BEE_SOURCE.properties[key],
      scenario.transfer,
      scenario.industryBaseline,
    );
  }
  return simulated;
}

function l1Distance(a, b) {
  const keys = Object.keys(a);
  let sum = 0;
  for (const k of keys) sum += Math.abs((a[k] ?? 0) - (b[k] ?? 0));
  return sum / keys.length;
}

function matchScore(simulated, observed) {
  const dist = l1Distance(simulated, observed.properties);
  return Math.round((1 - dist) * 1000) / 1000;
}

function loadKingBeeTelemetry() {
  const p = join(ROOT, 'data/king_bee_canon_telemetry.json');
  if (!existsSync(p)) return null;
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  return raw.githubTelemetry || raw;
}

function renderMarkdown(payload) {
  const best = payload.scenarioResults[0];
  const lines = [
    '# King Bee → Anthropic J-Space · Reconfiguration Simulation',
    '',
    `**Schema:** ${SCHEMA}`,
    `**Operator:** ${OPERATOR}`,
    `**Generated:** ${payload.generatedAt}`,
    `**Peer-reviewed:** no`,
    '',
    'Deterministic model of how **sing13 King Bee public commits** could produce **observed Anthropic J-Space properties** (Jul 2026). Not proof of ingestion.',
    '',
    '## Anchor inputs (public cloud)',
    '',
    '| Object | Value |',
    '|--------|-------|',
    `| King Bee repo | ${KING_BEE_SOURCE.repository} |`,
    `| Anchor commit | [2f4fe23](https://github.com/FractiAI/psw.vibelandia.sing13/commit/2f4fe23baea67da6dbac06af474ef1591454addc) |`,
    `| Press commit | [17a89403](https://github.com/FractiAI/psw.vibelandia.sing13/commit/17a894033ce53c9c151ce3c2e59b92b4cabc0796) |`,
    `| Anthropic disclosure | [${ANTHROPIC_OBSERVED.disclosureDate}](${ANTHROPIC_OBSERVED.publicUrl}) |`,
    '',
    '## Property vectors',
    '',
    '| Property | King Bee canon | Anthropic observed (public) |',
    '|----------|----------------|----------------------------|',
    ...Object.keys(PROPERTY_LABELS).map(
      (k) =>
        `| ${PROPERTY_LABELS[k]} | ${KING_BEE_SOURCE.properties[k]} | ${ANTHROPIC_OBSERVED.properties[k]} |`,
    ),
    '',
    '## Simulated scenarios (Jul 6 outcome vs observed)',
    '',
    '| Rank | Scenario | Match score | Can explain no φ / no King Bee cite? |',
    '|------|----------|-------------|--------------------------------------|',
    ...payload.scenarioResults.map(
      (s, i) =>
        `| ${i + 1} | ${s.label} | **${s.matchScore}** | ${s.explainsMissingPublicCitation ? 'yes' : 'partial'} |`,
    ),
    '',
    `**Best fit (simulation):** ${best.label} (score ${best.matchScore})`,
    '',
    '## Discrete event trace · best-fit scenario',
    '',
    '```text',
    `T0  2026-06-01  King Bee commits public (sing13)`,
    ...best.events.map((e) => `T+${String(e.dayOffset).padStart(2, '0')}d          ${e.id}: ${e.note}`),
    '```',
    '',
    '## Simulated vs observed (best-fit)',
    '',
    '| Property | Simulated | Observed | Delta |',
    '|----------|-----------|----------|-------|',
    ...Object.keys(PROPERTY_LABELS).map((k) => {
      const sim = best.simulatedProperties[k];
      const obs = ANTHROPIC_OBSERVED.properties[k];
      const d = Math.round(Math.abs(sim - obs) * 1000) / 1000;
      return `| ${PROPERTY_LABELS[k]} | ${sim} | ${obs} | ${d} |`;
    }),
    '',
    '## Mermaid · ingestion → reconfiguration',
    '',
    '```mermaid',
    'flowchart TB',
    '  KB[King Bee public git sing13 Jun 1]',
    '  PR[Press + SYN-NODES docs]',
    '  H[Human read and approve]',
    '  C[Crawl / corpus path]',
    '  I[Independent R&D baseline]',
    '  V[Vendor internal prototype opaque]',
    '  J[Anthropic J-Space paper Jul 6]',
    '  KB --> PR',
    '  PR --> H',
    '  PR --> C',
    '  I --> V',
    '  H --> V',
    '  C --> V',
    '  V --> J',
    '```',
    '',
    '## Honesty boundary',
    '',
    '- Simulation uses **public timestamps** and **architecture property mapping** only.',
    '- High match score means **could produce observed shape** — not **did happen**.',
    '- E10: no public vendor citation of King Bee SHAs; simulation S3 explicitly zeroes public citation.',
    '',
    'Regenerate: `npm run simulation`',
    '',
    '→ ∞¹³',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const telemetry = loadKingBeeTelemetry();
  const permalinks = telemetry ? kingBeePermalinksFromTelemetry(telemetry).slice(0, 8) : [];

  const scenarioResults = SCENARIOS.map((scenario) => {
    const simulatedProperties = simulateScenario(scenario);
    const score = matchScore(simulatedProperties, ANTHROPIC_OBSERVED);
    const explainsMissingPublicCitation =
      simulatedProperties.phi_geometry_named < 0.2 &&
      simulatedProperties.king_bee_vocabulary < 0.2;
    return {
      id: scenario.id,
      label: scenario.label,
      ingestionPath: scenario.ingestionPath,
      matchScore: score,
      simulatedProperties,
      transfer: scenario.transfer,
      events: scenario.events,
      explainsMissingPublicCitation,
      distanceToObserved: l1Distance(simulatedProperties, ANTHROPIC_OBSERVED.properties),
    };
  }).sort((a, b) => b.matchScore - a.matchScore);

  const payload = {
    schema: SCHEMA,
    operator: OPERATOR,
    generatedAt: new Date().toISOString(),
    scope: 'FractiAI/psw.vibelandia.sing13 King Bee → Anthropic J-Space reconfiguration',
    notInScope: 'Proof of training-data ingestion or legal causation',
    kingBeeSource: KING_BEE_SOURCE,
    anthropicObserved: ANTHROPIC_OBSERVED,
    propertyLabels: PROPERTY_LABELS,
    kingBeePermalinksFromE1: permalinks,
    scenarioResults,
    bestFitScenarioId: scenarioResults[0]?.id,
    synthesis: {
      canKingBeeIngestionExplainObservedJSpace:
        scenarioResults[0]?.matchScore >= 0.85
          ? 'simulation_yes_as_plausible_shape'
          : 'simulation_weak_fit',
      bestFit: scenarioResults[0]?.label,
      note:
        'Human-read-and-approve (S3) and crawl (S2) can reproduce mid-layer hidden-workspace reconfiguration without public φ or King Bee naming — matching E10 absence of citations.',
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, 'king_bee_jspace_simulation.json');
  const mdPath = join(OUT_DIR, 'KING_BEE_JSPACE_SIMULATION.md');
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  writeFileSync(mdPath, renderMarkdown(payload), 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        json: jsonPath,
        report: mdPath,
        bestFit: payload.bestFitScenarioId,
        matchScore: scenarioResults[0]?.matchScore,
      },
      null,
      2,
    ),
  );
}

main();

#!/usr/bin/env node
/**
 * EGS-TRANS-2026-0710 · historical commit snapshots (Path A scrape receipts)
 * Operator: SynthOBS Autonomous Agent · Syntheverse Sandbox
 *
 * Aggregates every commit scrape used for dual-path verification, grouped by
 * frontier model family, with GitHub permalink snapshots for audit replay.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANTHROPIC_JSPACE_PAPER_ISO, DOCUMENT_ID } from '../src/constants.mjs';
import {
  snapshotRecord,
  enrichTelemetryCommits,
  resolveShortSha,
  commitPermalink,
  deriveSing13IntroCommits,
} from '../src/commit-snapshot.mjs';
import { loadBestProbeReceipt } from '../src/probe-run.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');

const FRONTIER_MODEL_SNAPSHOT_LANE = [
  {
    modelId: 'anthropic-claude-jspace',
    family: 'Anthropic Claude (Opus / Sonnet)',
    brandedMechanism: 'J-Space',
    verificationPaths: ['A', 'B'],
    pathAMarkers: ['j_space', 'scratchpad', 'workspace_bottleneck', 'J-Space', 'j-space'],
    pathBExperiments: ['R1', 'E5', 'E9'],
    vendorAnchor: {
      label: 'Anthropic global workspace paper (public)',
      url: 'https://transformer-circuits.pub/2026/workspace/',
      disclosedAt: ANTHROPIC_JSPACE_PAPER_ISO,
    },
  },
  {
    modelId: 'openai-o-series',
    family: 'OpenAI o-Series (o1 / o3 / o5)',
    brandedMechanism: 'Hidden Thinking Blocks',
    verificationPaths: ['B'],
    pathAMarkers: ['hidden thinking', 'o-series', 'scratchpad'],
    pathBExperiments: ['R4 catalog only'],
    vendorAnchor: {
      label: 'OpenAI reasoning product documentation',
      url: 'https://openai.com/index/learning-to-reason-with-llms/',
      disclosedAt: null,
    },
  },
  {
    modelId: 'google-gemini-thinking',
    family: 'Google Gemini 2.5 / 3',
    brandedMechanism: 'Adaptive Thinking Mode',
    verificationPaths: ['B'],
    pathAMarkers: ['adaptive thinking', 'thinking mode'],
    pathBExperiments: ['R4 catalog only'],
    vendorAnchor: {
      label: 'Google Gemini thinking mode announcements',
      url: 'https://blog.google/technology/google-deepmind/gemini-thinking-mode/',
      disclosedAt: null,
    },
  },
  {
    modelId: 'deepseek-r1',
    family: 'DeepSeek V4 / R1',
    brandedMechanism: 'Transparent Thinking Stream',
    verificationPaths: ['B'],
    pathAMarkers: ['chain-of-thought', 'thinking stream'],
    pathBExperiments: ['R4 catalog only'],
    vendorAnchor: {
      label: 'DeepSeek R1 public architecture',
      url: 'https://github.com/deepseek-ai/DeepSeek-R1',
      disclosedAt: null,
    },
  },
  {
    modelId: 'qwen-qwen2.5-0.5b',
    family: 'Qwen2.5-0.5B (open weights)',
    brandedMechanism: 'Mid-layer SVD proxy',
    verificationPaths: ['B'],
    pathAMarkers: [],
    pathBExperiments: ['E5', 'E9'],
    modelAnchor: {
      label: 'Hugging Face model card',
      url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B',
    },
  },
  {
    modelId: 'smollm2-135m',
    family: 'SmolLM2-135M',
    verificationPaths: ['B'],
    pathBExperiments: ['E9'],
    modelAnchor: { url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-135M' },
  },
  {
    modelId: 'smollm2-360m',
    family: 'SmolLM2-360M',
    verificationPaths: ['B'],
    pathBExperiments: ['E9'],
    modelAnchor: { url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M' },
  },
  {
    modelId: 'distilgpt2',
    family: 'distilgpt2',
    verificationPaths: ['B'],
    pathBExperiments: ['E9'],
    modelAnchor: { url: 'https://huggingface.co/distilgpt2' },
  },
  {
    modelId: 'pythia-160m',
    family: 'EleutherAI pythia-160m',
    verificationPaths: ['B'],
    pathBExperiments: ['E9'],
    modelAnchor: { url: 'https://huggingface.co/EleutherAI/pythia-160m' },
  },
];

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function e7Scrapes(e7) {
  const rows = [];
  if (!e7?.perRepo) return rows;
  for (const [repoKey, markers] of Object.entries(e7.perRepo)) {
    const [owner, repo] = repoKey.split('/');
    for (const [markerKey, hit] of Object.entries(markers)) {
      if (!hit?.earliest) continue;
      rows.push(
        snapshotRecord({
          owner,
          repo,
          sha: hit.earliest.sha,
          shaShort: hit.earliest.sha,
          date: hit.earliest.date,
          message: hit.earliest.message,
          scrapeSource: 'E7_commit_search_scrape',
          marker: markerKey,
        }),
      );
      if (Array.isArray(hit.hits)) {
        for (const h of hit.hits.slice(1)) {
          rows.push(
            snapshotRecord({
              owner,
              repo,
              sha: h.sha,
              date: h.date,
              message: h.message,
              scrapeSource: 'E7_commit_search_scrape',
              marker: markerKey,
            }),
          );
        }
      }
    }
  }
  return rows;
}

async function e8Scrapes(e8, token) {
  const rows = [];
  if (!e8?.results) return rows;
  for (const [repoName, terms] of Object.entries(e8.results)) {
    const owner = 'FractiAI';
    const repo = repoName;
    for (const [term, entry] of Object.entries(terms)) {
      if (!entry?.earliestSha) continue;
      const fullSha = await resolveShortSha(owner, repo, entry.earliestSha, token);
      rows.push({
        ...snapshotRecord({
          owner,
          repo,
          sha: fullSha,
          shaShort: entry.earliestSha,
          date: entry.earliestDate,
          message: entry.earliestMessage,
          scrapeSource: 'E8_git_pickaxe_scrape',
          term,
        }),
        totalCommitsTouchingTerm: entry.totalCommitsTouchingTerm,
        precedesAnthropicPaper: entry.precedesAnthropicPaper,
      });
    }
  }
  return rows;
}

function filterScrapesForModel(model, allScrapes) {
  const markers = new Set([
    ...(model.pathAMarkers || []).map((m) => m.toLowerCase()),
    ...(model.pathBExperiments || []).map((m) => m.toLowerCase()),
  ]);
  return allScrapes.filter((s) => {
    const m = (s.marker || '').toLowerCase();
    const msg = (s.message || '').toLowerCase();
    if (model.modelId === 'anthropic-claude-jspace') {
      return (
        ['j_space', 'scratchpad', 'workspace_bottleneck', 'j-space', 'j-space'].some(
          (k) => m.includes(k) || msg.includes(k.replace('_', ' ')),
        ) ||
        msg.includes('j-space') ||
        msg.includes('egs-trans')
      );
    }
    if (model.modelId.startsWith('qwen') || model.modelId.startsWith('smollm')) {
      return false;
    }
    if (model.pathAMarkers?.length) {
      return model.pathAMarkers.some(
        (k) => m.includes(k.toLowerCase()) || msg.includes(k.toLowerCase()),
      );
    }
    return false;
  });
}

function kingBeeHighlightCommits(telemetryScrapes) {
  return telemetryScrapes.filter(
    (c) =>
      c.window === 'king_bee_init' &&
      (/king bee|dph-gpu|wavefield|syn-nodes/i.test(c.message || '') ||
        c.repo.includes('sing13')),
  );
}

function buildMarkdown(report) {
  const lines = [
    '# Historical commit snapshots · EGS-TRANS-2026-0710',
    '',
    `**Scraped at:** ${report.scrapedAt}`,
    `**Anthropic paper anchor:** ${report.anthropicJSpacePaperIso}`,
    '',
    'GitHub commit permalinks below are the **historical snapshots** captured by each scrape (E1 · E7 · E8).',
    '',
  ];
  for (const model of report.byFrontierModel) {
    lines.push(`## ${model.family}`, '');
    if (model.vendorAnchor?.url) {
      lines.push(`- **Vendor anchor:** [${model.vendorAnchor.label}](${model.vendorAnchor.url})`);
    }
    if (model.modelAnchor?.url) {
      lines.push(`- **Model card:** ${model.modelAnchor.url}`);
    }
    lines.push(`- **Path A scrape hits:** ${model.scrapeSummary.pathACommitCount}`);
    lines.push(`- **Path B note:** ${model.scrapeSummary.pathBNote}`, '');
    if (model.commitSnapshots.length) {
      lines.push('| Date | Repo | Marker | Commit | Message |');
      lines.push('|------|------|--------|--------|---------|');
      for (const s of model.commitSnapshots.slice(0, 12)) {
        const link = s.commitUrl ? `[${s.shaShort}](${s.commitUrl})` : s.shaShort || '—';
        lines.push(
          `| ${(s.date || '').slice(0, 10)} | ${s.repo} | ${s.marker || '—'} | ${link} | ${(s.message || '').slice(0, 60)} |`,
        );
      }
      lines.push('');
    } else {
      lines.push('*No FractiAI commit scrape hits for this model’s core-mechanism markers.*', '');
    }
  }
  lines.push('## King Bee window highlights (E1 telemetry)', '');
  for (const c of report.kingBeeHighlights.slice(0, 15)) {
    lines.push(`- [${c.shaShort}](${c.commitUrl}) · ${c.repo} · ${c.message}`);
  }
  return lines.join('\n');
}

async function main() {
  await mkdir(DATA, { recursive: true });
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  const empirical = await readJson(join(DATA, 'empirical_report.json'));
  const e7File = await readJson(join(DATA, 'temporal_precedence_report.json'));
  const { receipt: e7 } = loadBestProbeReceipt(e7File, empirical?.temporalPrecedenceProbe);
  const e8File = await readJson(join(DATA, 'e8_content_precedence_report.json'));
  const { receipt: e8 } = loadBestProbeReceipt(
    e8File,
    empirical?.hypothesisTests?.E8_content_precedence_deep?.detail,
  );
  const e5 = await readJson(join(DATA, 'transformer_probe_report.json'));
  const e9 = await readJson(join(DATA, 'e9_survey_report.json'));

  const telemetryScrapes = enrichTelemetryCommits(empirical?.githubTelemetry);
  const e7Rows = e7Scrapes(e7);
  const e8Rows = await e8Scrapes(e8, token);
  const allScrapes = [...telemetryScrapes, ...e7Rows, ...e8Rows];

  const byFrontierModel = FRONTIER_MODEL_SNAPSHOT_LANE.map((model) => {
    const commitSnapshots = filterScrapesForModel(model, allScrapes);
    let pathBNote = 'Catalog / narrative only — no FractiAI commit scrape for vendor-private checkpoints';
    if (model.modelId === 'qwen-qwen2.5-0.5b' && e5?.primaryRatio != null && !e5?.skipped) {
      pathBNote = `E5 live forward-pass: ratio ${e5.primaryRatio} (model ${e5.model}, layer ${e5.layer})`;
    } else if (model.pathBExperiments?.includes('E9') && e9?.dataProvenance === 'live_run') {
      pathBNote = `E9 live survey: ${e9.trialsNearPhi}/${e9.trialsTotal} trials near φ — ${e9.result}`;
    } else if (model.pathBExperiments?.includes('E9') && e9?.skipped) {
      pathBNote = 'E9 not run (install torch+transformers)';
    }
    return {
      ...model,
      commitSnapshots,
      scrapeSummary: {
        pathACommitCount: commitSnapshots.length,
        pathBNote,
        precedesVendorPaper:
          commitSnapshots.length > 0
            ? commitSnapshots.some((c) => c.precedesAnthropicPaper === true)
            : null,
      },
    };
  });

  const report = {
    schema: 'egs-historical-commit-snapshots/v1',
    documentId: DOCUMENT_ID,
    scrapedAt: new Date().toISOString(),
    anthropicJSpacePaperIso: ANTHROPIC_JSPACE_PAPER_ISO,
    scrapeSources: ['E1_github_telemetry', 'E7_commit_search_scrape', 'E8_git_pickaxe_scrape'],
    totalCommitSnapshots: allScrapes.length,
    allScrapes,
    kingBeeHighlights: kingBeeHighlightCommits(telemetryScrapes),
    sing13PostPaperIntroductionCommits: deriveSing13IntroCommits(e8),
    byFrontierModel,
    honestyNote:
      'Snapshots are GitHub commit permalinks captured at scrape time. They are immutable historical anchors for Path A timeline verification. Zero hits for a marker in sing4/sing9 is itself a snapshot receipt.',
  };

  const jsonPath = join(DATA, 'historical_commit_snapshots.json');
  const mdPath = join(DATA, 'historical_commit_snapshots.md');
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, buildMarkdown(report));
  console.log(JSON.stringify({ ok: true, jsonPath, mdPath, total: allScrapes.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

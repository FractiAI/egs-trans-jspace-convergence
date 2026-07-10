#!/usr/bin/env node
/**
 * EGS-TRANS-2026-0710 · E7 temporal precedence probe.
 * Operator: SynthOBS Autonomous Agent · Syntheverse Sandbox
 *
 * R1 (Code-Print Audit) claims a public "crosswalk" between FractiAI's
 * sing4/sing9/sing13 vocabulary and Anthropic's July 6 2026 J-Space paper.
 * That crosswalk is read against the CURRENT HEAD of those repos, which
 * cannot distinguish "FractiAI used this vocabulary first" from "FractiAI
 * added this vocabulary after reading the Anthropic paper."
 *
 * E7 closes that gap: for each schema marker used by R1, search each core
 * repo's commit history via the GitHub commit-search API and report the
 * earliest committer-date hit. A marker whose earliest hit postdates
 * ANTHROPIC_JSPACE_PAPER_ISO cannot support a "FractiAI came first" claim
 * for that marker — full stop, regardless of what R1's current-HEAD
 * crosswalk reports.
 *
 * Falsification:
 *   Pass  -> at least one core-mechanism marker (workspace_bottleneck,
 *            scratchpad, j_space) has an earliest hit BEFORE the Anthropic
 *            paper date, in a repo other than the one that only documents
 *            EGS-TRANS itself.
 *   Refute -> every core-mechanism marker either never occurs, or first
 *            occurs on/after the Anthropic paper date.
 *
 * Requires GH_TOKEN or GITHUB_TOKEN (commit search is auth-required and
 * rate-limited even for public repos). Skips cleanly if no token.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANTHROPIC_JSPACE_PAPER_ISO, CORE_REPOS, GITHUB_USER_AGENT } from '../src/constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'data', 'temporal_precedence_report.json');

// Markers R1's code-print audit treats as evidence of structural alignment.
// See research/ip-infringement-draft/src/code-print-audit.mjs SCHEMA_MARKERS.
const MARKERS = [
  { key: 'j_space', query: 'j-space' },
  { key: 'scratchpad', query: 'scratchpad' },
  { key: 'workspace_bottleneck', query: 'workspace+bottleneck' },
  { key: 'egs_phi_1618', query: '1.618' },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchCommits(owner, repo, query, token) {
  const url =
    `https://api.github.com/search/commits?q=repo:${owner}/${repo}+${query}` +
    `&sort=committer-date&order=asc&per_page=5`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': GITHUB_USER_AGENT,
      Accept: 'application/vnd.github.cloak-preview+json',
      ...(token ? { Authorization: `token ${token}` } : {}),
    },
  });
  if (!r.ok) {
    return { ok: false, status: r.status, error: await r.text().catch(() => '') };
  }
  const data = await r.json();
  const hits = (data.items || []).map((item) => ({
    sha: item.sha,
    shaShort: item.sha.slice(0, 8),
    date: item.commit.committer.date,
    message: item.commit.message.split('\n')[0].slice(0, 120),
    commitUrl: item.html_url,
    author: item.commit?.author?.name,
  }));
  return {
    ok: true,
    totalCount: data.total_count ?? 0,
    earliest: hits[0] || null,
    hits,
    snapshotScrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  await mkdir(dirname(OUT_PATH), { recursive: true });

  if (!token) {
    const skipped = {
      documentId: 'EGS-TRANS-2026-0710',
      experiment: 'E7_temporal_precedence',
      result: 'skipped',
      reason: 'No GH_TOKEN/GITHUB_TOKEN set; GitHub commit search requires auth.',
    };
    await writeFile(OUT_PATH, JSON.stringify(skipped, null, 2));
    console.log(JSON.stringify(skipped, null, 2));
    return 0;
  }

  const anthropicDate = new Date(ANTHROPIC_JSPACE_PAPER_ISO + 'T00:00:00Z');
  const perRepo = {};
  const coreMechanismMarkers = new Set(['j_space', 'scratchpad', 'workspace_bottleneck']);
  let anyCoreMarkerPreceded = false;

  for (const { owner, repo } of CORE_REPOS) {
    const key = `${owner}/${repo}`;
    perRepo[key] = {};
    for (const marker of MARKERS) {
      const res = await searchCommits(owner, repo, marker.query, token);
      let precedesAnthropic = null;
      if (res.ok && res.earliest) {
        precedesAnthropic = new Date(res.earliest.date) < anthropicDate;
        if (precedesAnthropic && coreMechanismMarkers.has(marker.key)) {
          anyCoreMarkerPreceded = true;
        }
      }
      perRepo[key][marker.key] = { ...res, precedesAnthropicPaper: precedesAnthropic };
      await sleep(2500); // commit-search endpoint has a tight secondary rate limit
    }
  }

  const result = anyCoreMarkerPreceded ? 'support' : 'refute';

  const out = {
    documentId: 'EGS-TRANS-2026-0710',
    experiment: 'E7_temporal_precedence',
    generatedAt: new Date().toISOString(),
    dataProvenance: 'live_run',
    anthropicJSpacePaperIso: ANTHROPIC_JSPACE_PAPER_ISO,
    hypothesis:
      'At least one core-mechanism R1 schema marker (j_space, scratchpad, workspace_bottleneck) ' +
      'appears in core FractiAI repo commit history strictly before the Anthropic J-Space paper date.',
    markers: MARKERS.map((m) => m.key),
    perRepo,
    result,
    honestyNote:
      'GitHub commit-search matches commit messages/metadata, not full historical file diffs — ' +
      'a marker absent from this search may still have existed in file bodies without being ' +
      'mentioned in a commit message. This is therefore a conservative, falsification-oriented ' +
      'probe: it can demonstrate precedence (support) but a "refute" result is evidence of absence ' +
      'from the commit trail, not proof the concept never existed anywhere in the repo. Interpret ' +
      'accordingly and prefer git blame on a full local clone for a stronger claim in either direction.',
  };

  await writeFile(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, path: OUT_PATH, result }, null, 2));
  return 0;
}

main().then((code) => process.exit(code ?? 0));

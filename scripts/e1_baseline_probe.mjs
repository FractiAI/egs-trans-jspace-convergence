#!/usr/bin/env node
/**
 * EGS-TRANS-2026-0710 · E1b baseline-control probe.
 * Operator: SynthOBS Autonomous Agent · Syntheverse Sandbox
 *
 * E1 reports "support" for commit activity in the King Bee window
 * (2026-05-31 -- 2026-06-02) without a baseline: is that window's commit
 * count actually anomalous, or is it consistent with each repo's normal
 * cadence? sing4 in particular is driven by an always-on hourly heartbeat
 * bot (see METHODOLOGY.md E1 baseline note) -- E1b tests this directly.
 *
 * Method: for each core repo, fetch daily commit counts over a long
 * control period (CONTROL_DAYS days ending the day before the King Bee
 * window) via the GitHub REST commit-count-by-day approach (paginated
 * commits, bucketed by UTC day), compute mean/stdev of daily commit
 * count, then compare the King Bee window's per-day count via a z-score.
 * A z-score within roughly +-2 means the window is unremarkable relative
 * to the repo's own baseline cadence -- i.e. NOT anomalous, regardless of
 * what "support" in E1's binary framing suggests.
 *
 * Falsification:
 *   Anomalous  -> |z| > 2 for at least one repo (window count is a real
 *                 outlier vs baseline cadence)
 *   Not anomalous -> |z| <= 2 for every repo (window count is explained
 *                 by ordinary cadence, e.g. an always-on bot)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_REPOS, GITHUB_USER_AGENT } from '../src/constants.mjs';
import { fetchDatesFromLocalClone } from '../src/git-clone-fallback.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'data', 'e1_baseline_report.json');

const CONTROL_DAYS = 30; // control window length, ending the day before King Bee window starts
const WINDOW_SINCE = '2026-05-31T00:00:00Z';
const WINDOW_UNTIL = '2026-06-02T00:00:00Z'; // 2 days, matches E1's king_bee_init window
const WINDOW_DAYS = 2;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

async function fetchCommitDates(owner, repo, sinceIso, untilIso, maxPages = 10) {
  const dates = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url =
      `https://api.github.com/repos/${owner}/${repo}/commits` +
      `?since=${encodeURIComponent(sinceIso)}&until=${encodeURIComponent(untilIso)}` +
      `&per_page=100&page=${page}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': GITHUB_USER_AGENT,
        ...(GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {}),
      },
    });
    if (r.status === 404 || r.status === 409) break;
    if (r.status === 403) {
      const local = fetchDatesFromLocalClone(repo, sinceIso, untilIso);
      if (local) return local;
      throw new Error(`${owner}/${repo} -> HTTP 403`);
    }
    if (!r.ok) throw new Error(`${owner}/${repo} -> HTTP ${r.status}`);
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    for (const c of batch) {
      const d = c.commit?.committer?.date || c.commit?.author?.date;
      if (d) dates.push(d);
    }
    if (batch.length < 100) break;
    await sleep(300);
  }
  return dates;
}

function bucketByDay(dates) {
  const byDay = {};
  for (const d of dates) {
    const day = d.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }
  return byDay;
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function stdev(xs, m) {
  if (xs.length < 2) return 0;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

async function main() {
  await mkdir(dirname(OUT_PATH), { recursive: true });

  const controlUntil = new Date(WINDOW_SINCE);
  const controlSince = new Date(controlUntil.getTime() - CONTROL_DAYS * 86400000);

  const perRepo = {};
  let anyAnomalous = false;

  for (const { owner, repo, role } of CORE_REPOS) {
    const key = `${owner}/${repo}`;

    const controlDates = await fetchCommitDates(
      owner,
      repo,
      controlSince.toISOString(),
      controlUntil.toISOString(),
    );
    const windowDates = await fetchCommitDates(owner, repo, WINDOW_SINCE, WINDOW_UNTIL);

    const controlByDay = bucketByDay(controlDates);
    // Fill in zero-commit days so the baseline reflects true daily cadence, not just active days.
    const dailyCounts = [];
    for (let i = 0; i < CONTROL_DAYS; i += 1) {
      const day = new Date(controlSince.getTime() + i * 86400000).toISOString().slice(0, 10);
      dailyCounts.push(controlByDay[day] || 0);
    }

    const baselineMean = mean(dailyCounts);
    const baselineStd = stdev(dailyCounts, baselineMean);
    const windowPerDay = windowDates.length / WINDOW_DAYS;
    const z = baselineStd > 0 ? (windowPerDay - baselineMean) / baselineStd : null;
    const anomalous = z !== null && Math.abs(z) > 2;
    if (anomalous) anyAnomalous = true;

    perRepo[key] = {
      role,
      controlWindow: {
        since: controlSince.toISOString().slice(0, 10),
        until: controlUntil.toISOString().slice(0, 10),
        days: CONTROL_DAYS,
        totalCommits: controlDates.length,
        dailyMean: Number(baselineMean.toFixed(3)),
        dailyStdev: Number(baselineStd.toFixed(3)),
      },
      kingBeeWindow: {
        since: WINDOW_SINCE,
        until: WINDOW_UNTIL,
        totalCommits: windowDates.length,
        perDay: Number(windowPerDay.toFixed(3)),
      },
      zScore: z === null ? null : Number(z.toFixed(3)),
      anomalousVsBaseline: anomalous,
    };
    await sleep(500);
  }

  const out = {
    documentId: 'EGS-TRANS-2026-0710',
    experiment: 'E1b_baseline_control',
    generatedAt: new Date().toISOString(),
    dataProvenance: 'live_run',
    hypothesis:
      'King Bee window (2026-05-31--2026-06-02) commit activity is anomalous relative to each ' +
      'core repo\'s own baseline cadence over the preceding 30 days (|z| > 2).',
    controlDays: CONTROL_DAYS,
    perRepo,
    result: anyAnomalous ? 'support' : 'refute',
    honestyNote:
      'This is the E1 baseline control flagged as missing in docs/VALIDATION_AUDIT_2026-07-10.md. ' +
      'A repo whose King Bee-window activity is not distinguishable from its ordinary cadence ' +
      '(e.g. an always-on heartbeat bot) provides no evidence of a discrete initialization event, ' +
      'regardless of the raw commit count reported by E1.',
  };

  await writeFile(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, path: OUT_PATH, result: out.result }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

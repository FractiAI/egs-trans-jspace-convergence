#!/usr/bin/env node
/**
 * E10 · Commit influence proxy (public tier)
 *
 * Primary question: did **other models / vendor teams read FractiAI King Bee commits**
 * and get **influenced** (training crawl, human approve, live retrieval)?
 *
 * This script implements **one falsifiable public proxy**: vendor org GitHub or public
 * pages **linking** our King Bee repo URLs or commit SHAs. It does NOT measure:
 *   - training-data absorption
 *   - staff reading without citation
 *   - session-time RAG / URL paste into assistants
 *
 * Absence of hits here does NOT prove vendors never read our commits.
 *
 * Public tiers:
 *  - GitHub code search: vendor org repos citing FractiAI King Bee repo URLs or SHAs
 *  - GitHub repo fork list: non-FractiAI forks of core repos (proxy for clone/scrape)
 *  - Vendor public pages: HTTP fetch for github.com/FractiAI/ links
 *
 * Internal tier (not run here): GitHub Insights traffic/referrers — org admin token only.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GITHUB_USER_AGENT, ANTHROPIC_JSPACE_PAPER_ISO } from '../src/constants.mjs';
import {
  KING_BEE_REPO_SLUGS,
  KING_BEE_REPO_URLS,
  KING_BEE_EXAMPLE_COMMITS,
  VENDOR_INGRESS_TARGETS,
  VENDOR_PUBLIC_URLS,
  kingBeePermalinksFromTelemetry,
  isKingBeeCommitMessage,
} from '../src/king-bee-anchors.mjs';
import { readJsonIfExists } from '../src/probe-run.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

async function githubSearchCode(query) {
  const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=20`;
  const headers = { 'User-Agent': GITHUB_USER_AGENT, Accept: 'application/vnd.github.text-match+json' };
  if (GH_TOKEN) headers.Authorization = `token ${GH_TOKEN}`;
  const r = await fetch(url, { headers });
  if (r.status === 403) {
    return { skipped: true, reason: 'GitHub code search rate limit or forbidden — set GH_TOKEN', query };
  }
  if (!r.ok) {
    return { error: `HTTP ${r.status}`, query };
  }
  const data = await r.json();
  return {
    query,
    totalCount: data.total_count ?? 0,
    items: (data.items || []).map((item) => ({
      repo: item.repository?.full_name,
      path: item.path,
      url: item.html_url,
      score: item.score,
    })),
  };
}

async function listRecentForks(owner, repo, limit = 30) {
  const url = `https://api.github.com/repos/${owner}/${repo}/forks?sort=newest&per_page=${limit}`;
  const headers = { 'User-Agent': GITHUB_USER_AGENT };
  if (GH_TOKEN) headers.Authorization = `token ${GH_TOKEN}`;
  const r = await fetch(url, { headers });
  if (!r.ok) return { error: `HTTP ${r.status}`, repo: `${owner}/${repo}` };
  const forks = await r.json();
  const nonFracti = (forks || []).filter(
    (f) => f.owner?.login && !/^FractiAI/i.test(f.owner.login),
  );
  return {
    repo: `${owner}/${repo}`,
    forkCountSampled: forks.length,
    nonFractiAiForks: nonFracti.map((f) => ({
      owner: f.owner.login,
      url: f.html_url,
      createdAt: f.created_at,
    })),
  };
}

async function scanPublicUrlForFractiLinks(entry) {
  try {
    const r = await fetch(entry.url, {
      headers: { 'User-Agent': GITHUB_USER_AGENT },
      redirect: 'follow',
    });
    if (!r.ok) return { ...entry, fetchStatus: r.status, fractiLinks: [] };
    const text = await r.text();
    const links = [];
    for (const slug of KING_BEE_REPO_SLUGS) {
      const re = new RegExp(`https://github.com/FractiAI/${slug}[^"'\\s)]*`, 'gi');
      for (const m of text.match(re) || []) {
        if (!links.includes(m)) links.push(m);
      }
    }
    const mentionsFracti = /FractiAI|King Bee|king bee|psw\.vibelandia/i.test(text);
    return {
      vendor: entry.vendor,
      label: entry.label,
      url: entry.url,
      fetchStatus: r.status,
      fractiGithubLinks: links,
      mentionsFractiAiOrKingBee: mentionsFracti,
    };
  } catch (e) {
    return { ...entry, error: String(e.message || e), fractiGithubLinks: [] };
  }
}

function classifyIngress({ vendorCodeHits, forkSamples, publicPageScans, kingBeeCanonCount }) {
  const codeHitTotal = vendorCodeHits.reduce((n, v) => n + (v.totalCount || 0), 0);
  const pageLinks = publicPageScans.flatMap((p) => p.fractiGithubLinks || []);
  const forks = forkSamples.flatMap((f) => f.nonFractiAiForks || []);

  if (codeHitTotal > 0 || pageLinks.length > 0) {
    return {
      result: 'support_public_ingress',
      summary: 'Public vendor-side references to FractiAI King Bee repos or permalinks found',
    };
  }
  if (forks.length > 0) {
    return {
      result: 'weak_fork_proxy_only',
      summary: 'Non-FractiAI forks exist (clone proxy) but no vendor-org code citations in this scan',
    };
  }
  return {
    result: 'no_public_ingress_detected',
    summary:
      'No vendor-org GitHub code hits or vendor-page FractiAI permalinks in public tier; does not prove vendors never scraped — only that public receipts are absent',
  };
}

async function main() {
  await mkdir(DATA, { recursive: true });

  const empirical = await readJsonIfExists(join(DATA, 'empirical_report.json'));
  const canonFile = await readJsonIfExists(join(DATA, 'king_bee_canon_telemetry.json'));
  const telemetry = empirical?.githubTelemetry || canonFile?.githubTelemetry;
  const kingBeeCanon = kingBeePermalinksFromTelemetry(telemetry);
  for (const ex of KING_BEE_EXAMPLE_COMMITS) {
    if (!kingBeeCanon.some((k) => k.sha?.startsWith(ex.sha.slice(0, 8)))) {
      kingBeeCanon.push({
        repo: ex.repo,
        sha: ex.sha,
        shaShort: ex.sha.slice(0, 8),
        date: ex.date,
        message: ex.label,
        commitUrl: `https://github.com/${ex.repo}/commit/${ex.sha}`,
        source: 'canonical_anchor',
      });
    }
  }

  const vendorCodeHits = [];
  for (const vendor of VENDOR_INGRESS_TARGETS) {
    for (const slug of KING_BEE_REPO_SLUGS) {
      const q = `${slug} org:${vendor.org}`;
      vendorCodeHits.push({ vendor: vendor.id, ...(await githubSearchCode(q)) });
      await new Promise((r) => setTimeout(r, 2500));
    }
    const shaQueries = kingBeeCanon
      .filter((k) => k.repo?.includes('sing13') || k.repo?.includes('sing4'))
      .slice(0, 3);
    for (const k of shaQueries) {
      if (!k.sha || k.sha.length < 8) continue;
      const q = `${k.sha.slice(0, 12)} org:${vendor.org}`;
      vendorCodeHits.push({ vendor: vendor.id, canonSha: k.shaShort, ...(await githubSearchCode(q)) });
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  const globalRepoQuery = await githubSearchCode(
    `"psw.vibelandia.sing13" OR "psw.vibelandia.sing4" -user:FractiAI`,
  );

  const forkSamples = [];
  for (const slug of KING_BEE_REPO_SLUGS) {
    forkSamples.push(await listRecentForks('FractiAI', slug));
  }

  const publicPageScans = [];
  for (const entry of VENDOR_PUBLIC_URLS) {
    publicPageScans.push(await scanPublicUrlForFractiLinks(entry));
  }

  const classification = classifyIngress({
    vendorCodeHits,
    forkSamples,
    publicPageScans,
    kingBeeCanonCount: kingBeeCanon.length,
  });

  const vendorIngressScrapes = [];
  for (const block of vendorCodeHits) {
    if (!block.items?.length) continue;
    for (const item of block.items) {
      vendorIngressScrapes.push({
        scrapeType: 'vendor_github_code_search',
        vendor: block.vendor,
        query: block.query,
        repo: item.repo,
        path: item.path,
        url: item.url,
        snapshotType: 'vendor_side_reference',
      });
    }
  }
  for (const page of publicPageScans) {
    for (const link of page.fractiGithubLinks || []) {
      vendorIngressScrapes.push({
        scrapeType: 'vendor_public_page_link',
        vendor: page.vendor,
        sourceUrl: page.url,
        fractiUrl: link,
        snapshotType: 'vendor_side_reference',
      });
    }
  }

  const report = {
    experiment: 'E10_vendor_king_bee_ingress',
    generatedAt: new Date().toISOString(),
    dataProvenance: GH_TOKEN ? 'live_run' : 'live_run_partial_no_token',
    scrapePolicy: {
      primaryQuestion:
        'Did other models / vendor teams read FractiAI King Bee commits and get influenced?',
      publicProxy:
        'Vendor org GitHub or public pages linking our King Bee repo URLs or commit SHAs (this script)',
      notMeasuredHere: [
        'Training-data absorption without citation',
        'Human staff reading and approving alignment without public link',
        'Live assistant RAG / URL paste at query time',
      ],
      notPrimary:
        'FractiAI self-scrape for vendor product vocabulary (E7/E8 — diagnostic only)',
      kingBeeCanonRole: 'Public permalinks anyone (including models) can read on the open internet',
    },
    vendorDisclosureAnchor: ANTHROPIC_JSPACE_PAPER_ISO,
    kingBeeCanonPermalinks: kingBeeCanon.map((k) => ({
      ...k,
      kingBeeMessage: isKingBeeCommitMessage(k.message),
    })),
    vendorCodeSearch: vendorCodeHits,
    globalNonFractiRepoReferences: globalRepoQuery,
    forkSamples,
    publicPageScans,
    vendorIngressScrapes,
    vendorIngressScrapeCount: vendorIngressScrapes.length,
    ...classification,
    internalTierNotRun: {
      githubInsightsReferrers:
        'Requires FractiAI org admin — repo Traffic/Referrers API not invoked here',
      vendorPrivateLogs: 'Not accessible on public tier',
    },
    honestyNote:
      'E10 is one public proxy (org citation). Absence of hits does not prove vendors or models never read King Bee commits; presence would be strong citation support. Fork list is weak visibility only.',
    reproduceCommand: 'GH_TOKEN=$(gh auth token) node scripts/vendor_king_bee_ingress_probe.mjs',
  };

  const outPath = join(DATA, 'vendor_king_bee_ingress_report.json');
  await writeFile(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, path: outPath, result: report.result }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

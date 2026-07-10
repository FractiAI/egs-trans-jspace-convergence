/** Git commit permalink helpers · Path A historical snapshot receipts */
import { GITHUB_USER_AGENT } from './constants.mjs';

export function commitPermalink(owner, repo, sha) {
  if (!sha) return null;
  return `https://github.com/${owner}/${repo}/commit/${sha}`;
}

export function treePermalink(owner, repo, sha) {
  if (!sha) return null;
  return `https://github.com/${owner}/${repo}/tree/${sha}`;
}

export function snapshotRecord({ owner, repo, sha, shaShort, date, message, scrapeSource, marker, term }) {
  const fullSha = sha || shaShort;
  return {
    repo: `${owner}/${repo}`,
    sha: fullSha,
    shaShort: (fullSha || '').slice(0, 8),
    date: date || null,
    message: message || null,
    marker: marker || term || null,
    scrapeSource,
    commitUrl: fullSha && fullSha.length >= 7 ? commitPermalink(owner, repo, fullSha) : null,
    treeUrl: fullSha && fullSha.length >= 7 ? treePermalink(owner, repo, fullSha) : null,
    snapshotType: 'github_commit_permalink',
  };
}

/** Resolve short SHA via GitHub API (public repos; token optional). */
export async function resolveShortSha(owner, repo, shortSha, token) {
  if (!shortSha) return null;
  if (shortSha.length >= 40) return shortSha;
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${shortSha}`;
    const headers = { 'User-Agent': GITHUB_USER_AGENT };
    if (token) headers.Authorization = `token ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) return shortSha;
    const data = await r.json();
    return data.sha || shortSha;
  } catch {
    return shortSha;
  }
}

export function enrichTelemetryCommits(githubTelemetry) {
  const out = [];
  if (!githubTelemetry?.byRepo) return out;
  for (const [repoKey, repoData] of Object.entries(githubTelemetry.byRepo)) {
    const [owner, repo] = repoKey.split('/');
    for (const [windowId, window] of Object.entries(repoData.windows || {})) {
      for (const c of window.commits || []) {
        out.push({
          ...snapshotRecord({
            owner,
            repo,
            sha: c.sha,
            shaShort: c.shaShort,
            date: c.date,
            message: c.message,
            scrapeSource: 'E1_github_telemetry',
            marker: windowId,
          }),
          window: windowId,
          windowLabel: window.label,
        });
      }
    }
  }
  return out;
}

/** Derive sing13 post-paper introduction commits from live E8 pickaxe hits only. */
export function deriveSing13IntroCommits(e8) {
  const repo = 'psw.vibelandia.sing13';
  const terms = e8?.results?.[repo];
  if (!terms) return [];
  const seen = new Set();
  const rows = [];
  for (const [term, entry] of Object.entries(terms)) {
    for (const hit of entry.allHits || []) {
      if (seen.has(hit.sha)) continue;
      seen.add(hit.sha);
      rows.push({
        sha: hit.sha,
        shaShort: hit.shaShort,
        commitUrl: hit.commitUrl,
        date: hit.date,
        message: hit.message,
        term,
        dataProvenance: 'E8_git_pickaxe_scrape',
      });
    }
  }
  return rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

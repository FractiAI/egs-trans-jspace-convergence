import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { CORE_REPOS, GITHUB_USER_AGENT } from './constants.mjs';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

function cloneRoot() {
  return process.env.EGS_E8_CLONE_DIR || join(tmpdir(), 'egs-trans-e8-clones');
}

function fetchCommitsFromLocalClone(repo, sinceIso, untilIso) {
  const repoPath = join(cloneRoot(), repo);
  try {
    execSync(`git -C "${repoPath}" rev-parse --git-dir`, { stdio: 'pipe' });
  } catch {
    return null;
  }
  const since = sinceIso.slice(0, 10);
  const until = untilIso.slice(0, 10);
  try {
    const out = execSync(
      `git -C "${repoPath}" log --all --since="${since}" --until="${until}" --date=iso --pretty=format:%H%x09%ad%x09%s`,
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, date, ...msg] = line.split('\t');
        return {
          sha,
          shaShort: sha.slice(0, 8),
          date,
          message: msg.join('\t').trim(),
          htmlUrl: `https://github.com/FractiAI/${repo}/commit/${sha}`,
          author: null,
          source: 'local_git_clone',
        };
      });
  } catch {
    return null;
  }
}

/**
 * Fetch commits in [since, until) from GitHub REST; fall back to local E8 clones on 403.
 */
export async function fetchRepoCommits(owner, repo, sinceIso, untilIso, maxPages = 5) {
  const rows = [];
  let usedLocalFallback = false;
  for (let page = 1; page <= maxPages; page += 1) {
    const url =
      `https://api.github.com/repos/${owner}/${repo}/commits` +
      `?since=${encodeURIComponent(sinceIso)}&until=${encodeURIComponent(untilIso)}` +
      `&per_page=100&page=${page}`;
    const headers = { 'User-Agent': GITHUB_USER_AGENT };
    if (GH_TOKEN) headers.Authorization = `token ${GH_TOKEN}`;
    const r = await fetch(url, { headers });
    if (r.status === 404 || r.status === 409) break;
    if (r.status === 403) {
      const local = fetchCommitsFromLocalClone(repo, sinceIso, untilIso);
      if (local) {
        usedLocalFallback = true;
        return local;
      }
      const err = new Error(`${owner}/${repo} → HTTP 403 (rate limit; set GH_TOKEN or run E8 clones)`);
      err.code = 'GITHUB_RATE_LIMIT';
      throw err;
    }
    if (!r.ok) throw new Error(`${owner}/${repo} → HTTP ${r.status}`);
    const batch = await r.json();
    if (!Array.isArray(batch) || !batch.length) break;
    for (const c of batch) {
      rows.push({
        sha: c.sha,
        shaShort: c.sha.slice(0, 8),
        date: c.commit?.committer?.date || c.commit?.author?.date,
        message: (c.commit?.message || '').split('\n')[0].trim(),
        htmlUrl: c.html_url,
        author: c.commit?.author?.name,
        source: 'github_rest_api',
      });
    }
    if (batch.length < 100) break;
    await sleep(GH_TOKEN ? 100 : 400);
  }
  if (usedLocalFallback) return rows;
  return rows;
}

export async function fetchKingBeeWindowTelemetry() {
  const windows = [
    {
      id: 'king_bee_init',
      label: 'King Bee initialization window',
      since: '2026-05-31T00:00:00Z',
      until: '2026-06-02T00:00:00Z',
    },
    {
      id: 'pre_jspace_eval',
      label: 'Pre-J-Space public paper (35-day propagation claim)',
      since: '2026-06-01T00:00:00Z',
      until: '2026-07-07T00:00:00Z',
    },
    {
      id: 'jspace_release_week',
      label: 'Anthropic J-Space paper release week (claimed)',
      since: '2026-07-01T00:00:00Z',
      until: '2026-07-10T00:00:00Z',
    },
  ];

  const byRepo = {};
  let dataSource = 'github_rest_api';
  for (const { owner, repo, role } of CORE_REPOS) {
    const key = `${owner}/${repo}`;
    byRepo[key] = { owner, repo, role, windows: {} };
    for (const w of windows) {
      const commits = await fetchRepoCommits(owner, repo, w.since, w.until);
      if (commits[0]?.source === 'local_git_clone') dataSource = 'local_git_clone_fallback';
      byRepo[key].windows[w.id] = {
        ...w,
        commitCount: commits.length,
        commits: commits.slice(0, 50),
      };
      await sleep(200);
    }
  }
  return {
    fetchedAt: new Date().toISOString(),
    dataSource,
    cloneDir: dataSource.includes('clone') ? cloneRoot() : null,
    windows,
    byRepo,
  };
}

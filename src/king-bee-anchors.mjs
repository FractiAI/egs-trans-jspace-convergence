/** Canonical King Bee objects vendors would scrape (FractiAI public git). */
import { CORE_REPOS, KING_BEE_ANCHOR_ISO, KING_BEE_SANDBOX_ISO } from './constants.mjs';

export const KING_BEE_REPO_SLUGS = CORE_REPOS.map((r) => r.repo);

export const KING_BEE_REPO_URLS = CORE_REPOS.map(
  (r) => `https://github.com/${r.owner}/${r.repo}`,
);

/** Example anchor commits (live E1 may add more at runtime). */
export const KING_BEE_EXAMPLE_COMMITS = [
  {
    repo: 'FractiAI/psw.vibelandia.sing13',
    sha: '2f4fe23baea67da6dbac06af474ef1591454addc',
    label: 'feat(dph-gpu): King Bee papers, press release',
    date: '2026-05-31',
  },
];

export const VENDOR_INGRESS_TARGETS = [
  { id: 'anthropic', org: 'anthropics', label: 'Anthropic' },
  { id: 'openai', org: 'openai', label: 'OpenAI' },
  { id: 'google-deepmind', org: 'google-deepmind', label: 'Google DeepMind' },
  { id: 'deepseek', org: 'deepseek-ai', label: 'DeepSeek' },
];

export const VENDOR_PUBLIC_URLS = [
  {
    vendor: 'anthropic',
    url: 'https://transformer-circuits.pub/2026/workspace/',
    label: 'J-Space / global workspace paper',
  },
  {
    vendor: 'openai',
    url: 'https://openai.com/index/learning-to-reason-with-llms/',
    label: 'o-series reasoning documentation',
  },
];

export const KING_BEE_WINDOWS = {
  king_bee_init: {
    label: 'King Bee initialization window',
    since: '2026-05-31T00:00:00Z',
    until: '2026-06-02T00:00:00Z',
    anchorIso: KING_BEE_SANDBOX_ISO,
  },
  king_bee_sweep: {
    label: 'King Bee node sweep anchor',
    since: '2026-06-01T00:00:00Z',
    until: '2026-06-02T00:00:00Z',
    anchorIso: KING_BEE_ANCHOR_ISO,
  },
};

export function isKingBeeCommitMessage(message = '') {
  return /king bee|dph-gpu|node sweep|SYN-NODES|royal flush|king-bee/i.test(message);
}

export function kingBeePermalinksFromTelemetry(githubTelemetry) {
  const rows = [];
  if (!githubTelemetry?.byRepo) return rows;
  for (const [repoKey, repoData] of Object.entries(githubTelemetry.byRepo)) {
    for (const [windowId, window] of Object.entries(repoData.windows || {})) {
      const isKingBeeWindow =
        windowId === 'king_bee_init' || /king bee/i.test(window.label || '');
      for (const c of window.commits || []) {
        if (!isKingBeeWindow && !isKingBeeCommitMessage(c.message)) continue;
        rows.push({
          repo: repoKey,
          sha: c.sha,
          shaShort: c.shaShort,
          date: c.date,
          message: c.message,
          commitUrl: c.htmlUrl || `https://github.com/${repoKey}/commit/${c.sha}`,
          window: windowId,
        });
      }
    }
  }
  return rows.filter((r) => r.sha);
}

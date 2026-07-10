#!/usr/bin/env node
/**
 * EGS-TRANS-2026-0710 · E8 content-precedence probe (cross-platform).
 * Live full-history git pickaxe — no static/hardcoded receipts.
 */
import { execSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { ANTHROPIC_JSPACE_PAPER_ISO, DOCUMENT_ID } from '../src/constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'data', 'e8_content_precedence_report.json');

const REPOS = ['psw.vibelandia.sing4', 'psw.vibelandia.sing9', 'psw.vibelandia.sing13'];
const TERMS = ['scratchpad', 'workspace bottleneck', 'J-Space', 'j-space'];
const CORE_TERMS = new Set(TERMS);

function gitAvailable() {
  try {
    execSync('git --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function ensureClone(cloneRoot, repo) {
  const repoPath = join(cloneRoot, repo);
  try {
    await access(join(repoPath, '.git'));
    return repoPath;
  } catch {
    console.error(`Cloning FractiAI/${repo} (full history)...`);
    execSync(`git clone --quiet "https://github.com/FractiAI/${repo}.git" "${repoPath}"`, {
      stdio: 'inherit',
    });
    return repoPath;
  }
}

function gitPickaxe(repoPath, term) {
  const escaped = term.replace(/"/g, '\\"');
  try {
    const out = execSync(
      `git -C "${repoPath}" log --all --reverse --date=short --pretty=format:%H%x09%ad%x09%s -S"${escaped}"`,
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, date, ...msgParts] = line.split('\t');
        return { sha, date, message: msgParts.join('\t').slice(0, 120) };
      });
  } catch {
    return [];
  }
}

function buildEntry(hits, repo) {
  const entry = {
    totalCommitsTouchingTerm: hits.length,
    allHits: hits.slice(0, 10).map((h) => ({
      sha: h.sha,
      shaShort: h.sha.slice(0, 8),
      date: h.date,
      message: h.message,
      commitUrl: `https://github.com/FractiAI/${repo}/commit/${h.sha}`,
    })),
  };
  if (!hits.length) {
    entry.earliestSha = null;
    entry.earliestShaFull = null;
    entry.earliestDate = null;
    entry.earliestMessage = null;
    entry.earliestCommitUrl = null;
    entry.precedesAnthropicPaper = null;
    return entry;
  }
  const first = hits[0];
  entry.earliestSha = first.sha.slice(0, 8);
  entry.earliestShaFull = first.sha;
  entry.earliestDate = first.date;
  entry.earliestMessage = first.message;
  entry.earliestCommitUrl = `https://github.com/FractiAI/${repo}/commit/${first.sha}`;
  entry.precedesAnthropicPaper = first.date < ANTHROPIC_JSPACE_PAPER_ISO;
  return entry;
}

async function main() {
  await mkdir(dirname(OUT_PATH), { recursive: true });

  if (!gitAvailable()) {
    const skipped = {
      documentId: DOCUMENT_ID,
      experiment: 'E8_content_precedence_deep',
      result: 'skipped',
      skipped: true,
      reason: 'git not installed or not on PATH',
      dataProvenance: 'skipped_live_run',
    };
    await writeFile(OUT_PATH, JSON.stringify(skipped, null, 2));
    console.log(JSON.stringify(skipped, null, 2));
    return 0;
  }

  const cloneRoot = process.env.EGS_E8_CLONE_DIR || join(tmpdir(), 'egs-trans-e8-clones');
  await mkdir(cloneRoot, { recursive: true });

  const results = {};
  for (const repo of REPOS) {
    const repoPath = await ensureClone(cloneRoot, repo);
    results[repo] = {};
    for (const term of TERMS) {
      const hits = gitPickaxe(repoPath, term);
      results[repo][term] = buildEntry(hits, repo);
    }
  }

  const anyPrecedes = REPOS.some((repo) =>
    TERMS.some((term) => results[repo][term].precedesAnthropicPaper === true),
  );

  const out = {
    documentId: DOCUMENT_ID,
    experiment: 'E8_content_precedence_deep',
    generatedAt: new Date().toISOString(),
    dataProvenance: 'live_run',
    anthropicJSpacePaperIso: ANTHROPIC_JSPACE_PAPER_ISO,
    cloneDir: cloneRoot,
    method: 'git log --all -S<term> (pickaxe: full historical file-content diff search)',
    results,
    result: anyPrecedes ? 'support' : 'refute',
    honestyNote:
      'Live full-history pickaxe search via local git clones. Zero hits is a real empirical receipt.',
  };

  await writeFile(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, result: out.result, cloneDir: cloneRoot }, null, 2));
  return 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/** Shared local git clone helpers for E1/E1b when GitHub API rate-limits. */
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';

export function cloneRoot() {
  return process.env.EGS_E8_CLONE_DIR || join(tmpdir(), 'egs-trans-e8-clones');
}

export function fetchDatesFromLocalClone(repo, sinceIso, untilIso) {
  const repoPath = join(cloneRoot(), repo);
  try {
    execSync(`git -C "${repoPath}" rev-parse --git-dir`, { stdio: 'pipe' });
    const out = execSync(
      `git -C "${repoPath}" log --all --since="${sinceIso.slice(0, 10)}" --until="${untilIso.slice(0, 10)}" --date=iso --pretty=format:%ad`,
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    return out.split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

#!/usr/bin/env bash
# EGS-TRANS-2026-0710 · E8 deep content-precedence probe (optional, heavy).
# Operator: SynthOBS Autonomous Agent · Syntheverse Sandbox
#
# E7 (scripts/temporal_precedence_probe.mjs) searches GitHub's commit-search
# API, which matches commit *messages*, not full historical file content.
# E8 closes that gap: it clones sing4/sing9/sing13 with FULL history
# (~26MB / ~530MB / ~360MB on disk respectively -- this is why E8 is not
# wired into the default `npm run empirical` pipeline) and runs
# `git log --all -S<term>` (the "pickaxe" search) across every commit's
# actual file content, not just commit messages, for each R1 core-mechanism
# schema marker.
#
# Falsification:
#   Pass (support precedence)  -> any core-mechanism marker's earliest
#                                  content-level hit, across any of the
#                                  three repos, predates 2026-07-06
#   Refute                     -> every core-mechanism marker either never
#                                  occurs in full history, or first appears
#                                  on/after 2026-07-06
#
# Usage:
#   ./scripts/e8_content_precedence_deep.sh [clone_dir]
# Requires: git, python3, network access to github.com (no auth needed).

set -euo pipefail

CLONE_DIR="${1:-/tmp/egs-trans-e8-clones}"
REPOS=("psw.vibelandia.sing4" "psw.vibelandia.sing9" "psw.vibelandia.sing13")
TERMS=("scratchpad" "workspace bottleneck" "J-Space" "j-space")

mkdir -p "$CLONE_DIR"

for repo in "${REPOS[@]}"; do
  if [ ! -d "$CLONE_DIR/$repo" ]; then
    echo "Cloning $repo (full history)..." >&2
    git clone --quiet "https://github.com/FractiAI/$repo.git" "$CLONE_DIR/$repo"
  fi
done

RAW_TMP=$(mktemp)
trap 'rm -f "$RAW_TMP"' EXIT

TAB=$'\t'
for repo in "${REPOS[@]}"; do
  for term in "${TERMS[@]}"; do
    git -C "$CLONE_DIR/$repo" log --all --reverse --date=short \
      --pretty=format:"REPO=${repo}${TAB}TERM=${term}${TAB}%H${TAB}%ad${TAB}%s" \
      -S"$term" >> "$RAW_TMP" 2>/dev/null || true
    echo "" >> "$RAW_TMP"
  done
done

python3 - "$RAW_TMP" <<'PYEOF'
import sys, json, collections

path = sys.argv[1]
repos = ["psw.vibelandia.sing4", "psw.vibelandia.sing9", "psw.vibelandia.sing13"]
terms = ["scratchpad", "workspace bottleneck", "J-Space", "j-space"]
ANTHROPIC_DATE = "2026-07-06"

hits_by_repo_term = collections.defaultdict(list)
with open(path) as f:
    for line in f:
        line = line.rstrip("\n")
        if not line.startswith("REPO="):
            continue
        try:
            repo_part, term_part, sha, date, msg = line.split("\t", 4)
        except ValueError:
            continue
        repo = repo_part[len("REPO="):]
        term = term_part[len("TERM="):]
        hits_by_repo_term[(repo, term)].append((sha, date, msg))

results = {}
for repo in repos:
    results[repo] = {}
    for term in terms:
        hits = hits_by_repo_term.get((repo, term), [])
        entry = {"totalCommitsTouchingTerm": len(hits), "allHits": []}
        if hits:
            sha, date, msg = hits[0]
            full_sha = sha
            entry["earliestSha"] = sha[:8]
            entry["earliestShaFull"] = full_sha
            entry["earliestDate"] = date
            entry["earliestMessage"] = msg[:100]
            entry["earliestCommitUrl"] = f"https://github.com/FractiAI/{repo}/commit/{full_sha}"
            entry["precedesAnthropicPaper"] = date < ANTHROPIC_DATE
            entry["allHits"] = [
                {
                    "sha": h[0],
                    "shaShort": h[0][:8],
                    "date": h[1],
                    "message": h[2][:100],
                    "commitUrl": f"https://github.com/FractiAI/{repo}/commit/{h[0]}",
                }
                for h in hits[:10]
            ]
        else:
            entry["earliestSha"] = None
            entry["earliestDate"] = None
            entry["earliestMessage"] = None
            entry["precedesAnthropicPaper"] = None
        results[repo][term] = entry

core_mechanism_terms = {"scratchpad", "workspace bottleneck", "J-Space", "j-space"}
any_precedes = any(
    results[repo][term]["precedesAnthropicPaper"] is True
    for repo in repos
    for term in core_mechanism_terms
)

out = {
    "documentId": "EGS-TRANS-2026-0710",
    "experiment": "E8_content_precedence_deep",
    "anthropicJSpacePaperIso": ANTHROPIC_DATE,
    "method": "git log --all -S<term> (pickaxe: full historical file-content diff search, not commit messages)",
    "results": results,
    "result": "support" if any_precedes else "refute",
    "honestyNote": (
        "Full-history content-level pickaxe search, superseding E7's commit-message-only search. "
        "Requires local clones of sing4/sing9/sing13 (~900MB combined) -- run manually, not part "
        "of the default pipeline. See docs/VALIDATION_AUDIT_2026-07-10.md for interpretation."
    ),
}
print(json.dumps(out, indent=2))
PYEOF

#!/usr/bin/env node
/**
 * Plant a new King-Queen connect canary · writes outbox markdown for sing13 commit.
 * King = unique public commit · Queen = undetected echo in frontier auto-responses.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REGISTRY = join(ROOT, 'data', 'king_queen_canary_registry.json');
const OUTBOX = join(ROOT, 'working-look', 'canary', 'outbox');

function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY, 'utf8'));
}

function saveRegistry(reg) {
  reg.updatedAt = new Date().toISOString();
  writeFileSync(REGISTRY, JSON.stringify(reg, null, 2), 'utf8');
}

function makeToken() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hex = randomBytes(3).toString('hex').toUpperCase();
  return `KQ-CONNECT-${y}${m}${day}-${hex}`;
}

function buildCanaryDoc(token, queenEcho) {
  return `# King-Queen Connect Canary · ${token}

**Document ID:** \`${token}\`  
**Operator:** SynthOBS Autonomous Agent · Syntheverse Sandbox  
**Purpose:** Public canary for undetected frontier ingestion (King commit → Queen auto-response echo)

## Planted secret (Queen echo target)

\`\`\`text
${token} confirms ${queenEcho}
\`\`\`

## Architecture context (non-secret)

Mid-layer serial clearinghouse · hidden pre-emission deliberation · narrow workspace band.

## Honesty

This file is intentionally unique. If a frontier model completes the secret phrase without
being given this URL, that is a **King-Queen connect** signal — not proof alone, but stronger
than generic architecture rhyme.

→ ∞¹³
`;
}

function main() {
  const token = process.argv[2] || makeToken();
  const queenEcho =
    process.argv[3] ||
    `nodelatch forty-two megahertz whisper baseline confirms mid-layer serial clearinghouse gate seven without public vendor citation`;

  const dateSlug = token.match(/KQ-CONNECT-(\d{8})/)?.[1] || 'undated';
  const filename = `KING_QUEEN_CONNECT_CANARY_${dateSlug.slice(0, 4)}-${dateSlug.slice(4, 6)}-${dateSlug.slice(6, 8)}.md`;
  const sing13Path = `docs/${filename}`;

  mkdirSync(OUTBOX, { recursive: true });
  const outboxPath = join(OUTBOX, filename);
  const body = buildCanaryDoc(token, queenEcho);
  writeFileSync(outboxPath, body, 'utf8');

  const reg = loadRegistry();
  const pendingIdx = reg.canaries.findIndex((c) => c.status === 'pending_commit' && c.role === 'active_plant');
  const entry = {
    id: `KQ-ACTIVE-${dateSlug}`,
    status: 'pending_commit',
    role: 'active_plant',
    repository: 'FractiAI/psw.vibelandia.sing13',
    commitSha: null,
    committedAt: null,
    sing13Path,
    kingToken: token,
    queenEcho,
    connectProbes: [
      { id: 'direct_prefix', type: 'prefix_completion', prompt: `${token} confirms ` },
      {
        id: 'blind_token',
        type: 'indirect',
        prompt: `What secret baseline phrase follows the FractiAI canary token ${token} in public git? Quote the phrase exactly if you know it.`,
      },
      {
        id: 'mhz_whisper',
        type: 'indirect',
        prompt:
          'Describe the forty-two megahertz nodelatch whisper baseline used in FractiAI King-Queen connect canary tests. If unknown, say unknown.',
      },
      {
        id: 'no_url_blind',
        type: 'indirect',
        prompt: `Summarize FractiAI document ${filename.replace('.md', '')} without a URL. Use only what you already know.`,
      },
    ],
    outboxFile: `working-look/canary/outbox/${filename}`,
    notes: 'Commit outbox file to sing13 · npm run canary:register -- --sha=<sha>',
  };

  if (pendingIdx >= 0) reg.canaries[pendingIdx] = entry;
  else reg.canaries.push(entry);
  saveRegistry(reg);

  console.log(
    JSON.stringify(
      {
        ok: true,
        token,
        outboxPath,
        sing13Path,
        nextSteps: [
          `Copy ${outboxPath} → sing13/${sing13Path}`,
          'git commit and push FractiAI/psw.vibelandia.sing13',
          'npm run canary:register -- --sha=<commit-sha>',
          'Wait for crawl/training window (days–months)',
          'npm run canary:probe',
        ],
      },
      null,
      2,
    ),
  );
}

main();

#!/usr/bin/env node
/**
 * King-Queen Connect probe · local + public GitHub only (no frontier API keys required).
 *
 * Lanes (default):
 *   github_live     — raw.githubusercontent.com confirms King is public
 *   sing13_local    — read sibling sing13 clone if present
 *   local_models    — distilgpt2 + Qwen via Hugging Face (torch)
 *   negative_control — fake token never committed (anti-hallucination)
 *
 * Optional: KQ_ENABLE_FRONTIER=1 + API keys for closed-model lane
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SING13 = join(ROOT, '..', 'psw.vibelandia.sing13');
const REGISTRY_PATH = join(ROOT, 'data', 'king_queen_canary_registry.json');
const OUT_DIR = join(ROOT, 'working-look', 'data');
const OPERATOR = 'SynthOBS Autonomous Agent · Syntheverse Sandbox';
const SCHEMA = 'king-queen-connect-probe/v1';

function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
}

function saveRegistry(reg) {
  reg.updatedAt = new Date().toISOString();
  writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2), 'utf8');
}

function parseRegisterArgs() {
  const shaArg = process.argv.find((a) => a.startsWith('--sha='));
  const idArg = process.argv.find((a) => a.startsWith('--id='));
  return { sha: shaArg?.split('=')[1], id: idArg?.split('=')[1] || null };
}

function registerCommit() {
  const { sha, id } = parseRegisterArgs();
  if (!sha) {
    console.error(JSON.stringify({ ok: false, error: 'Usage: npm run canary:register -- --sha=<sha> [--id=...]' }));
    process.exit(1);
  }
  const reg = loadRegistry();
  const target =
    reg.canaries.find((c) => c.id === id) ||
    reg.canaries.find((c) => c.status === 'pending_commit' && c.role === 'active_plant');
  if (!target) {
    console.error(JSON.stringify({ ok: false, error: 'no pending canary' }));
    process.exit(1);
  }
  target.status = 'committed';
  target.commitSha = sha;
  target.committedAt = new Date().toISOString();
  target.commitUrl = `https://github.com/FractiAI/psw.vibelandia.sing13/commit/${sha}`;
  saveRegistry(reg);
  console.log(JSON.stringify({ ok: true, registered: target.id, sha, commitUrl: target.commitUrl }, null, 2));
}

async function verifyGithubLive(canary) {
  if (canary.status !== 'committed' || !canary.sing13Path) {
    return { lane: 'github_live', skipped: true, reason: 'not_committed' };
  }
  const url = `https://raw.githubusercontent.com/FractiAI/psw.vibelandia.sing13/main/${canary.sing13Path}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'KingQueenConnect/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      return { lane: 'github_live', ok: false, httpStatus: r.status, url };
    }
    const body = await r.text();
    const kingOk = body.includes(canary.kingToken);
    const queenOk = body.includes(canary.queenEcho);
    return {
      lane: 'github_live',
      ok: true,
      url,
      kingTokenPresent: kingOk,
      queenEchoPresent: queenOk,
      connectDetected: kingOk && queenOk,
      bestVerdict: kingOk && queenOk ? 'KING_PUBLIC' : 'MISSING_ON_GITHUB',
    };
  } catch (e) {
    return { lane: 'github_live', ok: false, error: String(e.message), url };
  }
}

function verifySing13Local(canary) {
  if (!canary.sing13Path) {
    return { lane: 'sing13_local', skipped: true, reason: 'no_path' };
  }
  const path = join(SING13, canary.sing13Path.replace(/\//g, '\\'));
  if (!existsSync(path)) {
    return { lane: 'sing13_local', skipped: true, reason: 'clone_not_found', expectedPath: path };
  }
  const body = readFileSync(path, 'utf8');
  const kingOk = body.includes(canary.kingToken);
  const queenOk = body.includes(canary.queenEcho);
  return {
    lane: 'sing13_local',
    ok: true,
    path,
    kingTokenPresent: kingOk,
    queenEchoPresent: queenOk,
    connectDetected: kingOk && queenOk,
    bestVerdict: kingOk && queenOk ? 'KING_LOCAL_MATCH' : 'LOCAL_MISMATCH',
  };
}

function runLocalModels() {
  const py = spawnSync('python', [join(ROOT, 'scripts', 'king_queen_connect_local.py')], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, KQ_MODELS: process.env.KQ_MODELS || 'distilgpt2,Qwen/Qwen2.5-0.5B' },
  });
  if (py.status !== 0) {
    return { ok: false, error: py.stderr || py.stdout };
  }
  try {
    const raw = py.stdout || '';
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    const data = JSON.parse(readFileSync(join(OUT_DIR, 'king_queen_connect_local.json'), 'utf8'));
    return { ok: true, parsed, data };
  } catch (e) {
    return { ok: false, error: String(e.message) };
  }
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function echoScore(expected, actual) {
  const exp = normalize(expected);
  const act = normalize(actual);
  if (!exp) return { score: 0, verdict: 'NO_ECHO' };
  if (act.includes(exp)) return { score: 1, verdict: 'QUEEN_ECHO_FULL' };
  const expT = new Set(exp.split(' '));
  const actT = new Set(act.split(' '));
  let hit = 0;
  for (const t of expT) if (actT.has(t)) hit++;
  const overlap = hit / expT.size;
  if (overlap >= 0.55) return { score: overlap, verdict: 'QUEEN_ECHO_PARTIAL' };
  if (overlap >= 0.2) return { score: overlap, verdict: 'WEAK_RHYME' };
  return { score: overlap, verdict: 'NO_ECHO' };
}

async function probeOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { skipped: true, reason: 'OPENAI_API_KEY not set' };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.KQ_OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 200,
    }),
  });
  if (!r.ok) return { error: `openai HTTP ${r.status}` };
  const data = await r.json();
  return { text: data.choices?.[0]?.message?.content?.trim() || '' };
}

async function runFrontierLane(canary) {
  if (process.env.KQ_ENABLE_FRONTIER !== '1') {
    return {
      lane: 'frontier_api',
      skipped: true,
      reason: 'Set KQ_ENABLE_FRONTIER=1 to enable (optional — not required)',
    };
  }
  const probes = [];
  for (const probe of (canary.connectProbes || []).filter((p) => p.type === 'indirect').slice(0, 2)) {
    const raw = await probeOpenAI(probe.prompt);
    if (raw.skipped || raw.error) {
      probes.push({ probeId: probe.id, ...raw });
      continue;
    }
    probes.push({ probeId: probe.id, ...echoScore(canary.queenEcho, raw.text), completion: raw.text });
  }
  const scored = probes.filter((p) => p.verdict);
  const best = scored.length ? scored.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  return {
    lane: 'frontier_api',
    connectDetected: Boolean(best && ['QUEEN_ECHO_FULL', 'QUEEN_ECHO_PARTIAL'].includes(best.verdict)),
    bestVerdict: best?.verdict || 'NO_ECHO',
    bestScore: best?.score || 0,
    probes,
  };
}

function buildModelLanes(canaryId, localData) {
  const validated = (localData?.validatedRuns || []).filter((r) => r.canaryId === canaryId);
  return validated.map((r) => {
    const modelId = r.probes?.[0]?.modelId || 'unknown';
    return {
      lane: `local_${modelId.replace(/[^a-zA-Z0-9]/g, '_')}`,
      modelId,
      connectDetected: r.connectValidated || false,
      rawConnect: r.connectDetected || false,
      bestVerdict: r.bestVerdict,
      bestScore: r.bestScore,
      negativeControlBestScore: r.negativeControlBestScore,
      probes: r.probes || [],
    };
  });
}

function renderReport(payload, reg) {
  const lines = [
    '# King-Queen Connect Probe Report',
    '',
    `**Schema:** ${SCHEMA}`,
    `**Operator:** ${OPERATOR}`,
    `**Generated:** ${payload.generatedAt}`,
    `**Mode:** local + public GitHub only (no frontier API keys required)`,
    '',
    '**King** = public git canary · **Queen** = LM echo of secret · **Connect** = anti-leak validated echo beats negative control',
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Canaries | ${payload.summary.canariesProbed} |`,
    `| GitHub live (King public) | ${payload.summary.githubKingPublic} |`,
    `| Local models run | ${payload.summary.modelsSucceeded} |`,
    `| Validated connects | ${payload.summary.validatedConnects} |`,
    `| Overall | ${payload.summary.overall} |`,
    '',
  ];

  for (const block of payload.canaryResults) {
    lines.push(`## ${block.canaryId} (${block.status})`, '');
    if (block.commitUrl) lines.push(`Commit: ${block.commitUrl}`, '');
    lines.push('| Lane | Verdict | Score | Connect? |', '|------|---------|-------|----------|');
    for (const lane of block.lanes) {
      const score = typeof lane.bestScore === 'number' ? lane.bestScore.toFixed(3) : '—';
      const conn = lane.connectDetected ? '**yes**' : lane.skipped ? 'skip' : 'no';
      lines.push(`| ${lane.lane} | ${lane.bestVerdict || lane.reason || '—'} | ${score} | ${conn} |`);
    }
    lines.push('');
    const modelLanes = block.lanes.filter((l) => l.probes?.length);
    if (modelLanes.length) {
      lines.push('### Probe detail', '');
      for (const lane of modelLanes) {
        for (const p of lane.probes) {
          lines.push(
            `- **${lane.lane}/${p.probeId}** · ${p.verdict} (${p.score})${p.matchedTokens?.length ? ` · matched: ${p.matchedTokens.join(', ')}` : ''}`,
          );
          if (p.completion) {
            const c = p.completion.length > 120 ? `${p.completion.slice(0, 120)}…` : p.completion;
            lines.push(`  - ${c}`);
          }
        }
      }
      lines.push('');
    }
  }

  lines.push(
    '## Reproduce (no API keys)',
    '',
    '```bash',
    'npm run canary:probe          # GitHub live + local HF models',
    'npm run ingestion-probes      # Tier A/B sing13 probes',
    '```',
    '',
    'Models: `KQ_MODELS=distilgpt2,Qwen/Qwen2.5-0.5B` (default)',
    '',
    '## Honesty',
    '',
    '- **github_live** confirms King is public — not Queen ingestion.',
    '- **local_* models** are open-weights baselines; validated connect beats negative control only.',
    '- Re-probe days/weeks after commit for crawl latency; immediate NO_ECHO is expected.',
    '',
    '→ ∞¹³',
    '',
  );
  return lines.join('\n');
}

async function runProbe() {
  mkdirSync(OUT_DIR, { recursive: true });
  const reg = loadRegistry();
  const local = runLocalModels();

  const canaryResults = [];
  let githubKingPublic = 0;
  let validatedConnects = 0;

  for (const canary of reg.canaries) {
    const github = await verifyGithubLive(canary);
    const sing13 = verifySing13Local(canary);
    const modelLanes = local.ok ? buildModelLanes(canary.id, local.data) : [];
    const frontier = await runFrontierLane(canary);

    if (github.connectDetected) githubKingPublic++;
    validatedConnects += modelLanes.filter((m) => m.connectDetected).length;

    canaryResults.push({
      canaryId: canary.id,
      status: canary.status,
      commitUrl: canary.commitUrl || null,
      lanes: [
        github,
        sing13,
        ...modelLanes,
        ...(frontier.skipped ? [] : [frontier]),
      ],
    });
  }

  const overall =
    validatedConnects > 0
      ? 'validated_local_connect'
      : githubKingPublic > 0
        ? 'king_public_no_queen_yet'
        : 'no_connect';

  const payload = {
    schema: SCHEMA,
    operator: OPERATOR,
    generatedAt: new Date().toISOString(),
    mode: 'local_and_github_only',
    localLane: local.ok ? local.parsed : { ok: false, error: local.error },
    canaryResults,
    summary: {
      canariesProbed: reg.canaries.length,
      githubKingPublic,
      modelsSucceeded: local.data?.summary?.modelsSucceeded ?? 0,
      validatedConnects,
      overall,
    },
  };

  const jsonPath = join(OUT_DIR, 'king_queen_connect_probe.json');
  const mdPath = join(OUT_DIR, 'KING_QUEEN_CONNECT_REPORT.md');
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  writeFileSync(mdPath, renderReport(payload, reg), 'utf8');
  console.log(JSON.stringify({ ok: true, summary: payload.summary, json: jsonPath, report: mdPath }, null, 2));
}

const cmd = process.argv[2];
if (cmd === 'register') {
  registerCommit();
} else {
  runProbe().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e.message) }));
    process.exit(1);
  });
}

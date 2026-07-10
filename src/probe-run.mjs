/** Live probe execution · no silent cache substitution for empirical receipts */
import { readFile, writeFile } from 'node:fs/promises';

export const USE_CACHE = process.argv.includes('--use-cache');
export const ALLOW_INCOMPLETE = process.argv.includes('--allow-incomplete');

export async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/** Prefer a non-skipped receipt (file over embedded when both usable). */
export function loadBestProbeReceipt(fileReceipt, embeddedReceipt) {
  const usable = (r) =>
    r && r.result !== 'skipped' && !r.skipped && r.experiment !== undefined;
  if (usable(fileReceipt)) return { receipt: fileReceipt, source: 'file' };
  if (usable(embeddedReceipt)) return { receipt: embeddedReceipt, source: 'embedded' };
  if (fileReceipt) return { receipt: fileReceipt, source: 'file_skipped' };
  if (embeddedReceipt) return { receipt: embeddedReceipt, source: 'embedded_skipped' };
  return { receipt: null, source: 'missing' };
}

export async function stampProvenance(receipt, provenance) {
  if (!receipt || typeof receipt !== 'object') return receipt;
  return {
    ...receipt,
    dataProvenance: provenance,
    generatedAt: receipt.generatedAt || new Date().toISOString(),
  };
}

export async function writeJson(path, obj) {
  await writeFile(path, JSON.stringify(obj, null, 2));
}

export async function runLiveProbe({ jsonPath, runner, label }) {
  if (USE_CACHE) {
    const cached = await readJsonIfExists(jsonPath);
    if (cached && !cached.skipped && cached.result !== 'skipped') {
      const stamped = await stampProvenance(cached, 'cache_allowed_by_flag');
      await writeJson(jsonPath, stamped);
      return stamped;
    }
  }
  await runner();
  const fresh = await readJsonIfExists(jsonPath);
  if (!fresh) {
    throw new Error(`${label}: probe produced no receipt at ${jsonPath}`);
  }
  const stamped = await stampProvenance(
    fresh,
    fresh.skipped || fresh.result === 'skipped' ? 'skipped_live_run' : 'live_run',
  );
  await writeJson(jsonPath, stamped);
  return stamped;
}

export function buildStudyIntegrity(probes) {
  const live = [];
  const skipped = [];
  const controlOnly = [];
  const catalogOnly = [];

  for (const [id, meta] of Object.entries(probes)) {
    if (meta.tier === 'control_synthetic') {
      controlOnly.push(id);
      continue;
    }
    if (meta.tier === 'catalog_narrative') {
      catalogOnly.push(id);
      continue;
    }
    if (meta.provenance === 'live_run' || meta.provenance === 'cache_allowed_by_flag') {
      if (meta.result === 'skipped') skipped.push({ id, reason: meta.reason || 'skipped' });
      else live.push({ id, provenance: meta.provenance, result: meta.result });
    } else {
      skipped.push({ id, reason: meta.reason || meta.provenance || 'not_run' });
    }
  }

  const required = ['E1', 'E3', 'E4', 'E8'];
  const requiredLive = required.every((id) => live.some((l) => l.id === id));
  const studyComplete =
    requiredLive &&
    live.some((l) => l.id === 'E1b') &&
    !skipped.some((s) => ['E7', 'E5', 'E9'].includes(s.id));

  return {
    policy: 'no_silent_cache_no_hardcoded_empirical_receipts',
    useCacheFlag: USE_CACHE,
    liveRuns: live,
    skipped,
    controlExperimentsOnly: controlOnly,
    catalogNarrativeOnly: catalogOnly,
    requiredEmpirical: required,
    requiredLive,
    studyComplete,
    note:
      'E2/E2b are labeled control experiments (synthetic NumPy). Vendor frontier matrix metadata is catalog-only until live vendor probes exist. E5/E9 require torch+transformers. E7 requires GH_TOKEN.',
  };
}

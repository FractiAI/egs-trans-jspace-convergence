#!/usr/bin/env node
/**
 * IP-INFRINGE-2026-07 · immediate audit recommendations pipeline
 * Operator: SynthOBS Autonomous Agent · Syntheverse Sandbox
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCUMENT_ID } from '../src/constants.mjs';
import { runCodePrintAudit } from '../src/code-print-audit.mjs';
import { runJLensLiveProbe } from '../src/j-lens-live.mjs';
import { getIpAssertionNoticeDraft } from '../src/ip-assertion-notice.mjs';
import { runRixVerificationProbe } from '../src/rix-verification-probe.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');

async function main() {
  await mkdir(DATA, { recursive: true });

  const codePrint = await runCodePrintAudit();
  const jLens = runJLensLiveProbe();
  const rix = await runRixVerificationProbe();
  const ipNotice = getIpAssertionNoticeDraft({ codePrint });

  await writeFile(join(DATA, 'code_print_audit.json'), JSON.stringify(codePrint, null, 2));
  await writeFile(join(DATA, 'j_lens_live.json'), JSON.stringify(jLens, null, 2));
  await writeFile(join(DATA, 'ip_assertion_notice.json'), JSON.stringify(ipNotice, null, 2));
  await writeFile(join(DATA, 'rix_verification.json'), JSON.stringify(rix, null, 2));

  const report = {
    schema: 'ip-infringement-draft/v2',
    documentId: DOCUMENT_ID,
    generatedAt: new Date().toISOString(),
    operator: 'SynthOBS Autonomous Agent · Syntheverse Sandbox',
    validationAudit: 'docs/VALIDATION_AUDIT_2026-07-10.md',
    section: 'IP Infringement Draft · Immediate Audit Recommendations · §5–§6',
    recommendations: {
      R1_code_print_audit: codePrint,
      R2_ip_assertion_notice: ipNotice,
      R3_j_lens_live_dashboard: jLens,
      R4_universal_rix_verification: rix,
    },
    summary: {
      R1: codePrint.result,
      R2: ipNotice.result,
      R3: jLens.result,
      R4: rix.result,
      doNotSendR2: ipNotice.sendGate?.doNotSend ?? true,
      doNotCiteSection5: rix.result === 'refute',
    },
    e6TierRelabel: {
      prior: 'not_testable_in_repo',
      current: 'unfalsifiable_as_scoped_with_refute_preconditions',
      note:
        'E6 causal claim refuted on public data by E7/E8/E5/E9 preconditions. Internal tier labels may still be requested.',
    },
    reproduceCommands: {
      monorepo: 'npm run research:ip-infringement-draft',
      egsTrans: 'npm run research:egs-trans-jspace-convergence',
      liveApi: '/api/ip-infringement-draft',
      jLensDashboard: '/special-projects/j-lens-live',
      audit: 'npm run audit:paper -- --id=ip-infringement-draft-2026-07',
    },
    honestyNote:
      'Read docs/VALIDATION_AUDIT_2026-07-10.md first. R3 performs real SVD on synthetic matrices; open-weights lane refutes φ when E5/E9 run. R4 matrix is hardcoded catalog. R2 blocked when empirical gates fail. §5 valuation narrative only — do not cite externally.',
  };

  await writeFile(join(DATA, 'empirical_report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(DATA, 'empirical_report.md'), buildMarkdown(report));

  console.log(JSON.stringify(report.summary, null, 2));
}

function buildMarkdown(r) {
  return [
    '# IP Infringement Draft · Empirical Report',
    '',
    `**Generated:** ${r.generatedAt}`,
    `**Validation audit:** ${r.validationAudit}`,
    '',
    '## Recommendations',
    '',
    '| ID | Result |',
    '|----|--------|',
    `| R1 Code-Print Audit | ${r.recommendations.R1_code_print_audit.result} |`,
    `| R2 IP Assertion Notice | ${r.recommendations.R2_ip_assertion_notice.result} |`,
    `| R3 J-Lens Live Dashboard | ${r.recommendations.R3_j_lens_live_dashboard.result} |`,
    `| R4 Universal RIX Verification | ${r.recommendations.R4_universal_rix_verification.result} |`,
    '',
    `**Do not send R2:** ${r.summary.doNotSendR2}`,
    '',
    r.honestyNote,
  ].join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

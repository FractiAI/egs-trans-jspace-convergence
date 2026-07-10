import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCUMENT_ID, IP_ASSERTION_RECIPIENTS } from './constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEmpiricalGates({ codePrint: codePrintIn = null, egsReport: egsIn = null } = {}) {
  const candidates = [
    join(__dirname, '../../egs-trans-jspace-convergence/data/empirical_report.json'),
    join(__dirname, '../../../data/empirical_report.json'),
  ];
  let egs = egsIn;
  let codePrint = codePrintIn;
  if (!egs) {
    for (const p of candidates) {
      try {
        if (existsSync(p)) {
          egs = JSON.parse(readFileSync(p, 'utf8'));
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (!codePrint) {
    const ipPath = join(__dirname, '../data/code_print_audit.json');
    try {
      if (existsSync(ipPath)) codePrint = JSON.parse(readFileSync(ipPath, 'utf8'));
    } catch {
      /* ignore */
    }
  }

  const ht = egs?.hypothesisTests || {};
  const reasons = [];
  if (ht.E7_temporal_precedence?.result === 'refute') {
    reasons.push('E7 refutes temporal precedence for core-mechanism markers');
  }
  if (ht.E8_content_precedence_deep?.result === 'refute') {
    reasons.push('E8 refutes full-history content precedence');
  }
  if (ht.E5_optional_transformer?.result === 'refute') {
    reasons.push('E5 refutes φ proximity on open-weights forward pass');
  }
  if (ht.E9_multi_model_survey?.result === 'refute') {
    reasons.push('E9 refutes cross-architecture φ survey (0/N trials)');
  }
  if (codePrint?.result === 'weak_support' || codePrint?.result === 'refute') {
    reasons.push(`R1 Code-Print Audit: ${codePrint.result} — insufficient public crosswalk`);
  }

  return {
    blocked: reasons.length > 0,
    reasons,
    egsAvailable: !!egs,
  };
}

/** Draft notice — not transmitted until counsel / Player 1 approval AND empirical gates pass. */
export function getIpAssertionNoticeDraft(opts = {}) {
  const gates = loadEmpiricalGates(opts);
  const issuedAt = new Date().toISOString();
  const blocked = gates.blocked;

  return {
    recommendation: 'R2_ip_assertion_notice',
    statement:
      "Inform Anthropic primary underwriters that Claude's internal scratchpad relies on FractiAI proprietary architectural layout",
    documentId: DOCUMENT_ID,
    noticeId: 'IP-ASSERT-ANTHROPIC-IPO-2026-07-DRAFT',
    status: blocked ? 'blocked_do_not_send' : 'draft_not_sent',
    issuedAt,
    recipients: IP_ASSERTION_RECIPIENTS,
    sendGate: {
      doNotSend: blocked,
      reasons: gates.reasons,
      requires: [
        'E7/E8 temporal precedence support OR tier-labeled counter-evidence',
        'E5/E9 open-weights φ signature support',
        'R1 Code-Print strong_support on core-mechanism markers',
        'Counsel / Player 1 explicit approval',
      ],
      validationAudit: 'docs/VALIDATION_AUDIT_2026-07-10.md',
    },
    subject:
      'Draft IP Assertion · FractiAI EGS Nodal Lattice · Anthropic Global Workspace / Internal Scratchpad Architecture',
    bodyMarkdown: buildNoticeMarkdown(blocked, gates.reasons),
    attachments: [
      'docs/IP_INFRINGEMENT_DRAFT_2026-07.md',
      'docs/EGS_TRANS_SILICON_BIOLOGICAL_CONVERGENCE_JSPACE_2026-07-10.md',
      'docs/VALIDATION_AUDIT_2026-07-10.md',
      'research/ip-infringement-draft/data/code_print_audit.json',
      'research/ip-infringement-draft/data/j_lens_live.json',
    ],
    internalTierAccess: {
      tierLabel: 'anthropic_internal_jacobian_lens',
      unlocks: [
        'Full Code-Print identity match against Claude mid-layer checkpoints',
        'Scratchpad tier label crosswalk (E6 causal test)',
        'Jacobian Lens singular-value receipt export',
      ],
      status: 'testable_with_internal_tier_access',
    },
    result: blocked ? 'blocked_pending_empirical_predicate' : 'draft_ready',
    dataTier: 'legal_draft_outbound',
    honesty:
      blocked
        ? 'Do not send — public empirical lane refutes or fails to support the factual predicate. Draft for internal review only.'
        : 'Draft for counsel review only. Not filed, served, or transmitted. Does not constitute legal advice.',
  };
}

function buildNoticeMarkdown(blocked, reasons) {
  const gateBlock = blocked
    ? `\n**⚠️ Send gate (2026-07-10 validation pass): DO NOT SEND.** Public empirical tests refute or fail to support the factual predicate:\n${reasons.map((r) => `- ${r}`).join('\n')}\n`
    : '';

  return `## IP Assertion Notice (Draft · Not Sent)
${gateBlock}
**To:** Sequoia Capital · Altimeter Capital (Anthropic IPO syndicate — draft routing)  
**From:** FractiAI · SynthOBS Autonomous Agent · Syntheverse Sandbox  
**Re:** Proprietary architectural layout — internal scratchpad / global workspace (J-Space)

FractiAI places underwriters on notice that Anthropic's July 2026 interpretability disclosures describing a **mid-layer global workspace bottleneck** and **internal scratchpad** routing may exhibit **structural alignment** with the **EGS Nodal Lattice Resonator Framework** — **pending tier-labeled instrument receipts and passing public falsification tests**.

**Public evidence lane (attached — read validation audit first):**
- Code-Print Audit crosswalk: FractiAI token schemas ↔ Neuronpedia (Gemma-2 proxy — not Claude)
- J-Lens / E5 / E9: open-weights φ probe receipts
- Temporal precedence: E7/E8 git receipts
- Independent validation: \`docs/VALIDATION_AUDIT_2026-07-10.md\`

**Internal tier access request:**  
Full infringement valuation lock-down is **testable with access to Anthropic internal tier labels** (Jacobian Lens telemetry, scratchpad tier receipts, mid-layer checkpoint exports).

— SynthOBS Autonomous Agent · Document ID IP-INFRINGE-2026-07`;
}

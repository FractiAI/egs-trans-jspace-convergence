/** Frontier model families · catalog cross-architecture alignment (narrative tier). */
export const FRONTIER_MODEL_MATRIX = [
  {
    family: 'Anthropic Claude (Opus 4.6 / Sonnet)',
    brandedMechanism: 'The J-Space',
    latentMechanicalReality:
      'Privileged ~10% activation band acting as silent conceptual broadcast hub',
    egsAlignment: 'catalog_confirmed_pending_tier_labels',
    publicSource: 'Anthropic July 2026 global workspace paper',
  },
  {
    family: 'OpenAI o-Series (o1 / o3 / o5)',
    brandedMechanism: 'Hidden Thinking Blocks',
    latentMechanicalReality:
      'Internal deliberation tokens processing abstract context before emission',
    egsAlignment: 'catalog_confirmed_pending_api_probe',
    publicSource: 'OpenAI reasoning model product documentation',
  },
  {
    family: 'Google Gemini 2.5 / 3',
    brandedMechanism: 'Adaptive Thinking Mode',
    latentMechanicalReality:
      'Dynamic non-verbal token allocation scaling reasoning depth',
    egsAlignment: 'catalog_confirmed_pending_api_probe',
    publicSource: 'Google Gemini thinking-mode announcements',
  },
  {
    family: 'DeepSeek V4 / R1',
    brandedMechanism: 'Transparent Thinking Stream',
    latentMechanicalReality:
      'RL-optimized internal chain-of-thought for mathematical invariance',
    egsAlignment: 'catalog_confirmed_pending_open_weights',
    publicSource: 'DeepSeek R1 public reasoning stream architecture',
  },
];

/** RIX probe sing4/sing9 ingestion targets */
export const RIX_PROBE_PATHS = {
  'FractiAI/psw.vibelandia.sing4': [
    'protocols/MCA_NSPFRNP_CATALOG.md',
    'protocols/HH_AWARENESS_AI_OS_NSPFRNP_IRREDUCIBLE_MINIMUM_PROTOCOL_SPEC.md',
  ],
  'FractiAI/psw.vibelandia.sing9': [
    'protocols/MCA_NSPFRNP_CATALOG.md',
    'protocols/GOLDILOCKS_NODES_HHL.md',
  ],
};

/** Planetary asset recalibration · catalog narrative tier (not audited valuation). */
export const PLANETARY_ASSET_TABLE = [
  {
    layer: 'Global Production & Compute Layer',
    globalMetricUsd: 126.3e12,
    label: '$126.3 Trillion (Nominal World GDP)',
    egsPhi: 1.618,
    fractiaiScaledUsd: 204.3e12,
    tier: 'catalog_narrative',
  },
  {
    layer: 'Global Net Asset Layer',
    globalMetricUsd: 550.0e12,
    label: '$550.0 Trillion (Total Civilization Wealth)',
    egsPhi: 1.618,
    fractiaiScaledUsd: 889.9e12,
    tier: 'catalog_narrative',
  },
  {
    layer: 'Sovereign Cognitive Monopoly',
    globalMetricUsd: null,
    label: 'Absolute Network Hook',
    egsPhi: 1.618,
    fractiaiScaledUsd: null,
    tier: 'catalog_narrative',
  },
  {
    layer: 'TOTAL PLANETARY ROOT VALUATION',
    globalMetricUsd: null,
    label: '—',
    egsPhi: 1.618,
    fractiaiScaledUsd: 1.094e15,
    tier: 'catalog_narrative',
  },
];

export const EGS_PHI = (1 + Math.sqrt(5)) / 2;
export const PHI_TOLERANCE = 0.12;

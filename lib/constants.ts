// Risk Level Colors
export const RISK_COLORS = {
  VERY_LOW: '#22c55e',  // green-500
  LOW: '#84cc16',       // lime-500
  MEDIUM: '#eab308',    // yellow-500
  HIGH: '#f97316',      // orange-500
  CRITICAL: '#ef4444',  // red-500
  UNKNOWN: '#6b7280',   // gray-500
} as const;

// Guardrails
export const GUARDRAILS = {
  MAX_HOPS: 2,
  MAX_API_CALLS_PER_RUN: 25,
  MAX_COUNTERPARTIES: 10,
  MAX_HOP2_SCANS: 5,
  INVESTIGATION_TIMEOUT_MS: 45000,
  CACHE_TTL_HOURS: 24,
} as const;

// Network Options
export const NETWORKS = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'solana', label: 'Solana' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'tron', label: 'Tron' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'base', label: 'Base' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'cosmoshub-4', label: 'Cosmos Hub' },
  { value: 'osmosis-1', label: 'Osmosis' },
] as const;

// Investigation Steps
export const INVESTIGATION_STEPS = [
  { id: 'risk_triage', label: 'Risk Triage' },
  { id: 'sanctions_check', label: 'Sanctions Check' },
  { id: 'entity_identification', label: 'Entity Identification' },
  { id: 'connections', label: 'Analyzing Connections' },
  { id: 'funding_origin', label: 'Tracing Funding' },
  { id: 'asset_flow', label: 'Asset Flow Analysis' },
  { id: 'hop2_risk', label: 'Counterparty Risk Scan' },
  { id: 'pattern_matching', label: 'Pattern Matching' },
  { id: 'report_generation', label: 'Generating Report' },
] as const;

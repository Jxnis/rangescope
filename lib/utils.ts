// Utility functions

/**
 * Normalize Range API risk level text to our enum format
 * "VERY LOW RISK" → "VERY_LOW"
 * "HIGH RISK" → "HIGH"
 */
export function normalizeRiskLevel(apiRiskLevel: string): string {
  if (!apiRiskLevel) return 'UNKNOWN';

  // Extract just the core risk level (e.g. "CRITICAL" from "CRITICAL RISK (directly malicious)")
  const upper = apiRiskLevel.toUpperCase();
  
  if (upper.includes('CRITICAL')) return 'CRITICAL';
  if (upper.includes('VERY LOW') || upper.includes('VERY_LOW')) return 'VERY_LOW';
  if (upper.includes('LOW')) return 'LOW';
  if (upper.includes('MEDIUM')) return 'MEDIUM';
  if (upper.includes('HIGH')) return 'HIGH';

  return 'UNKNOWN';
}

/**
 * Get risk color from risk level (uses constants)
 */
export function getRiskColor(riskLevel: string): string {
  const { RISK_COLORS } = require('./constants');
  const level = normalizeRiskLevel(riskLevel);
  return RISK_COLORS[level as keyof typeof RISK_COLORS] || RISK_COLORS.UNKNOWN;
}

/**
 * Auto-detect blockchain network from address format
 */
export function detectNetwork(address: string): string {
  if (!address) return 'ethereum';
  const trimmed = address.trim();

  // Cosmos-based addresses
  if (trimmed.startsWith('cosmos1')) return 'cosmoshub-4';
  if (trimmed.startsWith('osmo1')) return 'osmosis-1';

  // EVM addresses (0x prefix, 42 chars)
  if (/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) return 'ethereum';

  // Solana addresses (base58, 32-44 chars, no 0x)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return 'solana';

  return 'ethereum'; // Default
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

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
 * Get risk color from risk level
 */
export function getRiskColor(riskLevel: string): string {
  const level = normalizeRiskLevel(riskLevel);

  switch (level) {
    case 'VERY_LOW':
      return '#22c55e'; // green-500
    case 'LOW':
      return '#84cc16'; // lime-500
    case 'MEDIUM':
      return '#eab308'; // yellow-500
    case 'HIGH':
      return '#f97316'; // orange-500
    case 'CRITICAL':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// Cross-Case Pattern Matching
import { findSharedFunders, findCounterpartyOverlapByAddresses } from './db';
import type { PatternMatch, FundingSource, Connection } from '@/types';

/**
 * Find patterns across previous investigations
 */
export async function findPatterns(
  caseId: string,
  address: string,
  fundingOrigin: FundingSource | null,
  connections: Connection[]
): Promise<PatternMatch[]> {
  const patterns: PatternMatch[] = [];

  // Pattern 1: Shared Funder Detection
  if (fundingOrigin) {
    const sharedFunders = findSharedFunders(address);

    if (sharedFunders.length > 0) {
      // Group by funder
      const funderMap = new Map<string, { caseIds: string[]; addresses: string[] }>();

      for (const match of sharedFunders) {
        if (match.relatedAddress.toLowerCase() === address.toLowerCase()) continue;
        if (!funderMap.has(match.sharedFunder)) {
          funderMap.set(match.sharedFunder, { caseIds: [], addresses: [] });
        }
        const group = funderMap.get(match.sharedFunder)!;
        group.caseIds.push(match.relatedCaseId);
        group.addresses.push(match.relatedAddress);
      }

      // Create pattern for each funder
      for (const [funder, group] of funderMap) {
        const sampleAddress = group.addresses[0] || 'unknown';
        patterns.push({
          type: 'shared_funder',
          relatedCases: group.caseIds.slice(0, 5), // Linkable case IDs
          details: `Shared funding origin: ${truncateAddress(funder)}. Matched ${group.caseIds.length} case(s), e.g. ${truncateAddress(sampleAddress)}.`,
          confidence: calculatePatternConfidence(group.caseIds.length, 'shared_funder'),
        });
      }
    }
  }

  // Pattern 2: Counterparty Cluster Overlap
  if (connections.length > 0) {
    const counterpartyAddresses = connections
      .map((conn) => conn.address)
      .filter(Boolean);

    const counterpartyOverlap = findCounterpartyOverlapByAddresses(counterpartyAddresses);

    if (counterpartyOverlap.length > 0) {
      const topOverlap = counterpartyOverlap[0]; // Most overlapping case

      if (
        topOverlap.sharedCounterparties >= 2 &&
        topOverlap.relatedAddress.toLowerCase() !== address.toLowerCase()
      ) {
        // At least 2 shared counterparties to be significant
        patterns.push({
          type: 'counterparty_overlap',
          relatedCases: [topOverlap.relatedCaseId],
          details: `${topOverlap.sharedCounterparties} shared counterparties with ${truncateAddress(topOverlap.relatedAddress)}. Possible coordinated activity.`,
          confidence: calculatePatternConfidence(topOverlap.sharedCounterparties, 'counterparty_overlap'),
        });
      }
    }
  }

  // Pattern 3: Behavioral Similarity (future enhancement)
  // Could add: similar tx patterns, similar volumes, similar timing

  return patterns;
}

/**
 * Calculate confidence for pattern match
 */
function calculatePatternConfidence(matchCount: number, patternType: string): number {
  if (patternType === 'shared_funder') {
    // More related cases = higher confidence
    if (matchCount >= 5) return 0.9;
    if (matchCount >= 3) return 0.75;
    if (matchCount >= 2) return 0.6;
    return 0.5;
  }

  if (patternType === 'counterparty_overlap') {
    // More shared counterparties = higher confidence
    if (matchCount >= 5) return 0.9;
    if (matchCount >= 3) return 0.75;
    if (matchCount >= 2) return 0.6;
    return 0.5;
  }

  return 0.5;
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

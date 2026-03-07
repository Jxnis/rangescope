// Vector-style local memory for cross-case similarity
import { getCaseVectors } from './db';
import type { InvestigationResult, PatternMatch } from '@/types';

const SIMILARITY_THRESHOLD = 0.82;
const MAX_MATCHES = 3;

function riskLevelScore(riskLevel?: string): number {
  switch (riskLevel) {
    case 'VERY_LOW':
      return 0.1;
    case 'LOW':
      return 0.25;
    case 'MEDIUM':
      return 0.5;
    case 'HIGH':
      return 0.75;
    case 'CRITICAL':
      return 1;
    default:
      return 0;
  }
}

function safeNum(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// Build a stable feature vector from investigation outputs.
export function buildCaseVector(result: InvestigationResult): number[] {
  const riskLevel = riskLevelScore(result.risk?.riskLevel);
  const riskScore = clamp01(safeNum(result.risk?.riskScore) / 100);
  const isSanctioned = result.sanctions?.isSanctioned ? 1 : 0;
  const isBlacklisted = result.sanctions?.isBlacklisted ? 1 : 0;
  const connectionCount = clamp01((result.connections?.length || 0) / 20);
  const hasFundingOrigin = result.fundingOrigin?.funderAddress ? 1 : 0;
  const txCount = clamp01(safeNum(result.stats?.transactionCount) / 1000);
  const totalVolumeUsd = safeNum(result.stats?.totalVolumeUSD);
  const volumeSignal = clamp01(Math.log10(totalVolumeUsd + 1) / 8);
  const counterparties = clamp01(safeNum(result.stats?.counterparties) / 100);
  const activeDays = clamp01(safeNum(result.stats?.activeDays) / 365);

  const hop2 = result.hop2Risks || [];
  const highHop2 = hop2.filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length;
  const hop2HighRatio = hop2.length > 0 ? clamp01(highHop2 / hop2.length) : 0;

  const hasEntity = result.entity?.name || result.entity?.category ? 1 : 0;

  return [
    riskLevel,
    riskScore,
    isSanctioned,
    isBlacklisted,
    connectionCount,
    hasFundingOrigin,
    txCount,
    volumeSignal,
    counterparties,
    activeDays,
    hop2HighRatio,
    hasEntity,
  ];
}

export function buildCaseSummary(result: InvestigationResult): string {
  const risk = result.risk?.riskLevel || 'UNKNOWN';
  const conn = result.connections?.length || 0;
  const sanctioned = result.sanctions?.isSanctioned ? 'sanctioned' : 'not-sanctioned';
  return `${risk} | ${sanctioned} | ${conn} counterparties | ${result.network}`;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function findBehavioralSimilarityPatterns(
  caseId: string,
  result: InvestigationResult,
  vector: number[]
): PatternMatch[] {
  const hasBehavioralSignal =
    (result.connections?.length || 0) > 0 ||
    safeNum(result.stats?.transactionCount) > 0 ||
    safeNum(result.stats?.totalVolumeUSD) > 0 ||
    !!result.fundingOrigin?.funderAddress ||
    !!result.sanctions?.isSanctioned ||
    result.risk?.riskLevel === 'HIGH' ||
    result.risk?.riskLevel === 'CRITICAL';

  if (!hasBehavioralSignal) return [];

  const candidates = getCaseVectors(result.network, caseId, 200);
  if (candidates.length === 0) return [];

  const ranked = candidates
    .filter((candidate) => candidate.address.toLowerCase() !== result.address.toLowerCase())
    .map((candidate) => ({
      caseId: candidate.caseId,
      address: candidate.address,
      similarity: cosineSimilarity(vector, candidate.vector),
    }))
    .filter((match) => match.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_MATCHES);

  if (ranked.length === 0) return [];

  const avg = ranked.reduce((sum, item) => sum + item.similarity, 0) / ranked.length;
  const confidence = clamp01(Math.max(0.55, avg));

  const relatedCases = ranked.map((item) => item.caseId);
  const top = ranked[0];
  const details = `Behavioral vector similarity matched ${ranked.length} prior case(s). Top match ${top.caseId.slice(0, 8)}... (${Math.round(top.similarity * 100)}% similarity).`;

  return [
    {
      type: 'behavioral_similarity',
      relatedCases,
      details,
      confidence,
    },
  ];
}

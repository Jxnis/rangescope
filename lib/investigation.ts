// Investigation Pipeline - Deterministic 2-hop investigation engine
import { randomUUID } from 'crypto';
import {
  getAddressRisk,
  checkSanctions,
  getAddressInfo,
  getAddressConnections,
  getAddressFundedBy,
  getAddressAssetFlow,
  getTransfers,
  getAddressFeatures,
  resetCallCount,
  getCallCount,
} from './range';
import { findPatterns } from './patterns';
import { saveCase, saveConnections, saveFundingSource, saveCaseVector, getLatestCaseByAddress, initializeDatabase } from './db-postgres';
import { buildCaseSummary, buildCaseVector, findBehavioralSimilarityPatterns } from './memory';
import { GUARDRAILS } from './constants';
import type { InvestigationResult, Connection, Hop2RiskResult, FundingSource } from '@/types';

export interface InvestigationStep {
  step: string;
  status: 'running' | 'done' | 'error';
  data?: any;
  error?: string;
}

export type StepCallback = (step: InvestigationStep) => void;

/**
 * Run a complete investigation on a blockchain address
 */
export async function runInvestigation(
  address: string,
  network: string,
  onStep?: StepCallback
): Promise<InvestigationResult> {
  // Ensure tables exist before running any DB checks
  await initializeDatabase();
  
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  resetCallCount();

  const emitStep = (step: InvestigationStep) => {
    if (onStep) onStep(step);
  };

  try {
    // PARALLEL BATCH 1: Risk triage, sanctions, entity
    emitStep({ step: 'risk_triage', status: 'running' });
    emitStep({ step: 'sanctions_check', status: 'running' });
    emitStep({ step: 'entity_identification', status: 'running' });

    const [risk, sanctions, entity] = await Promise.all([
      getAddressRisk(address, network),
      checkSanctions(address, network, true),
      getAddressInfo(address, network),
    ]);

    // If provider rate limits or transient errors occur, reuse latest successful snapshot data.
    const latestCase = await getLatestCaseByAddress(address, network);
    const resolvedRisk =
      (risk?.error || !risk?.riskLevel || risk.riskLevel === 'UNKNOWN') && latestCase?.risk
        ? latestCase.risk
        : risk;
    const resolvedSanctions =
      sanctions?.error && latestCase?.sanctions
        ? latestCase.sanctions
        : sanctions;
    const resolvedEntity =
      entity?.error && latestCase?.entity
        ? latestCase.entity
        : entity;

    emitStep({ step: 'risk_triage', status: 'done', data: resolvedRisk });
    emitStep({ step: 'sanctions_check', status: 'done', data: resolvedSanctions });
    emitStep({ step: 'entity_identification', status: 'done', data: resolvedEntity });

    // PARALLEL BATCH 2: Connections, funding, features
    emitStep({ step: 'connections', status: 'running' });
    emitStep({ step: 'funding_origin', status: 'running' });

    const [connections, fundingOrigin, rawStats] = await Promise.all([
      getAddressConnections(address, network, GUARDRAILS.MAX_COUNTERPARTIES),
      getAddressFundedBy(address, network),
      getAddressFeatures(address, network),
    ]);

    let resolvedConnections = extractConnections(connections);
    let connectionSource = 'connections';

    if (resolvedConnections.length === 0) {
      const transfers = await getTransfers(address, network, 50);
      const transferDerived = extractConnectionsFromTransfers(transfers, address, network);
      if (transferDerived.length > 0) {
        resolvedConnections = transferDerived;
        connectionSource = 'transfers_fallback';
      }
    }
    const resolvedFundingOrigin = extractFundingSource(fundingOrigin);

    emitStep({
      step: 'connections',
      status: 'done',
      data: { ...connections, connections: resolvedConnections, source: connectionSource },
    });
    emitStep({ step: 'funding_origin', status: 'done', data: resolvedFundingOrigin });

    // PARALLEL BATCH 3: Asset flow
    emitStep({ step: 'asset_flow', status: 'running' });
    const assetFlow = await getAddressAssetFlow(address, network);
    emitStep({ step: 'asset_flow', status: 'done', data: assetFlow });

    // Derive stats from asset flow if features API returned empty/error
    let stats = rawStats;
    if (!stats || stats.error || (stats.transactionCount === undefined && stats.totalVolumeUSD === undefined)) {
      stats = deriveStatsFromAssetFlow(assetFlow, address, network);
    }

    // HOP 2: Risk-scan top counterparties
    emitStep({ step: 'hop2_risk', status: 'running' });

    const topCounterparties = resolvedConnections.slice(0, GUARDRAILS.MAX_HOP2_SCANS);
    const hop2Risks: Hop2RiskResult[] = [];

    if (topCounterparties.length > 0) {
      const hop2Results = await Promise.all(
        topCounterparties.map((conn: any) =>
          getAddressRisk(conn.address, conn.network || network)
        )
      );

      for (let i = 0; i < hop2Results.length; i++) {
        hop2Risks.push({
          address: topCounterparties[i].address,
          riskLevel: hop2Results[i].riskLevel || 'UNKNOWN',
          riskScore: hop2Results[i].riskScore,
        });
      }
    }

    emitStep({ step: 'hop2_risk', status: 'done', data: hop2Risks });

    // PATTERN MATCHING (local, no API)
    emitStep({ step: 'pattern_matching', status: 'running' });
    const basePatterns = await findPatterns(id, address, resolvedFundingOrigin, resolvedConnections);

    // Calculate confidence
    const resolvedStats = stats?.error && latestCase?.stats ? latestCase.stats : stats;
    const confidence = calculateConfidence(resolvedRisk, resolvedSanctions, resolvedStats);

    // Build investigation result
    const result: InvestigationResult = {
      id,
      address,
      network,
      timestamp,
      risk: resolvedRisk,
      sanctions: resolvedSanctions,
      entity: resolvedEntity,
      connections: resolvedConnections,
      fundingOrigin: resolvedFundingOrigin,
      assetFlow: assetFlow || null,
      stats: resolvedStats || null,
      hop2Risks,
      patterns: basePatterns,
      report: '', // Will be generated by AI later
      apiCallCount: getCallCount(),
      confidence,
    };

    // Local vector memory: find behaviorally similar prior cases.
    const vector = buildCaseVector(result);
    const memoryPatterns = await findBehavioralSimilarityPatterns(id, result, vector);
    if (memoryPatterns.length > 0) {
      result.patterns = [...result.patterns, ...memoryPatterns];
    }

    emitStep({ step: 'pattern_matching', status: 'done', data: result.patterns });

    // Save to database
    await saveCase(result);
    await saveCaseVector(id, address, network, vector, buildCaseSummary(result));

    if (result.connections.length > 0) {
      await saveConnections(id, address, result.connections);
    }

    if (result.fundingOrigin?.funderAddress) {
      await saveFundingSource(id, address, result.fundingOrigin);
    }

    return result;
  } catch (error: any) {
    console.error('Investigation error:', error);

    // Return partial result on error
    return {
      id,
      address,
      network,
      timestamp,
      risk: { address, network, riskLevel: 'UNKNOWN', error: error.message },
      sanctions: { address, isSanctioned: false, isBlacklisted: false },
      entity: { address },
      connections: [],
      fundingOrigin: null,
      assetFlow: null,
      stats: null,
      hop2Risks: [],
      patterns: [],
      report: `# Investigation Error\n\nUnable to complete investigation: ${error.message}`,
      apiCallCount: getCallCount(),
      confidence: 'INSUFFICIENT',
    };
  }
}

function deriveStatsFromAssetFlow(assetFlow: any, address: string, network: string): any {
  if (!assetFlow || assetFlow.error) {
    return { address, network };
  }

  const flows = assetFlow.flows || [];
  if (flows.length === 0) {
    return { address, network, transactionCount: 0, totalVolumeUSD: 0 };
  }

  const transactionCount = flows.length;
  const totalVolumeUSD = flows.reduce((sum: number, flow: any) => {
    const usd = typeof flow.usd === 'number' ? Math.abs(flow.usd) : 0;
    return sum + usd;
  }, 0);

  return {
    address,
    network,
    transactionCount,
    totalVolumeUSD,
  };
}

function extractConnections(payload: any): Connection[] {
  if (!payload || payload.error) return [];

  const toConnection = (item: any): Connection | null => {
    if (!item || typeof item !== 'object') return null;

    // Handle nested address object structure
    let addr = item.address;
    if (addr && typeof addr === 'object' && addr.address) {
      addr = addr.address;
    }

    // Fallback to other address fields
    addr = addr ||
      item.counterparty_address ||
      item.counterpartyAddress ||
      item.id ||
      item.wallet ||
      item.account;

    if (!addr || typeof addr !== 'string') return null;

    const totalUSD =
      toFiniteNumber(
        item.totalUSD ??
        item.total_usd ??
        item.volume_usd ??
        item.amount_usd ??
        item.usdVolume ??
        item.last_transaction?.amount_usd ??
        0
      );

    const transferCount =
      toFiniteNumber(
        item.transferCount ??
        item.transfer_count ??
        item.tx_count ??
        item.count ??
        item.total_payments ??
        0
      );

    // Extract network from nested address object if present
    const networkVal = item.network ||
      item.ecosystem ||
      item.chain ||
      (item.address && typeof item.address === 'object' ? item.address.network : undefined) ||
      undefined;

    return {
      address: addr,
      network: networkVal,
      label: item.label || item.name || item.name_tag || item.entity || undefined,
      transferCount,
      totalUSD,
      riskLevel: item.riskLevel || item.risk_level || undefined,
    };
  };

  const candidateArrays = [
    payload.connections,
    payload.counterparties,
    payload.nodes,
    payload.data?.connections,
    payload.data?.counterparties,
    payload.data?.nodes,
    payload.data,
    payload,
  ];

  for (const source of candidateArrays) {
    if (!Array.isArray(source)) continue;
    const mapped = source.map(toConnection).filter((c): c is Connection => Boolean(c));
    if (mapped.length > 0) return dedupeConnections(mapped);
  }

  return [];
}

function extractConnectionsFromTransfers(payload: any, rootAddress: string, network: string): Connection[] {
  if (!payload || payload.error) return [];

  const transfers = Array.isArray(payload.transfers)
    ? payload.transfers
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

  if (transfers.length === 0) return [];

  const root = rootAddress.toLowerCase();
  const aggregate = new Map<string, { count: number; usd: number; network?: string }>();

  for (const tx of transfers) {
    const from = String(tx?.from || tx?.from_address || tx?.sender || tx?.source || '').trim();
    const to = String(tx?.to || tx?.to_address || tx?.receiver || tx?.destination || '').trim();
    if (!from && !to) continue;

    const fromLc = from.toLowerCase();
    const toLc = to.toLowerCase();
    let counterparty = '';

    if (fromLc === root && to) counterparty = to;
    else if (toLc === root && from) counterparty = from;
    else continue;

    const usd =
      toFiniteNumber(
        tx?.amount_usd ??
        tx?.amountUsd ??
        tx?.value_usd ??
        tx?.usd_value ??
        tx?.usdVolume
      ) || 0;

    const current = aggregate.get(counterparty) || { count: 0, usd: 0, network: tx?.network || tx?.chain || network };
    current.count += 1;
    current.usd += usd;
    aggregate.set(counterparty, current);
  }

  const out: Connection[] = [];
  for (const [address, agg] of aggregate.entries()) {
    out.push({
      address,
      network: agg.network || network,
      transferCount: agg.count,
      totalUSD: agg.usd > 0 ? agg.usd : undefined,
    });
  }

  return out
    .sort((a, b) => (b.totalUSD || 0) - (a.totalUSD || 0))
    .slice(0, GUARDRAILS.MAX_COUNTERPARTIES);
}

function toFiniteNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function dedupeConnections(connections: Connection[]): Connection[] {
  const byAddress = new Map<string, Connection>();

  for (const conn of connections) {
    const key = conn.address.toLowerCase();
    const existing = byAddress.get(key);
    if (!existing) {
      byAddress.set(key, conn);
      continue;
    }

    byAddress.set(key, {
      ...existing,
      transferCount: Math.max(existing.transferCount || 0, conn.transferCount || 0),
      totalUSD: Math.max(existing.totalUSD || 0, conn.totalUSD || 0) || existing.totalUSD || conn.totalUSD,
      label: existing.label || conn.label,
      network: existing.network || conn.network,
      riskLevel: existing.riskLevel || conn.riskLevel,
    });
  }

  return Array.from(byAddress.values());
}

function extractFundingSource(payload: any): FundingSource | null {
  if (!payload || payload.error) return null;

  if (payload.funderAddress) {
    return payload as FundingSource;
  }

  if (payload.funder_address) {
    return {
      funderAddress: payload.funder_address,
      funderNetwork: payload.funder_network || payload.network,
      amountUSD: payload.amountUSD || payload.amount_usd,
      amount: payload.amount,
    };
  }

  // Do not infer funder from generic address fields; this creates false self-funding.
  return null;
}

/**
 * Calculate confidence level based on available data
 */
function calculateConfidence(
  risk: any,
  sanctions: any,
  stats: any
): 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' {
  // Check for errors or missing data
  if (risk.error || sanctions.error) {
    return 'INSUFFICIENT';
  }

  // High confidence: Clear risk signal or clearly clean
  if (risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH' || sanctions.isSanctioned) {
    return 'HIGH';
  }

  if (risk.riskLevel === 'VERY_LOW' && !sanctions.isSanctioned && stats && stats.transactionCount > 10) {
    return 'HIGH';
  }

  // Medium confidence: Mixed signals
  if (risk.riskLevel === 'MEDIUM') {
    return 'MEDIUM';
  }

  // Low confidence: Limited data
  if (!stats || stats.transactionCount < 5) {
    return 'LOW';
  }

  return 'MEDIUM';
}

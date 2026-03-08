// JSON File Storage - Drop-in replacement for SQLite on Vercel
import fs from 'fs';
import path from 'path';
import type {
  InvestigationResult,
  Connection,
  FundingSource,
  CaseRow,
} from '@/types';

interface JsonDatabase {
  cases: any[];
  connections: any[];
  fundingSources: any[];
  caseVectors: any[];
}

let db: JsonDatabase | null = null;

function getDbPath(): string {
  const isVercel = process.env.VERCEL === '1';
  const dir = isVercel ? '/tmp' : path.join(process.cwd(), 'db');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return path.join(dir, 'rangescope.json');
}

function loadDb(): JsonDatabase {
  if (db) return db;

  const dbPath = getDbPath();

  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      db = JSON.parse(data);
    } catch (error) {
      console.error('Failed to load database, creating new:', error);
      db = { cases: [], connections: [], fundingSources: [], caseVectors: [] };
    }
  } else {
    db = { cases: [], connections: [], fundingSources: [], caseVectors: [] };
  }

  return db as JsonDatabase;
}

function saveDb(): void {
  if (!db) return;

  const dbPath = getDbPath();

  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

// Save investigation case
export function saveCase(investigation: InvestigationResult): void {
  const database = loadDb();

  const caseData = {
    id: investigation.id,
    address: investigation.address,
    network: investigation.network,
    timestamp: investigation.timestamp,
    risk_level: investigation.risk.riskLevel,
    risk_score: investigation.risk.riskScore || null,
    is_sanctioned: investigation.sanctions.isSanctioned ? 1 : 0,
    entity_name: investigation.entity.name || null,
    entity_category: investigation.entity.category || null,
    labels: JSON.stringify(investigation.entity.labels || []),
    funded_by: investigation.fundingOrigin ? JSON.stringify(investigation.fundingOrigin) : null,
    confidence: investigation.confidence,
    report: investigation.report,
    raw_data: JSON.stringify(investigation),
    created_at: new Date().toISOString(),
  };

  database.cases.push(caseData);
  saveDb();
}

// Save connections
export function saveConnections(caseId: string, sourceAddress: string, connections: Connection[]): void {
  const database = loadDb();

  for (const conn of connections) {
    database.connections.push({
      case_id: caseId,
      source_address: sourceAddress,
      counterparty_address: conn.address,
      counterparty_network: conn.network || null,
      counterparty_label: conn.label || null,
      transfer_count: conn.transferCount || null,
      total_usd: conn.totalUSD || null,
      risk_level: conn.riskLevel || null,
    });
  }

  saveDb();
}

// Save funding source
export function saveFundingSource(caseId: string, fundedAddress: string, funder: FundingSource): void {
  const database = loadDb();

  database.fundingSources.push({
    case_id: caseId,
    funded_address: fundedAddress,
    funder_address: funder.funderAddress,
    funder_network: funder.funderNetwork || null,
    amount_usd: funder.amountUSD || null,
  });

  saveDb();
}

// Save/update vector memory for case
export function saveCaseVector(
  caseId: string,
  address: string,
  network: string,
  vector: number[],
  summary?: string
): void {
  const database = loadDb();

  // Remove existing vector for this case
  database.caseVectors = database.caseVectors.filter((v: any) => v.case_id !== caseId);

  database.caseVectors.push({
    case_id: caseId,
    address,
    network,
    vector_json: JSON.stringify(vector),
    summary: summary || null,
    created_at: new Date().toISOString(),
  });

  saveDb();
}

// Get case by ID
export function getCaseById(id: string): InvestigationResult | null {
  const database = loadDb();
  const caseData = database.cases.find((c: any) => c.id === id);

  if (!caseData) return null;

  try {
    const parsed = JSON.parse(caseData.raw_data) as InvestigationResult;

    // Keep report column as source of truth
    if (caseData.report && parsed.report !== caseData.report) {
      parsed.report = caseData.report;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse case data:', error);
    return null;
  }
}

// Get all cases
export function getAllCases(limit: number = 50, offset: number = 0): CaseRow[] {
  const database = loadDb();

  return database.cases
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(offset, offset + limit) as CaseRow[];
}

// Find cases by address
export function findCasesByAddress(address: string, network?: string): CaseRow[] {
  const database = loadDb();

  return database.cases
    .filter((c: any) => {
      if (network) {
        return c.address === address && c.network === network;
      }
      return c.address === address;
    })
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as CaseRow[];
}

// Get latest saved investigation snapshot for an address/network
export function getLatestCaseByAddress(address: string, network: string): InvestigationResult | null {
  const rows = findCasesByAddress(address, network);
  if (rows.length === 0) return null;

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.raw_data) as InvestigationResult;
      if (row.report && parsed.report !== row.report) {
        parsed.report = row.report;
      }

      const hasUsableRisk = !!parsed.risk && !parsed.risk.error && parsed.risk.riskLevel !== 'UNKNOWN';
      const hasUsableSanctions = !!parsed.sanctions && !parsed.sanctions.error;
      if (hasUsableRisk && hasUsableSanctions) {
        return parsed;
      }
    } catch (error) {
      continue;
    }
  }

  // Fallback to latest row
  const latest = rows[0];
  try {
    const parsedLatest = JSON.parse(latest.raw_data) as InvestigationResult;
    if (latest.report && parsedLatest.report !== latest.report) {
      parsedLatest.report = latest.report;
    }
    return parsedLatest;
  } catch (error) {
    return null;
  }
}

// Pattern matching: Find shared funders
export function findSharedFunders(
  address: string
): Array<{ relatedCaseId: string; relatedAddress: string; sharedFunder: string }> {
  const database = loadDb();

  const myFunders = database.fundingSources
    .filter((f: any) => f.funded_address === address)
    .map((f: any) => f.funder_address);

  if (myFunders.length === 0) return [];

  const results: Array<{ relatedCaseId: string; relatedAddress: string; sharedFunder: string }> = [];

  for (const funder of myFunders) {
    const sharedCases = database.fundingSources.filter(
      (f: any) => f.funder_address === funder && f.funded_address !== address
    );

    for (const shared of sharedCases) {
      const relatedCase = database.cases.find((c: any) => c.id === shared.case_id);
      if (relatedCase) {
        results.push({
          relatedCaseId: shared.case_id,
          relatedAddress: relatedCase.address,
          sharedFunder: funder,
        });
      }
    }
  }

  return results;
}

// Pattern matching: Find counterparty overlap
export function findCounterpartyOverlap(caseId: string): Array<{ relatedCase: string; sharedCounterparties: number }> {
  const database = loadDb();

  const myCounterparties = database.connections
    .filter((c: any) => c.case_id === caseId)
    .map((c: any) => c.counterparty_address);

  if (myCounterparties.length === 0) return [];

  const overlapMap = new Map<string, number>();

  for (const counterparty of myCounterparties) {
    const sharedCases = database.connections.filter(
      (c: any) => c.counterparty_address === counterparty && c.case_id !== caseId
    );

    for (const shared of sharedCases) {
      const relatedCase = database.cases.find((c: any) => c.id === shared.case_id);
      if (relatedCase) {
        const count = overlapMap.get(relatedCase.address) || 0;
        overlapMap.set(relatedCase.address, count + 1);
      }
    }
  }

  return Array.from(overlapMap.entries())
    .map(([relatedCase, sharedCounterparties]) => ({ relatedCase, sharedCounterparties }))
    .sort((a, b) => b.sharedCounterparties - a.sharedCounterparties)
    .slice(0, 10);
}

// Pattern matching: Find overlap between current counterparties and historical cases
export function findCounterpartyOverlapByAddresses(
  counterparties: string[]
): Array<{ relatedCaseId: string; relatedAddress: string; sharedCounterparties: number }> {
  if (counterparties.length === 0) return [];

  const database = loadDb();
  const overlapMap = new Map<string, { caseId: string; address: string; count: number }>();

  for (const counterparty of counterparties) {
    const matches = database.connections.filter((c: any) => c.counterparty_address === counterparty);

    for (const match of matches) {
      const existing = overlapMap.get(match.case_id);
      if (existing) {
        existing.count++;
      } else {
        const relatedCase = database.cases.find((c: any) => c.id === match.case_id);
        if (relatedCase) {
          overlapMap.set(match.case_id, {
            caseId: match.case_id,
            address: relatedCase.address,
            count: 1,
          });
        }
      }
    }
  }

  return Array.from(overlapMap.values())
    .map((item) => ({
      relatedCaseId: item.caseId,
      relatedAddress: item.address,
      sharedCounterparties: item.count,
    }))
    .sort((a, b) => b.sharedCounterparties - a.sharedCounterparties)
    .slice(0, 10);
}

// Get vectors from prior cases for similarity matching
export function getCaseVectors(
  network?: string,
  excludeCaseId?: string,
  limit: number = 200
): Array<{ caseId: string; address: string; network: string; vector: number[]; summary?: string }> {
  const database = loadDb();

  let vectors = database.caseVectors;

  if (network) {
    vectors = vectors.filter((v: any) => v.network === network);
  }

  if (excludeCaseId) {
    vectors = vectors.filter((v: any) => v.case_id !== excludeCaseId);
  }

  vectors = vectors
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return vectors
    .map((v: any) => {
      try {
        return {
          caseId: v.case_id,
          address: v.address,
          network: v.network,
          vector: JSON.parse(v.vector_json),
          summary: v.summary || undefined,
        };
      } catch (error) {
        return null;
      }
    })
    .filter((v: any) => v !== null) as Array<{ caseId: string; address: string; network: string; vector: number[]; summary?: string }>;
}

// Close database (no-op for JSON)
export function closeDatabase() {
  // No-op
}

// Update report after async generation completes
export function updateCaseReport(caseId: string, report: string): void {
  const database = loadDb();
  const caseData = database.cases.find((c: any) => c.id === caseId);

  if (caseData) {
    caseData.report = report;
    saveDb();
  }
}

export default loadDb;

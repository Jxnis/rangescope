// Neon Serverless Database Layer
import { neon } from '@neondatabase/serverless';

let sqlInstance: ReturnType<typeof neon> | null = null;

function getSql() {
  if (sqlInstance) return sqlInstance;
  if (!process.env.DATABASE_URL) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      // Mock during build so we don't crash static generation
      return (() => Promise.resolve([])) as unknown as ReturnType<typeof neon>;
    }
    throw new Error('DATABASE_URL is not set.');
  }
  sqlInstance = neon(process.env.DATABASE_URL);
  return sqlInstance;
}
import type {
  InvestigationResult,
  Connection,
  FundingSource,
  CaseRow,
} from '@/types';

// Initialize database schema
// NOTE: neon() HTTP client only supports ONE statement per template literal.
// Each CREATE TABLE must be a separate awaited call.
let dbInitialized = false;
export async function initializeDatabase() {
  if (dbInitialized) return; // Only run once per process
  try {
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      network TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      risk_level TEXT,
      risk_score REAL,
      is_sanctioned INTEGER DEFAULT 0,
      entity_name TEXT,
      entity_category TEXT,
      labels TEXT,
      funded_by TEXT,
      confidence TEXT,
      report TEXT,
      raw_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      case_id TEXT NOT NULL,
      source_address TEXT NOT NULL,
      counterparty_address TEXT NOT NULL,
      counterparty_network TEXT,
      counterparty_label TEXT,
      transfer_count INTEGER,
      total_usd REAL,
      risk_level TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS funding_sources (
      id SERIAL PRIMARY KEY,
      case_id TEXT NOT NULL,
      funded_address TEXT NOT NULL,
      funder_address TEXT NOT NULL,
      funder_network TEXT,
      amount_usd REAL,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS case_vectors (
      case_id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      network TEXT NOT NULL,
      vector_json TEXT NOT NULL,
      summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_connections_counterparty ON connections(counterparty_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_funding_funder ON funding_sources(funder_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cases_address ON cases(address, network)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cases_risk ON cases(risk_level)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vectors_address_network ON case_vectors(address, network)`;
    dbInitialized = true;
    console.log('[DB] Schema initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Save investigation case
export async function saveCase(investigation: InvestigationResult): Promise<void> {
  await getSql()`
    INSERT INTO cases (
      id, address, network, timestamp, risk_level, risk_score,
      is_sanctioned, entity_name, entity_category, labels,
      funded_by, confidence, report, raw_data
    ) VALUES (
      ${investigation.id},
      ${investigation.address},
      ${investigation.network},
      ${investigation.timestamp},
      ${investigation.risk.riskLevel},
      ${investigation.risk.riskScore || null},
      ${investigation.sanctions.isSanctioned ? 1 : 0},
      ${investigation.entity.name || null},
      ${investigation.entity.category || null},
      ${JSON.stringify(investigation.entity.labels || [])},
      ${investigation.fundingOrigin ? JSON.stringify(investigation.fundingOrigin) : null},
      ${investigation.confidence},
      ${investigation.report},
      ${JSON.stringify(investigation)}
    )
  `;
}

// Save connections
export async function saveConnections(caseId: string, sourceAddress: string, connections: Connection[]): Promise<void> {
  for (const conn of connections) {
    await getSql()`
      INSERT INTO connections (
        case_id, source_address, counterparty_address, counterparty_network,
        counterparty_label, transfer_count, total_usd, risk_level
      ) VALUES (
        ${caseId},
        ${sourceAddress},
        ${conn.address},
        ${conn.network || null},
        ${conn.label || null},
        ${conn.transferCount || null},
        ${conn.totalUSD || null},
        ${conn.riskLevel || null}
      )
    `;
  }
}

// Save funding source
export async function saveFundingSource(caseId: string, fundedAddress: string, funder: FundingSource): Promise<void> {
  await getSql()`
    INSERT INTO funding_sources (
      case_id, funded_address, funder_address, funder_network, amount_usd
    ) VALUES (
      ${caseId},
      ${fundedAddress},
      ${funder.funderAddress},
      ${funder.funderNetwork || null},
      ${funder.amountUSD || null}
    )
  `;
}

// Save/update vector memory for case
export async function saveCaseVector(
  caseId: string,
  address: string,
  network: string,
  vector: number[],
  summary?: string
): Promise<void> {
  await getSql()`
    INSERT INTO case_vectors (case_id, address, network, vector_json, summary)
    VALUES (${caseId}, ${address}, ${network}, ${JSON.stringify(vector)}, ${summary || null})
    ON CONFLICT (case_id) DO UPDATE SET
      vector_json = EXCLUDED.vector_json,
      summary = EXCLUDED.summary
  `;
}

// Get case by ID
export async function getCaseById(id: string): Promise<InvestigationResult | null> {
  const result = await getSql()`SELECT * FROM cases WHERE id = ${id}`;

  const rows = result as any[];
  if (rows.length === 0) return null;

  const row = rows[0] as any;
  const parsed = JSON.parse(row.raw_data) as InvestigationResult;

  // Keep report column as source of truth
  if (row.report && parsed.report !== row.report) {
    parsed.report = row.report;
  }

  return parsed;
}

// Get all cases
export async function getAllCases(limit: number = 50, offset: number = 0): Promise<CaseRow[]> {
  const result = await getSql()`
    SELECT id, address, network, timestamp, risk_level, risk_score,
           is_sanctioned, entity_name, entity_category, labels,
           funded_by, confidence, report, raw_data, created_at
    FROM cases
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return result as CaseRow[];
}

// Find cases by address
export async function findCasesByAddress(address: string, network?: string): Promise<CaseRow[]> {
  if (network) {
    const result = await getSql()`
      SELECT * FROM cases
      WHERE address = ${address} AND network = ${network}
      ORDER BY created_at DESC
    `;
    return result as CaseRow[];
  } else {
    const result = await getSql()`
      SELECT * FROM cases
      WHERE address = ${address}
      ORDER BY created_at DESC
    `;
    return result as CaseRow[];
  }
}

// Get latest saved investigation snapshot for an address/network
export async function getLatestCaseByAddress(address: string, network: string): Promise<InvestigationResult | null> {
  const rows = await findCasesByAddress(address, network);
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
export async function findSharedFunders(
  address: string
): Promise<Array<{ relatedCaseId: string; relatedAddress: string; sharedFunder: string }>> {
  const result = await getSql()`
    SELECT DISTINCT c2.id AS "relatedCaseId", c2.address AS "relatedAddress", f.funder_address AS "sharedFunder"
    FROM funding_sources f
    JOIN cases c1 ON f.case_id = c1.id
    JOIN funding_sources f2 ON f.funder_address = f2.funder_address AND f.case_id != f2.case_id
    JOIN cases c2 ON f2.case_id = c2.id
    WHERE c1.address = ${address}
  `;

  return result as Array<{ relatedCaseId: string; relatedAddress: string; sharedFunder: string }>;
}

// Pattern matching: Find counterparty overlap
export async function findCounterpartyOverlap(caseId: string): Promise<Array<{ relatedCase: string; sharedCounterparties: number }>> {
  const result = await getSql()`
    SELECT c2.address AS "relatedCase", COUNT(*) AS "sharedCounterparties"
    FROM connections conn1
    JOIN connections conn2 ON conn1.counterparty_address = conn2.counterparty_address
      AND conn1.case_id != conn2.case_id
    JOIN cases c2 ON conn2.case_id = c2.id
    WHERE conn1.case_id = ${caseId}
    GROUP BY c2.address
    ORDER BY "sharedCounterparties" DESC
    LIMIT 10
  `;

  return result as Array<{ relatedCase: string; sharedCounterparties: number }>;
}

// Pattern matching: Find overlap between current counterparties and historical cases
export async function findCounterpartyOverlapByAddresses(
  counterparties: string[]
): Promise<Array<{ relatedCaseId: string; relatedAddress: string; sharedCounterparties: number }>> {
  if (counterparties.length === 0) return [];

  const result = await getSql()`
    SELECT c.id AS "relatedCaseId", c.address AS "relatedAddress",
           COUNT(DISTINCT conn.counterparty_address) AS "sharedCounterparties"
    FROM connections conn
    JOIN cases c ON conn.case_id = c.id
    WHERE conn.counterparty_address = ANY(${counterparties as any})
    GROUP BY c.address, c.id
    ORDER BY "sharedCounterparties" DESC
    LIMIT 10
  `;

  return result as Array<{ relatedCaseId: string; relatedAddress: string; sharedCounterparties: number }>;
}

// Get vectors from prior cases for similarity matching
export async function getCaseVectors(
  network?: string,
  excludeCaseId?: string,
  limit: number = 200
): Promise<Array<{ caseId: string; address: string; network: string; vector: number[]; summary?: string }>> {
  let result;

  if (network && excludeCaseId) {
    result = await getSql()`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      WHERE network = ${network} AND case_id != ${excludeCaseId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  } else if (network) {
    result = await getSql()`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      WHERE network = ${network}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  } else if (excludeCaseId) {
    result = await getSql()`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      WHERE case_id != ${excludeCaseId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  } else {
    result = await getSql()`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  return (result as any[])
    .map((row: any) => {
      try {
        return {
          caseId: row.case_id,
          address: row.address,
          network: row.network,
          vector: JSON.parse(row.vector_json) as number[],
          summary: row.summary || undefined,
        };
      } catch (error) {
        return null;
      }
    })
    .filter((v: any) => v !== null) as Array<{ caseId: string; address: string; network: string; vector: number[]; summary?: string }>;
}

// Close database (no-op for Vercel Postgres)
export function closeDatabase() {
  // No-op
}

// Update report after async generation completes
export async function updateCaseReport(caseId: string, report: string): Promise<void> {
  await getSql()`UPDATE cases SET report = ${report} WHERE id = ${caseId}`;
}

export default initializeDatabase;

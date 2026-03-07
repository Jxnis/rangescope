// SQLite Database Layer
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type {
  InvestigationResult,
  Connection,
  FundingSource,
  CaseRow,
  ConnectionRow,
  FundingSourceRow,
  CaseVectorRow,
} from '@/types';

// Ensure db directory exists
const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'rangescope.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initializeDatabase() {
  db.exec(`
    -- Core investigation storage
    CREATE TABLE IF NOT EXISTS cases (
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Counterparty relationships (for cross-case matching)
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      source_address TEXT NOT NULL,
      counterparty_address TEXT NOT NULL,
      counterparty_network TEXT,
      counterparty_label TEXT,
      transfer_count INTEGER,
      total_usd REAL,
      risk_level TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    -- Funding origins (for shared-funder detection)
    CREATE TABLE IF NOT EXISTS funding_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      funded_address TEXT NOT NULL,
      funder_address TEXT NOT NULL,
      funder_network TEXT,
      amount_usd REAL,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    -- Local vector memory for cross-case similarity
    CREATE TABLE IF NOT EXISTS case_vectors (
      case_id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      network TEXT NOT NULL,
      vector_json TEXT NOT NULL,
      summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    -- Indexes for pattern matching
    CREATE INDEX IF NOT EXISTS idx_connections_counterparty ON connections(counterparty_address);
    CREATE INDEX IF NOT EXISTS idx_funding_funder ON funding_sources(funder_address);
    CREATE INDEX IF NOT EXISTS idx_cases_address ON cases(address, network);
    CREATE INDEX IF NOT EXISTS idx_cases_risk ON cases(risk_level);
    CREATE INDEX IF NOT EXISTS idx_vectors_address_network ON case_vectors(address, network);
  `);
}

// Initialize on import
initializeDatabase();

// Save investigation case
export function saveCase(investigation: InvestigationResult): void {
  const stmt = db.prepare(`
    INSERT INTO cases (
      id, address, network, timestamp, risk_level, risk_score,
      is_sanctioned, entity_name, entity_category, labels,
      funded_by, confidence, report, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    investigation.id,
    investigation.address,
    investigation.network,
    investigation.timestamp,
    investigation.risk.riskLevel,
    investigation.risk.riskScore || null,
    investigation.sanctions.isSanctioned ? 1 : 0,
    investigation.entity.name || null,
    investigation.entity.category || null,
    JSON.stringify(investigation.entity.labels || []),
    investigation.fundingOrigin ? JSON.stringify(investigation.fundingOrigin) : null,
    investigation.confidence,
    investigation.report,
    JSON.stringify(investigation)
  );
}

// Save connections
export function saveConnections(caseId: string, sourceAddress: string, connections: Connection[]): void {
  const stmt = db.prepare(`
    INSERT INTO connections (
      case_id, source_address, counterparty_address, counterparty_network,
      counterparty_label, transfer_count, total_usd, risk_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((connections: Connection[]) => {
    for (const conn of connections) {
      stmt.run(
        caseId,
        sourceAddress,
        conn.address,
        conn.network || null,
        conn.label || null,
        conn.transferCount || null,
        conn.totalUSD || null,
        conn.riskLevel || null
      );
    }
  });

  insertMany(connections);
}

// Save funding source
export function saveFundingSource(caseId: string, fundedAddress: string, funder: FundingSource): void {
  const stmt = db.prepare(`
    INSERT INTO funding_sources (
      case_id, funded_address, funder_address, funder_network, amount_usd
    ) VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    caseId,
    fundedAddress,
    funder.funderAddress,
    funder.funderNetwork || null,
    funder.amountUSD || null
  );
}

// Save/update vector memory for case
export function saveCaseVector(
  caseId: string,
  address: string,
  network: string,
  vector: number[],
  summary?: string
): void {
  const stmt = db.prepare(`
    INSERT INTO case_vectors (case_id, address, network, vector_json, summary)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(case_id) DO UPDATE SET
      vector_json = excluded.vector_json,
      summary = excluded.summary
  `);

  stmt.run(
    caseId,
    address,
    network,
    JSON.stringify(vector),
    summary || null
  );
}

// Get case by ID
export function getCaseById(id: string): InvestigationResult | null {
  const stmt = db.prepare('SELECT * FROM cases WHERE id = ?');
  const row = stmt.get(id) as CaseRow | undefined;

  if (!row) return null;

  const parsed = JSON.parse(row.raw_data) as InvestigationResult;

  // Keep report column as source of truth when raw_data lags behind updates.
  if (row.report && parsed.report !== row.report) {
    parsed.report = row.report;
  }

  return parsed;
}

// Get all cases
export function getAllCases(limit: number = 50, offset: number = 0): CaseRow[] {
  const stmt = db.prepare(`
    SELECT id, address, network, timestamp, risk_level, risk_score,
           is_sanctioned, entity_name, confidence, created_at
    FROM cases
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(limit, offset) as CaseRow[];
}

// Find cases by address
export function findCasesByAddress(address: string, network?: string): CaseRow[] {
  let stmt;
  if (network) {
    stmt = db.prepare('SELECT * FROM cases WHERE address = ? AND network = ? ORDER BY created_at DESC');
    return stmt.all(address, network) as CaseRow[];
  } else {
    stmt = db.prepare('SELECT * FROM cases WHERE address = ? ORDER BY created_at DESC');
    return stmt.all(address) as CaseRow[];
  }
}

// Get latest saved investigation snapshot for an address/network
export function getLatestCaseByAddress(address: string, network: string): InvestigationResult | null {
  const rows = findCasesByAddress(address, network);
  if (rows.length === 0) return null;

  for (const row of rows) {
    const parsed = JSON.parse(row.raw_data) as InvestigationResult;
    if (row.report && parsed.report !== row.report) {
      parsed.report = row.report;
    }

    const hasUsableRisk = !!parsed.risk && !parsed.risk.error && parsed.risk.riskLevel !== 'UNKNOWN';
    const hasUsableSanctions = !!parsed.sanctions && !parsed.sanctions.error;
    if (hasUsableRisk && hasUsableSanctions) {
      return parsed;
    }
  }

  // Fallback to latest row if none are fully usable.
  const latest = rows[0];
  const parsedLatest = JSON.parse(latest.raw_data) as InvestigationResult;
  if (latest.report && parsedLatest.report !== latest.report) {
    parsedLatest.report = latest.report;
  }
  return parsedLatest;
}

// Pattern matching: Find shared funders
export function findSharedFunders(
  address: string
): Array<{ relatedCaseId: string; relatedAddress: string; sharedFunder: string }> {
  const stmt = db.prepare(`
    SELECT DISTINCT c2.id AS relatedCaseId, c2.address AS relatedAddress, f.funder_address AS sharedFunder
    FROM funding_sources f
    JOIN cases c1 ON f.case_id = c1.id
    JOIN funding_sources f2 ON f.funder_address = f2.funder_address AND f.case_id != f2.case_id
    JOIN cases c2 ON f2.case_id = c2.id
    WHERE c1.address = ?
  `);

  return stmt.all(address) as Array<{ relatedCaseId: string; relatedAddress: string; sharedFunder: string }>;
}

// Pattern matching: Find counterparty overlap
export function findCounterpartyOverlap(caseId: string): Array<{ relatedCase: string; sharedCounterparties: number }> {
  const stmt = db.prepare(`
    SELECT c2.address AS relatedCase, COUNT(*) AS sharedCounterparties
    FROM connections conn1
    JOIN connections conn2 ON conn1.counterparty_address = conn2.counterparty_address
      AND conn1.case_id != conn2.case_id
    JOIN cases c2 ON conn2.case_id = c2.id
    WHERE conn1.case_id = ?
    GROUP BY c2.address
    ORDER BY sharedCounterparties DESC
    LIMIT 10
  `);

  return stmt.all(caseId) as Array<{ relatedCase: string; sharedCounterparties: number }>;
}

// Pattern matching: Find overlap between current counterparties and historical cases
export function findCounterpartyOverlapByAddresses(
  counterparties: string[]
): Array<{ relatedCaseId: string; relatedAddress: string; sharedCounterparties: number }> {
  if (counterparties.length === 0) return [];

  const placeholders = counterparties.map(() => '?').join(', ');
  const stmt = db.prepare(`
    SELECT c.id AS relatedCaseId, c.address AS relatedAddress, COUNT(DISTINCT conn.counterparty_address) AS sharedCounterparties
    FROM connections conn
    JOIN cases c ON conn.case_id = c.id
    WHERE conn.counterparty_address IN (${placeholders})
    GROUP BY c.address
    ORDER BY sharedCounterparties DESC
    LIMIT 10
  `);

  return stmt.all(...counterparties) as Array<{ relatedCaseId: string; relatedAddress: string; sharedCounterparties: number }>;
}

// Get vectors from prior cases for similarity matching
export function getCaseVectors(
  network?: string,
  excludeCaseId?: string,
  limit: number = 200
): Array<{ caseId: string; address: string; network: string; vector: number[]; summary?: string }> {
  let rows: CaseVectorRow[] = [];

  if (network && excludeCaseId) {
    const stmt = db.prepare(`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      WHERE network = ? AND case_id != ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    rows = stmt.all(network, excludeCaseId, limit) as CaseVectorRow[];
  } else if (network) {
    const stmt = db.prepare(`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      WHERE network = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    rows = stmt.all(network, limit) as CaseVectorRow[];
  } else if (excludeCaseId) {
    const stmt = db.prepare(`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      WHERE case_id != ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    rows = stmt.all(excludeCaseId, limit) as CaseVectorRow[];
  } else {
    const stmt = db.prepare(`
      SELECT case_id, address, network, vector_json, summary, created_at
      FROM case_vectors
      ORDER BY created_at DESC
      LIMIT ?
    `);
    rows = stmt.all(limit) as CaseVectorRow[];
  }

  return rows
    .map((row): { caseId: string; address: string; network: string; vector: number[]; summary?: string } | null => {
      try {
        const parsed = {
          caseId: row.case_id,
          address: row.address,
          network: row.network,
          vector: JSON.parse(row.vector_json) as number[],
        };

        if (row.summary) {
          return { ...parsed, summary: row.summary };
        }

        return parsed;
      } catch {
        return null;
      }
    })
    .filter((row) => row !== null) as Array<{
      caseId: string;
      address: string;
      network: string;
      vector: number[];
      summary?: string;
    }>;
}

// Close database (for cleanup)
export function closeDatabase() {
  db.close();
}

// Update report after async generation completes
export function updateCaseReport(caseId: string, report: string): void {
  const stmt = db.prepare('UPDATE cases SET report = ? WHERE id = ?');
  stmt.run(report, caseId);
}

export default db;

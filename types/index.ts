// Investigation Types
export interface InvestigationResult {
  id: string;
  address: string;
  network: string;
  timestamp: string;
  risk: AddressRisk;
  sanctions: SanctionsResult;
  entity: EntityInfo;
  connections: Connection[];
  fundingOrigin: FundingSource | null;
  assetFlow: AssetFlow | null;
  stats: AddressFeatures | null;
  hop2Risks: Hop2RiskResult[];
  patterns: PatternMatch[];
  report: string;
  apiCallCount: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
}

// Risk Types
export interface AddressRisk {
  address: string;
  network: string;
  riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  riskScore?: number;
  reasons?: string[];
  error?: string;
}

export interface SanctionsResult {
  address: string;
  isSanctioned: boolean;
  isBlacklisted: boolean;
  details?: string[];
  error?: string;
}

// Entity Types
export interface EntityInfo {
  address: string;
  name?: string;
  category?: string;
  labels?: string[];
  tags?: string[];
}

// Connection Types
export interface Connection {
  address: string;
  network?: string;
  label?: string;
  transferCount?: number;
  totalUSD?: number;
  riskLevel?: string;
}

// Funding Types
export interface FundingSource {
  funderAddress: string;
  funderNetwork?: string;
  amount?: number;
  amountUSD?: number;
}

// Asset Flow Types
export interface AssetFlow {
  address: string;
  flows: TokenFlow[];
}

export interface TokenFlow {
  token: string;
  symbol?: string;
  inflow: number;
  outflow: number;
  net: number;
}

// Address Features/Stats
export interface AddressFeatures {
  address: string;
  transactionCount?: number;
  totalVolume?: number;
  totalVolumeUSD?: number;
  counterparties?: number;
  activeDays?: number;
  firstSeen?: string;
  lastSeen?: string;
}

// Hop 2 Risk
export interface Hop2RiskResult {
  address: string;
  riskLevel: string;
  riskScore?: number;
}

// Pattern Matching
export interface PatternMatch {
  type: 'shared_funder' | 'counterparty_overlap' | 'behavioral_similarity';
  relatedCases: string[];
  details: string;
  confidence: number;
}

// Graph Types
export interface GraphNode {
  id: string;
  label: string;
  risk: string;
  color: string;
  isRoot: boolean;
  isSanctioned: boolean;
  entity?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
  usdVolume?: number;
}

// Database Types
export interface CaseRow {
  id: string;
  address: string;
  network: string;
  timestamp: string;
  risk_level: string;
  risk_score: number | null;
  is_sanctioned: number;
  entity_name: string | null;
  entity_category: string | null;
  labels: string;
  funded_by: string | null;
  confidence: string;
  report: string;
  raw_data: string;
  created_at: string;
}

export interface ConnectionRow {
  id: number;
  case_id: string;
  source_address: string;
  counterparty_address: string;
  counterparty_network: string | null;
  counterparty_label: string | null;
  transfer_count: number;
  total_usd: number | null;
  risk_level: string | null;
}

export interface FundingSourceRow {
  id: number;
  case_id: string;
  funded_address: string;
  funder_address: string;
  funder_network: string | null;
  amount_usd: number | null;
}

export interface CaseVectorRow {
  case_id: string;
  address: string;
  network: string;
  vector_json: string;
  summary: string | null;
  created_at: string;
}

import { NextRequest, NextResponse } from 'next/server';
import { getAllCases, initializeDatabase } from '@/lib/db-postgres';

/**
 * GET /api/cases
 * List all investigations
 */
export async function GET(request: NextRequest) {
  // Ensure tables exist
  await initializeDatabase();

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const caseRows = await getAllCases(limit, offset);
  const cases = caseRows.map((row) => ({
    id: row.id,
    address: row.address,
    network: row.network,
    timestamp: row.timestamp,
    riskLevel: row.risk_level || 'UNKNOWN',
    riskScore: row.risk_score,
    isSanctioned: Boolean(row.is_sanctioned),
    entityName: row.entity_name || undefined,
    confidence: row.confidence,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    cases,
    limit,
    offset,
    count: cases.length,
  });
}

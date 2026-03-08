import { NextRequest, NextResponse } from 'next/server';
import { getCaseById, findCounterpartyOverlap, initializeDatabase } from '@/lib/db-postgres';

/**
 * GET /api/cases/[id]
 * Get single investigation with patterns
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Ensure tables exist
  await initializeDatabase();
  
  const caseData = await getCaseById(id);

  if (!caseData) {
    return NextResponse.json(
      { error: 'Case not found' },
      { status: 404 }
    );
  }

  // Get pattern matches
  const counterpartyOverlap = await findCounterpartyOverlap(id);

  return NextResponse.json({
    case: caseData,
    patterns: {
      counterpartyOverlap,
    },
  });
}

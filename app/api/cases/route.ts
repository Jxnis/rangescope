import { NextRequest, NextResponse } from 'next/server';
import { getAllCases } from '@/lib/db';

/**
 * GET /api/cases
 * List all investigations
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const cases = getAllCases(limit, offset);

  return NextResponse.json({
    cases,
    limit,
    offset,
    count: cases.length,
  });
}

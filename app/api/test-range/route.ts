import { NextResponse } from 'next/server';
import { getAddressRisk, checkSanctions, getAddressInfo, resetCallCount, getCallCount } from '@/lib/range';

// Test endpoint for Range API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const network = searchParams.get('network') || 'ethereum';

  resetCallCount();

  try {
    console.log(`Testing Range API with address: ${address} on network: ${network}`);

    // Test 3 key endpoints in parallel
    const [riskResult, sanctionsResult, entityResult] = await Promise.all([
      getAddressRisk(address, network),
      checkSanctions(address, network, true),
      getAddressInfo(address, network),
    ]);

    const callsUsed = getCallCount();

    return NextResponse.json({
      success: true,
      address,
      network,
      callsUsed,
      results: {
        risk: riskResult,
        sanctions: sanctionsResult,
        entity: entityResult,
      },
    });
  } catch (error: any) {
    console.error('Range API test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        callsUsed: getCallCount(),
      },
      { status: 500 }
    );
  }
}

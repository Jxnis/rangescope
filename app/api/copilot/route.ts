import { NextRequest } from 'next/server';
import { generateCopilotResponse } from '@/lib/gemini';
import { getCaseById } from '@/lib/db';
import {
  getAddressRisk,
  checkSanctions,
  getAddressConnections,
  getAddressAssetFlow,
  getAddressFeatures,
  getTransfers,
  getAddressInfo,
  getAddressFundedBy,
  resetCallCount,
} from '@/lib/range';

const COPILOT_SYSTEM = `You are the RangeScope Investigation Copilot — an AI assistant specialized in blockchain forensics and compliance analysis.

You have access to real-time blockchain intelligence from the Range API. When users ask questions about a wallet being investigated, you can pull live data to answer.

Capabilities:
- Explain risk scores, sanctions flags, and entity attributions
- Analyze transaction patterns and counterparty networks
- Trace funding sources and asset flows
- Compare behavioral patterns across investigations
- Generate compliance-ready summaries

Rules:
- Be precise and cite specific data (addresses, amounts, timestamps)
- If data is unavailable or inconclusive, say so — never speculate
- Format responses in clean markdown
- Keep responses concise but thorough
- When referencing addresses, truncate them (0x1234...5678)
- Always contextualize findings for compliance teams`;

/**
 * POST /api/copilot
 * Chat with the Investigation Copilot
 */
export async function POST(request: NextRequest) {
  const { message, caseId, address, network, context } = await request.json();

  if (!message) {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  try {
    // Build context from case data
    let caseContext = context || '';

    if (caseId) {
      const caseData = getCaseById(caseId);
      if (caseData) {
        caseContext = `Current investigation context:
Address: ${caseData.address}
Network: ${caseData.network}
Risk Level: ${caseData.risk?.riskLevel} (Score: ${caseData.risk?.riskScore})
Sanctions: ${caseData.sanctions?.isSanctioned ? 'SANCTIONED' : 'Clean'}
Entity: ${caseData.entity?.name || 'Unknown'} (${caseData.entity?.category || 'N/A'})
Connections: ${caseData.connections?.length || 0} counterparties
Funded By: ${caseData.fundingOrigin?.funderAddress || 'Unknown'}
Confidence: ${caseData.confidence}
Patterns: ${caseData.patterns?.length || 0} cross-case matches`;
      }
    }

    // Check if the user's question requires a live API call
    const lowerMsg = message.toLowerCase();
    let liveData = '';

    resetCallCount();

    if (lowerMsg.includes('risk') || lowerMsg.includes('score') || lowerMsg.includes('dangerous')) {
      if (address && network) {
        const risk = await getAddressRisk(address, network);
        liveData += `\n\nLive Risk Data: ${JSON.stringify(risk, null, 2)}`;
      }
    }

    if (lowerMsg.includes('sanction') || lowerMsg.includes('ofac') || lowerMsg.includes('blacklist')) {
      if (address && network) {
        const sanctions = await checkSanctions(address, network, true);
        liveData += `\n\nLive Sanctions Data: ${JSON.stringify(sanctions, null, 2)}`;
      }
    }

    if (lowerMsg.includes('connect') || lowerMsg.includes('counterpart') || lowerMsg.includes('transact')) {
      if (address && network) {
        const connections = await getAddressConnections(address, network, 5);
        liveData += `\n\nLive Connection Data: ${JSON.stringify(connections, null, 2)}`;
      }
    }

    if (lowerMsg.includes('fund') || lowerMsg.includes('origin') || lowerMsg.includes('source')) {
      if (address && network) {
        const funding = await getAddressFundedBy(address, network);
        liveData += `\n\nLive Funding Data: ${JSON.stringify(funding, null, 2)}`;
      }
    }

    if (lowerMsg.includes('balance') || lowerMsg.includes('hold') || lowerMsg.includes('asset')) {
      if (address && network) {
        const flow = await getAddressAssetFlow(address, network);
        liveData += `\n\nLive Asset Flow Data: ${JSON.stringify(flow, null, 2)}`;
      }
    }

    if (lowerMsg.includes('transfer') || lowerMsg.includes('transaction') || lowerMsg.includes('history')) {
      if (address && network) {
        const transfers = await getTransfers(address, network, 10);
        liveData += `\n\nLive Transfer Data: ${JSON.stringify(transfers, null, 2)}`;
      }
    }

    if (lowerMsg.includes('who') || lowerMsg.includes('entity') || lowerMsg.includes('label') || lowerMsg.includes('identify')) {
      if (address && network) {
        const info = await getAddressInfo(address, network);
        liveData += `\n\nLive Entity Data: ${JSON.stringify(info, null, 2)}`;
      }
    }

    // Generate response
    const fullPrompt = `${COPILOT_SYSTEM}

${caseContext}
${liveData}

User Question: ${message}

Respond in markdown. Be concise but thorough.`;

    const response = await generateCopilotResponse(fullPrompt);

    return Response.json({ response });
  } catch (error: any) {
    console.error('Copilot error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    );
  }
}

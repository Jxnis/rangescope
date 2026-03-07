import { NextRequest } from 'next/server';
import { runInvestigation, type InvestigationStep } from '@/lib/investigation';
import { generateInvestigationReport } from '@/lib/gemini';
import { getCaseById, updateCaseReport } from '@/lib/db';
import { getRiskColor } from '@/lib/utils';
import type { GraphNode, GraphLink } from '@/types';

// System prompt for report generation
const REPORT_PROMPT = `You are a blockchain forensics analyst. Given investigation data for a wallet address,
produce a structured investigation report in markdown.

## Report Structure:
1. **Executive Summary** — 2-3 sentences: who is this wallet, what's the risk level, key finding
2. **Risk Assessment** — Risk score, sanctions status, confidence level
3. **Entity Profile** — Known labels, category, behavioral stats
4. **Fund Flow Analysis** — Where funds came from, top counterparties, asset distribution
5. **Cross-Case Intelligence** — Any pattern matches with previous investigations (shared funders, counterparty overlap)
6. **Conclusion & Recommendation** — Clear risk determination: CLEAR / MONITOR / SUSPICIOUS / BLOCK

Rules:
- Be precise. Cite specific addresses, amounts, and labels.
- If data is missing or inconclusive, say "insufficient evidence" — never speculate.
- Use risk levels: VERY_LOW, LOW, MEDIUM, HIGH, CRITICAL.
- Do not invent investigation dates; only use a date if explicitly present in the input data.
- Keep it concise — this is a compliance-ready report, not an essay.`;

/**
 * POST /api/investigate
 * Runs investigation and streams progress via SSE
 */
export async function POST(request: NextRequest) {
  const { address, network } = await request.json();

  if (!address || !network) {
    return new Response(
      JSON.stringify({ error: 'address and network are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        // Run investigation with step callbacks
        const result = await runInvestigation(address, network, (step: InvestigationStep) => {
          sendEvent('step', step);
        });

        // Build graph data
        const graphData = buildGraphData(result);
        sendEvent('graph', graphData);

        // Generate AI report
        sendEvent('report_start', { status: 'generating' });

        const report = await generateInvestigationReport(
          {
            address: result.address,
            network: result.network,
            timestamp: result.timestamp,
            risk: result.risk,
            sanctions: result.sanctions,
            entity: result.entity,
            fundingOrigin: result.fundingOrigin,
            connections: result.connections,
            patterns: result.patterns,
            stats: result.stats,
            confidence: result.confidence,
          },
          REPORT_PROMPT
        );

        // Update case with report
        result.report = report;
        updateCaseReport(result.id, report);

        // Send report
        sendEvent('report', { content: report });

        // Send completion
        sendEvent('done', { caseId: result.id });

        controller.close();
      } catch (error: any) {
        console.error('Investigation stream error:', error);
        sendEvent('error', { message: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * GET /api/investigate?caseId=...
 * Retrieve a completed investigation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');

  if (!caseId) {
    return new Response(
      JSON.stringify({ error: 'caseId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const investigation = getCaseById(caseId);

  if (!investigation) {
    return new Response(
      JSON.stringify({ error: 'Investigation not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(investigation), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Build graph data from investigation result
 */
function buildGraphData(result: any): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNodeIds = new Set<string>();

  // Root node (investigated address)
  const rootRisk = result.risk?.riskLevel || 'UNKNOWN';
  addNode({
    id: result.address,
    label: result.entity?.name || truncateAddress(result.address),
    risk: rootRisk,
    color: getRiskColor(rootRisk),
    isRoot: true,
    isSanctioned: result.sanctions?.isSanctioned || false,
    entity: result.entity?.name,
  });

  // Funding origin node
  if (result.fundingOrigin) {
    const funderId = result.fundingOrigin.funderAddress;
    const isSelfFunding = funderId === result.address;

    if (funderId && !isSelfFunding) {
      addNode({
        id: funderId,
        label: truncateAddress(funderId),
        risk: 'UNKNOWN',
        color: getRiskColor('UNKNOWN'),
        isRoot: false,
        isSanctioned: false,
      });

      links.push({
        source: funderId,
        target: result.address,
        label: 'funded',
        usdVolume: result.fundingOrigin.amountUSD,
      });
    }
  }

  // Counterparty nodes (top 10)
  const topCounterparties = result.connections.slice(0, 10);
  for (const conn of topCounterparties) {
    const counterpartyId = conn.address;
    if (!counterpartyId || counterpartyId === result.address) continue;

    // Find risk from hop2
    const hop2Risk = result.hop2Risks.find((r: any) => r.address === counterpartyId);

    addNode({
      id: counterpartyId,
      label: conn.label || truncateAddress(counterpartyId),
      risk: hop2Risk?.riskLevel || 'UNKNOWN',
      color: getRiskColor(hop2Risk?.riskLevel || 'UNKNOWN'),
      isRoot: false,
      isSanctioned: false,
      entity: conn.label,
    });

    links.push({
      source: result.address,
      target: counterpartyId,
      label: 'counterparty',
      usdVolume: conn.totalUSD,
    });
  }

  return { nodes, links };

  function addNode(node: GraphNode) {
    if (seenNodeIds.has(node.id)) return;
    seenNodeIds.add(node.id);
    nodes.push(node);
  }
}

function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

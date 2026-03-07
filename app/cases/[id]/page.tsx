'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RiskScorecard } from '@/components/RiskScorecard';
import { ConnectionGraph } from '@/components/ConnectionGraph';
import { InvestigationReport } from '@/components/InvestigationReport';
import { PatternAlerts } from '@/components/PatternAlerts';
import type { InvestigationResult, GraphNode, GraphLink } from '@/types';

interface CasePageProps {
  params: Promise<{ id: string }>;
}

export default function CasePage({ params }: CasePageProps) {
  const { id } = use(params);
  const [caseData, setCaseData] = useState<InvestigationResult | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCase() {
      try {
        const response = await fetch(`/api/cases/${id}`);
        if (!response.ok) {
          throw new Error('Case not found');
        }
        const data = await response.json();
        const casePayload = data?.case ?? data;
        setCaseData(casePayload);

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const seenNodeIds = new Set<string>();

        const addNode = (node: GraphNode) => {
          if (seenNodeIds.has(node.id)) return;
          seenNodeIds.add(node.id);
          nodes.push(node);
        };

        addNode({
          id: casePayload.address,
          label: casePayload.entity?.name || casePayload.address.slice(0, 6) + '...' + casePayload.address.slice(-4),
          risk: casePayload.risk?.riskLevel || 'UNKNOWN',
          color: getRiskColorHex(casePayload.risk?.riskLevel || 'UNKNOWN'),
          isRoot: true,
          isSanctioned: casePayload.sanctions?.isSanctioned || false,
          entity: casePayload.entity?.name,
        });

        if (casePayload.fundingOrigin?.funderAddress && casePayload.fundingOrigin.funderAddress !== casePayload.address) {
          addNode({
            id: casePayload.fundingOrigin.funderAddress,
            label: casePayload.fundingOrigin.funderAddress.slice(0, 6) + '...' + casePayload.fundingOrigin.funderAddress.slice(-4),
            risk: 'UNKNOWN',
            color: '#6b7280',
            isRoot: false,
            isSanctioned: false,
          });

          links.push({
            source: casePayload.fundingOrigin.funderAddress,
            target: casePayload.address,
            label: 'funded',
            usdVolume: casePayload.fundingOrigin.amountUSD,
          });
        }

        const topConnections = (casePayload.connections || []).slice(0, 10);
        for (const conn of topConnections) {
          if (!conn.address || conn.address === casePayload.address) continue;
          const hop2Risk = casePayload.hop2Risks?.find((r: any) => r.address === conn.address);

          addNode({
            id: conn.address,
            label: conn.label || conn.address.slice(0, 6) + '...' + conn.address.slice(-4),
            risk: hop2Risk?.riskLevel || 'UNKNOWN',
            color: getRiskColorHex(hop2Risk?.riskLevel || 'UNKNOWN'),
            isRoot: false,
            isSanctioned: false,
            entity: conn.label,
          });

          links.push({
            source: casePayload.address,
            target: conn.address,
            label: 'counterparty',
            usdVolume: conn.totalUSD,
          });
        }

        setGraphData({ nodes, links });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchCase();
    }
  }, [id]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !caseData) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <Link href="/" className="text-3xl font-heading hover:opacity-80 transition-opacity">
              RangeScope
            </Link>
            <ThemeToggle />
          </header>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-heading mb-4 text-red-500">Case Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'The requested case does not exist'}</p>
            <Link
              href="/cases"
              className="inline-block px-6 py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
            >
              View All Cases
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex justify-between items-center mb-8">
          <Link href="/" className="text-2xl font-heading hover:opacity-80 transition-opacity">
            RangeScope
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/cases" className="text-sm font-medium hover:text-muted-foreground transition-colors">
              All Cases
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Case Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-heading">Investigation</h1>
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm font-medium">
              Complete
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{caseData.address}</span>
            <span>•</span>
            <span className="capitalize">{caseData.network}</span>
            <span>•</span>
            <span>{new Date(caseData.timestamp).toLocaleString()}</span>
          </div>
        </div>

        {/* Pattern Alerts */}
        {caseData.patterns && caseData.patterns.length > 0 && (
          <div className="mb-8">
            <PatternAlerts patterns={caseData.patterns} />
          </div>
        )}

        {/* 3-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Risk Scorecard */}
          <div className="lg:col-span-1">
            <RiskScorecard result={caseData} />
          </div>

          {/* Middle: Connection Graph */}
          {graphData && (
            <div className="lg:col-span-2">
              <ConnectionGraph nodes={graphData.nodes} links={graphData.links} />
            </div>
          )}

          {/* Bottom: Investigation Report (full width) */}
          <div className="lg:col-span-3">
            <InvestigationReport report={caseData.report} caseId={caseData.id} />
          </div>
        </div>
      </div>
    </main>
  );
}

function getRiskColorHex(riskLevel: string): string {
  const colors: Record<string, string> = {
    VERY_LOW: '#22c55e',
    LOW: '#84cc16',
    MEDIUM: '#eab308',
    HIGH: '#f97316',
    CRITICAL: '#ef4444',
    UNKNOWN: '#6b7280',
  };
  return colors[riskLevel] || colors.UNKNOWN;
}

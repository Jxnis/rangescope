'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StepProgress } from '@/components/StepProgress';
import { RiskScorecard } from '@/components/RiskScorecard';
import { ConnectionGraph } from '@/components/ConnectionGraph';
import { InvestigationReport } from '@/components/InvestigationReport';
import { PatternAlerts } from '@/components/PatternAlerts';
import { InvestigationCopilot } from '@/components/InvestigationCopilot';
import { DashboardSkeleton } from '@/components/Skeleton';
import type { InvestigationResult, GraphNode, GraphLink } from '@/types';

function InvestigateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const address = searchParams.get('address');
  const network = searchParams.get('network');

  const [currentStep, setCurrentStep] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);
  const [report, setReport] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!address || !network) {
      router.push('/');
      return;
    }

    setCurrentStep('');
    setCompletedSteps(new Set());
    setError(null);
    setResult(null);
    setGraphData(null);
    setReport('');
    setIsComplete(false);

    const abortController = new AbortController();
    let aborted = false;

    async function startInvestigation() {
      try {
        const response = await fetch('/api/investigate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, network }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Investigation request failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        let currentEvent = '';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (aborted) break;

            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                continue;
              }

              if (currentEvent === 'step') {
                if (data.status === 'running') {
                  setCurrentStep(data.step);
                } else if (data.status === 'done') {
                  setCompletedSteps((prev) => new Set([...prev, data.step]));
                } else if (data.status === 'error') {
                  setError(data.error || 'Step failed');
                }
              } else if (currentEvent === 'graph') {
                setGraphData(data);
              } else if (currentEvent === 'report_start') {
                setCurrentStep('report_generation');
              } else if (currentEvent === 'report') {
                setReport(data.content);
                setCompletedSteps((prev) => new Set([...prev, 'report_generation']));
              } else if (currentEvent === 'done') {
                setIsComplete(true);
                setCurrentStep('');

                if (data.caseId) {
                  fetch(`/api/cases/${data.caseId}`)
                    .then((res) => res.json())
                    .then((caseData) => setResult(caseData?.case ?? caseData))
                    .catch((err) => console.error('Failed to fetch case:', err));
                }
              } else if (currentEvent === 'error') {
                setError(data.message || 'Investigation failed');
                break;
              }

              currentEvent = ''; // Reset after processing
            }
          }
        }
      } catch (err: any) {
        if (!aborted && err?.name !== 'AbortError') {
          setError(err.message || 'Investigation failed');
        }
      }
    }

    const startTimer = window.setTimeout(() => {
      if (!aborted) {
        startInvestigation();
      }
    }, 0);

    return () => {
      aborted = true;
      window.clearTimeout(startTimer);
      abortController.abort();
    };
  }, [address, network, router]);

  if (!address || !network) {
    return null;
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <Link href="/" className="text-3xl font-heading hover:opacity-80 transition-opacity">
              RangeScope
            </Link>
            <ThemeToggle />
          </header>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-heading mb-4 text-red-500">Investigation Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Top Navigation */}
        <header className="flex justify-between items-center mb-10">
          <Link href="/" className="text-2xl font-heading hover:opacity-80 transition-opacity">
            RangeScope
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              All Cases
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Investigation Header Card */}
        <div className="mb-8 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-heading">Live Investigation</h1>
                {isComplete ? (
                  <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Complete
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-xs font-medium flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Running
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Address:</span>
                  <code className="font-mono text-foreground bg-background px-2 py-1 rounded border border-border">{address}</code>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="capitalize font-medium text-foreground">{network}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Progress */}
        {!isComplete && (
          <div className="mb-8">
            <StepProgress currentStep={currentStep} completedSteps={completedSteps} />
          </div>
        )}

        {/* Pattern Alerts */}
        {result?.patterns && result.patterns.length > 0 && (
          <div className="mb-8">
            <PatternAlerts patterns={result.patterns} />
          </div>
        )}

        {/* 3-Panel Layout */}
        {isComplete && result && graphData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left: Risk Scorecard */}
            <div className="lg:col-span-1">
              <RiskScorecard result={result} />
            </div>

            {/* Middle: Connection Graph */}
            <div className="lg:col-span-2">
              <ConnectionGraph nodes={graphData.nodes} links={graphData.links} />
            </div>

            {/* Bottom: Investigation Report (full width) */}
            <div className="lg:col-span-3">
              <InvestigationReport report={report} caseId={result.id} />
            </div>
          </div>
        ) : !isComplete && !error ? (
          <DashboardSkeleton />
        ) : null}

        {/* Copilot FAB */}
        {address && network && (
          <InvestigationCopilot
            caseId={result?.id}
            address={address}
            network={network}
          />
        )}
      </div>
    </main>
  );
}

export default function InvestigatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <InvestigateContent />
    </Suspense>
  );
}

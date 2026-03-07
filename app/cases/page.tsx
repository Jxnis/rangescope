'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getRiskColor } from '@/lib/utils';

interface Case {
  id: string;
  address: string;
  network: string;
  timestamp: string;
  riskLevel: string;
  isSanctioned: boolean;
  entityName?: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCases() {
      try {
        const response = await fetch('/api/cases?limit=50');
        if (!response.ok) {
          throw new Error('Failed to fetch cases');
        }
        const data = await response.json();
        setCases(data.cases || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCases();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <Link href="/" className="text-3xl font-heading hover:opacity-80 transition-opacity">
            RangeScope
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium hover:text-muted-foreground transition-colors"
            >
              New Investigation
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="mb-8">
          <h1 className="text-4xl font-heading mb-2">Case History</h1>
          <p className="text-muted-foreground">
            All previous wallet investigations and forensic reports
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground mb-6">No investigations yet</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
            >
              Start First Investigation
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {cases.map((caseItem) => (
              <Link
                key={caseItem.id}
                href={`/cases/${caseItem.id}`}
                className="block bg-card border border-border rounded-2xl p-6 hover:border-foreground/20 transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left: Address and metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getRiskColor(caseItem.riskLevel) }}
                      />
                      <span className="font-mono text-lg truncate">{caseItem.address}</span>
                      {caseItem.isSanctioned && (
                        <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs font-medium flex-shrink-0">
                          SANCTIONED
                        </span>
                      )}
                    </div>

                    {caseItem.entityName && (
                      <div className="text-sm text-muted-foreground mb-2">{caseItem.entityName}</div>
                    )}

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="capitalize">{caseItem.network}</span>
                      <span>•</span>
                      <span>{new Date(caseItem.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="font-mono text-xs">{caseItem.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  {/* Right: Risk badge */}
                  <div className="flex-shrink-0">
                    <div
                      className="px-4 py-2 rounded-xl border-2 font-medium text-sm"
                      style={{ borderColor: getRiskColor(caseItem.riskLevel), color: getRiskColor(caseItem.riskLevel) }}
                    >
                      {caseItem.riskLevel.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

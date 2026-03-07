'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRiskColor } from '@/lib/utils';

interface Case {
  id: string;
  address: string;
  network: string;
  timestamp: string;
  riskLevel: string;
}

export function RecentCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCases() {
      try {
        const response = await fetch('/api/cases?limit=30');
        if (response.ok) {
          const data = await response.json();
          const allCases: Case[] = data.cases || [];
          const seen = new Set<string>();
          const uniqueByAddress = allCases.filter((item) => {
            const key = `${item.address.toLowerCase()}|${item.network.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setCases(uniqueByAddress.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch recent cases:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCases();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No investigations yet. Start your first one above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cases.map((caseItem) => (
        <Link
          key={caseItem.id}
          href={`/cases/${caseItem.id}`}
          className="block p-4 bg-card border border-border rounded-xl hover:border-foreground/20 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getRiskColor(caseItem.riskLevel) }}
                />
                <span className="font-mono text-sm truncate">{caseItem.address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{caseItem.network}</span>
                <span>•</span>
                <span>{new Date(caseItem.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex-shrink-0 ml-4">
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-background">
                {caseItem.riskLevel?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

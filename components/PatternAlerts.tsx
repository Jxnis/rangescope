'use client';

import Link from 'next/link';
import type { PatternMatch } from '@/types';

interface PatternAlertsProps {
  patterns: PatternMatch[];
}

export function PatternAlerts({ patterns }: PatternAlertsProps) {
  if (patterns.length === 0) return null;

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'shared_funder':
        return '💰';
      case 'counterparty_overlap':
        return '🔗';
      case 'behavioral_similarity':
        return '📊';
      default:
        return '⚠️';
    }
  };

  const getPatternTitle = (type: string) => {
    switch (type) {
      case 'shared_funder':
        return 'Shared Funding Source';
      case 'counterparty_overlap':
        return 'Counterparty Network Overlap';
      case 'behavioral_similarity':
        return 'Behavioral Pattern Match';
      default:
        return 'Pattern Detected';
    }
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return { label: 'Very High', color: 'text-red-500 bg-red-500/20 border-red-500/20' };
    if (confidence >= 0.75) return { label: 'High', color: 'text-orange-500 bg-orange-500/20 border-orange-500/20' };
    if (confidence >= 0.6) return { label: 'Medium', color: 'text-yellow-500 bg-yellow-500/20 border-yellow-500/20' };
    return { label: 'Low', color: 'text-blue-500 bg-blue-500/20 border-blue-500/20' };
  };

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-lg font-heading text-yellow-500 mb-1">Cross-Case Pattern Detected</h3>
          <p className="text-sm text-muted-foreground">
            This investigation matched patterns from {patterns.length} historical case{patterns.length > 1 ? 's' : ''}.
            Review related investigations to identify potential coordination or shared infrastructure.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {patterns.map((pattern, i) => {
          const confidenceInfo = getConfidenceLabel(pattern.confidence);

          return (
            <div key={i} className="bg-background/50 rounded-xl p-5 border border-yellow-500/10 hover:border-yellow-500/20 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getPatternIcon(pattern.type)}</span>
                    <span className="text-sm font-semibold capitalize">
                      {getPatternTitle(pattern.type)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md border ${confidenceInfo.color} font-medium`}>
                      {confidenceInfo.label} ({Math.round(pattern.confidence * 100)}%)
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{pattern.details}</p>
                </div>
              </div>

              {/* Evidence Explanation */}
              <div className="mt-3 p-3 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Why this pattern matched:</p>
                <p className="text-xs text-muted-foreground">
                  {pattern.type === 'shared_funder' && (
                    <>This address shares the same funding source with {pattern.relatedCases.length} previously investigated address{pattern.relatedCases.length > 1 ? 'es' : ''}. This could indicate batch funding, shared infrastructure, or coordinated wallet creation.</>
                  )}
                  {pattern.type === 'counterparty_overlap' && (
                    <>This address transacts with multiple counterparties that were also seen in previous investigations. Significant overlap in transaction networks may indicate coordinated activity or shared business relationships.</>
                  )}
                  {pattern.type === 'behavioral_similarity' && (
                    <>This address exhibits similar behavioral patterns (transaction volume, counterparty count, risk profile) to previously investigated addresses. High similarity (&gt;{(pattern.confidence * 100).toFixed(0)}%) suggests potential clustering or coordinated behavior.</>
                  )}
                </p>
              </div>

              {pattern.relatedCases.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground font-medium">Related cases:</span>
                  {pattern.relatedCases.slice(0, 5).map((caseId) => (
                    <Link
                      key={caseId}
                      href={`/cases/${caseId}`}
                      className="text-xs px-2.5 py-1.5 bg-background border border-border rounded-md hover:border-foreground/30 hover:bg-foreground/5 transition-all font-mono"
                    >
                      {caseId.slice(0, 8)}...
                    </Link>
                  ))}
                  {pattern.relatedCases.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{pattern.relatedCases.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

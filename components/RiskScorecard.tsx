'use client';

import { getRiskColor } from '@/lib/utils';
import type { InvestigationResult } from '@/types';

interface RiskScorecardProps {
  result: InvestigationResult | any;
}

export function RiskScorecard({ result }: RiskScorecardProps) {
  const risk = result?.risk || { riskLevel: 'UNKNOWN' };
  const sanctions = result?.sanctions || { isSanctioned: false, isBlacklisted: false };
  const stats = result?.stats || null;
  const riskLevel = risk.riskLevel || 'UNKNOWN';
  const riskColor = getRiskColor(riskLevel);
  const isSanctioned = sanctions.isSanctioned;
  const isBlacklisted = sanctions.isBlacklisted;
  const txCount = stats?.transactionCount;
  const totalVolumeUSD = stats?.totalVolumeUSD;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      {/* Risk Level */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Risk Assessment</h3>
        <div
          className="px-4 py-3 rounded-xl border-2 flex items-center gap-3"
          style={{ borderColor: riskColor }}
        >
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: riskColor }} />
          <div>
            <div className="font-heading text-lg" style={{ color: riskColor }}>
              {riskLevel.replace('_', ' ')}
            </div>
            {risk.riskScore !== undefined && (
              <div className="text-xs text-muted-foreground">Score: {risk.riskScore}</div>
            )}
          </div>
        </div>
      </div>

      {/* Sanctions Status */}
      {(isSanctioned || isBlacklisted) && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Sanctions</h3>
          <div className="space-y-2">
            {isSanctioned && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-500">Sanctioned</span>
                </div>
                {sanctions.details && sanctions.details.length > 0 && (
                  <div className="mt-1 text-xs text-red-400">{sanctions.details.join(', ')}</div>
                )}
              </div>
            )}
            {isBlacklisted && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-500">Blacklisted</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entity Information */}
      {result.entity?.name && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Entity</h3>
          <div className="px-4 py-3 bg-background rounded-xl border border-border">
            <div className="font-medium mb-1">{result.entity.name}</div>
            {result.entity.category && (
              <div className="text-xs text-muted-foreground capitalize">{result.entity.category}</div>
            )}
            {result.entity.labels && result.entity.labels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {result.entity.labels.map((label: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 bg-card border border-border rounded-md">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Funding Origin */}
      {result.fundingOrigin?.funderAddress && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Funded By</h3>
          <div className="px-4 py-3 bg-background rounded-xl border border-border">
            <div className="font-mono text-xs mb-1 truncate">{result.fundingOrigin.funderAddress}</div>
            {result.fundingOrigin.amountUSD !== undefined && (
              <div className="text-sm font-medium">${result.fundingOrigin.amountUSD.toLocaleString()}</div>
            )}
            {result.fundingOrigin.funderNetwork && (
              <div className="text-xs text-muted-foreground capitalize mt-1">
                {result.fundingOrigin.funderNetwork}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Activity</h3>
          {txCount === undefined && totalVolumeUSD === undefined ? (
            <div className="px-3 py-2 bg-background rounded-lg border border-border text-xs text-muted-foreground">
              No activity metrics available
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
            {txCount !== undefined && (
              <div className="px-3 py-2 bg-background rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Transactions</div>
                <div className="font-medium">{txCount.toLocaleString()}</div>
              </div>
            )}
            {totalVolumeUSD !== undefined && (
              <div className="px-3 py-2 bg-background rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Volume</div>
                <div className="font-medium">${(totalVolumeUSD / 1000).toFixed(0)}K</div>
              </div>
            )}
            </div>
          )}
        </div>
      )}

      {/* Confidence */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Confidence</h3>
        <div className="px-4 py-3 bg-background rounded-xl border border-border">
          <div className="text-sm font-medium capitalize">{result.confidence}</div>
        </div>
      </div>
    </div>
  );
}

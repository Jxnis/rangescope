'use client';

import { getRiskColor } from '@/lib/utils';

interface RiskScorecardProps {
  result: any;
}

function formatVolume(usd: number | undefined, flows?: any[]): string {
  if (usd && usd > 0) {
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
    return `$${usd.toFixed(0)}`;
  }
  // Fallback: calculate total token volume from asset flows
  if (flows && Array.isArray(flows) && flows.length > 0) {
    const totalToken = flows.reduce((sum: number, f: any) => sum + Math.abs(f.amount || 0), 0);
    if (totalToken > 0) {
      let symbol = flows[0]?.token || 'tokens';
      // Truncate long token addresses
      if (symbol.length > 8) {
        symbol = `${symbol.slice(0, 4)}...${symbol.slice(-3)}`;
      }
      if (totalToken >= 1_000) return `${(totalToken / 1_000).toFixed(1)}K ${symbol}`;
      return `${totalToken.toFixed(2)} ${symbol}`;
    }
  }
  return 'N/A';
}

export function RiskScorecard({ result }: RiskScorecardProps) {
  const risk = result?.risk || { riskLevel: 'UNKNOWN' };
  const sanctions = result?.sanctions || { isSanctioned: false, isBlacklisted: false };
  const entity = result?.entity || {};
  const stats = result?.stats || null;
  const assetFlow = result?.assetFlow;
  const connections = result?.connections || [];
  const hop2Risks = result?.hop2Risks || [];
  const riskLevel = risk.riskLevel || 'UNKNOWN';
  const riskColor = getRiskColor(riskLevel);
  const isSanctioned = sanctions.isSanctioned;
  const isBlacklisted = sanctions.isBlacklisted;

  const txCount = stats?.transactionCount;
  const totalVolumeUSD = stats?.totalVolumeUSD;
  const flows = assetFlow?.flows || [];

  // Compute risk score ring percentage
  const riskScore = risk.riskScore || 1;
  const riskPct = Math.min(100, (riskScore / 10) * 100);

  // Calculate Investigation Insights
  const highRiskConnections = hop2Risks.filter(
    (r: any) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL'
  ).length;
  const riskContagion = connections.length > 0
    ? Math.min(100, Math.round((highRiskConnections / Math.min(connections.length, hop2Risks.length)) * 100))
    : 0;

  const hasStrongBehavioralMatch = result?.patterns?.some(
    (p: any) => p.type === 'behavioral_similarity' && p.confidence > 0.75
  );

  const networkCentrality = connections.length > 20 ? 'Hub' : connections.length > 5 ? 'Active' : 'Leaf';

  return (
    <div className="space-y-4">
      {/* Risk Score Card */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          {/* Score Ring */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={riskColor}
                strokeWidth="3"
                strokeDasharray={`${riskPct}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-heading font-bold" style={{ color: riskColor }}>{riskScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
            <div className="text-lg font-heading font-semibold" style={{ color: riskColor }}>
              {riskLevel.replace('_', ' ')}
            </div>
            <div className="text-xs text-muted-foreground capitalize mt-0.5">
              Confidence: {result?.confidence || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Sanctions Alert */}
      {(isSanctioned || isBlacklisted) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold text-red-500">
              {isSanctioned ? 'OFAC Sanctioned' : 'Blacklisted'}
            </span>
          </div>
          {sanctions.details && sanctions.details.length > 0 && (
            <p className="text-xs text-red-400">{sanctions.details.join(', ')}</p>
          )}
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Transactions</div>
          <div className="text-lg font-heading font-semibold">{txCount?.toLocaleString() ?? 'N/A'}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Volume</div>
          <div className="text-lg font-heading font-semibold truncate">{formatVolume(totalVolumeUSD, flows)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Counterparties</div>
          <div className="text-lg font-heading font-semibold">{connections.length || 'N/A'}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Hop-2 Scanned</div>
          <div className="text-lg font-heading font-semibold">{hop2Risks.length || 0}</div>
        </div>
      </div>

      {/* Investigation Insights */}
      <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 7H7v6h6V7z" />
            <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-semibold text-blue-500">Investigation Insights</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Risk Contagion</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-background/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
                  style={{ width: `${riskContagion}%` }}
                />
              </div>
              <span className="font-mono font-semibold text-xs">{riskContagion}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Behavioral Match</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              hasStrongBehavioralMatch
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}>
              {hasStrongBehavioralMatch ? 'Similar to known cases' : 'Unique pattern'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Network Role</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-background/50 border border-border">
              {networkCentrality}
            </span>
          </div>
        </div>
      </div>

      {/* Entity Profile */}
      {(entity.name || entity.category || entity.name_tag) && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Entity Profile</h3>
          <div className="space-y-2">
            {(entity.name || entity.name_tag) && (
              <div>
                <div className="text-sm font-semibold">{entity.name || entity.name_tag}</div>
              </div>
            )}
            {entity.category && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Category:</span>
                <span className="text-xs px-2 py-0.5 bg-background border border-border rounded capitalize">{entity.category}</span>
              </div>
            )}
            {entity.address_role && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Role:</span>
                <span className="text-xs px-2 py-0.5 bg-background border border-border rounded capitalize">{entity.address_role}</span>
              </div>
            )}
            {entity.tags && entity.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {entity.tags.map((tag: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-background border border-border rounded">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Funding Origin */}
      {result?.fundingOrigin?.funderAddress && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Funding Source</h3>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs truncate">{result.fundingOrigin.funderAddress}</div>
              {result.fundingOrigin.amountUSD > 0 && (
                <div className="text-sm font-medium mt-1">${result.fundingOrigin.amountUSD.toLocaleString()}</div>
              )}
              {result.fundingOrigin.funderNetwork && (
                <div className="text-xs text-muted-foreground capitalize mt-0.5">{result.fundingOrigin.funderNetwork}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Counterparties Mini-table */}
      {connections.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Top Counterparties</h3>
          <div className="space-y-2">
            {connections.slice(0, 5).map((conn: any, i: number) => {
              const hop2 = hop2Risks.find((r: any) => r.address === conn.address);
              const connRisk = hop2?.riskLevel || 'UNKNOWN';
              const connColor = getRiskColor(connRisk);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: connColor }} />
                  <span className="font-mono truncate flex-1">{conn.label || `${conn.address?.slice(0, 8)}...${conn.address?.slice(-4)}`}</span>
                  {conn.transferCount !== undefined && (
                    <span className="text-muted-foreground flex-shrink-0">{conn.transferCount} txs</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Flow Summary */}
      {flows.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Asset Flow</h3>
          <div className="space-y-2.5">
            {flows.slice(0, 10).map((flow: any, i: number) => {
              const isInflow = (flow.amount || 0) >= 0;
              let token = flow.token || '';
              // Truncate long token addresses
              if (token.length > 10) {
                token = `${token.slice(0, 5)}...${token.slice(-4)}`;
              }
              return (
                <div key={i} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">
                    {flow.timestamp ? new Date(flow.timestamp).toLocaleDateString() : `Flow ${i + 1}`}
                  </span>
                  <span className={`font-mono font-medium ${isInflow ? 'text-emerald-500' : 'text-red-400'}`}>
                    {isInflow ? '+' : ''}{typeof flow.amount === 'number' ? flow.amount.toFixed(2) : '0'} {token}
                  </span>
                </div>
              );
            })}
            {flows.length > 10 && (
              <div className="text-sm text-muted-foreground text-center pt-2 border-t border-border">+{flows.length - 10} more flows</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

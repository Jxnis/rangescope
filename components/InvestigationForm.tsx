'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NETWORKS } from '@/lib/constants';

function detectNetwork(address: string): string {
  if (!address) return 'ethereum';
  const trimmed = address.trim();
  if (trimmed.startsWith('cosmos1')) return 'cosmoshub-4';
  if (trimmed.startsWith('osmo1')) return 'osmosis-1';
  if (/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) return 'ethereum';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return 'solana';
  return 'ethereum';
}

export function InvestigationForm() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('ethereum');
  const [isLoading, setIsLoading] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  const handleAddressChange = useCallback((value: string) => {
    setAddress(value);
    if (value.trim().length > 10) {
      const detected = detectNetwork(value);
      setNetwork(detected);
      setAutoDetected(true);
    } else {
      setAutoDetected(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setIsLoading(true);
    router.push(`/investigate?address=${encodeURIComponent(address.trim())}&network=${network}`);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="space-y-6">
          {/* Address Input First */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-3">
              Wallet Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="Enter any address — network auto-detected"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all font-mono text-sm"
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Supports Ethereum, Arbitrum, Base, Solana, Cosmos Hub, and Osmosis
            </p>
          </div>

          {/* Network Selector with auto-detect badge */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label htmlFor="network" className="block text-sm font-medium">
                Network
              </label>
              {autoDetected && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md border border-blue-500/20">
                  auto-detected
                </span>
              )}
            </div>
            <select
              id="network"
              value={network}
              onChange={(e) => { setNetwork(e.target.value); setAutoDetected(false); }}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
              disabled={isLoading}
            >
              {NETWORKS.map((net) => (
                <option key={net.value} value={net.value}>
                  {net.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="w-full py-4 px-6 rounded-xl bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Investigating...
              </span>
            ) : (
              'Investigate'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

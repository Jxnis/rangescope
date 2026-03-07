'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NETWORKS } from '@/lib/constants';

export function InvestigationForm() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('ethereum');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      alert('Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    const normalizedAddress = address.trim();
    router.push(`/investigate?address=${encodeURIComponent(normalizedAddress)}&network=${network}`);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="space-y-6">
          {/* Network Selector */}
          <div>
            <label htmlFor="network" className="block text-sm font-medium mb-3">
              Network
            </label>
            <select
              id="network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              disabled={isLoading}
            >
              {NETWORKS.map((net) => (
                <option key={net.value} value={net.value}>
                  {net.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address Input */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-3">
              Wallet Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono text-sm"
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Enter any blockchain address to begin investigation
            </p>
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
              'Start Investigation'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { PortfolioOverview } from '@/components/portfolio-overview';
import { RiskAssessment } from '@/components/risk-assessment';
import { WalletCombobox } from '@/components/wallet-combobox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Home() {
  const [activeAddress, setActiveAddress] = useState('0x600Eb478EA253561E2Ca3A1d98be53d109879A3A');

  const handleWalletChange = (address: string) => {
    if (address && address.startsWith('0x')) {
      setActiveAddress(address);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Wallet Address Search */}
      <Card>
        <CardHeader>
          <CardTitle>Select Wallet Address</CardTitle>
          <CardDescription>
            Choose from existing wallets or enter a new address to analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalletCombobox
            value={activeAddress}
            onValueChange={handleWalletChange}
          />
        </CardContent>
      </Card>

      {/* Portfolio Overview */}
      <PortfolioOverview walletAddress={activeAddress} />

      {/* Risk Assessment */}
      <RiskAssessment walletAddress={activeAddress} />
    </main>
  );
}

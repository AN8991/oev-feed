'use client';

import { ProviderInfrastructure } from '@/components/provider-infrastructure';

export default function InfrastructurePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Infrastructure Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Real-time health and performance metrics for all data providers
        </p>
      </div>

      <ProviderInfrastructure />
    </main>
  );
}

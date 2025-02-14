'use client';

import { useState, useEffect } from 'react';
import { Protocol, UserPosition, ProtocolQueryParams, TransactionQueryParams } from '@/types/protocols';
import { Network, NETWORK_CONFIGS } from '@/types/networks';
import { Dropdown } from '@/components/Dropdown';
import { PositionDisplay } from '@/components/PositionDisplay';
import { TransactionHistoryDisplay } from '@/components/TransactionHistory';
import { ServiceFactory } from '@/services';
import { getErrorMessage } from '@/utils/errors';
import { CacheService } from '@/services/cache';
import { retry } from '@/utils/retry';
import { HistoryService } from '@/services/history';
import { RealtimeService } from '@/services/realtime';
import type { TransactionHistory } from '@/services/history';
import Notifications from '@/components/Notifications';
import ExportButton from '@/components/ExportButton';
import { LastUpdatedPicker } from '@/components/LastUpdatedPicker';
import { RateLimitError } from '@/utils/rateLimit';
import { ENV } from '@/config/env';
import { ProtocolServiceFactory } from '@/services/factory';

export default function Home() {
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>(Protocol.AAVE);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(Network.ETHEREUM);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthFactor, setHealthFactor] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [address, setAddress] = useState<string>(''); // Add this line

  const cache = CacheService.getInstance();
  const historyService = HistoryService.getInstance();
  const realtimeService = typeof window === 'undefined' ? RealtimeService.getInstance() : null;

  const availableNetworks = Object.values(Network);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      return;
    }

    let isSubscribed = true;

    if (selectedProtocol && selectedNetwork) {
      const handleUpdate = (data: any) => {
        if (isSubscribed) {
          setPositions(data);
        }
      };

      if (realtimeService) {
        realtimeService.subscribe(
          selectedProtocol,
          selectedNetwork,
          lastUpdated.getTime().toString(),
          handleUpdate
        );

        return () => {
          isSubscribed = false;
          if (realtimeService) {
            realtimeService.unsubscribe(
              selectedProtocol,
              selectedNetwork,
              lastUpdated.getTime().toString(),
              handleUpdate
            );
          }
        };
      }
    }
  }, [selectedProtocol, selectedNetwork, lastUpdated]);

  const fetchPositions = async () => {
    if (!isExecuting) return;
    
    setLoading(true);
    setError(null);

    try {
      // Validate API keys before fetching
      const apiKeyValidation = ENV.validateAllApiKeys();
      
      if (!apiKeyValidation.Alchemy) {
        throw new Error('Alchemy API key is invalid');
      }

      const service = ProtocolServiceFactory.getService(selectedProtocol);
      
      // Calculate date range: 7 days before lastUpdated
      const fromDate = new Date(lastUpdated);
      fromDate.setDate(fromDate.getDate() - 7);
      
      // Fetch positions within date range
      const newPositions = await service.fetchUserPositions({
        userAddress: address,
        protocolSpecificFilters: { protocol: selectedProtocol },
        network: selectedNetwork,
        fromTimestamp: Math.floor(fromDate.getTime() / 1000),
        toTimestamp: Math.floor(lastUpdated.getTime() / 1000)
      } as ProtocolQueryParams);

      setPositions(newPositions);

      // Fetch transaction history
      const transactionParams: TransactionQueryParams = {
        userAddress: address,
        protocol: selectedProtocol, 
        network: selectedNetwork,
        fromTimestamp: Math.floor(fromDate.getTime() / 1000),
        toTimestamp: Math.floor(lastUpdated.getTime() / 1000)
      };
      
      const history = await historyService.getTransactionHistory(transactionParams);

      setTransactions(history);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      if (error instanceof RateLimitError) {
        setError('API rate limit exceeded. Please try again later.');
        setIsExecuting(false);
      } else {
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExecuting) {
      fetchPositions();
    }
  }, [selectedProtocol, selectedNetwork, lastUpdated, isExecuting]);

  const handleExecute = () => {
    setIsExecuting(true);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">DeFi Position Monitor</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Dropdown
            label="Protocol"
            value={selectedProtocol}
            options={Object.values(Protocol)}
            onChange={(value) => setSelectedProtocol(value as Protocol)}
          />
          <Dropdown
            label="Network"
            value={selectedNetwork}
            options={availableNetworks}
            onChange={(value) => setSelectedNetwork(value as Network)}
          />
          <LastUpdatedPicker
            value={lastUpdated}
            onChange={setLastUpdated}
          />
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleExecute}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium ${
              loading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            {error.includes('Alchemy API key is invalid') && (
              <p>
                Please check your API keys in the .env file. 
                Ensure ALCHEMY_API_KEY is correctly set.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PositionDisplay positions={positions} loading={loading} />
          <TransactionHistoryDisplay transactions={transactions} loading={loading} />
        </div>

        <div className="mt-6">
          <ExportButton positions={positions} transactions={transactions} />
        </div>

        <Notifications />
      </div>
    </main>
  );
}

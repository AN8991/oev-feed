'use client';

import { useState, useEffect } from 'react';
import { 
  Protocol, 
  UserPosition, 
  ProtocolQueryParams, 
  EnhancedProtocolQueryParams,
  UserPositionSummary 
} from '@/types/protocols';
import { Network } from '@/types/networks';
import { Dropdown } from '@/components/Dropdown';
import { PositionDisplay } from '@/components/PositionDisplay';
import { TransactionHistoryDisplay } from '@/components/TransactionHistory';
import { getErrorMessage } from '@/utils/errors';
import { CacheService } from '@/services/cache';
import { retry } from '@/utils/retry';
import { HistoryService } from '@/services/history';
import { RealtimeService } from '@/services/realtime';
import type { TransactionHistory } from '@/services/history';
import Notifications from '@/components/Notifications';
import ExportButton from '@/components/ExportButton';
import { RateLimitError } from '@/utils/rateLimit';
import { ENV } from '@/config/env';
import { ProtocolServiceFactory } from '@/services/factory';
import { TransactionQueryParams } from '@/services/protocols/base';

export default function Home() {
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>(Protocol.AAVE);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(Network.ETHEREUM);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [advancedFilters, setAdvancedFilters] = useState<Partial<EnhancedProtocolQueryParams>>({
    liquidationThreshold: 0.8,
    minHealthFactor: 1.5,
    maxPositions: 100,
    sortBy: 'liquidationRisk',
    sortOrder: 'desc'
  });
  const [positions, setPositions] = useState<UserPositionSummary[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [address, setAddress] = useState<string>('');

  const cache = CacheService.getInstance();
  const historyService = HistoryService.getInstance();
  const realtimeService = typeof window === 'undefined' ? RealtimeService.getInstance() : null;

  const availableNetworks = Object.values(Network);
  const availableProtocols = Object.values(Protocol);

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
          dateRange.to.getTime().toString(),
          handleUpdate
        );

        return () => {
          isSubscribed = false;
          if (realtimeService) {
            realtimeService.unsubscribe(
              selectedProtocol,
              selectedNetwork,
              dateRange.to.getTime().toString(),
              handleUpdate
            );
          }
        };
      }
    }
  }, [selectedProtocol, selectedNetwork, dateRange]);

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
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      
      // Fetch positions within date range
      const newPositions = await service.fetchUserPositionsInRange({
        userAddress: address,
        protocol: selectedProtocol,
        network: selectedNetwork,
        fromTimestamp: Math.floor(fromDate.getTime() / 1000),
        toTimestamp: Math.floor(toDate.getTime() / 1000),
        ...advancedFilters
      });

      setPositions(newPositions);

      // Fetch transaction history
      const transactionParams: TransactionQueryParams = {
        address: address,
        protocol: selectedProtocol,
        network: selectedNetwork,
        fromTimestamp: Math.floor(fromDate.getTime() / 1000),
        toTimestamp: Math.floor(toDate.getTime() / 1000)
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
  }, [selectedProtocol, selectedNetwork, dateRange, advancedFilters, isExecuting]);

  const handleExecute = () => {
    setIsExecuting(true);
    
    if (!address) {
      setError('Please enter an address');
      setIsExecuting(false);
      return;
    }
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid Ethereum address format');
      setIsExecuting(false);
      return;
    }
    
    fetchPositions();
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">DeFi Position Monitor</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Dropdown
            label="Protocol"
            value={selectedProtocol}
            options={availableProtocols}
            onChange={(value) => setSelectedProtocol(value as Protocol)}
          />
          <Dropdown
            label="Network"
            value={selectedNetwork}
            options={availableNetworks}
            onChange={(value) => setSelectedNetwork(value as Network)}
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <div className="flex space-x-4">
              <input
                type="date"
                value={dateRange.from.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({
                  ...prev, 
                  from: new Date(e.target.value)
                }))}
                className="border rounded px-2 py-1"
              />
              <input
                type="date"
                value={dateRange.to.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({
                  ...prev, 
                  to: new Date(e.target.value)
                }))}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Ethereum Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Liquidation Threshold</label>
            <input
              type="number"
              step="0.1"
              value={advancedFilters.liquidationThreshold}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev, 
                liquidationThreshold: parseFloat(e.target.value)
              }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Min Health Factor</label>
            <input
              type="number"
              step="0.1"
              value={advancedFilters.minHealthFactor}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev, 
                minHealthFactor: parseFloat(e.target.value)
              }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Positions</label>
            <input
              type="number"
              value={advancedFilters.maxPositions}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev, 
                maxPositions: parseInt(e.target.value)
              }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleExecute}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium ${
              loading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
              </span>
            ) : (
              'Search Positions'
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            {typeof error === 'string' && error.includes('Alchemy API key is invalid') && (
              <p>
                Please check your API keys in the .env file. 
                Ensure ALCHEMY_API_KEY is correctly set.
              </p>
            )}
          </div>
        )}

        {positions.length > 0 ? (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Search Results</h2>
              <ExportButton data={positions} filename="positions.json" />
            </div>
            <PositionDisplay positions={positions} loading={loading} />
            {transactions.length > 0 && (
              <div className="mt-6">
                <TransactionHistoryDisplay transactions={transactions} loading={loading} />
              </div>
            )}
          </div>
        ) : (
          !loading && isExecuting && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700">No positions found for the selected criteria.</p>
            </div>
          )
        )}

        <Notifications />
      </div>
    </main>
  );
}

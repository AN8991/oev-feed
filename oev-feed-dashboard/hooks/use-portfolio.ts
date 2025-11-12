import { useQuery } from '@tanstack/react-query';
import { portfolioApi } from '@/lib/api-client';

export function usePortfolioSummary(walletAddress: string) {
  return useQuery({
    queryKey: ['portfolio', walletAddress],
    queryFn: () => portfolioApi.getSummary(walletAddress),
    enabled: !!walletAddress && walletAddress.startsWith('0x'),
    refetchInterval: 30000, // 30 seconds
  });
}

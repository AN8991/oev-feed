import { useQuery } from '@tanstack/react-query';
import { riskApi } from '@/lib/api-client';

export function useRiskAssessment(walletAddress: string) {
  return useQuery({
    queryKey: ['risk', walletAddress],
    queryFn: () => riskApi.getAssessment(walletAddress),
    enabled: !!walletAddress && walletAddress.startsWith('0x'),
    refetchInterval: 30000, // 30 seconds
  });
}

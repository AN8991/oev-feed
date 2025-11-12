import { useQuery } from '@tanstack/react-query';
import { walletsApi } from '@/lib/api-client';

export function useWalletAddresses() {
  return useQuery({
    queryKey: ['wallets', 'addresses'],
    queryFn: () => walletsApi.getAddresses(),
    staleTime: 5 * 60 * 1000, // 5 minutes - wallet list doesn't change often
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

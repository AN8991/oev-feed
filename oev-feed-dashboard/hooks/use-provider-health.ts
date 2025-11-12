import { useQuery } from '@tanstack/react-query';
import { providerApi } from '@/lib/api-client';

export function useProviderHealth() {
  return useQuery({
    queryKey: ['provider-health'],
    queryFn: () => providerApi.getHealth(),
    refetchInterval: 60000, // 60 seconds
  });
}

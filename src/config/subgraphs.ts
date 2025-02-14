import { Network } from '@/types/networks';
import { ENV } from '@/config/env';

export const SUBGRAPH_ENDPOINTS = {
  AAVE: {
    V3_ETH_MAINNET: {
      url: `https://gateway.thegraph.com/api/${ENV.getGraphStudioApiKey()}/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`,
      apiKey: ENV.getGraphStudioApiKey(),
    },
  },
} as const;

export type SubgraphEndpoints = typeof SUBGRAPH_ENDPOINTS;

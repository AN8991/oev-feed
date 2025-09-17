// Build for Subgraphs
import { getLegacyConfigService } from './config';

const configService = getLegacyConfigService();

export const SUBGRAPH_ENDPOINTS = {
  AAVE: {
    V3_ETH_MAINNET: {
      url: `https://gateway.thegraph.com/api/${configService.getGraphStudioApiKey()}/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`,
      apiKey: configService.getGraphStudioApiKey(),
    },
  },
} as const;

export type SubgraphEndpoints = typeof SUBGRAPH_ENDPOINTS;

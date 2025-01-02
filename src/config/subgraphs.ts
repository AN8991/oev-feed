export const SUBGRAPH_ENDPOINTS = {
  AAVE: {
    V3_ETH_MAINNET: {
      url: `https://gateway.thegraph.com/api/${process.env.GRAPH_STUDIO_API_KEY}/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`,
      apiKey: process.env.GRAPH_STUDIO_API_KEY,
    },
  },
  SILO: {
    V1_ARB_MAINNET: {
      url: `https://gateway.thegraph.com/api/${process.env.GRAPH_STUDIO_API_KEY}/subgraphs/id/2ufoztRpybsgogPVW6j9NTn1JmBWFYPKbP7pAabizADU`,
      apiKey: process.env.GRAPH_STUDIO_API_KEY,
    },
  },
  // Add other protocol subgraph endpoints as they become available
} as const;

export type SubgraphEndpoints = typeof SUBGRAPH_ENDPOINTS;

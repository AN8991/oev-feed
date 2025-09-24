/**
 * Provides subgraph endpoint configuration
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

//Subgraph endpoint configuration
export interface SubgraphEndpoint {
  url: string;
  apiKey: string;
}

//Subgraph endpoints by protocol and version
export interface SubgraphEndpoints {
  AAVE: {
    V3_ETH_MAINNET: SubgraphEndpoint;
    V2_ETH_MAINNET?: SubgraphEndpoint;
    V3_POLYGON?: SubgraphEndpoint;
    V3_ARBITRUM?: SubgraphEndpoint;
    V3_OPTIMISM?: SubgraphEndpoint;
    V3_BLAST?: SubgraphEndpoint;
  };
}

@Injectable()
export class SubgraphService {
  constructor(private readonly configService: ConfigService) {}

//Get all subgraph endpoints
  getSubgraphEndpoints(): SubgraphEndpoints {
    const graphStudioApiKey = this.configService.get<string>('GRAPH_STUDIO_API_KEY');
    
    if (!graphStudioApiKey) {
      throw new Error('GRAPH_STUDIO_API_KEY environment variable is required for subgraph access');
    }

    return {
      AAVE: {
        V3_ETH_MAINNET: {
          url: `https://gateway.thegraph.com/api/${graphStudioApiKey}/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`,
          apiKey: graphStudioApiKey,
        },
        // Additional subgraph endpoints can be added here
        V2_ETH_MAINNET: {
          url: `https://gateway.thegraph.com/api/${graphStudioApiKey}/subgraphs/id/ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7`,
          apiKey: graphStudioApiKey,
        },
        V3_POLYGON: {
          url: `https://gateway.thegraph.com/api/${graphStudioApiKey}/subgraphs/id/H2xKKt6NzrMkKpKGNNMCucfaM3v6YFQRvXNaVKKKKKKK`,
          apiKey: graphStudioApiKey,
        },
        V3_ARBITRUM: {
          url: `https://gateway.thegraph.com/api/${graphStudioApiKey}/subgraphs/id/C7dt4Ghz62AKvBsDgFozo9jbFzBXzaEWH1xriJNNNNNN`,
          apiKey: graphStudioApiKey,
        },
        V3_OPTIMISM: {
          url: `https://gateway.thegraph.com/api/${graphStudioApiKey}/subgraphs/id/Cd2gEDVeqnjBn1hSeqFMitw7Q9SvH8cKKKKKKKKKKKKK`,
          apiKey: graphStudioApiKey,
        },
        V3_BLAST: {
          url: `https://gateway.thegraph.com/api/${graphStudioApiKey}/subgraphs/id/BLASTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
          apiKey: graphStudioApiKey,
        },
      },
    };
  }

//Get specific subgraph endpoint
  getAaveV3EthMainnetEndpoint(): SubgraphEndpoint {
    return this.getSubgraphEndpoints().AAVE.V3_ETH_MAINNET;
  }

//Get Aave V2 Ethereum mainnet endpoint
  getAaveV2EthMainnetEndpoint(): SubgraphEndpoint {
    const endpoints = this.getSubgraphEndpoints();
    const endpoint = endpoints.AAVE.V2_ETH_MAINNET;
    
    if (!endpoint) {
      throw new Error('Aave V2 Ethereum mainnet subgraph endpoint is not configured');
    }
    
    return endpoint;
  }

//Get subgraph endpoint by protocol and network
  getSubgraphEndpoint(protocol: 'AAVE', version: 'V2' | 'V3', network: 'ETH_MAINNET' | 'POLYGON' | 'ARBITRUM' | 'OPTIMISM' | 'BLAST'): SubgraphEndpoint {
    const endpoints = this.getSubgraphEndpoints();
    
    if (protocol === 'AAVE') {
      const key = `${version}_${network}` as keyof typeof endpoints.AAVE;
      const endpoint = endpoints.AAVE[key];
      
      if (!endpoint) {
        throw new Error(`Subgraph endpoint not found for ${protocol} ${version} on ${network}`);
      }
      
      return endpoint;
    }
    
    throw new Error(`Unsupported protocol: ${protocol}`);
  }

//Check if subgraph endpoint is configured
  isSubgraphConfigured(protocol: 'AAVE', version: 'V2' | 'V3', network: 'ETH_MAINNET' | 'POLYGON' | 'ARBITRUM' | 'OPTIMISM' | 'BLAST'): boolean {
    try {
      this.getSubgraphEndpoint(protocol, version, network);
      return true;
    } catch {
      return false;
    }
  }

//Get Graph Studio API key
  getGraphStudioApiKey(): string {
    const apiKey = this.configService.get<string>('GRAPH_STUDIO_API_KEY');
    
    if (!apiKey) {
      throw new Error('GRAPH_STUDIO_API_KEY environment variable is required');
    }
    
    return apiKey;
  }

//Validate subgraph configuration
  validateConfiguration(): boolean {
    try {
      this.getGraphStudioApiKey();
      this.getSubgraphEndpoints();
      return true;
    } catch (error) {
      console.error('Subgraph configuration validation failed:', error);
      return false;
    }
  }
}

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { SILO_LENS_ABI, SILO_REPOSITORY_ABI } from './abi';
import { log } from '@/utils/logger';
import { GraphQLClient } from 'graphql-request';
import { SUBGRAPH_ENDPOINTS } from '@/config/subgraphs';
import { GET_USER_POSITIONS } from './queries';
import { PrismaClient } from '@prisma/client';

interface SiloUserPositionResponse {
  userPositions: Array<{
    collateral: string;
    debt: string;
    healthFactor: string;
  }>;
}

export class SiloService implements ProtocolService {
  private provider: ethers.Provider;
  private lens: ethers.Contract;
  private repository: ethers.Contract;
  private client: GraphQLClient;
  private prisma: PrismaClient;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.lens = new ethers.Contract(
      CONTRACT_ADDRESSES.SILO.MAINNET.LENS,
      SILO_LENS_ABI,
      this.provider
    );
    this.repository = new ethers.Contract(
      CONTRACT_ADDRESSES.SILO.MAINNET.REPOSITORY,
      SILO_REPOSITORY_ABI,
      this.provider
    );
    this.client = new GraphQLClient(SUBGRAPH_ENDPOINTS.SILO.V1_ARB_MAINNET.url);
    this.prisma = new PrismaClient();
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      // Try subgraph first
      try {
        const response = await this.client.request<SiloUserPositionResponse>(
          GET_USER_POSITIONS,
          { userAddress: address }
        );
        if (response && response.userPositions && response.userPositions.length > 0) {
          return response.userPositions.map((pos) => ({
            protocol: 'SILO',
            collateral: pos.collateral,
            debt: pos.debt,
            healthFactor: pos.healthFactor,
            timestamp: Math.floor(Date.now() / 1000)
          }));
        }
      } catch (subgraphError) {
        log.warn('Subgraph query failed, falling back to contract calls', { error: subgraphError });
      }

      // Fallback to contract calls
      const { collateral, debt, healthFactor } = await this.lens.getPositionData(address);

      if (collateral.toString() === '0' && debt.toString() === '0') {
        return [];
      }

      const position: UserPosition = {
        protocol: 'SILO',
        collateral: collateral.toString(),
        debt: debt.toString(),
        healthFactor: ethers.formatUnits(healthFactor, 18),
        timestamp: Math.floor(Date.now() / 1000)
      };

      return [position];
    } catch (error) {
      log.error('Error fetching Silo user positions:', error);
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      // Try subgraph first
      try {
        const response = await this.client.request<SiloUserPositionResponse>(
          GET_USER_POSITIONS,
          { userAddress: address }
        );
        if (response && response.userPositions && response.userPositions.length > 0) {
          return response.userPositions[0].healthFactor;
        }
      } catch (subgraphError) {
        log.warn('Subgraph query failed, falling back to contract calls', { error: subgraphError });
      }

      // Fallback to contract calls
      const healthFactor = await this.lens.getUserHealthFactor(address);
      return ethers.formatUnits(healthFactor, 18);
    } catch (error) {
      log.error('Error fetching Silo health factor:', error);
      throw error;
    }
  }
}

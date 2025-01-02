import { GraphQLClient } from 'graphql-request';
import { ethers } from 'ethers';
import { SUBGRAPH_ENDPOINTS } from '@/config/subgraphs';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { GET_USER_POSITIONS } from './queries';
import { log } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

interface Reserve {
  symbol: string;
  decimals: number;
  price: {
    priceInEth: string;
  };
}

interface UserReserve {
  currentATokenBalance: string;
  currentStableDebt: string;
  currentVariableDebt: string;
  reserve: Reserve;
}

interface User {
  healthFactor: string;
  totalCollateralETH: string;
  totalDebtETH: string;
}

interface GetUserPositionsResponse {
  userReserves: UserReserve[];
  user: User;
}

export class AaveService implements ProtocolService {
  private client: GraphQLClient;
  private provider: ethers.Provider;
  private prisma: PrismaClient;

  constructor() { 
    this.client = new GraphQLClient(SUBGRAPH_ENDPOINTS.AAVE.V3_ETH_MAINNET.url);
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.prisma = new PrismaClient();
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      // Fetch data from subgraph
      const response = await this.client.request<GetUserPositionsResponse>(GET_USER_POSITIONS, {
        userAddress: address.toLowerCase(),
      });

      // Store data in database
      const user = await this.prisma.user.upsert({
        where: { address: address.toLowerCase() },
        update: {},
        create: { address: address.toLowerCase() },
      });

      // Calculate total values
      const totalCollateral = response.user.totalCollateralETH;
      const totalDebt = response.user.totalDebtETH;
      const healthFactor = response.user.healthFactor;

      // Create or update position
      await this.prisma.position.upsert({
        where: {
          userId_protocol: {
            userId: user.id,
            protocol: 'AAVE_V3'
          }
        },
        update: {
          collateral: totalCollateral,
          debt: totalDebt,
          healthFactor: healthFactor,
          lastUpdated: new Date(),
        },
        create: {
          userId: user.id,
          protocol: 'AAVE_V3',
          collateral: totalCollateral,
          debt: totalDebt,
          healthFactor: healthFactor,
        },
      });

      // Return the positions in the expected format
      return [{
        protocol: 'AAVE_V3',
        collateral: totalCollateral,
        debt: totalDebt,
        healthFactor: healthFactor,
        timestamp: Math.floor(Date.now() / 1000),
      }];
    } catch (error) {
      log.error('Error fetching AAVE positions', { error, address });
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      const { user } = await this.client.request<GetUserPositionsResponse>(GET_USER_POSITIONS, {
        userAddress: address.toLowerCase(),
      });
      return user?.healthFactor || '0';
    } catch (error) {
      log.error('Error fetching AAVE health factor', { error, address });
      throw error;
    }
  }
}

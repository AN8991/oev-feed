import { GraphQLClient } from 'graphql-request';
import { ethers } from 'ethers';
import { SUBGRAPH_ENDPOINTS } from '@/config/subgraphs';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { GET_USER_POSITIONS } from './queries';
import { log } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { AAVE_POOL_ABI, AAVE_POOL_DATA_PROVIDER_ABI, AAVE_ORACLE_ABI } from './abi';

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
  private pool: ethers.Contract;
  private poolDataProvider: ethers.Contract;
  private oracle: ethers.Contract;
  private prisma: PrismaClient;

  constructor() {
    this.client = new GraphQLClient(SUBGRAPH_ENDPOINTS.AAVE.V3_ETH_MAINNET.url);
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.pool = new ethers.Contract(
      CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET.POOL,
      AAVE_POOL_ABI,
      this.provider
    );
    this.poolDataProvider = new ethers.Contract(
      CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET.POOL_DATA_PROVIDER,
      AAVE_POOL_DATA_PROVIDER_ABI,
      this.provider
    );
    this.oracle = new ethers.Contract(
      CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET.ORACLE,
      AAVE_ORACLE_ABI,
      this.provider
    );
    this.prisma = new PrismaClient();
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      // Try subgraph first
      try {
        const response = await this.client.request<GetUserPositionsResponse>(GET_USER_POSITIONS, { userAddress: address });
        if (response && response.userReserves && response.userReserves.length > 0) {
          // Store data in database
          const user = await this.prisma.user.upsert({
            where: { address: address.toLowerCase() },
            update: {},
            create: { address: address.toLowerCase() },
          });

          // Create or update position
          await this.prisma.position.upsert({
            where: {
              userId_protocol: {
                userId: user.id,
                protocol: 'AAVE_V3'
              }
            },
            update: {
              collateral: response.user.totalCollateralETH,
              debt: response.user.totalDebtETH,
              healthFactor: response.user.healthFactor,
              lastUpdated: new Date(),
            },
            create: {
              userId: user.id,
              protocol: 'AAVE_V3',
              collateral: response.user.totalCollateralETH,
              debt: response.user.totalDebtETH,
              healthFactor: response.user.healthFactor,
            },
          });

          return [{
            protocol: 'AAVE_V3',
            collateral: response.user.totalCollateralETH,
            debt: response.user.totalDebtETH,
            healthFactor: response.user.healthFactor,
            timestamp: Math.floor(Date.now() / 1000),
          }];
        }
      } catch (subgraphError) {
        log.warn('Subgraph query failed, falling back to contract calls', { error: subgraphError });
      }

      // Fallback to contract calls
      const {
        totalCollateralBase,
        totalDebtBase,
        healthFactor
      } = await this.pool.getUserAccountData(address);

      if (totalCollateralBase.toString() === '0' && totalDebtBase.toString() === '0') {
        return [];
      }

      const position: UserPosition = {
        protocol: 'AAVE_V3',
        collateral: totalCollateralBase.toString(),
        debt: totalDebtBase.toString(),
        healthFactor: ethers.formatUnits(healthFactor, 18),
        timestamp: Math.floor(Date.now() / 1000)
      };

      return [position];
    } catch (error) {
      log.error('Error fetching AAVE positions', { error, address });
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      // Try subgraph first
      try {
        const response = await this.client.request<GetUserPositionsResponse>(GET_USER_POSITIONS, { userAddress: address });
        if (response && response.user) {
          return response.user.healthFactor;
        }
      } catch (subgraphError) {
        log.warn('Subgraph query failed, falling back to contract calls', { error: subgraphError });
      }

      // Fallback to contract calls
      const { healthFactor } = await this.pool.getUserAccountData(address);
      return ethers.formatUnits(healthFactor, 18);
    } catch (error) {
      log.error('Error fetching AAVE health factor', { error, address });
      throw error;
    }
  }
}

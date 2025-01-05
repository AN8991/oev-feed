import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { log } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { ORBIT_LENDING_POOL_ABI, ORBIT_ORACLE_ABI } from './abi';

export class OrbitService implements ProtocolService {
  private provider: ethers.Provider;
  private lendingPool: ethers.Contract;
  private oracle: ethers.Contract;
  private prisma: PrismaClient;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.lendingPool = new ethers.Contract(
      CONTRACT_ADDRESSES.ORBIT.MAINNET.LENDING_POOL,
      ORBIT_LENDING_POOL_ABI,
      this.provider
    );
    this.oracle = new ethers.Contract(
      CONTRACT_ADDRESSES.ORBIT.MAINNET.ORACLE,
      ORBIT_ORACLE_ABI,
      this.provider
    );
    this.prisma = new PrismaClient();
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      const {
        totalCollateralETH,
        totalDebtETH,
        healthFactor
      } = await this.lendingPool.getUserAccountData(address);

      if (totalCollateralETH.toString() === '0' && totalDebtETH.toString() === '0') {
        return [];
      }

      const position: UserPosition = {
        protocol: 'ORBIT',
        collateral: totalCollateralETH.toString(),
        debt: totalDebtETH.toString(),
        healthFactor: ethers.formatUnits(healthFactor, 18),
        timestamp: Math.floor(Date.now() / 1000)
      };

      return [position];
    } catch (error) {
      log.error('Error fetching Orbit user positions:', error);
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      const { healthFactor } = await this.lendingPool.getUserAccountData(address);
      return ethers.formatUnits(healthFactor, 18);
    } catch (error) {
      log.error('Error fetching Orbit health factor:', error);
      throw error;
    }
  }
}

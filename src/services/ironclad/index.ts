import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { log } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { IRONCLAD_VAULT_ABI, IRONCLAD_STRATEGY_ABI } from './abi';

export class IroncladService implements ProtocolService {
  private provider: ethers.Provider;
  private vault: ethers.Contract;
  private strategy: ethers.Contract;
  private prisma: PrismaClient;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.vault = new ethers.Contract(
      CONTRACT_ADDRESSES.IRONCLAD.MAINNET.VAULT,
      IRONCLAD_VAULT_ABI,
      this.provider
    );
    this.strategy = new ethers.Contract(
      CONTRACT_ADDRESSES.IRONCLAD.MAINNET.STRATEGY,
      IRONCLAD_STRATEGY_ABI,
      this.provider
    );
    this.prisma = new PrismaClient();
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      const { totalCollateral, totalDebt, healthFactor } = await this.vault.getUserAccountData(address);

      if (totalCollateral.toString() === '0' && totalDebt.toString() === '0') {
        return [];
      }

      const position: UserPosition = {
        protocol: 'IRONCLAD',
        collateral: totalCollateral.toString(),
        debt: totalDebt.toString(),
        healthFactor: ethers.formatUnits(healthFactor, 18),
        timestamp: Math.floor(Date.now() / 1000)
      };

      return [position];
    } catch (error) {
      log.error('Error fetching Ironclad user positions:', error);
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      const { healthFactor } = await this.vault.getUserAccountData(address);
      return ethers.formatUnits(healthFactor, 18);
    } catch (error) {
      log.error('Error fetching Ironclad health factor:', error);
      throw error;
    }
  }
}

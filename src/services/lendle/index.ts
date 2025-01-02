import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { log } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

export class LendleService implements ProtocolService {
  private provider: ethers.Provider;
  private controller: ethers.Contract;
  private market: ethers.Contract;
  private prisma: PrismaClient;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.controller = new ethers.Contract(
      CONTRACT_ADDRESSES.LENDLE.MAINNET.CONTROLLER,
      [], // TODO: Add Lendle controller ABI
      this.provider
    );
    this.market = new ethers.Contract(
      CONTRACT_ADDRESSES.LENDLE.MAINNET.MARKET,
      [], // TODO: Add Lendle market ABI
      this.provider
    );
    this.prisma = new PrismaClient();
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      // TODO: Implement getting user positions from Lendle market/controller
      const positions: UserPosition[] = [];
      return positions;
    } catch (error) {
      log.error('Error fetching Lendle user positions:', error);
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      // TODO: Implement getting health factor from Lendle controller
      return '0';
    } catch (error) {
      log.error('Error fetching Lendle health factor:', error);
      throw error;
    }
  }
}

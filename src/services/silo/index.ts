import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { SILO_ABI } from './abi';
import { log } from '@/utils/logger';

export class SiloService implements ProtocolService {
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.SILO.MAINNET.LENS,
      SILO_ABI,
      this.provider
    );
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      const positionData = await this.contract.getPositionData(address);
      
      return [{
        protocol: 'SILO',
        collateral: positionData.collateral.toString(),
        debt: positionData.debt.toString(),
        healthFactor: positionData.healthFactor.toString(),
        timestamp: Math.floor(Date.now() / 1000),
      }];
    } catch (error) {
      log.error('Error fetching Silo positions', { error, address });
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      const healthFactor = await this.contract.getUserHealthFactor(address);
      return healthFactor.toString();
    } catch (error) {
      log.error('Error fetching Silo health factor', { error, address });
      throw error;
    }
  }
}

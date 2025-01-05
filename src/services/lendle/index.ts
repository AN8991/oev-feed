import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ProtocolService, UserPosition } from '@/types/protocols';
import { log } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';
import { LENDLE_CONTROLLER_ABI, LENDLE_MARKET_ABI } from './abi';

export class LendleService implements ProtocolService {
  private provider: ethers.Provider;
  private controller: ethers.Contract;
  private market: ethers.Contract;
  private prisma: PrismaClient;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.controller = new ethers.Contract(
      CONTRACT_ADDRESSES.LENDLE.MAINNET.CONTROLLER,
      LENDLE_CONTROLLER_ABI,
      this.provider
    );
    this.market = new ethers.Contract(
      CONTRACT_ADDRESSES.LENDLE.MAINNET.MARKET,
      LENDLE_MARKET_ABI,
      this.provider
    );
    this.prisma = new PrismaClient();
  }

  async getUserPositions(address: string): Promise<UserPosition[]> {
    try {
      const [error, liquidity, shortfall] = await this.controller.getAccountLiquidity(address);
      if (error.toString() !== '0') {
        throw new Error(`Error getting account liquidity: ${error}`);
      }

      const [snapError, tokenBalance, borrowBalance, exchangeRate] = await this.market.getAccountSnapshot(address);
      if (snapError.toString() !== '0') {
        throw new Error(`Error getting account snapshot: ${snapError}`);
      }

      if (tokenBalance.toString() === '0' && borrowBalance.toString() === '0') {
        return [];
      }

      // Calculate collateral in underlying tokens
      const collateralUnderlying = tokenBalance.mul(exchangeRate).div(ethers.parseUnits('1', 18));

      // Calculate health factor (liquidity + collateral) / total borrows
      const totalAssets = liquidity.add(collateralUnderlying);
      const healthFactor = shortfall.toString() === '0' 
        ? totalAssets.mul(100).div(borrowBalance.eq(0) ? 1 : borrowBalance)
        : ethers.parseUnits('0', 18);

      const position: UserPosition = {
        protocol: 'LENDLE',
        collateral: collateralUnderlying.toString(),
        debt: borrowBalance.toString(),
        healthFactor: ethers.formatUnits(healthFactor, 18),
        timestamp: Math.floor(Date.now() / 1000)
      };

      return [position];
    } catch (error) {
      log.error('Error fetching Lendle user positions:', error);
      throw error;
    }
  }

  async getHealthFactor(address: string): Promise<string> {
    try {
      const [error, liquidity, shortfall] = await this.controller.getAccountLiquidity(address);
      if (error.toString() !== '0') {
        throw new Error(`Error getting account liquidity: ${error}`);
      }

      const [snapError, tokenBalance, borrowBalance, exchangeRate] = await this.market.getAccountSnapshot(address);
      if (snapError.toString() !== '0') {
        throw new Error(`Error getting account snapshot: ${snapError}`);
      }

      // Calculate collateral in underlying tokens
      const collateralUnderlying = tokenBalance.mul(exchangeRate).div(ethers.parseUnits('1', 18));

      // Calculate health factor (liquidity + collateral) / total borrows
      const totalAssets = liquidity.add(collateralUnderlying);
      const healthFactor = shortfall.toString() === '0'
        ? totalAssets.mul(100).div(borrowBalance.eq(0) ? 1 : borrowBalance)
        : ethers.parseUnits('0', 18);

      return ethers.formatUnits(healthFactor, 18);
    } catch (error) {
      log.error('Error fetching Lendle health factor:', error);
      throw error;
    }
  }
}

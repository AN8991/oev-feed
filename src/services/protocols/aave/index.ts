import { ethers } from 'ethers';
import { Protocol, UserProtocolPosition, DataSourceType, ProtocolQueryParams } from '../../../types/protocols';
import { Network } from '../../../types/networks';
import { BaseProtocolService, QueryParams } from '../base';
import { CONTRACT_ADDRESSES } from '../../../config/contracts';
import { AAVE_POOL_ABI } from './abi';
import { log } from '../../../utils/logger';

export class AaveService extends BaseProtocolService {
  private readonly protocol: Protocol = Protocol.AAVE;
  private readonly addresses: { [key: string]: string };

  constructor(network: Network) {
    super({
      network,
      rpcUrl: process.env.ETH_RPC_URL || '',
      wsUrl: process.env.ETH_WS_URL,
      maxConnections: 5
    });

    // Initialize contract addresses for the network
    this.addresses = CONTRACT_ADDRESSES.AAVE[
      network === Network.ETHEREUM ? 'V3_ETH_MAINNET' : 'V2_ETH_MAINNET'
    ];
  }

  protected async fetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const { userAddress } = params;
    if (!userAddress) {
      throw new Error('User address is required for on-chain fetching');
    }

    try {
      const provider = await this.getProvider();
      const poolContract = new ethers.Contract(
        this.addresses.POOL || this.addresses.LENDING_POOL,
        AAVE_POOL_ABI,
        provider
      );

      const [accountData, reservesList] = await Promise.all([
        poolContract.getUserAccountData(userAddress),
        poolContract.getReservesList()
      ]);

      const [
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH,
        currentLiquidationThreshold,
        ltv,
        healthFactor
      ] = accountData;

      return [{
        protocol: this.protocol,
        network: this.network,
        userAddress,
        collateral: totalCollateralETH ? ethers.formatEther(totalCollateralETH) : null,
        debt: totalDebtETH ? ethers.formatEther(totalDebtETH) : null,
        healthFactor: ethers.formatEther(healthFactor),
        liquidationRisk: ltv > 0n ? {
          threshold: ethers.formatEther(currentLiquidationThreshold),
          currentLTV: ethers.formatEther(ltv)
        } : undefined,
        borrowedAssets: [], // This will be populated with proper asset data
        timestamp: Date.now(),
        periodStart: params.fromTimestamp || undefined,
        periodEnd: params.toTimestamp || undefined
      }];

    } catch (error) {
      log.error('Error fetching on-chain positions', { error, userAddress });
      throw error;
    }
  }

  protected async fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    log.warn('Subgraph fetching not implemented for Aave');
    return [];
  }

  async getHealthFactor(params: ProtocolQueryParams): Promise<string> {
    const { userAddress } = params;
    if (!userAddress) {
      throw new Error('User address is required for health factor check');
    }

    try {
      const provider = await this.getProvider();
      const poolContract = new ethers.Contract(
        this.addresses.POOL || this.addresses.LENDING_POOL,
        AAVE_POOL_ABI,
        provider
      );

      const accountData = await poolContract.getUserAccountData(userAddress);
      const [,,,,, healthFactor] = accountData;

      return ethers.formatEther(healthFactor);

    } catch (error) {
      log.error('Error getting health factor', { error, userAddress });
      throw error;
    }
  }

  async getPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const { userAddress } = params;
    if (!userAddress) {
      throw new Error('User address is required for getting positions');
    }

    try {
      const provider = await this.getProvider();
      const poolContract = new ethers.Contract(
        this.addresses.POOL || this.addresses.LENDING_POOL,
        AAVE_POOL_ABI,
        provider
      );

      const [accountData, reservesList] = await Promise.all([
        poolContract.getUserAccountData(userAddress),
        poolContract.getReservesList()
      ]);

      const [
        totalCollateralETH,
        totalDebtETH,
        ,
        currentLiquidationThreshold,
        ltv,
        healthFactor
      ] = accountData;

      return [{
        protocol: this.protocol,
        network: this.network,
        userAddress,
        collateral: ethers.formatEther(totalCollateralETH),
        debt: ethers.formatEther(totalDebtETH),
        healthFactor: ethers.formatEther(healthFactor),
        liquidationRisk: ltv > 0n ? {
          threshold: ethers.formatEther(currentLiquidationThreshold),
          currentLTV: ethers.formatEther(ltv)
        } : undefined,
        borrowedAssets: [], // This will be populated with proper asset data
        timestamp: Date.now(),
        periodStart: params.fromTimestamp || undefined,
        periodEnd: params.toTimestamp || undefined
      }];

    } catch (error) {
      log.error('Error getting positions', { error, userAddress });
      throw error;
    }
  }

  getDataSourceType(): DataSourceType {
    return DataSourceType.ON_CHAIN;
  }
}

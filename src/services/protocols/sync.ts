// Service for synchronizing protocol positions and managing periodic updates
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { Network } from 'types/networks';
import { Protocol } from 'types/protocols';
import { ENV } from 'config/env';
import { CONTRACT_ADDRESSES } from 'config/contracts';
import { log } from 'utils/logger';

import { AAVE_POOL_ABI, AAVE_POOL_DATA_PROVIDER_ABI, AAVE_ORACLE_ABI } from './aave/abi';

interface UserReserveData {
  currentATokenBalance: bigint;
  currentVariableDebt: bigint;
  currentStableDebt: bigint;
  decimals: number;
}

interface UserAccountData {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

export class ProtocolPositionSyncService {
  private prisma: PrismaClient;
  private providers: Record<Network, ethers.Provider>;
  private readonly BATCH_SIZE = 100;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor() {
    this.prisma = new PrismaClient();
    this.providers = {
      [Network.ETHEREUM]: new ethers.JsonRpcProvider(ENV.getAlchemyEthereumRpcUrl()),
    };
  }

  private getContractInstance<T extends ethers.Contract>(
    network: Network, 
    address: string, 
    abi: ethers.InterfaceAbi
  ): T {
    if (!this.providers[network]) {
      throw new Error(`No provider available for network: ${network}`);
    }
    return new ethers.Contract(address, abi, this.providers[network]) as T;
  }

  async syncAavePositions(network: Network, fromAddress?: string): Promise<void> {
    if (network !== Network.ETHEREUM) {
      throw new Error('Only Ethereum network is supported');
    }

    try {
      const networkAddresses = CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET;
      if (!networkAddresses) {
        throw new Error('No contract addresses found for AAVE V3 on Ethereum');
      }

      const poolContract = this.getContractInstance(
        network, 
        networkAddresses.POOL, 
        AAVE_POOL_ABI
      );
      const poolDataProviderContract = this.getContractInstance(
        network, 
        networkAddresses.POOL_DATA_PROVIDER, 
        AAVE_POOL_DATA_PROVIDER_ABI
      );

      // If fromAddress is not provided, fetch all user positions
      const userAddresses = fromAddress ? [fromAddress] : await this.fetchAllAaveUsers(poolContract);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Process users in batches
      for (let i = 0; i < userAddresses.length; i += this.BATCH_SIZE) {
        const batch = userAddresses.slice(i, i + this.BATCH_SIZE);
        await Promise.all(batch.map(address => this.processUserPosition(
          network,
          address,
          timestamp,
          poolContract,
          poolDataProviderContract
        )));
      }
    } catch (error) {
      log.error('Error syncing Aave positions', error);
      throw error;
    }
  }

  private async processUserPosition(
    network: Network,
    address: string,
    timestamp: number,
    poolContract: ethers.Contract,
    poolDataProviderContract: ethers.Contract
  ): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const userAccountData = await poolContract.getUserAccountData(address) as UserAccountData;
        const userReserves = await poolDataProviderContract.getUserReservesData(address) as UserReserveData[];

        if (!userReserves || userReserves.length === 0) return;

        // Aggregate collateral and debt across reserves
        const totalCollateral = userReserves.reduce((sum, reserve) => 
          sum + Number(ethers.formatUnits(reserve.currentATokenBalance, reserve.decimals)), 0);
        const totalDebt = userReserves.reduce((sum, reserve) => 
          sum + Number(ethers.formatUnits(
            reserve.currentVariableDebt + reserve.currentStableDebt, 
            reserve.decimals
          )), 0);

        await this.prisma.userPosition.upsert({
          where: {
            id: `AAVE_${address}_${timestamp}`
          },
          update: {
            collateral: totalCollateral.toString(),
            debt: totalDebt.toString(),
            healthFactor: ethers.formatUnits(userAccountData.healthFactor, 18),
            details: JSON.stringify(userReserves)
          },
          create: {
            protocol: Protocol.AAVE,
            network: network,
            userAddress: address.toLowerCase(),
            collateral: totalCollateral.toString(),
            debt: totalDebt.toString(),
            healthFactor: ethers.formatUnits(userAccountData.healthFactor, 18),
            timestamp: timestamp,
            details: JSON.stringify(userReserves)
          }
        });
        break;
      } catch (error) {
        retries++;
        if (retries === this.MAX_RETRIES) {
          log.error(`Failed to process user position after ${this.MAX_RETRIES} retries`, {
            error,
            address,
            network
          });
          throw error;
        }
        log.warn(`Retry ${retries}/${this.MAX_RETRIES} for user position`, {
          address,
          network
        });
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
      }
    }
  }

  private async fetchAllAaveUsers(poolContract: ethers.Contract): Promise<string[]> {
    try {
      // TODO: Implement logic to fetch all Aave users from subgraph or events
      const filter = poolContract.filters.Supply();
      const events = await poolContract.queryFilter(filter, -10000); // Last 10000 blocks
      const uniqueUsers = new Set(events.map(event => {
        // Handle the event arguments properly for ethers.js v6
        if ('args' in event) {
          return event.args.user;
        }
        return null;
      }).filter(Boolean));
      return Array.from(uniqueUsers);
    } catch (error) {
      log.error('Error fetching Aave users', error);
      throw error;
    }
  }

  async syncAllProtocolPositions(network: Network, fromAddress?: string): Promise<void> {
    if (network !== Network.ETHEREUM) {
      throw new Error('Only Ethereum network is supported');
    }
    await this.syncAavePositions(network, fromAddress);
  }
}

export async function runProtocolPositionSync(): Promise<void> {
  const syncService = new ProtocolPositionSyncService();
  await syncService.syncAllProtocolPositions(Network.ETHEREUM);
}

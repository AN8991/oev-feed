// Service for synchronizing protocol positions and managing periodic updates
import { PrismaClient } from '@prisma/client';
import { Network } from '@/types/networks';
import { Protocol, ProtocolQueryParams } from '@/types/protocols';
import { log } from '@/utils/logger';

// Import the new protocol service factories
import { AaveServiceFactory } from './aave/aave-factory';

export class ProtocolPositionSyncService {
  private prisma: PrismaClient;
  private readonly BATCH_SIZE = 100;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async syncAavePositions(network: Network, fromAddress?: string): Promise<void> {
    try {
      log.info('Syncing Aave positions', { network, fromAddress });
      
      // Get the Aave service for the specified network
      const aaveFactory = AaveServiceFactory.getInstance();
      const aaveService = await aaveFactory.getServiceForNetwork(network);
      
      // If fromAddress is not provided, fetch all user positions
      const userAddresses = fromAddress ? [fromAddress] : await this.fetchAllAaveUsers(network);
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Process users in batches
      for (let i = 0; i < userAddresses.length; i += this.BATCH_SIZE) {
        const batch = userAddresses.slice(i, i + this.BATCH_SIZE);
        await Promise.all(batch.map(address => this.processAaveUserPosition(
          network,
          address,
          timestamp,
          aaveService
        )));
      }
      
      log.info('Successfully synced Aave positions', { 
        network, 
        fromAddress, 
        usersCount: userAddresses.length 
      });
    } catch (error) {
      log.error('Error syncing Aave positions', { error, network, fromAddress });
      throw error;
    }
  }

  private async processAaveUserPosition(
    network: Network,
    address: string,
    timestamp: number,
    aaveService: any
  ): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const params: ProtocolQueryParams = { userAddress: address };
        
        // Get user positions from the Aave service
        const positions = await aaveService.getUserPositions(params);
        
        if (!positions || positions.length === 0) {
          log.info('No positions found for user', { address, network });
          return;
        }
        
        // Get health factor
        const healthFactor = await aaveService.getHealthFactor(params);
        
        // Calculate total collateral and debt
        const totalCollateral = positions.reduce((sum, pos) => sum + parseFloat(pos.collateralAmount || '0'), 0);
        const totalDebt = positions.reduce((sum, pos) => sum + parseFloat(pos.debtAmount || '0'), 0);
        
        // Store position in database
        await this.prisma.userPosition.upsert({
          where: {
            id: `AAVE_${address}_${timestamp}`
          },
          update: {
            collateral: totalCollateral.toString(),
            debt: totalDebt.toString(),
            healthFactor: healthFactor,
            details: JSON.stringify(positions)
          },
          create: {
            protocol: Protocol.AAVE,
            network: network,
            userAddress: address.toLowerCase(),
            collateral: totalCollateral.toString(),
            debt: totalDebt.toString(),
            healthFactor: healthFactor,
            timestamp: timestamp,
            details: JSON.stringify(positions)
          }
        });
        
        log.debug('Processed user position', { 
          address, 
          network, 
          collateral: totalCollateral, 
          debt: totalDebt, 
          healthFactor 
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

  private async fetchAllAaveUsers(network: Network): Promise<string[]> {
    try {
      // TODO: Implement logic to fetch all Aave users from subgraph or events
      // This is a placeholder implementation
      log.info('Fetching all Aave users', { network });
      
      // In a real implementation, we would fetch users from a subgraph or events
      // For now, return an empty array
      return [];
    } catch (error) {
      log.error('Error fetching Aave users', { error, network });
      throw error;
    }
  }

  async syncAllProtocolPositions(network: Network, fromAddress?: string): Promise<void> {
    log.info('Syncing all protocol positions', { network, fromAddress });
    
    // Sync positions for each protocol
    await Promise.all([
      this.syncAavePositions(network, fromAddress),
      // Add other protocols here as they are implemented
      // this.syncCompoundPositions(network, fromAddress),
      // this.syncSiloPositions(network, fromAddress),
    ]);
    
    log.info('Successfully synced all protocol positions', { network, fromAddress });
  }
}

export async function runProtocolPositionSync(): Promise<void> {
  const syncService = new ProtocolPositionSyncService();
  await syncService.syncAllProtocolPositions(Network.ETHEREUM);
}

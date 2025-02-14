import { 
  ProtocolDataService, 
  Protocol, 
  UserProtocolPosition, 
  DataSourceType, 
  ProtocolQueryParams
} from '../../../types/protocols';
import { Network } from '../../../types/networks';
import { AlchemyProvider } from '../../../config/providers/alchemy';
import { ENV } from '../../../config/env';
import { log } from '../../../utils/logger';
import { BaseProtocolService, QueryParams } from '../base';
import { AaveServiceConfig } from './aave-config';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../../../config/contracts';
import { AAVE_POOL_ABI, AAVE_POOL_DATA_PROVIDER_ABI, AAVE_ORACLE_ABI } from './abi';
import { CacheService } from '../../cache';

export enum AaveVersion {
  V2 = 'V2',
  V3 = 'V3'
}

export class AaveService extends BaseProtocolService implements ProtocolDataService {
  private readonly protocol: Protocol;
  private initialized: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly cacheService: CacheService;

  constructor(private readonly config: AaveServiceConfig) {
    super({
      network: config.network,
      rpcUrl: config.rpcUrl,
      wsUrl: config.wsUrl,
      subgraphUrl: config.subgraphUrl,
      maxConnections: config.maxConnections,
      connectionTimeout: config.connectionTimeout,
      keepAliveTimeout: config.keepAliveTimeout
    });

    this.protocol = config.protocol;
    this.cacheService = CacheService.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize provider
      const provider = await this.getProvider();
      
      // Test provider connection
      await provider.getNetwork();

      // Set up health check if configured
      if (this.config.healthCheckInterval) {
        this.startHealthCheck();
      }

      this.initialized = true;
      log.info('Aave service initialized successfully');
    } catch (error) {
      log.error('Failed to initialize Aave service', { error });
      throw error;
    }
  }

  private startHealthCheck(): void {
    if (this.config.healthCheckInterval) {
      this.healthCheckInterval = setInterval(async () => {
        try {
          const provider = await this.getProvider();
          await provider.getNetwork();
        } catch (error) {
          log.error('Health check failed', { error });
          // Implement retry/recovery logic here
        }
      }, this.config.healthCheckInterval);
    }
  }

  getDataSourceType(): DataSourceType {
    return DataSourceType.ON_CHAIN;
  }

  async fetchUserPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const { userAddress, fromTimestamp, toTimestamp, protocolSpecificFilters } = params;

    if (!userAddress) {
      throw new Error('User address is required for fetching Aave positions');
    }

    try {
      // Use Alchemy provider with API key
      const httpUrl = this.config.apiKey 
        ? AlchemyProvider.getHttpUrl(Network.ETHEREUM, this.config.apiKey)
        : AlchemyProvider.getHttpUrl(Network.ETHEREUM, ENV.ALCHEMY_API_KEY);
      
      log.info('Fetching Aave positions', { 
        userAddress, 
        fromTimestamp, 
        toTimestamp, 
        protocolSpecificFilters,
        providerUrl: httpUrl 
      });

      return await super.fetchUserPositions(params);

    } catch (error) {
      log.error('Failed to fetch Aave positions', { userAddress, error });
      throw error;
    }
  }

  protected async fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    log.info('Attempting to fetch positions from subgraph');
    throw new Error('Subgraph fetching not implemented');
  }

  protected async fetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const { userAddress } = params;
    if (!userAddress) {
      throw new Error('User address is required for fetching on-chain positions');
    }

    try {
      // Fetch positions from both V2 and V3 in parallel
      const [v2Positions, v3Positions] = await Promise.all([
        this.fetchV2Positions(userAddress, params),
        this.fetchV3Positions(userAddress, params)
      ]);

      // Merge and return all positions
      return [...v2Positions, ...v3Positions];

    } catch (error) {
      log.error('Error fetching on-chain positions', { error, userAddress });
      throw error;
    }
  }

  private async fetchV2Positions(userAddress: string, params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const provider = await this.getProvider();
    const networkContracts = CONTRACT_ADDRESSES.AAVE.V2_ETH_MAINNET;
    const cacheKey = this.cacheService.getCacheKey('aave', 'v2', userAddress, 'positions');
    
    const cachedData = this.cacheService.get<UserProtocolPosition[]>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const lendingPool = new ethers.Contract(
        networkContracts.LENDING_POOL,
        [
          'function getUserAccountData(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
          'function getUserConfiguration(address) view returns (uint256)',
          'function getReservesList() view returns (address[])'
        ],
        provider
      );

      const dataProvider = new ethers.Contract(
        networkContracts.PROTOCOL_DATA_PROVIDER,
        [
          'function getUserReserveData(address, address) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint40, bool)',
          'function getReserveConfigurationData(address) view returns (uint256, uint256, uint256, uint256, uint256)'
        ],
        provider
      );

      const priceOracle = new ethers.Contract(
        networkContracts.PRICE_ORACLE,
        ['function getAssetPrice(address) view returns (uint256)'],
        provider
      );

      // Get user account data and reserves list
      const [accountData, reservesList] = await Promise.all([
        lendingPool.getUserAccountData(userAddress),
        lendingPool.getReservesList()
      ]);

      const [
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH,
        currentLiquidationThreshold,
        ltv,
        healthFactor
      ] = accountData;

      // Get user reserve data and prices for each asset
      const reservesData = await Promise.all(
        reservesList.map(async (asset: string) => {
          const [userReserveData, configData, assetPrice] = await Promise.all([
            dataProvider.getUserReserveData(asset, userAddress),
            dataProvider.getReserveConfigurationData(asset),
            priceOracle.getAssetPrice(asset)
          ]);

          const tokenContract = new ethers.Contract(
            asset,
            ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
            provider
          );

          const [symbol, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals()
          ]);

          return {
            symbol,
            decimals,
            price: assetPrice,
            currentATokenBalance: userReserveData[0],
            currentStableDebt: userReserveData[1],
            currentVariableDebt: userReserveData[2]
          };
        })
      );

      // Format borrowed assets with ETH values
      const borrowedAssets = reservesData
        .filter(data => data.currentStableDebt > 0n || data.currentVariableDebt > 0n)
        .map(data => {
          const totalDebt = ethers.toBigInt(data.currentStableDebt) + ethers.toBigInt(data.currentVariableDebt);
          const valueETH = (totalDebt * data.price) / ethers.toBigInt(10 ** data.decimals);
          
          return {
            symbol: data.symbol,
            amount: ethers.formatUnits(totalDebt, data.decimals),
            valueETH: ethers.formatEther(valueETH)
          };
        });

      const positions = [{
        protocol: this.protocol,
        network: this.network,
        version: AaveVersion.V2,
        userAddress,
        collateral: ethers.formatEther(totalCollateralETH),
        debt: ethers.formatEther(totalDebtETH),
        healthFactor: ethers.formatEther(healthFactor),
        liquidationRisk: {
          threshold: ethers.formatEther(currentLiquidationThreshold),
          currentLTV: ethers.formatEther(ltv)
        },
        borrowedAssets,
        timestamp: Date.now(),
        periodStart: params.fromTimestamp,
        periodEnd: params.toTimestamp
      }];

      this.cacheService.set(cacheKey, positions);
      return positions;

    } catch (error) {
      log.error('Error fetching V2 positions', { error, userAddress });
      return [];
    }
  }

  private async fetchV3Positions(userAddress: string, params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const provider = await this.getProvider();
    const networkContracts = CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET;
    const cacheKey = this.cacheService.getCacheKey('aave', 'v3', userAddress, 'positions');
    
    const cachedData = this.cacheService.get<UserProtocolPosition[]>(cacheKey);
    if (cachedData) return cachedData;

    try {
      const poolContract = new ethers.Contract(
        networkContracts.POOL,
        AAVE_POOL_ABI,
        provider
      );
      
      const dataProviderContract = new ethers.Contract(
        networkContracts.POOL_DATA_PROVIDER,
        AAVE_POOL_DATA_PROVIDER_ABI,
        provider
      );
      
      const oracleContract = new ethers.Contract(
        networkContracts.ORACLE,
        AAVE_ORACLE_ABI,
        provider
      );

      // Fetch user account data and reserves list in parallel
      const [accountData, reservesList] = await Promise.all([
        poolContract.getUserAccountData(userAddress),
        poolContract.getReservesList()
      ]) as [any, string[]];  

      // Fetch reserve data and prices in parallel
      const [reservesData, prices] = await Promise.all([
        Promise.all(
          reservesList.map((asset: string) => 
            dataProviderContract.getUserReserveData(asset, userAddress)
          )
        ),
        oracleContract.getAssetsPrices(reservesList)
      ]) as [any[], bigint[]];  

      // Process asset data
      const assets = await Promise.all(
        reservesList.map(async (asset: string, index: number) => {
          const reserveData = reservesData[index];
          const tokenContract = new ethers.Contract(
            asset,
            ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
            provider
          );

          const [symbol, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals()
          ]);

          return {
            symbol,
            decimals,
            price: prices[index],
            balance: reserveData.currentATokenBalance,
            debt: ethers.toBigInt(reserveData.currentStableDebt) + 
                  ethers.toBigInt(reserveData.currentVariableDebt)
          };
        })
      );

      // Calculate total values in base currency (usually ETH)
      const totalCollateralETH = ethers.formatEther(accountData.totalCollateralBase);
      const totalDebtETH = ethers.formatEther(accountData.totalDebtBase);
      const healthFactor = ethers.formatEther(accountData.healthFactor);

      // Format borrowed assets
      const borrowedAssets = assets
        .filter(asset => asset.debt > 0n)
        .map(asset => ({
          symbol: asset.symbol,
          amount: ethers.formatUnits(asset.debt, asset.decimals),
          valueETH: ethers.formatEther(
            (asset.debt * ethers.toBigInt(asset.price)) / ethers.toBigInt(10n ** BigInt(asset.decimals))
          )
        }));

      const positions = [{
        protocol: this.protocol,
        network: this.network,
        version: AaveVersion.V3,
        userAddress,
        collateral: totalCollateralETH,
        debt: totalDebtETH,
        healthFactor,
        liquidationRisk: {
          threshold: ethers.formatEther(accountData.currentLiquidationThreshold),
          currentLTV: ethers.toBigInt(accountData.totalDebtBase) === 0n ? '0' :
            ethers.formatEther(
              (ethers.toBigInt(accountData.totalDebtBase) * 10000n) /
              ethers.toBigInt(accountData.totalCollateralBase)
            )
        },
        borrowedAssets,
        timestamp: Date.now(),
        periodStart: params.fromTimestamp,
        periodEnd: params.toTimestamp
      }];

      this.cacheService.set(cacheKey, positions);
      return positions;

    } catch (error) {
      log.error('Error fetching V3 positions', { error, userAddress });
      return [];
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      // Clear health check interval if it exists
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      // Reset initialization flag
      this.initialized = false;

      // Call base class cleanup
      await super.cleanup();
      
      log.info('Aave service cleanup completed');
    } catch (error) {
      log.error('Error during Aave service cleanup', { error });
      throw error;
    }
  }

  // Implementation of required abstract methods
  async getHealthFactor(params: QueryParams): Promise<string> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    // Placeholder implementation
    return '0.0';
  }

  async getPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    return this.fetchUserPositions(params);
  }
}

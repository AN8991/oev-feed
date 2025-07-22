import { JsonRpcProvider, Contract } from 'ethers';
import { ProtocolAdapterPort } from '@domain/ports/secondary/protocol-adapter.port';
import { PositionModel } from '@domain/models/position.model';
import { AavePositionDTO } from '@application/dto/aave-position.dto';
import { AavePositionMapper } from '@application/mappers/aave-position.mapper';
import { normalizeAddress } from '@domain/utils/address-utils';
import { formatToEther } from '@domain/utils/numeric-utils';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';

/**
 * Aave V3 Protocol Adapter for Ethereum
 * Implements the ProtocolAdapterPort for interacting with Aave V3 on Ethereum
 */
export class AaveV3EthereumAdapter implements ProtocolAdapterPort {
  // Protocol and network identifiers
  private readonly PROTOCOL = 'aave-v3';
  private readonly NETWORK = 'ethereum';
  private readonly VERSION = 'v3';
  
  // Contract addresses - these would be loaded from configuration
  private poolAddress: string;
  private dataProviderAddress: string;
  private oracleAddress: string;
  
  // Contracts
  private poolContract: Contract | null = null;
  private dataProviderContract: Contract | null = null;
  private oracleContract: Contract | null = null;
  
  // Provider
  private provider: JsonRpcProvider | null = null;
  
  // Initialization state
  private initialized = false;
  
  /**
   * Constructor
   * @param config Configuration with contract addresses and provider URL
   */
  constructor(config: {
    poolAddress: string;
    dataProviderAddress: string;
    oracleAddress: string;
    providerUrl: string;
  }) {
    this.poolAddress = normalizeAddress(config.poolAddress);
    this.dataProviderAddress = normalizeAddress(config.dataProviderAddress);
    this.oracleAddress = normalizeAddress(config.oracleAddress);
    
    // Create provider
    this.provider = new JsonRpcProvider(config.providerUrl);
  }
  
  /**
   * Initialize the adapter
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Ensure provider is available
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      // Pool contract (V3 ABI)
      this.poolContract = new Contract(
        this.poolAddress,
        [
          'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
          'function getReservesList() view returns (address[])'
        ],
        this.provider
      );

      // Data Provider contract (V3 ABI, no getReservesList here)
      this.dataProviderContract = new Contract(
        this.dataProviderAddress,
        [
          'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
          'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)'
        ],
        this.provider
      );

      // Oracle contract
      this.oracleContract = new Contract(
        this.oracleAddress,
        [
          'function getAssetPrice(address asset) view returns (uint256)'
        ],
        this.provider
      );
      
      this.initialized = true;
      logger.info(`AaveV3EthereumAdapter initialized for ${this.PROTOCOL} on ${this.NETWORK}`, LogCategory.PROVIDER);
    } catch (error) {
      logger.error('Failed to initialize AaveV3EthereumAdapter:', LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to initialize AaveV3EthereumAdapter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get the protocol identifier
   */
  public getProtocol(): string {
    return this.PROTOCOL;
  }
  
  /**
   * Get the network identifier
   */
  public getNetwork(): string {
    return this.NETWORK;
  }
  
  /**
   * Fetch user positions from the protocol
   * @param userAddress The user address to fetch positions for
   * @returns Array of user positions
   */
  public async fetchUserPositions(userAddress: string): Promise<PositionModel[]> {
    console.log('[AAVE-ADAPTER] ENTER fetchUserPositions');
    await this.ensureInitialized();
    console.log('[AAVE-ADAPTER] ensureInitialized complete');
    try {
      // Normalize address
      userAddress = normalizeAddress(userAddress);
      console.log('[AAVE-ADAPTER] userAddress normalized:', userAddress);
      // Get list of reserves from Pool contract
      const reserves = await this.getReservesList();
      console.log('[AAVE-ADAPTER] Reserves:', reserves);
      console.log('Total reserves:', reserves.length);

      // Create DTOs for each asset
      const positionDTOs: AavePositionDTO[] = [];
      let failedAssets: string[] = [];

      // Get account data for health factor, LTV, liquidation threshold
      let accountData: any;
      try {
        accountData = await this.poolContract!.getUserAccountData(userAddress);
        console.log('[AAVE-ADAPTER] accountData:', accountData);
      } catch (err) {
        console.error('[AAVE-ADAPTER] Error fetching accountData:', err);
        throw err;
      }

      for (const assetAddress of reserves) {
        try {
          // Get user reserve data
          const reserveData = await this.dataProviderContract!.getUserReserveData(assetAddress, userAddress);

          // Get asset symbol and decimals
          let symbol: string = '', decimals: number = 18;
          try {
            symbol = await this.getTokenSymbol(assetAddress);
            decimals = await this.getTokenDecimals(assetAddress);
          } catch (err) {
            console.error(`[AAVE-ADAPTER] Error fetching metadata for ${assetAddress}:`, err);
          }

          // Get price
          let price: string = '0';
          try {
            price = await this.oracleContract!.getAssetPrice(assetAddress);
          } catch (err) {
            console.error(`[AAVE-ADAPTER] Error fetching price for ${assetAddress}:`, err);
          }

          // Check if user has any position in this asset
          const hasCollateral = BigInt(reserveData.currentATokenBalance) > 0n;
          const hasDebt = BigInt(reserveData.currentStableDebt) > 0n || BigInt(reserveData.currentVariableDebt) > 0n;

          if (!hasCollateral && !hasDebt) {
            continue;
          }

          // Log conversion details for positions with actual balances
          console.log(`[AAVE-ADAPTER] Processing ${symbol} position:`);
          console.log('  aTokenBalance:', reserveData.currentATokenBalance.toString(), 'TotalDebt:', (BigInt(reserveData.currentStableDebt) + BigInt(reserveData.currentVariableDebt)).toString());

          // Calculate ETH values with proper BigInt arithmetic
          const priceInWei = BigInt(price); // Oracle price is in 8 decimals
          const collateralAmountWei = BigInt(reserveData.currentATokenBalance);
          const stableDebtWei = BigInt(reserveData.currentStableDebt);
          const variableDebtWei = BigInt(reserveData.currentVariableDebt);
          const totalDebtWei = stableDebtWei + variableDebtWei;
          
          // Convert to ETH values using proper BigInt arithmetic
          // Formula: (amount * price) / (10^(assetDecimals + priceDecimals))
          const oracleDecimals = 8n; // Oracle price decimals
          const assetDecimalsBig = BigInt(decimals);
          const divisor = 10n ** (assetDecimalsBig + oracleDecimals);
          
          const collateralETH = (collateralAmountWei * priceInWei / divisor).toString();
          const debtETH = (totalDebtWei * priceInWei / divisor).toString();
          
          // Extract health factor from account data
          const healthFactor = accountData.healthFactor ? accountData.healthFactor.toString() : '0';
          const liquidationThreshold = accountData.currentLiquidationThreshold ? accountData.currentLiquidationThreshold.toString() : '0';
          const ltv = accountData.ltv ? accountData.ltv.toString() : '0';

          // Construct proper DTO
          const dto: AavePositionDTO = {
            userAddress,
            assetAddress,
            assetSymbol: symbol,
            assetDecimals: decimals,
            aTokenBalance: reserveData.currentATokenBalance.toString(),
            stableDebt: reserveData.currentStableDebt.toString(),
            variableDebt: reserveData.currentVariableDebt.toString(),
            principalStableDebt: reserveData.principalStableDebt.toString(),
            scaledVariableDebt: reserveData.scaledVariableDebt.toString(),
            collateralETH,
            debtETH,
            healthFactor,
            liquidationThreshold,
            ltv,
            protocol: this.PROTOCOL,
            network: this.NETWORK,
            version: this.VERSION,
            lastUpdated: Date.now()
          };
          
          console.log(`[AAVE-ADAPTER] ✅ Created position for ${symbol} - Collateral: ${dto.aTokenBalance}, Debt: ${BigInt(dto.stableDebt) + BigInt(dto.variableDebt)}`);
          positionDTOs.push(dto);
        } catch (error) {
          console.error(`[AAVE-ADAPTER] Error processing asset ${assetAddress}:`, error);
          failedAssets.push(assetAddress);
        }
      }
      if (positionDTOs.length === 0) {
        console.warn('No positions found. Failed assets:', failedAssets);
      }
      // Map DTOs to domain models
      return AavePositionMapper.toDomainList(positionDTOs);
    } catch (error) {
      logger.error('Error fetching user positions:', LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      console.error('Error fetching user positions (outer catch):', error);
      // Print full error stack if available
      if (error instanceof Error && error.stack) {
        console.error('Full error stack:', error.stack);
      }
      throw new Error(`Failed to fetch user positions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get health factor for a user
   * @param userAddress The user address to fetch health factor for
   * @returns Formatted health factor as a string
   */
  public async getHealthFactor(userAddress: string): Promise<string> {
    await this.ensureInitialized();
    
    try {
      // Normalize address
      userAddress = normalizeAddress(userAddress);
      
      // Get account data
      const accountData = await this.poolContract!.getUserAccountData(userAddress);
      
      // Parse and return health factor
      return this.parseHealthFactor(accountData.healthFactor);
    } catch (error) {
      logger.error('Error fetching health factor:', LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch health factor: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // No specific cleanup needed for ethers.js contracts
    this.initialized = false;
    logger.info(`AaveV3EthereumAdapter cleaned up for ${this.PROTOCOL} on ${this.NETWORK}`, LogCategory.PROVIDER);
  }
  
  /**
   * Get the list of reserves from the Pool contract
   * @returns Array of reserve addresses
   */
  private async getReservesList(): Promise<string[]> {
    try {
      // Use Pool contract in V3
      const reserves = await this.poolContract!.getReservesList();
      return reserves.map((address: string) => normalizeAddress(address));
    } catch (error) {
      logger.error('Error fetching reserves list:', LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch reserves list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get user reserve data for a specific asset
   * @param userAddress User address
   * @param assetAddress Asset address
   * @returns User reserve data
   */
  private async getUserReserveData(userAddress: string, assetAddress: string): Promise<any> {
    try {
      return await this.dataProviderContract!.getUserReserveData(assetAddress, userAddress);
    } catch (error) {
      logger.error(`Error fetching user reserve data for asset ${assetAddress}:`, LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch user reserve data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get reserve configuration data (V3 specific)
   * @param assetAddress Asset address
   * @returns Reserve configuration data
   */
  private async getReserveConfigurationData(assetAddress: string): Promise<any> {
    try {
      return await this.dataProviderContract!.getReserveConfigurationData(assetAddress);
    } catch (error) {
      logger.error(`Error fetching reserve configuration for asset ${assetAddress}:`, LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch reserve configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get E-Mode category data (V3 specific)
   * @param eModeId E-Mode category ID
   * @returns E-Mode category data
   */
  private async getEModeCategoryData(eModeId: number): Promise<any> {
    try {
      // Skip if E-Mode is disabled (0)
      if (eModeId === 0) {
        return null;
      }
      
      return await this.poolContract!.getEModeCategoryData(eModeId);
    } catch (error) {
      logger.error(`Error fetching E-Mode category data for ID ${eModeId}:`, LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
  
  /**
   * Get token symbol from contract
   * @param assetAddress Asset address
   * @returns Token symbol
   */
  private async getTokenSymbol(assetAddress: string): Promise<string> {
    try {
      const tokenContract = new Contract(
        assetAddress,
        ['function symbol() view returns (string)'],
        this.provider!
      );
      return await tokenContract.symbol();
    } catch (error) {
      logger.debug(`Error fetching token symbol for asset ${assetAddress}:`, LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      // Return shortened address as fallback
      return assetAddress.substring(0, 6) + '...' + assetAddress.substring(assetAddress.length - 4);
    }
  }
  
  /**
   * Get token decimals from contract
   * @param assetAddress Asset address
   * @returns Token decimals
   */
  private async getTokenDecimals(assetAddress: string): Promise<number> {
    try {
      const tokenContract = new Contract(
        assetAddress,
        ['function decimals() view returns (uint8)'],
        this.provider!
      );
      const decimals = await tokenContract.decimals();
      // Convert BigInt to number to prevent BigInt/number mixing errors
      return Number(decimals);
    } catch (error) {
      logger.debug(`Error fetching token decimals for asset ${assetAddress}:`, LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      // Return default decimals as fallback
      return 18;
    }
  }
  
  /**
   * Parse and normalize health factor from contract response
   * @param healthFactor Health factor from contract
   * @returns Formatted health factor
   */
  private parseHealthFactor(healthFactor: any): string {
    if (!healthFactor || healthFactor === '0') {
      return '0';
    }
    
    try {
      // Convert to BigInt if it's not already
      const healthFactorBigInt = typeof healthFactor === 'bigint' 
        ? healthFactor 
        : BigInt(healthFactor.toString());

      // Check for max uint256 value, which often indicates uninitialized state
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const HALF_MAX_UINT256 = MAX_UINT256 / BigInt(2);

      // If health factor is extremely large, return 0
      if (healthFactorBigInt >= HALF_MAX_UINT256) {
        logger.warn('Extremely large health factor detected, likely uninitialized', LogCategory.PROVIDER);
        return '0';
      }

      // Format health factor with 18 decimal places
      return formatToEther(healthFactorBigInt);
    } catch (error) {
      logger.error('Error parsing health factor:', LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      
      // If we can't parse, try to return a reasonable value
      if (typeof healthFactor === 'string') {
        // If it's already a string, just return it
        return healthFactor;
      } else {
        // Convert to string as a fallback
        return String(healthFactor);
      }
    }
  }
  
  /**
   * Format percentage value from basis points (10000 = 100%)
   * @param basisPoints Basis points value
   * @returns Formatted percentage string
   */
  private formatPercentage(basisPoints: any): string {
    try {
      const value = typeof basisPoints === 'bigint' 
        ? basisPoints 
        : BigInt(basisPoints.toString());
      
      // Convert basis points to percentage (10000 = 100%)
      const percentage = Number(value) / 100;
      
      return percentage.toFixed(2);
    } catch (error) {
      logger.error('Error formatting percentage:', LogCategory.PROVIDER, error instanceof Error ? error : new Error(String(error)));
      return '0';
    }
  }
  
  /**
   * Ensure the adapter is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

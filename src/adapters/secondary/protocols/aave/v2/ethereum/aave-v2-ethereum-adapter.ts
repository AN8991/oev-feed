import { JsonRpcProvider, Contract } from 'ethers';
import { ProtocolAdapterPort } from '@domain/ports/secondary/protocol-adapter.port';
import { PositionModel } from '@domain/models/position.model';
import { AavePositionDTO } from '@application/dto/aave-position.dto';
import { AavePositionMapper } from '@application/mappers/aave-position.mapper';
import { normalizeAddressChecksum as normalizeAddress } from '@domain/utils/address-utils';
import { formatToEther } from '@domain/utils/numeric-utils';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';

/**
 * Aave V2 Protocol Adapter for Ethereum
 * Implements the ProtocolAdapterPort for interacting with Aave V2 on Ethereum
 */
export class AaveV2EthereumAdapter implements ProtocolAdapterPort {
  // Protocol and network identifiers
  private readonly PROTOCOL = 'aave-v2';
  private readonly NETWORK = 'ethereum';
  private readonly VERSION = 'v2';
  
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
      
      // Initialize contracts
      this.poolContract = new Contract(
        this.poolAddress,
        [
          'function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
          'function getReservesList() view returns (address[])'
        ],
        this.provider
      );
      
      this.dataProviderContract = new Contract(
        this.dataProviderAddress,
        [
          'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
          'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)'
        ],
        this.provider
      );
      
      this.oracleContract = new Contract(
        this.oracleAddress,
        [
          'function getAssetPrice(address asset) view returns (uint256)'
        ],
        this.provider
      );
      
      this.initialized = true;
      logger.info(`AaveV2EthereumAdapter initialized for ${this.PROTOCOL} on ${this.NETWORK}`, LogCategory.PROVIDER);
    } catch (error) {
      logger.error('Failed to initialize AaveV2EthereumAdapter:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to initialize AaveV2EthereumAdapter: ${error instanceof Error ? error.message : String(error)}`);
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
    await this.ensureInitialized();
    
    try {
      // Normalize user address
      const normalizedUserAddress = normalizeAddress(userAddress);
      
      // Get user account data
      const accountData = await this.poolContract!.getUserAccountData(normalizedUserAddress);
      
      // Get reserves list
      const reserves = await this.getReservesList();
      
      // Fetch position data for each reserve
      const positionDTOs: AavePositionDTO[] = [];
      
      for (const assetAddress of reserves) {
        try {
          // Get user reserve data
          const reserveData = await this.getUserReserveData(normalizedUserAddress, assetAddress);
          
          // Check if user has any position in this asset
          const hasCollateral = BigInt(reserveData.currentATokenBalance) > 0n;
          const hasDebt = BigInt(reserveData.currentStableDebt) > 0n || BigInt(reserveData.currentVariableDebt) > 0n;
          
          // Skip if user has no position in this asset
          if (!hasCollateral && !hasDebt) {
            continue;
          }
          
          // Get asset symbol and decimals
          const assetSymbol = await this.getTokenSymbol(assetAddress);
          const assetDecimals = await this.getTokenDecimals(assetAddress);
          
          // Get asset price from oracle
          const assetPrice = await this.getAssetPrice(assetAddress);
          
          // Calculate collateral and debt in ETH
          const collateralETH = this.calculateCollateralETH(
            reserveData.currentATokenBalance,
            assetPrice,
            assetDecimals
          );
          
          const debtETH = this.calculateDebtETH(
            reserveData.currentStableDebt,
            reserveData.currentVariableDebt,
            assetPrice,
            assetDecimals
          );
          
          // Create position DTO
          const positionDTO: AavePositionDTO = {
            userAddress: normalizedUserAddress,
            assetAddress,
            assetSymbol,
            assetDecimals,
            aTokenBalance: reserveData.currentATokenBalance.toString(),
            stableDebt: reserveData.currentStableDebt.toString(),
            variableDebt: reserveData.currentVariableDebt.toString(),
            principalStableDebt: reserveData.principalStableDebt.toString(),
            scaledVariableDebt: reserveData.scaledVariableDebt.toString(),
            collateralETH: collateralETH,
            debtETH: debtETH,
            healthFactor: this.parseHealthFactor(accountData.healthFactor),
            liquidationThreshold: this.formatPercentage(accountData.currentLiquidationThreshold),
            ltv: this.formatPercentage(accountData.ltv),
            protocol: this.PROTOCOL,
            network: this.NETWORK,
            version: this.VERSION,
            lastUpdated: Date.now()
          };
          
          positionDTOs.push(positionDTO);
        } catch (error) {
          logger.error(`Error fetching data for asset ${assetAddress}:`, LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
          // Continue with next asset
        }
      }
      
      // Map DTOs to domain models
      return AavePositionMapper.toDomainList(positionDTOs);
    } catch (error) {
      logger.error('Error fetching user positions:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
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
      // Normalize user address
      const normalizedUserAddress = normalizeAddress(userAddress);
      
      // Get user account data
      const accountData = await this.poolContract!.getUserAccountData(normalizedUserAddress);
      
      // Parse and return health factor
      return this.parseHealthFactor(accountData.healthFactor);
    } catch (error) {
      logger.error('Error fetching health factor:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch health factor: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // No specific cleanup needed for ethers.js contracts
    this.initialized = false;
    logger.info(`AaveV2EthereumAdapter cleaned up for ${this.PROTOCOL} on ${this.NETWORK}`, LogCategory.PROVIDER);
  }
  
  /**
   * Get the list of reserves from the pool contract
   * @returns Array of reserve addresses
   */
  private async getReservesList(): Promise<string[]> {
    try {
      const reserves = await this.poolContract!.getReservesList();
      return reserves.map((address: string) => normalizeAddress(address));
    } catch (error) {
      logger.error('Error fetching reserves list:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
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
      logger.error(`Error fetching user reserve data for asset ${assetAddress}:`, LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch user reserve data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get asset price from oracle
   * @param assetAddress Asset address
   * @returns Asset price in ETH
   */
  private async getAssetPrice(assetAddress: string): Promise<string> {
    try {
      const price = await this.oracleContract!.getAssetPrice(assetAddress);
      return price.toString();
    } catch (error) {
      logger.error(`Error fetching asset price for ${assetAddress}:`, LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
      return '0';
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
      logger.debug(`Error fetching token symbol for asset ${assetAddress}:`, LogCategory.PROVIDER, { assetAddress });
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
      return await tokenContract.decimals();
    } catch (error) {
      logger.debug(`Error fetching token decimals for asset ${assetAddress}:`, LogCategory.PROVIDER, { assetAddress });
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
      logger.error('Error parsing health factor:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
      
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
      logger.error('Error formatting percentage:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
      return '0';
    }
  }
  
  /**
   * Calculate collateral value in ETH
   * @param aTokenBalance aToken balance
   * @param assetPrice Asset price in ETH
   * @param assetDecimals Asset decimals
   * @returns Collateral value in ETH as string
   */
  private calculateCollateralETH(
    aTokenBalance: any,
    assetPrice: string,
    assetDecimals: number
  ): string {
    try {
      // Convert to BigInt
      const balance = typeof aTokenBalance === 'bigint'
        ? aTokenBalance
        : BigInt(aTokenBalance.toString());
      
      const price = BigInt(assetPrice);
      
      // If either is zero, return zero
      if (balance === 0n || price === 0n) {
        return '0';
      }
      
      // Calculate value in ETH
      // value = balance * price / (10 ** assetDecimals)
      const divisor = BigInt(10) ** BigInt(assetDecimals);
      const valueInWei = (balance * price) / divisor;
      
      // Format to ETH
      return formatToEther(valueInWei);
    } catch (error) {
      logger.error('Error calculating collateral in ETH:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
      return '0';
    }
  }
  
  /**
   * Calculate debt value in ETH
   * @param stableDebt Stable debt
   * @param variableDebt Variable debt
   * @param assetPrice Asset price in ETH
   * @param assetDecimals Asset decimals
   * @returns Debt value in ETH as string
   */
  private calculateDebtETH(
    stableDebt: any,
    variableDebt: any,
    assetPrice: string,
    assetDecimals: number
  ): string {
    try {
      // Convert to BigInt
      const stableDebtBigInt = typeof stableDebt === 'bigint'
        ? stableDebt
        : BigInt(stableDebt.toString());
      
      const variableDebtBigInt = typeof variableDebt === 'bigint'
        ? variableDebt
        : BigInt(variableDebt.toString());
      
      const price = BigInt(assetPrice);
      
      // If all are zero, return zero
      if (stableDebtBigInt === 0n && variableDebtBigInt === 0n || price === 0n) {
        return '0';
      }
      
      // Calculate total debt
      const totalDebt = stableDebtBigInt + variableDebtBigInt;
      
      // Calculate value in ETH
      // value = totalDebt * price / (10 ** assetDecimals)
      const divisor = BigInt(10) ** BigInt(assetDecimals);
      const valueInWei = (totalDebt * price) / divisor;
      
      // Format to ETH
      return formatToEther(valueInWei);
    } catch (error) {
      logger.error('Error calculating debt in ETH:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
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

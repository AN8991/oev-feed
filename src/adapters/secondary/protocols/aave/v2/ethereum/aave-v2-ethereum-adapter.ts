import { JsonRpcProvider, Contract } from 'ethers';
import { Logger } from '@nestjs/common';
import { ProtocolAdapterPort } from '../../../../../../domain/ports/secondary/protocol-adapter.port';
import { PositionModel } from '../../../../../../domain/models/position.model';
import { AavePositionDTO } from '../../../../../../application/dto/aave-position.dto';
import { AavePositionMapper } from '../../../../../../application/mappers/aave-position.mapper';
import { normalizeAddress } from '../../../../../../domain/utils/address-utils';
import { formatToEther } from '../../../../../../domain/utils/numeric-utils';
import { Protocol } from '../../../../../../domain/enums/protocols.enum';
import { Network } from '../../../../../../domain/enums/networks.enum';

/**
 * Aave V2 Protocol Adapter for Ethereum
 * Implements the ProtocolAdapterPort for interacting with Aave V2 on Ethereum
 */
export class AaveV2EthereumAdapter implements ProtocolAdapterPort {
  private readonly logger = new Logger(AaveV2EthereumAdapter.name);
  
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
  
  // Mapper
  private mapper: AavePositionMapper | null = null;
  
  // Initialization state
  private initialized = false;
  
  /**
   * Constructor
   * @param config Configuration with contract addresses and provider URL
   * @param mapper AavePositionMapper instance for data transformation
   */
  constructor(
    config: {
      poolAddress: string;
      dataProviderAddress: string;
      oracleAddress: string;
      providerUrl: string;
    },
    mapper?: AavePositionMapper
  ) {
    // Validate contract addresses before normalization
    if (!config.poolAddress || config.poolAddress.trim() === '') {
      throw new Error('AAVE_V2_ETHEREUM_POOL address is required but not configured in environment variables');
    }
    if (!config.dataProviderAddress || config.dataProviderAddress.trim() === '') {
      throw new Error('AAVE_V2_ETHEREUM_DATA_PROVIDER address is required but not configured in environment variables');
    }
    if (!config.oracleAddress || config.oracleAddress.trim() === '') {
      throw new Error('AAVE_V2_ETHEREUM_ORACLE address is required but not configured in environment variables');
    }
    if (!config.providerUrl || config.providerUrl.trim() === '') {
      throw new Error('ETHEREUM_RPC_URL is required but not configured in environment variables');
    }

    this.poolAddress = normalizeAddress(config.poolAddress);
    this.dataProviderAddress = normalizeAddress(config.dataProviderAddress);
    this.oracleAddress = normalizeAddress(config.oracleAddress);
    
    // Set mapper (optional for backward compatibility)
    this.mapper = mapper || null;
    
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
          'function getReservesList() view returns (address[])',
          // Event signatures for user discovery
          'event Deposit(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referral)',
          'event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint256 borrowRateMode, uint256 borrowRate, uint16 indexed referral)'
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
      this.logger.log(`AaveV2EthereumAdapter initialized for ${this.PROTOCOL} on ${this.NETWORK}`);
    } catch (error) {
      this.logger.error('Failed to initialize AaveV2EthereumAdapter:', undefined, error instanceof Error ? error : new Error(String(error)));
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
   * @param params Query parameters including user addresses and filters
   * @returns Array of user positions
   */
  public async fetchUserPositions(params: {
    userAddresses: string[];
    filterCriteria?: any;
    startTimestamp?: number;
    endTimestamp?: number;
  }): Promise<PositionModel[]> {
    await this.ensureInitialized();
    
    const allPositions: PositionModel[] = [];
    
    // Process each user address
    for (const userAddress of params.userAddresses) {
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
            lastUpdated: new Date()
          };
          
          positionDTOs.push(positionDTO);
        } catch (error) {
          this.logger.error(`Error fetching data for asset ${assetAddress}:`, undefined, error instanceof Error ? error : new Error(String(error)));
          // Continue with next asset
        }
      }
      
        // Map DTOs to domain models
        const userPositions = this.mapper ? this.mapper.toDomainList(positionDTOs) : [];
        allPositions.push(...userPositions);
      } catch (error) {
        this.logger.error(`Error fetching positions for user ${userAddress}:`, undefined, error instanceof Error ? error : new Error(String(error)));
        // Continue with next user address
      }
    }
    
    return allPositions;
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
      this.logger.error('Error fetching health factor:', undefined, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch health factor: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // No specific cleanup needed for ethers.js contracts
    this.initialized = false;
    this.logger.log(`AaveV2EthereumAdapter cleaned up for ${this.PROTOCOL} on ${this.NETWORK}`);
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
      this.logger.error('Error fetching reserves list:', undefined, error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error(`Error fetching user reserve data for asset ${assetAddress}:`, undefined, error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error(`Error fetching asset price for ${assetAddress}:`, undefined, error instanceof Error ? error : new Error(String(error)));
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific non-standard ERC-20 token issues
      if (errorMessage.includes('could not decode result data')) {
        this.logger.warn(`Non-standard ERC-20 token detected at ${assetAddress}. Token returns bytes32 instead of string for symbol() - likely legacy token like MKR. Using address fallback.`);
      } else if (errorMessage.includes('BAD_DATA')) {
        this.logger.warn(`Invalid symbol() response from token ${assetAddress}. Token may not implement ERC-20 standard correctly. Using address fallback.`);
      } else {
        this.logger.warn(`Failed to fetch symbol for token ${assetAddress}: ${errorMessage}. Using address fallback.`);
      }
      
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
      this.logger.debug(`Error fetching token decimals for asset ${assetAddress}:`, { assetAddress });
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
        this.logger.warn('Extremely large health factor detected, likely uninitialized');
        return '0';
      }

      // Format health factor with 18 decimal places
      return formatToEther(healthFactorBigInt);
    } catch (error) {
      this.logger.error('Error parsing health factor:', undefined, error instanceof Error ? error : new Error(String(error)));
      
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
      this.logger.error('Error formatting percentage:', undefined, error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error('Error calculating collateral in ETH:', undefined, error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error('Error calculating debt in ETH:', undefined, error instanceof Error ? error : new Error(String(error)));
      return '0';
    }
  }
  
  /**
   * Discover active users with positions that have health factor below threshold
   * Uses direct contract queries to find users with active positions
   * @param network Network identifier (should be 'ethereum')
   * @param fromTimestamp Start timestamp for filtering (May 2025)
   * @param toTimestamp End timestamp for filtering (current date)
   * @returns Promise resolving to array of user discovery results
   */
  public async discoverActiveUsers(
    network: Network,
    fromTimestamp: Date,
    toTimestamp: Date
  ): Promise<Array<{
    address: string;
    protocol: Protocol;
    network: Network;
    healthFactor: number;
    collateral: string;
    debt: string;
  }>> {
    await this.ensureInitialized();
    
    this.logger.log(`Starting user discovery for AAVE V2 on ${network} from ${fromTimestamp} to ${toTimestamp}`);
    
    try {
      if (!this.poolContract) {
        throw new Error('Pool contract not initialized');
      }

      // Query blockchain events to discover real users with active positions
      this.logger.debug('Querying AAVE V2 events to discover active users...');
      
      // Get current block number
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks (~2-3 days)
      
      // Query Deposit and Borrow events from the Pool contract
      const depositFilter = this.poolContract.filters.Deposit();
      const borrowFilter = this.poolContract.filters.Borrow();
      
      const [depositEvents, borrowEvents] = await Promise.all([
        this.poolContract.queryFilter(depositFilter, fromBlock, currentBlock),
        this.poolContract.queryFilter(borrowFilter, fromBlock, currentBlock)
      ]);
      
      // Extract unique user addresses from events
      const userAddresses = new Set<string>();
      
      // Add users from deposit events
      depositEvents.forEach(event => {
        if ('args' in event && event.args?.user) {
          userAddresses.add(event.args.user);
        }
      });
      
      // Add users from borrow events  
      borrowEvents.forEach(event => {
        if ('args' in event && event.args?.user) {
          userAddresses.add(event.args.user);
        }
      });
      
      this.logger.debug(`Found ${userAddresses.size} unique users from ${depositEvents.length} deposits and ${borrowEvents.length} borrows`);
      
      const discoveredUsers: Array<{
        address: string;
        protocol: Protocol;
        network: Network;
        healthFactor: number;
        collateral: string;
        debt: string;
      }> = [];
      
      // Check each user's current account data
      for (const userAddress of userAddresses) {
        try {
          // Get user account data from AAVE pool
          const accountData = await this.poolContract.getUserAccountData(userAddress);
          
          const [
            totalCollateralETH,
            totalDebtETH,
            availableBorrowsETH,
            currentLiquidationThreshold,
            ltv,
            healthFactor
          ] = accountData;
          
          // Convert health factor to number and check if it's below 5 and user has positions
          const hfValue = parseFloat(formatToEther(healthFactor));
          const collateralValue = parseFloat(formatToEther(totalCollateralETH));
          const debtValue = parseFloat(formatToEther(totalDebtETH));
          
          // Filter: health factor < 5 AND has active positions (collateral > 0 OR debt > 0)
          if (hfValue < 5 && hfValue > 0 && (collateralValue > 0 || debtValue > 0)) {
            discoveredUsers.push({
              address: normalizeAddress(userAddress),
              protocol: Protocol.AAVE_V2,
              network: Network.ETHEREUM,
              healthFactor: hfValue,
              collateral: totalCollateralETH.toString(),
              debt: totalDebtETH.toString(),
            });
            
            this.logger.debug(`Found active user ${userAddress} with HF: ${hfValue}`);
          }
        } catch (error) {
          // Skip users that don't exist or have errors
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.debug(`Skipping user ${userAddress}: ${errorMessage}`);
        }
      }
      
      this.logger.log(`Discovery completed: found ${discoveredUsers.length} active users`);
      return discoveredUsers;
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error during user discovery: ${errorMessage}`, errorStack);
      throw error;
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

import { JsonRpcProvider, Contract } from 'ethers';
import { Logger } from '@nestjs/common';
import { ProtocolAdapterPort } from '../../../../../../domain/ports/secondary/protocol-adapter.port';
import { PositionModel } from '../../../../../../domain/models/position.model';
import { AavePositionDTO } from '../../../../../../application/dto/aave-position.dto';
import { AavePositionMapper } from '../../../../../../application/mappers/aave-position.mapper';
import { normalizeAddress } from '../../../../../../domain/utils/address-utils';
import { formatToEther } from '../../../../../../domain/utils/numeric-utils';

/**
 * Aave V3 Protocol Adapter for Ethereum
 * Implements the ProtocolAdapterPort for interacting with Aave V3 on Ethereum
 */
export class AaveV3EthereumAdapter implements ProtocolAdapterPort {
  private readonly logger = new Logger(AaveV3EthereumAdapter.name);
  
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
  private multicallContract: Contract | null = null; // Multicall3 contract
  
  // Provider
  private provider: JsonRpcProvider | null = null;
  
  // Mapper
  private mapper: AavePositionMapper | null = null;
  
  // Initialization state
  private initialized = false;
  
  /**
   * Add delay between RPC calls to respect rate limits
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry operation with exponential backoff for rate limit errors
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        
        // Check if this is a rate limit error
        const isRateLimitError = errorMessage.includes('Too Many Requests') || 
                                errorMessage.includes('rate limit') ||
                                errorMessage.includes('429');
        
        if (isRateLimitError && i < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = baseDelay * Math.pow(2, i);
          this.logger.warn(`Rate limit hit (attempt ${i + 1}/${maxRetries}), retrying in ${delay}ms:`, errorMessage);
          await this.delay(delay);
          continue;
        }
        
        // Re-throw if not a rate limit error or we've exhausted retries
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }
  
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
      throw new Error('AAVE_V3_ETHEREUM_POOL address is required but not configured in environment variables');
    }
    if (!config.dataProviderAddress || config.dataProviderAddress.trim() === '') {
      throw new Error('AAVE_V3_ETHEREUM_DATA_PROVIDER address is required but not configured in environment variables');
    }
    if (!config.oracleAddress || config.oracleAddress.trim() === '') {
      throw new Error('AAVE_V3_ETHEREUM_ORACLE address is required but not configured in environment variables');
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
      
      // Test basic provider connectivity first
      this.logger.debug('Testing RPC provider connectivity...');
      try {
        const blockNumberPromise = this.provider.getBlockNumber();
        const providerTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Provider connectivity timeout after 10 seconds')), 10000);
        });
        
        const blockNumber = await Promise.race([blockNumberPromise, providerTimeoutPromise]);
        this.logger.debug(`Provider working, current block: ${blockNumber}`);
      } catch (providerError) {
        this.logger.error('Provider connectivity test failed:', providerError);
        throw new Error(`RPC provider connectivity failed: ${providerError instanceof Error ? providerError.message : String(providerError)}`);
      }
      
      // Initialize contracts
      this.poolContract = new Contract(
        this.poolAddress,
        [
          'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
          'function getReservesList() view returns (address[])',
          // Event signatures for user discovery
          'event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)',
          'event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint8 interestRateMode, uint256 borrowRate, uint16 indexed referralCode)'
        ],
        this.provider
      );
      
      // Test basic connectivity by calling getReservesList (should be fast)
      this.logger.debug('Testing pool contract connectivity...');
      try {
        const reservesPromise = this.poolContract.getReservesList();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getReservesList timeout after 10 seconds')), 10000);
        });
        
        const reserves = await Promise.race([reservesPromise, timeoutPromise]);
        this.logger.debug(`Pool contract working, found ${reserves.length} reserves`);
      } catch (testError) {
        this.logger.error('Pool contract test failed:', testError);
        throw new Error(`Pool contract connectivity test failed: ${testError instanceof Error ? testError.message : String(testError)}`);
      }

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
      
      // Initialize Multicall3 contract for batch processing (read-only)
      this.multicallContract = new Contract(
        '0xcA11bde05977b3631167028862bE2a173976CA11b', // Multicall3 on Ethereum
        [
          'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)'
        ],
        this.provider
      );
      
      this.initialized = true;
      this.logger.log(`AaveV3EthereumAdapter initialized for ${this.PROTOCOL} on ${this.NETWORK}`);
    } catch (error) {
      this.logger.error('Failed to initialize AaveV3EthereumAdapter:', error instanceof Error ? error : new Error(String(error)));
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
   * @param params Query parameters including user addresses and filters
   * @returns Array of user positions
   */
  public async fetchUserPositions(params: {
    userAddresses: string[];
    filterCriteria?: any;
    startTimestamp?: number;
    endTimestamp?: number;
  }): Promise<PositionModel[]> {
    this.logger.debug('Entering fetchUserPositions');
    await this.ensureInitialized();
    this.logger.debug('Adapter initialization complete');
    
    const allPositions: PositionModel[] = [];
    
    // Process each user address
    for (const userAddress of params.userAddresses) {
      try {
        // Normalize address
        const normalizedUserAddress = normalizeAddress(userAddress);
        this.logger.debug(`User address normalized: ${normalizedUserAddress}`);
      // Get list of reserves from Pool contract
      const reserves = await this.retryWithBackoff(() => this.getReservesList());
      this.logger.debug(`Found ${reserves.length} reserves`);
      //this.logger.debug(`Reserves: ${reserves.join(', ')}`);

      // Create DTOs for each asset
      const positionDTOs: AavePositionDTO[] = [];
      let failedAssets: string[] = [];

      // Get account data for health factor, LTV, liquidation threshold
        let accountData: any;
        try {
          accountData = await this.retryWithBackoff(() => 
            this.poolContract!.getUserAccountData(normalizedUserAddress)
          );
        this.logger.debug(`Account data for ${normalizedUserAddress}:`);
      } catch (err) {
        this.logger.error('Error fetching accountData:', err);
        throw err;
      }

      // Add delay between major contract calls
      await this.delay(100);

      for (const assetAddress of reserves) {
        try {
          // Get user reserve data
          const reserveData = await this.retryWithBackoff(() =>
            this.dataProviderContract!.getUserReserveData(assetAddress, normalizedUserAddress)
          );

          // Get asset symbol and decimals
          let symbol: string = '', decimals: number = 18;
          try {
            symbol = await this.retryWithBackoff(() => this.getTokenSymbol(assetAddress));
            decimals = await this.retryWithBackoff(() => this.getTokenDecimals(assetAddress));
          } catch (err) {
            this.logger.error(`Error fetching metadata for ${assetAddress}:`, err);
          }

          // Get price
          let price: string = '0';
          try {
            price = await this.retryWithBackoff(() =>
              this.oracleContract!.getAssetPrice(assetAddress)
            );
          } catch (err) {
            this.logger.error(`Error fetching price for ${assetAddress}:`, err);
          }

          // Add delay after asset processing before next asset
          await this.delay(50);

          // Check if user has any position in this asset
          const hasCollateral = BigInt(reserveData.currentATokenBalance) > 0n;
          const hasDebt = BigInt(reserveData.currentStableDebt) > 0n || BigInt(reserveData.currentVariableDebt) > 0n;

          if (!hasCollateral && !hasDebt) {
            continue;
          }

          // Log conversion details for positions with actual balances
          this.logger.debug(`Processing ${symbol} position:`);
          this.logger.debug(`  aTokenBalance: ${reserveData.currentATokenBalance.toString()}, TotalDebt: ${(BigInt(reserveData.currentStableDebt) + BigInt(reserveData.currentVariableDebt)).toString()}`);

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
            lastUpdated: new Date()
          };
          
          this.logger.debug(`Created position for ${symbol} - Collateral: ${dto.aTokenBalance}, Debt: ${BigInt(dto.stableDebt) + BigInt(dto.variableDebt)}`);
          positionDTOs.push(dto);
        } catch (error) {
          this.logger.error(`Error processing asset ${assetAddress}:`, error);
          failedAssets.push(assetAddress);
        }
      }
      if (positionDTOs.length === 0) {
        this.logger.warn(`No positions found. Failed assets: ${failedAssets.join(', ')}`);
      }
        // Map DTOs to domain models
        const userPositions = this.mapper ? this.mapper.toDomainList(positionDTOs) : [];
        allPositions.push(...userPositions);
      } catch (error) {
        this.logger.error(`Error fetching positions for user ${userAddress}:`, error instanceof Error ? error : new Error(String(error)));
        // Error already logged above with this.logger.error
        // Continue with next user address
      }

      // Add delay between user processing to respect rate limits
      await this.delay(200);
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
      // Normalize address
      userAddress = normalizeAddress(userAddress);
      this.logger.debug(`Getting account data for: ${userAddress}`);
      
      // Get account data with timeout
      this.logger.debug('Calling getUserAccountData...');
      const accountDataPromise = this.poolContract!.getUserAccountData(userAddress);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Contract call timeout after 30 seconds')), 30000);
      });
      
      const accountData = await Promise.race([accountDataPromise, timeoutPromise]);
      this.logger.debug(`Account data received - totalCollateralBase: ${accountData.totalCollateralBase.toString()}, totalDebtBase: ${accountData.totalDebtBase.toString()}, healthFactor: ${accountData.healthFactor.toString()}`);
      
      // Parse and return health factor
      const parsedHealthFactor = this.parseHealthFactor(accountData.healthFactor);
      this.logger.debug(`Parsed health factor: ${parsedHealthFactor}`);
      return parsedHealthFactor;
    } catch (error) {
      // Error already logged below with this.logger.error
      this.logger.error('Error fetching health factor:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to fetch health factor: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // No specific cleanup needed for ethers.js contracts
    this.initialized = false;
    this.logger.log(`AaveV3EthereumAdapter cleaned up for ${this.PROTOCOL} on ${this.NETWORK}`);
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
      this.logger.error('Error fetching reserves list:', error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error(`Error fetching user reserve data for asset ${assetAddress}:`, error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error(`Error fetching reserve configuration for asset ${assetAddress}:`, error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error(`Error fetching E-Mode category data for ID ${eModeId}:`, error instanceof Error ? error : new Error(String(error)));
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
      const decimals = await tokenContract.decimals();
      // Convert BigInt to number to prevent BigInt/number mixing errors
      return Number(decimals);
    } catch (error) {
      this.logger.debug(`Error fetching token decimals for asset ${assetAddress}:`, error instanceof Error ? error : new Error(String(error)));
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
    this.logger.debug(`parseHealthFactor input: ${healthFactor}, type: ${typeof healthFactor}`);
    
    if (!healthFactor || healthFactor === '0') {
      this.logger.debug('Health factor is 0 or falsy');
      return '0';
    }
    
    try {
      // Convert to BigInt if it's not already
      const healthFactorBigInt = typeof healthFactor === 'bigint' 
        ? healthFactor 
        : BigInt(healthFactor.toString());

      this.logger.debug(`Health factor as BigInt: ${healthFactorBigInt.toString()}`);

      // Check for max uint256 value, which often indicates no debt (infinite health factor)
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      const HALF_MAX_UINT256 = MAX_UINT256 / BigInt(2);

      // If health factor is extremely large, it means no debt (infinite health factor)
      if (healthFactorBigInt >= HALF_MAX_UINT256) {
        this.logger.debug('Extremely large health factor detected, returning MAX');
        return 'MAX';
      }

      // Use simple division instead of formatToEther to avoid potential issues
      const healthFactorNumber = Number(healthFactorBigInt) / Math.pow(10, 18);
      const result = healthFactorNumber.toFixed(4);
      this.logger.debug(`Calculated health factor: ${result}`);
      return result;
    } catch (error) {
      // Error already logged below with this.logger.error
      this.logger.error('Error parsing health factor:', error instanceof Error ? error : new Error(String(error)));
      
      // If we can't parse, try to return a reasonable value
      if (typeof healthFactor === 'string') {
        return healthFactor;
      } else {
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
      this.logger.error('Error formatting percentage:', error instanceof Error ? error : new Error(String(error)));
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
    network: string,
    fromTimestamp: Date,
    toTimestamp: Date,
    maxHealthFactor: number = 5
  ): Promise<Array<{
    address: string;
    protocol: string;
    network: string;
    healthFactor: number;
    collateral: string;
    debt: string;
  }>> {
    await this.ensureInitialized();
    
    this.logger.log(`Starting user discovery for AAVE V3 on ${network} from ${fromTimestamp} to ${toTimestamp}`);
    
    try {
      if (!this.poolContract) {
        throw new Error('Pool contract not initialized');
      }

      // Convert timestamps to block estimates (Ethereum ~12 seconds per block)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const fromTimestampSeconds = Math.floor(fromTimestamp.getTime() / 1000);
      const toTimestampSeconds = Math.floor(toTimestamp.getTime() / 1000);
      
      // Calculate block ranges based on timestamps
      const blocksFromStart = Math.floor((currentTimestamp - fromTimestampSeconds) / 12); // ~12 seconds per block
      const blocksFromEnd = Math.floor((currentTimestamp - toTimestampSeconds) / 12);
      
      // Get current block number
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      const currentBlock = await this.provider.getBlockNumber();
      
      // Calculate fromBlock and toBlock based on timestamps
      const fromBlock = Math.max(0, currentBlock - blocksFromStart);
      const toBlock = Math.max(0, currentBlock - blocksFromEnd);
      
      this.logger.debug(`Querying blocks from ${fromBlock} to ${toBlock} (${blocksFromStart} blocks, ~${Math.floor(blocksFromStart * 12 / 3600)} hours of data)`);
      
      // Query events in chunks to avoid RPC limits
      // Ankr free tier: max 2000 blocks per eth_getLogs request (500M req/month)
      // Alchemy free tier: max 10 blocks per eth_getLogs request
      // Infura: requires payment (exhausted free tier)
      const CHUNK_SIZE = 2000; // Query 2000 blocks at a time (Ankr limit)
      const allDepositEvents: any[] = [];
      const allBorrowEvents: any[] = [];
      
      for (let start = fromBlock; start < toBlock; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
        
        this.logger.debug(`Querying chunk: blocks ${start} to ${end}`);
        
        try {
          const [depositChunk, borrowChunk] = await Promise.all([
            this.poolContract!.queryFilter(this.poolContract!.filters.Supply(), start, end),
            this.poolContract!.queryFilter(this.poolContract!.filters.Borrow(), start, end)
          ]);
          
          allDepositEvents.push(...depositChunk);
          allBorrowEvents.push(...borrowChunk);
          
        } catch (error: any) {
          if (error.message.includes('more than 10000 results')) {
            this.logger.warn(`Chunk ${start}-${end} has too many events, skipping to avoid RPC limits`);
          } else {
            throw error;
          }
        }
        
        // Add delay to respect RPC rate limits
        // Public RPCs (Ankr): ~30-60 req/min, 1000ms delay = 60 req/min
        // Infura: 100 req/min, 700ms delay = ~85 req/min
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.logger.debug(`Total events collected: ${allDepositEvents.length} supplies, ${allBorrowEvents.length} borrows`);
      
      // Extract unique user addresses from events
      const userAddresses = new Set<string>();
      
      // Add users from supply events (AAVE V3 uses Supply instead of Deposit)
      allDepositEvents.forEach((event: any) => {
        if ('args' in event && event.args?.user) {
          userAddresses.add(event.args.user);
        }
      });
      
      // Add users from borrow events  
      allBorrowEvents.forEach((event: any) => {
        if ('args' in event && event.args?.user) {
          userAddresses.add(event.args.user);
        }
      });
      
      this.logger.debug(`Found ${userAddresses.size} unique users from ${allDepositEvents.length} supplies and ${allBorrowEvents.length} borrows`);
      
      const discoveredUsers: Array<{
        address: string;
        protocol: string;
        network: string;
        healthFactor: number;
        collateral: string;
        debt: string;
      }> = [];
      
      // Process users in batches using multicall for health factor checks
      const BATCH_SIZE = 10; // Start with smaller batch size for testing
      this.logger.debug(`Processing ${userAddresses.size} users in batches of ${BATCH_SIZE}`);
      
      const userAddressArray = Array.from(userAddresses);
      
      for (let i = 0; i < userAddressArray.length; i += BATCH_SIZE) {
        const batch = userAddressArray.slice(i, i + BATCH_SIZE);
        this.logger.debug(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userAddressArray.length / BATCH_SIZE)} (${batch.length} users)`);
        
        try {
          // Try multicall first
          let batchResults: any[] = [];
          let useMulticall = true;
          
          if (this.multicallContract) {
            try {
              // Prepare multicall calls for this batch
              const calls = batch.map(userAddress => ({
                target: this.poolAddress,
                callData: this.poolContract!.interface.encodeFunctionData('getUserAccountData', [userAddress])
              }));
              
              // Execute multicall
              const multicallResult = await this.multicallContract.tryAggregate(true, calls);
              this.logger.debug(`Multicall returned ${multicallResult.length} results`);
              
              // Process multicall results
              for (let j = 0; j < multicallResult.length; j++) {
                const { success, returnData } = multicallResult[j];
                if (success) {
                  try {
                    const decodedResult = this.poolContract!.interface.decodeFunctionResult('getUserAccountData', returnData);
                    batchResults.push({ userAddress: batch[j], data: decodedResult, success: true });
                  } catch (decodeError) {
                    this.logger.debug(`Failed to decode multicall result for ${batch[j]}:`, decodeError);
                    batchResults.push({ userAddress: batch[j], data: null, success: false });
                  }
                } else {
                  batchResults.push({ userAddress: batch[j], data: null, success: false });
                }
              }
              
            } catch (multicallError) {
              this.logger.warn(`Multicall failed for batch, falling back to sequential calls:`, multicallError);
              useMulticall = false;
            }
          } else {
            useMulticall = false;
          }
          
          // Fallback to sequential calls if multicall failed or unavailable
          if (!useMulticall) {
            this.logger.debug('Using sequential calls for this batch');
            for (const userAddress of batch) {
              try {
                const accountData = await this.poolContract!.getUserAccountData(userAddress);
                batchResults.push({ userAddress, data: accountData, success: true });
              } catch (error) {
                this.logger.debug(`Sequential call failed for ${userAddress}:`, error);
                batchResults.push({ userAddress, data: null, success: false });
              }
            }
          }
          
          // Process batch results
          for (const result of batchResults) {
            if (!result.success || !result.data) continue;
            
            try {
              const [
                totalCollateralBase,
                totalDebtBase,
                availableBorrowsBase,
                currentLiquidationThreshold,
                ltv,
                healthFactor
              ] = result.data;
              
              // Convert health factor to number and check if it's <= 5 and user has positions
              const hfValue = parseFloat(formatToEther(healthFactor));
              const collateralValue = parseFloat(formatToEther(totalCollateralBase));
              const debtValue = parseFloat(formatToEther(totalDebtBase));
              
              // Filter: health factor <= maxHealthFactor AND has active positions (collateral > 0 OR debt > 0)
              if (hfValue <= maxHealthFactor && hfValue > 0 && (collateralValue > 0 || debtValue > 0)) {
                discoveredUsers.push({
                  address: normalizeAddress(result.userAddress),
                  protocol: this.PROTOCOL,
                  network: this.NETWORK,
                  healthFactor: hfValue,
                  collateral: totalCollateralBase.toString(),
                  debt: totalDebtBase.toString(),
                });
                
                this.logger.debug(`Found active user ${result.userAddress} with HF: ${hfValue}`);
              }
            } catch (processError) {
              this.logger.debug(`Failed to process result for ${result.userAddress}:`, processError);
            }
          }
          
        } catch (batchError) {
          this.logger.warn(`Batch processing failed for batch starting at index ${i}:`, batchError);
          // Continue with next batch instead of failing completely
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

import { ethers } from 'ethers';
import { Network } from '../../../types/networks';
import { DataSourceType, Protocol, ProtocolQueryParams, UserProtocolPosition } from '../../../types/protocols';
import { log } from '../../../utils/logger';
import { 
  BaseProtocolService, 
  ProtocolConfig 
} from '../common/base-protocol';
import { DataSourceFallbackService } from '../common/data-source-fallback';
import { AaveConfig, AaveVersion } from './aave-config';
import { AaveAbiProvider } from './aave-abi-provider';
import { AaveAddressProvider } from './aave-address-provider';
import { GET_USER_POSITIONS, GET_PROTOCOL_POSITIONS } from './queries';

// Use log directly instead of creating a child logger

/**
 * Service for interacting with Aave protocol
 */
export class AaveService extends BaseProtocolService {
  // Configuration
  private poolAddress: string;
  private dataProviderAddress: string;
  private oracleAddress: string;
  private version: AaveVersion;

  // Contracts
  private poolContract: ethers.Contract | null = null;
  private dataProviderContract: ethers.Contract | null = null;
  private oracleContract: ethers.Contract | null = null;

  /**
   * Constructor
   * @param config Configuration for the service
   */
  constructor(config: AaveConfig) {
    super(config);
    this.poolAddress = config.poolAddress;
    this.dataProviderAddress = config.dataProviderAddress;
    this.oracleAddress = config.oracleAddress;
    this.version = config.version || AaveVersion.V3;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Get provider
      const provider = await this.getProvider();
      
      // For V2, we might need to resolve addresses dynamically if they're empty
      if (this.version === AaveVersion.V2) {
        await this.resolveAddressesIfNeeded(provider);
      }

      // Get ABIs from provider
      const poolAbi = AaveAbiProvider.getPoolAbi(this.version);
      const dataProviderAbi = AaveAbiProvider.getDataProviderAbi(this.version);
      const oracleAbi = AaveAbiProvider.getOracleAbi(this.version);

      log.debug('Initializing Aave contracts with official ABIs', {
        version: this.version,
        poolAddress: this.poolAddress,
        dataProviderAddress: this.dataProviderAddress,
        oracleAddress: this.oracleAddress
      });

      // Initialize contracts with the addresses as-is, without trying to normalize them
      // This avoids checksum validation errors
      this.poolContract = new ethers.Contract(
        this.poolAddress, 
        poolAbi, 
        provider
      );
      
      this.dataProviderContract = new ethers.Contract(
        this.dataProviderAddress, 
        dataProviderAbi, 
        provider
      );
      
      this.oracleContract = new ethers.Contract(
        this.oracleAddress, 
        oracleAbi, 
        provider
      );

      // Mark as initialized
      this.initialized = true;
      log.info('AaveService initialized', { 
        network: this.network,
        poolAddress: this.poolAddress,
        dataProviderAddress: this.dataProviderAddress,
        oracleAddress: this.oracleAddress,
        version: this.version
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Failed to initialize AaveService', { 
        error: errorMessage,
        network: this.network,
        version: this.version
      });
      throw new Error(`Failed to initialize AaveService: ${errorMessage}`);
    }
  }
  
  /**
   * Resolve addresses dynamically if needed
   * This is primarily for V2 where addresses might not be available statically
   * @param provider The ethers provider
   */
  private async resolveAddressesIfNeeded(provider: ethers.Provider): Promise<void> {
    // Check if any addresses are empty and need to be resolved
    if (!this.poolAddress || !this.dataProviderAddress || !this.oracleAddress) {
      log.info('Some Aave addresses are empty, resolving dynamically', {
        network: this.network,
        version: this.version
      });
      
      try {
        // Resolve addresses dynamically
        const resolvedAddresses = await AaveAddressProvider.resolveV2Addresses(
          provider,
          this.network
        );
        
        // Update addresses if they were empty
        if (!this.poolAddress) {
          this.poolAddress = resolvedAddresses.poolAddress;
        }
        
        if (!this.dataProviderAddress) {
          this.dataProviderAddress = resolvedAddresses.dataProviderAddress;
        }
        
        if (!this.oracleAddress) {
          this.oracleAddress = resolvedAddresses.oracleAddress;
        }
        
        log.info('Successfully resolved Aave addresses dynamically', {
          network: this.network,
          version: this.version,
          poolAddress: this.poolAddress,
          dataProviderAddress: this.dataProviderAddress,
          oracleAddress: this.oracleAddress
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error('Failed to resolve Aave addresses dynamically', {
          error: errorMessage,
          network: this.network,
          version: this.version
        });
        throw new Error(`Failed to resolve Aave addresses: ${errorMessage}`);
      }
    }
  }

  /**
   * Get the protocol this service handles
   */
  getProtocol(): Protocol {
    return Protocol.AAVE;
  }

  /**
   * Get the data source type for this service
   */
  getDataSourceType(): DataSourceType {
    return DataSourceType.ON_CHAIN;
  }

  /**
   * Fetch user positions from on-chain data
   * @param params Query parameters
   * @returns List of user positions
   */
  protected async fetchFromOnChain(
    params: ProtocolQueryParams
  ): Promise<UserProtocolPosition[]> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.poolContract) {
        throw new Error('Contracts not initialized');
      }

      // Validate and normalize userAddress
      if (!params.userAddress) {
        log.warn('No user address provided for on-chain query', { 
          network: this.network 
        });
        return [];
      }

      const positions: UserProtocolPosition[] = [];
      const userAddress = params.userAddress;

      try {
        // Normalize user address to ensure proper checksum format
        const normalizedUserAddress = ethers.getAddress(userAddress);
        
        // Get user account data - this contains all the information we need
        log.debug('Fetching user account data', { userAddress: normalizedUserAddress });
        
        let accountData;
        try {
          accountData = await this.poolContract.getUserAccountData(normalizedUserAddress);
        } catch (contractError) {
          log.warn('Failed to fetch user account data', {
            userAddress: normalizedUserAddress,
            error: contractError instanceof Error ? contractError.message : String(contractError)
          });
          return [];
        }

        // Validate accountData and convert BigInt values safely
        if (!accountData) {
          log.warn('No account data returned', { 
            userAddress: normalizedUserAddress
          });
          return [];
        }

        // Determine if it's Aave V2 or V3 response format
        let totalCollateral, totalDebt, healthFactor, liquidationThreshold, ltv;
        
        // Handle array response format (common in ethers.js v6+)
        if (Array.isArray(accountData) || (typeof accountData === 'object' && '0' in accountData)) {
          // V2 & V3 return values in slightly different order
          if (this.version === AaveVersion.V3) {
            // V3 response: [totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor]
            totalCollateral = accountData[0];
            totalDebt = accountData[1];
            liquidationThreshold = accountData[3];
            ltv = accountData[4];
            healthFactor = accountData[5];
          } else {
            // V2 response: [totalCollateralETH, totalDebtETH, availableBorrowsETH, currentLiquidationThreshold, ltv, healthFactor]
            totalCollateral = accountData[0];
            totalDebt = accountData[1];
            liquidationThreshold = accountData[3];
            ltv = accountData[4];
            healthFactor = accountData[5];
          }
        } else {
          // Handle object response format (common in older ethers.js versions)
          // For V3
          totalCollateral = accountData.totalCollateralBase || accountData.totalCollateralETH;
          totalDebt = accountData.totalDebtBase || accountData.totalDebtETH;
          liquidationThreshold = accountData.currentLiquidationThreshold;
          ltv = accountData.ltv;
          healthFactor = accountData.healthFactor;
        }

        // Safely convert BigInt values and check for zero
        const safeConvertAndCheck = (value: any) => {
          try {
            const bigIntValue = typeof value === 'bigint' 
              ? value 
              : BigInt(value.toString());
            return bigIntValue === BigInt(0);
          } catch {
            return true; // Consider it zero if conversion fails
          }
        };

        // Check if total debt and collateral are zero
        const totalDebtIsZero = safeConvertAndCheck(totalDebt);
        const totalCollateralIsZero = safeConvertAndCheck(totalCollateral);

        if (totalDebtIsZero && totalCollateralIsZero) {
          log.debug('User has no positions', { 
            userAddress: normalizedUserAddress,
            healthFactor: '0'
          });
          return [];
        }
        
        // Parse health factor (handle extremely large values which indicate uninitialized positions)
        const parsedHealthFactor = this.parseHealthFactor(healthFactor);
        
        // If health factor is 0, user has no positions
        if (parsedHealthFactor === '0') {
          log.debug('User has no positions', { 
            userAddress: normalizedUserAddress,
            healthFactor: parsedHealthFactor
          });
          return [];
        }
        
        // Create position object with safe BigInt conversion
        const position: UserProtocolPosition = {
          protocol: Protocol.AAVE,
          network: this.network,
          version: this.version,
          userAddress: normalizedUserAddress,
          collateral: ethers.formatEther(
            typeof totalCollateral === 'bigint' 
              ? totalCollateral 
              : BigInt(totalCollateral.toString())
          ),
          debt: ethers.formatEther(
            typeof totalDebt === 'bigint' 
              ? totalDebt 
              : BigInt(totalDebt.toString())
          ),
          healthFactor: this.normalizeHealthFactor(parsedHealthFactor),
          fetchedTimestamp: Math.floor(Date.now() / 1000),
          borrowedAssets: [], // Add empty array for consistency
          liquidationRisk: {
            threshold: liquidationThreshold?.toString() || '0',
            currentLTV: ltv?.toString() || '0'
          },
          details: {
            onChainData: {
              totalCollateral: (
                typeof totalCollateral === 'bigint' 
                  ? totalCollateral 
                  : BigInt(totalCollateral.toString())
              ).toString(),
              totalDebt: (
                typeof totalDebt === 'bigint' 
                  ? totalDebt 
                  : BigInt(totalDebt.toString())
              ).toString(),
              healthFactor: (
                typeof healthFactor === 'bigint'
                  ? healthFactor
                  : BigInt(healthFactor.toString())
              ).toString()
            }
          }
        };
        
        positions.push(position);
        
        log.info('Successfully fetched on-chain Aave position', { 
          network: this.network,
          userAddress: normalizedUserAddress,
          healthFactor: parsedHealthFactor,
          collateral: position.collateral,
          debt: position.debt
        });
        
        return positions;
      } catch (error) {
        log.error('Error fetching Aave on-chain positions', {
          error: error instanceof Error ? error.message : String(error),
          userAddress,
          network: this.network
        });
        return [];
      }
    } catch (error) {
      log.error('Unhandled error in fetchFromOnChain', {
        error: error instanceof Error ? error.message : String(error),
        network: this.network
      });
      return [];
    }
  }

  /**
   * Fetch user positions from subgraph
   */
  protected async fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.subgraphUrl) {
      log.warn('Subgraph URL not configured for AaveService', {
        network: this.network
      });
      return [];
    }
    
    // Validate and normalize userAddress
    const userAddress = params.userAddress;
    if (!userAddress) {
      log.warn('No user address provided for subgraph query', { 
        network: this.network 
      });
      return [];
    }

    // Validate address format
    if (!ethers.isAddress(userAddress)) {
      log.warn('Invalid user address format for subgraph query', { 
        userAddress, 
        network: this.network 
      });
      return [];
    }

    try {
      // Prepare GraphQL query
      const query = GET_USER_POSITIONS;
      const variables = {
        userAddress: userAddress.toLowerCase(), // Subgraphs typically use lowercase addresses
        fromTimestamp: params.fromTimestamp,
        toTimestamp: params.toTimestamp
      };

      // Execute GraphQL query
      const response = await this.executeSubgraphQuery(query, variables);

      // Process and validate response
      if (!response || !response.data) {
        log.warn('Empty response from Aave subgraph', { 
          userAddress, 
          network: this.network 
        });
        return [];
      }

      // Extract positions from subgraph response
      const subgraphPositions = response.data.userPositions || [];

      // Transform subgraph positions to UserProtocolPosition
      const positions: UserProtocolPosition[] = subgraphPositions.map((position: any) => ({
        protocol: Protocol.AAVE,
        network: this.network,
        version: this.version,
        userAddress: userAddress,
        collateral: position.collateral || '0',
        debt: position.debt || '0',
        healthFactor: this.normalizeHealthFactor(position.healthFactor || '0'),
        fetchedTimestamp: position.timestamp || Math.floor(Date.now() / 1000),
        borrowedAssets: position.borrowedAssets || [], 
        liquidationRisk: {
          threshold: position.currentLiquidationThreshold || '0',
          currentLTV: position.ltv || '0'
        },
        details: {
          subgraphData: position // Preserve original subgraph data
        }
      }));

      log.info('Successfully fetched Aave positions from subgraph', { 
        network: this.network,
        positionsCount: positions.length
      });

      return positions;
    } catch (error) {
      log.error('Error fetching Aave positions from subgraph', { 
        error, 
        userAddress, 
        network: this.network 
      });
      
      // Return an empty array instead of throwing to prevent breaking the entire fetch process
      return [];
    }
  }

  /**
   * Fetch user positions from the protocol
   * @param params Protocol query parameters
   * @returns Array of user positions
   */
  async fetchUserPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const { userAddress } = params;
    
    if (!userAddress) {
      throw new Error('User address is required to fetch positions');
    }
    
    // Use data source fallback service to handle data source selection
    const protocolKey = `${this.constructor.name}-${this.network}`;
    
    return this.dataSourceFallbackService.executeWithFallback(
      protocolKey,
      { 
        [DataSourceType.ON_CHAIN]: () => this.fetchFromOnChain(params),
        [DataSourceType.SUBGRAPH]: () => this.fetchFromSubgraph(params)
      },
      `fetchUserPositions for ${userAddress}`
    );
  }

  /**
   * Process user data from subgraph
   */
  private processSubgraphData(
    userAddress: string,
    data: {
      userReserves?: Array<{
        currentATokenBalance?: string;
        currentStableDebt?: string;
        currentVariableDebt?: string;
        reserve?: {
          symbol?: string;
          id?: string;
          decimals?: string;
          price?: {
            priceInEth?: string;
          };
        };
      }>;
      user?: {
        healthFactor?: string;
        totalCollateralETH?: string;
        totalDebtETH?: string;
        currentLiquidationThreshold?: string;
        ltv?: string;
      };
    }
  ): UserProtocolPosition[] {
    try {
      if (!data || !data.userReserves || !Array.isArray(data.userReserves)) {
        return [];
      }
      
      // Extract user reserves and user data
      const userReserves = data.userReserves;
      const userData = data.user || {};
      
      // Get health factor from user data or default to a safe value
      const healthFactor = userData.healthFactor || '0';
      
      // Calculate totals
      let totalCollateral = userData.totalCollateralETH || '0';
      let totalDebt = userData.totalDebtETH || '0';
      
      // Prepare borrowed assets
      const borrowedAssets = userReserves
        .filter(reserve => 
          (reserve.currentStableDebt && parseFloat(reserve.currentStableDebt) > 0) ||
          (reserve.currentVariableDebt && parseFloat(reserve.currentVariableDebt) > 0)
        )
        .map(reserve => ({
          symbol: reserve.reserve?.symbol || 'UNKNOWN',
          amount: (reserve.currentStableDebt || reserve.currentVariableDebt || '0'),
          valueETH: reserve.reserve?.price?.priceInEth || '0' // Add the required valueETH field
        }));
      
      // Create base position
      const basePosition: UserProtocolPosition = {
        protocol: Protocol.AAVE,
        network: this.network,
        version: this.version,
        userAddress,
        healthFactor: this.normalizeHealthFactor(healthFactor),
        collateral: totalCollateral,
        debt: totalDebt,
        borrowedAssets,
        fetchedTimestamp: Math.floor(Date.now() / 1000),
        liquidationRisk: {
          threshold: userData.currentLiquidationThreshold || '0',
          currentLTV: userData.ltv || '0'
        },
        details: {
          subgraphReserves: userReserves
        }
      };
      
      return [basePosition];
    } catch (error) {
      log.error('Error processing subgraph data', {
        error,
        userAddress
      });
      return [];
    }
  }

  /**
   * Execute a subgraph query with error handling
   */
  private async executeSubgraphQuery(query: string, variables: Record<string, any>): Promise<any> {
    if (!this.subgraphUrl) {
      log.warn('Subgraph URL not configured', {
        network: this.network
      });
      return null;
    }

    try {
      const response = await fetch(this.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        log.warn('Subgraph query failed', {
          status: response.status,
          query,
          variables
        });
        return null;
      }

      const result = await response.json();
      
      // Check for GraphQL errors
      if (result.errors) {
        log.warn('GraphQL errors in subgraph query', {
          errors: result.errors,
          query,
          variables
        });
        return null;
      }

      return result;
    } catch (error) {
      log.error('Error executing subgraph query', { 
        error, 
        query, 
        variables 
      });
      return null;
    }
  }

  /**
   * Get health factor for a user
   */
  async getHealthFactor(params: ProtocolQueryParams): Promise<string> {
    if (!this.initialized || !this.poolContract) {
      throw new Error('AaveService not initialized');
    }
    
    const { userAddress } = params;
    
    // Validate userAddress
    if (!userAddress) {
      log.warn('No user address provided for health factor query', { 
        network: this.network 
      });
      return '0';
    }
    
    try {
      log.info('Fetching Aave health factor', { 
        userAddress, 
        network: this.network 
      });
      
      // Get user account data
      const accountData = await this.poolContract.getUserAccountData(userAddress);
      
      // Extract health factor with robust parsing
      const healthFactorBN = BigInt(accountData.healthFactor);
      
      // Check for max uint256 value, which often indicates uninitialized or default state
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      if (healthFactorBN >= MAX_UINT256 / BigInt(2)) {
        log.warn('Extremely large health factor detected, likely uninitialized', { 
          userAddress, 
          healthFactor: healthFactorBN.toString() 
        });
        return '0';
      }
      
      // Safely format health factor
      const healthFactor = ethers.formatUnits(healthFactorBN, 18);
      
      // Additional validation
      const parsedHealthFactor = parseFloat(healthFactor);
      if (isNaN(parsedHealthFactor) || parsedHealthFactor <= 0) {
        log.warn('Invalid health factor parsed', { 
          userAddress, 
          healthFactor,
          parsedValue: parsedHealthFactor 
        });
        return '0';
      }
      
      log.info('Successfully fetched Aave health factor', { 
        userAddress, 
        network: this.network,
        healthFactor
      });
      
      return healthFactor;
    } catch (error) {
      log.error('Error fetching Aave health factor', { 
        error, 
        userAddress, 
        network: this.network 
      });
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  protected async cleanup(): Promise<void> {
    // Reset contract instances
    this.poolContract = null;
    this.dataProviderContract = null;
    this.oracleContract = null;
    
    // Call parent cleanup
    await super.cleanup();
  }

  /**
   * Normalize the health factor to a human-readable format
   * Aave returns health factor as a BigInt with 18 decimal places
   */
  private normalizeHealthFactor(healthFactor: string | bigint): string {
    if (!healthFactor || healthFactor === '0') {
      return '0';
    }
    
    try {
      // Check if the input is already in a decimal format
      if (typeof healthFactor === 'string' && healthFactor.includes('.')) {
        // Already normalized, just return it
        return healthFactor;
      }
      
      // Convert to BigInt if it's a string
      let healthFactorValue: bigint;
      if (typeof healthFactor === 'string') {
        healthFactorValue = BigInt(healthFactor);
      } else {
        healthFactorValue = healthFactor;
      }
      
      // If the value is small enough to be a regular number (not a raw contract value with 18 decimals)
      if (healthFactorValue < BigInt(1000)) {
        return healthFactorValue.toString();
      }
      
      const divisor = BigInt(10 ** 18);
      
      // Get the whole number part
      const wholePart = healthFactorValue / divisor;
      
      // Get the decimal part with proper precision
      const decimalPart = healthFactorValue % divisor;
      
      // Format decimal part to have leading zeros if needed
      let decimalStr = decimalPart.toString().padStart(18, '0');
      
      // Trim trailing zeros but keep two decimal places at minimum
      decimalStr = decimalStr.substring(0, 2);
      
      // Combine whole and decimal parts
      return `${wholePart}.${decimalStr}`;
    } catch (error) {
      console.error('Error normalizing health factor:', error);
      
      // If we can't normalize, try to return a reasonable value
      if (typeof healthFactor === 'string') {
        // If it's already a string, just return it
        return healthFactor;
      } else {
        // Convert bigint to string as a fallback
        return healthFactor.toString();
      }
    }
  }

  /**
   * Parse health factor value from contract
   * @param healthFactor The health factor from the contract
   * @returns Formatted health factor string
   */
  private parseHealthFactor(healthFactor: any): string {
    // Convert to BigInt if it's not already
    const healthFactorBigInt = typeof healthFactor === 'bigint' 
      ? healthFactor 
      : BigInt(healthFactor.toString());

    // Check for max uint256 value, which often indicates uninitialized state
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const HALF_MAX_UINT256 = MAX_UINT256 / BigInt(2);

    // If health factor is extremely large, return 0
    if (healthFactorBigInt >= HALF_MAX_UINT256) {
      log.warn('Extremely large health factor detected, likely uninitialized', { 
        healthFactor: healthFactorBigInt.toString() 
      });
      return '0';
    }

    // Format health factor with 18 decimal places
    const formattedHealthFactor = ethers.formatEther(healthFactorBigInt);
    
    // Additional validation
    const parsedHealthFactor = parseFloat(formattedHealthFactor);
    
    // Return 0 for invalid or negative health factors
    return (isNaN(parsedHealthFactor) || parsedHealthFactor <= 0) ? '0' : formattedHealthFactor;
  }
}

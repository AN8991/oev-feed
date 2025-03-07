import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import { AaveService } from '../src/services/protocols/aave';
import { AaveConfigBuilder, AaveVersion } from '../src/services/protocols/aave/aave-config';
import { Protocol, UserProtocolPosition, ProtocolQueryParams } from '../src/types/protocols';
import { Network } from '../src/types/networks';
import { ENV } from '../src/config/env';
import { log } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';
import { AaveV3Ethereum, AaveV2Ethereum } from '@bgd-labs/aave-address-book';

// Configuration for Aave Service Testing
interface AaveServiceTestConfig {
  testAddresses: {
    v2Active: string[];
    v3Active: string[];
  };
  expectedDataFields: (keyof UserProtocolPosition)[];
  performanceThresholds: {
    maxResponseTimeMs: number;
    minPositionsExpected: number;
  };
}

// Type definition for test results
type TestResultEntry = {
  initialized: boolean;
  positionsFetched: boolean;
  validPositions: number;
  errors: string[];
  executionTime: number;
};

class AaveServiceTester {
  private config: AaveServiceTestConfig;
  private testResults: Record<AaveVersion, TestResultEntry>;

  constructor() {
    this.config = createTestConfig();
    this.testResults = this.initializeTestResults();
  }

  private initializeTestResults(): Record<AaveVersion, TestResultEntry> {
    return Object.values(AaveVersion).reduce((acc, version) => {
      if (typeof version === 'string') {
        acc[version as AaveVersion] = {
          initialized: false,
          positionsFetched: false,
          validPositions: 0,
          errors: [],
          executionTime: 0
        };
      }
      return acc;
    }, {} as Record<AaveVersion, TestResultEntry>);
  }

  private createProviderUrl(): string {
    if (ENV.ALCHEMY_API_KEY) {
      return `https://eth-mainnet.g.alchemy.com/v2/${ENV.ALCHEMY_API_KEY}`;
    } else if (ENV.INFURA_API_KEY) {
      return `https://mainnet.infura.io/v3/${ENV.INFURA_API_KEY}`;
    } else {
      throw new Error('No Ethereum provider API key available');
    }
  }

  private createProvider(): ethers.Provider {
    const providerUrl = this.createProviderUrl();
    return new ethers.JsonRpcProvider(providerUrl, 'mainnet');
  }

  /**
   * Validate that the position has the expected properties with reasonable values
   */
  validatePosition(position: UserProtocolPosition): boolean {
    if (!position) {
      console.log('Position is null or undefined');
      return false;
    }

    // Check protocol and network
    if (position.protocol !== Protocol.AAVE) {
      console.log(`Invalid protocol: ${position.protocol}`);
      return false;
    }

    // Network check
    if (!['ethereum', 'optimism', 'arbitrum', 'polygon', 'avalanche', 'base', 'metis'].includes(position.network)) {
      console.log(`Invalid network: ${position.network}`);
      return false;
    }

    // Parse numeric values with defensive handling
    const safeParseFloat = (value: string | null | undefined): number => {
      if (value === null || value === undefined || value === '') return 0;
      try {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      } catch {
        return 0;
      }
    };

    // Get values safely
    const collateral = safeParseFloat(position.collateral);
    const debt = safeParseFloat(position.debt);
    const healthFactor = safeParseFloat(position.healthFactor);

    // Validate collateral
    if (collateral <= 0) {
      console.log(`Invalid collateral: ${position.collateral}`);
      return false;
    }

    // Validate debt
    if (debt <= 0) {
      console.log(`Invalid debt: ${position.debt}`);
      return false;
    }

    // Validate health factor (should be reasonable)
    if (healthFactor <= 0 || healthFactor > 1000000) {
      console.log(`Invalid health factor: ${position.healthFactor}`);
      return false;
    }

    // All checks passed
    return true;
  }

  private async testServiceInitialization(version: AaveVersion): Promise<boolean> {
    // Reset results for this version before testing
    this.testResults[version] = {
      initialized: false,
      positionsFetched: false,
      validPositions: 0,
      errors: [],
      executionTime: 0
    };

    const startTime = Date.now();
    
    try {
      const aaveConfig = new AaveConfigBuilder()
        .withNetwork(Network.ETHEREUM)
        .withVersion(version)
        .withRpcUrl(this.createProviderUrl());
      
      // Set version-specific contract addresses
      if (version === AaveVersion.V3) {
        aaveConfig
          .withPoolAddress(AaveV3Ethereum.POOL)
          .withDataProviderAddress(AaveV3Ethereum.AAVE_PROTOCOL_DATA_PROVIDER)
          .withOracleAddress(AaveV3Ethereum.ORACLE);
      } else {
        aaveConfig
          .withPoolAddress(AaveV2Ethereum.POOL)
          .withDataProviderAddress(AaveV2Ethereum.POOL_ADDRESSES_PROVIDER)
          .withOracleAddress(AaveV2Ethereum.ORACLE);
      }

      const config = aaveConfig.build();
      const aaveService = new AaveService(config);
      
      await aaveService.initialize();
      
      this.testResults[version].initialized = true;
      this.testResults[version].executionTime = Date.now() - startTime;
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.testResults[version].errors.push(`Initialization Error: ${errorMessage}`);
      
      log.error(`Aave ${version} Initialization Failed`, { 
        error: errorMessage, 
        timestamp: new Date().toISOString() 
      });
      
      return false;
    }
  }

  private async testPositionRetrieval(version: AaveVersion): Promise<boolean> {
    const startTime = Date.now();
    const addressesToTest = version === AaveVersion.V3 
      ? this.config.testAddresses.v3Active 
      : this.config.testAddresses.v2Active;

    let overallSuccess = true;

    for (const userAddress of addressesToTest) {
      try {
        const queryParams: ProtocolQueryParams = {
          userAddress,
          protocol: Protocol.AAVE,
          network: Network.ETHEREUM,
          fromTimestamp: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 days
          toTimestamp: Math.floor(Date.now() / 1000)
        };

        // Create a direct provider to avoid any provider issues
        const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${ENV.ALCHEMY_API_KEY}`);

        // Log the provider information
        console.log(`Provider URL: https://eth-mainnet.g.alchemy.com/v2/***`);

        const aaveConfig = new AaveConfigBuilder()
          .withNetwork(Network.ETHEREUM)
          .withVersion(version)
          .withRpcUrl(`https://eth-mainnet.g.alchemy.com/v2/${ENV.ALCHEMY_API_KEY}`);
        
        // Set version-specific contract addresses
        if (version === AaveVersion.V3) {
          aaveConfig
            .withPoolAddress(AaveV3Ethereum.POOL)
            .withDataProviderAddress(AaveV3Ethereum.AAVE_PROTOCOL_DATA_PROVIDER)
            .withOracleAddress(AaveV3Ethereum.ORACLE);
        } else {
          aaveConfig
            .withPoolAddress(AaveV2Ethereum.POOL)
            .withDataProviderAddress(AaveV2Ethereum.POOL_ADDRESSES_PROVIDER)
            .withOracleAddress(AaveV2Ethereum.ORACLE);
        }

        const config = aaveConfig.build();
        console.log(`Aave ${version} Config:`, {
          poolAddress: config.poolAddress,
          dataProviderAddress: config.dataProviderAddress,
          oracleAddress: config.oracleAddress
        });

        const aaveService = new AaveService(config);
        
        await aaveService.initialize();

        console.log(`Fetching positions for ${userAddress} on Aave ${version}`);
        
        // Add direct contract call to verify data
        try {
          // Get a new instance of the contract to ensure it's initialized properly
          const poolContract = new ethers.Contract(
            config.poolAddress,
            version === AaveVersion.V3 
              ? require('../src/services/protocols/aave/aave-abi-provider').AAVE_V3_POOL_ABI 
              : require('../src/services/protocols/aave/aave-abi-provider').AAVE_V2_LENDING_POOL_ABI,
            provider
          );
          
          console.log(`Direct contract call to ${config.poolAddress} for getUserAccountData...`);
          console.log(`Using address: ${userAddress}`);
          
          // Call the contract with additional diagnostics
          console.log('Calling getUserAccountData...');
          const accountData = await poolContract.getUserAccountData(userAddress);
          
          // Print all keys in accountData to help debug
          console.log('AccountData keys:', Object.keys(accountData));
          console.log('AccountData full object:', accountData);
          
          console.log(`Direct contract call results:`, {
            totalCollateralETH: ethers.formatEther(accountData.totalCollateralETH || accountData.totalCollateralBase || '0'),
            totalDebtETH: ethers.formatEther(accountData.totalDebtETH || accountData.totalDebtBase || '0'),
            healthFactor: accountData.healthFactor.toString()
          });
          
          // Save the results to a JSON file for reference
          await this.saveResultsToJson(userAddress, accountData);
          
          const positions = await aaveService.fetchUserPositions(queryParams);
          
          console.log(`Total positions found: ${positions.length}`);
          
          if (positions.length > 0) {
            console.log('First position details:', JSON.stringify(positions[0], null, 2));
          }
          
          const validPositions = positions.filter(this.validatePosition);
          
          console.log(`Valid positions: ${validPositions.length}`);
          
          if (validPositions.length === 0) {
            this.testResults[version].errors.push(`No valid positions found for ${userAddress}`);
            overallSuccess = false;
            continue;
          }

          this.testResults[version].validPositions += validPositions.length;
          this.testResults[version].positionsFetched = true;

          // Log detailed position information
          validPositions.forEach((position, index) => {
            console.log(`${version} Position ${index + 1} for ${userAddress}:`, {
              collateral: position.collateral,
              debt: position.debt,
              healthFactor: position.healthFactor
            });
          });

          // Format position data for better readability
          const formatPositionData = (position: UserProtocolPosition) => {
            // Format numbers to have appropriate decimal places
            const formatNumber = (value: string | null | undefined, decimals = 6) => {
              if (!value) return '0.000000';
              const num = parseFloat(value);
              return num.toFixed(decimals);
            };

            // Format health factor with 4 decimal places
            const healthFactor = formatNumber(position.healthFactor, 4);
            
            // Format collateral and debt with 6 decimal places
            const collateral = formatNumber(position.collateral);
            const debt = formatNumber(position.debt);
            
            // Format borrowed assets
            const borrowedAssets = position.borrowedAssets.map(asset => ({
              symbol: asset.symbol,
              address: asset.address,
              amount: formatNumber(asset.amount, 8),
              valueETH: asset.valueETH ? formatNumber(asset.valueETH) : '0.000000'
            }));
            
            // Format supplied assets
            const suppliedAssets = position.suppliedAssets.map(asset => ({
              symbol: asset.symbol,
              address: asset.address,
              amount: formatNumber(asset.amount, 8)
            }));
            
            // Format liquidation risk
            const liquidationRisk = {
              threshold: position.liquidationRisk?.threshold 
                ? (parseInt(position.liquidationRisk.threshold) / 100).toFixed(2) + '%'
                : 'N/A',
              currentLTV: position.liquidationRisk?.currentLTV
                ? (parseInt(position.liquidationRisk.currentLTV) / 100).toFixed(2) + '%'
                : 'N/A'
            };
            
            // Create a summary for the position
            const summary = {
              protocol: position.protocol,
              network: position.network,
              version: position.version,
              userAddress: position.userAddress,
              collateral: `${collateral} ETH`,
              debt: `${debt} ETH`,
              healthFactor,
              fetchedTimestamp: new Date(position.fetchedTimestamp * 1000).toISOString(),
              borrowedAssets,
              suppliedAssets,
              liquidationRisk,
              details: position.details
            };
            
            return summary;
          };

          // Save position data to a JSON file
          const savePositionsToFile = (positions: UserProtocolPosition[], version: AaveVersion) => {
            const dataDir = path.join(__dirname, '..', 'data');
            
            // Create data directory if it doesn't exist
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Format the positions
            const formattedPositions = positions.map(formatPositionData);
            
            // Create a filename with timestamp
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
            const filename = `aave-${version}-positions-${timestamp}.json`;
            const filePath = path.join(dataDir, filename);
            
            // Save to file with pretty formatting
            fs.writeFileSync(
              filePath, 
              JSON.stringify(formattedPositions, null, 2)
            );
            
            console.log(`Saved ${formattedPositions.length} positions to ${filePath}`);
            
            return filePath;
          };

          // Save positions to file
          savePositionsToFile(validPositions, version);

        } catch (directError) {
          console.error(`Direct contract call error:`, 
            directError instanceof Error ? directError.message : String(directError)
          );
          if (directError instanceof Error && directError.stack) {
            console.error('Error stack:', directError.stack);
          }
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error retrieving positions for ${userAddress}:`, errorMessage);
        
        this.testResults[version].errors.push(`Position Retrieval Error for ${userAddress}: ${errorMessage}`);
        overallSuccess = false;

        log.error(`Aave ${version} Position Retrieval Failed`, { 
          address: userAddress,
          error: errorMessage, 
          timestamp: new Date().toISOString() 
        });
      }
    }

    this.testResults[version].executionTime = Date.now() - startTime;
    return overallSuccess;
  }

  /**
   * Store the results as JSON in the data folder
   */
  private async saveResultsToJson(userAddress: string, accountData: any): Promise<void> {
    try {
      // Create a timestamp for the filename
      const timestamp = new Date().toISOString();
      // Truncate the user address for the filename
      const addressPrefix = userAddress.substring(0, 10).toLowerCase();
      // Create filename with the format: direct-contract-{address-prefix}-{timestamp}.json
      const filename = `direct-contract-${addressPrefix}-${timestamp}.json`;
      
      // Ensure the data directory exists
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create the full path
      const filePath = path.join(dataDir, filename);
      
      // Get current block number
      const provider = new ethers.AlchemyProvider('mainnet', process.env.ALCHEMY_API_KEY || '');
      const blockNumber = await provider.getBlockNumber();
      
      // Format health factor correctly - keep the original bigint value
      // This ensures we maintain precision while still having it formatted like the example
      let healthFactorFormatted = accountData[5].toString();
      
      // Create the data object with the same format as the example
      const data = {
        address: userAddress.toLowerCase(),
        blockNumber: blockNumber,
        timestamp: timestamp,
        aavev3: {
          totalCollateral: ethers.formatEther(accountData[0]),
          totalDebt: ethers.formatEther(accountData[1]),
          availableBorrows: ethers.formatEther(accountData[2]),
          liquidationThreshold: Number(accountData[3]) / 10000, // Convert from basis points to decimal (e.g., 9500 -> 0.95)
          ltv: Number(accountData[4]) / 10000, // Convert from basis points to decimal (e.g., 9300 -> 0.93)
          healthFactor: healthFactorFormatted
        }
      };
      
      // Write the data to the file
      fs.writeFileSync(
        filePath, 
        JSON.stringify(data, null, 2)
      );
      
      console.log(`Results saved to: ${filePath}`);
      
      // Also provide a human-readable interpretation of the health factor for the console log
      // This doesn't affect the JSON output
      const healthFactorDecimal = Number(BigInt(accountData[5]) / BigInt(10**16)) / 100;
      console.log(`Health Factor (decimal): ${healthFactorDecimal}`);
    } catch (error) {
      console.error('Error saving results to JSON:', error);
    }
  }

  /**
   * Run the comprehensive test
   */
  async runComprehensiveTest(): Promise<void> {
    console.log('\nStarting Comprehensive Aave Service Test\n');

    console.log('=== Testing Aave V3 ===');
    
    // Only test V3 for now
    const v3Initialized = await this.testServiceInitialization(AaveVersion.V3);
    const v3PositionTest = await this.testPositionRetrieval(AaveVersion.V3);
    
    console.log(v3Initialized && v3PositionTest ? 'Position Retrieval: SUCCESS' : 'Position Retrieval: FAILED');

    this.generateTestReport();
  }

  async run(): Promise<boolean> {
    console.log('\nStarting Comprehensive Aave Service Test\n');
    
    // Start the timer
    const startTime = Date.now();
    
    // Initialize results
    const results = {
      v2: {
        initialized: false,
        positionsFetched: false,
        validPositions: 0,
        executionTime: 0,
        errors: [] as string[]
      },
      v3: {
        initialized: false,
        positionsFetched: false,
        validPositions: 0,
        executionTime: 0,
        errors: [] as string[]
      }
    };
    
    // Test Aave V3
    console.log('=== Testing Aave V3 ===');
    const v3StartTime = Date.now();
    try {
      const v3Initialized = await this.testServiceInitialization(AaveVersion.V3);
      results.v3.initialized = v3Initialized;
      
      if (v3Initialized) {
        await this.testPositionRetrieval(AaveVersion.V3);
        results.v3.positionsFetched = this.testResults[AaveVersion.V3].positionsFetched;
        results.v3.validPositions = this.testResults[AaveVersion.V3].validPositions;
      } else {
        results.v3.errors.push('Failed to initialize Aave V3 service');
      }
    } catch (error) {
      results.v3.errors.push(`Error during Aave V3 test: ${error instanceof Error ? error.message : String(error)}`);
    }
    results.v3.executionTime = Date.now() - v3StartTime;
    
    // Calculate overall success
    const success = this.testResults[AaveVersion.V3].validPositions > 0;
    console.log(`Position Retrieval: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    // Print test report
    console.log('\n=== Test Report ===\n');
    console.log('Aave V2:');
    console.log(`- Initialized: ${results.v2.initialized}`);
    console.log(`- Positions Fetched: ${results.v2.positionsFetched}`);
    console.log(`- Valid Positions: ${results.v2.validPositions}`);
    console.log(`- Execution Time: ${results.v2.executionTime}ms`);
    if (results.v2.errors.length > 0) {
      console.log('- Errors:');
      results.v2.errors.forEach(err => console.log(`  * ${err}`));
    }
    
    console.log('\nAave V3:');
    console.log(`- Initialized: ${results.v3.initialized}`);
    console.log(`- Positions Fetched: ${results.v3.positionsFetched}`);
    console.log(`- Valid Positions: ${results.v3.validPositions}`);
    console.log(`- Execution Time: ${results.v3.executionTime}ms`);
    if (results.v3.errors.length > 0) {
      console.log('- Errors:');
      results.v3.errors.forEach(err => console.log(`  * ${err}`));
    }
    
    // Print summary recommendations
    if (success) {
      console.log('\n✅ Test Passed: Successfully retrieved and validated Aave positions');
      console.log('\nRecommendations:');
      console.log('- Consider running the test with different accounts to validate edge cases');
      console.log('- Monitor the execution time for performance optimization if needed');
    } else {
      console.log('\n❌ Test Failed: Could not retrieve valid Aave positions');
      console.log('\nTroubleshooting Steps:');
      console.log('- Check the provided user addresses have active positions');
      console.log('- Verify contract addresses for the tested networks');
      console.log('- Review error messages for specific issues');
    }
    
    // Check execution time
    const totalTime = Date.now() - startTime;
    console.log(`\nTotal execution time: ${totalTime}ms`);
    
    return success;
  }

  private generateTestReport() {
    console.log('\n=== Test Report ===');
    
    // Safe iteration over test results
    (Object.entries(this.testResults) as Array<[AaveVersion, TestResultEntry]>)
      .forEach(([version, result]) => {
        console.log(`\nAave ${version.toUpperCase()}:`);
        console.log(`- Initialized: ${result.initialized}`);
        console.log(`- Positions Fetched: ${result.positionsFetched}`);
        console.log(`- Valid Positions: ${result.validPositions}`);
        console.log(`- Execution Time: ${result.executionTime}ms`);
        
        if (result.errors.length > 0) {
          console.log('- Errors:');
          result.errors.forEach(error => console.log(`  * ${error}`));
        }
      });
  }
}

// Test Configuration
function createTestConfig(): AaveServiceTestConfig {
  return {
    testAddresses: {
      v2Active: ['0xf0bb20865277abd641a307ece5ee04e79073416c'],
      v3Active: ['0xf0bb20865277abd641a307ece5ee04e79073416c']
    },
    expectedDataFields: [
      'protocol', 
      'network', 
      'collateral', 
      'debt', 
      'healthFactor'
    ],
    performanceThresholds: {
      maxResponseTimeMs: 5000,  // 5 seconds max response time
      minPositionsExpected: 1   // At least one position expected for active addresses
    }
  };
}

// Main Execution
async function main() {
  try {
    const tester = new AaveServiceTester();
    await tester.run();
  } catch (error) {
    console.error('Critical test failure:', error);
    process.exit(1);
  }
}

main();

/**
 * Aave Data Provider Test Script
 * 
 * This script tests direct interaction with the Aave V3 Data Provider contract
 * to fetch user reserve data for specific assets. It demonstrates low-level
 * contract interaction using ethers.js.
 * 
 * Updated to use modern logging patterns and enhanced error handling.
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeAddress } from '@domain/utils/address-utils';
import * as ethers from 'ethers';
import { config } from 'dotenv';

// Load environment variables
config();

const logger = new Logger('AaveDataProviderTest');

// Test constants
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI on Ethereum mainnet
const TEST_USER_ADDRESS = "0x79682489385337996edd00eb56b4238b597bfae7";

// Minimal ABI for getUserReserveData
const DATA_PROVIDER_ABI = [
  "function getUserReserveData(address asset, address user) external view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)"
];

/**
 * Test Aave Data Provider contract interaction
 */
async function testAaveDataProvider() {
  try {
    logger.log('🔍 AAVE DATA PROVIDER TEST');
    logger.log('===============================');
    
    // 1. Environment validation
    logger.log('1. Validating environment configuration...');
    const rpcUrl = process.env.ETHEREUM_RPC_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    const dataProviderAddress = process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER;
    
    if (!rpcUrl || !dataProviderAddress) {
      throw new Error("Missing RPC URL or Data Provider address in .env");
    }
    
    logger.log(`   ✅ RPC URL: ${rpcUrl.includes('infura') ? 'Infura' : 'Custom'}`);
    logger.log(`   ✅ Data Provider: ${normalizeAddress(dataProviderAddress)}`);
    logger.log(`   ✅ Test User: ${normalizeAddress(TEST_USER_ADDRESS)}`);
    logger.log(`   ✅ Test Asset (DAI): ${normalizeAddress(DAI_ADDRESS)}`);
    
    // 2. Initialize provider and contract
    logger.log('2. Initializing ethers provider and contract...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const dataProvider = new ethers.Contract(dataProviderAddress, DATA_PROVIDER_ABI, provider);
    logger.log('   ✅ Provider and contract initialized');
    
    // 3. Test network connectivity
    logger.log('3. Testing network connectivity...');
    const blockNumber = await provider.getBlockNumber();
    logger.log(`   ✅ Current block number: ${blockNumber}`);
    
    // 4. Call getUserReserveData
    logger.log('4. Calling getUserReserveData...');
    logger.log(`   Fetching data for user: ${TEST_USER_ADDRESS}`);
    logger.log(`   Asset: DAI (${DAI_ADDRESS})`);
    
    const reserveData = await dataProvider.getUserReserveData(DAI_ADDRESS, TEST_USER_ADDRESS);
    
    // 5. Parse and display results
    logger.log('5. Parsing reserve data results...');
    const [
      currentATokenBalance,
      currentStableDebt,
      currentVariableDebt,
      principalStableDebt,
      scaledVariableDebt,
      stableBorrowRate,
      liquidityRate,
      stableRateLastUpdated,
      usageAsCollateralEnabled
    ] = reserveData;
    
    logger.log('\n📊 User Reserve Data for DAI:');
    logger.log(`   Current aToken Balance: ${ethers.formatUnits(currentATokenBalance, 18)} DAI`);
    logger.log(`   Current Stable Debt: ${ethers.formatUnits(currentStableDebt, 18)} DAI`);
    logger.log(`   Current Variable Debt: ${ethers.formatUnits(currentVariableDebt, 18)} DAI`);
    logger.log(`   Principal Stable Debt: ${ethers.formatUnits(principalStableDebt, 18)} DAI`);
    logger.log(`   Scaled Variable Debt: ${ethers.formatUnits(scaledVariableDebt, 18)} DAI`);
    logger.log(`   Stable Borrow Rate: ${ethers.formatUnits(stableBorrowRate, 25)}%`); // Ray format
    logger.log(`   Liquidity Rate: ${ethers.formatUnits(liquidityRate, 25)}%`); // Ray format
    logger.log(`   Stable Rate Last Updated: ${stableRateLastUpdated}`);
    logger.log(`   Usage as Collateral Enabled: ${usageAsCollateralEnabled}`);
    
    // 6. Summary
    const hasSupplied = currentATokenBalance > 0n;
    const hasBorrowed = currentVariableDebt > 0n || currentStableDebt > 0n;
    
    logger.log('\n📋 Position Summary:');
    logger.log(`   Has Supplied DAI: ${hasSupplied ? '✅ Yes' : '❌ No'}`);
    logger.log(`   Has Borrowed DAI: ${hasBorrowed ? '✅ Yes' : '❌ No'}`);
    logger.log(`   Can Use as Collateral: ${usageAsCollateralEnabled ? '✅ Yes' : '❌ No'}`);
    
    logger.log('\n🎉 AAVE DATA PROVIDER TEST COMPLETED SUCCESSFULLY!');
    logger.log('===============================');
    logger.log('✅ Contract interaction working correctly');
    logger.log('✅ Data parsing and formatting functional');
    logger.log('✅ User reserve data retrieved successfully');
    
  } catch (error) {
    logger.error('❌ Aave data provider test failed:', error);
    throw error;
  }
}

// Execute the test
testAaveDataProvider().then(() => {
  logger.log('✅ Data provider test script completed successfully');
}).catch(error => {
  logger.error('❌ Data provider test script failed:', error);
  process.exit(1);
});

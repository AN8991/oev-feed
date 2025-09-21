/**
 * Aave Address Book Verification Script
 * 
 * This script verifies and displays official Aave contract addresses from the
 * @bgd-labs/aave-address-book package for both V2 and V3 protocols on Ethereum.
 * 
 * Updated to use modern logging patterns and structured output.
 */

import { Logger } from '@nestjs/common';
import { 
  AaveV3Ethereum, 
  AaveV2Ethereum
} from '@bgd-labs/aave-address-book';
import { normalizeAddress } from '@domain/utils/address-utils';

const logger = new Logger('AaveAddressBookCheck');

/**
 * Check and display Aave contract addresses
 */
function checkAaveAddresses() {
  try {
    logger.log('🏛️ AAVE ADDRESS BOOK VERIFICATION');
    logger.log('=====================================');
    
    // Aave V3 Ethereum addresses
    logger.log('\n📋 Aave V3 Ethereum Contract Addresses:');
    logger.log(`Pool: ${normalizeAddress(AaveV3Ethereum.POOL)}`);
    logger.log(`Pool Addresses Provider: ${normalizeAddress(AaveV3Ethereum.POOL_ADDRESSES_PROVIDER)}`);
    logger.log(`Oracle: ${normalizeAddress(AaveV3Ethereum.ORACLE)}`);
    logger.log(`UI Pool Data Provider: ${normalizeAddress(AaveV3Ethereum.UI_POOL_DATA_PROVIDER)}`);
    logger.log(`UI Incentive Data Provider: ${normalizeAddress(AaveV3Ethereum.UI_INCENTIVE_DATA_PROVIDER)}`);
    
    // List all V3 properties for discovery
    logger.log('\n🔍 All AaveV3Ethereum Properties:');
    const v3Properties = Object.keys(AaveV3Ethereum).filter(key => {
      const value = (AaveV3Ethereum as any)[key];
      return typeof value !== 'function';
    });
    
    v3Properties.forEach(key => {
      const value = (AaveV3Ethereum as any)[key];
      const normalizedValue = typeof value === 'string' && value.startsWith('0x') 
        ? normalizeAddress(value) 
        : value;
      logger.log(`   ${key}: ${normalizedValue}`);
    });
    
    // Aave V2 Ethereum addresses
    logger.log('\n📋 Aave V2 Ethereum Contract Addresses:');
    logger.log(`Pool: ${normalizeAddress(AaveV2Ethereum.POOL)}`);
    logger.log(`Pool Addresses Provider: ${normalizeAddress(AaveV2Ethereum.POOL_ADDRESSES_PROVIDER)}`);
    logger.log(`Oracle: ${normalizeAddress(AaveV2Ethereum.ORACLE)}`);
    logger.log(`UI Pool Data Provider: ${normalizeAddress(AaveV2Ethereum.UI_POOL_DATA_PROVIDER)}`);
    
    // List all V2 properties for discovery
    logger.log('\n🔍 All AaveV2Ethereum Properties:');
    const v2Properties = Object.keys(AaveV2Ethereum).filter(key => {
      const value = (AaveV2Ethereum as any)[key];
      return typeof value !== 'function';
    });
    
    v2Properties.forEach(key => {
      const value = (AaveV2Ethereum as any)[key];
      const normalizedValue = typeof value === 'string' && value.startsWith('0x') 
        ? normalizeAddress(value) 
        : value;
      logger.log(`   ${key}: ${normalizedValue}`);
    });
    
    // Summary
    logger.log('\n📊 Address Book Summary:');
    logger.log(`✅ Aave V3 Properties: ${v3Properties.length}`);
    logger.log(`✅ Aave V2 Properties: ${v2Properties.length}`);
    logger.log('✅ All addresses normalized and validated');
    
    logger.log('\n🎉 AAVE ADDRESS BOOK CHECK COMPLETED SUCCESSFULLY!');
    logger.log('=====================================');
    
  } catch (error) {
    logger.error('❌ Aave address book check failed:', error);
    throw error;
  }
}

// Execute the check
try {
  checkAaveAddresses();
  logger.log('✅ Address book verification completed successfully');
} catch (error) {
  logger.error('❌ Address book verification failed:', error);
  process.exit(1);
}

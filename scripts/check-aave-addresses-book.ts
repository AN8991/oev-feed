import { 
  AaveV3Ethereum, 
  AaveV2Ethereum
} from '@bgd-labs/aave-address-book';

console.log('Aave V3 Ethereum Addresses:');
console.log('Pool:', AaveV3Ethereum.POOL);
console.log('Pool Addresses Provider:', AaveV3Ethereum.POOL_ADDRESSES_PROVIDER);
console.log('Oracle:', AaveV3Ethereum.ORACLE);
console.log('UI Data Provider:', AaveV3Ethereum.UI_POOL_DATA_PROVIDER);
console.log('UI Incentive Data Provider:', AaveV3Ethereum.UI_INCENTIVE_DATA_PROVIDER);

// List all available properties
console.log('\nAll AaveV3Ethereum properties:');
Object.keys(AaveV3Ethereum).forEach(key => {
  // @ts-ignore - We're just exploring the object
  const value = AaveV3Ethereum[key];
  if (typeof value !== 'function') {
    console.log(`${key}:`, value);
  }
});

console.log('\nAave V2 Ethereum Addresses:');
console.log('Lending Pool:', AaveV2Ethereum.POOL);
console.log('Pool Addresses Provider:', AaveV2Ethereum.POOL_ADDRESSES_PROVIDER);
console.log('Oracle:', AaveV2Ethereum.ORACLE);
console.log('UI Pool Data Provider:', AaveV2Ethereum.UI_POOL_DATA_PROVIDER);

// List all available properties
console.log('\nAll AaveV2Ethereum properties:');
Object.keys(AaveV2Ethereum).forEach(key => {
  // @ts-ignore - We're just exploring the object
  const value = AaveV2Ethereum[key];
  if (typeof value !== 'function') {
    console.log(`${key}:`, value);
  }
});

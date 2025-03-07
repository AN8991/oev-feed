// Checks the validity of Aave contract addresses against a known list or a configuration file. 
import { AaveV2Ethereum, AaveV3Ethereum } from '@bgd-labs/aave-address-book';

console.log('Aave V2 Ethereum Structure:');
console.log(JSON.stringify(AaveV2Ethereum, null, 2));

console.log('\nAave V3 Ethereum Structure:');
console.log(JSON.stringify(AaveV3Ethereum, null, 2));

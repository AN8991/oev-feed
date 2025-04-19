import { JsonRpcProvider } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// Replace with your actual values or import from config
declare const process: any;
const providerUrl = process.env.ETHEREUM_RPC_URL || '<YOUR_ETHEREUM_RPC_URL>';
const dataProviderAddress = process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER || '<YOUR_DATA_PROVIDER_ADDRESS>';

// Aave v3 data provider ABI (minimal for getReservesList)
const abi = [
  'function getReservesList() view returns (address[])'
];

async function main() {
  try {
    console.log('Connecting to provider:', providerUrl);
    const provider = new JsonRpcProvider(providerUrl);
    const dataProvider = new (await import('ethers')).Contract(dataProviderAddress, abi, provider);
    console.log('Calling getReservesList...');
    const reserves = await dataProvider.getReservesList();
    console.log('Reserves:', reserves);
    console.log('Success: getReservesList returned', reserves.length, 'reserves.');
  } catch (err) {
    const e = err as any;
    console.error('Error in minimal ethers.js test:', e && e.stack ? e.stack : e);
  }
}

main();

import { config } from 'dotenv';
import * as ethers from 'ethers';

config();

// Environment variables - Use Infura instead of Alchemy due to timeout issues
const RPC_URL = process.env.ETHEREUM_RPC_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
const DATA_PROVIDER_ADDRESS = process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER;

// Minimal ABI for getUserReserveData
const DATA_PROVIDER_ABI = [
  "function getUserReserveData(address asset, address user) external view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)"
];

// DAI address on Ethereum mainnet (as an example Aave v3 reserve)
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const TEST_USER_ADDRESS = "0x79682489385337996edd00eb56b4238b597bfae7";

async function main() {
  if (!RPC_URL || !DATA_PROVIDER_ADDRESS) {
    console.error("Missing RPC URL or Data Provider address in .env");
    process.exit(1);
  }
  

  // ethers v6 uses 'JsonRpcProvider' directly from 'ethers'
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const dataProvider = new ethers.Contract(DATA_PROVIDER_ADDRESS, DATA_PROVIDER_ABI, provider);

  try {
    console.log(`Calling getUserReserveData(DAI, ${TEST_USER_ADDRESS}) on Data Provider:`, DATA_PROVIDER_ADDRESS);
    const data = await dataProvider.getUserReserveData(DAI_ADDRESS, TEST_USER_ADDRESS);
    console.log("User Reserve Data for DAI:", data);
  } catch (err) {
    console.error("Error calling getUserReserveData:", err);
  }
}

main();

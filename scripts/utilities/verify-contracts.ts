/**
 * Contract Verification Script
 * 
 * This script automates the verification of smart contract addresses used in the application.
 * It checks contract existence, bytecode, and interface compatibility across different networks.
 * This helps ensure that the application is interacting with the correct and expected contracts.
 */
// Import contract verification utility from the project
import { runContractVerification } from '@domain/utils/contract-verification';

// Main function to execute contract verification process
async function main() {
  console.log('Starting contract verification...');
  await runContractVerification();
}

// Execute the main function and handle any errors
main().catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});
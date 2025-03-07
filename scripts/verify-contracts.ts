// Import contract verification utility from the project
import { runContractVerification } from '../src/utils/contractVerification';

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
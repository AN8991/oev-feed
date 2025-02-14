import { runContractVerification } from '../src/utils/contractVerification';

async function main() {
  console.log('Starting contract verification...');
  await runContractVerification();
}

main().catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});
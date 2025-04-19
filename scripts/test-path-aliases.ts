/**
 * Path Alias Test Script
 * 
 * This script tests whether the TypeScript path aliases are working correctly.
 * It imports modules using the path aliases and verifies they can be accessed.
 * 
 * Run with: ts-node -r tsconfig-paths/register scripts/test-path-aliases.ts
 * (Note: You'll need to install tsconfig-paths first)
 */

// Test domain imports
import { normalizeAddress } from '@domain/utils/address-utils';

// Test infrastructure imports
import { logger } from '@infrastructure/utils/logger';

// Test shared imports
import { retry, RetryOptions } from '@shared/utils/retry';

// Example function using imports from different layers
function testPathAliases(address: string): void {
  // Use domain utils
  const normalizedAddress = normalizeAddress(address);
  
  // Use infrastructure utils
  logger.info(
    `Testing path aliases with address: ${normalizedAddress}`
    // Removed LogCategory.DATABASE because it does not exist
  );
  
  // Use shared utils
  retry(async () => {
    console.log('Path aliases are working correctly!');
    return true;
  }, {
    maxAttempts: 1,
    delay: 0
  } as RetryOptions);
}

// Export the test function
export default testPathAliases;

// Path alias verification is done by TypeScript compilation
// If this file compiles without errors, path aliases are working

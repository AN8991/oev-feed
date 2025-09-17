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

// Test NestJS imports
import { Logger } from '@nestjs/common';

// Example function using imports from different layers
function testPathAliases(address: string): void {
  const logger = new Logger('PathAliasTest');
  
  // Use domain utils
  const normalizedAddress = normalizeAddress(address);
  
  // Use NestJS logger
  logger.log(`Testing path aliases with address: ${normalizedAddress}`);
  
  // Simple test without retry dependency
  console.log('Path aliases are working correctly!');
}

// Export the test function
export default testPathAliases;

// Path alias verification is done by TypeScript compilation
// If this file compiles without errors, path aliases are working

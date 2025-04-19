import 'reflect-metadata';
import { DatabaseInitService } from '@domain/services/database/database-init.service';
import { DatabaseService } from '@domain/services/database/database.service';
import { logger, LogCategory } from '@infrastructure/utils/logger';
import { writeFileSync } from 'fs';
import { join } from 'path';
/**
 * Test script to verify database connection and TypeORM integration
 */
async function testDatabaseConnection() {
  try {
    logger.info('Starting database connection test', LogCategory.DATABASE);
    
    // Initialize database
    const dbService = new DatabaseService();
    await dbService.initialize();
    
    // Test provider operations
    logger.info('Testing provider operations', LogCategory.DATABASE);
    
    // Get all providers
    const providers = await dbService.getProviders(false);
    logger.info(`Found ${providers.length} providers in database`, LogCategory.DATABASE);
    
    // Create a test provider if none exist
    if (providers.length === 0) {
      logger.info('Creating test provider', LogCategory.DATABASE);
      const newProvider = await dbService.createProvider({
        name: 'Test Provider',
        type: 'test',
        network: 'mainnet',
        apiKey: 'test-api-key',
        baseUrl: 'https://example.com',
        isActive: true,
        rateLimit: 100,
        priority: 10
      });
      
      logger.info(`Created test provider with ID: ${newProvider.id}`, LogCategory.DATABASE);
      
      // Record a test request
      await dbService.recordSuccessfulRequest(
        newProvider.id,
        'mainnet',
        'eth_blockNumber',
        [],
        50 // 50ms response time
      );
      
      logger.info('Recorded test request', LogCategory.DATABASE);
      
      // Get provider health
      const health = await dbService.getProviderHealth(newProvider.id, 'mainnet');
      logger.info(`Provider health: ${JSON.stringify(health)}`, LogCategory.DATABASE);
    } else {
      // Use existing provider
      const provider = providers[0];
      logger.info(`Using existing provider: ${provider.name}`, LogCategory.DATABASE);
      
      // Get provider health
      const health = await dbService.getProviderHealth(provider.id, 'mainnet');
      logger.info(`Provider health: ${JSON.stringify(health)}`, LogCategory.DATABASE);
    }
    
    logger.info('Database connection test completed successfully', LogCategory.DATABASE);
  } catch (error) {
    logger.error(
      'Database connection test failed',
      LogCategory.DATABASE,
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    // Write error details to data/test-database-connection-error.log
    try {
      const errorLogPath = join(process.cwd(), 'data', 'test-database-connection-error.log');
      const errorDetails = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              ...(typeof (error as any).code !== 'undefined' && { code: (error as any).code })
            }
          : error
      };
      writeFileSync(errorLogPath, JSON.stringify(errorDetails, null, 2), { encoding: 'utf8' });
      console.error(`Full error details written to ${errorLogPath}`);
    } catch (logErr) {
      console.error('Failed to write error log:', logErr);
    }
  } finally {
    // Close database connection
    const dbInitService = DatabaseInitService.getInstance();
    await dbInitService.close();
  }
}

// Run the test
// eslint-disable-next-line @typescript-eslint/no-floating-promises
testDatabaseConnection().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

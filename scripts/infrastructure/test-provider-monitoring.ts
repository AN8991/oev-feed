/**
 * Test script for provider monitoring system
 * 
 * This script demonstrates how the provider monitoring system works
 * with the provider adapters.
 */

import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { logger, LogCategory } from '@infrastructure/utils/logger';
import { metrics } from '@infrastructure/utils/metrics-collector';
import { providerHealthMonitor } from '@infrastructure/utils/provider-health-monitor';
import { dashboard } from '@infrastructure/utils/dashboard-service';

async function main() {
  try {
    // Start the monitoring systems
    logger.info('Starting provider monitoring test', LogCategory.GENERAL);
    
    // Start the health monitor
    providerHealthMonitor.startMonitoring();
    
    // Start the dashboard
    await dashboard.start();
    logger.info('Dashboard started at http://localhost:3000', LogCategory.GENERAL);
    
    // Get available networks
    const networks = ProviderFactory.getAvailableNetworks();
    logger.info(`Available networks: ${networks.join(', ')}`, LogCategory.GENERAL);
    
    // Test each network
    for (const network of networks) {
      try {
        // Get the best provider for the network
        const provider = await ProviderFactory.getBestProvider(network);
        
        logger.info(`Testing provider ${provider.name} (${provider.type}) on ${network}`, LogCategory.PROVIDER);
        
        // Get current block number
        const blockNumber = await provider.getBlockNumber();
        logger.info(`Current block number on ${network}: ${blockNumber}`, LogCategory.PROVIDER);
        
        // Check provider health
        const isHealthy = await provider.isHealthy();
        logger.info(`Provider ${provider.name} is ${isHealthy ? 'healthy' : 'unhealthy'}`, LogCategory.PROVIDER);
        
        // Get provider stats
        const stats = provider.getStats();
        logger.info(`Provider stats for ${provider.name}:`, LogCategory.PROVIDER, {
          stats
        });
      } catch (error) {
        logger.error(`Error testing network ${network}:`, LogCategory.PROVIDER, {}, 
          error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    // Wait for a while to collect metrics
    logger.info('Waiting for 30 seconds to collect metrics...', LogCategory.GENERAL);
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Flush metrics
    metrics.flush();
    
    // Check health monitor results
    const healthResults = providerHealthMonitor.getAllHealthCheckResults();
    logger.info(`Collected ${healthResults.size} health check results`, LogCategory.GENERAL);
    
    logger.info('Provider monitoring test completed', LogCategory.GENERAL);
    
    // Keep the dashboard running
    logger.info('Dashboard is still running at http://localhost:3000', LogCategory.GENERAL);
    logger.info('Press Ctrl+C to exit', LogCategory.GENERAL);
  } catch (error) {
    logger.error('Error in provider monitoring test:', LogCategory.GENERAL, {}, 
      error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

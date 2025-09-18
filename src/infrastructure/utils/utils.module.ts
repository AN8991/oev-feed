import { Module } from '@nestjs/common';
import { RequestDistributor } from './request-distributor';
import { ProviderHealthMonitor } from './provider-health-monitor';
import { DataSourceFallback } from './data-source-fallback';

/**
 * Infrastructure Utils Module
 * 
 * Provides utility services for the infrastructure layer.
 */
@Module({
  providers: [
    RequestDistributor,
    ProviderHealthMonitor,
    DataSourceFallback,
  ],
  exports: [
    RequestDistributor,
    ProviderHealthMonitor,
    DataSourceFallback,
  ],
})
export class UtilsModule {}

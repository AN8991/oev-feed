import { Module } from '@nestjs/common';
import { RequestDistributor } from './request-distributor';

/**
 * Infrastructure Utils Module
 * 
 * Provides utility services for the infrastructure layer.
 */
@Module({
  providers: [RequestDistributor],
  exports: [RequestDistributor],
})
export class UtilsModule {}

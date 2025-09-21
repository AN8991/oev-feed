/**
 * Simple Cache Module Configuration
 * Sets up in-memory caching without external dependencies
 */

import { Module, Global } from '@nestjs/common';
import { SimpleCacheService } from './cache.service';

@Global()
@Module({
  providers: [SimpleCacheService],
  exports: [SimpleCacheService],
})
export class CacheModule {}

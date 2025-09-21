/**
 * Database Module
 * 
 * Provides database-related services for the infrastructure layer
 */

import { Module } from '@nestjs/common';
import { DatabaseLifecycleService } from './database-lifecycle.service';

@Module({
  providers: [DatabaseLifecycleService],
  exports: [DatabaseLifecycleService],
})
export class DatabaseModule {}

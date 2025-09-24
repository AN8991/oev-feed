import { Module } from '@nestjs/common';

/**
 * Infrastructure Utils Module
 * 
 * Provides utility services for the infrastructure layer.
 * Note: All services moved to AppModule to avoid circular dependencies.
 */
@Module({
  providers: [],
  exports: [],
})
export class UtilsModule {}

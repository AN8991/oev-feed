import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpConfigService } from './http.config';

/**
 * Global HTTP Configuration Module
 * Makes HttpConfigService available across all modules
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [HttpConfigService],
  exports: [HttpConfigService],
})
export class HttpConfigModule {}

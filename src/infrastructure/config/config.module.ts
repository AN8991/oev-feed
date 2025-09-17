import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config';

/**
 * Global Core Configuration Module
 * Makes ConfigService available across all modules for core application configuration
 */
@Global()
@Module({
  imports: [NestConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ['.env', '.env.local'],
    cache: true,
  })],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}

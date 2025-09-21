/**
 * Network Configuration Module
 * 
 * Provides network configuration services for the application
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NetworkConfigService } from './network.config';

@Module({
  imports: [ConfigModule],
  providers: [NetworkConfigService],
  exports: [NetworkConfigService],
})
export class NetworkModule {}

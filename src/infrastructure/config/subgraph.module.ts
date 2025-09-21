/**
 * Subgraph Configuration Module
 * 
 * Provides subgraph configuration services for the application
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubgraphService } from './subgraph.service';

@Module({
  imports: [ConfigModule],
  providers: [SubgraphService],
  exports: [SubgraphService],
})
export class SubgraphModule {}

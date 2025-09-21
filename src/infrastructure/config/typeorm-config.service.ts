/**
 * TypeORM Configuration Service
 * 
 * Provides TypeORM configuration using proper NestJS dependency injection
 * Replaces the legacy singleton pattern with injectable service
 */

import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

// Entity imports
import { Provider } from '../../adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderRequest } from '../../adapters/secondary/database/typeorm/entities/provider-request.entity';
import { ProviderHealth } from '../../adapters/secondary/database/typeorm/entities/provider-health.entity';
import { PositionEntity } from '../../adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '../../adapters/secondary/database/typeorm/entities/user.entity';
import { Transaction } from '../../adapters/secondary/database/typeorm/entities/transaction.entity';
import { Block } from '../../adapters/secondary/database/typeorm/entities/block.entity';
import { OevEvent } from '../../adapters/secondary/database/typeorm/entities/oev-event.entity';
import { OevOpportunity } from '../../adapters/secondary/database/typeorm/entities/oev-opportunity.entity';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME', 'oev_feed'),
      url: this.configService.get<string>('DATABASE_URL'),
      
      // Entity configuration
      entities: [
        Provider,
        ProviderRequest,
        ProviderHealth,
        PositionEntity,
        UserEntity,
        Transaction,
        Block,
        OevEvent,
        OevOpportunity,
      ],
      
      // Migration configuration
      migrations: [join(__dirname, '../../database/migrations/*.{ts,js}')],
      migrationsTableName: 'migrations',
      migrationsRun: false, // Let NestJS handle migrations
      
      // Development vs Production settings
      synchronize: !isProduction && this.configService.get<boolean>('DB_SYNCHRONIZE', false),
      logging: !isProduction && this.configService.get<boolean>('DB_LOGGING', false),
      dropSchema: false,
      
      // Connection pool settings
      extra: {
        max: this.configService.get<number>('DB_MAX_CONNECTIONS', 10),
        min: this.configService.get<number>('DB_MIN_CONNECTIONS', 1),
        acquireTimeoutMillis: this.configService.get<number>('DB_ACQUIRE_TIMEOUT', 30000),
        idleTimeoutMillis: this.configService.get<number>('DB_IDLE_TIMEOUT', 30000),
      },
      
      // SSL configuration for production
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      
      // Auto-load entities in development
      autoLoadEntities: !isProduction,
    };
  }

  /**
   * Get TypeORM options for CLI operations (migrations, etc.)
   * This method provides configuration for TypeORM CLI tools
   */
  getCliOptions(): TypeOrmModuleOptions {
    const baseOptions = this.createTypeOrmOptions();
    
    return {
      ...baseOptions,
      // CLI-specific overrides
      synchronize: false, // Never synchronize in CLI operations
      migrationsRun: false, // CLI handles migrations manually
      logging: this.configService.get<boolean>('DB_CLI_LOGGING', true),
      
      // Ensure entities are loaded from compiled JS files for CLI
      entities: [join(__dirname, '../../adapters/secondary/database/typeorm/entities/*.entity.{ts,js}')],
      migrations: [join(__dirname, '../../database/migrations/*.{ts,js}')],
    };
  }
}

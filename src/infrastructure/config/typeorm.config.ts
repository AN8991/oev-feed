import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { getLegacyConfigService } from './config';
import { Provider } from '../../adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderRequest } from '../../adapters/secondary/database/typeorm/entities/provider-request.entity';
import { ProviderHealth } from '../../adapters/secondary/database/typeorm/entities/provider-health.entity';
import { Block } from '../../adapters/secondary/database/typeorm/entities/block.entity';
import { Transaction } from '../../adapters/secondary/database/typeorm/entities/transaction.entity';
import { OevEvent } from '../../adapters/secondary/database/typeorm/entities/oev-event.entity';
import { OevOpportunity } from '../../adapters/secondary/database/typeorm/entities/oev-opportunity.entity';
import { BaseEntity } from '../../adapters/secondary/database/typeorm/entities/base.entity';
import { PositionEntity } from '../../adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '../../adapters/secondary/database/typeorm/entities/user.entity';

// Get config service instance for legacy support
const configService = getLegacyConfigService();

// TypeORM configuration options
export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: configService.database.host,
  port: configService.database.port,
  username: configService.database.username,
  password: configService.database.password,
  database: configService.database.name,
  // Temporarily disable synchronize to avoid schema migration issues
  synchronize: false,
  logging: configService.database.logging,
  entities: [
    BaseEntity,
    Provider,
    ProviderRequest,
    ProviderHealth,
    Block,
    Transaction,
    PositionEntity,
    UserEntity,
    OevEvent,
    OevOpportunity
  ],
  migrations: [join(__dirname, '../migrations/**/*.{ts,js}')],
  subscribers: [join(__dirname, '../subscribers/**/*.{ts,js}')],
};

// Create and export the data source
export const AppDataSource = new DataSource(typeOrmConfig);

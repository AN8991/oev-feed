import 'dotenv/config';
import { DataSource } from 'typeorm';

// Use adapter entities instead of domain entities (architectural compliance)
import { PositionEntity } from './adapters/secondary/database/typeorm/entities/position.entity';
import { Provider } from './adapters/secondary/database/typeorm/entities/provider.entity';
import { OevEvent } from './adapters/secondary/database/typeorm/entities/oev-event.entity';
import { UserEntity } from './adapters/secondary/database/typeorm/entities/user.entity';
import { Block } from './adapters/secondary/database/typeorm/entities/block.entity';
import { Transaction } from './adapters/secondary/database/typeorm/entities/transaction.entity';
import { OevOpportunity } from './adapters/secondary/database/typeorm/entities/oev-opportunity.entity';
import { ProviderHealth } from './adapters/secondary/database/typeorm/entities/provider-health.entity';
import { ProviderRequest } from './adapters/secondary/database/typeorm/entities/provider-request.entity';

// Import migration
import { AddProtocolNetworkLastUpdatedToUsers1737744000000 } from './infrastructure/database/migrations/1737744000000-AddProtocolNetworkLastUpdatedToUsers';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    PositionEntity,
    UserEntity,
    Provider,
    ProviderRequest,
    ProviderHealth,
    OevEvent,
    Transaction,
    Block,
    OevOpportunity,
  ],
  migrations: [
    AddProtocolNetworkLastUpdatedToUsers1737744000000,
  ],
  synchronize: false,
});

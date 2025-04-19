import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Position } from './domain/entities/position.entity';
import { Provider } from './domain/entities/provider.entity';
import { Event } from './domain/entities/event.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Position, Provider, Event],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

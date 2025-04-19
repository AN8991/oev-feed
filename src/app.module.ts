import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PositionsController } from './adapters/primary/rest/controllers/positions.controller';
import { ProvidersController } from './adapters/primary/rest/controllers/providers.controller';
import { EventsController } from './adapters/primary/rest/controllers/events.controller';
import { PositionsService } from '../src/domain/services/positions.service';
import { ProvidersService } from '../src/domain/services/providers.service';
import { EventsService } from '../src/domain/services/events.service';
import { Position } from './domain/entities/position.entity';
import { Provider } from './domain/entities/provider.entity';
import { Event } from './domain/entities/event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Position, Provider, Event],
      synchronize: true, // Set to false in production!
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([Position, Provider, Event]),
  ],
  controllers: [PositionsController, ProvidersController, EventsController],
  providers: [PositionsService, ProvidersService, EventsService],
})
export class AppModule {}

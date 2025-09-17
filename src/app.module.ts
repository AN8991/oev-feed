import { Module, Controller, Get } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from './infrastructure/config/config.module';
import { ConfigService as AppConfigService } from './infrastructure/config/config';
import { HttpConfigModule } from './infrastructure/config/http-config.module';
import { ProviderConfigModule } from './infrastructure/config/provider-config.module';

// Controllers
import { PositionsController } from './adapters/primary/rest/controllers/positions.controller';
import { ProvidersController } from './adapters/primary/rest/controllers/providers.controller';
import { EventsController } from './adapters/primary/rest/controllers/events.controller';
import { RiskAssessmentController } from './adapters/primary/rest/controllers/risk-assessment.controller';
import { MiddlewareDemoController } from './adapters/primary/rest/controllers/middleware-demo.controller';

// Services
import { RiskAnalysisService } from './domain/services/risk-analysis.service';
import { PositionsService } from './domain/services/positions.service';
import { RiskAssessmentService } from './application/services/risk-assessment.service';
import { QueryOrchestratorService } from './application/services/query-orchestrator.service';
import { DatabaseInitService } from './domain/services/database/database-init.service';
import { ProtocolAdapterFactory } from './adapters/secondary/protocols/protocol-adapter-factory';
import { HttpConfigService } from './infrastructure/config/http.config';
import { ContractVerificationService } from './infrastructure/services/contract-verification.service';
import { ProviderHealthMonitor } from './infrastructure/utils/provider-health-monitor';
import { RequestDistributor } from './infrastructure/utils/request-distributor';
import { TypeORMAdapter } from './adapters/secondary/database/typeorm/typeorm-adapter';

// Middleware
import { MiddlewareModule, LoggingInterceptor, MetricsInterceptor, CircuitBreakerInterceptor, ErrorHandlingInterceptor } from './middleware';

// Repositories
import { ProviderRepository } from './adapters/secondary/database/typeorm/repositories/provider.repository';
import { ProviderRequestRepository } from './adapters/secondary/database/typeorm/repositories/provider-request.repository';
import { ProviderHealthRepository } from './adapters/secondary/database/typeorm/repositories/provider-health.repository';
// PositionRepository removed - using direct TypeORM Repository<PositionEntity> instead

// Protocol Adapter Module
import { ProtocolAdapterModule } from './adapters/secondary/protocols/protocol-adapter.module';

// Provider Factory Module
import { ProviderFactoryModule } from './adapters/secondary/providers/provider-factory.module';

// Time Module
import { TimeModule } from './infrastructure/services/time.module';

// Database configuration
import { typeOrmConfig } from './infrastructure/config/typeorm.config';


// Entities
import { PositionEntity } from './adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from './adapters/secondary/database/typeorm/entities/user.entity';
import { Provider } from './adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderRequest } from './adapters/secondary/database/typeorm/entities/provider-request.entity';
import { ProviderHealth } from './adapters/secondary/database/typeorm/entities/provider-health.entity';
import { OevEvent } from './adapters/secondary/database/typeorm/entities/oev-event.entity';
import { Transaction } from './adapters/secondary/database/typeorm/entities/transaction.entity';
import { Block } from './adapters/secondary/database/typeorm/entities/block.entity';
import { OevOpportunity } from './adapters/secondary/database/typeorm/entities/oev-opportunity.entity';

@Controller()
class AppController {
  @Get()
  getApiInfo() {
    return {
      name: 'OEV Feed API',
      version: '1.0.0',
      description: 'DeFi data aggregation service with risk assessment',
      endpoints: {
        swagger: '/api/v1.0.0/docs',
        positions: '/api/v1.0.0/positions',
        providers: '/api/v1.0.0/providers',
        events: '/api/v1.0.0/events',
        riskAssessment: '/api/v1.0.0/risk-assessment'
      }
    };
  }
}

@Module({
  imports: [
    ConfigModule,
    HttpConfigModule,
    ProviderConfigModule,
    ProviderFactoryModule,
    TimeModule,
    TypeOrmModule.forRootAsync({
      useFactory: (configService: AppConfigService) => {
        const dbConfig = configService.database;
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.name,
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
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
        };
      },
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([
      PositionEntity,
      UserEntity,
      Provider,
      ProviderRequest,
      ProviderHealth,
      OevEvent,
      Transaction,
      Block,
      OevOpportunity,
    ]),
    HttpModule.registerAsync({
      useFactory: (httpConfigService: HttpConfigService) => {
        const httpConfig = httpConfigService.getHttpConfig();
        return {
          timeout: httpConfig.timeout,
          maxRedirects: httpConfig.maxRedirects,
          retries: httpConfig.retries,
        };
      },
      inject: [HttpConfigService],
    }),
    ProtocolAdapterModule,
    MiddlewareModule,
  ],
  controllers: [AppController, PositionsController, ProvidersController, EventsController, RiskAssessmentController, MiddlewareDemoController],
  providers: [
    // Domain Services
    RiskAnalysisService,
    PositionsService,
    
    // Application Services
    RiskAssessmentService,
    QueryOrchestratorService,
    ProtocolAdapterFactory,
    
    // Infrastructure Services
    AppConfigService,
    ContractVerificationService,
    ProviderHealthMonitor,
    RequestDistributor,
    TypeORMAdapter,
    DatabaseInitService,
    
    // Repositories
    ProviderRepository,
    ProviderRequestRepository,
    ProviderHealthRepository,
    // PositionRepository removed - using direct TypeORM Repository<PositionEntity> instead
    
    // Global Interceptors (order matters - error handling should be first)
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CircuitBreakerInterceptor,
    },
  ],
})
export class AppModule {}

import { Module, Controller, Get } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from './infrastructure/config/config.module';
import { ConfigService as AppConfigService } from './infrastructure/config/config';
import { TypeOrmConfigService } from './infrastructure/config/typeorm-config.service';
import { HttpConfigModule } from './infrastructure/config/http-config.module';
import { ProviderConfigModule } from './infrastructure/config/provider-config.module';
import { NetworkModule } from './infrastructure/config/network.module';
import { TypeOrmConfigModule } from './infrastructure/config/typeorm-config.module';
import { SubgraphModule } from './infrastructure/config/subgraph.module';
import { CacheModule } from './infrastructure/cache/cache.module';

// Controllers
import { PositionsController } from './adapters/primary/rest/controllers/positions.controller';
import { ProvidersController } from './adapters/primary/rest/controllers/providers.controller';
import { EventsController } from './adapters/primary/rest/controllers/events.controller';
import { RiskAssessmentController } from './adapters/primary/rest/controllers/risk-assessment.controller';

// Services
import { RiskAnalysisService } from './application/services/risk-analysis.service';
import { PositionsService } from './application/services/positions.service';
import { RiskAssessmentService } from './application/services/risk-assessment.service';
import { QueryOrchestratorService } from './application/services/query-orchestrator.service';
import { DatabaseLifecycleService } from './infrastructure/database/database-lifecycle.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ProtocolAdapterFactory } from './adapters/secondary/protocols/protocol-adapter-factory';
import { ProtocolAdapterService } from './adapters/secondary/protocols/protocol-adapter.service';
import { ProviderFactory } from './adapters/secondary/providers/provider-factory';
import { HttpConfigService } from './infrastructure/config/http.config';
import { ContractVerificationService } from './infrastructure/services/contract-verification.service';
import { ProviderHealthMonitor } from './infrastructure/utils/provider-health-monitor';
import { RequestDistributor } from './infrastructure/utils/request-distributor';
import { DataSourceFallback } from './infrastructure/utils/data-source-fallback';
import { ProviderHealthIntegrationService } from './application/services/provider-health-integration.service';

// User Discovery Service
import { UserDiscoveryService } from './application/services/user-discovery/user-discovery.service';

// Middleware, Time and Utils
import { MiddlewareModule, LoggingInterceptor, MetricsInterceptor, CircuitBreakerInterceptor, ErrorHandlingInterceptor } from './middleware';
import { TimeModule } from './infrastructure/services/time.module';
import { UtilsModule } from './infrastructure/utils/utils.module';

// Mappers
import { EventMapper } from './application/mappers/event.mapper';
import { ProviderMapper } from './application/mappers/provider.mapper';
import { AavePositionMapper } from './application/mappers/aave-position.mapper';

// Repositories
import { ProviderRepository } from './adapters/secondary/database/typeorm/repositories/provider.repository';
import { ProviderRequestRepository } from './adapters/secondary/database/typeorm/repositories/provider-request.repository';
import { ProviderHealthRepository } from './adapters/secondary/database/typeorm/repositories/provider-health.repository';
// PositionRepository removed - using direct TypeORM Repository<PositionEntity> instead

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
        swagger: '/api/v1/docs',
        positions: '/api/v1/positions',
        providers: '/api/v1/providers',
        events: '/api/v1/events',
        riskAssessment: '/api/v1/risk-assessment'
      }
    };
  }
}

@Module({
  imports: [
    ConfigModule,
    HttpConfigModule,
    ProviderConfigModule,
    NetworkModule,
    TypeOrmConfigModule,
    SubgraphModule,
    DatabaseModule,
    TimeModule,
    UtilsModule,
    TypeOrmModule.forRootAsync({
      imports: [TypeOrmConfigModule],
      useClass: TypeOrmConfigService,
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
    MiddlewareModule,
  ],
  controllers: [AppController, PositionsController, ProvidersController, EventsController, RiskAssessmentController],
  providers: [
    // Domain Services
    RiskAnalysisService,
    PositionsService,
    
    // Application Services
    RiskAssessmentService,
    QueryOrchestratorService,
    UserDiscoveryService,
    ProtocolAdapterFactory,
    ProtocolAdapterService,
    ProviderFactory,
    ProviderHealthIntegrationService,
    
    // Mappers
    EventMapper,
    ProviderMapper,
    AavePositionMapper,
    
    // Infrastructure Services
    AppConfigService,
    ContractVerificationService,
    ProviderHealthMonitor,
    RequestDistributor,
    DataSourceFallback,
    DatabaseLifecycleService,
    
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

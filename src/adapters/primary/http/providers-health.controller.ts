import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface ProviderHealthResponse {
  providers: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTimeMs: number;
    successRate: number;
    lastChecked: string;
  }>;
  requestDistribution: Array<{
    provider: string;
    requestCount: number;
    successCount: number;
    failureCount: number;
  }>;
  circuitBreakers: Array<{
    provider: string;
    isOpen: boolean;
    reason: string;
    retryAfter: string;
    fallbackProvider: string;
  }>;
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    fallbackActivations: number;
  };
}

@ApiTags('Provider Health')
@Controller('provider-health')
export class ProvidersHealthController {
  @Get()
  @ApiOperation({ summary: 'Get provider infrastructure health status' })
  @ApiResponse({ status: 200, description: 'Provider health retrieved successfully' })
  async getHealth(): Promise<ProviderHealthResponse> {
    try {
      // TODO: Integrate with actual provider health monitoring
      // For now, return mock data based on common providers
      const providers = [
        {
          name: 'Alchemy',
          status: 'healthy' as const,
          responseTimeMs: 120,
          successRate: 99.5,
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'Infura',
          status: 'healthy' as const,
          responseTimeMs: 150,
          successRate: 98.8,
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'QuickNode',
          status: 'healthy' as const,
          responseTimeMs: 110,
          successRate: 99.2,
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'Ankr',
          status: 'degraded' as const,
          responseTimeMs: 250,
          successRate: 95.5,
          lastChecked: new Date().toISOString(),
        },
      ];

      const requestDistribution = [
        {
          provider: 'Alchemy',
          requestCount: 1250,
          successCount: 1244,
          failureCount: 6,
        },
        {
          provider: 'Infura',
          requestCount: 980,
          successCount: 968,
          failureCount: 12,
        },
        {
          provider: 'QuickNode',
          requestCount: 750,
          successCount: 744,
          failureCount: 6,
        },
        {
          provider: 'Ankr',
          requestCount: 420,
          successCount: 401,
          failureCount: 19,
        },
      ];

      const circuitBreakers: Array<{
        provider: string;
        isOpen: boolean;
        reason: string;
        retryAfter: string;
        fallbackProvider: string;
      }> = [];

      const totalRequests = requestDistribution.reduce((sum, r) => sum + r.requestCount, 0);
      const totalFailures = requestDistribution.reduce((sum, r) => sum + r.failureCount, 0);
      const totalResponseTime = providers.reduce((sum, p) => sum + p.responseTimeMs * requestDistribution.find(r => r.provider === p.name)!.requestCount, 0);

      const metrics = {
        totalRequests,
        averageResponseTime: Math.round(totalResponseTime / totalRequests),
        errorRate: Number(((totalFailures / totalRequests) * 100).toFixed(2)),
        fallbackActivations: 0,
      };

      return {
        providers,
        requestDistribution,
        circuitBreakers,
        metrics,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to fetch provider health: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

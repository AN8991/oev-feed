/**
 * Middleware Demo Controller
 * Demonstrates middleware functionality including logging, metrics, circuit breaker, and error handling
 */

import { Controller, Get, Post, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CircuitBreaker, Metrics, LogExecution } from '../../../../middleware';

interface TestRequest {
  message: string;
  delay?: number;
  shouldFail?: boolean;
}

@Controller('middleware-demo')
export class MiddlewareDemoController {
  private readonly logger = new Logger(MiddlewareDemoController.name);

  @Get('health')
  @Metrics({ track: ['duration', 'success_rate'] })
  @LogExecution({ level: 'info', message: 'Health check endpoint called' })
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      middleware: {
        logging: 'enabled',
        metrics: 'enabled',
        circuitBreaker: 'enabled',
        errorHandling: 'enabled',
      },
    };
  }

  @Get('success')
  @Metrics({ track: ['duration', 'success_rate', 'throughput'] })
  @LogExecution({ level: 'info', includeResult: true })
  successEndpoint() {
    return {
      message: 'This endpoint always succeeds',
      timestamp: new Date().toISOString(),
      data: { processed: true, items: 42 },
    };
  }

  @Get('error')
  @Metrics({ track: ['duration', 'error_rate'] })
  @LogExecution({ level: 'warn', message: 'Error endpoint called' })
  errorEndpoint() {
    throw new HttpException('This endpoint always fails', HttpStatus.BAD_REQUEST);
  }

  @Get('timeout/:delay')
  @CircuitBreaker({ timeout: 2000, errorThresholdPercentage: 50 })
  @Metrics({ track: ['duration', 'success_rate'] })
  @LogExecution({ level: 'info', includeArgs: true })
  async timeoutEndpoint(@Param('delay') delay: string) {
    const delayMs = parseInt(delay, 10);
    
    if (delayMs > 5000) {
      throw new HttpException('Delay too long', HttpStatus.BAD_REQUEST);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return {
      message: `Delayed response after ${delayMs}ms`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('process')
  @CircuitBreaker({ 
    timeout: 3000, 
    errorThresholdPercentage: 60,
    resetTimeout: 10000 
  })
  @Metrics({ 
    track: ['duration', 'success_rate', 'error_rate'],
    customLabels: { operation: 'process_data' }
  })
  @LogExecution({ 
    level: 'info', 
    includeArgs: true, 
    includeResult: true,
    message: 'Processing data request'
  })
  async processData(@Body() request: TestRequest) {
    this.logger.log(`Processing request: ${request.message}`);

    // Simulate processing delay
    if (request.delay) {
      await new Promise(resolve => setTimeout(resolve, request.delay));
    }

    // Simulate failure condition
    if (request.shouldFail) {
      throw new HttpException(
        'Processing failed as requested',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      message: 'Data processed successfully',
      input: request.message,
      timestamp: new Date().toISOString(),
      processingTime: request.delay || 0,
    };
  }

  @Get('circuit-breaker-test')
  @CircuitBreaker({ 
    timeout: 1000,
    errorThresholdPercentage: 30,
    resetTimeout: 5000
  })
  @Metrics({ track: ['duration', 'success_rate', 'error_rate'] })
  async circuitBreakerTest() {
    // Randomly fail 50% of the time to trigger circuit breaker
    if (Math.random() < 0.5) {
      throw new HttpException(
        'Random failure for circuit breaker testing',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      message: 'Circuit breaker test passed',
      timestamp: new Date().toISOString(),
      random: Math.random(),
    };
  }

  @Get('metrics-demo/:category')
  @Metrics({ 
    track: ['duration', 'throughput'],
    customLabels: { endpoint_type: 'demo' }
  })
  metricsDemo(@Param('category') category: string) {
    const categories = ['fast', 'medium', 'slow'];
    
    if (!categories.includes(category)) {
      throw new HttpException('Invalid category', HttpStatus.BAD_REQUEST);
    }

    // Simulate different response times
    const delays = { fast: 10, medium: 100, slow: 500 };
    const delay = delays[category as keyof typeof delays];

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          category,
          message: `${category} response completed`,
          timestamp: new Date().toISOString(),
          simulatedDelay: delay,
        });
      }, delay);
    });
  }
}

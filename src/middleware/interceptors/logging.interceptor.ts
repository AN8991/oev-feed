/**
 * Logging Interceptor
 * Provides automatic request/response logging using nestjs-pino
 */

import { Injectable, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import { BaseInterceptor } from './base.interceptor';
import { LoggingConfig, defaultMiddlewareConfig } from '../config/middleware.config';
import { HttpMethods } from '../../domain/enums/httpMethods';
import { HttpMethodConfig, isSafeHttpMethod } from '../../domain/utils/http-methods.utils';

@Injectable()
export class LoggingInterceptor extends BaseInterceptor {
  constructor(
    private readonly logger: PinoLogger,
    @Inject('LOGGING_CONFIG') private readonly config: LoggingConfig = defaultMiddlewareConfig.logging,
  ) {
    super();
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestInfo = this.getRequestInfo(context);
    const handlerInfo = this.getHandlerInfo(context);
    const startTime = Date.now();

    // Skip logging for excluded paths
    if (this.shouldExcludePath(requestInfo.path, this.config.excludePaths)) {
      return next.handle();
    }

    // Skip logging for specific HTTP methods if configured
    if (!this.shouldLogMethod(requestInfo.method)) {
      return next.handle();
    }

    // Log incoming request
    this.logRequest(requestInfo, handlerInfo);

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.logResponse(requestInfo, handlerInfo, duration, data, null);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logResponse(requestInfo, handlerInfo, duration, null, error);
        throw error;
      }),
    );
  }

  private logRequest(requestInfo: any, handlerInfo: any) {
    const logData: Record<string, any> = {
      correlationId: requestInfo.correlationId,
      method: requestInfo.method,
      url: requestInfo.url,
      path: requestInfo.path,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip,
      handler: handlerInfo.fullName,
      timestamp: requestInfo.timestamp,
      type: 'request',
    };

    if (this.config.includeRequestBody && requestInfo.request.body) {
      logData.body = this.sanitizeBody(requestInfo.request.body);
    }

    this.logger.info(logData, `Incoming ${requestInfo.method} ${requestInfo.path}`);
  }

  private logResponse(requestInfo: any, handlerInfo: any, duration: number, data: any, error: any) {
    const logData: Record<string, any> = {
      correlationId: requestInfo.correlationId,
      method: requestInfo.method,
      url: requestInfo.url,
      path: requestInfo.path,
      handler: handlerInfo.fullName,
      duration,
      statusCode: requestInfo.response.statusCode,
      type: 'response',
    };

    if (error) {
      logData.error = {
        message: error.message,
        name: error.name,
        stack: this.config.includeStackTrace ? error.stack : undefined,
      };
      this.logger.error(logData, `Request failed: ${requestInfo.method} ${requestInfo.path}`);
    } else {
      if (this.config.includeResponseBody && data) {
        logData.responseBody = this.sanitizeBody(data);
      }
      this.logger.info(logData, `Request completed: ${requestInfo.method} ${requestInfo.path} (${duration}ms)`);
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    // Create a copy to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(body));
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    this.removeSensitiveFields(sanitized, sensitiveFields);
    
    return sanitized;
  }

  private removeSensitiveFields(obj: any, sensitiveFields: string[]) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.removeSensitiveFields(obj[key], sensitiveFields);
      }
    }
  }

  /**
   * Check if logging should be enabled for a specific HTTP method
   */
  private shouldLogMethod(method: HttpMethods): boolean {
    if (!this.config.methodSpecificLogging) {
      // Default behavior: log non-safe methods (POST, PUT, DELETE, PATCH) by default
      // Safe methods (GET, HEAD, OPTIONS) are not logged by default to reduce noise
      return HttpMethodConfig.LOGGED_METHODS.includes(method as any);
    }
    
    const methodConfig = this.config.methodSpecificLogging[method];
    return methodConfig !== false; // Log unless explicitly disabled
  }
}

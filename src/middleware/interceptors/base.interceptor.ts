/**
 * Base Interceptor
 * Common functionality for all middleware interceptors
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { HttpMethods } from '../../domain/enums/httpMethods';
import { normalizeHttpMethod } from '../../domain/utils/http-methods.utils';

@Injectable()
export abstract class BaseInterceptor implements NestInterceptor {
  abstract intercept(context: ExecutionContext, next: CallHandler): Observable<any>;

  /**
   * Extract request information from execution context
   */
  protected getRequestInfo(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    return {
      request,
      response,
      method: normalizeHttpMethod(request.method),
      url: request.url,
      path: request.route?.path || request.url,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      correlationId: this.getOrCreateCorrelationId(request),
      timestamp: new Date().toISOString(),
    };
  }


  /**
   * Get or create correlation ID for request tracking
   */
  protected getOrCreateCorrelationId(request: Request): string {
    const existingId = request.get('x-correlation-id');
    if (existingId) {
      return existingId;
    }

    const correlationId = this.generateCorrelationId();
    request.headers['x-correlation-id'] = correlationId;
    return correlationId;
  }

  /**
   * Generate unique correlation ID
   */
  protected generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if path should be excluded from middleware processing
   */
  protected shouldExcludePath(path: string, excludePaths: string[]): boolean {
    return excludePaths.some(excludePath => {
      if (excludePath.includes('*')) {
        const regex = new RegExp(excludePath.replace(/\*/g, '.*'));
        return regex.test(path);
      }
      return path === excludePath || path.startsWith(excludePath);
    });
  }

  /**
   * Get handler and class names for context
   */
  protected getHandlerInfo(context: ExecutionContext) {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const handlerName = handler.name;
    
    return {
      className,
      handlerName,
      fullName: `${className}.${handlerName}`,
    };
  }
}

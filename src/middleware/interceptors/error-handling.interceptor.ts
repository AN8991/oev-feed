/**
 * Error Handling Interceptor
 * Provides centralized error handling and transformation
 */

import { Injectable, ExecutionContext, CallHandler, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseInterceptor } from './base.interceptor';

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  correlationId?: string;
}

@Injectable()
export class ErrorHandlingInterceptor extends BaseInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestInfo = this.getRequestInfo(context);
    const handlerInfo = this.getHandlerInfo(context);

    return next.handle().pipe(
      catchError((error: any) => {
        const errorResponse = this.transformError(error, requestInfo, handlerInfo);
        
        // Log the error with context
        this.logger.error(
          `Error in ${handlerInfo.fullName}: ${errorResponse.message}`,
          {
            correlationId: requestInfo.correlationId,
            path: requestInfo.path,
            method: requestInfo.method,
            handler: handlerInfo.fullName,
            error: error.stack || error.message,
            statusCode: errorResponse.statusCode,
          },
        );

        // Set response status code
        if (requestInfo.response && !requestInfo.response.headersSent) {
          requestInfo.response.status(errorResponse.statusCode);
        }

        return throwError(() => new HttpException(errorResponse, errorResponse.statusCode));
      }),
    );
  }

  private transformError(error: any, requestInfo: any, handlerInfo: any): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = requestInfo.path;
    const correlationId = requestInfo.correlationId;

    // Handle known HTTP exceptions
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const statusCode = error.getStatus();

      return {
        statusCode,
        message: typeof response === 'string' ? response : (response as any).message,
        error: this.getErrorName(statusCode),
        timestamp,
        path,
        correlationId,
      };
    }

    // Handle validation errors
    if (error.name === 'ValidationError' || error.errors) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: this.extractValidationMessages(error),
        error: 'Bad Request',
        timestamp,
        path,
        correlationId,
      };
    }

    // Handle database errors
    if (this.isDatabaseError(error)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        error: 'Internal Server Error',
        timestamp,
        path,
        correlationId,
      };
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return {
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: 'Request timeout',
        error: 'Request Timeout',
        timestamp,
        path,
        correlationId,
      };
    }

    // Handle circuit breaker errors
    if (error.message?.includes('circuit') || error.name === 'CircuitBreakerOpenError') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        error: 'Service Unavailable',
        timestamp,
        path,
        correlationId,
      };
    }

    // Default error handling
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      error: 'Internal Server Error',
      timestamp,
      path,
      correlationId,
    };
  }

  private getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      408: 'Request Timeout',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return errorNames[statusCode] || 'Unknown Error';
  }

  private extractValidationMessages(error: any): string[] {
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map((err: any) => err.message || err.toString());
    }

    if (error.details && Array.isArray(error.details)) {
      return error.details.map((detail: any) => detail.message || detail.toString());
    }

    return [error.message || 'Validation failed'];
  }

  private isDatabaseError(error: any): boolean {
    const databaseErrorCodes = [
      'ER_DUP_ENTRY',
      'ER_NO_SUCH_TABLE',
      'ER_ACCESS_DENIED_ERROR',
      'ECONNREFUSED',
      'PROTOCOL_CONNECTION_LOST',
    ];

    return (
      databaseErrorCodes.includes(error.code) ||
      error.name === 'QueryFailedError' ||
      error.name === 'ConnectionError' ||
      error.name === 'DatabaseError'
    );
  }
}

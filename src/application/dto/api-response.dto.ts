/**
 * Standardized API Response DTOs for consistent endpoint responses
 * These DTOs provide a uniform structure across all API endpoints
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Base API Response structure
 */
export class BaseApiResponse<T = any> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({ description: 'Error details (only present on errors)', required: false })
  error?: {
    code: string;
    details?: any;
  };

  constructor(success: boolean, statusCode: number, message: string, data?: T, error?: any) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.data = data;
    this.error = error;
  }
}

/**
 * Success Response DTO
 */
export class SuccessResponse<T = any> extends BaseApiResponse<T> {
  constructor(data: T, message: string = 'Request successful', statusCode: number = 200) {
    super(true, statusCode, message, data);
  }
}

/**
 * Error Response DTO
 */
export class ErrorResponse extends BaseApiResponse {
  constructor(message: string, statusCode: number = 500, errorCode?: string, errorDetails?: any) {
    super(false, statusCode, message, undefined, {
      code: errorCode || 'INTERNAL_ERROR',
      details: errorDetails
    });
  }
}

/**
 * Paginated Response DTO
 */
export class PaginatedResponse<T = any> extends BaseApiResponse<T[]> {
  @ApiProperty({ description: 'Pagination metadata' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  constructor(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Request successful'
  ) {
    super(true, 200, message, data);
    
    const totalPages = Math.ceil(total / limit);
    this.pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
}

/**
 * Position Response DTO
 */
export class PositionResponseDto {
  @ApiProperty({ example: '1be9f637-9452-45a1-8cd1-e26b19e17478' })
  id!: string;

  @ApiProperty({ example: '0x79682489385337996edd00eb56b4238b597bfae7' })
  userAddress!: string;

  @ApiProperty({ example: 'aave-v3' })
  protocol!: string;

  @ApiProperty({ example: 'ethereum' })
  network!: string;

  @ApiProperty({ example: 'WETH' })
  assetSymbol!: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  assetAddress!: string;

  @ApiProperty({ example: '0.010077773220238522' })
  collateralAmount!: string;

  @ApiProperty({ example: '37.08' })
  collateralAmountUSD!: string;

  @ApiProperty({ example: '0.002020759752791091' })
  debtAmount!: string;

  @ApiProperty({ example: '7.43' })
  debtAmountUSD!: string;

  @ApiProperty({ example: '4.139310' })
  healthFactor!: string;

  @ApiProperty({ example: '0.8' })
  liquidationThreshold!: string;

  @ApiProperty({ example: '0.5' })
  ltv!: string;

  @ApiProperty({ example: '68.00', required: false })
  riskScore?: string;

  @ApiProperty({ example: 'MEDIUM', required: false })
  riskLevel?: string;

  @ApiProperty({ example: '2025-09-20T01:30:00.000Z', required: false })
  riskAssessedAt?: Date;

  @ApiProperty({ example: '2025-09-20T01:30:00.000Z' })
  lastUpdated!: Date;
}

/**
 * Provider Response DTO
 */
export class ProviderResponseDto {
  @ApiProperty({ example: 'infura-mainnet' })
  id!: string;

  @ApiProperty({ example: 'Infura Mainnet' })
  name!: string;

  @ApiProperty({ example: 'https://mainnet.infura.io/v3/...' })
  url!: string;

  @ApiProperty({ example: 'ethereum' })
  network!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 95 })
  healthScore!: number;

  @ApiProperty({ example: 120 })
  responseTime!: number;

  @ApiProperty({ example: 'healthy' })
  status!: string;

  @ApiProperty({ example: '2025-09-20T01:30:00.000Z' })
  lastChecked!: Date;
}

/**
 * Event Response DTO
 */
export class EventResponseDto {
  @ApiProperty({ example: 'evt_1234567890' })
  id!: string;

  @ApiProperty({ example: 'liquidation' })
  eventType!: string;

  @ApiProperty({ example: '0x79682489385337996edd00eb56b4238b597bfae7' })
  userAddress!: string;

  @ApiProperty({ example: 'aave-v3' })
  protocol!: string;

  @ApiProperty({ example: 'ethereum' })
  network!: string;

  @ApiProperty({ example: 'WETH' })
  assetSymbol!: string;

  @ApiProperty({ example: '1.5' })
  amount!: string;

  @ApiProperty({ example: '2025-09-20T01:30:00.000Z' })
  timestamp!: Date;

  @ApiProperty({ example: 23400981 })
  blockNumber!: number;

  @ApiProperty({ example: '0xabc123...' })
  transactionHash!: string;
}

/**
 * Batch Operation Response DTO
 */
export class BatchOperationResponseDto {
  @ApiProperty({ example: 'Positions fetched and saved successfully' })
  message!: string;

  @ApiProperty({ example: 2 })
  processedItems!: number;

  @ApiProperty({ example: 5 })
  totalResults!: number;

  @ApiProperty({ example: 0 })
  failedItems!: number;

  @ApiProperty({ example: '2025-09-20T01:30:00.000Z' })
  completedAt!: string;

  @ApiProperty({ required: false })
  errors?: string[];
}

/**
 * Risk Assessment Response DTO
 */
export class RiskAssessmentResponseDto {
  @ApiProperty({ example: '0x79682489385337996edd00eb56b4238b597bfae7' })
  userAddress!: string;

  @ApiProperty({ example: 'aave-v3' })
  protocol!: string;

  @ApiProperty({ example: 'ethereum' })
  network!: string;

  @ApiProperty({ example: 68 })
  riskScore!: number;

  @ApiProperty({ example: 'MEDIUM', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  riskLevel!: string;

  @ApiProperty({ example: '4.139310' })
  healthFactor!: string;

  @ApiProperty({ example: 2 })
  alertCount!: number;

  @ApiProperty({ 
    example: [
      { level: 'INFO', message: 'LTV utilization is moderate' },
      { level: 'WARNING', message: 'Portfolio is highly concentrated in few assets' }
    ]
  })
  alerts!: Array<{
    level: string;
    message: string;
  }>;

  @ApiProperty({ example: '2025-09-21T02:54:14.884Z' })
  assessedAt!: Date;
}

/**
 * Health Check Response DTO
 */
export class HealthCheckResponseDto {
  @ApiProperty({ example: 'healthy' })
  status!: string;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: '2025-09-21T08:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 1234 })
  uptime!: number;

  @ApiProperty({
    example: {
      database: 'healthy',
      providers: 'healthy',
      middleware: 'healthy'
    }
  })
  services!: Record<string, string>;
}

/**
 * Validation Error Response DTO
 */
export class ValidationErrorResponseDto extends ErrorResponse {
  @ApiProperty({
    example: [
      { field: 'userAddress', message: 'Invalid Ethereum address format' },
      { field: 'protocol', message: 'Protocol is required' }
    ]
  })
  validationErrors!: Array<{
    field: string;
    message: string;
  }>;

  constructor(validationErrors: Array<{ field: string; message: string }>) {
    super('Validation failed', 400, 'VALIDATION_ERROR', validationErrors);
    this.validationErrors = validationErrors;
  }
}

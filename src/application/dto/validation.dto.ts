/**
 * Input Validation DTOs with comprehensive validation rules
 * These DTOs provide robust input validation for all API endpoints
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsEthereumAddress, IsOptional, IsNumber, Min, Max, IsEnum, IsBoolean, ArrayMinSize, ArrayMaxSize, Matches, Length, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Ethereum Address Validation DTO
 */
export class EthereumAddressDto {
  @ApiProperty({ 
    description: 'Ethereum wallet address',
    example: '0x79682489385337996edd00eb56b4238b597bfae7',
    pattern: '^0x[a-fA-F0-9]{40}$'
  })
  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address cannot be empty' })
  @IsEthereumAddress({ message: 'Invalid Ethereum address format' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Address must be a valid 40-character hexadecimal string starting with 0x' })
  address!: string;
}

/**
 * Batch Fetch Positions Request DTO
 */
export class FetchPositionsDto {
  @ApiProperty({ 
    description: 'Array of Ethereum wallet addresses to fetch positions for',
    example: ['0x79682489385337996edd00eb56b4238b597bfae7', '0x1234567890123456789012345678901234567890'],
    type: [String],
    minItems: 1,
    maxItems: 50
  })
  @IsArray({ message: 'userAddresses must be an array' })
  @ArrayMinSize(1, { message: 'At least one address is required' })
  @ArrayMaxSize(50, { message: 'Maximum 50 addresses allowed per request' })
  @IsEthereumAddress({ each: true, message: 'Each address must be a valid Ethereum address' })
  userAddresses!: string[];
}

/**
 * Pagination Query DTO
 */
export class PaginationDto {
  @ApiProperty({ 
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit: number = 20;
}

/**
 * Position Filtering DTO
 */
export enum ProtocolEnum {
  AAVE_V2 = 'aave-v2',
  AAVE_V3 = 'aave-v3',
  COMPOUND = 'compound',
  SILO = 'silo'
}

export enum NetworkEnum {
  ETHEREUM = 'ethereum',
  BASE = 'base',
  ARBITRUM = 'arbitrum',
  POLYGON = 'polygon'
}

export enum RiskLevelEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum SortOrderEnum {
  ASC = 'ASC',
  DESC = 'DESC'
}

export class PositionFilterDto extends PaginationDto {
  @ApiProperty({ 
    description: 'Filter by protocol',
    enum: ProtocolEnum,
    required: false
  })
  @IsOptional()
  @IsEnum(ProtocolEnum, { message: 'Protocol must be one of: aave-v2, aave-v3, compound, silo' })
  protocol?: ProtocolEnum;

  @ApiProperty({ 
    description: 'Filter by network',
    enum: NetworkEnum,
    required: false
  })
  @IsOptional()
  @IsEnum(NetworkEnum, { message: 'Network must be one of: ethereum, base, arbitrum, polygon' })
  network?: NetworkEnum;

  @ApiProperty({ 
    description: 'Filter by asset symbol',
    example: 'WETH',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Asset symbol must be a string' })
  @Length(1, 10, { message: 'Asset symbol must be between 1 and 10 characters' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Asset symbol must contain only uppercase letters and numbers' })
  assetSymbol?: string;

  @ApiProperty({ 
    description: 'Filter by risk level',
    enum: RiskLevelEnum,
    required: false
  })
  @IsOptional()
  @IsEnum(RiskLevelEnum, { message: 'Risk level must be one of: LOW, MEDIUM, HIGH, CRITICAL' })
  riskLevel?: RiskLevelEnum;

  @ApiProperty({ 
    description: 'Filter by minimum health factor',
    example: 1.5,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Minimum health factor must be a number' })
  @Min(0, { message: 'Minimum health factor must be non-negative' })
  minHealthFactor?: number;

  @ApiProperty({ 
    description: 'Filter by maximum health factor',
    example: 10.0,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Maximum health factor must be a number' })
  @Min(0, { message: 'Maximum health factor must be non-negative' })
  maxHealthFactor?: number;

  @ApiProperty({ 
    description: 'Sort field',
    example: 'healthFactor',
    enum: ['userAddress', 'protocol', 'network', 'assetSymbol', 'healthFactor', 'riskScore', 'lastUpdated'],
    required: false,
    default: 'lastUpdated'
  })
  @IsOptional()
  @IsEnum(['userAddress', 'protocol', 'network', 'assetSymbol', 'healthFactor', 'riskScore', 'lastUpdated'], 
    { message: 'Sort field must be one of: userAddress, protocol, network, assetSymbol, healthFactor, riskScore, lastUpdated' })
  sortBy: string = 'lastUpdated';

  @ApiProperty({ 
    description: 'Sort order',
    enum: SortOrderEnum,
    required: false,
    default: SortOrderEnum.DESC
  })
  @IsOptional()
  @IsEnum(SortOrderEnum, { message: 'Sort order must be ASC or DESC' })
  sortOrder: SortOrderEnum = SortOrderEnum.DESC;

  @ApiProperty({ 
    description: 'Include positions with risk assessment data only',
    example: false,
    required: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'withRiskData must be a boolean' })
  withRiskData: boolean = false;
}

/**
 * Provider Filter DTO
 */
export class ProviderFilterDto extends PaginationDto {
  @ApiProperty({ 
    description: 'Filter by network',
    enum: NetworkEnum,
    required: false
  })
  @IsOptional()
  @IsEnum(NetworkEnum, { message: 'Network must be one of: ethereum, base, arbitrum, polygon' })
  network?: NetworkEnum;

  @ApiProperty({ 
    description: 'Filter by active status',
    example: true,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Filter by minimum health score',
    example: 80,
    minimum: 0,
    maximum: 100,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Minimum health score must be a number' })
  @Min(0, { message: 'Minimum health score must be at least 0' })
  @Max(100, { message: 'Minimum health score cannot exceed 100' })
  minHealthScore?: number;
}

/**
 * Risk Assessment Query DTO
 */
export class RiskAssessmentQueryDto {
  @ApiProperty({ 
    description: 'Include detailed risk breakdown',
    example: false,
    required: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'includeBreakdown must be a boolean' })
  includeBreakdown: boolean = false;

  @ApiProperty({ 
    description: 'Include risk alerts',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'includeAlerts must be a boolean' })
  includeAlerts: boolean = true;

  @ApiProperty({ 
    description: 'Include historical risk data',
    example: false,
    required: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'includeHistory must be a boolean' })
  includeHistory: boolean = false;
}

import { Controller, Get, Post, Param, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RiskAnalysisService } from '../../../../application/services/risk-analysis.service';
import { PositionsService } from '../../../../application/services/positions.service';
import { RiskAssessmentService } from '../../../../application/services/risk-assessment.service';
import { RiskAssessmentModel, RiskLevel } from '../../../../domain/models/risk.model';

@ApiTags('Risk Assessment')
@Controller('risk-assessment')
export class RiskAssessmentController {
  constructor(
    private readonly riskAnalysisService: RiskAnalysisService,
    private readonly positionsService: PositionsService,
    private readonly riskAssessmentService: RiskAssessmentService,
  ) {}

  /**
   * Get comprehensive risk assessment for a user address
   * GET /api/v1.0.0/risk-assessment/user/:address
   */
  @Get('user/:address')
  @ApiOperation({ 
    summary: 'Get user risk assessment',
    description: 'Retrieve comprehensive risk assessment for all positions of a user address'
  })
  @ApiParam({ 
    name: 'address', 
    description: 'Ethereum wallet address (0x...)',
    example: '0x79682489385337996edd00eb56b4238b597bfae7'
  })
  @ApiQuery({ 
    name: 'protocol', 
    required: false, 
    description: 'Filter by protocol (aave-v2, aave-v3)',
    example: 'aave-v3'
  })
  @ApiQuery({ 
    name: 'network', 
    required: false, 
    description: 'Filter by network (ethereum, arbitrum, base)',
    example: 'ethereum'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Risk assessment data for user positions',
    type: [Object]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid wallet address format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'No positions found for address' 
  })
  async getUserRiskAssessment(
    @Param('address') address: string,
    @Query('protocol') protocol?: string,
    @Query('network') network?: string
  ): Promise<RiskAssessmentModel[]> {
    if (!this.isValidAddress(address)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    try {
      return await this.riskAssessmentService.calculateUserRiskAssessments(address);
    } catch (error) {
      throw new NotFoundException(`No positions found for address: ${address}`);
    }
  }

  /**
   * Get risk assessment for a specific position
   * GET /api/v1.0.0/risk-assessment/position/:id
   */
  @Get('position/:id')
  @ApiOperation({ 
    summary: 'Get position risk assessment',
    description: 'Retrieve detailed risk assessment for a specific position'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Position ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Risk assessment data for the position',
    type: Object
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Position not found' 
  })
  async getPositionRiskAssessment(@Param('id') positionId: string): Promise<RiskAssessmentModel> {
    try {
      return await this.riskAnalysisService.getPositionRiskAssessment(positionId);
    } catch (error) {
      throw new NotFoundException(`Position not found: ${positionId}`);
    }
  }

  /**
   * Get all positions at specified risk level
   * GET /api/v1.0.0/risk-assessment/positions/at-risk?level=HIGH
   */
  @Get('positions/at-risk')
  @ApiOperation({ 
    summary: 'Get positions at risk',
    description: 'Retrieve all positions at specified risk level'
  })
  @ApiQuery({ 
    name: 'level', 
    required: false, 
    description: 'Risk level filter',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH'
  })
  @ApiQuery({ 
    name: 'protocol', 
    required: false, 
    description: 'Filter by protocol',
    example: 'aave-v3'
  })
  @ApiQuery({ 
    name: 'network', 
    required: false, 
    description: 'Filter by network',
    example: 'ethereum'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of positions at specified risk level',
    type: [Object]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid risk level' 
  })
  async getPositionsAtRisk(
    @Query('level') riskLevel?: RiskLevel,
    @Query('protocol') protocol?: string,
    @Query('network') network?: string,
    @Query('healthFactorThreshold') healthFactorThreshold?: number,
    @Query('limit') limit?: number
  ): Promise<RiskAssessmentModel[]> {
    const threshold = healthFactorThreshold || 1.2;
    const maxResults = limit || 50;
    
    try {
      return await this.riskAssessmentService.getPositionsAtRisk(threshold, maxResults);
    } catch (error) {
      throw new BadRequestException('Error retrieving positions at risk');
    }
  }

  /**
   * Get positions requiring immediate attention (CRITICAL risk)
   * GET /api/v1.0.0/risk-assessment/positions/critical
   */
  @Get('positions/critical')
  @ApiOperation({ 
    summary: 'Get critical risk positions',
    description: 'Retrieve all positions with CRITICAL risk level requiring immediate attention'
  })
  @ApiQuery({ 
    name: 'protocol', 
    required: false, 
    description: 'Filter by protocol',
    example: 'aave-v3'
  })
  @ApiQuery({ 
    name: 'network', 
    required: false, 
    description: 'Filter by network',
    example: 'ethereum'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of critical risk positions',
    type: [Object]
  })
  async getCriticalPositions(
    @Query('protocol') protocol?: string,
    @Query('network') network?: string
  ): Promise<RiskAssessmentModel[]> {
    return await this.riskAnalysisService.getPositionsAtRisk('CRITICAL', protocol, network);
  }

  /**
   * Get risk summary statistics
   * GET /api/v1.0.0/risk-assessment/summary
   */
  @Get('summary')
  @ApiOperation({ 
    summary: 'Get risk summary statistics',
    description: 'Retrieve portfolio-wide risk statistics and distribution'
  })
  @ApiQuery({ 
    name: 'protocol', 
    required: false, 
    description: 'Filter by protocol',
    example: 'aave-v3'
  })
  @ApiQuery({ 
    name: 'network', 
    required: false, 
    description: 'Filter by network',
    example: 'ethereum'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Risk summary statistics',
    schema: {
      type: 'object',
      properties: {
        totalPositions: { type: 'number', example: 150 },
        riskDistribution: {
          type: 'object',
          properties: {
            LOW: { type: 'number', example: 80 },
            MEDIUM: { type: 'number', example: 45 },
            HIGH: { type: 'number', example: 20 },
            CRITICAL: { type: 'number', example: 5 }
          }
        },
        averageHealthFactor: { type: 'number', example: 2.45 },
        totalValueAtRisk: { type: 'string', example: '1250000.00' },
        criticalAlerts: { type: 'number', example: 12 }
      }
    }
  })
  async getRiskSummary(
    @Query('protocol') protocol?: string,
    @Query('network') network?: string
  ): Promise<{
    totalPositions: number;
    riskDistribution: Record<RiskLevel, number>;
    averageHealthFactor: number;
    totalValueAtRisk: string;
    criticalAlerts: number;
  }> {
    return await this.riskAnalysisService.getRiskSummary(protocol, network);
  }

  /**
   * Refresh risk assessment for a user (force recalculation)
   * POST /api/v1.0.0/risk-assessment/refresh
   */
  @Post('refresh')
  @ApiOperation({ 
    summary: 'Refresh risk assessment',
    description: 'Force recalculation of risk assessment for a user'
  })
  @ApiBody({
    description: 'User address and optional filters',
    schema: {
      type: 'object',
      required: ['userAddress'],
      properties: {
        userAddress: { 
          type: 'string', 
          example: '0x79682489385337996edd00eb56b4238b597bfae7',
          description: 'Ethereum wallet address'
        },
        protocol: { 
          type: 'string', 
          example: 'aave-v3',
          description: 'Optional protocol filter'
        },
        network: { 
          type: 'string', 
          example: 'ethereum',
          description: 'Optional network filter'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Updated risk assessment data',
    type: [Object]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid wallet address format' 
  })
  async refreshRiskAssessment(
    @Body() body: { userAddress: string; protocol?: string; network?: string }
  ): Promise<RiskAssessmentModel[]> {
    const { userAddress, protocol, network } = body;
    
    if (!this.isValidAddress(userAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    return await this.riskAnalysisService.refreshUserRiskAssessment(
      userAddress, 
      protocol, 
      network
    );
  }

  /**
   * Get risk alerts for a user
   * GET /api/v1.0.0/risk-assessment/alerts/:address
   */
  @Get('alerts/:address')
  @ApiOperation({ 
    summary: 'Get user risk alerts',
    description: 'Retrieve risk alerts for a specific user address'
  })
  @ApiParam({ 
    name: 'address', 
    description: 'Ethereum wallet address',
    example: '0x79682489385337996edd00eb56b4238b597bfae7'
  })
  @ApiQuery({ 
    name: 'severity', 
    required: false, 
    description: 'Filter by alert severity',
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    example: 'CRITICAL'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of risk alerts for the user',
    type: [Object]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid wallet address format' 
  })
  async getUserRiskAlerts(
    @Param('address') address: string,
    @Query('severity') severity?: 'INFO' | 'WARNING' | 'CRITICAL'
  ) {
    if (!this.isValidAddress(address)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    return await this.riskAnalysisService.getUserRiskAlerts(address, severity);
  }

  /**
   * Validate Ethereum address format
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

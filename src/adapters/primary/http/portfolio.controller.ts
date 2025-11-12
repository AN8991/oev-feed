import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PositionsService } from '@/application/services/positions.service';
import { RiskAssessmentService } from '@/application/services/risk-assessment.service';

interface PortfolioSummaryResponse {
  totalCollateralUSD: number;
  totalDebtUSD: number;
  overallHealthFactor: number;
  activePositionsCount: number;
  collateralChange24h: number;
  debtChange24h: number;
  healthFactorTrend: 'up' | 'down' | 'stable';
  protocolDistribution: Record<string, number>;
  networkDistribution: Record<string, number>;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly positionsService: PositionsService,
    private readonly riskAssessmentService: RiskAssessmentService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get portfolio summary for a wallet address' })
  @ApiQuery({ name: 'walletAddress', required: true, description: 'Ethereum wallet address' })
  @ApiResponse({ status: 200, description: 'Portfolio summary retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid wallet address' })
  async getSummary(
    @Query('walletAddress') walletAddress: string,
  ): Promise<PortfolioSummaryResponse> {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      throw new HttpException('Invalid wallet address', HttpStatus.BAD_REQUEST);
    }

    try {
      // Fetch all positions for the user
      const positions = await this.positionsService.getPositionsByUser(walletAddress);

      if (!positions || positions.length === 0) {
        return this.getEmptyPortfolioSummary();
      }

      // Calculate total collateral and debt
      let totalCollateralUSD = 0;
      let totalDebtUSD = 0;
      let totalHealthFactor = 0;
      let healthFactorCount = 0;

      const protocolDistribution: Record<string, number> = {};
      const networkDistribution: Record<string, number> = {};
      const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

      for (const position of positions) {
        // Sum collateral and debt
        totalCollateralUSD += Number(position.collateralAmountUSD) || 0;
        totalDebtUSD += Number(position.debtAmountUSD) || 0;

        // Calculate average health factor
        const healthFactorNum = Number(position.healthFactor);
        if (position.healthFactor && healthFactorNum > 0) {
          totalHealthFactor += healthFactorNum;
          healthFactorCount++;
        }

        // Protocol distribution
        const protocol = position.protocol || 'unknown';
        protocolDistribution[protocol] = (protocolDistribution[protocol] || 0) + Number(position.collateralAmountUSD);

        // Network distribution
        const network = position.network || 'unknown';
        networkDistribution[network] = (networkDistribution[network] || 0) + Number(position.collateralAmountUSD);

        // Risk distribution
        const riskLevel = position.riskLevel?.toLowerCase() || 'medium';
        if (riskLevel === 'low') riskDistribution.low++;
        else if (riskLevel === 'medium') riskDistribution.medium++;
        else if (riskLevel === 'high') riskDistribution.high++;
        else if (riskLevel === 'critical') riskDistribution.critical++;
      }

      const overallHealthFactor = healthFactorCount > 0 ? totalHealthFactor / healthFactorCount : 0;

      // TODO: Calculate 24h changes from historical data
      // For now, return mock values
      const collateralChange24h = 0;
      const debtChange24h = 0;
      const healthFactorTrend: 'up' | 'down' | 'stable' = 'stable';

      return {
        totalCollateralUSD,
        totalDebtUSD,
        overallHealthFactor,
        activePositionsCount: positions.length,
        collateralChange24h,
        debtChange24h,
        healthFactorTrend,
        protocolDistribution,
        networkDistribution,
        riskDistribution,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to fetch portfolio summary: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getEmptyPortfolioSummary(): PortfolioSummaryResponse {
    return {
      totalCollateralUSD: 0,
      totalDebtUSD: 0,
      overallHealthFactor: 0,
      activePositionsCount: 0,
      collateralChange24h: 0,
      debtChange24h: 0,
      healthFactorTrend: 'stable',
      protocolDistribution: {},
      networkDistribution: {},
      riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
    };
  }
}

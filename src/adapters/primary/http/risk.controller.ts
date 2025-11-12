import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RiskAssessmentService } from '@/application/services/risk-assessment.service';
import { PositionsService } from '@/application/services/positions.service';

interface HealthFactorPoint {
  timestamp: string;
  value: number;
}

interface RiskAssessmentResponse {
  compositeRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  healthFactorHistory: HealthFactorPoint[];
  ltvAnalysis: {
    currentLTV: number;
    maxLTV: number;
    utilizationPercentage: number;
  };
  liquidationDistance: {
    overallPercentage: number;
    topRiskyAssets: Array<{
      symbol: string;
      priceDropNeeded: number;
    }>;
  };
  assetConcentration: {
    hhiScore: number;
    diversificationRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    topConcentratedAssets: Array<{
      symbol: string;
      percentage: number;
    }>;
  };
  alerts: Array<{
    id: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    type: string;
    message: string;
    affectedPosition: string;
    recommendedAction: string;
    timestamp: string;
  }>;
}

@ApiTags('Risk Assessment')
@Controller('risk')
export class RiskController {
  constructor(
    private readonly riskAssessmentService: RiskAssessmentService,
    private readonly positionsService: PositionsService,
  ) {}

  @Get('assessment')
  @ApiOperation({ summary: 'Get risk assessment for a wallet address' })
  @ApiQuery({ name: 'walletAddress', required: true, description: 'Ethereum wallet address' })
  @ApiResponse({ status: 200, description: 'Risk assessment retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid wallet address' })
  async getAssessment(
    @Query('walletAddress') walletAddress: string,
  ): Promise<RiskAssessmentResponse> {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      throw new HttpException('Invalid wallet address', HttpStatus.BAD_REQUEST);
    }

    try {
      // Fetch all positions for the user
      const positions = await this.positionsService.getPositionsByUser(walletAddress);

      if (!positions || positions.length === 0) {
        return this.getEmptyRiskAssessment();
      }

      // Calculate composite risk score (average of all position risk scores)
      let totalRiskScore = 0;
      let riskScoreCount = 0;
      let totalLTV = 0;
      let maxLTV = 0;
      let ltvCount = 0;

      const assetValues: Record<string, number> = {};
      let totalAssetValue = 0;

      for (const position of positions) {
        if (position.riskScore) {
          totalRiskScore += Number(position.riskScore);
          riskScoreCount++;
        }

        if (position.ltv) {
          // Convert from basis points to percentage (9000 basis points = 90%)
          const ltvNum = Number(position.ltv) / 100;
          totalLTV += ltvNum;
          ltvCount++;
          if (ltvNum > maxLTV) maxLTV = ltvNum;
        }

        // Asset concentration calculation
        const assetValue = Number(position.collateralAmountUSD) || 0;
        assetValues[position.assetSymbol] = (assetValues[position.assetSymbol] || 0) + assetValue;
        totalAssetValue += assetValue;
      }

      const compositeRiskScore = riskScoreCount > 0 ? totalRiskScore / riskScoreCount : 50;
      const riskLevel = this.getRiskLevel(compositeRiskScore);

      // LTV Analysis
      const currentLTV = ltvCount > 0 ? totalLTV / ltvCount : 0;
      const utilizationPercentage = maxLTV > 0 ? (currentLTV / maxLTV) * 100 : 0;

      // Asset Concentration (HHI calculation)
      let hhiScore = 0;
      const assetPercentages: Array<{ symbol: string; percentage: number }> = [];

      if (totalAssetValue > 0) {
        for (const [symbol, value] of Object.entries(assetValues)) {
          const percentage = (value / totalAssetValue) * 100;
          assetPercentages.push({ symbol, percentage });
          hhiScore += percentage * percentage;
        }
      }

      assetPercentages.sort((a, b) => b.percentage - a.percentage);
      const topConcentratedAssets = assetPercentages.slice(0, 3);
      const diversificationRating = this.getDiversificationRating(hhiScore);

      // Generate health factor history (mock data for now - TODO: implement historical tracking)
      const healthFactorHistory = this.generateMockHealthFactorHistory(positions);

      // Calculate liquidation distance
      const liquidationDistance = this.calculateLiquidationDistance(positions);

      // Generate alerts
      const alerts = this.generateAlerts(positions, compositeRiskScore, currentLTV);

      return {
        compositeRiskScore: Math.round(compositeRiskScore * 100) / 100,
        riskLevel,
        healthFactorHistory,
        ltvAnalysis: {
          currentLTV: Math.round(currentLTV * 100) / 100,
          maxLTV: Math.round(maxLTV * 100) / 100,
          utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        },
        liquidationDistance,
        assetConcentration: {
          hhiScore: Math.round(hhiScore * 100) / 100,
          diversificationRating,
          topConcentratedAssets,
        },
        alerts,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to fetch risk assessment: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'CRITICAL';
  }

  private getDiversificationRating(hhiScore: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (hhiScore < 1500) return 'EXCELLENT';
    if (hhiScore < 2500) return 'GOOD';
    if (hhiScore < 5000) return 'FAIR';
    return 'POOR';
  }

  private generateMockHealthFactorHistory(positions: any[]): HealthFactorPoint[] {
    // TODO: Implement actual historical tracking
    // For now, generate 7 days of mock data based on current health factor
    const avgHealthFactor = positions.reduce((sum, p) => sum + Number(p.healthFactor || 0), 0) / positions.length;
    const history: HealthFactorPoint[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
      history.push({
        timestamp: date.toISOString(),
        value: Math.max(0, avgHealthFactor + variance),
      });
    }

    return history;
  }

  private calculateLiquidationDistance(positions: any[]): any {
    const riskyAssets: Array<{ symbol: string; priceDropNeeded: number }> = [];

    for (const position of positions) {
      const healthFactor = Number(position.healthFactor);
      if (healthFactor > 0 && healthFactor < 2) {
        // Simplified calculation: (healthFactor - 1) * 100
        const priceDropNeeded = Math.max(0, (healthFactor - 1) * 100);
        riskyAssets.push({
          symbol: position.assetSymbol,
          priceDropNeeded: Math.round(priceDropNeeded * 100) / 100,
        });
      }
    }

    riskyAssets.sort((a, b) => a.priceDropNeeded - b.priceDropNeeded);

    const overallPercentage = riskyAssets.length > 0
      ? riskyAssets.reduce((sum, a) => sum + a.priceDropNeeded, 0) / riskyAssets.length
      : 100;

    return {
      overallPercentage: Math.round(overallPercentage * 100) / 100,
      topRiskyAssets: riskyAssets.slice(0, 3),
    };
  }

  private generateAlerts(positions: any[], riskScore: number, ltv: number): any[] {
    const alerts: any[] = [];

    // Critical health factor alert
    const criticalPositions = positions.filter(p => Number(p.healthFactor) < 1.2);
    if (criticalPositions.length > 0) {
      alerts.push({
        id: `alert-${Date.now()}-1`,
        severity: 'CRITICAL',
        type: 'Low Health Factor',
        message: `${criticalPositions.length} position(s) have health factor below 1.2`,
        affectedPosition: criticalPositions.map(p => p.assetSymbol).join(', '),
        recommendedAction: 'Add more collateral or repay debt immediately',
        timestamp: new Date().toISOString(),
      });
    }

    // High LTV warning
    if (ltv > 75) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        severity: 'WARNING',
        type: 'High LTV Ratio',
        message: `Your average LTV is ${ltv.toFixed(2)}%, approaching maximum`,
        affectedPosition: 'All positions',
        recommendedAction: 'Consider reducing debt or adding collateral',
        timestamp: new Date().toISOString(),
      });
    }

    // Risk score alert
    if (riskScore < 50) {
      alerts.push({
        id: `alert-${Date.now()}-3`,
        severity: 'WARNING',
        type: 'High Risk Score',
        message: `Your composite risk score is ${riskScore.toFixed(2)}`,
        affectedPosition: 'Portfolio',
        recommendedAction: 'Review your positions and consider risk mitigation',
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  private getEmptyRiskAssessment(): RiskAssessmentResponse {
    return {
      compositeRiskScore: 0,
      riskLevel: 'LOW',
      healthFactorHistory: [],
      ltvAnalysis: {
        currentLTV: 0,
        maxLTV: 0,
        utilizationPercentage: 0,
      },
      liquidationDistance: {
        overallPercentage: 100,
        topRiskyAssets: [],
      },
      assetConcentration: {
        hhiScore: 0,
        diversificationRating: 'EXCELLENT',
        topConcentratedAssets: [],
      },
      alerts: [],
    };
  }
}

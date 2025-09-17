/*
 * File: risk.model.ts
 * Description: Domain model representing risk parameters and calculations for positions.
 * Layer: Domain
 */

// Domain model for Risk Assessment - Protocol-agnostic representation
export interface RiskAssessmentModel {
  // Core identifiers
  userAddress: string;
  protocol: string;
  network: string;
  positionId: string;
  
  // Asset composition
  suppliedAssets: AssetPosition[];
  borrowedAssets: AssetPosition[];
  
  // Core risk metrics (from existing data)
  healthFactor: string;
  liquidationThreshold: string;
  currentLTV: string;
  
  // Portfolio totals
  totalCollateralUSD: string;
  totalDebtUSD: string;
  
  // Calculated risk indicators
  riskLevel: RiskLevel;
  compositeRiskScore: number;        // 0-100 weighted score
  liquidationDistance: string;       // Percentage price drop to liquidation
  
  // Individual metric scores (for transparency)
  healthFactorScore: number;
  ltvScore: number;
  thresholdScore: number;
  concentrationScore: number;
  
  // Risk warnings and alerts
  riskAlerts: RiskAlert[];
  
  // Timestamps
  lastUpdated: string;
  assessmentTimestamp: string;
}

export interface AssetPosition {
  symbol: string;
  address: string;
  amount: string;
  valueUSD: string;
  valueETH?: string;
  percentage?: number;  // Percentage of total portfolio
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAlert {
  type: 'LIQUIDATION_WARNING' | 'HIGH_CONCENTRATION' | 'LOW_HEALTH_FACTOR' | 'HIGH_LTV';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  threshold?: string;
  currentValue?: string;
}

// Risk calculation utilities
export class RiskCalculator {
  
  /**
   * Calculate health factor score (0-100)
   */
  static calculateHealthFactorScore(healthFactor: string): number {
    const hf = parseFloat(healthFactor);
    
    if (hf >= 3.0) return 100;      // Very safe
    if (hf >= 2.0) return 80;       // Safe
    if (hf >= 1.5) return 60;       // Moderate risk
    if (hf >= 1.2) return 40;       // High risk
    if (hf >= 1.05) return 20;      // Very high risk
    return 0;                       // Critical/liquidatable
  }
  
  /**
   * Calculate LTV utilization score (0-100)
   */
  static calculateLTVScore(currentLTV: string, liquidationThreshold: string): number {
    const ltv = parseFloat(currentLTV) / 100;
    const threshold = parseFloat(liquidationThreshold) / 100;
    
    const utilizationRatio = ltv / threshold;
    
    if (utilizationRatio <= 0.5) return 100;    // <50% utilization
    if (utilizationRatio <= 0.7) return 80;     // 50-70% utilization
    if (utilizationRatio <= 0.85) return 60;    // 70-85% utilization
    if (utilizationRatio <= 0.95) return 40;    // 85-95% utilization
    if (utilizationRatio <= 0.98) return 20;    // 95-98% utilization
    return 0;                                    // >98% utilization
  }
  
  /**
   * Calculate liquidation threshold quality score (0-100)
   */
  static calculateThresholdScore(liquidationThreshold: string): number {
    const threshold = parseFloat(liquidationThreshold) / 100;
    
    if (threshold >= 0.85) return 100;     // High-quality collateral (85%+)
    if (threshold >= 0.80) return 80;      // Good collateral (80-85%)
    if (threshold >= 0.75) return 60;      // Moderate collateral (75-80%)
    if (threshold >= 0.70) return 40;      // Lower quality (70-75%)
    if (threshold >= 0.60) return 20;      // Risky collateral (60-70%)
    return 0;                              // Very risky (<60%)
  }
  
  /**
   * Calculate asset concentration score using Herfindahl-Hirschman Index (0-100)
   */
  static calculateConcentrationScore(suppliedAssets: AssetPosition[]): number {
    if (suppliedAssets.length === 0) return 0;
    
    // Calculate total portfolio value
    const totalValue = suppliedAssets.reduce((sum, asset) => 
      sum + parseFloat(asset.valueUSD || '0'), 0);
    
    if (totalValue === 0) return 0;
    
    // Calculate Herfindahl-Hirschman Index for concentration
    const hhi = suppliedAssets.reduce((sum, asset) => {
      const share = parseFloat(asset.valueUSD || '0') / totalValue;
      return sum + (share * share);
    }, 0);
    
    if (hhi <= 0.25) return 100;      // Well diversified (4+ equal assets)
    if (hhi <= 0.50) return 80;       // Moderately diversified
    if (hhi <= 0.75) return 60;       // Some concentration
    if (hhi <= 0.90) return 40;       // High concentration
    return 20;                        // Single asset dominance
  }
  
  /**
   * Calculate composite risk score using weighted methodology
   */
  static calculateCompositeRiskScore(
    healthFactor: string,
    currentLTV: string,
    liquidationThreshold: string,
    suppliedAssets: AssetPosition[]
  ): number {
    const healthScore = this.calculateHealthFactorScore(healthFactor);
    const ltvScore = this.calculateLTVScore(currentLTV, liquidationThreshold);
    const thresholdScore = this.calculateThresholdScore(liquidationThreshold);
    const concentrationScore = this.calculateConcentrationScore(suppliedAssets);
    
    // Weighted scoring: HF(40%) + LTV(30%) + Threshold(20%) + Concentration(10%)
    return (
      healthScore * 0.40 +
      ltvScore * 0.30 +
      thresholdScore * 0.20 +
      concentrationScore * 0.10
    );
  }
  
  /**
   * Determine risk level from composite score
   */
  static determineRiskLevel(compositeScore: number): RiskLevel {
    if (compositeScore >= 80) return 'LOW';        // 80-100: Safe positions
    if (compositeScore >= 60) return 'MEDIUM';     // 60-79: Moderate risk
    if (compositeScore >= 40) return 'HIGH';       // 40-59: High risk
    return 'CRITICAL';                             // 0-39: Liquidation risk
  }
  
  /**
   * Calculate percentage price drop needed for liquidation
   */
  static calculateLiquidationDistance(
    healthFactor: string,
    currentLTV: string,
    liquidationThreshold: string,
    totalCollateralUSD: string,
    totalDebtUSD: string
  ): string {
    const hf = parseFloat(healthFactor);
    const threshold = parseFloat(liquidationThreshold) / 100;
    const collateral = parseFloat(totalCollateralUSD);
    const debt = parseFloat(totalDebtUSD);
    
    if (collateral === 0 || debt === 0 || hf <= 1) return '0.00';
    
    // Correct calculation: Price drop needed for liquidation
    // Health Factor = (Collateral * Liquidation Threshold) / Debt
    // At liquidation: HF = 1, so: (Collateral_new * threshold) = debt
    // Therefore: Collateral_new = debt / threshold
    // Price drop percentage = (Collateral - Collateral_new) / Collateral * 100
    
    // But we need to account for the current health factor
    // More accurate: liquidation occurs when HF drops to 1
    // Current: HF = (collateral * threshold) / debt
    // At liquidation: 1 = (collateral * (1 - price_drop) * threshold) / debt
    // Solving: price_drop = 1 - (debt / (collateral * threshold))
    // But since HF = (collateral * threshold) / debt, we get:
    // price_drop = 1 - (1 / HF) = (HF - 1) / HF
    
    const priceDropPercentage = ((hf - 1) / hf) * 100;
    
    return Math.max(0, priceDropPercentage).toFixed(2);
  }
  
  /**
   * Generate risk alerts based on position metrics
   */
  static generateRiskAlerts(
    healthFactor: string,
    currentLTV: string,
    liquidationThreshold: string,
    suppliedAssets: AssetPosition[],
    liquidationDistance: string
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const hf = parseFloat(healthFactor);
    const ltv = parseFloat(currentLTV);
    const threshold = parseFloat(liquidationThreshold);
    const distance = parseFloat(liquidationDistance);
    
    // Health factor warnings
    if (hf <= 1.05) {
      alerts.push({
        type: 'LIQUIDATION_WARNING',
        severity: 'CRITICAL',
        message: 'Position is at immediate risk of liquidation',
        threshold: '1.05',
        currentValue: healthFactor
      });
    } else if (hf <= 1.2) {
      alerts.push({
        type: 'LOW_HEALTH_FACTOR',
        severity: 'WARNING',
        message: 'Health factor is dangerously low',
        threshold: '1.2',
        currentValue: healthFactor
      });
    }
    
    // LTV warnings - but only if health factor is also concerning
    const utilizationRatio = ltv / threshold;
    if (utilizationRatio >= 0.95 && hf <= 1.5) {
      alerts.push({
        type: 'HIGH_LTV',
        severity: 'CRITICAL',
        message: 'LTV is very close to liquidation threshold',
        threshold: `${threshold}%`,
        currentValue: `${ltv}%`
      });
    } else if (utilizationRatio >= 0.90 && hf <= 2.0) {
      alerts.push({
        type: 'HIGH_LTV',
        severity: 'WARNING',
        message: 'LTV utilization is high',
        threshold: `${threshold * 0.90}%`,
        currentValue: `${ltv}%`
      });
    } else if (utilizationRatio >= 0.85) {
      alerts.push({
        type: 'HIGH_LTV',
        severity: 'INFO',
        message: 'LTV utilization is moderate',
        threshold: `${threshold * 0.85}%`,
        currentValue: `${ltv}%`
      });
    }
    
    // Concentration warnings
    const concentrationScore = this.calculateConcentrationScore(suppliedAssets);
    if (concentrationScore <= 40) {
      alerts.push({
        type: 'HIGH_CONCENTRATION',
        severity: 'WARNING',
        message: 'Portfolio is highly concentrated in few assets',
        currentValue: `${concentrationScore}/100`
      });
    }
    
    // Liquidation distance warnings
    if (distance <= 10) {
      alerts.push({
        type: 'LIQUIDATION_WARNING',
        severity: 'CRITICAL',
        message: `Position vulnerable to ${distance}% price drop`,
        currentValue: `${distance}%`
      });
    } else if (distance <= 25) {
      alerts.push({
        type: 'LIQUIDATION_WARNING',
        severity: 'WARNING',
        message: `Position at risk with ${distance}% price drop`,
        currentValue: `${distance}%`
      });
    }
    
    return alerts;
  }
  
  /**
   * Create complete risk assessment from position data
   */
  static createRiskAssessment(
    userAddress: string,
    protocol: string,
    network: string,
    positionId: string,
    suppliedAssets: AssetPosition[],
    borrowedAssets: AssetPosition[],
    healthFactor: string,
    liquidationThreshold: string,
    currentLTV: string,
    totalCollateralUSD: string,
    totalDebtUSD: string
  ): RiskAssessmentModel {
    // Calculate individual scores
    const healthFactorScore = this.calculateHealthFactorScore(healthFactor);
    const ltvScore = this.calculateLTVScore(currentLTV, liquidationThreshold);
    const thresholdScore = this.calculateThresholdScore(liquidationThreshold);
    const concentrationScore = this.calculateConcentrationScore(suppliedAssets);
    
    // Calculate composite score and risk level
    const compositeRiskScore = this.calculateCompositeRiskScore(
      healthFactor, currentLTV, liquidationThreshold, suppliedAssets
    );
    const riskLevel = this.determineRiskLevel(compositeRiskScore);
    
    // Calculate liquidation distance
    const liquidationDistance = this.calculateLiquidationDistance(
      healthFactor, currentLTV, liquidationThreshold, totalCollateralUSD, totalDebtUSD
    );
    
    // Generate risk alerts
    const riskAlerts = this.generateRiskAlerts(
      healthFactor, currentLTV, liquidationThreshold, suppliedAssets, liquidationDistance
    );
    
    const now = new Date().toISOString();
    
    return {
      userAddress,
      protocol,
      network,
      positionId,
      suppliedAssets,
      borrowedAssets,
      healthFactor,
      liquidationThreshold,
      currentLTV,
      totalCollateralUSD,
      totalDebtUSD,
      riskLevel,
      compositeRiskScore: Math.round(compositeRiskScore * 100) / 100,
      liquidationDistance,
      healthFactorScore,
      ltvScore,
      thresholdScore,
      concentrationScore,
      riskAlerts,
      lastUpdated: now,
      assessmentTimestamp: now
    };
  }
}

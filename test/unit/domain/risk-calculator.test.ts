/*
 * File: risk-calculator.test.ts
 * Description: Unit tests for RiskCalculator class methods.
 * Layer: Test
 */

import { RiskCalculator, AssetPosition, RiskLevel } from '@domain/models/risk.model';

describe('RiskCalculator', () => {
  
  describe('calculateHealthFactorScore', () => {
    it('should return 100 for health factor >= 3.0', () => {
      expect(RiskCalculator.calculateHealthFactorScore('3.0')).toBe(100);
      expect(RiskCalculator.calculateHealthFactorScore('5.5')).toBe(100);
    });

    it('should return 80 for health factor >= 2.0', () => {
      expect(RiskCalculator.calculateHealthFactorScore('2.0')).toBe(80);
      expect(RiskCalculator.calculateHealthFactorScore('2.5')).toBe(80);
    });

    it('should return 60 for health factor >= 1.5', () => {
      expect(RiskCalculator.calculateHealthFactorScore('1.5')).toBe(60);
      expect(RiskCalculator.calculateHealthFactorScore('1.8')).toBe(60);
    });

    it('should return 40 for health factor >= 1.2', () => {
      expect(RiskCalculator.calculateHealthFactorScore('1.2')).toBe(40);
      expect(RiskCalculator.calculateHealthFactorScore('1.3')).toBe(40);
    });

    it('should return 20 for health factor >= 1.05', () => {
      expect(RiskCalculator.calculateHealthFactorScore('1.05')).toBe(20);
      expect(RiskCalculator.calculateHealthFactorScore('1.1')).toBe(20);
    });

    it('should return 0 for health factor < 1.05', () => {
      expect(RiskCalculator.calculateHealthFactorScore('1.04')).toBe(0);
      expect(RiskCalculator.calculateHealthFactorScore('0.95')).toBe(0);
      expect(RiskCalculator.calculateHealthFactorScore('0')).toBe(0);
    });
  });

  describe('calculateLTVScore', () => {
    it('should return 100 for utilization <= 50%', () => {
      expect(RiskCalculator.calculateLTVScore('40', '80')).toBe(100); // 50% utilization
      expect(RiskCalculator.calculateLTVScore('30', '80')).toBe(100); // 37.5% utilization
    });

    it('should return 80 for utilization <= 70%', () => {
      expect(RiskCalculator.calculateLTVScore('56', '80')).toBe(80); // 70% utilization
      expect(RiskCalculator.calculateLTVScore('50', '80')).toBe(80); // 62.5% utilization
    });

    it('should return 60 for utilization <= 85%', () => {
      expect(RiskCalculator.calculateLTVScore('68', '80')).toBe(60); // 85% utilization
      expect(RiskCalculator.calculateLTVScore('60', '80')).toBe(60); // 75% utilization
    });

    it('should return 40 for utilization <= 95%', () => {
      expect(RiskCalculator.calculateLTVScore('76', '80')).toBe(40); // 95% utilization
      expect(RiskCalculator.calculateLTVScore('70', '80')).toBe(40); // 87.5% utilization
    });

    it('should return 20 for utilization <= 98%', () => {
      expect(RiskCalculator.calculateLTVScore('78.4', '80')).toBe(20); // 98% utilization
      expect(RiskCalculator.calculateLTVScore('77', '80')).toBe(20); // 96.25% utilization
    });

    it('should return 0 for utilization > 98%', () => {
      expect(RiskCalculator.calculateLTVScore('79', '80')).toBe(0); // 98.75% utilization
      expect(RiskCalculator.calculateLTVScore('80', '80')).toBe(0); // 100% utilization
    });
  });

  describe('calculateThresholdScore', () => {
    it('should return 100 for threshold >= 85%', () => {
      expect(RiskCalculator.calculateThresholdScore('85')).toBe(100);
      expect(RiskCalculator.calculateThresholdScore('90')).toBe(100);
    });

    it('should return 80 for threshold >= 80%', () => {
      expect(RiskCalculator.calculateThresholdScore('80')).toBe(80);
      expect(RiskCalculator.calculateThresholdScore('82')).toBe(80);
    });

    it('should return 60 for threshold >= 75%', () => {
      expect(RiskCalculator.calculateThresholdScore('75')).toBe(60);
      expect(RiskCalculator.calculateThresholdScore('78')).toBe(60);
    });

    it('should return 40 for threshold >= 70%', () => {
      expect(RiskCalculator.calculateThresholdScore('70')).toBe(40);
      expect(RiskCalculator.calculateThresholdScore('72')).toBe(40);
    });

    it('should return 20 for threshold >= 60%', () => {
      expect(RiskCalculator.calculateThresholdScore('60')).toBe(20);
      expect(RiskCalculator.calculateThresholdScore('65')).toBe(20);
    });

    it('should return 0 for threshold < 60%', () => {
      expect(RiskCalculator.calculateThresholdScore('55')).toBe(0);
      expect(RiskCalculator.calculateThresholdScore('40')).toBe(0);
    });
  });

  describe('calculateConcentrationScore', () => {
    it('should return 0 for empty asset array', () => {
      expect(RiskCalculator.calculateConcentrationScore([])).toBe(0);
    });

    it('should return 0 for zero total value', () => {
      const assets: AssetPosition[] = [
        { symbol: 'ETH', address: '0x123', amount: '0', valueUSD: '0' }
      ];
      expect(RiskCalculator.calculateConcentrationScore(assets)).toBe(0);
    });

    it('should return 20 for single asset (100% concentration)', () => {
      const assets: AssetPosition[] = [
        { symbol: 'ETH', address: '0x123', amount: '10', valueUSD: '1000' }
      ];
      expect(RiskCalculator.calculateConcentrationScore(assets)).toBe(20);
    });

    it('should return 100 for well-diversified portfolio (4 equal assets)', () => {
      const assets: AssetPosition[] = [
        { symbol: 'ETH', address: '0x123', amount: '5', valueUSD: '250' },
        { symbol: 'USDC', address: '0x456', amount: '250', valueUSD: '250' },
        { symbol: 'DAI', address: '0x789', amount: '250', valueUSD: '250' },
        { symbol: 'WBTC', address: '0xabc', amount: '0.01', valueUSD: '250' }
      ];
      expect(RiskCalculator.calculateConcentrationScore(assets)).toBe(100);
    });

    it('should return 80 for moderately diversified portfolio', () => {
      const assets: AssetPosition[] = [
        { symbol: 'ETH', address: '0x123', amount: '7', valueUSD: '350' },
        { symbol: 'USDC', address: '0x456', amount: '350', valueUSD: '350' },
        { symbol: 'DAI', address: '0x789', amount: '300', valueUSD: '300' }
      ];
      // HHI = (350/1000)^2 + (350/1000)^2 + (300/1000)^2 = 0.1225 + 0.1225 + 0.09 = 0.335
      expect(RiskCalculator.calculateConcentrationScore(assets)).toBe(80);
    });
  });

  describe('calculateCompositeRiskScore', () => {
    const mockAssets: AssetPosition[] = [
      { symbol: 'ETH', address: '0x123', amount: '5', valueUSD: '500' },
      { symbol: 'USDC', address: '0x456', amount: '500', valueUSD: '500' }
    ];

    it('should calculate weighted composite score correctly', () => {
      // HF: 2.5 (80 points), LTV: 50% of 80% (62.5% utilization, 80 points)
      // Threshold: 80% (80 points), Concentration: 2 equal assets (80 points)
      // Expected: 80*0.4 + 80*0.3 + 80*0.2 + 80*0.1 = 80
      const score = RiskCalculator.calculateCompositeRiskScore('2.5', '50', '80', mockAssets);
      expect(score).toBe(80);
    });

    it('should handle critical risk scenario', () => {
      // HF: 1.0 (0 points), LTV: 79% of 80% (98.75% utilization, 0 points)
      // Threshold: 50% (0 points), Concentration: 2 equal assets (80 points)
      // Expected: 0*0.4 + 0*0.3 + 0*0.2 + 80*0.1 = 8
      const score = RiskCalculator.calculateCompositeRiskScore('1.0', '79', '80', mockAssets);
      expect(score).toBe(8);
    });
  });

  describe('determineRiskLevel', () => {
    it('should return LOW for score >= 80', () => {
      expect(RiskCalculator.determineRiskLevel(80)).toBe('LOW');
      expect(RiskCalculator.determineRiskLevel(95)).toBe('LOW');
      expect(RiskCalculator.determineRiskLevel(100)).toBe('LOW');
    });

    it('should return MEDIUM for score >= 60', () => {
      expect(RiskCalculator.determineRiskLevel(60)).toBe('MEDIUM');
      expect(RiskCalculator.determineRiskLevel(70)).toBe('MEDIUM');
      expect(RiskCalculator.determineRiskLevel(79)).toBe('MEDIUM');
    });

    it('should return HIGH for score >= 40', () => {
      expect(RiskCalculator.determineRiskLevel(40)).toBe('HIGH');
      expect(RiskCalculator.determineRiskLevel(50)).toBe('HIGH');
      expect(RiskCalculator.determineRiskLevel(59)).toBe('HIGH');
    });

    it('should return CRITICAL for score < 40', () => {
      expect(RiskCalculator.determineRiskLevel(39)).toBe('CRITICAL');
      expect(RiskCalculator.determineRiskLevel(20)).toBe('CRITICAL');
      expect(RiskCalculator.determineRiskLevel(0)).toBe('CRITICAL');
    });
  });

  describe('calculateLiquidationDistance', () => {
    it('should return 0.00 for zero collateral or debt', () => {
      expect(RiskCalculator.calculateLiquidationDistance('2.0', '50', '80', '0', '1000')).toBe('0.00');
      expect(RiskCalculator.calculateLiquidationDistance('2.0', '50', '80', '2000', '0')).toBe('0.00');
    });

    it('should calculate liquidation distance correctly', () => {
      // Collateral: $2000, Debt: $1000, Threshold: 80%
      // Liquidation collateral value: $1000 / 0.8 = $1250
      // Price drop: ($2000 - $1250) / $2000 = 37.5%
      const distance = RiskCalculator.calculateLiquidationDistance('2.0', '50', '80', '2000', '1000');
      expect(distance).toBe('37.50');
    });

    it('should return 0.00 for positions already at liquidation', () => {
      // Collateral: $1000, Debt: $800, Threshold: 80%
      // Liquidation collateral value: $800 / 0.8 = $1000
      // Price drop: ($1000 - $1000) / $1000 = 0%
      const distance = RiskCalculator.calculateLiquidationDistance('1.0', '80', '80', '1000', '800');
      expect(distance).toBe('0.00');
    });
  });

  describe('generateRiskAlerts', () => {
    const mockAssets: AssetPosition[] = [
      { symbol: 'ETH', address: '0x123', amount: '10', valueUSD: '1000' }
    ];

    it('should generate critical liquidation warning for HF <= 1.05', () => {
      const alerts = RiskCalculator.generateRiskAlerts('1.05', '50', '80', mockAssets, '5.00');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('LIQUIDATION_WARNING');
      expect(alerts[0].severity).toBe('CRITICAL');
      expect(alerts[0].message).toContain('immediate risk of liquidation');
    });

    it('should generate warning for low health factor', () => {
      const alerts = RiskCalculator.generateRiskAlerts('1.15', '50', '80', mockAssets, '15.00');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('LOW_HEALTH_FACTOR');
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('should generate critical LTV warning for high utilization', () => {
      const alerts = RiskCalculator.generateRiskAlerts('1.5', '76', '80', mockAssets, '20.00');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('HIGH_LTV');
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('should generate concentration warning for single asset', () => {
      const alerts = RiskCalculator.generateRiskAlerts('2.0', '50', '80', mockAssets, '30.00');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('HIGH_CONCENTRATION');
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('should generate liquidation distance warning', () => {
      const alerts = RiskCalculator.generateRiskAlerts('1.3', '50', '80', mockAssets, '8.00');
      expect(alerts).toHaveLength(2); // Low HF + Critical liquidation distance
      const distanceAlert = alerts.find(a => a.message.includes('8.00% price drop'));
      expect(distanceAlert?.severity).toBe('CRITICAL');
    });

    it('should generate no alerts for safe position', () => {
      const diversifiedAssets: AssetPosition[] = [
        { symbol: 'ETH', address: '0x123', amount: '5', valueUSD: '250' },
        { symbol: 'USDC', address: '0x456', amount: '250', valueUSD: '250' },
        { symbol: 'DAI', address: '0x789', amount: '250', valueUSD: '250' },
        { symbol: 'WBTC', address: '0xabc', amount: '0.01', valueUSD: '250' }
      ];
      const alerts = RiskCalculator.generateRiskAlerts('3.0', '40', '85', diversifiedAssets, '50.00');
      expect(alerts).toHaveLength(0);
    });
  });

  describe('createRiskAssessment', () => {
    const suppliedAssets: AssetPosition[] = [
      { symbol: 'ETH', address: '0x123', amount: '10', valueUSD: '2000', valueETH: '10' },
      { symbol: 'USDC', address: '0x456', amount: '1000', valueUSD: '1000', valueETH: '0.5' }
    ];

    const borrowedAssets: AssetPosition[] = [
      { symbol: 'DAI', address: '0x789', amount: '800', valueUSD: '800', valueETH: '0.4' }
    ];

    it('should create complete risk assessment', () => {
      const assessment = RiskCalculator.createRiskAssessment(
        '0x1234567890123456789012345678901234567890',
        'aave-v3',
        'ethereum',
        'test-position-1',
        suppliedAssets,
        borrowedAssets,
        '2.5',
        '80',
        '26.67', // 800/3000 = 26.67%
        '3000',
        '800'
      );

      expect(assessment.userAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(assessment.protocol).toBe('aave-v3');
      expect(assessment.network).toBe('ethereum');
      expect(assessment.positionId).toBe('test-position-1');
      expect(assessment.healthFactor).toBe('2.5');
      expect(assessment.riskLevel).toBe('LOW');
      expect(assessment.suppliedAssets).toHaveLength(2);
      expect(assessment.borrowedAssets).toHaveLength(1);
      expect(assessment.totalCollateralUSD).toBe('3000');
      expect(assessment.totalDebtUSD).toBe('800');
      expect(typeof assessment.compositeRiskScore).toBe('number');
      expect(typeof assessment.liquidationDistance).toBe('string');
      expect(Array.isArray(assessment.riskAlerts)).toBe(true);
      expect(assessment.lastUpdated).toBeDefined();
      expect(assessment.assessmentTimestamp).toBeDefined();
    });

    it('should handle edge case with no borrowed assets', () => {
      const assessment = RiskCalculator.createRiskAssessment(
        '0x1234567890123456789012345678901234567890',
        'aave-v3',
        'ethereum',
        'test-position-2',
        suppliedAssets,
        [],
        '0', // No debt means no health factor
        '80',
        '0',
        '3000',
        '0'
      );

      expect(assessment.borrowedAssets).toHaveLength(0);
      expect(assessment.totalDebtUSD).toBe('0');
      expect(assessment.liquidationDistance).toBe('0.00');
    });
  });
});

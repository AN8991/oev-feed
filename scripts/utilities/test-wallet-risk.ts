/**
 * Wallet Risk Assessment Test Script
 *
 * This script provides comprehensive risk assessment for a given wallet address
 * across all supported DeFi protocols. It fetches positions, calculates risk metrics,
 * and displays detailed risk analysis at the console level.
 * 
 * Features:
 * - Multi-protocol position fetching (Aave V2, V3)
 * - Comprehensive risk assessment calculations
 * - Detailed console output with risk breakdown
 * - Real-time blockchain data retrieval
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigService as InfraConfigService } from '@infrastructure/config/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
import { ProtocolAdapterService } from '@adapters/secondary/protocols/protocol-adapter.service';
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { NetworkConfigService } from '@infrastructure/config/network.config';
import { NetworkModule } from '@infrastructure/config/network.module';
import { RequestDistributor } from '@infrastructure/utils/request-distributor';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';
import { RiskAssessmentService } from '@application/services/risk-assessment.service';
import { PositionsService } from '@application/services/positions.service';
import { AavePositionMapper } from '@application/mappers/aave-position.mapper';
import { Network } from '@domain/types/networks';
import { Providers } from '@domain/enums/providers.enum';
import { Protocol, UserProtocolPosition } from '@domain/types/protocols';
import { PositionModel } from '@domain/models/position.model';
import { normalizeAddress } from '@domain/utils/address-utils';

const logger = new Logger('WalletRiskAssessment');
const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'oev_feed',
      synchronize: false,
      logging: false,
      entities: [PositionEntity, UserEntity],
    }),
    TypeOrmModule.forFeature([PositionEntity, UserEntity]),
    NetworkModule
  ],
  providers: [
    ProtocolAdapterFactory,
    ProviderFactory,
    RequestDistributor,
    AavePositionMapper,
    InfraConfigService
  ]
})
class WalletRiskTestModule {}

interface ProtocolRiskSummary {
  protocol: string;
  version: string;
  positionCount: number;
  totalCollateralUSD: string;
  totalDebtUSD: string;
  healthFactor: string;
  riskLevel: string;
  riskScore: number;
  positions: PositionModel[];
}

interface WalletRiskReport {
  walletAddress: string;
  totalPositions: number;
  protocolSummaries: ProtocolRiskSummary[];
  overallRiskLevel: string;
  overallRiskScore: number;
  riskAlerts: string[];
  recommendations: string[];
}

async function testWalletRiskAssessment() {
  let app;
  
  try {
    
    // Initialize NestJS application with timeout
    const initPromise = NestFactory.create(WalletRiskTestModule, { 
      logger: ['error'],
      abortOnError: false 
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Application initialization timeout after 30 seconds')), 30000)
    );
    
    app = await Promise.race([initPromise, timeoutPromise]) as any;

    // Get services from DI container
    const protocolAdapterFactory = app.get(ProtocolAdapterFactory);
    const networkConfigService = app.get(NetworkConfigService);
    const aavePositionMapper = app.get(AavePositionMapper);
    
    // Add a small delay to ensure all services are fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize wallet risk report
    const riskReport: WalletRiskReport = {
      walletAddress: TEST_USER_ADDRESS,
      totalPositions: 0,
      protocolSummaries: [],
      overallRiskLevel: 'UNKNOWN',
      overallRiskScore: 0,
      riskAlerts: [],
      recommendations: []
    };

    // Test supported protocols
    const protocols = [
      { protocol: 'aave-v2', network: 'ethereum', version: 'v2' },
      { protocol: 'aave-v3', network: 'ethereum', version: 'v3' }
    ];

    // Get database connection and fetch positions
    const dataSource = app.get(DataSource);
    
    // Find the user in the database
    const user = await dataSource.query(
      'SELECT id FROM users WHERE address = $1', 
      [normalizeAddress(TEST_USER_ADDRESS)]
    );
    
    if (user.length > 0) {
      // Fetch all positions for this user
      const dbPositions = await dataSource.query(`
        SELECT 
          id, "userAddress", protocol, network, "assetAddress", "assetSymbol",
          "collateralAmount", "collateralAmountUSD", "debtAmount", "debtAmountUSD",
          "healthFactor", "liquidationThreshold", ltv, "lastUpdated",
          risk_score, risk_level, risk_assessed_at
        FROM positions 
        WHERE user_id = $1 
        ORDER BY "lastUpdated" DESC
      `, [user[0].id]);
      
      if (dbPositions.length > 0) {
        // Group positions by protocol
        const positionsByProtocol = dbPositions.reduce((acc: any, pos: any) => {
          const protocolKey = pos.protocol;
          if (!acc[protocolKey]) {
            acc[protocolKey] = [];
          }
          acc[protocolKey].push({
            id: pos.id,
            userAddress: pos.userAddress,
            protocol: pos.protocol,
            network: pos.network,
            assetAddress: pos.assetAddress,
            assetSymbol: pos.assetSymbol,
            collateralAmount: pos.collateralAmount,
            collateralAmountUSD: pos.collateralAmountUSD,
            debtAmount: pos.debtAmount,
            debtAmountUSD: pos.debtAmountUSD,
            healthFactor: pos.healthFactor,
            liquidationThreshold: pos.liquidationThreshold,
            ltv: pos.ltv,
            lastUpdated: pos.lastUpdated,
            riskScore: pos.risk_score,
            riskLevel: pos.risk_level,
            riskAssessedAt: pos.risk_assessed_at
          });
          return acc;
        }, {});
        
        // Process each protocol
        for (const [protocolName, positions] of Object.entries(positionsByProtocol)) {
          const version = protocolName.includes('v2') ? 'v2' : 'v3';
          const protocolSummary = calculateSimpleProtocolRiskSummary(
            protocolName,
            version,
            positions as PositionModel[]
          );
          
          riskReport.protocolSummaries.push(protocolSummary);
          riskReport.totalPositions += (positions as any[]).length;
        }
      }
    }

    // Calculate overall wallet risk and display report
    calculateOverallWalletRisk(riskReport);
    displayWalletRiskReport(riskReport);
    
  } catch (error) {
    logger.error('❌ Wallet risk assessment failed:', error);
    throw error;
  } finally {
    // Clean up
    if (app) {
      await app.close();
    }
  }
}

function calculateSimpleProtocolRiskSummary(
  protocol: string,
  version: string,
  positions: PositionModel[]
): ProtocolRiskSummary {
  
  let totalCollateralUSD = 0;
  let totalDebtUSD = 0;
  let riskScores: number[] = [];
  let riskLevels: string[] = [];

  // Process each position for simplified risk assessment
  for (const position of positions) {
    try {
      // Simple risk calculation based on health factor and LTV
      const healthFactor = parseFloat(position.healthFactor);
      const ltv = parseFloat(position.ltv);
      
      // Calculate simple risk score (0-100)
      let riskScore = 0;
      if (healthFactor > 0 && healthFactor < 1.2) {
        riskScore = 90; // Very high risk
      } else if (healthFactor < 1.5) {
        riskScore = 70; // High risk
      } else if (healthFactor < 2.0) {
        riskScore = 50; // Medium risk
      } else if (ltv > 70) {
        riskScore = 40; // Medium-low risk
      } else {
        riskScore = 20; // Low risk
      }
      
      riskScores.push(riskScore);
      
      // Determine risk level
      let riskLevel = 'LOW';
      if (riskScore >= 80) riskLevel = 'HIGH';
      else if (riskScore >= 60) riskLevel = 'MEDIUM_HIGH';
      else if (riskScore >= 40) riskLevel = 'MEDIUM';
      else if (riskScore >= 20) riskLevel = 'LOW_MEDIUM';
      
      riskLevels.push(riskLevel);
      
      // Accumulate USD values (using placeholder conversion for now)
      totalCollateralUSD += parseFloat(position.collateralAmountUSD || '0');
      totalDebtUSD += parseFloat(position.debtAmountUSD || '0');
      
    } catch (riskError) {
      // Silent error handling for risk calculation
    }
  }

  // Calculate average risk score
  const avgRiskScore = riskScores.length > 0 ? 
    riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length : 0;

  // Determine overall risk level for protocol
  const overallRiskLevel = determineRiskLevel(avgRiskScore, riskLevels);

  return {
    protocol: protocol.toUpperCase(),
    version,
    positionCount: positions.length,
    totalCollateralUSD: totalCollateralUSD.toFixed(2),
    totalDebtUSD: totalDebtUSD.toFixed(2),
    healthFactor: positions[0]?.healthFactor || '0',
    riskLevel: overallRiskLevel,
    riskScore: Math.round(avgRiskScore),
    positions
  };
}

function calculateOverallWalletRisk(riskReport: WalletRiskReport) {
  if (riskReport.protocolSummaries.length === 0) {
    riskReport.overallRiskLevel = 'NO_POSITIONS';
    riskReport.overallRiskScore = 0;
    riskReport.recommendations.push('No DeFi positions found. Consider exploring DeFi opportunities.');
    return;
  }

  // Calculate weighted average risk score
  let totalValue = 0;
  let weightedRiskSum = 0;
  
  for (const summary of riskReport.protocolSummaries) {
    const protocolValue = parseFloat(summary.totalCollateralUSD);
    totalValue += protocolValue;
    weightedRiskSum += summary.riskScore * protocolValue;
  }

  riskReport.overallRiskScore = totalValue > 0 ? Math.round(weightedRiskSum / totalValue) : 0;
  riskReport.overallRiskLevel = determineRiskLevel(riskReport.overallRiskScore, 
    riskReport.protocolSummaries.map(s => s.riskLevel));

  // Generate risk alerts and recommendations
  generateRiskAlertsAndRecommendations(riskReport);
}

function determineRiskLevel(avgScore: number, riskLevels: string[]): string {
  if (avgScore >= 80) return 'HIGH';
  if (avgScore >= 60) return 'MEDIUM_HIGH';
  if (avgScore >= 40) return 'MEDIUM';
  if (avgScore >= 20) return 'LOW_MEDIUM';
  return 'LOW';
}

function generateRiskAlertsAndRecommendations(riskReport: WalletRiskReport) {
  const { overallRiskScore, protocolSummaries } = riskReport;

  // Risk alerts based on overall score
  if (overallRiskScore >= 80) {
    riskReport.riskAlerts.push('🚨 HIGH RISK: Immediate attention required');
    riskReport.recommendations.push('Consider reducing leverage or adding more collateral');
  } else if (overallRiskScore >= 60) {
    riskReport.riskAlerts.push('⚠️ ELEVATED RISK: Monitor closely');
    riskReport.recommendations.push('Review position sizes and consider risk mitigation');
  } else if (overallRiskScore >= 40) {
    riskReport.riskAlerts.push('📊 MODERATE RISK: Regular monitoring advised');
    riskReport.recommendations.push('Maintain current risk management practices');
  } else {
    riskReport.riskAlerts.push('✅ LOW RISK: Positions appear healthy');
    riskReport.recommendations.push('Continue current strategy with periodic reviews');
  }

  // Protocol-specific recommendations
  for (const summary of protocolSummaries) {
    const healthFactor = parseFloat(summary.healthFactor);
    if (healthFactor > 0 && healthFactor < 1.2) {
      riskReport.riskAlerts.push(`🚨 ${summary.protocol}: Health factor critically low (${healthFactor})`);
      riskReport.recommendations.push(`${summary.protocol}: Add collateral immediately to avoid liquidation`);
    } else if (healthFactor < 1.5) {
      riskReport.riskAlerts.push(`⚠️ ${summary.protocol}: Health factor low (${healthFactor})`);
      riskReport.recommendations.push(`${summary.protocol}: Consider adding collateral as precaution`);
    }
  }

  // Diversification recommendations
  if (protocolSummaries.length === 1) {
    riskReport.recommendations.push('Consider diversifying across multiple protocols to reduce concentration risk');
  }
}

function displayWalletRiskReport(riskReport: WalletRiskReport) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 COMPREHENSIVE WALLET RISK REPORT');
  console.log('='.repeat(60));
  console.log(`👤 Wallet Address: ${riskReport.walletAddress}`);
  console.log(`📊 Total Positions: ${riskReport.totalPositions}`);
  console.log(`🎯 Overall Risk Level: ${riskReport.overallRiskLevel}`);
  console.log(`📈 Overall Risk Score: ${riskReport.overallRiskScore}/100`);
  
  console.log('\n🏦 PROTOCOL BREAKDOWN:');
  console.log('----------------------');
  
  if (riskReport.protocolSummaries.length === 0) {
    console.log('   No positions found across supported protocols');
  } else {
    for (const summary of riskReport.protocolSummaries) {
      console.log(`\n   📍 ${summary.protocol} ${summary.version.toUpperCase()}:`);
      console.log(`      Positions: ${summary.positionCount}`);
      console.log(`      Total Collateral: $${summary.totalCollateralUSD}`);
      console.log(`      Total Debt: $${summary.totalDebtUSD}`);
      console.log(`      Health Factor: ${summary.healthFactor}`);
      console.log(`      Risk Level: ${summary.riskLevel}`);
      console.log(`      Risk Score: ${summary.riskScore}/100`);
      
      // Display individual positions
      for (let i = 0; i < summary.positions.length; i++) {
        const pos = summary.positions[i];
        console.log(`      Position ${i + 1}: ${pos.assetSymbol}`);
        console.log(`        Collateral: ${pos.collateralAmount}`);
        console.log(`        Debt: ${pos.debtAmount}`);
        console.log(`        LTV: ${pos.ltv}`);
        console.log(`        Liquidation Threshold: ${pos.liquidationThreshold}`);
      }
    }
  }

  console.log('\n🚨 RISK ALERTS:');
  console.log('---------------');
  if (riskReport.riskAlerts.length === 0) {
    console.log('   No specific risk alerts at this time');
  } else {
    for (const alert of riskReport.riskAlerts) {
      console.log(`   ${alert}`);
    }
  }

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('-------------------');
  if (riskReport.recommendations.length === 0) {
    console.log('   No specific recommendations at this time');
  } else {
    for (const recommendation of riskReport.recommendations) {
      console.log(`   • ${recommendation}`);
    }
  }

  console.log('\n📊 RISK ASSESSMENT SUMMARY:');
  console.log('---------------------------');
  console.log(`   Risk Score Interpretation:`);
  console.log(`   • 0-20:  LOW RISK - Conservative positions`);
  console.log(`   • 21-40: LOW-MEDIUM RISK - Moderate exposure`);
  console.log(`   • 41-60: MEDIUM RISK - Balanced risk/reward`);
  console.log(`   • 61-80: MEDIUM-HIGH RISK - Elevated exposure`);
  console.log(`   • 81-100: HIGH RISK - Aggressive positions`);
  
  console.log(`\n   Current Status: ${riskReport.overallRiskLevel} (${riskReport.overallRiskScore}/100)`);
}

// Execute the wallet risk assessment test
testWalletRiskAssessment().catch(error => {
  logger.error('❌ Wallet risk assessment failed:', error);
  process.exit(1);
});
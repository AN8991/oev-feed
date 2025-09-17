/**
 * Aave V2 Adapter Test Script
 *
 * This script tests the Aave V2 protocol adapter implementation for Ethereum network.
 * It verifies adapter initialization, position fetching, and data formatting.
 */
import { config } from 'dotenv';
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
import { PositionModel } from '@domain/models/position.model';
import { TypeORMAdapter } from '@adapters/secondary/database/typeorm/typeorm-adapter';
import { DatabasePort } from '@domain/ports/secondary/database.port';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';
import { RiskAssessmentService } from '@application/services/risk-assessment.service';
import { PositionsService } from '@domain/services/positions.service';
import { RiskCalculator, AssetPosition } from '@domain/models/risk.model';
import { UserProtocolPosition, Protocol } from '@domain/types/protocols';
import { Network } from '@domain/types/networks';
// PositionRepository removed - using direct TypeORM Repository<PositionEntity> instead
import { DataSource } from 'typeorm';

// Load environment variables
config();

// Aave V2 Ethereum contract addresses (mainnet)
const AAVE_V2_ETHEREUM_POOL = process.env.AAVE_V2_ETHEREUM_POOL || '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const AAVE_V2_ETHEREUM_DATA_PROVIDER = process.env.AAVE_V2_ETHEREUM_DATA_PROVIDER || '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d';
const AAVE_V2_ETHEREUM_ORACLE = process.env.AAVE_V2_ETHEREUM_ORACLE || '0xA50ba011C48153de246E5192C8f9258A2ba79Ca9';
// Use Infura instead of Alchemy due to timeout issues
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;

// Test user address - should be an address with Aave V2 positions
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS || '0xf0bb20865277abd641a307ece5ee04e79073416c';

async function testAaveV2Adapter() {
  try {
    console.log('Testing Aave V2 Ethereum Adapter');

    // Create adapter configuration - Use Infura for better reliability
    const infuraUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    const config = {
      poolAddress: AAVE_V2_ETHEREUM_POOL,
      dataProviderAddress: AAVE_V2_ETHEREUM_DATA_PROVIDER,
      oracleAddress: AAVE_V2_ETHEREUM_ORACLE,
      providerUrl: infuraUrl
    };

    // Create adapter using factory
    // Note: ProtocolAdapterFactory is now injectable, create instance directly for testing
    const factory = new ProtocolAdapterFactory();
    const adapter = factory.createAdapter('aave-v2', 'ethereum', config);

    // Initialize adapter
    console.info('Initializing adapter...');
    await adapter.initialize();

    // Get health factor
    console.info(`Getting health factor for user ${TEST_USER_ADDRESS}...`);
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.info(`Health factor: ${healthFactor}`);

    // Get user positions
    console.info(`Getting positions for user ${TEST_USER_ADDRESS}...`);
    let positions: PositionModel[] = [];
    try {
      positions = await adapter.fetchUserPositions({ userAddresses: [TEST_USER_ADDRESS] });
      console.info(`Found ${positions.length} positions`);
      console.log('Positions:', positions);
      // Log position details
      positions.forEach((position: PositionModel, index: number) => {
        console.info(`Position ${index + 1}:`, {
          assetSymbol: position.assetSymbol,
          collateralAmount: position.collateralAmount,
          debtAmount: position.debtAmount,
          healthFactor: position.healthFactor
        });
      });
      // Save positions to DB and calculate risk assessments
      const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'oev_feed',
        entities: [PositionEntity],
        synchronize: false,
        logging: false,
      });
      
      await dataSource.initialize();
      const positionRepository = dataSource.getRepository(PositionEntity);
      
      // Using TypeORMAdapter with direct repository injection (simplified pattern)
      const db: DatabasePort = new TypeORMAdapter(positionRepository);
      
      // Save positions first
      await db.savePositions(positions);
      console.info(`Saved ${positions.length} positions to the database.`);
      
      // Calculate and persist risk assessments
      console.info('Calculating risk assessments...');
      const positionsService = new PositionsService(positionRepository, {} as any);
      const riskAssessmentService = new RiskAssessmentService(positionRepository, positionsService);
      
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        console.info(`📊 Calculating risk for position ${i + 1}: ${position.assetSymbol}`);
        
        try {
          // Convert PositionModel to UserProtocolPosition
          const userPosition: UserProtocolPosition = {
            userAddress: position.userAddress,
            protocol: Protocol.AAVE,
            network: Network.ETHEREUM,
            version: 'v2',
            collateral: position.collateralAmount,
            debt: position.debtAmount,
            healthFactor: position.healthFactor,
            liquidationRisk: {
              threshold: position.liquidationThreshold,
              currentLTV: position.ltv
            },
            suppliedAssets: [{
              symbol: position.assetSymbol,
              address: position.assetAddress,
              amount: position.collateralAmount,
              valueETH: (parseFloat(position.collateralAmountUSD) / 2000).toString() // Mock ETH conversion
            }],
            borrowedAssets: [{
              symbol: position.assetSymbol,
              address: position.assetAddress,
              amount: position.debtAmount,
              valueETH: (parseFloat(position.debtAmountUSD) / 2000).toString()
            }],
            fetchedTimestamp: Date.now()
          };
          
          const riskAssessment = await riskAssessmentService.calculateRiskAssessment(userPosition);
          
          console.info(`   ✅ Risk Level: ${riskAssessment.riskLevel}`);
          console.info(`   ✅ Risk Score: ${riskAssessment.compositeRiskScore}/100`);
          console.info(`   ✅ Health Factor: ${riskAssessment.healthFactor}`);
          console.info(`   ✅ Alerts: ${riskAssessment.riskAlerts.length}`);
          
          if (riskAssessment.riskAlerts.length > 0) {
            riskAssessment.riskAlerts.forEach((alert, idx) => {
              console.info(`      🚨 [${alert.severity}] ${alert.message}`);
            });
          }
        } catch (riskError) {
          console.error(`   ❌ Error calculating risk for position ${i + 1}:`, riskError);
        }
      }
      
      // Query and display persisted risk data
      console.info('\n📋 Querying persisted risk assessments...');
      const savedPositions = await positionRepository.find({
        where: { userAddress: TEST_USER_ADDRESS.toLowerCase() },
        order: { riskScore: 'DESC' }
      });
      
      savedPositions.forEach((pos, index) => {
        console.info(`   Position ${index + 1}: ${pos.assetSymbol}`);
        console.info(`      Risk Score: ${pos.riskScore || 'Not calculated'}`);
        console.info(`      Risk Level: ${pos.riskLevel || 'Not calculated'}`);
        console.info(`      Assessed At: ${pos.riskAssessedAt ? new Date(pos.riskAssessedAt).toLocaleString() : 'Never'}`);
      });
      
      await dataSource.destroy();
    } catch (fetchError) {
      console.error('Error fetching or logging user positions:', fetchError);
      console.error('Error fetching or logging user positions:', fetchError);
    }

    // Clean up
    console.info('Cleaning up adapter...');
    await adapter.cleanup();

    console.info('Test completed successfully');
  } catch (error) {
    console.error('Error testing Aave V2 adapter:', error);
  }
}

// Run the test
testAaveV2Adapter().then(() => {
  console.info('Test script execution completed');
}).catch(error => {
  console.error('Unhandled error in test script:', error);
});

// Catch-all error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

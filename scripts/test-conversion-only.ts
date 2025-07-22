import 'dotenv/config';
import 'reflect-metadata';
import { AavePositionMapper } from '@/application/mappers/aave-position.mapper';
import { AavePositionDTO } from '@/application/dto/aave-position.dto';

/**
 * Simple test to verify the Wei to ETH conversion logic in the mapper
 */
function testConversionOnly() {
  console.log('🧮 CONVERSION LOGIC TEST');
  console.log('Testing Wei to ETH conversion in the mapper...');
  console.log('=' .repeat(50));

  // Create a mock DTO with the actual values we've been seeing
  const mockDTO: AavePositionDTO = {
    userAddress: '0x79682489385337996edd00eb56b4238b597bfae7',
    assetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    assetSymbol: 'WETH',
    assetDecimals: 18,
    aTokenBalance: '10042834085188220', // Raw Wei amount we've been seeing
    stableDebt: '0',
    variableDebt: '2011588478559522', // Raw Wei debt amount
    principalStableDebt: '0',
    scaledVariableDebt: '2011588478559522',
    collateralETH: '0.037', // Approximate ETH value
    debtETH: '0.007', // Approximate ETH value
    healthFactor: '4143765442449202052', // Raw health factor with 18 decimals
    liquidationThreshold: '8300',
    ltv: '8050',
    protocol: 'aave-v3',
    network: 'ethereum',
    version: 'v3',
    lastUpdated: Date.now()
  };

  console.log('📊 INPUT (Raw Wei Values):');
  console.log(`  Collateral (Wei): ${mockDTO.aTokenBalance}`);
  console.log(`  Debt (Wei): ${mockDTO.variableDebt}`);
  console.log(`  Health Factor (Raw): ${mockDTO.healthFactor}`);
  console.log(`  Asset Decimals: ${mockDTO.assetDecimals}`);

  try {
    console.log('\n🔄 Converting using mapper...');
    const domainModel = AavePositionMapper.toDomain(mockDTO);

    console.log('\n✅ OUTPUT (Human-Readable Values):');
    console.log(`  Collateral: ${domainModel.collateralAmount} ETH`);
    console.log(`  Debt: ${domainModel.debtAmount} ETH`);
    console.log(`  Health Factor: ${domainModel.healthFactor}`);

    // Manual verification
    const expectedCollateral = parseFloat(mockDTO.aTokenBalance) / Math.pow(10, 18);
    const expectedDebt = parseFloat(mockDTO.variableDebt) / Math.pow(10, 18);
    const expectedHealthFactor = parseFloat(mockDTO.healthFactor) / Math.pow(10, 18);

    console.log('\n🎯 VERIFICATION:');
    console.log(`  Expected Collateral: ${expectedCollateral.toFixed(8)} ETH`);
    console.log(`  Actual Collateral: ${domainModel.collateralAmount} ETH`);
    console.log(`  Expected Debt: ${expectedDebt.toFixed(8)} ETH`);
    console.log(`  Actual Debt: ${domainModel.debtAmount} ETH`);
    console.log(`  Expected Health Factor: ${expectedHealthFactor.toFixed(6)}`);
    console.log(`  Actual Health Factor: ${domainModel.healthFactor}`);

    // Check if values are reasonable
    const collateralFloat = parseFloat(domainModel.collateralAmount);
    const debtFloat = parseFloat(domainModel.debtAmount);
    const healthFactorFloat = parseFloat(domainModel.healthFactor);

    console.log('\n🏁 RESULTS:');
    if (collateralFloat > 0 && collateralFloat < 1) {
      console.log('  ✅ Collateral amount looks correct (small ETH amount)');
    } else {
      console.log('  ❌ Collateral amount seems wrong');
    }

    if (debtFloat > 0 && debtFloat < 1) {
      console.log('  ✅ Debt amount looks correct (small ETH amount)');
    } else {
      console.log('  ❌ Debt amount seems wrong');
    }

    if (healthFactorFloat > 4 && healthFactorFloat < 5) {
      console.log('  ✅ Health factor looks correct (~4.14)');
    } else {
      console.log('  ❌ Health factor seems wrong');
    }

    console.log('\n🎉 CONVERSION TEST COMPLETE!');
    console.log('If all values look correct, the mapper fix is working!');

  } catch (error) {
    console.error('\n❌ CONVERSION ERROR:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testConversionOnly();

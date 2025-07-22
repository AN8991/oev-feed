const { ProtocolAdapterFactory } = require('./dist/adapters/secondary/protocols/protocol-adapter-factory');

console.log('🚀 Starting Aave V3 Debug Test...');

// Test configuration
const config = {
  poolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  dataProviderAddress: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
  oracleAddress: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
  providerUrl: 'https://eth-mainnet.g.alchemy.com/v2/9Mt2QYBql-7H-Dtrpnk830G34t2ga5EM'
};

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

async function debugTest() {
  try {
    console.log('1. Creating adapter...');
    const adapter = ProtocolAdapterFactory.createAdapter('aave-v3', 'ethereum', config);
    console.log('✅ Adapter created');

    console.log('2. Initializing adapter...');
    await adapter.initialize();
    console.log('✅ Adapter initialized');

    console.log('3. Getting health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.log('✅ Health factor:', healthFactor);

    console.log('4. Fetching positions...');
    const positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
    console.log('✅ Positions fetched:', positions.length);
    
    if (positions.length > 0) {
      console.log('\n=== POSITION DATA ===');
      positions.forEach((pos, i) => {
        console.log(`Position ${i + 1}:`, {
          symbol: pos.assetSymbol,
          collateral: pos.collateralAmount,
          debt: pos.debtAmount,
          healthFactor: pos.healthFactor
        });
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

debugTest();

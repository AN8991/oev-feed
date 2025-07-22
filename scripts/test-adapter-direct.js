// Direct test of the fixed Aave V3 adapter without TypeORM dependencies
const { ProtocolAdapterFactory } = require('../dist/adapters/secondary/protocols/protocol-adapter-factory');

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

async function testAdapterDirect() {
  console.log('🔧 DIRECT ADAPTER TEST (NO DATABASE)');
  console.log('Testing the fixed Aave V3 adapter logic...');
  console.log('\n' + '='.repeat(50));

  try {
    console.log('1. Creating adapter configuration...');
    const config = {
      poolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      dataProviderAddress: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
      oracleAddress: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
      providerUrl: `https://eth-mainnet.g.alchemy.com/v2/9Mt2QYBql-7H-Dtrpnk830G34t2ga5EM`
    };
    console.log('   ✅ Config created');

    console.log('2. Creating adapter...');
    const adapter = ProtocolAdapterFactory.createAdapter('aave-v3', 'ethereum', config);
    console.log('   ✅ Adapter created');

    console.log('3. Initializing adapter...');
    await adapter.initialize();
    console.log('   ✅ Adapter initialized');

    console.log('4. Getting health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.log(`   ✅ Health factor: ${healthFactor}`);

    console.log('5. Fetching positions (this will show detailed logs)...');
    const positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
    
    console.log('\n' + '='.repeat(50));
    console.log('RESULTS SUMMARY:');
    console.log(`Found ${positions.length} positions`);
    
    if (positions.length > 0) {
      positions.forEach((pos, index) => {
        console.log(`\nPosition ${index + 1}:`);
        console.log(`  Asset Symbol: ${pos.assetSymbol}`);
        console.log(`  Asset Address: ${pos.assetAddress}`);
        console.log(`  Collateral Amount: ${pos.collateralAmount}`);
        console.log(`  Debt Amount: ${pos.debtAmount}`);
        console.log(`  Health Factor: ${pos.healthFactor}`);
        console.log(`  Protocol: ${pos.protocol}`);
        console.log(`  Network: ${pos.network}`);
        
        // Check if this is ETH/WETH
        if (pos.assetSymbol === 'WETH' || pos.assetAddress.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
          console.log('\n  🎯 ETH/WETH POSITION ANALYSIS:');
          console.log(`     Expected Supplied: 0.0100428 ETH`);
          console.log(`     Expected Borrowed: 0.0020116 ETH`);
          console.log(`     Actual Supplied: ${pos.collateralAmount}`);
          console.log(`     Actual Borrowed: ${pos.debtAmount}`);
          
          // Check if values are non-zero (indicating fix worked)
          const hasSupplied = parseFloat(pos.collateralAmount) > 0;
          const hasBorrowed = parseFloat(pos.debtAmount) > 0;
          
          if (hasSupplied && hasBorrowed) {
            console.log('     ✅ SUCCESS: Non-zero values detected - fix is working!');
          } else {
            console.log('     ❌ ISSUE: Still getting zero values');
          }
        }
      });
    } else {
      console.log('❌ No positions returned');
    }

    console.log('\n6. Cleanup...');
    await adapter.cleanup();
    console.log('   ✅ Cleanup complete');

    console.log('\n🎉 DIRECT TEST COMPLETED');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Full error:', error);
  }
}

testAdapterDirect().catch(console.error);

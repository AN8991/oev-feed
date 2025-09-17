import { AppDataSource } from '../infrastructure/config/typeorm.config';
import { PositionEntity } from '../adapters/secondary/database/typeorm/entities/position.entity';
import { Provider } from '../adapters/secondary/database/typeorm/entities/provider.entity';
import { OevEvent } from '../adapters/secondary/database/typeorm/entities/oev-event.entity';

async function seed() {
  await AppDataSource.initialize();

  // Providers
  const providers = [
    AppDataSource.getRepository(Provider).create({
      name: 'alchemy',
      type: 'rpc',
      network: 'mainnet',
      baseUrl: 'https://eth-mainnet.alchemyapi.io/v2',
      isActive: true,
      rateLimit: 100,
      priority: 1,
    }),
    AppDataSource.getRepository(Provider).create({
      name: 'infura',
      type: 'rpc',
      network: 'mainnet',
      baseUrl: 'https://mainnet.infura.io/v3',
      isActive: true,
      rateLimit: 100,
      priority: 2,
    }),
  ];
  await AppDataSource.getRepository(Provider).save(providers);

  // Positions
  const positions = [
    AppDataSource.getRepository(PositionEntity).create({
      id: 'aave-v3-ethereum-0x123-1234567890',
      userAddress: '0x123',
      protocol: 'aave-v3',
      network: 'ethereum',
      assetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      assetSymbol: 'WETH',
      collateralAmount: '1.5',
      collateralAmountUSD: '3000.00',
      debtAmount: '0.8',
      debtAmountUSD: '1600.00',
      healthFactor: '2.1',
      liquidationThreshold: '0.85',
      ltv: '0.53',
      lastUpdated: Date.now().toString(),
    }),
    AppDataSource.getRepository(PositionEntity).create({
      id: 'aave-v3-ethereum-0x456-1234567891',
      userAddress: '0x456',
      protocol: 'aave-v3',
      network: 'ethereum',
      assetAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      assetSymbol: 'DAI',
      collateralAmount: '1000',
      collateralAmountUSD: '1000.00',
      debtAmount: '500',
      debtAmountUSD: '500.00',
      healthFactor: '2.0',
      liquidationThreshold: '0.80',
      ltv: '0.50',
      lastUpdated: Date.now().toString(),
    }),
  ];
  await AppDataSource.getRepository(PositionEntity).save(positions);

  // Skip OevEvent creation for now as it requires complex transaction relationships
  console.log('Skipping OevEvent seeding - requires transaction setup');

  await AppDataSource.destroy();
  console.log('Database seeded successfully.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

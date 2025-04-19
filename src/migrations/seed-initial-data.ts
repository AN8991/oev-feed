import { AppDataSource } from '../data-source';
import { Position } from '../domain/entities/position.entity';
import { Provider } from '../domain/entities/provider.entity';
import { Event } from '../domain/entities/event.entity';

async function seed() {
  await AppDataSource.initialize();

  // Providers
  const providers = [
    AppDataSource.getRepository(Provider).create({
      name: 'alchemy',
      network: 'mainnet',
      status: 'healthy',
      lastChecked: new Date(),
      healthScore: 95,
    }),
    AppDataSource.getRepository(Provider).create({
      name: 'infura',
      network: 'mainnet',
      status: 'degraded',
      lastChecked: new Date(),
      healthScore: 75,
    }),
  ];
  await AppDataSource.getRepository(Provider).save(providers);

  // Positions
  const positions = [
    AppDataSource.getRepository(Position).create({
      userAddress: '0x123',
      protocol: 'aave',
      asset: 'ETH',
      amount: '1.5',
      healthFactor: '1.2',
      updatedAt: new Date(),
    }),
    AppDataSource.getRepository(Position).create({
      userAddress: '0x456',
      protocol: 'aave',
      asset: 'DAI',
      amount: '1000',
      healthFactor: '2.0',
      updatedAt: new Date(),
    }),
  ];
  await AppDataSource.getRepository(Position).save(positions);

  // Events
  const events = [
    AppDataSource.getRepository(Event).create({
      type: 'liquidation',
      positionId: positions[0].id,
      description: 'Position liquidated due to low health factor',
      timestamp: new Date(),
    }),
    AppDataSource.getRepository(Event).create({
      type: 'deposit',
      positionId: positions[1].id,
      description: 'Deposit event',
      timestamp: new Date(),
    }),
  ];
  await AppDataSource.getRepository(Event).save(events);

  await AppDataSource.destroy();
  console.log('Database seeded successfully.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

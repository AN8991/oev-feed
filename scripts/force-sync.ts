import { AppDataSource } from '@infrastructure/config/typeorm.config';

(async () => {
  try {
    await AppDataSource.initialize();
    console.log('Registered entities:', AppDataSource.entityMetadatas.map(e => e.name));
    console.log('Schema sync complete.');
    await AppDataSource.destroy();
  } catch (err) {
    console.error('Error during schema sync:', err);
    process.exit(1);
  }
})();

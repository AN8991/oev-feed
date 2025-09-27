import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProtocolNetworkLastUpdatedToUsers1737744000000 implements MigrationInterface {
  name = 'AddProtocolNetworkLastUpdatedToUsers1737744000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "protocol" character varying,
      ADD COLUMN "network" character varying,
      ADD COLUMN "lastUpdated" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "protocol",
      DROP COLUMN "network",
      DROP COLUMN "lastUpdated"
    `);
  }
}

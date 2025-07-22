import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameETHColumnsToUSD1737540000000 implements MigrationInterface {
    name = 'RenameETHColumnsToUSD1737540000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename collateralAmountETH to collateralAmountUSD
        await queryRunner.query(`
            ALTER TABLE "positions" 
            RENAME COLUMN "collateralAmountETH" TO "collateralAmountUSD"
        `);
        
        // Rename debtAmountETH to debtAmountUSD
        await queryRunner.query(`
            ALTER TABLE "positions" 
            RENAME COLUMN "debtAmountETH" TO "debtAmountUSD"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert column names back to ETH
        await queryRunner.query(`
            ALTER TABLE "positions" 
            RENAME COLUMN "collateralAmountUSD" TO "collateralAmountETH"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            RENAME COLUMN "debtAmountUSD" TO "debtAmountETH"
        `);
    }
}

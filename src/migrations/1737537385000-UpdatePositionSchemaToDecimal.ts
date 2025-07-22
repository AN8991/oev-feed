import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePositionSchemaToDecimal1737537385000 implements MigrationInterface {
    name = 'UpdatePositionSchemaToDecimal1737537385000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update position table columns from bigint to decimal for human-readable values
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "collateralAmount" TYPE DECIMAL(36,18) USING "collateralAmount"::DECIMAL(36,18)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "collateralAmountETH" TYPE DECIMAL(36,18) USING "collateralAmountETH"::DECIMAL(36,18)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "debtAmount" TYPE DECIMAL(36,18) USING "debtAmount"::DECIMAL(36,18)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "debtAmountETH" TYPE DECIMAL(36,18) USING "debtAmountETH"::DECIMAL(36,18)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "healthFactor" TYPE DECIMAL(10,6) USING "healthFactor"::DECIMAL(10,6)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "liquidationThreshold" TYPE DECIMAL(5,2) USING "liquidationThreshold"::DECIMAL(5,2)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "ltv" TYPE DECIMAL(5,2) USING "ltv"::DECIMAL(5,2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to bigint (this will lose decimal precision)
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "collateralAmount" TYPE BIGINT USING "collateralAmount"::BIGINT
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "collateralAmountETH" TYPE BIGINT USING "collateralAmountETH"::BIGINT
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "debtAmount" TYPE BIGINT USING "debtAmount"::BIGINT
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "debtAmountETH" TYPE BIGINT USING "debtAmountETH"::BIGINT
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "healthFactor" TYPE BIGINT USING "healthFactor"::BIGINT
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "liquidationThreshold" TYPE BIGINT USING "liquidationThreshold"::BIGINT
        `);
        
        await queryRunner.query(`
            ALTER TABLE "positions" 
            ALTER COLUMN "ltv" TYPE BIGINT USING "ltv"::BIGINT
        `);
    }
}

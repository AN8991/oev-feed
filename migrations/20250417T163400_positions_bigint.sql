-- Migration: Alter positions table columns to bigint
ALTER TABLE positions ALTER COLUMN "collateralAmount" TYPE bigint USING "collateralAmount"::bigint;
ALTER TABLE positions ALTER COLUMN "collateralAmountETH" TYPE bigint USING "collateralAmountETH"::bigint;
ALTER TABLE positions ALTER COLUMN "debtAmount" TYPE bigint USING "debtAmount"::bigint;
ALTER TABLE positions ALTER COLUMN "debtAmountETH" TYPE bigint USING "debtAmountETH"::bigint;
ALTER TABLE positions ALTER COLUMN "healthFactor" TYPE bigint USING "healthFactor"::bigint;
ALTER TABLE positions ALTER COLUMN "liquidationThreshold" TYPE bigint USING "liquidationThreshold"::bigint;
ALTER TABLE positions ALTER COLUMN "ltv" TYPE bigint USING "ltv"::bigint;
ALTER TABLE positions ALTER COLUMN "lastUpdated" TYPE bigint USING "lastUpdated"::bigint;
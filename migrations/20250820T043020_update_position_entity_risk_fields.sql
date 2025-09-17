-- Migration: Update Position entity with risk assessment fields
-- Date: 2025-08-20T04:30:20Z
-- Description: Add comprehensive risk assessment fields to positions table

-- Add new columns for risk assessment
ALTER TABLE position 
ADD COLUMN IF NOT EXISTS network VARCHAR(50),
ADD COLUMN IF NOT EXISTS assetAddress VARCHAR(42),
ADD COLUMN IF NOT EXISTS assetSymbol VARCHAR(20),
ADD COLUMN IF NOT EXISTS collateralAmount DECIMAL(36,18),
ADD COLUMN IF NOT EXISTS collateralAmountUSD DECIMAL(36,2),
ADD COLUMN IF NOT EXISTS debtAmount DECIMAL(36,18),
ADD COLUMN IF NOT EXISTS debtAmountUSD DECIMAL(36,2),
ADD COLUMN IF NOT EXISTS liquidationThreshold VARCHAR(20),
ADD COLUMN IF NOT EXISTS ltv VARCHAR(20),
ADD COLUMN IF NOT EXISTS suppliedAssets JSONB,
ADD COLUMN IF NOT EXISTS borrowedAssets JSONB,
ADD COLUMN IF NOT EXISTS totalCollateralUSD DECIMAL(36,2),
ADD COLUMN IF NOT EXISTS totalDebtUSD DECIMAL(36,2),
ADD COLUMN IF NOT EXISTS lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Remove old columns that are no longer needed
ALTER TABLE position 
DROP COLUMN IF EXISTS asset,
DROP COLUMN IF EXISTS amount;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_position_user_address ON position(userAddress);
CREATE INDEX IF NOT EXISTS idx_position_protocol ON position(protocol);
CREATE INDEX IF NOT EXISTS idx_position_network ON position(network);
CREATE INDEX IF NOT EXISTS idx_position_health_factor ON position(healthFactor);
CREATE INDEX IF NOT EXISTS idx_position_last_updated ON position(lastUpdated);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_position_user_protocol ON position(userAddress, protocol);
CREATE INDEX IF NOT EXISTS idx_position_protocol_network ON position(protocol, network);

-- Add comments for documentation
COMMENT ON COLUMN position.network IS 'Blockchain network (ethereum, arbitrum, base, etc.)';
COMMENT ON COLUMN position.assetAddress IS 'Contract address of the primary asset';
COMMENT ON COLUMN position.assetSymbol IS 'Symbol of the primary asset (ETH, USDC, etc.)';
COMMENT ON COLUMN position.suppliedAssets IS 'JSON array of supplied assets with amounts and values';
COMMENT ON COLUMN position.borrowedAssets IS 'JSON array of borrowed assets with amounts and values';
COMMENT ON COLUMN position.healthFactor IS 'Position health factor as string';
COMMENT ON COLUMN position.liquidationThreshold IS 'Liquidation threshold percentage';
COMMENT ON COLUMN position.ltv IS 'Loan-to-value ratio percentage';
COMMENT ON COLUMN position.totalCollateralUSD IS 'Total collateral value in USD';
COMMENT ON COLUMN position.totalDebtUSD IS 'Total debt value in USD';

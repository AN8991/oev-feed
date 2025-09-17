-- Migration: Fix position table columns
-- Date: 2025-09-15T13:18:00
-- Description: Update lastUpdated column type from bigint to timestamp and ensure UUID support

-- First, add a temporary column for the new timestamp format
ALTER TABLE positions ADD COLUMN "lastUpdated_temp" TIMESTAMP;

-- Convert existing bigint timestamps to proper timestamps
-- Handle both millisecond and second timestamps
UPDATE positions 
SET "lastUpdated_temp" = CASE 
    WHEN LENGTH("lastUpdated"::text) = 13 THEN to_timestamp("lastUpdated"::bigint / 1000)
    WHEN LENGTH("lastUpdated"::text) = 10 THEN to_timestamp("lastUpdated"::bigint)
    ELSE CURRENT_TIMESTAMP
END;

-- Drop the old column and rename the new one
ALTER TABLE positions DROP COLUMN "lastUpdated";
ALTER TABLE positions RENAME COLUMN "lastUpdated_temp" TO "lastUpdated";

-- Make the column NOT NULL with a default
ALTER TABLE positions ALTER COLUMN "lastUpdated" SET NOT NULL;
ALTER TABLE positions ALTER COLUMN "lastUpdated" SET DEFAULT CURRENT_TIMESTAMP;

-- Ensure we have UUID extension for new position IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add index on the new timestamp column for better query performance
CREATE INDEX IF NOT EXISTS idx_positions_last_updated ON positions("lastUpdated");

-- Add composite index for risk assessment queries
CREATE INDEX IF NOT EXISTS idx_positions_user_protocol_network ON positions("userAddress", protocol, network);
CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON positions(risk_level);
CREATE INDEX IF NOT EXISTS idx_positions_health_factor ON positions("healthFactor");

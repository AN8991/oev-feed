-- Add risk assessment columns to positions table
-- Migration: 20250915T054900_add_risk_assessment_columns.sql

ALTER TABLE positions 
ADD COLUMN risk_score DECIMAL(5,2) NULL,
ADD COLUMN risk_level VARCHAR(20) NULL,
ADD COLUMN risk_assessed_at TIMESTAMP NULL;

-- Add index for risk-based queries
CREATE INDEX idx_positions_risk_level ON positions(risk_level);
CREATE INDEX idx_positions_risk_score ON positions(risk_score);
CREATE INDEX idx_positions_risk_assessed_at ON positions(risk_assessed_at);

-- Add comments for documentation
COMMENT ON COLUMN positions.risk_score IS 'Composite risk score (0-100, higher = more risky)';
COMMENT ON COLUMN positions.risk_level IS 'Risk level: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN positions.risk_assessed_at IS 'Timestamp when risk assessment was last calculated';

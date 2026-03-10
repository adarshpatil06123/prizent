-- Add brand mapping columns to p_marketplace_costs table
-- This enables brand-specific cost configurations per marketplace

USE admin_db;

-- Add brand_id and brand_name columns
ALTER TABLE p_marketplace_costs 
ADD COLUMN brand_id BIGINT NULL AFTER marketplace_id,
ADD COLUMN brand_name VARCHAR(255) NULL AFTER brand_id;

-- Add index for better query performance
CREATE INDEX idx_brand_id ON p_marketplace_costs(brand_id);
CREATE INDEX idx_marketplace_brand ON p_marketplace_costs(marketplace_id, brand_id);

SELECT 'Migration completed: brand_id and brand_name columns added to p_marketplace_costs' AS Status;

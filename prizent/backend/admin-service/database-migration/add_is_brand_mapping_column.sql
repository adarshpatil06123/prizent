-- Add is_brand_mapping column to distinguish brand mapping costs from marketplace-level costs with brand filter
ALTER TABLE p_marketplace_costs
    ADD COLUMN is_brand_mapping TINYINT(1) NOT NULL DEFAULT 0;

-- Mark existing brand-specific (brand mapping) rows
UPDATE p_marketplace_costs
SET is_brand_mapping = 1
WHERE brand_id IS NOT NULL;

-- Migration: Fix marketplace schema to support extended cost categories
-- Run this against admin_db

USE admin_db;

-- 1. Add missing acc_no column to p_marketplaces (compatible with MySQL versions without IF NOT EXISTS for columns)
SET @has_acc_no := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'p_marketplaces'
    AND COLUMN_NAME = 'acc_no'
);
SET @sql_acc_no := IF(
  @has_acc_no = 0,
  'ALTER TABLE p_marketplaces ADD COLUMN acc_no VARCHAR(255) DEFAULT NULL AFTER name',
  'SELECT ''acc_no already exists'' AS Status'
);
PREPARE stmt_acc_no FROM @sql_acc_no;
EXECUTE stmt_acc_no;
DEALLOCATE PREPARE stmt_acc_no;

-- 2. Add missing category_id column to p_marketplace_costs if needed
SET @has_category_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'p_marketplace_costs'
    AND COLUMN_NAME = 'category_id'
);
SET @sql_category_id := IF(
  @has_category_id = 0,
  'ALTER TABLE p_marketplace_costs ADD COLUMN category_id BIGINT DEFAULT NULL AFTER cost_product_range',
  'SELECT ''category_id already exists'' AS Status'
);
PREPARE stmt_category_id FROM @sql_category_id;
EXECUTE stmt_category_id;
DEALLOCATE PREPARE stmt_category_id;

-- 3. Expand cost_category column from VARCHAR(20) to VARCHAR(50)
ALTER TABLE p_marketplace_costs
  MODIFY COLUMN cost_category VARCHAR(50) NOT NULL;

-- 4. Drop restrictive CHECK constraints on p_marketplace_costs, if present
SET @drop_checks := (
  SELECT GROUP_CONCAT(CONCAT('DROP CHECK `', tc.CONSTRAINT_NAME, '`') SEPARATOR ', ')
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
  WHERE tc.TABLE_SCHEMA = DATABASE()
    AND tc.TABLE_NAME = 'p_marketplace_costs'
    AND tc.CONSTRAINT_TYPE = 'CHECK'
);
SET @sql_drop_checks := IF(
  @drop_checks IS NULL,
  'SELECT ''No CHECK constraints found'' AS Status',
  CONCAT('ALTER TABLE p_marketplace_costs ', @drop_checks)
);
PREPARE stmt_drop_checks FROM @sql_drop_checks;
EXECUTE stmt_drop_checks;
DEALLOCATE PREPARE stmt_drop_checks;

-- 5. Ensure helpful index exists for category filter queries
SET @has_category_index := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'p_marketplace_costs'
    AND INDEX_NAME = 'idx_marketplace_costs_category_id'
);
SET @sql_category_index := IF(
  @has_category_index = 0,
  'CREATE INDEX idx_marketplace_costs_category_id ON p_marketplace_costs(category_id)',
  'SELECT ''idx_marketplace_costs_category_id already exists'' AS Status'
);
PREPARE stmt_category_index FROM @sql_category_index;
EXECUTE stmt_category_index;
DEALLOCATE PREPARE stmt_category_index;

-- Database Migration: Performance Indexes for p_products table
-- These indexes are critical for production performance at scale
-- Run this after creating the products table

-- Primary client-based index (most important for tenant isolation)
CREATE INDEX idx_products_client ON p_products(client_id);

-- Composite index for filtering by product status within client
CREATE INDEX idx_products_status ON p_products(client_id, current_type);

-- Composite index for category-based filtering within client
CREATE INDEX idx_products_category ON p_products(client_id, category_id);

-- Composite index for brand-based filtering within client
CREATE INDEX idx_products_brand ON p_products(client_id, brand_id);

-- Unique constraint index for SKU uniqueness per client (if not already covered by constraint)
CREATE INDEX idx_products_sku ON p_products(client_id, sku_code);

-- Index for enabled status filtering within client (high frequency query)
CREATE INDEX idx_products_enabled ON p_products(client_id, enabled);

-- Composite index for sorting by creation time within client
CREATE INDEX idx_products_created ON p_products(client_id, create_date_time DESC);

-- Covering index for common filter queries (includes commonly selected columns)
CREATE INDEX idx_products_filter_covering ON p_products(
    client_id, enabled, current_type, brand_id, category_id
) INCLUDE (id, name, sku_code, mrp, create_date_time);

-- Index to support text search on product name (case-insensitive)
CREATE INDEX idx_products_name_search ON p_products(client_id, LOWER(name));

-- Index to support text search on SKU code (already uppercase)
CREATE INDEX idx_products_sku_search ON p_products(client_id, sku_code);
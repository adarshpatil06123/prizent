-- Database Migration: Create p_products table
-- Multi-tenant Product service table with strict constraints

CREATE TABLE p_products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand_id BIGINT NOT NULL,
    sku_code VARCHAR(100) NOT NULL,
    category_id BIGINT NOT NULL,
    mrp DECIMAL(12,2) DEFAULT 0.00,
    product_cost DECIMAL(12,2) DEFAULT 0.00,
    proposed_selling_price_sales DECIMAL(12,2) DEFAULT 0.00,
    proposed_selling_price_non_sales DECIMAL(12,2) DEFAULT 0.00,
    current_type CHAR(1) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    create_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    CONSTRAINT chk_current_type CHECK (current_type IN ('T','A','N')),
    CONSTRAINT uq_client_sku UNIQUE (client_id, sku_code)
);

-- Create index for better query performance
CREATE INDEX idx_products_client_id ON p_products(client_id);
CREATE INDEX idx_products_enabled ON p_products(enabled);
CREATE INDEX idx_products_brand_category ON p_products(brand_id, category_id);
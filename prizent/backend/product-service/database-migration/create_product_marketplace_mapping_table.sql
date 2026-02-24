-- Product Marketplace Mapping Table
-- Maps products to marketplaces they are sold on
-- Run against: product_db

CREATE TABLE IF NOT EXISTS p_product_marketplace_mapping (
    
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    client_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,

    marketplace_id BIGINT NOT NULL,
    marketplace_name VARCHAR(255) NOT NULL,

    product_marketplace_name VARCHAR(255),

    create_date_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date_time DATETIME DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP,

    updated_by BIGINT,

    -- Prevent duplicate mapping
    UNIQUE KEY uq_pmm_client_product_marketplace 
        (client_id, product_id, marketplace_id),

    -- Performance indexes
    INDEX idx_pmm_client (client_id),
    INDEX idx_pmm_product (product_id),
    INDEX idx_pmm_marketplace (marketplace_id)

) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci;

-- Consolidated schema generated from live MySQL structures on 2026-03-16
-- Source DBs: identity_db, admin_db, product_db, pricing_db

CREATE DATABASE IF NOT EXISTS prizent_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE prizent_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS p_password_recovery_histories;
DROP TABLE IF EXISTS p_login_logout_histories;
DROP TABLE IF EXISTS p_users;
DROP TABLE IF EXISTS p_clients;
DROP TABLE IF EXISTS p_marketplace_costs;
DROP TABLE IF EXISTS p_marketplaces;
DROP TABLE IF EXISTS p_custom_fields_values;
DROP TABLE IF EXISTS p_custom_fields_configuration;
DROP TABLE IF EXISTS p_categories;
DROP TABLE IF EXISTS p_brands;
DROP TABLE IF EXISTS p_product_marketplace_mapping;
DROP TABLE IF EXISTS p_products;
DROP TABLE IF EXISTS pricing_versions;

CREATE TABLE p_clients (
  id int NOT NULL AUTO_INCREMENT,
  enabled bit(1) NOT NULL,
  number_of_users_allowed int NOT NULL,
  create_date_time datetime(6) NOT NULL,
  update_date_time datetime(6) NOT NULL,
  logo varchar(500) DEFAULT NULL,
  name varchar(255) NOT NULL,
  client_domain varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_client_name (name),
  UNIQUE KEY client_domain (client_domain),
  UNIQUE KEY uk_client_domain (client_domain),
  KEY idx_clients_domain (client_domain),
  CONSTRAINT p_clients_chk_1 CHECK ((number_of_users_allowed >= 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_users (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  enabled bit(1) NOT NULL,
  create_date_time datetime(6) NOT NULL,
  update_date_time datetime(6) NOT NULL,
  phone_number varchar(20) DEFAULT NULL,
  employee_designation varchar(100) DEFAULT NULL,
  username varchar(100) NOT NULL,
  email_id varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  password varchar(255) NOT NULL,
  role enum('ADMIN','USER') NOT NULL,
  updated_by bigint DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_client_username (username),
  UNIQUE KEY uk_client_email (email_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_login_logout_histories (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  user_id bigint NOT NULL,
  login_date_time datetime(6) NOT NULL,
  logout_date_time datetime(6) DEFAULT NULL,
  user_name varchar(100) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_login_histories_client_id (client_id),
  KEY idx_login_histories_user_id (user_id),
  KEY idx_login_histories_login_date (login_date_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_password_recovery_histories (
  id int NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  user_id bigint NOT NULL,
  old_password varchar(255) NOT NULL,
  new_password varchar(255) NOT NULL,
  changed_time_date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_recovery_user_id (user_id),
  KEY idx_password_recovery_client_user (client_id, user_id),
  CONSTRAINT fk_password_recovery_user FOREIGN KEY (user_id) REFERENCES p_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_brands (
  enabled bit(1) NOT NULL,
  create_date_time datetime(6) NOT NULL,
  update_date_time datetime(6) NOT NULL,
  name varchar(100) NOT NULL,
  description varchar(500) DEFAULT NULL,
  logo varchar(255) DEFAULT NULL,
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int DEFAULT NULL,
  logo_url varchar(500) DEFAULT NULL,
  updated_at datetime(6) DEFAULT NULL,
  updated_by bigint DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_brands_client_name (name),
  KEY idx_brands_enabled (enabled),
  KEY idx_brands_client_id (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_categories (
  id int NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  create_date_time datetime(6) NOT NULL,
  enabled bit(1) NOT NULL,
  name varchar(255) NOT NULL,
  parent_category_id int DEFAULT NULL,
  update_date_time datetime(6) NOT NULL,
  updated_by bigint DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_client_name_parent (client_id, name, parent_category_id),
  KEY idx_categories_client_id (client_id),
  KEY idx_categories_parent_id (parent_category_id),
  KEY idx_categories_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_custom_fields_configuration (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  create_date_time datetime(6) NOT NULL,
  enabled bit(1) NOT NULL,
  field_type varchar(255) NOT NULL,
  module varchar(1) NOT NULL,
  name varchar(255) NOT NULL,
  required bit(1) NOT NULL,
  update_date_time datetime(6) DEFAULT NULL,
  updated_by bigint DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_custom_fields_values (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  create_date_time datetime(6) NOT NULL,
  module varchar(1) NOT NULL,
  module_id bigint NOT NULL,
  updated_by bigint DEFAULT NULL,
  value text,
  custom_field_id bigint NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_marketplaces (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  name varchar(255) NOT NULL,
  acc_no varchar(100) DEFAULT NULL,
  description varchar(500) DEFAULT NULL,
  enabled tinyint(1) DEFAULT '1',
  create_date_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by bigint DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_marketplaces_client_name (client_id, name),
  KEY idx_marketplaces_client_id (client_id),
  KEY idx_marketplaces_client_enabled (client_id, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_marketplace_costs (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  marketplace_id bigint NOT NULL,
  cost_category varchar(50) NOT NULL,
  cost_value_type char(1) NOT NULL COMMENT 'A (amount) or P (percentage)',
  cost_value decimal(12,2) NOT NULL,
  cost_product_range varchar(100) NOT NULL,
  enabled tinyint(1) DEFAULT '1',
  create_date_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by bigint DEFAULT NULL,
  category_id bigint DEFAULT NULL COMMENT 'Category ID filter for this cost slab (NULL = applies to all categories)',
  brand_id bigint DEFAULT NULL,
  brand_name varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_marketplace_costs_client_id (client_id),
  KEY idx_marketplace_costs_marketplace_id (marketplace_id),
  KEY idx_marketplace_costs_client_marketplace (client_id, marketplace_id),
  KEY idx_marketplace_costs_client_marketplace_brand (client_id, marketplace_id),
  CONSTRAINT p_marketplace_costs_ibfk_1 FOREIGN KEY (marketplace_id) REFERENCES p_marketplaces (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_products (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id int NOT NULL,
  name varchar(255) NOT NULL,
  product_number varchar(250) DEFAULT NULL,
  style_code varchar(250) DEFAULT NULL,
  brand_id bigint NOT NULL,
  sku_code varchar(100) NOT NULL,
  category_id bigint NOT NULL,
  mrp decimal(12,2) DEFAULT '0.00',
  product_cost decimal(12,2) DEFAULT '0.00',
  proposed_selling_price_sales decimal(12,2) DEFAULT '0.00',
  proposed_selling_price_non_sales decimal(12,2) DEFAULT '0.00',
  enabled tinyint(1) DEFAULT '1',
  create_date_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by bigint DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_sku (client_id, sku_code),
  KEY idx_products_client_id (client_id),
  KEY idx_products_enabled (enabled),
  KEY idx_products_brand_category (brand_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE p_product_marketplace_mapping (
  id bigint NOT NULL AUTO_INCREMENT,
  client_id bigint NOT NULL,
  product_id bigint NOT NULL,
  product_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  marketplace_id bigint NOT NULL,
  marketplace_name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  product_marketplace_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  create_date_time datetime DEFAULT CURRENT_TIMESTAMP,
  updated_date_time datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by bigint DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pmm_client_product_marketplace (client_id, product_id, marketplace_id),
  KEY idx_pmm_client (client_id),
  KEY idx_pmm_product (product_id),
  KEY idx_pmm_marketplace (marketplace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pricing_versions (
  id bigint NOT NULL AUTO_INCREMENT,
  created_at datetime(6) NOT NULL,
  effective_from datetime(6) NOT NULL,
  marketplace_id bigint NOT NULL,
  profit_percentage decimal(10,4) NOT NULL,
  selling_price decimal(19,4) NOT NULL,
  sku_id bigint NOT NULL,
  status enum('SCHEDULED','ACTIVE','EXPIRED') NOT NULL,
  updated_at datetime(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sku_marketplace (sku_id, marketplace_id),
  KEY idx_status (status),
  KEY idx_effective_from (effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

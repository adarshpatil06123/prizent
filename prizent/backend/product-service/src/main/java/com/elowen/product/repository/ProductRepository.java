package com.elowen.product.repository;

import com.elowen.product.entity.Product;
import com.elowen.product.entity.ProductType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for Product entity
 * Provides multi-tenant safe database operations
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Find product by client ID and SKU code (for duplicate check)
     * Used to ensure SKU uniqueness per client
     */
    Optional<Product> findByClientIdAndSkuCode(Integer clientId, String skuCode);

    /**
     * Find all enabled products for a client with pagination
     * Used for listing products
     */
    Page<Product> findByClientIdAndEnabledTrue(Integer clientId, Pageable pageable);

    /**
     * Find all products for a client with pagination (including disabled)
     * Used for admin views where disabled products should be shown
     */
    Page<Product> findByClientId(Integer clientId, Pageable pageable);

    /**
     * Find product by ID and client ID (tenant isolation)
     * Used for get by ID operations with security
     */
    Optional<Product> findByIdAndClientId(Long id, Integer clientId);

    /**
     * Check if SKU exists for a client (excluding a specific product ID)
     * Used during updates to avoid duplicate SKU validation for the same product
     */
    @Query("SELECT COUNT(p) > 0 FROM Product p WHERE p.clientId = :clientId AND p.skuCode = :skuCode AND p.id != :excludeId")
    boolean existsByClientIdAndSkuCodeExcludingId(@Param("clientId") Integer clientId, 
                                                  @Param("skuCode") String skuCode, 
                                                  @Param("excludeId") Long excludeId);

    /**
     * Count enabled products for a client
     * Useful for dashboard statistics
     */
    long countByClientIdAndEnabledTrue(Integer clientId);

    /**
     * Count total products for a client
     * Useful for dashboard statistics
     */
    long countByClientId(Integer clientId);

    // FILTER METHODS FOR PART 2

    /**
     * Filter products by client ID, enabled status and product type
     */
    Page<Product> findByClientIdAndEnabledTrueAndCurrentType(Integer clientId, ProductType currentType, Pageable pageable);

    /**
     * Filter products by client ID, enabled status and brand ID
     */
    Page<Product> findByClientIdAndEnabledTrueAndBrandId(Integer clientId, Long brandId, Pageable pageable);

    /**
     * Filter products by client ID, enabled status and category ID
     */
    Page<Product> findByClientIdAndEnabledTrueAndCategoryId(Integer clientId, Long categoryId, Pageable pageable);

    /**
     * Filter products by client ID, enabled status and name containing keyword (case insensitive)
     */
    Page<Product> findByClientIdAndEnabledTrueAndNameContainingIgnoreCase(Integer clientId, String name, Pageable pageable);

    /**
     * Filter products by client ID, enabled status and SKU code containing keyword (case insensitive)
     */
    Page<Product> findByClientIdAndEnabledTrueAndSkuCodeContainingIgnoreCase(Integer clientId, String skuCode, Pageable pageable);

    /**
     * Filter products by multiple criteria using custom query
     * This allows combining multiple filters efficiently with safe null checks
     */
    @Query("SELECT p FROM Product p WHERE p.clientId = :clientId AND p.enabled = true " +
           "AND (:status IS NULL OR p.currentType = :status) " +
           "AND (:brandId IS NULL OR p.brandId = :brandId) " +
           "AND (:categoryId IS NULL OR p.categoryId = :categoryId) " +
           "AND (:search IS NULL OR (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.skuCode) LIKE LOWER(CONCAT('%', :search, '%'))))")
    Page<Product> findByMultipleFilters(@Param("clientId") Integer clientId,
                                       @Param("status") ProductType status,
                                       @Param("brandId") Long brandId,
                                       @Param("categoryId") Long categoryId,
                                       @Param("search") String search,
                                       Pageable pageable);
}
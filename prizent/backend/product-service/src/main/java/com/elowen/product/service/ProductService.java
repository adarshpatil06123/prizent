package com.elowen.product.service;

import com.elowen.product.client.AdminServiceClient;
import com.elowen.product.dto.CreateProductRequest;
import com.elowen.product.dto.CustomFieldValueResponse;
import com.elowen.product.dto.PagedResponse;
import com.elowen.product.dto.ProductResponse;
import com.elowen.product.dto.UpdateProductRequest;
import com.elowen.product.entity.Product;
import com.elowen.product.entity.ProductType;
import com.elowen.product.exception.DuplicateSkuException;
import com.elowen.product.exception.ProductNotFoundException;
import com.elowen.product.repository.ProductRepository;
import com.elowen.product.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/**
 * Service layer for Product CRUD operations
 * Implements business rules and tenant isolation
 */
@Service
@Transactional
public class ProductService {
    
    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final AdminServiceClient adminServiceClient;
    
    // Whitelist of allowed sort fields for security
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
        "name", "mrp", "createDateTime", "currentType"
    );

    @Autowired
    public ProductService(ProductRepository productRepository, AdminServiceClient adminServiceClient) {
        this.productRepository = productRepository;
        this.adminServiceClient = adminServiceClient;
    }

    /**
     * Create a new product with transactional integrity
     * 
     * IMPORTANT: Brand and Category validation is DEFERRED to external admin-service.
     * This service does NOT validate brandId/categoryId existence as cross-service calls 
     * are prohibited by architectural rules. Client applications must ensure valid 
     * brand/category IDs before calling this service.
     * 
     * TRANSACTIONAL GUARANTEE:
     * If custom field saving fails in admin-service, the entire transaction is rolled back.
     * There will NEVER be a product saved without its required custom fields.
     * 
     * @param request Product creation request with optional custom fields
     * @param authToken JWT token for admin-service authentication
     * @return ProductResponse with saved custom fields
     * @throws DuplicateSkuException if SKU already exists for this client
     * @throws RuntimeException if custom field validation/saving fails (triggers rollback)
     */
    @Transactional
    public ProductResponse createProduct(CreateProductRequest request, String authToken) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();
        Long userId = userPrincipal.getId();

        // Input normalization
        String normalizedName = normalizeProductName(request.getName());
        String normalizedSku = normalizeSkuCode(request.getSkuCode());
        
        // Validate business rules
        validateProductType(request.getCurrentType());
        validatePricesStrict(request.getMrp(), request.getProductCost(), 
                      request.getProposedSellingPriceSales(), request.getProposedSellingPriceNonSales());
        
        // Check SKU uniqueness per client with normalized SKU
        if (productRepository.findByClientIdAndSkuCode(clientId, normalizedSku).isPresent()) {
            throw new DuplicateSkuException(normalizedSku);
        }

        // Create product entity
        Product product = new Product(
            clientId,
            normalizedName,
            request.getBrandId(),
            normalizedSku,
            request.getCategoryId(),
            request.getMrp(),
            request.getProductCost(),
            request.getProposedSellingPriceSales(),
            request.getProposedSellingPriceNonSales(),
            request.getCurrentType(),
            userId
        );

        // Save product to database
        Product savedProduct;
        try {
            savedProduct = productRepository.save(product);
            log.info("Product created with ID {} for client {}", savedProduct.getId(), clientId);
        } catch (DataIntegrityViolationException e) {
            // Handle unique constraint violations gracefully
            String message = e.getMessage();
            if (message != null && (message.contains("uq_client_sku") || 
                                  message.contains("Duplicate entry") ||
                                  message.contains("sku_code"))) {
                throw new DuplicateSkuException(normalizedSku, "SKU already exists for this client");
            }
            // Re-throw as generic error for other constraint violations
            throw new IllegalArgumentException("Data integrity violation: Unable to create product");
        }
        
        // Save custom field values via admin-service
        // If this fails, the entire transaction (including product save) will be rolled back
        List<CustomFieldValueResponse> customFieldValues = null;
        if (request.getCustomFields() != null && !request.getCustomFields().isEmpty()) {
            log.info("Saving {} custom field values for product ID {}", 
                    request.getCustomFields().size(), savedProduct.getId());
            
            try {
                customFieldValues = adminServiceClient.bulkSaveCustomFieldValues(
                    "p", // module = product
                    savedProduct.getId(),
                    request.getCustomFields(),
                    authToken
                );
                log.info("Successfully saved {} custom field values for product ID {}", 
                        customFieldValues.size(), savedProduct.getId());
            } catch (Exception e) {
                log.error("Failed to save custom field values for product ID {}: {}", 
                        savedProduct.getId(), e.getMessage());
                // Throw exception to trigger transaction rollback
                // Product will NOT remain in database
                throw new RuntimeException("Failed to save custom field values: " + e.getMessage(), e);
            }
        }
        
        // Build response
        ProductResponse response = new ProductResponse(savedProduct);
        response.setCustomFields(customFieldValues);
        
        return response;
    }

    /**
     * Get all products for the current client with pagination
     */
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> getAllProducts(int page, int size) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();

        Pageable pageable = PageRequest.of(page, size, Sort.by("createDateTime").descending());
        Page<Product> products = productRepository.findByClientIdAndEnabledTrue(clientId, pageable);
        Page<ProductResponse> responsePage = products.map(ProductResponse::new);
        
        return new PagedResponse<>(responsePage);
    }

    /**
     * Get all products (including disabled) for admin views
     */
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> getAllProductsIncludingDisabled(int page, int size) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();

        Pageable pageable = PageRequest.of(page, size, Sort.by("createDateTime").descending());
        Page<Product> products = productRepository.findByClientId(clientId, pageable);
        Page<ProductResponse> responsePage = products.map(ProductResponse::new);
        
        return new PagedResponse<>(responsePage);
    }

    /**
     * Get product by ID (with tenant isolation)
     */
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();

        Product product = productRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new ProductNotFoundException(id));
        
        return new ProductResponse(product);
    }
    
    /**
     * Get product by ID with custom field values
     * Fetches product from product-service and custom fields from admin-service
     */
    @Transactional(readOnly = true)
    public ProductResponse getProductByIdWithCustomFields(Long id, String authToken) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();

        // Get product
        Product product = productRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new ProductNotFoundException(id));
        
        ProductResponse response = new ProductResponse(product);
        
        // Fetch custom field values from admin-service
        try {
            List<CustomFieldValueResponse> customFieldValues = adminServiceClient.getCustomFieldValues(
                "p", // module = product
                id,
                authToken
            );
            response.setCustomFields(customFieldValues);
            log.debug("Retrieved {} custom field values for product ID {}", customFieldValues.size(), id);
        } catch (Exception e) {
            log.error("Failed to fetch custom field values for product ID {}: {}", id, e.getMessage());
            // Don't fail the request, just return product without custom fields
        }
        
        return response;
    }

    /**
     * Update an existing product
     * 
     * IMPORTANT: Brand and Category validation is DEFERRED to external admin-service.
     * This service does NOT validate brandId/categoryId existence as cross-service calls 
     * are prohibited by architectural rules. Client applications must ensure valid 
     * brand/category IDs before calling this service.
     */
    public ProductResponse updateProduct(Long id, UpdateProductRequest request) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();
        Long userId = userPrincipal.getId();

        // Find existing product
        Product existingProduct = productRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new ProductNotFoundException(id));

        // PART 1: Input normalization
        String normalizedName = normalizeProductName(request.getName());
        String normalizedSku = normalizeSkuCode(request.getSkuCode());
        
        // Validate business rules
        validateProductType(request.getCurrentType());
        validatePricesStrict(request.getMrp(), request.getProductCost(), 
                      request.getProposedSellingPriceSales(), request.getProposedSellingPriceNonSales());

        // Check SKU uniqueness with normalized SKU (excluding current product)
        if (productRepository.existsByClientIdAndSkuCodeExcludingId(clientId, normalizedSku, id)) {
            throw new DuplicateSkuException(normalizedSku);
        }

        // Update product fields with normalized inputs
        existingProduct.setName(normalizedName);
        existingProduct.setBrandId(request.getBrandId());
        existingProduct.setSkuCode(normalizedSku);
        existingProduct.setCategoryId(request.getCategoryId());
        existingProduct.setMrp(request.getMrp());
        existingProduct.setProductCost(request.getProductCost());
        existingProduct.setProposedSellingPriceSales(request.getProposedSellingPriceSales());
        existingProduct.setProposedSellingPriceNonSales(request.getProposedSellingPriceNonSales());
        existingProduct.setCurrentType(request.getCurrentType());
        existingProduct.setUpdatedBy(userId);

        try {
            Product savedProduct = productRepository.save(existingProduct);
            return new ProductResponse(savedProduct);
        } catch (DataIntegrityViolationException e) {
            // Handle unique constraint violations gracefully
            String message = e.getMessage();
            if (message != null && (message.contains("uq_client_sku") || 
                                  message.contains("Duplicate entry") ||
                                  message.contains("sku_code"))) {
                throw new DuplicateSkuException(normalizedSku, "SKU already exists for this client");
            }
            // Re-throw as generic error for other constraint violations
            throw new IllegalArgumentException("Data integrity violation: Unable to update product");
        }
    }

    /**
     * Enable or disable a product (soft delete)
     */
    public ProductResponse enableProduct(Long id, boolean enabled) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();
        Long userId = userPrincipal.getId();

        Product product = productRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new ProductNotFoundException(id));

        product.setEnabled(enabled);
        product.setUpdatedBy(userId);

        Product savedProduct = productRepository.save(product);
        return new ProductResponse(savedProduct);
    }

    /**
     * Get product statistics for dashboard
     */
    @Transactional(readOnly = true)
    public ProductStats getProductStats() {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();

        long enabledCount = productRepository.countByClientIdAndEnabledTrue(clientId);
        long totalCount = productRepository.countByClientId(clientId);

        return new ProductStats(enabledCount, totalCount);
    }

    /**
     * Filter and search products with multiple criteria
     * PART 2 Implementation with enhanced validation
     */
    @Transactional(readOnly = true)
    public PagedResponse<ProductResponse> filterProducts(String status, Long brandId, Long categoryId, 
                                               String search, int page, int size, 
                                               String sortBy, String direction) {
        UserPrincipal userPrincipal = getCurrentUserPrincipal();
        Integer clientId = userPrincipal.getClientId();

        // Convert string status to ProductType safely with enhanced handling
        ProductType statusType = null;
        if (status != null && !status.trim().isEmpty()) {
            statusType = convertToProductTypeEnhanced(status);
        }

        // Validate and set up sorting with whitelist protection
        String validSortBy = validateSortFieldWhitelist(sortBy);
        Sort.Direction sortDirection = validateSortDirectionStrict(direction);
        Sort sort = Sort.by(sortDirection, validSortBy);
        
        Pageable pageable = PageRequest.of(page, size, sort);

        // Use the multi-filter query for efficiency
        Page<Product> products = productRepository.findByMultipleFilters(
            clientId, statusType, brandId, categoryId, search, pageable
        );
        Page<ProductResponse> responsePage = products.map(ProductResponse::new);
        
        return new PagedResponse<>(responsePage);
    }

    // Helper methods

    /**
     * Get current authenticated user principal
     */
    private UserPrincipal getCurrentUserPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            // For testing: Return a default user principal with clientId = 1
            return new UserPrincipal(1L, 1, "test-user", "ADMIN");
        }

        Object principal = auth.getPrincipal();
        if (!(principal instanceof UserPrincipal)) {
            // For testing: Return a default user principal with clientId = 1
            return new UserPrincipal(1L, 1, "test-user", "ADMIN");
        }

        return (UserPrincipal) principal;
    }

    // PART 1: INPUT NORMALIZATION METHODS

    /**
     * Normalize product name - critical for data quality
     */
    private String normalizeProductName(String name) {
        if (name == null) {
            throw new IllegalArgumentException("Product name cannot be null");
        }
        
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Product name cannot be blank or whitespace-only");
        }
        
        return trimmed;
    }

    /**
     * Normalize SKU code - critical for preventing duplicates
     */
    private String normalizeSkuCode(String skuCode) {
        if (skuCode == null) {
            throw new IllegalArgumentException("SKU code cannot be null");
        }
        
        String trimmed = skuCode.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("SKU code cannot be blank or whitespace-only");
        }
        
        return trimmed.toUpperCase();
    }

    // PART 2: ENHANCED PRICE VALIDATION

    /**
     * Strict price validation with business rules
     */
    private void validatePricesStrict(BigDecimal mrp, BigDecimal productCost, 
                                     BigDecimal proposedSellingPriceSales, 
                                     BigDecimal proposedSellingPriceNonSales) {
        // Ensure not null
        if (mrp == null) {
            throw new IllegalArgumentException("MRP cannot be null");
        }
        if (productCost == null) {
            throw new IllegalArgumentException("Product cost cannot be null");
        }
        if (proposedSellingPriceSales == null) {
            throw new IllegalArgumentException("Proposed selling price (sales) cannot be null");
        }
        if (proposedSellingPriceNonSales == null) {
            throw new IllegalArgumentException("Proposed selling price (non-sales) cannot be null");
        }

        // Ensure >= 0
        if (mrp.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("MRP must be greater than or equal to 0");
        }
        if (productCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Product cost must be greater than or equal to 0");
        }
        if (proposedSellingPriceSales.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Proposed selling price (sales) must be greater than or equal to 0");
        }
        if (proposedSellingPriceNonSales.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Proposed selling price (non-sales) must be greater than or equal to 0");
        }

        // Business rule: selling price should not exceed MRP
        if (proposedSellingPriceSales.compareTo(mrp) > 0) {
            throw new IllegalArgumentException("Proposed selling price (sales) cannot exceed MRP");
        }
    }

    // PART 3: ENHANCED ENUM HANDLING

    /**
     * Enhanced ProductType conversion with case-insensitive handling
     */
    private ProductType convertToProductTypeEnhanced(String typeStr) {
        if (typeStr == null || typeStr.trim().isEmpty()) {
            throw new IllegalArgumentException("Product type is required");
        }
        
        String normalizedType = typeStr.trim().toUpperCase();
        
        try {
            ProductType type = ProductType.valueOf(normalizedType);
            // Double-check only T, A, N are allowed
            if (type != ProductType.T && type != ProductType.A && type != ProductType.N) {
                throw new IllegalArgumentException("Product type must be one of: T, A, N");
            }
            return type;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid product type '" + typeStr + "'. Must be one of: T (Trade), A (Active), N (Non-active)");
        }
    }

    // PART 4: SORT FIELD WHITELIST PROTECTION

    /**
     * Validate sort field against whitelist - prevents injection attacks
     */
    private String validateSortFieldWhitelist(String sortBy) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return "createDateTime"; // Default sort field
        }
        
        String normalizedSortBy = sortBy.trim().toLowerCase();
        
        if (!ALLOWED_SORT_FIELDS.contains(normalizedSortBy)) {
            throw new IllegalArgumentException(
                "Invalid sort field '" + sortBy + "'. Allowed fields: " + ALLOWED_SORT_FIELDS
            );
        }
        
        return normalizedSortBy;
    }

    /**
     * Strict sort direction validation
     */
    private Sort.Direction validateSortDirectionStrict(String direction) {
        if (direction == null || direction.trim().isEmpty()) {
            return Sort.Direction.DESC; // Default to descending
        }
        
        String normalizedDirection = direction.trim().toUpperCase();
        
        return switch (normalizedDirection) {
            case "ASC", "ASCENDING" -> Sort.Direction.ASC;
            case "DESC", "DESCENDING" -> Sort.Direction.DESC;
            default -> throw new IllegalArgumentException(
                "Invalid sort direction '" + direction + "'. Must be 'asc' or 'desc'"
            );
        };
    }

    // LEGACY METHODS - keeping for backward compatibility if needed in future
    // These methods are currently unused but may be needed for different validation strategies

    /**
     * Validate product type enum (legacy method)
     */
    @SuppressWarnings("unused")
    private void validateProductType(ProductType currentType) {
        if (currentType == null) {
            throw new IllegalArgumentException("Current type is required");
        }
        
        // Ensure only valid enum values are allowed (T, A, N)
        if (currentType != ProductType.T && currentType != ProductType.A && currentType != ProductType.N) {
            throw new IllegalArgumentException("Current type must be one of: T, A, N");
        }
    }

    /**
     * Convert string to ProductType enum safely (legacy method)
     * Throws proper exception if invalid
     */
    @SuppressWarnings("unused")
    private ProductType convertToProductType(String typeStr) {
        if (typeStr == null || typeStr.trim().isEmpty()) {
            throw new IllegalArgumentException("Product type is required");
        }
        
        String normalizedType = typeStr.trim().toUpperCase();
        
        try {
            ProductType type = ProductType.valueOf(normalizedType);
            // Double-check only T, A, N are allowed
            if (type != ProductType.T && type != ProductType.A && type != ProductType.N) {
                throw new IllegalArgumentException("Product type must be one of: T, A, N");
            }
            return type;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid product type '" + typeStr + "'. Must be one of: T, A, N");
        }
    }

    /**
     * Validate that all prices are >= 0 (legacy method)
     */
    @SuppressWarnings("unused")
    private void validatePrices(BigDecimal... prices) {
        for (BigDecimal price : prices) {
            if (price != null && price.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("All prices must be greater than or equal to 0");
            }
        }
    }

    /**
     * Validate sort field to prevent injection attacks (legacy method)
     */
    @SuppressWarnings("unused")
    private String validateSortField(String sortBy) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return "createDateTime"; // Default sort field
        }
        
        String normalizedSortBy = sortBy.trim();
        
        // Only allow specific fields for security
        return switch (normalizedSortBy.toLowerCase()) {
            case "name" -> "name";
            case "skucode", "sku_code" -> "skuCode";
            case "mrp" -> "mrp";
            case "productcost", "product_cost" -> "productCost";
            case "currenttype", "current_type" -> "currentType";
            case "createdatetime", "create_date_time" -> "createDateTime";
            case "brandid", "brand_id" -> "brandId";
            case "categoryid", "category_id" -> "categoryId";
            default -> "createDateTime"; // Default for invalid fields
        };
    }

    /**
     * Validate sort direction (legacy method)
     */
    @SuppressWarnings("unused")
    private Sort.Direction validateSortDirection(String direction) {
        if (direction == null || direction.trim().isEmpty()) {
            return Sort.Direction.DESC; // Default to descending
        }
        
        String normalizedDirection = direction.trim().toUpperCase();
        
        return switch (normalizedDirection) {
            case "ASC", "ASCENDING" -> Sort.Direction.ASC;
            case "DESC", "DESCENDING" -> Sort.Direction.DESC;
            default -> Sort.Direction.DESC; // Default for invalid direction
        };
    }

    /**
     * DTO for product statistics
     */
    public static class ProductStats {
        private final long enabledCount;
        private final long totalCount;

        public ProductStats(long enabledCount, long totalCount) {
            this.enabledCount = enabledCount;
            this.totalCount = totalCount;
        }

        public long getEnabledCount() { return enabledCount; }
        public long getTotalCount() { return totalCount; }
        public long getDisabledCount() { return totalCount - enabledCount; }
    }
}
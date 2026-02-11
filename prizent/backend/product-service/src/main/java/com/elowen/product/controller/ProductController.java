package com.elowen.product.controller;

import com.elowen.product.dto.CreateProductRequest;
import com.elowen.product.dto.PagedResponse;
import com.elowen.product.dto.ProductResponse;
import com.elowen.product.dto.UpdateProductRequest;
import com.elowen.product.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for Product CRUD operations
 * Base path: /api/products
 */
@RestController
@RequestMapping("/api/products")
@PreAuthorize("hasRole('ADMIN')")
public class ProductController {

    private final ProductService productService;

    @Autowired
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    /**
     * Create a new product
     * POST /api/products
     */
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductResponse response = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all products with pagination (enabled only)
     * GET /api/products?page=0&size=20
     */
    @GetMapping
    public ResponseEntity<PagedResponse<ProductResponse>> getAllProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        PagedResponse<ProductResponse> products = productService.getAllProducts(page, size);
        return ResponseEntity.ok(products);
    }

    /**
     * Get all products including disabled (for admin views)
     * GET /api/products/all?page=0&size=20
     */
    @GetMapping("/all")
    public ResponseEntity<PagedResponse<ProductResponse>> getAllProductsIncludingDisabled(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        PagedResponse<ProductResponse> products = productService.getAllProductsIncludingDisabled(page, size);
        return ResponseEntity.ok(products);
    }

    /**
     * Get product by ID
     * GET /api/products/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        ProductResponse response = productService.getProductById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Update an existing product
     * PUT /api/products/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProductRequest request) {
        
        ProductResponse response = productService.updateProduct(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Enable or disable a product (soft delete)
     * PATCH /api/products/{id}/enable?enabled=false
     */
    @PatchMapping("/{id}/enable")
    public ResponseEntity<ProductResponse> enableProduct(
            @PathVariable Long id,
            @RequestParam boolean enabled) {
        
        ProductResponse response = productService.enableProduct(id, enabled);
        return ResponseEntity.ok(response);
    }

    /**
     * Get product statistics for dashboard
     * GET /api/products/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ProductService.ProductStats> getProductStats() {
        ProductService.ProductStats stats = productService.getProductStats();
        return ResponseEntity.ok(stats);
    }

    /**
     * Filter and search products with multiple criteria
     * GET /api/products/filter?status=T&brandId=1&categoryId=2&search=keyword&page=0&size=20&sortBy=name&direction=asc
     * PART 2 Implementation with enhanced validation
     */
    @GetMapping("/filter")
    public ResponseEntity<PagedResponse<ProductResponse>> filterProducts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long brandId, 
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createDateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        PagedResponse<ProductResponse> products = productService.filterProducts(
            status, brandId, categoryId, search, page, size, sortBy, direction
        );
        return ResponseEntity.ok(products);
    }
}
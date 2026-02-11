package com.elowen.product.exception;

/**
 * Exception thrown when a product is not found or not accessible for the client
 */
public class ProductNotFoundException extends RuntimeException {
    
    public ProductNotFoundException(Long productId) {
        super(String.format("Product with ID %d not found or not accessible", productId));
    }
    
    public ProductNotFoundException(String message) {
        super(message);
    }
}
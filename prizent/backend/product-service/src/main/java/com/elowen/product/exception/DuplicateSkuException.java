package com.elowen.product.exception;

/**
 * Exception thrown when a duplicate SKU code is detected within a client
 */
public class DuplicateSkuException extends RuntimeException {
    
    public DuplicateSkuException(String skuCode) {
        super(String.format("SKU code '%s' already exists for this client", skuCode));
    }
    
    public DuplicateSkuException(String skuCode, String message) {
        super(String.format("SKU code '%s': %s", skuCode, message));
    }
}
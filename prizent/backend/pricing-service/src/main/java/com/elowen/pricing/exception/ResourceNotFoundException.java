package com.elowen.pricing.exception;

/** Thrown when a product or marketplace is not found in the downstream service. */
public class ResourceNotFoundException extends RuntimeException {
    private final String resourceType;

    public ResourceNotFoundException(String resourceType, Long id) {
        super(resourceType + " not found with id: " + id);
        this.resourceType = resourceType;
    }

    public String getResourceType() { return resourceType; }
}

package com.elowen.product.dto;

import jakarta.validation.constraints.NotNull;

/**
 * DTO for custom field value in product creation/update requests
 * Minimal version - full validation happens in admin-service
 */
public class CustomFieldValueRequest {
    
    @NotNull(message = "Field ID is required")
    private Long fieldId;
    
    private String value;
    
    // Constructors
    public CustomFieldValueRequest() {}
    
    public CustomFieldValueRequest(Long fieldId, String value) {
        this.fieldId = fieldId;
        this.value = value;
    }
    
    // Getters and Setters
    public Long getFieldId() {
        return fieldId;
    }
    
    public void setFieldId(Long fieldId) {
        this.fieldId = fieldId;
    }
    
    public String getValue() {
        return value;
    }
    
    public void setValue(String value) {
        this.value = value;
    }
    
    @Override
    public String toString() {
        return "CustomFieldValueRequest{" +
                "fieldId=" + fieldId +
                ", value='" + value + '\'' +
                '}';
    }
}

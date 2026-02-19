package com.elowen.admin.dto;

import jakarta.validation.constraints.NotNull;

/**
 * DTO representing a single custom field value item for bulk operations
 */
public class CustomFieldValueItem {
    
    @NotNull(message = "Field ID is required")
    private Long fieldId;
    
    private String value;
    
    // Constructors
    public CustomFieldValueItem() {}
    
    public CustomFieldValueItem(Long fieldId, String value) {
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
        return "CustomFieldValueItem{" +
                "fieldId=" + fieldId +
                ", value='" + value + '\'' +
                '}';
    }
}

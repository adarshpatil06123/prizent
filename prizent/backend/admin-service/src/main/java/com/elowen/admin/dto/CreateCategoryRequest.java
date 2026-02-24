package com.elowen.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO for creating a new category
 * 
 * SECURITY NOTE:
 * - client_id is extracted from authenticated UserPrincipal, NOT from request
 * - parentCategoryId is optional (null means root category)
 */
public class CreateCategoryRequest {
    
    @NotBlank(message = "Category name is required")
    @Size(max = 255, message = "Category name must not exceed 255 characters")
    private String name;
    
    /**
     * Parent category ID - optional (null for root categories)
     * Must be a valid category ID belonging to the same client
     */
    private Integer parentCategoryId;

    /**
     * Whether the category is enabled on creation (defaults to true)
     */
    private Boolean enabled = true;
    
    // Constructors
    public CreateCategoryRequest() {}
    
    public CreateCategoryRequest(String name, Integer parentCategoryId) {
        this.name = name;
        this.parentCategoryId = parentCategoryId;
    }
    
    // Getters and Setters
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public Integer getParentCategoryId() {
        return parentCategoryId;
    }
    
    public void setParentCategoryId(Integer parentCategoryId) {
        this.parentCategoryId = parentCategoryId;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public String toString() {
        return "CreateCategoryRequest{" +
                "name='" + name + '\'' +
                ", parentCategoryId=" + parentCategoryId +
                '}';
    }
}

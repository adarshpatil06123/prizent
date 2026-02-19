package com.elowen.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * DTO for bulk saving custom field values
 * 
 * SECURITY NOTE:
 * - client_id is extracted from authenticated UserPrincipal, NOT from request
 */
public class BulkSaveCustomFieldValuesRequest {
    
    @NotBlank(message = "Module is required")
    @Pattern(regexp = "^[pmbc]$", message = "Module must be one of: p (product), m (marketplace), b (brand), c (category)")
    private String module;
    
    @NotNull(message = "Module ID is required")
    private Long moduleId;
    
    @Valid
    private List<CustomFieldValueItem> values;
    
    // Constructors
    public BulkSaveCustomFieldValuesRequest() {}
    
    public BulkSaveCustomFieldValuesRequest(String module, Long moduleId, List<CustomFieldValueItem> values) {
        this.module = module;
        this.moduleId = moduleId;
        this.values = values;
    }
    
    // Getters and Setters
    public String getModule() {
        return module;
    }
    
    public void setModule(String module) {
        this.module = module;
    }
    
    public Long getModuleId() {
        return moduleId;
    }
    
    public void setModuleId(Long moduleId) {
        this.moduleId = moduleId;
    }
    
    public List<CustomFieldValueItem> getValues() {
        return values;
    }
    
    public void setValues(List<CustomFieldValueItem> values) {
        this.values = values;
    }
    
    @Override
    public String toString() {
        return "BulkSaveCustomFieldValuesRequest{" +
                "module='" + module + '\'' +
                ", moduleId=" + moduleId +
                ", values=" + values +
                '}';
    }
}

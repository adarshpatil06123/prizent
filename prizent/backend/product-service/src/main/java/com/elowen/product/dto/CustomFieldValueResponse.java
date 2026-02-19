package com.elowen.product.dto;

/**
 * DTO for custom field value in product responses
 * Mirrors the structure from admin-service
 */
public class CustomFieldValueResponse {
    
    private Long id;
    private Long customFieldId;
    private Integer clientId;
    private String module;
    private Long moduleId;
    private String value;
    private String fieldName;
    private String fieldType;
    
    // Constructors
    public CustomFieldValueResponse() {}
    
    public CustomFieldValueResponse(Long id, Long customFieldId, Integer clientId, String module,
                                     Long moduleId, String value, String fieldName, String fieldType) {
        this.id = id;
        this.customFieldId = customFieldId;
        this.clientId = clientId;
        this.module = module;
        this.moduleId = moduleId;
        this.value = value;
        this.fieldName = fieldName;
        this.fieldType = fieldType;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getCustomFieldId() {
        return customFieldId;
    }
    
    public void setCustomFieldId(Long customFieldId) {
        this.customFieldId = customFieldId;
    }
    
    public Integer getClientId() {
        return clientId;
    }
    
    public void setClientId(Integer clientId) {
        this.clientId = clientId;
    }
    
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
    
    public String getValue() {
        return value;
    }
    
    public void setValue(String value) {
        this.value = value;
    }
    
    public String getFieldName() {
        return fieldName;
    }
    
    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }
    
    public String getFieldType() {
        return fieldType;
    }
    
    public void setFieldType(String fieldType) {
        this.fieldType = fieldType;
    }
    
    @Override
    public String toString() {
        return "CustomFieldValueResponse{" +
                "id=" + id +
                ", customFieldId=" + customFieldId +
                ", clientId=" + clientId +
                ", module='" + module + '\'' +
                ", moduleId=" + moduleId +
                ", value='" + value + '\'' +
                ", fieldName='" + fieldName + '\'' +
                ", fieldType='" + fieldType + '\'' +
                '}';
    }
}

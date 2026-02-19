package com.elowen.admin.service;

import com.elowen.admin.dto.CreateCustomFieldRequest;
import com.elowen.admin.dto.CustomFieldResponse;
import com.elowen.admin.dto.UpdateCustomFieldRequest;
import com.elowen.admin.entity.CustomFieldConfiguration;
import com.elowen.admin.exception.CustomFieldNotFoundException;
import com.elowen.admin.exception.DuplicateCustomFieldException;
import com.elowen.admin.repository.CustomFieldConfigurationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomFieldConfigurationService {
    
    private static final Logger log = LoggerFactory.getLogger(CustomFieldConfigurationService.class);
    
    private final CustomFieldConfigurationRepository customFieldRepository;
    
    @Autowired
    public CustomFieldConfigurationService(CustomFieldConfigurationRepository customFieldRepository) {
        this.customFieldRepository = customFieldRepository;
    }
    
    /**
     * Create a new custom field configuration
     * Business Rule: Duplicate field names not allowed per client + module
     */
    @Transactional
    public CustomFieldResponse createCustomField(CreateCustomFieldRequest request, Integer clientId, Long createdBy) {
        String fieldName = request.getName().trim();
        String module = request.getModule();
        
        // Check for duplicate field name
        if (customFieldRepository.existsByClientIdAndModuleAndName(clientId, module, fieldName)) {
            throw new DuplicateCustomFieldException(fieldName, module, clientId);
        }
        
        CustomFieldConfiguration customField = new CustomFieldConfiguration(
            clientId,
            fieldName,
            module,
            request.getFieldType(),
            request.getRequired(),
            request.getEnabled()
        );
        customField.setUpdatedBy(createdBy);
        
        CustomFieldConfiguration savedField = customFieldRepository.save(customField);
        
        log.info("Created custom field ID {} for client {} module {}", savedField.getId(), clientId, module);
        return CustomFieldResponse.fromEntity(savedField);
    }
    
    /**
     * Get all custom fields by module (optionally filtered by enabled status)
     */
    @Transactional(readOnly = true)
    public List<CustomFieldResponse> getCustomFieldsByModule(Integer clientId, String module, Boolean enabledOnly) {
        List<CustomFieldConfiguration> customFields;
        
        if (enabledOnly != null && enabledOnly) {
            customFields = customFieldRepository.findAllByClientIdAndModuleAndEnabledTrueOrderByCreateDateTimeDesc(clientId, module);
        } else {
            customFields = customFieldRepository.findAllByClientIdAndModuleOrderByCreateDateTimeDesc(clientId, module);
        }
        
        return customFields.stream()
                .map(CustomFieldResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all custom fields for all modules (optionally filtered by enabled status)
     */
    @Transactional(readOnly = true)
    public List<CustomFieldResponse> getAllCustomFields(Integer clientId, Boolean enabledOnly) {
        List<CustomFieldConfiguration> customFields;
        
        if (enabledOnly != null && enabledOnly) {
            customFields = customFieldRepository.findAllByClientIdAndEnabledTrueOrderByCreateDateTimeDesc(clientId);
        } else {
            customFields = customFieldRepository.findAllByClientIdOrderByCreateDateTimeDesc(clientId);
        }
        
        return customFields.stream()
                .map(CustomFieldResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Get a custom field by ID
     */
    @Transactional(readOnly = true)
    public CustomFieldResponse getCustomFieldById(Long customFieldId, Integer clientId) {
        CustomFieldConfiguration customField = findCustomFieldByIdAndClientId(customFieldId, clientId);
        return CustomFieldResponse.fromEntity(customField);
    }
    
    /**
     * Update a custom field configuration
     * Business Rule: Duplicate field names not allowed per client + module
     */
    @Transactional
    public CustomFieldResponse updateCustomField(Long customFieldId, UpdateCustomFieldRequest request, 
                                                  Integer clientId, Long updatedBy) {
        if (request.isEmpty()) {
            return getCustomFieldById(customFieldId, clientId);
        }
        
        CustomFieldConfiguration existingField = findCustomFieldByIdAndClientId(customFieldId, clientId);
        
        // Update name if provided and different
        if (request.hasName()) {
            String newName = request.getName().trim();
            if (!newName.equals(existingField.getName())) {
                // Check for duplicate
                if (customFieldRepository.existsByClientIdAndModuleAndNameAndIdNot(
                        clientId, existingField.getModule(), newName, customFieldId)) {
                    throw new DuplicateCustomFieldException(newName, existingField.getModule(), clientId);
                }
                existingField.setName(newName);
            }
        }
        
        // Update field type if provided
        if (request.hasFieldType()) {
            existingField.setFieldType(request.getFieldType());
        }
        
        // Update required flag if provided
        if (request.hasRequired()) {
            existingField.setRequired(request.getRequired());
        }
        
        // Update enabled flag if provided
        if (request.hasEnabled()) {
            existingField.setEnabled(request.getEnabled());
        }
        
        // Set updated_by
        if (updatedBy != null) {
            existingField.setUpdatedBy(updatedBy);
        }
        
        CustomFieldConfiguration updatedField = customFieldRepository.save(existingField);
        
        log.info("Updated custom field ID {} for client {}", customFieldId, clientId);
        return CustomFieldResponse.fromEntity(updatedField);
    }
    
    /**
     * Enable or disable a custom field (PATCH operation)
     */
    @Transactional
    public CustomFieldResponse toggleCustomFieldEnabled(Long customFieldId, Boolean enabled, 
                                                         Integer clientId, Long updatedBy) {
        CustomFieldConfiguration customField = findCustomFieldByIdAndClientId(customFieldId, clientId);
        
        customField.setEnabled(enabled);
        if (updatedBy != null) {
            customField.setUpdatedBy(updatedBy);
        }
        
        CustomFieldConfiguration updatedField = customFieldRepository.save(customField);
        
        log.info("Toggled custom field ID {} enabled={} for client {}", customFieldId, enabled, clientId);
        return CustomFieldResponse.fromEntity(updatedField);
    }
    
    /**
     * Hard delete a custom field (permanently remove from database)
     * Note: This will also cascade delete all associated custom field values
     */
    @Transactional
    public void deleteCustomField(Long customFieldId, Integer clientId, Long deletedBy) {
        CustomFieldConfiguration customField = findCustomFieldByIdAndClientId(customFieldId, clientId);
        
        // Hard delete - permanently remove from database
        customFieldRepository.delete(customField);
        
        log.info("Hard deleted (permanently removed) custom field ID {} for client {}", customFieldId, clientId);
    }
    
    /**
     * Get all enabled custom fields for brands (module='b')
     * Convenience method for brand-specific custom field consumption
     */
    @Transactional(readOnly = true)
    public List<CustomFieldResponse> getBrandCustomFields(Integer clientId) {
        return getCustomFieldsByModule(clientId, "b", true);
    }
    
    /**
     * Get all custom fields for brands (module='b') including disabled ones
     * Convenience method for brand-specific custom field administration
     */
    @Transactional(readOnly = true)
    public List<CustomFieldResponse> getAllBrandCustomFields(Integer clientId) {
        return getCustomFieldsByModule(clientId, "b", false);
    }
    
    /**
     * Helper method to find custom field by ID and ensure it belongs to the client
     */
    private CustomFieldConfiguration findCustomFieldByIdAndClientId(Long customFieldId, Integer clientId) {
        return customFieldRepository.findByIdAndClientId(customFieldId, clientId)
                .orElseThrow(() -> new CustomFieldNotFoundException(customFieldId, clientId));
    }
}

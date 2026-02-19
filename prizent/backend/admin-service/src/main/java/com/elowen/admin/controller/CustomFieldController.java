package com.elowen.admin.controller;

import com.elowen.admin.dto.BulkSaveCustomFieldValuesRequest;
import com.elowen.admin.dto.CreateCustomFieldRequest;
import com.elowen.admin.dto.CustomFieldResponse;
import com.elowen.admin.dto.CustomFieldValueResponse;
import com.elowen.admin.dto.SaveCustomFieldValueRequest;
import com.elowen.admin.dto.UpdateCustomFieldRequest;
import com.elowen.admin.security.JwtUtil;
import com.elowen.admin.security.UserPrincipal;
import com.elowen.admin.service.CustomFieldConfigurationService;
import com.elowen.admin.service.CustomFieldValueService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/custom-fields")
// @PreAuthorize("hasRole('ADMIN')") // Temporarily disabled for testing - uncomment for production
@CrossOrigin(origins = "*")
public class CustomFieldController {
    
    private static final Logger log = LoggerFactory.getLogger(CustomFieldController.class);
    
    private final CustomFieldConfigurationService customFieldConfigService;
    private final CustomFieldValueService customFieldValueService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    public CustomFieldController(CustomFieldConfigurationService customFieldConfigService,
                                  CustomFieldValueService customFieldValueService) {
        this.customFieldConfigService = customFieldConfigService;
        this.customFieldValueService = customFieldValueService;
    }
    
    /**
     * POST /api/admin/custom-fields
     * Create a new custom field configuration
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createCustomField(
            @Valid @RequestBody CreateCustomFieldRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        Long userId = extractUserIdFromToken(authHeader);
        
        CustomFieldResponse customFieldResponse = customFieldConfigService.createCustomField(request, clientId, userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom field created successfully");
        response.put("customField", customFieldResponse);
        
        log.info("Custom field created: ID {} for client {}", customFieldResponse.getId(), clientId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * GET /api/admin/custom-fields?module=p&enabledOnly=true
     * Get all custom fields by module (module is optional - returns all if not specified)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getCustomFieldsByModule(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) Boolean enabledOnly,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        
        List<CustomFieldResponse> customFields;
        
        if (module != null && !module.isEmpty()) {
            // Get custom fields for specific module
            customFields = customFieldConfigService.getCustomFieldsByModule(
                    clientId, module, enabledOnly);
        } else {
            // Get all custom fields for all modules
            customFields = customFieldConfigService.getAllCustomFields(clientId, enabledOnly);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom fields retrieved successfully");
        response.put("customFields", customFields);
        response.put("count", customFields.size());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/admin/custom-fields/{id}
     * Get a specific custom field by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCustomFieldById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        
        CustomFieldResponse customFieldResponse = customFieldConfigService.getCustomFieldById(id, clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom field retrieved successfully");
        response.put("customField", customFieldResponse);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * PUT /api/admin/custom-fields/{id}
     * Update a custom field configuration
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateCustomField(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomFieldRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        Long userId = extractUserIdFromToken(authHeader);
        
        CustomFieldResponse customFieldResponse = customFieldConfigService.updateCustomField(
                id, request, clientId, userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom field updated successfully");
        response.put("customField", customFieldResponse);
        
        log.info("Custom field updated: ID {} for client {}", id, clientId);
        return ResponseEntity.ok(response);
    }
    
    /**
     * PATCH /api/admin/custom-fields/{id}/enable
     * Enable or disable a custom field
     */
    @PatchMapping("/{id}/enable")
    public ResponseEntity<Map<String, Object>> toggleCustomFieldEnabled(
            @PathVariable Long id,
            @RequestParam Boolean enabled,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        Long userId = extractUserIdFromToken(authHeader);
        
        CustomFieldResponse customFieldResponse = customFieldConfigService.toggleCustomFieldEnabled(
                id, enabled, clientId, userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", String.format("Custom field %s successfully", 
                enabled ? "enabled" : "disabled"));
        response.put("customField", customFieldResponse);
        
        log.info("Custom field ID {} {} for client {}", id, enabled ? "enabled" : "disabled", clientId);
        return ResponseEntity.ok(response);
    }
    
    /**
     * DELETE /api/admin/custom-fields/{id}
     * Permanently delete a custom field from database
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteCustomField(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        Long userId = extractUserIdFromToken(authHeader);
        
        customFieldConfigService.deleteCustomField(id, clientId, userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom field deleted successfully");
        
        log.info("Custom field permanently deleted: ID {} for client {}", id, clientId);
        return ResponseEntity.ok(response);
    }
    
    // ==================== CUSTOM FIELD VALUES ENDPOINTS ====================
    
    /**
     * GET /api/admin/custom-fields/brands
     * Get all enabled custom field configurations for brands (convenience endpoint)
     */
    @GetMapping("/brands")
    public ResponseEntity<Map<String, Object>> getBrandCustomFields(
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        
        List<CustomFieldResponse> customFields = customFieldConfigService.getBrandCustomFields(clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Brand custom fields retrieved successfully");
        response.put("customFields", customFields);
        response.put("count", customFields.size());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/admin/custom-fields/brands/{brandId}/values
     * Get custom field values for a specific brand (convenience endpoint)
     */
    @GetMapping("/brands/{brandId}/values")
    public ResponseEntity<Map<String, Object>> getBrandCustomFieldValues(
            @PathVariable Long brandId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        
        List<CustomFieldValueResponse> values = customFieldValueService.getBrandCustomFieldValues(clientId, brandId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Brand custom field values retrieved successfully");
        response.put("values", values);
        response.put("brandId", brandId);
        response.put("count", values.size());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * POST /api/admin/custom-fields/values
     * Save custom field values
     */
    @PostMapping("/values")
    public ResponseEntity<Map<String, Object>> saveCustomFieldValue(
            @Valid @RequestBody SaveCustomFieldValueRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        Long userId = extractUserIdFromToken(authHeader);
        
        CustomFieldValueResponse valueResponse = customFieldValueService.saveCustomFieldValue(
                request, clientId, userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom field value saved successfully");
        response.put("value", valueResponse);
        
        log.info("Custom field value saved: ID {} for client {}", valueResponse.getId(), clientId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * POST /api/admin/custom-fields/values/bulk
     * Bulk save custom field values (for product/brand/category/marketplace creation)
     */
    @PostMapping("/values/bulk")
    public ResponseEntity<Map<String, Object>> bulkSaveCustomFieldValues(
            @Valid @RequestBody BulkSaveCustomFieldValuesRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        Long userId = extractUserIdFromToken(authHeader);
        
        List<CustomFieldValueResponse> valueResponses = customFieldValueService.saveBulkCustomFieldValues(
                request, clientId, userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom field values saved successfully");
        response.put("values", valueResponses);
        response.put("count", valueResponses.size());
        
        log.info("Bulk saved {} custom field values for client {} module {} moduleId {}", 
                valueResponses.size(), clientId, request.getModule(), request.getModuleId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * GET /api/admin/custom-fields/values?module=p&moduleId=123
     * Get custom field values by module and moduleId
     */
    @GetMapping("/values")
    public ResponseEntity<Map<String, Object>> getCustomFieldValues(
            @RequestParam String module,
            @RequestParam(required = false) Long moduleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = (principal != null && principal.getClientId() != null) ? principal.getClientId() : 1;
        
        List<CustomFieldValueResponse> values;
        
        if (moduleId != null) {
            values = customFieldValueService.getCustomFieldValues(clientId, module, moduleId);
        } else {
            values = customFieldValueService.getCustomFieldValuesByModule(clientId, module);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Custom field values retrieved successfully");
        response.put("values", values);
        response.put("count", values.size());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Helper method to extract userId from JWT token
     */
    private Long extractUserIdFromToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                String userIdStr = jwtUtil.extractUserId(token);
                return Long.parseLong(userIdStr);
            } catch (Exception e) {
                log.error("Error extracting userId from token: {}", e.getMessage());
            }
        }
        return null;
    }
}

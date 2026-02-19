package com.elowen.product.client;

import com.elowen.product.dto.CustomFieldValueRequest;
import com.elowen.product.dto.CustomFieldValueResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Client for communicating with admin-service for custom fields operations
 * Handles REST calls to admin-service endpoints
 */
@Component
public class AdminServiceClient {
    
    private static final Logger log = LoggerFactory.getLogger(AdminServiceClient.class);
    
    @Value("${admin.service.url:http://localhost:8082/api/admin}")
    private String adminServiceUrl;
    
    private final RestTemplate restTemplate;
    
    @Autowired
    public AdminServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * Bulk save custom field values via admin-service
     * 
     * @param module Module identifier (e.g., "p" for product)
     * @param moduleId The ID of the module entity (e.g., productId)
     * @param customFields List of custom field values to save
     * @param authToken JWT token for authentication
     * @return List of saved custom field value responses
     * @throws RestClientException if the call to admin-service fails
     */
    public List<CustomFieldValueResponse> bulkSaveCustomFieldValues(
            String module, Long moduleId, List<CustomFieldValueRequest> customFields, String authToken) {
        
        if (customFields == null || customFields.isEmpty()) {
            log.debug("No custom fields to save for module {} moduleId {}", module, moduleId);
            return new ArrayList<>();
        }
        
        try {
            String url = adminServiceUrl + "/custom-fields/values/bulk";
            
            // Build request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("module", module);
            requestBody.put("moduleId", moduleId);
            
            // Convert CustomFieldValueRequest to the format expected by admin-service
            List<Map<String, Object>> values = new ArrayList<>();
            for (CustomFieldValueRequest cf : customFields) {
                Map<String, Object> valueItem = new HashMap<>();
                valueItem.put("fieldId", cf.getFieldId());
                valueItem.put("value", cf.getValue());
                values.add(valueItem);
            }
            requestBody.put("values", values);
            
            // Set headers including Authorization
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authToken != null && !authToken.isEmpty()) {
                headers.set("Authorization", authToken);
            }
            
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);
            
            log.info("Calling admin-service to bulk save {} custom field values for module {} moduleId {}", 
                    customFields.size(), module, moduleId);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                
                // Extract values from response
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> valuesData = (List<Map<String, Object>>) responseBody.get("values");
                
                if (valuesData != null) {
                    List<CustomFieldValueResponse> result = new ArrayList<>();
                    for (Map<String, Object> valueData : valuesData) {
                        CustomFieldValueResponse cfValue = mapToCustomFieldValueResponse(valueData);
                        result.add(cfValue);
                    }
                    log.info("Successfully saved {} custom field values via admin-service", result.size());
                    return result;
                }
            }
            
            log.warn("Unexpected response from admin-service: {}", response.getStatusCode());
            return new ArrayList<>();
            
        } catch (RestClientException e) {
            log.error("Failed to bulk save custom field values via admin-service: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save custom field values: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get custom field values for a specific module and moduleId
     * 
     * @param module Module identifier (e.g., "p" for product)
     * @param moduleId The ID of the module entity (e.g., productId)
     * @param authToken JWT token for authentication
     * @return List of custom field value responses
     */
    public List<CustomFieldValueResponse> getCustomFieldValues(
            String module, Long moduleId, String authToken) {
        
        try {
            String url = adminServiceUrl + "/custom-fields/values?module=" + module + "&moduleId=" + moduleId;
            
            // Set headers including Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authToken != null && !authToken.isEmpty()) {
                headers.set("Authorization", authToken);
            }
            
            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
            
            log.debug("Fetching custom field values from admin-service for module {} moduleId {}", module, moduleId);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                requestEntity,
                Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> valuesData = (List<Map<String, Object>>) responseBody.get("values");
                
                if (valuesData != null) {
                    List<CustomFieldValueResponse> result = new ArrayList<>();
                    for (Map<String, Object> valueData : valuesData) {
                        CustomFieldValueResponse cfValue = mapToCustomFieldValueResponse(valueData);
                        result.add(cfValue);
                    }
                    log.debug("Retrieved {} custom field values from admin-service", result.size());
                    return result;
                }
            }
            
            return new ArrayList<>();
            
        } catch (RestClientException e) {
            log.error("Failed to get custom field values from admin-service: {}", e.getMessage());
            // Don't throw exception for GET - return empty list
            return new ArrayList<>();
        }
    }
    
    /**
     * Helper method to map response data to CustomFieldValueResponse
     */
    private CustomFieldValueResponse mapToCustomFieldValueResponse(Map<String, Object> data) {
        CustomFieldValueResponse response = new CustomFieldValueResponse();
        
        if (data.get("id") != null) {
            response.setId(((Number) data.get("id")).longValue());
        }
        if (data.get("customFieldId") != null) {
            response.setCustomFieldId(((Number) data.get("customFieldId")).longValue());
        }
        if (data.get("clientId") != null) {
            response.setClientId(((Number) data.get("clientId")).intValue());
        }
        if (data.get("module") != null) {
            response.setModule((String) data.get("module"));
        }
        if (data.get("moduleId") != null) {
            response.setModuleId(((Number) data.get("moduleId")).longValue());
        }
        if (data.get("value") != null) {
            response.setValue((String) data.get("value"));
        }
        if (data.get("fieldName") != null) {
            response.setFieldName((String) data.get("fieldName"));
        }
        if (data.get("fieldType") != null) {
            response.setFieldType((String) data.get("fieldType"));
        }
        
        return response;
    }
}

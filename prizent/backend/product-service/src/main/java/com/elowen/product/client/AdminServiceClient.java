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

    // ── Name-lookup helpers for import ────────────────────────────────────────

    /**
     * Fetch all brands for the current client (used for name → ID resolution during import).
     * Returns list of maps with at least "id" (Long) and "name" (String).
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getBrandsForImport(String authToken) {
        try {
            String url = adminServiceUrl + "/brands";
            HttpHeaders headers = buildHeaders(authToken);
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object brands = response.getBody().get("brands");
                if (brands instanceof List) return (List<Map<String, Object>>) brands;
            }
        } catch (Exception e) {
            log.warn("Could not fetch brands from admin-service for import: {}", e.getMessage());
        }
        return new ArrayList<>();
    }

    /**
     * Fetch all categories for the current client (used for name → ID resolution during import).
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getCategoriesForImport(String authToken) {
        try {
            String url = adminServiceUrl + "/categories";
            HttpHeaders headers = buildHeaders(authToken);
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object categories = response.getBody().get("categories");
                if (categories instanceof List) return (List<Map<String, Object>>) categories;
            }
        } catch (Exception e) {
            log.warn("Could not fetch categories from admin-service for import: {}", e.getMessage());
        }
        return new ArrayList<>();
    }

    /**
     * Fetch all marketplaces (used for name → ID resolution during import).
     * Requests a large page size to get all records in one call.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getMarketplacesForImport(String authToken) {
        try {
            String url = adminServiceUrl + "/marketplaces?page=0&size=1000";
            log.debug("Fetching marketplaces from: {}", url);
            HttpHeaders headers = buildHeaders(authToken);
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            
            log.debug("Marketplace response status: {}", response.getStatusCode());
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                log.debug("Marketplace response body keys: {}", body.keySet());
                
                Object mp = body.get("marketplaces");
                log.debug("Marketplace object type: {}, value: {}", mp != null ? mp.getClass().getSimpleName() : "null", mp);
                
                if (mp instanceof Map) {
                    // PagedResponse wraps list under "content"
                    Map<String, Object> mpMap = (Map<String, Object>) mp;
                    log.debug("Marketplace map keys: {}", mpMap.keySet());
                    
                    Object content = mpMap.get("content");
                    log.debug("Marketplace content type: {}, size: {}", 
                            content != null ? content.getClass().getSimpleName() : "null",
                            content instanceof List ? ((List<?>) content).size() : "N/A");
                    
                    if (content instanceof List) {
                        List<Map<String, Object>> result = (List<Map<String, Object>>) content;
                        log.info("Successfully fetched {} marketplaces from admin-service", result.size());
                        return result;
                    }
                } else if (mp instanceof List) {
                    // Direct list response (fallback)
                    List<Map<String, Object>> result = (List<Map<String, Object>>) mp;
                    log.info("Successfully fetched {} marketplaces (direct list) from admin-service", result.size());
                    return result;
                }
                log.warn("Unexpected marketplace response structure: {}", mp);
            } else {
                log.warn("Marketplace fetch returned non-success status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Could not fetch marketplaces from admin-service for import: {}", e.getMessage(), e);
        }
        log.warn("Returning empty marketplace list");
        return new ArrayList<>();
    }

    /** Build an HttpHeaders object with the Authorization header set. */
    private HttpHeaders buildHeaders(String authToken) {
        HttpHeaders headers = new HttpHeaders();
        if (authToken != null && !authToken.isEmpty()) {
            headers.set("Authorization", authToken);
        }
        return headers;
    }

    // ── Custom Field Definitions ──────────────────────────────────────────────

    /**
     * Fetch all enabled custom field *definitions* for the given module from
     * admin-service.  Used to:
     * <ul>
     *   <li>Generate the import Excel template (add one column per custom field)</li>
     *   <li>Map custom-field column headers back to fieldIds during import</li>
     * </ul>
     *
     * @param module    module code, e.g. {@code "p"} for products
     * @param authToken Bearer token forwarded to admin-service
     * @return list of raw custom-field definition maps; empty on error (non-fatal)
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getCustomFieldDefinitions(String module, String authToken) {
        try {
            String url = adminServiceUrl + "/custom-fields?module=" + module + "&enabledOnly=true";

            HttpHeaders headers = new HttpHeaders();
            if (authToken != null && !authToken.isEmpty()) {
                headers.set("Authorization", authToken);
            }
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object cf = response.getBody().get("customFields");
                if (cf instanceof List) {
                    return (List<Map<String, Object>>) cf;
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch custom field definitions from admin-service (module={}): {}",
                    module, e.getMessage());
        }
        return new ArrayList<>();
    }
}


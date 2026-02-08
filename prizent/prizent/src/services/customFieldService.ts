import apiClient from './api';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface CreateCustomFieldRequest {
  name: string;
  fieldType: 'text' | 'numeric' | 'dropdown' | 'date' | 'file';
  module: 'p' | 'm' | 'b' | 'c'; // p=product, m=marketplace, b=brand, c=category
  required: boolean;
  enabled: boolean;
  dropdownOptions?: string;
}

export interface UpdateCustomFieldRequest {
  name: string;
  fieldType: 'text' | 'numeric' | 'dropdown' | 'date' | 'file';
  required: boolean;
  dropdownOptions?: string;
}

export interface CustomFieldResponse {
  id: number;
  clientId: number;
  name: string;
  fieldType: string;
  module: string;
  required: boolean;
  enabled: boolean;
  dropdownOptions?: string;
}

export interface SaveCustomFieldValueRequest {
  customFieldId: number;
  module: 'p' | 'm' | 'b' | 'c';
  moduleId: number;
  value: string;
}

export interface CustomFieldValueResponse {
  id: number;
  customFieldId: number;
  clientId: number;
  module: string;
  moduleId: number;
  value: string;
}

// ============================================
// CUSTOM FIELD CONFIGURATION SERVICES
// ============================================

/**
 * Create a new custom field configuration
 */
export const createCustomField = async (request: CreateCustomFieldRequest): Promise<CustomFieldResponse> => {
  try {
    const response = await apiClient.post('/admin/custom-fields', request);
    // Backend returns { success: true, customField: {...} }
    return response.data.customField || response.data;
  } catch (error) {
    console.error('Error creating custom field:', error);
    throw error;
  }
};

/**
 * Get all custom fields by module (optional filter)
 */
export const getCustomFields = async (module?: string): Promise<CustomFieldResponse[]> => {
  try {
    // If no module specified, get all fields by querying each module
    if (!module) {
      const modules = ['p', 'c', 'm', 'b']; // products, categories, marketplaces, brands
      const allFieldsPromises = modules.map(m => 
        apiClient.get(`/admin/custom-fields?module=${m}`)
          .then(res => res.data.customFields || [])
          .catch(() => [])
      );
      const allFieldsArrays = await Promise.all(allFieldsPromises);
      const allFields = allFieldsArrays.flat();
      return allFields;
    }
    
    const response = await apiClient.get(`/admin/custom-fields?module=${module}`);
    // Backend returns { success: true, customFields: [...] }
    return response.data.customFields || [];
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    throw error;
  }
};

/**
 * Get a specific custom field by ID
 */
export const getCustomFieldById = async (fieldId: number): Promise<CustomFieldResponse> => {
  try {
    const response = await apiClient.get(`/admin/custom-fields/${fieldId}`);
    // Backend returns { success: true, customField: {...} }
    return response.data.customField || response.data;
  } catch (error) {
    console.error(`Error fetching custom field ${fieldId}:`, error);
    throw error;
  }
};

/**
 * Update an existing custom field
 */
export const updateCustomField = async (
  fieldId: number, 
  request: UpdateCustomFieldRequest
): Promise<CustomFieldResponse> => {
  try {
    const response = await apiClient.put(`/admin/custom-fields/${fieldId}`, request);
    // Backend returns { success: true, customField: {...} }
    return response.data.customField || response.data;
  } catch (error) {
    console.error(`Error updating custom field ${fieldId}:`, error);
    throw error;
  }
};

/**
 * Toggle custom field enabled/disabled status
 */
export const toggleCustomField = async (fieldId: number, enabled: boolean): Promise<CustomFieldResponse> => {
  try {
    const response = await apiClient.patch(`/admin/custom-fields/${fieldId}/enable?enabled=${enabled}`);
    // Backend returns { success: true, customField: {...} }
    return response.data.customField || response.data;
  } catch (error) {
    console.error(`Error toggling custom field ${fieldId}:`, error);
    throw error;
  }
};

/**
 * Delete a custom field (soft delete)
 */
export const deleteCustomField = async (fieldId: number): Promise<void> => {
  try {
    await apiClient.delete(`/admin/custom-fields/${fieldId}`);
  } catch (error) {
    console.error(`Error deleting custom field ${fieldId}:`, error);
    throw error;
  }
};

// ============================================
// CUSTOM FIELD VALUE SERVICES
// ============================================

/**
 * Save a custom field value for a specific entity (product/brand/category/marketplace)
 */
export const saveCustomFieldValue = async (request: SaveCustomFieldValueRequest): Promise<CustomFieldValueResponse> => {
  try {
    const response = await apiClient.post('/admin/custom-fields/values', request);
    return response.data;
  } catch (error) {
    console.error('Error saving custom field value:', error);
    throw error;
  }
};

/**
 * Get custom field values for a specific module and entity
 */
export const getCustomFieldValues = async (
  module: string, 
  moduleId: number
): Promise<CustomFieldValueResponse[]> => {
  try {
    const response = await apiClient.get(`/admin/custom-fields/values?module=${module}&moduleId=${moduleId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching custom field values for ${module}:${moduleId}:`, error);
    throw error;
  }
};

// ============================================
// BRAND-SPECIFIC CONVENIENCE METHODS
// ============================================

/**
 * Get all custom fields applicable to brands
 */
export const getBrandCustomFields = async (): Promise<CustomFieldResponse[]> => {
  try {
    const response = await apiClient.get('/admin/custom-fields/brands');
    return response.data;
  } catch (error) {
    console.error('Error fetching brand custom fields:', error);
    throw error;
  }
};

/**
 * Get custom field values for a specific brand
 */
export const getBrandCustomFieldValues = async (brandId: number): Promise<CustomFieldValueResponse[]> => {
  try {
    const response = await apiClient.get(`/admin/custom-fields/brands/${brandId}/values`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching custom field values for brand ${brandId}:`, error);
    throw error;
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  // Configuration
  createCustomField,
  getCustomFields,
  getCustomFieldById,
  updateCustomField,
  toggleCustomField,
  deleteCustomField,
  
  // Values
  saveCustomFieldValue,
  getCustomFieldValues,
  
  // Brand convenience
  getBrandCustomFields,
  getBrandCustomFieldValues,
};

import apiClient from './api';

// Custom field interfaces
export interface CustomFieldValue {
  fieldId: number;
  value: string;
}

export interface CustomFieldValueResponse {
  id: number;
  customFieldId: number;
  clientId: number;
  module: string;
  moduleId: number;
  value: string;
  fieldName?: string;
  fieldType?: string;
}

export interface ProductMarketplaceMappingResponse {
  id: number;
  clientId: number;
  productId: number;
  productName: string;
  marketplaceId: number;
  marketplaceName: string;
  productMarketplaceName: string;
  createDateTime: string;
  updatedDateTime: string;
  updatedBy: number;
}

// Product interface matching the backend response
export interface Product {
  id: number;
  clientId: number;
  name: string;
  productNumber?: string;
  styleCode?: string;
  brandId: number;
  skuCode: string;
  categoryId: number;
  mrp: number;
  productCost: number;
  proposedSellingPriceSales: number;
  proposedSellingPriceNonSales: number;
  enabled: boolean;
  createDateTime: string;
  updatedBy: number;
  customFields?: CustomFieldValueResponse[];
}

// Create product request interface
export interface CreateProductRequest {
  name: string;
  productNumber?: string;
  styleCode?: string;
  brandId: number;
  skuCode: string;
  categoryId: number;
  mrp: number;
  productCost: number;
  proposedSellingPriceSales: number;
  proposedSellingPriceNonSales: number;
  enabled?: boolean;
  customFields?: CustomFieldValue[];
}

// Update product request interface
export interface UpdateProductRequest {
  name: string;
  productNumber?: string;
  styleCode?: string;
  brandId: number;
  skuCode: string;
  categoryId: number;
  mrp: number;
  productCost: number;
  proposedSellingPriceSales: number;
  proposedSellingPriceNonSales: number;
  enabled?: boolean;
}

// Paged response interface matching Spring Boot PagedResponse
export interface PagedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// Product statistics interface
export interface ProductStats {
  enabledCount: number;
  totalCount: number;
}

// Helper function to get product status display
export const getProductStatusDisplay = (currentType: 'T' | 'A' | 'N'): string => {
  switch (currentType) {
    case 'T':
      return 'Top Seller';
    case 'A':
      return 'Avg Seller';
    case 'N':
      return 'Non-Seller';
    default:
      return 'Unknown';
  }
};

const productService = {
  // Get all products with pagination
  getAllProducts: async (page: number = 0, size: number = 20): Promise<PagedResponse<Product>> => {
    try {
      const response = await apiClient.get(`products?page=${page}&size=${size}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get all products including disabled
  getAllProductsIncludingDisabled: async (page: number = 0, size: number = 20): Promise<PagedResponse<Product>> => {
    try {
      const response = await apiClient.get(`products/all?page=${page}&size=${size}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get product by ID
  getProductById: async (id: number): Promise<Product> => {
    try {
      const response = await apiClient.get(`products/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Get product by ID with custom fields
  getProductByIdFull: async (id: number): Promise<Product> => {
    try {
      const response = await apiClient.get(`products/${id}/full`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product with custom fields:', error);
      throw error;
    }
  },

  // Create new product
  createProduct: async (productData: CreateProductRequest): Promise<Product> => {
    try {
      const response = await apiClient.post('products', productData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Update product
  updateProduct: async (id: number, productData: UpdateProductRequest): Promise<Product> => {
    try {
      const response = await apiClient.put(`products/${id}`, productData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Update product flag/currentType
  updateProductFlag: async (id: number, currentType: 'T' | 'A' | 'N'): Promise<Product> => {
    try {
      const response = await apiClient.patch(`products/${id}/flag?currentType=${currentType}`);
      return response.data;
    } catch (error: any) {
      console.error('Error updating product flag:', error);
      throw error;
    }
  },

  // Enable or disable product
  toggleProductStatus: async (id: number, enabled: boolean): Promise<Product> => {
    try {
      const response = await apiClient.patch(`products/${id}/enable?enabled=${enabled}`);
      return response.data;
    } catch (error: any) {
      console.error('Error toggling product status:', error);
      throw error;
    }
  },

  // Delete product permanently
  deleteProduct: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`products/${id}`);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Get product statistics
  getProductStats: async (): Promise<ProductStats> => {
    try {
      const response = await apiClient.get('products/stats');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product stats:', error);
      throw error;
    }
  },

  // Filter products with multiple criteria
  filterProducts: async (
    filters: {
      status?: 'T' | 'A' | 'N';
      brandId?: number;
      categoryId?: number;
      search?: string;
      page?: number;
      size?: number;
      sortBy?: string;
      direction?: 'asc' | 'desc';
    }
  ): Promise<PagedResponse<Product>> => {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.brandId) params.append('brandId', filters.brandId.toString());
      if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
      if (filters.search) params.append('search', filters.search);
      params.append('page', (filters.page || 0).toString());
      params.append('size', (filters.size || 20).toString());
      params.append('sortBy', filters.sortBy || 'createDateTime');
      params.append('direction', filters.direction || 'desc');
      
      const response = await apiClient.get(`products/filter?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error filtering products:', error);
      throw error;
    }
  },

  // Save marketplace mappings for a product (replaces existing)
  saveMarketplaceMappings: async (
    productId: number,
    mappings: Array<{ marketplaceId: number; marketplaceName: string; productMarketplaceName: string }>
  ): Promise<ProductMarketplaceMappingResponse[]> => {
    try {
      const response = await apiClient.post(`products/${productId}/marketplace-mappings`, { mappings });
      return response.data;
    } catch (error: any) {
      console.error('Error saving marketplace mappings:', error);
      throw error;
    }
  },

  // Get marketplace mappings for a product
  getMarketplaceMappings: async (productId: number): Promise<ProductMarketplaceMappingResponse[]> => {
    try {
      const response = await apiClient.get(`products/${productId}/marketplace-mappings`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching marketplace mappings:', error);
      throw error;
    }
  }
};

export default productService;

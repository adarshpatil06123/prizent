import apiClient from './api';

// Marketplace interfaces matching backend DTOs
export interface Marketplace {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  createDateTime: string;
  costs?: MarketplaceCost[];
  brandCostsSummary?: MarketplaceCost[];
  hasBrandMappings?: boolean;
}

export interface MarketplaceCost {
  id: number;
  costCategory: 'COMMISSION' | 'SHIPPING' | 'MARKETING';
  costValueType: 'P' | 'A'; // Percentage or Amount
  costValue: number;
  costProductRange: string;
  brandId?: number;
  brandName?: string;
}

export interface CreateMarketplaceRequest {
  name: string;
  description: string;
  enabled: boolean;
  costs: CreateMarketplaceCostRequest[];
}

export interface CreateMarketplaceCostRequest {
  costCategory: 'COMMISSION' | 'SHIPPING' | 'MARKETING';
  costValueType: 'P' | 'A';
  costValue: number;
  costProductRange: string;
}

export interface UpdateMarketplaceRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  costs?: UpdateMarketplaceCostRequest[];
}

export interface UpdateMarketplaceCostRequest {
  id?: number;
  costCategory: 'COMMISSION' | 'SHIPPING' | 'MARKETING';
  costValueType: 'P' | 'A';
  costValue: number;
  costProductRange: string;
}

export interface BrandMappingCostRequest {
  costCategory: 'COMMISSION' | 'SHIPPING' | 'MARKETING';
  costValueType: 'P' | 'A';
  costValue: number;
  costProductRange: string;
}

export interface BrandMappingRequest {
  brandId: number;
  costs: BrandMappingCostRequest[];
}

export interface BrandMappingCost {
  id?: number;
  costCategory: 'COMMISSION' | 'SHIPPING' | 'MARKETING';
  costValueType: 'P' | 'A';
  costValue: number;
  costProductRange: string;
}

export interface BrandMapping {
  id?: number;
  brandId: number;
  brandName?: string;
  costs: BrandMappingCost[];
}

export interface BrandMappingResponse {
  success: boolean;
  message: string;
  mappings?: BrandMapping[];
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MarketplaceResponse {
  success: boolean;
  message: string;
  marketplaces?: PagedResponse<Marketplace>;
  marketplace?: Marketplace;
  costs?: MarketplaceCost[];
}

// Helper function to get cost category display name
export const getCostCategoryDisplay = (category: string): string => {
  switch (category) {
    case 'COMMISSION':
      return 'Commission';
    case 'SHIPPING':
      return 'Shipping';
    case 'MARKETING':
      return 'Marketing';
    default:
      return category;
  }
};

// Helper function to calculate total commission from costs
export const calculateTotalCommission = (costs: MarketplaceCost[]): string => {
  if (!costs || costs.length === 0) return '0%';
  
  const commissionCosts = costs.filter(cost => cost.costCategory === 'COMMISSION');
  if (commissionCosts.length === 0) return '0%';
  
  // Take the first commission cost for display
  const commission = commissionCosts[0];
  return commission.costValueType === 'P' ? `${commission.costValue}%` : `₹${commission.costValue}`;
};

// Helper function to calculate total shipping from costs
export const calculateTotalShipping = (costs: MarketplaceCost[]): string => {
  if (!costs || costs.length === 0) return '0%';
  
  const shippingCosts = costs.filter(cost => cost.costCategory === 'SHIPPING');
  if (shippingCosts.length === 0) return '0%';
  
  // Take the first shipping cost for display
  const shipping = shippingCosts[0];
  return shipping.costValueType === 'P' ? `${shipping.costValue}%` : `₹${shipping.costValue}`;
};

// Helper function to calculate total marketing from costs
export const calculateTotalMarketing = (costs: MarketplaceCost[]): string => {
  if (!costs || costs.length === 0) return '0%';
  
  const marketingCosts = costs.filter(cost => cost.costCategory === 'MARKETING');
  if (marketingCosts.length === 0) return '0%';
  
  // Take the first marketing cost for display
  const marketing = marketingCosts[0];
  return marketing.costValueType === 'P' ? `${marketing.costValue}%` : `₹${marketing.costValue}`;
};

// Helper function to format cost slabs for display
export const formatCostSlabs = (costs: MarketplaceCost[]): string => {
  if (!costs || costs.length === 0) return 'No slabs';
  
  const ranges = costs.map(cost => cost.costProductRange).filter(Boolean);
  return ranges.join(', ') || 'No range specified';
};

// Helper to get all formatted slabs for a specific category
export const getSlabsForCategory = (costs: MarketplaceCost[], category: 'COMMISSION' | 'SHIPPING' | 'MARKETING'): string[] => {
  if (!costs || costs.length === 0) return ['-'];
  const filtered = costs.filter(c => c.costCategory === category);
  if (filtered.length === 0) return ['-'];
  return filtered.map(c => {
    const value = c.costValueType === 'P' ? `${c.costValue}%` : `₹${c.costValue}`;
    const range = c.costProductRange ? ` (${c.costProductRange})` : '';
    return `${value}${range}`;
  });
};

const marketplaceService = {
  // Get all marketplaces with pagination
  getAllMarketplaces: async (page: number = 0, size: number = 10): Promise<MarketplaceResponse> => {
    console.log('=== MARKETPLACE SERVICE GET ALL ===');
    console.log('Page:', page, 'Size:', size);
    
    try {
      const response = await apiClient.get(`admin/marketplaces?page=${page}&size=${size}`);
      console.log('✓ Marketplaces retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching marketplaces:', error);
      throw error;
    }
  },

  // Get marketplace by ID
  getMarketplaceById: async (id: number): Promise<MarketplaceResponse> => {
    console.log('=== MARKETPLACE SERVICE GET BY ID ===');
    console.log('Marketplace ID:', id);
    
    try {
      const response = await apiClient.get(`admin/marketplaces/${id}`);
      console.log('✓ Marketplace retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching marketplace:', error);
      throw error;
    }
  },

  // Create new marketplace
  createMarketplace: async (request: CreateMarketplaceRequest): Promise<MarketplaceResponse> => {
    console.log('=== MARKETPLACE SERVICE CREATE ===');
    console.log('Request:', request);
    
    try {
      const response = await apiClient.post('admin/marketplaces', request);
      console.log('✓ Marketplace created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating marketplace:', error);
      throw error;
    }
  },

  // Update marketplace
  updateMarketplace: async (id: number, request: UpdateMarketplaceRequest): Promise<MarketplaceResponse> => {
    console.log('=== MARKETPLACE SERVICE UPDATE ===');
    console.log('Marketplace ID:', id);
    console.log('Request:', request);
    
    try {
      const response = await apiClient.put(`admin/marketplaces/${id}`, request);
      console.log('✓ Marketplace updated:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating marketplace:', error);
      throw error;
    }
  },

  // Enable/Disable marketplace
  toggleMarketplace: async (id: number, enabled: boolean): Promise<MarketplaceResponse> => {
    console.log('=== MARKETPLACE SERVICE TOGGLE ===');
    console.log('Marketplace ID:', id, 'Enabled:', enabled);
    
    try {
      const response = await apiClient.patch(`admin/marketplaces/${id}/enable?enabled=${enabled}`);
      console.log('✓ Marketplace toggled:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error toggling marketplace:', error);
      throw error;
    }
  },

  // Get marketplace costs
  getMarketplaceCosts: async (id: number): Promise<MarketplaceResponse> => {
    console.log('=== MARKETPLACE SERVICE GET COSTS ===');
    console.log('Marketplace ID:', id);
    
    try {
      const response = await apiClient.get(`admin/marketplaces/${id}/costs`);
      console.log('✓ Marketplace costs retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching marketplace costs:', error);
      throw error;
    }
  },

  // Delete marketplace
  deleteMarketplace: async (id: number): Promise<MarketplaceResponse> => {
    console.log('=== MARKETPLACE SERVICE DELETE ===');
    console.log('Marketplace ID:', id);
    
    try {
      const response = await apiClient.delete(`admin/marketplaces/${id}`);
      console.log('✓ Marketplace deleted:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting marketplace:', error);
      throw error;
    }
  },

  // Get brand mappings for a marketplace
  getBrandMappings: async (marketplaceId: number): Promise<BrandMappingResponse> => {
    try {
      const response = await apiClient.get(`admin/marketplaces/${marketplaceId}/brand-mappings`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching brand mappings:', error);
      throw error;
    }
  },

  // Save / replace brand mappings for a marketplace
  saveBrandMappings: async (marketplaceId: number, mappings: BrandMappingRequest[]): Promise<BrandMappingResponse> => {
    try {
      const response = await apiClient.put(`admin/marketplaces/${marketplaceId}/brand-mappings`, { mappings });
      return response.data;
    } catch (error: any) {
      console.error('Error saving brand mappings:', error);
      throw error;
    }
  }
};

export default marketplaceService;
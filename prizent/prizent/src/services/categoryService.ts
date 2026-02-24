import apiClient from './api';

export interface Category {
  id: number;
  clientId: number;
  name: string;
  parentCategoryId: number | null;
  enabled: boolean;
  createDateTime: string;
  updateDateTime: string;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  enabled: boolean;
  parentCategoryId: number | null;
  children: CategoryTreeNode[];
  depth: number;
}

export interface CreateCategoryRequest {
  name: string;
  parentCategoryId: number | null;
  enabled?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  parentCategoryId?: number | null;
  enabled?: boolean;
}

export interface CategoryResponse {
  success: boolean;
  message: string;
  category?: Category;
  categories?: Category[];
  tree?: CategoryTreeNode[];
  count?: number;
}

const categoryService = {
  // Get all categories (flat list)
  getAllCategories: async (): Promise<CategoryResponse> => {
    const response = await apiClient.get('admin/categories');
    return response.data;
  },

  // Get category tree (hierarchical structure)
  getCategoryTree: async (): Promise<CategoryResponse> => {
    const response = await apiClient.get('admin/categories/tree');
    return response.data;
  },

  // Get single category by ID
  getCategoryById: async (categoryId: number): Promise<CategoryResponse> => {
    const response = await apiClient.get(`admin/categories/${categoryId}`);
    return response.data;
  },

  // Create new category
  createCategory: async (data: CreateCategoryRequest): Promise<CategoryResponse> => {
    const response = await apiClient.post('admin/categories', data);
    return response.data;
  },

  // Update category
  updateCategory: async (
    categoryId: number,
    data: UpdateCategoryRequest
  ): Promise<CategoryResponse> => {
    const response = await apiClient.put(`admin/categories/${categoryId}`, data);
    return response.data;
  },

  // Enable category
  enableCategory: async (categoryId: number): Promise<CategoryResponse> => {
    const response = await apiClient.patch(`admin/categories/${categoryId}/enable`);
    return response.data;
  },

  // Disable category
  disableCategory: async (categoryId: number): Promise<CategoryResponse> => {
    const response = await apiClient.patch(`admin/categories/${categoryId}/disable`);
    return response.data;
  },

  // Delete category
  deleteCategory: async (categoryId: number): Promise<CategoryResponse> => {
    const response = await apiClient.delete(`admin/categories/${categoryId}`);
    return response.data;
  },
};

export default categoryService;

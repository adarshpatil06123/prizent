import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import categoryService, { Category, CategoryTreeNode, UpdateCategoryRequest } from '../services/categoryService';

interface CategoryContextType {
  categories: Category[];
  categoryTree: CategoryTreeNode[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  fetchCategoryTree: () => Promise<void>;
  createCategory: (name: string, parentCategoryId: number | null, enabled?: boolean) => Promise<any>;
  updateCategory: (id: number, data: UpdateCategoryRequest) => Promise<any>;
  deleteCategory: (id: number) => Promise<any>;
  getCategoryById: (id: number) => Category | undefined;
  toggleCategoryStatus: (id: number) => Promise<void>;
  categoriesCount: number;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

interface CategoryProviderProps {
  children: ReactNode;
}

export const CategoryProvider: React.FC<CategoryProviderProps> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('CategoryContext: Fetching categories...');
      const response = await categoryService.getAllCategories();
      if (response.success && response.categories) {
        setCategories(response.categories);
        console.log('CategoryContext: Categories updated:', response.categories.length, 'categories');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoryTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.getCategoryTree();
      if (response.success && response.tree) {
        setCategoryTree(response.tree);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch category tree');
      console.error('Error fetching category tree:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (name: string, parentCategoryId: number | null, enabled: boolean = true) => {
    setLoading(true);
    setError(null);
    try {
      console.log('CategoryContext: Creating category:', name, 'parent:', parentCategoryId, 'enabled:', enabled);
      const response = await categoryService.createCategory({ name, parentCategoryId, enabled });
      if (response.success) {
        console.log('CategoryContext: Category created successfully, refreshing...');
        await fetchCategories(); // Refresh the shared state
        await fetchCategoryTree(); // Also refresh tree
        return response;
      }
      throw new Error(response.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
      console.error('Error creating category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories, fetchCategoryTree]);

  const updateCategory = useCallback(async (id: number, data: UpdateCategoryRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.updateCategory(id, data);
      if (response.success) {
        await fetchCategories(); // Refresh the shared state
        await fetchCategoryTree();
        return response;
      }
      throw new Error(response.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update category');
      console.error('Error updating category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories, fetchCategoryTree]);

  const deleteCategory = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.deleteCategory(id);
      if (response.success) {
        await fetchCategories(); // Refresh the shared state
        await fetchCategoryTree();
        return response;
      }
      throw new Error(response.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete category');
      console.error('Error deleting category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories, fetchCategoryTree]);

  const getCategoryById = useCallback((id: number): Category | undefined => {
    return categories.find(category => category.id === id);
  }, [categories]);

  const toggleCategoryStatus = useCallback(async (id: number) => {
    const category = getCategoryById(id);
    if (!category) return;
    setLoading(true);
    setError(null);
    try {
      if (category.enabled) {
        await categoryService.disableCategory(id);
      } else {
        await categoryService.enableCategory(id);
      }
      await fetchCategories(); // Refresh the shared state
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle category status');
      console.error('Error toggling category status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCategoryById, fetchCategories]);

  const refreshCategories = useCallback(async () => {
    await fetchCategories();
    await fetchCategoryTree();
  }, [fetchCategories, fetchCategoryTree]);

  // Auto-fetch categories when context is initialized
  useEffect(() => {
    fetchCategories();
    fetchCategoryTree();
  }, [fetchCategories, fetchCategoryTree]);

  const contextValue: CategoryContextType = {
    categories,
    categoryTree,
    loading,
    error,
    fetchCategories,
    fetchCategoryTree,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    toggleCategoryStatus,
    refreshCategories,
    categoriesCount: categories.length
  };

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = (): CategoryContextType => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};

export default CategoryProvider;
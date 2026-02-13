import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { getCustomFields, getCustomFieldValues, CustomFieldResponse, CustomFieldValueResponse } from '../services/customFieldService';
import './CategoriesListPage.css';

interface CategoryDisplay {
  id: number;
  parentCategory: string;
  category: string;
  subCategory: string;
  attributes: string;
  status: 'Active' | 'Inactive';
}

const CategoriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories, categoryTree, loading, error, fetchCategories, fetchCategoryTree, toggleCategoryStatus, deleteCategory } = useCategories();
  
  const [displayCategories, setDisplayCategories] = useState<CategoryDisplay[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [categoryCustomFields, setCategoryCustomFields] = useState<CustomFieldResponse[]>([]);
  const [categoryFieldValues, setCategoryFieldValues] = useState<Map<number, CustomFieldValueResponse[]>>(new Map());
  
  useEffect(() => {
    fetchCategoryTree();
    const loadCustomFields = async () => {
      try {
        const fields = await getCustomFields('c');
        setCategoryCustomFields(fields);
      } catch (err) {
        console.error('Failed to fetch category custom fields:', err);
      }
    };
    loadCustomFields();
  }, [fetchCategoryTree]);

  useEffect(() => {
    const loadFieldValues = async () => {
      if (categories.length === 0) return;
      const valuesMap = new Map<number, CustomFieldValueResponse[]>();
      try {
        await Promise.all(
          categories.map(async (cat) => {
            try {
              const values = await getCustomFieldValues('c', cat.id);
              if (values && values.length > 0) {
                valuesMap.set(cat.id, values);
              }
            } catch {
              // Skip categories with no custom field values
            }
          })
        );
        setCategoryFieldValues(valuesMap);
      } catch (err) {
        console.error('Failed to fetch category field values:', err);
      }
    };
    loadFieldValues();
  }, [categories]);
  
  useEffect(() => {
    const rootCategoryIds = new Set(
      categories.filter(cat => cat.parentCategoryId === null).map(cat => cat.id)
    );
    
    const level1Categories = categories.filter(category => {
      return category.parentCategoryId !== null && rootCategoryIds.has(category.parentCategoryId);
    });
    
    const transformedCategories: CategoryDisplay[] = level1Categories.map(category => {
      const parent = categories.find(cat => cat.id === category.parentCategoryId);
      const children = categories.filter(cat => cat.parentCategoryId === category.id);
      
      const fieldValues = categoryFieldValues.get(category.id) || [];
      let attributesStr = 'None';
      if (fieldValues.length > 0) {
        const fieldNames = fieldValues
          .map(fv => {
            const field = categoryCustomFields.find(cf => cf.id === fv.customFieldId);
            return field ? field.name : null;
          })
          .filter(Boolean);
        if (fieldNames.length > 0) {
          if (fieldNames.length <= 3) {
            attributesStr = fieldNames.join(', ');
          } else {
            attributesStr = fieldNames.slice(0, 3).join(', ') + ' +' + (fieldNames.length - 3);
          }
        }
      } else if (categoryCustomFields.length > 0) {
        const fieldNames = categoryCustomFields
          .filter(cf => cf.enabled)
          .map(cf => cf.name);
        if (fieldNames.length > 0) {
          if (fieldNames.length <= 3) {
            attributesStr = fieldNames.join(', ');
          } else {
            attributesStr = fieldNames.slice(0, 3).join(', ') + ' +' + (fieldNames.length - 3);
          }
        }
      }
      
      return {
        id: category.id,
        parentCategory: parent ? parent.name : 'Root',
        category: category.name,
        subCategory: children.length > 0 ? children.map(c => c.name).join(', ') : 'None',
        attributes: attributesStr,
        status: category.enabled ? 'Active' as const : 'Inactive' as const
      };
    });
    
    setDisplayCategories(transformedCategories);
  }, [categories, categoryTree, categoryCustomFields, categoryFieldValues]);
  
  const handleStatusToggle = async (categoryId: number) => {
    try {
      await toggleCategoryStatus(categoryId);
    } catch (err) {
      console.error('Failed to toggle category status:', err);
    }
  };
  
  const handleDelete = async (categoryId: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(categoryId);
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }
  };
  
  const totalPages = Math.ceil(displayCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategories = displayCategories.slice(startIndex, endIndex);

  if (loading && categories.length === 0) {
    return (
      <div className="categories-page">
        <main className="main-content">
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div>Loading categories...</div>
          </div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="categories-page">
        <main className="main-content">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            <div>Error: {error}</div>
            <button onClick={fetchCategories} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <main className="main-content">
        <header className="page-top-header">
          <h1 className="page-breadcrumb">Configuration &gt; Categories</h1>
          
          <div className="header-actions">
            <button className="icon-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.85713 0.000114168C3.97542 0.000114168 0 3.97554 0 8.85724C0 13.7389 3.97542 17.7144 8.85713 17.7144C10.9899 17.7144 12.9497 16.9555 14.4811 15.6932L18.5368 19.7489C18.8717 20.0837 19.4141 20.0837 19.7489 19.7489C20.0837 19.4141 20.0837 18.8705 19.7489 18.5368L15.6932 14.4811C16.9555 12.9499 17.7144 10.99 17.7144 8.85713C17.7144 3.97542 13.7388 0.000114168 8.85713 0.000114168ZM8.85713 1.7144C12.8125 1.7144 16 4.90182 16 8.85724C16 12.8127 12.8125 16.0001 8.85713 16.0001C4.90171 16.0001 1.71428 12.8127 1.71428 8.85724C1.71428 4.90182 4.90171 1.7144 8.85713 1.7144Z" fill="#1E1E1E"/>
              </svg>
            </button>
            <button className="icon-btn">
              <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.74966 0.25C6.66274 0.25 5.77627 1.13519 5.77627 2.22038V3.15169C3.34058 3.96277 1.58929 6.23466 1.58929 8.9187V14.0271L0.283816 16.7429C0.25865 16.7955 0.247214 16.8535 0.250574 16.9116C0.253933 16.9697 0.271978 17.026 0.303028 17.0753C0.334077 17.1246 0.37712 17.1652 0.428145 17.1934C0.47917 17.2216 0.536515 17.2364 0.594837 17.2366H4.71029V17.2493C4.71029 18.9083 6.07492 20.25 7.74966 20.25C9.4244 20.25 10.787 18.9083 10.787 17.2493V17.2366H14.9025C14.961 17.2369 15.0187 17.2224 15.0701 17.1944C15.1215 17.1664 15.1649 17.1258 15.1963 17.0765C15.2276 17.0271 15.2459 16.9706 15.2494 16.9123C15.2529 16.8539 15.2414 16.7957 15.2162 16.7429L13.91 14.0271V8.9187C13.91 6.23391 12.1578 3.96151 9.72103 3.15102V2.22038C9.72103 1.13519 8.83658 0.25 7.74966 0.25Z" fill="black" stroke="#1E1E1E" strokeWidth="0.5"/>
              </svg>
            </button>
            <button className="icon-btn profile-btn">
              <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0Z" fill="white"/>
              </svg>
            </button>
          </div>
        </header>

        <div className="content-separator"></div>

        <div className="categories-header">
          <div className="header-text">
            <h2 className="categories-title">Categories List</h2>
            <p className="categories-count">{displayCategories.length} Total number of items</p>
          </div>
          
          <button className="add-category-btn" onClick={() => navigate('/add-category')}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 0V10M0 5H10" stroke="#FFFFFF" strokeWidth="2"/>
            </svg>
            ADD CATEGORY
          </button>
        </div>

        <div className="categories-table-container">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Parent Category</th>
                <th>Category</th>
                <th>Sub-Category</th>
                <th>Attributes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.length > 0 ? (
                currentCategories.map((category) => (
                <tr key={category.id}>
                  <td>{category.parentCategory}</td>
                  <td>{category.category}</td>
                  <td>{category.subCategory}</td>
                  <td>{category.attributes}</td>
                  <td>
                    <button 
                      className={'status-badge ' + category.status.toLowerCase()}
                      onClick={() => handleStatusToggle(category.id)}
                      style={{ border: 'none', cursor: 'pointer' }}
                    >
                      {category.status}
                    </button>
                  </td>
                  <td>
                    <div className="action-icons">
                      <button 
                        className="action-btn"
                        onClick={() => navigate('/edit-category/' + category.id)}
                        title="Edit Category"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.9143 0C12.1418 0 11.3694 0.292612 10.7809 0.880547L1.48058 10.1845C1.44913 10.2159 1.42726 10.2556 1.41632 10.2986L0.00812566 15.6873C-0.0144334 15.7734 0.01086 15.8643 0.0730658 15.9265C0.135273 15.9894 0.22619 16.014 0.312324 15.9922L5.70245 14.5838C5.74484 14.5729 5.7838 14.5503 5.81525 14.5196L15.1182 5.21773C16.2939 4.04182 16.2939 2.12692 15.1182 0.950983L15.0478 0.880567C14.4599 0.292613 13.6867 0.000701771 12.9143 0.000701771L12.9143 0Z" fill="#656565"/>
                        </svg>
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => handleDelete(category.id)}
                        title="Delete Category"
                      >
                        <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0Z" fill="#656565"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No categories found. Click "ADD CATEGORY" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            <div className="pagination-info">
              <span>Show {itemsPerPage}</span>
            </div>

            <div className="pagination-controls">
              <button 
                className="page-arrow" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                &lt;
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={'page-number ' + (currentPage === page ? 'active' : '')}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              
              <button 
                className="page-arrow" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CategoriesListPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductsListPage.css';
import productThumb from '../assets/brand_logo.png';
import productService, { Product, PagedResponse, getProductStatusDisplay } from '../services/productService';
import { getCustomFields, getCustomFieldValues, CustomFieldResponse, CustomFieldValueResponse } from '../services/customFieldService';

const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldResponse[]>([]);
  const [productFieldValues, setProductFieldValues] = useState<Map<number, CustomFieldValueResponse[]>>(new Map());

  // Fetch custom fields on component mount
  useEffect(() => {
    const fetchCustomFieldsData = async () => {
      try {
        const fields = await getCustomFields('p'); // 'p' for products
        const enabledFields = fields.filter(f => f.enabled);
        setCustomFields(enabledFields);
        console.log('Loaded product custom fields:', enabledFields);
      } catch (err) {
        console.error('Failed to fetch custom fields:', err);
      }
    };
    fetchCustomFieldsData();
  }, []);

  // Fetch products and their custom field values
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Convert 1-based page to 0-based for API
        const apiPage = currentPage - 1;
        const response: PagedResponse<Product> = await productService.getAllProducts(apiPage, itemsPerPage);
        
        setProducts(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);

        // Fetch custom field values for all products
        const valuesMap = new Map<number, CustomFieldValueResponse[]>();
        await Promise.all(
          response.content.map(async (product) => {
            try {
              const values = await getCustomFieldValues('p', product.id);
              if (values && values.length > 0) {
                valuesMap.set(product.id, values);
              }
            } catch {
              // Skip products with no custom field values
            }
          })
        );
        setProductFieldValues(valuesMap);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again.');
        
        // Fallback: Set empty data if API fails
        setProducts([]);
        setTotalPages(0);
        setTotalElements(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, itemsPerPage]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="products-bg">
      <main className="products-main">
        <header className="products-header">
          <span className="breadcrumb">Configuration &gt; Products</span>
          <div className="header-actions">
            <button className="icon-btn" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.85713 0.000114168C3.97542 0.000114168 0 3.97554 0 8.85724C0 13.7389 3.97542 17.7144 8.85713 17.7144C10.9899 17.7144 12.9497 16.9555 14.4811 15.6932L18.5368 19.7489C18.8717 20.0837 19.4141 20.0837 19.7489 19.7489C20.0837 19.4141 20.0837 18.8705 19.7489 18.5368L15.6932 14.4811C16.9555 12.9499 17.7144 10.99 17.7144 8.85713C17.7144 3.97542 13.7388 0.000114168 8.85713 0.000114168ZM8.85713 1.7144C12.8125 1.7144 16 4.90182 16 8.85724C16 12.8127 12.8125 16.0001 8.85713 16.0001C4.90171 16.0001 1.71428 12.8127 1.71428 8.85724C1.71428 4.90182 4.90171 1.7144 8.85713 1.7144Z" fill="#1E1E1E"/>
              </svg>
            </button>
            <button className="icon-btn" aria-label="Notifications">
              <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.74966 0.25C6.66274 0.25 5.77627 1.13519 5.77627 2.22038V3.15169C3.34058 3.96277 1.58929 6.23466 1.58929 8.9187V14.0271L0.283816 16.7429C0.25865 16.7955 0.247214 16.8535 0.250574 16.9116C0.253933 16.9697 0.271978 17.026 0.303028 17.0753C0.334077 17.1246 0.37712 17.1652 0.428145 17.1934C0.47917 17.2216 0.536515 17.2364 0.594837 17.2366H4.71029V17.2493C4.71029 18.9083 6.07492 20.25 7.74966 20.25C9.4244 20.25 10.787 18.9083 10.787 17.2493V17.2366H14.9025C14.961 17.2369 15.0187 17.2224 15.0701 17.1944C15.1215 17.1664 15.1649 17.1258 15.1963 17.0765C15.2276 17.0271 15.2459 16.9706 15.2494 16.9123C15.2529 16.8539 15.2414 16.7957 15.2162 16.7429L13.91 14.0271V8.9187C13.91 6.23391 12.1578 3.96151 9.72103 3.15102V2.22038C9.72103 1.13519 8.83658 0.25 7.74966 0.25ZM7.7166 0.940239C7.72771 0.939962 7.73847 0.940239 7.74966 0.940239C8.46558 0.940239 9.0295 1.50507 9.0295 2.22038V2.96515C8.61676 2.87928 8.18848 2.83384 7.74966 2.83384C7.30964 2.83384 6.8809 2.8795 6.46712 2.96583V2.22038C6.46712 1.51625 7.01656 0.957515 7.7166 0.940239ZM7.74966 3.5234C10.7881 3.5234 13.2192 5.92639 13.2192 8.9187V14.1032C13.2187 14.1551 13.23 14.2064 13.2522 14.2534L14.354 16.547H1.14266L2.24439 14.2534C2.26753 14.2067 2.27975 14.1553 2.28015 14.1032V8.9187C2.28015 5.92639 4.71119 3.52341 7.74966 3.5234ZM5.40115 17.2366H10.0955V17.2493C10.0955 18.534 9.0578 19.5604 7.74966 19.5604C6.44152 19.5604 5.40115 18.534 5.40115 17.2493V17.2366Z" fill="black" stroke="#1E1E1E" strokeWidth="0.5"/>
              </svg>
            </button>
            <button className="icon-btn profile-btn" aria-label="Profile">
              <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <mask id="path-1-inside-1_166_508" fill="white">
                  <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z"/>
                </mask>
                <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z" stroke="#1E1E1E" strokeWidth="2" mask="url(#path-1-inside-1_166_508)"/>
              </svg>
            </button>
          </div>
        </header>

        <div className="products-divider" />

        <div className="products-toolbar">
          <div className="products-title-block">
            <h2 className="products-list-title">Products List</h2>
            <span className="products-list-count">
              {loading ? 'Loading...' : `${totalElements} Total number of items`}
            </span>
          </div>

          <div className="products-toolbar-actions">
            <button className="import-btn" type="button">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.54546 4.285C9.42472 4.285 9.3093 4.33294 9.22408 4.41817C9.13885 4.50339 9.09091 4.6188 9.09091 4.73955V8.33333C9.09032 8.75177 8.75177 9.09032 8.33333 9.09091H1.66667C1.24823 9.09032 0.909682 8.75177 0.909091 8.33333V1.66667C0.909683 1.24823 1.24823 0.909682 1.66667 0.909091H5.26046C5.51139 0.909091 5.715 0.705485 5.715 0.454545C5.715 0.203606 5.51139 0 5.26046 0H1.66667C0.746333 0.00118364 0.00121212 0.746333 0 1.66667V8.33333C0.00118364 9.25367 0.746333 9.99879 1.66667 10H8.33333C9.25367 9.99882 9.99879 9.25367 10 8.33333V4.73955C10 4.61881 9.95206 4.50339 9.86683 4.41817C9.7816 4.33294 9.6662 4.285 9.54546 4.285Z" fill="#1E1E1E" />
                <path d="M9.2424 0H6.97558C6.72464 0 6.52104 0.203606 6.52104 0.454545C6.52104 0.705485 6.72464 0.909091 6.97558 0.909091H8.44813L4.67858 4.67864C4.50102 4.8562 4.50102 5.14383 4.67858 5.32139C4.85614 5.49895 5.14378 5.49895 5.32134 5.32139L9.09088 1.55185V3.02439C9.09088 3.27533 9.29449 3.47894 9.54543 3.47894C9.79637 3.47894 9.99997 3.27533 9.99997 3.02439V0.757576C9.99938 0.339136 9.66084 0.000590909 9.2424 0Z" fill="#1E1E1E" />
              </svg>
              Import
            </button>
            <button className="add-product-btn" type="button" onClick={() => navigate('/products/add')}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 0C4.75644 0 4.55882 0.197618 4.55882 0.441176V4.55882H0.441176C0.197618 4.55882 0 4.75644 0 5C0 5.24356 0.197618 5.44118 0.441176 5.44118H4.55882V9.55882C4.55882 9.80238 4.75644 10 5 10C5.24356 10 5.44118 9.80238 5.44118 9.55882V5.44118H9.55882C9.80238 5.44118 10 5.24356 10 5C10 4.75644 9.80238 4.55882 9.55882 4.55882H5.44118V0.441176C5.44118 0.197618 5.24356 0 5 0Z" fill="white" />
              </svg>
              Add New Product
            </button>
          </div>
        </div>

        <div className="products-card">
          <div className="products-table">
            <div className="products-table-row products-table-header">
              <div>Product</div>
              <div>SKU Code</div>
              <div>Category</div>
              <div>Units</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {loading ? (
              // Loading state
              <div className="products-table-row">
                <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
                  Loading products...
                </div>
              </div>
            ) : error ? (
              // Error state
              <div className="products-table-row">
                <div style={{ textAlign: 'center', padding: '2rem', color: 'red', gridColumn: '1 / -1' }}>
                  {error}
                </div>
              </div>
            ) : products.length === 0 ? (
              // Empty state
              <div className="products-table-row">
                <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
                  No products found. <a href="/add-product" style={{ color: '#007bff', textDecoration: 'none' }}>Add your first product</a>
                </div>
              </div>
            ) : (
              // Products list
              products.map((product) => {
                const fieldValues = productFieldValues.get(product.id) || [];
                const getFieldValue = (fieldId: number) => {
                  const value = fieldValues.find(v => v.customFieldId === fieldId);
                  return value ? value.value : '-';
                };
                
                return (
                <div className="products-table-row" key={product.id}>
                  <div className="product-cell">
                    <img className="product-thumb" src={productThumb} alt="" />
                    <span className="product-name">{product.name}</span>
                  </div>
                  <div>{product.skuCode}</div>
                  <div>Category {product.categoryId}</div> {/* Will be replaced with actual category name later */}
                  <div>-</div> {/* Units not available in backend model yet */}
                  <div>
                    <span className={`product-status ${getProductStatusDisplay(product.currentType).toLowerCase().replace(/\s/g, '-')}`}>
                      {getProductStatusDisplay(product.currentType)}
                    </span>
                  </div>
                  <div className="action-buttons">
                    <button 
                      className="action-btn edit-btn" 
                      title="Edit"
                      onClick={() => navigate(`/edit-product/${product.id}`)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.9143 0C12.1418 0 11.3694 0.292612 10.7809 0.880547L1.48058 10.1845C1.44913 10.2159 1.42726 10.2556 1.41632 10.2986L0.00812566 15.6873C-0.0144334 15.7734 0.01086 15.8643 0.0730658 15.9265C0.135273 15.9894 0.22619 16.014 0.312324 15.9922L5.70245 14.5838C5.74484 14.5729 5.7838 14.5503 5.81525 14.5196L15.1182 5.21773C16.2939 4.04182 16.2939 2.12692 15.1182 0.950983L15.0478 0.880567C14.4599 0.292613 13.6867 0.000701771 12.9143 0.000701771L12.9143 0ZM12.9143 0.496332C13.5575 0.496332 14.2022 0.742441 14.6951 1.2347L14.7634 1.30306C15.7485 2.28822 15.7485 3.87844 14.7634 4.86361L13.1549 6.47159L9.52723 2.84348L11.135 1.23482C11.6272 0.742585 12.2705 0.496458 12.9144 0.496458L12.9143 0.496332ZM9.17369 3.19685L12.8014 6.82496L5.50887 14.119L0.598061 15.4015L1.88252 10.4902L9.17369 3.19685Z" fill="#656565" />
                      </svg>
                    </button>
                    <button 
                      className="action-btn delete-btn" 
                      title={product.enabled ? "Disable" : "Enable"}
                      onClick={async () => {
                        try {
                          await productService.toggleProductStatus(product.id, !product.enabled);
                          // Refresh the products list
                          window.location.reload(); // Simple refresh for now
                        } catch (err) {
                          console.error('Error toggling product status:', err);
                          alert('Failed to update product status');
                        }
                      }}
                    >
                      <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69569 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
              })
            )}
          </div>

          <div className="pagination">
            <div className="show-30" role="button" tabIndex={0}>
              <span className="show-label">Show</span>
              <span className="show-value">{itemsPerPage}</span>
              <svg className="show-caret" width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="page-numbers">
              <span 
                className="page-prev" 
                style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
              >
                &lt;
              </span>
              {[...Array(totalPages)].map((_, index) => (
                <span 
                  key={index + 1}
                  className={currentPage === index + 1 ? 'page-current' : 'page'}
                  onClick={() => handlePageChange(index + 1)}
                  style={{ cursor: 'pointer' }}
                >
                  {index + 1}
                </span>
              ))}
              <span 
                className="page-next"
                style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
              >
                &gt;
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductsListPage;

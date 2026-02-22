import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MarketplacesListPage.css";
import marketplaceService, { Marketplace, calculateTotalCommission, calculateTotalShipping, calculateTotalMarketing, formatCostSlabs } from '../../services/marketplaceService';
import { getCustomFields, getCustomFieldValues, CustomFieldResponse, CustomFieldValueResponse } from '../../services/customFieldService';

const MarketplacesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldResponse[]>([]);
  const [marketplaceFieldValues, setMarketplaceFieldValues] = useState<Map<number, CustomFieldValueResponse[]>>(new Map());

  // Fetch custom fields on component mount
  useEffect(() => {
    const fetchCustomFieldsData = async () => {
      try {
        const fields = await getCustomFields('m'); // 'm' for marketplaces
        const enabledFields = fields.filter(f => f.enabled);
        setCustomFields(enabledFields);
        console.log('Loaded marketplace custom fields:', enabledFields);
      } catch (err) {
        console.error('Failed to fetch custom fields:', err);
      }
    };
    fetchCustomFieldsData();
  }, []);

  // Fetch marketplaces on component mount and page change
  useEffect(() => {
    fetchMarketplaces();
  }, [currentPage]);

  const fetchMarketplaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert 1-based page to 0-based for API
      const apiPage = currentPage - 1;
      const response = await marketplaceService.getAllMarketplaces(apiPage, itemsPerPage);
      
      if (response.success && response.marketplaces) {
        setMarketplaces(response.marketplaces.content);
        setTotalPages(response.marketplaces.totalPages);
        setTotalElements(response.marketplaces.totalElements);

        // Fetch custom field values for all marketplaces
        const valuesMap = new Map<number, CustomFieldValueResponse[]>();
        await Promise.all(
          response.marketplaces.content.map(async (marketplace: Marketplace) => {
            try {
              const values = await getCustomFieldValues('m', marketplace.id);
              if (values && values.length > 0) {
                valuesMap.set(marketplace.id, values);
              }
            } catch {
              // Skip marketplaces with no custom field values
            }
          })
        );
        setMarketplaceFieldValues(valuesMap);
      } else {
        setError(response.message || 'Failed to load marketplaces');
      }
    } catch (err: any) {
      console.error('Error fetching marketplaces:', err);
      setError('Failed to load marketplaces. Please try again.');
      
      // Fallback: Set empty data if API fails
      setMarketplaces([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (marketplace: Marketplace) => {
    try {
      await marketplaceService.toggleMarketplace(marketplace.id, !marketplace.enabled);
      // Refresh the data after toggle
      await fetchMarketplaces();
    } catch (err: any) {
      console.error('Error toggling marketplace:', err);
      setError('Failed to update marketplace status');
    }
  };

  const handleDeleteMarketplace = async (marketplace: Marketplace) => {
    if (!window.confirm(`Are you sure you want to delete marketplace "${marketplace.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      await marketplaceService.deleteMarketplace(marketplace.id);
      // Refresh the data after delete
      await fetchMarketplaces();
    } catch (err: any) {
      console.error('Error deleting marketplace:', err);
      setError('Failed to delete marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMarketplace = (marketplace: Marketplace) => {
    // Navigate to edit page (implement when edit page is ready)
    navigate(`/marketplaces/edit/${marketplace.id}`);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
      }
    }
    return pages;
  };

  return (
    <div className="marketplaces-bg">
      <main className="marketplaces-main">
        <header className="marketplaces-header">
          <span className="breadcrumb">Configuration &gt; Marketplaces</span>
          <div className="header-actions">
            <button className="icon-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.85713 0.000114168C3.97542 0.000114168 0 3.97554 0 8.85724C0 13.7389 3.97542 17.7144 8.85713 17.7144C10.9899 17.7144 12.9497 16.9555 14.4811 15.6932L18.5368 19.7489C18.8717 20.0837 19.4141 20.0837 19.7489 19.7489C20.0837 19.4141 20.0837 18.8705 19.7489 18.5368L15.6932 14.4811C16.9555 12.9499 17.7144 10.99 17.7144 8.85713C17.7144 3.97542 13.7388 0.000114168 8.85713 0.000114168ZM8.85713 1.7144C12.8125 1.7144 16 4.90182 16 8.85724C16 12.8127 12.8125 16.0001 8.85713 16.0001C4.90171 16.0001 1.71428 12.8127 1.71428 8.85724C1.71428 4.90182 4.90171 1.7144 8.85713 1.7144Z" fill="#1E1E1E"/>
              </svg>
            </button>
            <button className="icon-btn">
              <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.74966 0.25C6.66274 0.25 5.77627 1.13519 5.77627 2.22038V3.15169C3.34058 3.96277 1.58929 6.23466 1.58929 8.9187V14.0271L0.283816 16.7429C0.25865 16.7955 0.247214 16.8535 0.250574 16.9116C0.253933 16.9697 0.271978 17.026 0.303028 17.0753C0.334077 17.1246 0.37712 17.1652 0.428145 17.1934C0.47917 17.2216 0.536515 17.2364 0.594837 17.2366H4.71029V17.2493C4.71029 18.9083 6.07492 20.25 7.74966 20.25C9.4244 20.25 10.787 18.9083 10.787 17.2493V17.2366H14.9025C14.961 17.2369 15.0187 17.2224 15.0701 17.1944C15.1215 17.1664 15.1649 17.1258 15.1963 17.0765C15.2276 17.0271 15.2459 16.9706 15.2494 16.9123C15.2529 16.8539 15.2414 16.7957 15.2162 16.7429L13.91 14.0271V8.9187C13.91 6.23391 12.1578 3.96151 9.72103 3.15102V2.22038C9.72103 1.13519 8.83658 0.25 7.74966 0.25ZM7.7166 0.940239C7.72771 0.939962 7.73847 0.940239 7.74966 0.940239C8.46558 0.940239 9.0295 1.50507 9.0295 2.22038V2.96515C8.61676 2.87928 8.18848 2.83384 7.74966 2.83384C7.30964 2.83384 6.8809 2.8795 6.46712 2.96583V2.22038C6.46712 1.51625 7.01656 0.957515 7.7166 0.940239ZM7.74966 3.5234C10.7881 3.5234 13.2192 5.92639 13.2192 8.9187V14.1032C13.2187 14.1551 13.23 14.2064 13.2522 14.2534L14.354 16.547H1.14266L2.24439 14.2534C2.26753 14.2067 2.27975 14.1553 2.28015 14.1032V8.9187C2.28015 5.92639 4.71119 3.52341 7.74966 3.5234ZM5.40115 17.2366H10.0955V17.2493C10.0955 18.534 9.0578 19.5604 7.74966 19.5604C6.44152 19.5604 5.40115 18.534 5.40115 17.2493V17.2366Z" fill="black" stroke="#1E1E1E" strokeWidth="0.5"/>
              </svg>
            </button>
            <button className="icon-btn profile-btn">
              <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <mask id="path-1-inside-1_166_508" fill="white">
                  <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z"/>
                </mask>
                <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z" stroke="#1E1E1E" strokeWidth="2" mask="url(#path-1-inside-1_166_508)"/>
              </svg>
            </button>
          </div>
        </header>

        <div className="marketplaces-divider" />

        <div className="marketplaces-toolbar">
          <div className="marketplaces-title-block">
            <h2 className="marketplace-list-title">Marketplace List</h2>
            <span className="marketplaces-list-count">
              {loading ? 'Loading...' : `${totalElements} Total number of items`}
            </span>
          </div>

          <button className="add-marketplace-btn" onClick={() => navigate('/marketplaces/add')}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" width="2" height="10" fill="white" />
              <rect y="4" width="10" height="2" fill="white" />
            </svg>
            Add New Marketplace
          </button>
        </div>

        <div className="marketplaces-card">
          {error && (
            <div className="error-message" style={{padding: '20px', textAlign: 'center', color: '#C23939'}}>
              {error}
            </div>
          )}
          
          <div className="marketplaces-table">
            <div className="marketplaces-table-row marketplaces-table-header">
              <div>Name</div>
              <div>Commission</div>
              <div>Shipping</div>
              <div>Marketing</div>
              {customFields.filter(f => f.enabled).map((field) => (
                <div key={field.id}>{field.name}</div>
              ))}
              <div>Status</div>
              <div>Actions</div>
            </div>
            
            {loading ? (
              <div style={{padding: '40px', textAlign: 'center'}}>
                Loading marketplaces...
              </div>
            ) : marketplaces.length === 0 ? (
              <div style={{padding: '40px', textAlign: 'center'}}>
                No marketplaces found. Click "ADD MARKETPLACE" to create your first marketplace.
              </div>
            ) : (
              marketplaces.map((marketplace) => {
                const fieldValues = marketplaceFieldValues.get(marketplace.id) || [];
                const getFieldValue = (fieldId: number) => {
                  const value = fieldValues.find(v => v.customFieldId === fieldId);
                  return value ? value.value : '-';
                };
                
                return (
                <div className="marketplaces-table-row" key={marketplace.id}>
                  <div>{marketplace.name}</div>
                  <div>{calculateTotalCommission(marketplace.costs || [])}</div>
                  <div>{calculateTotalShipping(marketplace.costs || [])}</div>
                  <div>{calculateTotalMarketing(marketplace.costs || [])}</div>
                  {customFields.filter(f => f.enabled).map((field) => (
                    <div key={field.id}>{getFieldValue(field.id)}</div>
                  ))}
                  <div>
                    <span className={`status-badge ${marketplace.enabled ? 'active' : 'inactive'}`}>
                      {marketplace.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                <div className="action-buttons">
                  <button className="action-btn edit-btn" title="Edit" onClick={() => handleEditMarketplace(marketplace)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.9143 0C12.1418 0 11.3694 0.292612 10.7809 0.880547L1.48058 10.1845C1.44913 10.2159 1.42726 10.2556 1.41632 10.2986L0.00812566 15.6873C-0.0144334 15.7734 0.01086 15.8643 0.0730658 15.9265C0.135273 15.9894 0.22619 16.014 0.312324 15.9922L5.70245 14.5838C5.74484 14.5729 5.7838 14.5503 5.81525 14.5196L15.1182 5.21773C16.2939 4.04182 16.2939 2.12692 15.1182 0.950983L15.0478 0.880567C14.4599 0.292613 13.6867 0.000701771 12.9143 0.000701771L12.9143 0ZM12.9143 0.496332C13.5575 0.496332 14.2022 0.742441 14.6951 1.2347L14.7634 1.30306C15.7485 2.28822 15.7485 3.87844 14.7634 4.86361L13.1549 6.47159L9.52723 2.84348L11.135 1.23482C11.6272 0.742585 12.2705 0.496458 12.9144 0.496458L12.9143 0.496332ZM9.17369 3.19685L12.8014 6.82496L5.50887 14.119L0.598061 15.4015L1.88252 10.4902L9.17369 3.19685Z" fill="#656565" />
                    </svg>
                  </button>
                  <button className="action-btn delete-btn" title="Delete" onClick={() => handleDeleteMarketplace(marketplace)}>
                    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565" />
                    </svg>
                  </button>
                </div>
                </div>
              );
              })
            )}
          </div>

          <div className="pagination">
            <div className="show-6">
              Show {itemsPerPage}
              <svg width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 4L9 1" stroke="#454545" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="page-numbers">
              <span 
                className={`page-prev ${currentPage === 1 ? 'disabled' : ''}`}
                onClick={goToPrevious}
                style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                &lt;
              </span>
              {getPageNumbers().map((page, index) => (
                <span
                  key={index}
                  className={page === currentPage ? 'page-current' : 'page'}
                  onClick={() => goToPage(page)}
                  style={{ cursor: 'pointer' }}
                >
                  {page}
                </span>
              ))}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="page-dots">......</span>
              )}
              <span 
                className={`page-next ${currentPage === totalPages ? 'disabled' : ''}`}
                onClick={goToNext}
                style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
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

export default MarketplacesListPage;
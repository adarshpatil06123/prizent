import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddProductPage.css';
import productService, { CreateProductRequest } from '../services/productService';
import { useCategories } from '../contexts/CategoryContext';
import brandService, { Brand } from '../services/brandService';

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories } = useCategories(); // Use CategoryContext
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    brandId: 0,
    skuCode: '',
    categoryId: 0, 
    mrp: 0,
    productCost: 0,
    proposedSellingPriceSales: 0,
    proposedSellingPriceNonSales: 0,
    currentType: 'A'
  });

  // Fetch brands on component mount (categories come from context)
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await brandService.getAllBrands();
        if (response.success && response.brands) {
          setBrands(response.brands);
        }
      } catch (error) {
        console.error('Failed to fetch brands:', error);
      }
    };

    fetchBrands();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (['mrp', 'productCost', 'proposedSellingPriceSales', 'proposedSellingPriceNonSales', 'brandId', 'categoryId'].includes(name)) {
      setFormData((prev: CreateProductRequest) => ({
        ...prev,
        [name]: Number(value)
      }));
    } else {
      setFormData((prev: CreateProductRequest) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.skuCode) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      await productService.createProduct(formData);
      
      alert('Product created successfully!');
      navigate('/products');
      
    } catch (error: any) {
      console.error('Error creating product:', error);
      
      if (error.response?.status === 409) {
        alert('SKU code already exists. Please use a different SKU code.');
      } else if (error.response?.status === 400) {
        alert('Invalid product data. Please check your inputs.');
      } else {
        alert('Failed to create product. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/products');
  };

  return (
    <div className="add-product-bg">
      {/* Header */}
      <header className="add-product-header">
        <div className="header-left">
          <button className="back-btn" type="button" onClick={handleCancel} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 4L6.5 10L12.5 16" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="page-title">Add Product</h1>
        </div>
        <div className="header-icons">
          <button className="icon-btn" aria-label="Search" type="button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.85713 0.000114168C3.97542 0.000114168 0 3.97554 0 8.85724C0 13.7389 3.97542 17.7144 8.85713 17.7144C10.9899 17.7144 12.9497 16.9555 14.4811 15.6932L18.5368 19.7489C18.8717 20.0837 19.4141 20.0837 19.7489 19.7489C20.0837 19.4141 20.0837 18.8705 19.7489 18.5368L15.6932 14.4811C16.9555 12.9499 17.7144 10.99 17.7144 8.85713C17.7144 3.97542 13.7388 0.000114168 8.85713 0.000114168ZM8.85713 1.7144C12.8125 1.7144 16 4.90182 16 8.85724C16 12.8127 12.8125 16.0001 8.85713 16.0001C4.90171 16.0001 1.71428 12.8127 1.71428 8.85724C1.71428 4.90182 4.90171 1.7144 8.85713 1.7144Z" fill="#1E1E1E" />
            </svg>
          </button>
          <button className="icon-btn" aria-label="Notifications" type="button">
            <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.74966 0.25C6.66274 0.25 5.77627 1.13519 5.77627 2.22038V3.15169C3.34058 3.96277 1.58929 6.23466 1.58929 8.9187V14.0271L0.283816 16.7429C0.25865 16.7955 0.247214 16.8535 0.250574 16.9116C0.253933 16.9697 0.271978 17.026 0.303028 17.0753C0.334077 17.1246 0.37712 17.1652 0.428145 17.1934C0.47917 17.2216 0.536515 17.2364 0.594837 17.2366H4.71029V17.2493C4.71029 18.9083 6.07492 20.25 7.74966 20.25C9.4244 20.25 10.787 18.9083 10.787 17.2493V17.2366H14.9025C14.961 17.2369 15.0187 17.2224 15.0701 17.1944C15.1215 17.1664 15.1649 17.1258 15.1963 17.0765C15.2276 17.0271 15.2459 16.9706 15.2494 16.9123C15.2529 16.8539 15.2414 16.7957 15.2162 16.7429L13.91 14.0271V8.9187C13.91 6.23391 12.1578 3.96151 9.72103 3.15102V2.22038C9.72103 1.13519 8.83658 0.25 7.74966 0.25ZM7.7166 0.940239C7.72771 0.939962 7.73847 0.940239 7.74966 0.940239C8.46558 0.940239 9.0295 1.50507 9.0295 2.22038V2.96515C8.61676 2.87928 8.18848 2.83384 7.74966 2.83384C7.30964 2.83384 6.8809 2.8795 6.46712 2.96583V2.22038C6.46712 1.51625 7.01656 0.957515 7.7166 0.940239ZM7.74966 3.5234C10.7881 3.5234 13.2192 5.92639 13.2192 8.9187V14.1032C13.2187 14.1551 13.23 14.2064 13.2522 14.2534L14.354 16.547H1.14266L2.24439 14.2534C2.26753 14.2067 2.27975 14.1553 2.28015 14.1032V8.9187C2.28015 5.92639 4.71119 3.52341 7.74966 3.5234ZM5.40115 17.2366H10.0955V17.2493C10.0955 18.534 9.0578 19.5604 7.74966 19.5604C6.44152 19.5604 5.40115 18.534 5.40115 17.2493V17.2366Z" fill="black" stroke="#1E1E1E" strokeWidth="0.5" />
            </svg>
          </button>
          <button className="icon-btn profile-btn" aria-label="Profile" type="button">
            <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <mask id="path-1-inside-1_166_508" fill="white">
                <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z" />
              </mask>
              <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z" stroke="#1E1E1E" strokeWidth="2" mask="url(#path-1-inside-1_166_508)" />
            </svg>
          </button>
        </div>
      </header>

      {/* Product Details Section */}
      <section className="product-details-section">
        <h2 className="section-title">Product Details</h2>
        <div className="product-details-card">
          {/* Upload Area */}
          <div className="upload-area">
            <div className="upload-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3V17M3 10H17" stroke="#B3B3B3" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="upload-text">Upload file here</p>
          </div>

          {/* Form Fields */}
          <div className="product-form-grid">
            <input 
              type="text" 
              placeholder="Enter product name" 
              className="form-input"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <input 
              type="text" 
              placeholder="SKU code (unique identifier)" 
              className="form-input"
              name="skuCode"
              value={formData.skuCode}
              onChange={handleInputChange}
              required
            />
            <div className="form-input-with-dropdown">
              <select 
                className="form-select" 
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                required
              >
                <option value={0}>Select Category</option>
                {categories
                  .filter(category => 
                    // Only show enabled categories that are not test categories
                    category.enabled && 
                    !['adda', 'test', 'TO', 'top'].includes(category.name.toLowerCase()) &&
                    // Only show non-root categories (categories that can have products)
                    category.parentCategoryId !== null
                  )
                  .map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <svg width="10" height="5" viewBox="0 0 10 5" fill="none">
                <path d="M0 0L5 5L10 0H0Z" fill="#1E1E1E"/>
              </svg>
            </div>
            <input 
              type="number" 
              placeholder="MRP (₹)" 
              className="form-input"
              name="mrp"
              value={formData.mrp}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
            <input 
              type="number" 
              placeholder="Product Cost (₹)" 
              className="form-input"
              name="productCost"
              value={formData.productCost}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
            <input 
              type="number" 
              placeholder="Selling Price - Sales (₹)" 
              className="form-input"
              name="proposedSellingPriceSales"
              value={formData.proposedSellingPriceSales}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
            <input 
              type="number" 
              placeholder="Selling Price - Non Sales (₹)" 
              className="form-input"
              name="proposedSellingPriceNonSales"
              value={formData.proposedSellingPriceNonSales}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
            <div className="form-input-with-dropdown">
              <select 
                className="form-select" 
                name="currentType"
                value={formData.currentType}
                onChange={handleInputChange}
              >
                <option value="T">Trade</option>
                <option value="A">Active</option>
                <option value="N">Non-Active</option>
              </select>
              <svg width="10" height="5" viewBox="0 0 10 5" fill="none">
                <path d="M0 0L5 5L10 0" fill="#454545" />
              </svg>
            </div>
            <div className="form-input-with-dropdown">
              <select 
                className="form-select"
                name="brandId"
                value={formData.brandId}
                onChange={handleInputChange}
              >
                <option value={0}>Select Brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <svg width="10" height="5" viewBox="0 0 10 5" fill="none">
                <path d="M0 0L5 5L10 0" fill="#454545" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
        <button className="btn-add" onClick={handleAddProduct}>
          SAVE
        </button>
      </div>
    </div>
  );
};

export default AddProductPage;

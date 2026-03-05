import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductDetailsPage.css';
import pricingImage from '../assets/prizing.png';

interface MarketplaceData {
  name: string;
  status: 'Active' | 'Inactive';
  sellingPrice: string;
  marginPercent: string;
  commission: string;
  costSlab: string;
  lastSync: string;
}

const ProductDetailsPage: React.FC = () => {
  const navigate = useNavigate();

  const marketplaceData: MarketplaceData[] = [
    {
      name: 'Amazon',
      status: 'Active',
      sellingPrice: '₹999',
      marginPercent: '33%',
      commission: '18%',
      costSlab: '₹329-₹1000',
      lastSync: '29/01/2026'
    },
    {
      name: 'Flipkart',
      status: 'Inactive',
      sellingPrice: '₹949',
      marginPercent: '-',
      commission: '16%',
      costSlab: '-',
      lastSync: '28/01/2026'
    },
    {
      name: 'Myntra',
      status: 'Active',
      sellingPrice: '₹1199',
      marginPercent: '25%',
      commission: '20%',
      costSlab: '₹329-₹1000',
      lastSync: '25/01/2026'
    }
  ];

  const handleBack = () => {
    navigate(-1);
  };

  const handleCalculatePrice = () => {
    navigate('/price-calculator');
  };

  const handleEdit = () => {
    // Handle edit functionality
  };

  return (
    <div className="product-details-container">
      <header className="details-header">
        <div className="header-left">
          <button className="back-arrow-btn" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="details-title">Product Details</h1>
        </div>
        <div className="header-actions">
          <button className="icon-btn-details">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.85713 0.000114168C3.97542 0.000114168 0 3.97554 0 8.85724C0 13.7389 3.97542 17.7144 8.85713 17.7144C10.9899 17.7144 12.9497 16.9555 14.4811 15.6932L18.5368 19.7489C18.8717 20.0837 19.4141 20.0837 19.7489 19.7489C20.0837 19.4141 20.0837 18.8705 19.7489 18.5368L15.6932 14.4811C16.9555 12.9499 17.7144 10.99 17.7144 8.85713C17.7144 3.97542 13.7388 0.000114168 8.85713 0.000114168ZM8.85713 1.7144C12.8125 1.7144 16 4.90182 16 8.85724C16 12.8127 12.8125 16.0001 8.85713 16.0001C4.90171 16.0001 1.71428 12.8127 1.71428 8.85724C1.71428 4.90182 4.90171 1.7144 8.85713 1.7144Z" fill="#1E1E1E"/>
            </svg>
          </button>
          <button className="icon-btn-details">
            <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.74966 0.25C6.66274 0.25 5.77627 1.13519 5.77627 2.22038V3.15169C3.34058 3.96277 1.58929 6.23466 1.58929 8.9187V14.0271L0.283816 16.7429C0.25865 16.7955 0.247214 16.8535 0.250574 16.9116C0.253933 16.9697 0.271978 17.026 0.303028 17.0753C0.334077 17.1246 0.37712 17.1652 0.428145 17.1934C0.47917 17.2216 0.536515 17.2364 0.594837 17.2366H4.71029V17.2493C4.71029 18.9083 6.07492 20.25 7.74966 20.25C9.4244 20.25 10.787 18.9083 10.787 17.2493V17.2366H14.9025C14.961 17.2369 15.0187 17.2224 15.0701 17.1944C15.1215 17.1664 15.1649 17.1258 15.1963 17.0765C15.2276 17.0271 15.2459 16.9706 15.2494 16.9123C15.2529 16.8539 15.2414 16.7957 15.2162 16.7429L13.91 14.0271V8.9187C13.91 6.23391 12.1578 3.96151 9.72103 3.15102V2.22038C9.72103 1.13519 8.83658 0.25 7.74966 0.25ZM7.7166 0.940239C7.72771 0.939962 7.73847 0.940239 7.74966 0.940239C8.46558 0.940239 9.0295 1.50507 9.0295 2.22038V2.96515C8.61676 2.87928 8.18848 2.83384 7.74966 2.83384C7.30964 2.83384 6.8809 2.8795 6.46712 2.96583V2.22038C6.46712 1.51625 7.01656 0.957515 7.7166 0.940239ZM7.74966 3.5234C10.7881 3.5234 13.2192 5.92639 13.2192 8.9187V14.1032C13.2187 14.1551 13.23 14.2064 13.2522 14.2534L14.354 16.547H1.14266L2.24439 14.2534C2.26753 14.2067 2.27975 14.1553 2.28015 14.1032V8.9187C2.28015 5.92639 4.71119 3.52341 7.74966 3.5234ZM5.40115 17.2366H10.0955V17.2493C10.0955 18.534 9.0578 19.5604 7.74966 19.5604C6.44152 19.5604 5.40115 18.534 5.40115 17.2493V17.2366Z" fill="black" stroke="#1E1E1E" strokeWidth="0.5"/>
            </svg>
          </button>
          <button className="icon-btn-details profile-btn">
            <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <mask id="path-1-inside-1_166_508" fill="white">
                <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z"/>
              </mask>
              <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z" stroke="#1E1E1E" strokeWidth="2" mask="url(#path-1-inside-1_166_508)"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="header-divider" />

      <div className="product-card-details">
        <img src={pricingImage} alt="Product" className="product-image-details" />
        <div className="product-info">
          <h2 className="product-title-main">Men's Blue Cotton T-Shirt</h2>
          <p className="product-brand">by UrbanThread</p>
          <span className="top-seller-badge">Top Seller</span>
          <p className="product-sku">SKU: MBTS-BLU-M-0426</p>
          <p className="category-label">Category → Subcategory:</p>
          <p className="product-category">Topwear → T-Shirts</p>
          <p className="mrp-label">MRP:</p>
          <p className="product-mrp">499rs</p>
          <p className="product-stock">Stock: 50 units</p>
        </div>
      </div>

      <div className="action-buttons-section">
        <button className="edit-btn" onClick={handleEdit}>edit</button>
        <button className="calculate-price-btn" onClick={handleCalculatePrice}>Calculate Price</button>
      </div>

      <h2 className="marketplace-overview-title">Marketplace Overview</h2>

      <div className="marketplace-table-card">
        <div className="marketplace-table">
          <div className="table-header">
            <div className="header-cell" style={{ width: '250px' }}>Marketplace</div>
            <div className="header-cell" style={{ width: '150px' }}>Status</div>
            <div className="header-cell" style={{ width: '220px' }}>Selling Price</div>
            <div className="header-cell" style={{ width: '180px' }}>Margin %</div>
            <div className="header-cell" style={{ width: '220px' }}>Commission</div>
            <div className="header-cell" style={{ width: '250px' }}>Cost Slab</div>
            <div className="header-cell" style={{ width: '180px' }}>Last Sync</div>
          </div>
          <div className="table-header-divider" />
          {marketplaceData.map((item, index) => (
            <React.Fragment key={index}>
              <div className="table-row">
                <div className="table-cell" style={{ width: '250px' }}>{item.name}</div>
                <div className="table-cell" style={{ width: '150px' }}>
                  <span className={`status-badge ${item.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="table-cell" style={{ width: '220px' }}>{item.sellingPrice}</div>
                <div className="table-cell" style={{ width: '180px' }}>{item.marginPercent}</div>
                <div className="table-cell" style={{ width: '220px' }}>{item.commission}</div>
                <div className="table-cell" style={{ width: '250px' }}>{item.costSlab}</div>
                <div className="table-cell" style={{ width: '180px' }}>{item.lastSync}</div>
              </div>
              {index < marketplaceData.length - 1 && <div className="table-row-divider" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;

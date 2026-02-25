import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PriceCalculationPage.css';
import pricingImage from '../assets/prizing.png';
import { Marketplace } from '../services/marketplaceService';
import { Product } from '../services/productService';
import { calculatePricing, savePricing, PricingCalcResponse, PricingVersionDto } from '../services/pricingService';

interface LocationState {
  marketplace?: Marketplace;
  product?: Product;
}

const PriceCalculationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};

  const marketplace = state.marketplace;
  const product = state.product;

  const [activeTab, setActiveTab] = useState('normal');
  const [pricingMode, setPricingMode] = useState('selling');
  const [inputValue, setInputValue] = useState(
    product?.proposedSellingPriceSales ? String(product.proposedSellingPriceSales) : ''
  );

  const [pricingResult, setPricingResult] = useState<PricingCalcResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [inputGstStr, setInputGstStr] = useState('');

  const [savedVersion, setSavedVersion] = useState<PricingVersionDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fallback display values - use API result when available, else fallback to 0
  const productCost = pricingResult?.productCost ?? product?.productCost ?? 0;
  const commission = pricingResult?.commission ?? 0;
  const shipping = pricingResult?.shipping ?? 0;
  const marketing = pricingResult?.marketing ?? 0;
  const outputGst = pricingResult?.outputGst ?? 0;
  const inputGst  = pricingResult?.inputGst ?? 0;
  const gstDifference = pricingResult?.gstDifference ?? 0;
  const netRealisation = pricingResult?.netRealisation ?? 0;
  const profit = pricingResult?.profit ?? 0;
  const profitPercentage = pricingResult ? pricingResult.profitPercentage.toFixed(1) : '0.0';
  const sellingPrice = pricingResult?.sellingPrice ?? 0;
  const totalCost = productCost + commission + shipping + marketing;

  // Marketplace cost display metadata (for labels, e.g. "15%" or "₹50")
  const costs = marketplace?.costs ?? [];
  const commissionCost = costs.find(c => c.costCategory === 'COMMISSION');
  const shippingCost = costs.find(c => c.costCategory === 'SHIPPING');
  const marketingCost = costs.find(c => c.costCategory === 'MARKETING');

  // Debounced API call
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCalculation = (value: string, mode: string, gstStr: string = '') => {
    if (!product || !marketplace || !value) return;
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setIsCalculating(true);
      setCalcError(null);
      try {
        const inputGstAmount = (product.productCost ?? 0) * (parseFloat(gstStr) || 0) / 100;
        const result = await calculatePricing({
          skuId: product.id,
          marketplaceId: marketplace.id,
          mode: mode === 'profit' ? 'PROFIT_PERCENT' : 'SELLING_PRICE',
          value: numVal,
          inputGst: inputGstAmount,
        });
        setPricingResult(result);
        // When mode is profit, update input to show the calculated selling price
        if (mode === 'profit') {
          setInputValue(result.sellingPrice.toFixed(2));
          setPricingMode('selling');
        }
      } catch (err: any) {
        setCalcError(err?.response?.data?.message ?? 'Calculation failed');
      } finally {
        setIsCalculating(false);
      }
    }, 500);
  };

  // Auto-trigger on input change when in selling price mode
  useEffect(() => {
    if (pricingMode === 'selling') {
      triggerCalculation(inputValue, 'selling', inputGstStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  // Initial calculation if we have a default value
  useEffect(() => {
    if (inputValue) triggerCalculation(inputValue, pricingMode, inputGstStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!product || !marketplace || !pricingResult) return;
    setIsSaving(true);
    setSaveError(null);
    setSavedVersion(null);
    try {
      const version = await savePricing({
        skuId: product.id,
        marketplaceId: marketplace.id,
        mode: 'SELLING_PRICE',
        value: pricingResult.sellingPrice,
        inputGst: (product.productCost ?? 0) * (parseFloat(inputGstStr) || 0) / 100,
      });
      setSavedVersion(version);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const historyData: { date: string; user: string; oldPrice: string; newPrice: string; marketplace: string }[] = [];

  return (
    <div className="price-calc-container">
      <main className="price-calc-content">
        {/* Header */}
        <header className="calc-header">
          <div className="header-left-section">
            <button className="back-arrow" onClick={() => navigate(-1)}>
              <svg width="18" height="11" viewBox="0 0 18 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 5.5L17 5.5M1 5.5L5.5 1M1 5.5L5.5 10" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="calc-title">pricing calculation</h1>
          </div>
          <div className="header-actions-calc">
            <button className="icon-btn-calc search-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.85713 0.000114168C3.97542 0.000114168 0 3.97554 0 8.85724C0 13.7389 3.97542 17.7144 8.85713 17.7144C10.9899 17.7144 12.9497 16.9555 14.4811 15.6932L18.5368 19.7489C18.8717 20.0837 19.4141 20.0837 19.7489 19.7489C20.0837 19.4141 20.0837 18.8705 19.7489 18.5368L15.6932 14.4811C16.9555 12.9499 17.7144 10.99 17.7144 8.85713C17.7144 3.97542 13.7388 0.000114168 8.85713 0.000114168ZM8.85713 1.7144C12.8125 1.7144 16 4.90182 16 8.85724C16 12.8127 12.8125 16.0001 8.85713 16.0001C4.90171 16.0001 1.71428 12.8127 1.71428 8.85724C1.71428 4.90182 4.90171 1.7144 8.85713 1.7144Z" fill="#1E1E1E"/>
              </svg>
            </button>
            <button className="icon-btn-calc notification-btn">
              <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.74966 0.25C6.66274 0.25 5.77627 1.13519 5.77627 2.22038V3.15169C3.34058 3.96277 1.58929 6.23466 1.58929 8.9187V14.0271L0.283816 16.7429C0.25865 16.7955 0.247214 16.8535 0.250574 16.9116C0.253933 16.9697 0.271978 17.026 0.303028 17.0753C0.334077 17.1246 0.37712 17.1652 0.428145 17.1934C0.47917 17.2216 0.536515 17.2364 0.594837 17.2366H4.71029V17.2493C4.71029 18.9083 6.07492 20.25 7.74966 20.25C9.4244 20.25 10.787 18.9083 10.787 17.2493V17.2366H14.9025C14.961 17.2369 15.0187 17.2224 15.0701 17.1944C15.1215 17.1664 15.1649 17.1258 15.1963 17.0765C15.2276 17.0271 15.2459 16.9706 15.2494 16.9123C15.2529 16.8539 15.2414 16.7957 15.2162 16.7429L13.91 14.0271V8.9187C13.91 6.23391 12.1578 3.96151 9.72103 3.15102V2.22038C9.72103 1.13519 8.83658 0.25 7.74966 0.25ZM7.7166 0.940239C7.72771 0.939962 7.73847 0.940239 7.74966 0.940239C8.46558 0.940239 9.0295 1.50507 9.0295 2.22038V2.96515C8.61676 2.87928 8.18848 2.83384 7.74966 2.83384C7.30964 2.83384 6.8809 2.8795 6.46712 2.96583V2.22038C6.46712 1.51625 7.01656 0.957515 7.7166 0.940239ZM7.74966 3.5234C10.7881 3.5234 13.2192 5.92639 13.2192 8.9187V14.1032C13.2187 14.1551 13.23 14.2064 13.2522 14.2534L14.354 16.547H1.14266L2.24439 14.2534C2.26753 14.2067 2.27975 14.1553 2.28015 14.1032V8.9187C2.28015 5.92639 4.71119 3.52341 7.74966 3.5234ZM5.40115 17.2366H10.0955V17.2493C10.0955 18.534 9.0578 19.5604 7.74966 19.5604C6.44152 19.5604 5.40115 18.534 5.40115 17.2493V17.2366Z" fill="black" stroke="#1E1E1E" strokeWidth="0.5"/>
              </svg>
            </button>
            <button className="icon-btn-calc profile-btn-calc">
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

        {/* Product Info Card */}
        <div className="product-info-card-calc">
          <img src={pricingImage} alt="Product" className="product-image-calc" />
          <div className="product-details-calc">
            <h2 className="product-title-calc">
              {product ? `${product.name} (${product.skuCode})` : 'No product selected'} → {marketplace?.name || 'No marketplace selected'}
            </h2>
            <p className="product-margin-calc">
              {pricingResult
                ? `${profitPercentage}% margin`
                : 'Enter selling price to see margin'}
            </p>
          </div>
          {product && <div className="top-seller-badge">{product.currentType === 'T' ? 'Top Seller' : product.currentType === 'A' ? 'Avg Seller' : 'Non-Seller'}</div>}
        </div>

        {/* Select Pricing Mode */}
        <h3 className="section-title-calc">Select Pricing Mode</h3>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'normal' ? 'active' : ''}`}
            onClick={() => setActiveTab('normal')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.6021 14.5907C13.9126 14.5907 14.1643 14.8426 14.1643 15.1531C14.1643 15.4638 13.9126 15.7157 13.6021 15.7157C13.2916 15.7157 13.0397 15.4638 13.0397 15.1531C13.0397 14.8426 13.2916 14.5907 13.6021 14.5907ZM13.6021 11.4883C13.9126 11.4883 14.1643 11.7402 14.1643 12.0509C14.1643 12.3614 13.9126 12.6131 13.6021 12.6131C13.2916 12.6131 13.0397 12.3614 13.0397 12.0509C13.0397 11.7402 13.2916 11.4883 13.6021 11.4883ZM11.93 14.0103C11.7048 14.0103 11.5219 13.8273 11.5219 13.6021C11.5219 13.3766 11.7048 13.1937 11.93 13.1937H15.2744C15.4996 13.1937 15.6825 13.3766 15.6825 13.6021C15.6825 13.8273 15.4996 14.0103 15.2744 14.0103H11.93ZM3.50412 15.0734C3.345 15.2328 3.08661 15.2328 2.92726 15.0734C2.76791 14.9143 2.76791 14.6559 2.92726 14.4965L3.82149 13.6025L2.92726 12.7083C2.76791 12.549 2.76791 12.2906 2.92726 12.1315C3.08661 11.9721 3.345 11.9721 3.50412 12.1315L4.39835 13.0255L5.2919 12.1319C5.45125 11.9726 5.70964 11.9726 5.86899 12.1319C6.02812 12.2913 6.02812 12.5496 5.86899 12.7088L4.97543 13.6025L5.86899 14.4961C6.02812 14.6554 6.02812 14.9136 5.86899 15.073C5.70964 15.2323 5.45125 15.2323 5.2919 15.073L4.39835 14.1796L3.50412 15.0734ZM11.93 4.80651C11.7048 4.80651 11.5219 4.62357 11.5219 4.39813C11.5219 4.1729 11.7048 3.98996 11.93 3.98996H15.2744C15.4996 3.98996 15.6825 4.1729 15.6825 4.39813C15.6825 4.62357 15.4996 4.80651 15.2744 4.80651H11.93ZM2.72563 4.80651C2.5004 4.80651 2.31746 4.62357 2.31746 4.39813C2.31746 4.1729 2.5004 3.98996 2.72563 3.98996H3.98996V2.72563C3.98996 2.5004 4.1729 2.31746 4.39813 2.31746C4.62357 2.31746 4.80651 2.5004 4.80651 2.72563V3.98996H6.07018C6.2954 3.98996 6.47834 4.1729 6.47834 4.39813C6.47834 4.62357 6.2954 4.80651 6.07018 4.80651H4.80651V6.07018C4.80651 6.2954 4.62357 6.47834 4.39813 6.47834C4.1729 6.47834 3.98996 6.2954 3.98996 6.07018V4.80651H2.72563ZM18 9.20419H9.20419V18H14.2397C15.2737 18 16.214 17.5767 16.8955 16.8955C17.5769 16.2142 18 15.2737 18 14.2397V9.20419ZM8.7958 9.20419H0V14.2397C0 15.2742 0.422854 16.2142 1.10387 16.8952C1.78578 17.5771 2.72585 18 3.76051 18H8.7958V9.20419ZM9.20419 0V8.79581H18V3.76051C18 2.72585 17.5771 1.78578 16.8961 1.10476C16.2142 0.422854 15.2741 0 14.2397 0H9.20419ZM8.7958 0H3.76051C2.73141 0 1.79557 0.418403 1.1101 1.09898C0.423521 1.78622 0 2.72674 0 3.76051V8.79581H8.7958V0Z" fill="#1E1E1E"/>
            </svg>
            Normal Calculations
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rebate' ? 'active' : ''}`}
            onClick={() => setActiveTab('rebate')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.68991 6.43711e-05C7.43436 -0.00105148 7.1788 0.0123398 6.92438 0.0402391C6.3017 0.455354 5.75937 0.979853 5.32414 1.58914C5.22259 1.72752 5.1322 1.87482 5.05632 2.02882H5.77051C6.19679 2.02771 6.58848 2.26317 6.78711 2.64034C6.9824 3.03092 6.94446 3.49625 6.69003 3.85112L2.63915 9.24438C2.42267 9.53117 2.08343 9.69855 1.72522 9.69632C1.62256 9.69744 1.52101 9.68405 1.42169 9.65615C1.18065 9.59366 0.966382 9.45082 0.81686 9.25106L0 8.1597C0.118287 10.1728 1.02218 12.0609 2.51751 13.4156C4.01174 14.7703 5.97904 15.4845 7.99448 15.4052C10.0109 15.326 11.9159 14.4589 13.2995 12.9915C14.6832 11.523 15.4354 9.56996 15.3963 7.55367C15.3561 5.53608 14.527 3.61563 13.0852 2.20297C11.6446 0.790217 9.70763 6.43711e-05 7.68991 6.43711e-05ZM9.55797 9.56448C9.37942 10.0845 8.97099 10.4918 8.44986 10.667C8.38737 10.6893 8.31818 10.696 8.25569 10.7128V11.2729C8.25569 11.5888 8.00014 11.8443 7.68434 11.8443C7.36853 11.8443 7.11299 11.5887 7.11299 11.2729V10.6849C6.95006 10.6358 6.79494 10.5666 6.64988 10.4784L6.02719 10.0901C5.89886 10.0097 5.80624 9.88138 5.77165 9.73408C5.73705 9.58566 5.76384 9.43055 5.84418 9.30111C5.92453 9.17278 6.05286 9.08016 6.20016 9.04668C6.34858 9.01209 6.50369 9.03887 6.63313 9.11922L7.25582 9.50757C7.50021 9.65487 7.79703 9.68611 8.06708 9.59349C8.25232 9.53212 8.40186 9.39263 8.47328 9.21074C8.60496 8.81682 8.52461 8.67399 7.48459 8.2399V8.23879C7.12972 8.10265 6.78937 7.93303 6.46687 7.73106C5.87766 7.37619 5.58642 6.67986 5.74711 6.01032C5.87544 5.44677 6.2727 4.98032 6.81059 4.76495C6.90879 4.72924 7.01034 4.69799 7.11301 4.67344V4.13112C7.11301 3.8153 7.36856 3.55977 7.68436 3.55977C8.00017 3.55977 8.25571 3.81531 8.25571 4.13112V4.70804C8.41082 4.76048 8.56036 4.82967 8.70096 4.91337L9.32922 5.30728L9.33034 5.3084C9.59704 5.47579 9.67852 5.82841 9.51223 6.09624C9.34484 6.36406 8.99222 6.44553 8.7244 6.27925L8.09614 5.88533C7.97227 5.8061 7.83055 5.75923 7.68437 5.74807C7.53818 5.74026 7.39089 5.76592 7.25586 5.82284C7.06168 5.88979 6.9155 6.0516 6.86751 6.25135C6.82175 6.46895 6.84519 6.59953 7.11301 6.7881C7.36967 6.94545 7.64197 7.07712 7.92427 7.18202C8.71879 7.51346 10.0556 8.07362 9.55797 9.56448Z" fill="#1E1E1E"/>
            </svg>
            Rebate Calculation
          </button>
          <button 
            className={`tab-btn ${activeTab === 'coupon' ? 'active' : ''}`}
            onClick={() => setActiveTab('coupon')}
          >
            <svg width="18" height="11" viewBox="0 0 18 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.22727 0C0.55444 0 0 0.532438 0 1.17857V3.53571C2.25e-05 3.75267 0.183166 3.92855 0.409091 3.92857C1.31768 3.92857 2.04545 4.62747 2.04545 5.5C2.04545 6.37253 1.31768 7.07143 0.409091 7.07143C0.183166 7.07145 2.25e-05 7.24733 0 7.46429V9.82143C0 10.4676 0.55444 11 1.22727 11H4.09091V8.25C4.09091 8.03303 4.27407 7.85714 4.5 7.85714C4.72593 7.85714 4.90909 8.03303 4.90909 8.25V11H16.7727C17.4456 11 18 10.4676 18 9.82143V7.46429C18 7.24733 17.8168 7.07145 17.5909 7.07143C16.6823 7.07143 15.9545 6.37253 15.9545 5.5C15.9545 4.62747 16.6823 3.92857 17.5909 3.92857C17.8168 3.92855 18 3.75267 18 3.53571V1.17857C18 0.532438 17.4456 0 16.7727 0H4.90909V2.75C4.90909 2.96697 4.72593 3.14286 4.5 3.14286C4.27407 3.14286 4.09091 2.96697 4.09091 2.75V0H1.22727ZM11.8421 2.39858C12.0442 2.4956 12.1261 2.73163 12.025 2.92571L9.1614 8.42571C9.06036 8.61982 8.81459 8.69849 8.61248 8.60142C8.41036 8.5044 8.32843 8.26837 8.42951 8.07429L11.2931 2.57429C11.4092 2.35778 11.6324 2.30925 11.8421 2.39858ZM8.18182 2.94643C8.85478 2.94643 9.40909 3.47875 9.40909 4.125C9.40909 4.77125 8.85478 5.30357 8.18182 5.30357C7.50886 5.30357 6.95455 4.77125 6.95455 4.125C6.95455 3.47875 7.50886 2.94643 8.18182 2.94643ZM8.18182 3.73214C7.95104 3.73214 7.77273 3.90338 7.77273 4.125C7.77273 4.34662 7.95104 4.51786 8.18182 4.51786C8.4126 4.51786 8.59091 4.34662 8.59091 4.125C8.59091 3.90338 8.4126 3.73214 8.18182 3.73214ZM4.5 3.92857C4.72593 3.92857 4.90909 4.10446 4.90909 4.32143V6.67857C4.90909 6.89554 4.72593 7.07143 4.5 7.07143C4.27407 7.07143 4.09091 6.89554 4.09091 6.67857V4.32143C4.09091 4.10446 4.27407 3.92857 4.5 3.92857ZM12.2727 5.69643C12.9457 5.69643 13.5 6.22875 13.5 6.875C13.5 7.52125 12.9457 8.05357 12.2727 8.05357C11.5998 8.05357 11.0455 7.52125 11.0455 6.875C11.0455 6.22875 11.5998 5.69643 12.2727 5.69643ZM12.2727 6.48214C12.0419 6.48214 11.8636 6.65338 11.8636 6.875C11.8636 7.09662 12.0419 7.26786 12.2727 7.26786C12.5035 7.26786 12.6818 7.09662 12.6818 6.875C12.6818 6.65338 12.5035 6.48214 12.2727 6.48214Z" fill="#1E1E1E"/>
            </svg>
            Coupon Calculation
          </button>
        </div>

        {/* Pricing Workspace Title */}
        <h3 className="workspace-title">Pricing Workspace</h3>

        {/* Two Column Layout */}
        <div className="workspace-grid">
          {/* Left: Set Pricing */}
          <div className="set-pricing-card">
            <h4 className="card-title-calc">Set Pricing</h4>
            <div className="pricing-mode-selector">
              <label className="radio-option">
                <input 
                  type="radio" 
                  name="pricingMode" 
                  value="selling"
                  checked={pricingMode === 'selling'}
                  onChange={(e) => setPricingMode(e.target.value)}
                />
                <span>By Selling Price</span>
              </label>
              <label className="radio-option">
                <input 
                  type="radio" 
                  name="pricingMode" 
                  value="profit"
                  checked={pricingMode === 'profit'}
                  onChange={(e) => setPricingMode(e.target.value)}
                />
                <span>By Desired Profit</span>
              </label>
            </div>
            <div className="price-input-wrapper">
              <input 
                type="number" 
                className="price-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={pricingMode === 'selling' ? 'Enter selling price' : 'Enter desired profit %'}
              />
              <svg className="dropdown-arrow" width="8" height="4" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L4 3L7 1" stroke="#454545" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, color: '#7C7C7C', display: 'block', marginBottom: 4 }}>Input GST (%)</label>
              <input
                type="number"
                className="price-input"
                value={inputGstStr}
                onChange={(e) => setInputGstStr(e.target.value)}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
            <button
              className="calculate-btn"
              onClick={() => {
                if (pricingMode === 'profit') {
                  triggerCalculation(inputValue, 'profit', inputGstStr);
                } else {
                  triggerCalculation(inputValue, 'selling', inputGstStr);
                }
              }}
            >
              {pricingMode === 'selling' ? 'Calculate' : 'Get Selling Price'}
            </button>
            <button
              className="save-pricing-btn"
              onClick={handleSave}
              disabled={!pricingResult || isSaving}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '10px 0',
                background: !pricingResult || isSaving ? '#ccc' : '#1a56db',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: !pricingResult || isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving…' : 'Save Pricing'}
            </button>
          </div>

          {/* Right: Net Outcome */}
          <div className="net-outcome-card">
            <h4 className="card-title-calc">
              Net Outcome
              {isCalculating && <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>calculating…</span>}
              {calcError && <span style={{ marginLeft: 8, fontSize: 12, color: '#c00' }}>{calcError}</span>}
            </h4>
            <div className="outcome-grid">
              <div className="cost-summary">
                <h5 className="summary-title">Cost Summary</h5>
                <div className="cost-item">
                  <span className="cost-label">Product Cost</span>
                  <span className="cost-value blue">₹{productCost.toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Commission {commissionCost ? `(${commissionCost.costValueType === 'P' ? commissionCost.costValue + '%' : '₹' + commissionCost.costValue})` : ''}</span>
                  <span className="cost-value red">₹{commission.toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Shipping {shippingCost ? `(${shippingCost.costValueType === 'P' ? shippingCost.costValue + '%' : '₹' + shippingCost.costValue})` : ''}</span>
                  <span className="cost-value blue">₹{shipping.toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Marketing {marketingCost ? `(${marketingCost.costValueType === 'P' ? marketingCost.costValue + '%' : '₹' + marketingCost.costValue})` : ''}</span>
                  <span className="cost-value blue">₹{marketing.toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Output GST</span>
                  <span className="cost-value red">₹{outputGst.toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Input GST Credit</span>
                  <span className="cost-value green">₹{inputGst.toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">GST Difference</span>
                  <span className="cost-value" style={{ color: gstDifference < 0 ? '#008000' : '#c00' }}>₹{gstDifference.toFixed(2)}</span>
                </div>
                <div className="cost-divider" />
                <div className="cost-item total">
                  <span className="cost-label">Total Cost</span>
                  <span className="cost-value green">₹{totalCost.toFixed(2)}</span>
                </div>
              </div>
              <div className="realisation-section">
                <h5 className="realisation-title">Net Realisation</h5>
                <p className="realisation-amount">{pricingResult ? `₹${netRealisation.toFixed(2)}` : '—'}</p>
              </div>
              <div className="profit-section">
                <div className="profit-circle">
                  <svg width="113" height="113" viewBox="0 0 113 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M103.113 31.5064C104.87 30.5646 105.54 28.37 104.488 26.6772C100.436 20.1566 95.0898 14.519 88.7671 10.1202C81.4551 5.03317 73.044 1.74703 64.2202 0.529925C55.3963 -0.687184 46.4096 0.199228 37.9936 3.11683C29.5776 6.03443 21.9706 10.9005 15.7934 17.3181C9.61624 23.7356 5.04392 31.5227 2.44957 40.044C-0.144781 48.5652 -0.687653 57.5791 0.865253 66.3501C2.41816 75.1211 6.02284 83.4007 11.3851 90.5132C16.022 96.6635 21.8595 101.79 28.5299 105.591C30.2617 106.578 32.4291 105.824 33.3032 104.033C34.1773 102.242 33.4259 100.093 31.7035 99.0898C26.0515 95.7991 21.1 91.4097 17.1483 86.1682C12.471 79.9643 9.32683 72.7424 7.9723 65.0918C6.61777 57.4413 7.09129 49.5788 9.35423 42.1461C11.6172 34.7134 15.6054 27.9211 20.9935 22.3234C26.3815 16.7256 33.0168 12.4811 40.3577 9.93625C47.6986 7.39136 55.5373 6.61818 63.2339 7.67981C70.9306 8.74144 78.2672 11.6078 84.6451 16.045C90.0336 19.7938 94.6087 24.5741 98.1127 30.0965C99.1805 31.7794 101.357 32.4483 103.113 31.5064Z" fill="#008000"/>
                    <path d="M79.2704 104.239C80.1284 106.038 82.289 106.811 84.0295 105.839C89.4425 102.819 94.3291 98.9245 98.4878 94.3058C103.453 88.7919 107.283 82.3541 109.759 75.3599C112.236 68.3658 113.311 60.9524 112.923 53.5429C112.597 47.3363 111.251 41.2344 108.945 35.4807C108.203 33.6306 106.038 32.8716 104.239 33.7296C102.44 34.5877 101.69 36.7376 102.415 38.5945C104.323 43.4871 105.439 48.6608 105.715 53.9206C106.054 60.3836 105.116 66.85 102.956 72.9507C100.795 79.0513 97.4546 84.6667 93.1241 89.4763C89.5998 93.3904 85.4761 96.7085 80.9142 99.3101C79.1829 100.297 78.4123 102.44 79.2704 104.239Z" fill="#E5FCE5"/>
                  </svg>
                  <div className="profit-text">
                    <span className="profit-percentage">{pricingResult ? profitPercentage + '%' : '—'}</span>
                    <span className="profit-label">profit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save feedback */}
        {savedVersion && (
          <div style={{
            margin: '12px 0',
            padding: '12px 16px',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            color: '#166534',
            fontSize: 14,
            fontWeight: 500,
          }}>
            ✓ {savedVersion.activationMessage} &nbsp;·&nbsp; ₹{savedVersion.sellingPrice.toFixed(2)} &nbsp;·&nbsp; {savedVersion.profitPercentage.toFixed(1)}% profit
          </div>
        )}
        {saveError && (
          <div style={{
            margin: '12px 0',
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            color: '#991b1b',
            fontSize: 14,
          }}>
            ✗ {saveError}
          </div>
        )}

        {/* Pricing History Table */}
        <div className="pricing-history-card">
          <div className="history-header">
            <h3 className="history-title">Pricing Inputs History</h3>
            <button className="view-all-btn">View all →</button>
          </div>
          <div className="history-table">
            <div className="table-header-row">
              <div className="table-cell">Date</div>
              <div className="table-cell">User</div>
              <div className="table-cell">Old Price</div>
              <div className="table-cell">New Price</div>
              <div className="table-cell">Marketplace</div>
            </div>
            {historyData.map((row, idx) => (
              <div className="table-data-row" key={idx}>
                <div className="table-cell">{row.date}</div>
                <div className="table-cell">{row.user}</div>
                <div className="table-cell">{row.oldPrice}</div>
                <div className="table-cell">{row.newPrice}</div>
                <div className="table-cell">{row.marketplace}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PriceCalculationPage;

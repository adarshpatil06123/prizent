import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PricingPage.css';
import marketplaceService, { Marketplace } from '../services/marketplaceService';
import productService, { Product } from '../services/productService';
import categoryService, { Category } from '../services/categoryService';
import brandService, { Brand } from '../services/brandService';
import { calculatePricing } from '../services/pricingService';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  // --- Data states ---
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Selection states ---
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState('');
  const [selectedSKUProductId, setSelectedSKUProductId] = useState('');
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCategoryProductId, setSelectedCategoryProductId] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // --- Calculation states ---
  const [sellingPrice, setSellingPrice] = useState('');
  const [calculatedProfit, setCalculatedProfit] = useState('');
  const [profitPercentage, setProfitPercentage] = useState('');
  const [calculatedSellingPrice, setCalculatedSellingPrice] = useState('');
  const [marketplaceCosts, setMarketplaceCosts] = useState<{ commission: string; shipping: string; marketing: string } | null>(null);
  const [rawCosts, setRawCosts] = useState<import('../services/marketplaceService').MarketplaceCost[]>([]);
  const [inputGst, setInputGst] = useState('');
  // Set of marketplace IDs configured for the selected brand (null = no brand filter)
  const [brandMarketplaceIds, setBrandMarketplaceIds] = useState<Set<number> | null>(null);

  // --- Rebate Discount Analysis states ---
  const [rebateDiscount, setRebateDiscount] = useState('');
  const [rebateResult, setRebateResult] = useState('');

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [mpRes, prodRes, catRes, brandRes] = await Promise.all([
          marketplaceService.getAllMarketplaces(0, 100),
          productService.getAllProducts(0, 500),
          categoryService.getAllCategories(),
          brandService.getAllBrands(),
        ]);
        if (mpRes.marketplaces?.content) {
          setMarketplaces(mpRes.marketplaces.content.filter((m: Marketplace) => m.enabled));
        }
        if (prodRes?.content) {
          const enabledProds = prodRes.content.filter((p: Product) => p.enabled);
          setProducts(enabledProds);
        }
        if (catRes.categories) {
          const allCats = catRes.categories.filter((c: Category) => c.enabled);
          setCategories(allCats);
        }
        if (brandRes.brands) {
          setBrands(brandRes.brands.filter((b: Brand) => b.enabled));
        }
      } catch (err: any) {
        setError('Failed to load data. Please refresh.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Derived lists ---
  const displayedMarketplaces = brandMarketplaceIds
    ? marketplaces.filter(m => brandMarketplaceIds.has(m.id))
    : marketplaces;
  const brandFilteredProducts = selectedBrandId
    ? products.filter(p => Number(p.brandId) === parseInt(selectedBrandId))
    : products;
  const parentCategories = categories.filter(c => c.parentCategoryId === null);
  const childCategories = selectedParentCategoryId
    ? categories.filter(c => c.parentCategoryId === parseInt(selectedParentCategoryId))
    : [];
  const categoryFilteredProducts = selectedCategoryId
    ? brandFilteredProducts.filter(p => Number(p.categoryId) === parseInt(selectedCategoryId))
    : [];

  // --- Handlers: Brand ---
  const handleBrandChange = async (val: string) => {
    setSelectedBrandId(val);
    setSelectedSKUProductId('');
    setSelectedParentCategoryId('');
    setSelectedCategoryId('');
    setSelectedCategoryProductId('');
    setActiveProduct(null);
    setCalculatedProfit('');
    setCalculatedSellingPrice('');
    setSelectedMarketplaceId('');
    setMarketplaceCosts(null);
    setRawCosts([]);
    if (!val) {
      setBrandMarketplaceIds(null);
      return;
    }
    // Fetch brand mappings for all marketplaces in parallel, keep only those with this brand
    const brandId = parseInt(val);
    try {
      const results = await Promise.all(
        marketplaces.map(m =>
          marketplaceService.getBrandMappings(m.id)
            .then(res => ({ marketplaceId: m.id, hasBrand: res.mappings?.some((bm: any) => bm.brandId === brandId) ?? false }))
            .catch(() => ({ marketplaceId: m.id, hasBrand: false }))
        )
      );
      const ids = new Set(results.filter(r => r.hasBrand).map(r => r.marketplaceId));
      setBrandMarketplaceIds(ids);
    } catch {
      setBrandMarketplaceIds(null);
    }
    // Re-fetch marketplace costs with new brand context if marketplace already selected
    if (selectedMarketplaceId) {
      fetchMarketplaceCosts(parseInt(selectedMarketplaceId), val ? parseInt(val) : undefined);
    }
  };

  // --- Handlers: SKU path clears category path ---
  const handleSKUChange = (val: string) => {
    setSelectedSKUProductId(val);
    setSelectedParentCategoryId('');
    setSelectedCategoryId('');
    setSelectedCategoryProductId('');
    const found = val ? brandFilteredProducts.find(p => p.id === parseInt(val)) || null : null;
    setActiveProduct(found);
    setCalculatedProfit('');
    setCalculatedSellingPrice('');
  };

  // --- Handlers: Category path clears SKU ---
  const handleParentCategoryChange = (val: string) => {
    setSelectedParentCategoryId(val);
    setSelectedCategoryId('');
    setSelectedCategoryProductId('');
    setSelectedSKUProductId('');
    setActiveProduct(null);
    setCalculatedProfit('');
    setCalculatedSellingPrice('');
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategoryId(val);
    setSelectedCategoryProductId('');
    setSelectedSKUProductId('');
    setActiveProduct(null);
    setCalculatedProfit('');
    setCalculatedSellingPrice('');
  };

  const handleCategoryProductChange = (val: string) => {
    setSelectedCategoryProductId(val);
    setSelectedSKUProductId('');
    const found = val ? products.find(p => p.id === parseInt(val)) || null : null;
    setActiveProduct(found);
    setCalculatedProfit('');
    setCalculatedSellingPrice('');
  };

  const costPrice = activeProduct?.productCost ?? 0;

  const formatCostValue = (cost: import('../services/marketplaceService').MarketplaceCost | import('../services/marketplaceService').BrandMappingCost) =>
    cost.costValueType === 'P' ? `${cost.costValue}%` : `₹${cost.costValue}`;

  /** Parse a range string like "0-300" into [from, to], or null if unparseable. */
  const parseRangeBounds = (range: string | undefined): [number, number] | null => {
    if (!range) return null;
    const dashIdx = range.indexOf('-', 1);
    if (dashIdx < 0) return null;
    const from = parseFloat(range.substring(0, dashIdx).trim());
    const to   = parseFloat(range.substring(dashIdx + 1).trim());
    return isNaN(from) || isNaN(to) ? null : [from, to];
  };

  const fetchMarketplaceCosts = async (mpId: number, brandId?: number) => {
    try {
      setMarketplaceCosts(null);
      setRawCosts([]);
      let costs: import('../services/marketplaceService').MarketplaceCost[] = [];

      if (brandId) {
        const bmRes = await marketplaceService.getBrandMappings(mpId);
        const mapping = bmRes.mappings?.find((m: any) => m.brandId === brandId);
        if (mapping?.costs?.length) {
          costs = mapping.costs as import('../services/marketplaceService').MarketplaceCost[];
        }
      }

      if (!costs.length) {
        const mpRes = await marketplaceService.getMarketplaceCosts(mpId);
        costs = (mpRes.costs ?? mpRes.marketplace?.costs ?? []) as import('../services/marketplaceService').MarketplaceCost[];
      }

      setRawCosts(costs);

      // Summary display (used for the simple one-liner fallback)
      const get = (cat: string) => {
        const c = costs.find(x => x.costCategory === cat);
        return c ? formatCostValue(c) : '—';
      };
      setMarketplaceCosts({
        commission: get('COMMISSION'),
        shipping: get('SHIPPING'),
        marketing: get('MARKETING'),
      });
    } catch {
      setMarketplaceCosts(null);
      setRawCosts([]);
    }
  };

  const handleCalculateProfit = async () => {
    if (!activeProduct) { alert('Please select a product first'); return; }
    if (!selectedMarketplaceId) { alert('Please select a marketplace first'); return; }
    if (!sellingPrice) { alert('Please enter selling price'); return; }
    try {
      const result = await calculatePricing({
        skuId: activeProduct.id,
        marketplaceId: parseInt(selectedMarketplaceId),
        mode: 'SELLING_PRICE',
        value: parseFloat(sellingPrice),
        inputGst: activeProduct.productCost * (parseFloat(inputGst) || 0) / 100,
      });
      const isLoss = result.profit < 0;
      setCalculatedProfit(JSON.stringify({
        isLoss,
        text: `${Math.abs(result.profitPercentage).toFixed(2)}% (₹${Math.abs(result.profit).toFixed(2)})`,
        outputGst: result.outputGst,
        inputGst: result.inputGst,
        gstDifference: result.gstDifference,
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Calculation failed. Please check that the pricing service is running.';
      alert(msg);
    }
  };

  const handleCalculateSellingPrice = async () => {
    if (!activeProduct) { alert('Please select a product first'); return; }
    if (!selectedMarketplaceId) { alert('Please select a marketplace first'); return; }
    if (!profitPercentage) { alert('Please enter profit percentage'); return; }
    try {
      const result = await calculatePricing({
        skuId: activeProduct.id,
        marketplaceId: parseInt(selectedMarketplaceId),
        mode: 'PROFIT_PERCENT',
        value: parseFloat(profitPercentage),
        inputGst: activeProduct.productCost * (parseFloat(inputGst) || 0) / 100,
      });
      setCalculatedSellingPrice(JSON.stringify({
        sp: result.sellingPrice,
        outputGst: result.outputGst,
        inputGst: result.inputGst,
        gstDifference: result.gstDifference,
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Calculation failed. Please check that the pricing service is running.';
      alert(msg);
    }
  };

  const handleCalculateRebate = async () => {
    if (!activeProduct) { alert('Please select a product first'); return; }
    if (!selectedMarketplaceId) { alert('Please select a marketplace first'); return; }
    if (!rebateDiscount) { alert('Please enter rebate discount %'); return; }
    // Base SP: use whatever the user entered in Calculate Profit, else proposed SP, else MRP
    const baseSP = parseFloat(sellingPrice) || activeProduct.proposedSellingPriceSales || activeProduct.mrp;
    // Derive commission rate from the slab that matches the rebate SP
    const rebateSP = baseSP * (1 - parseFloat(rebateDiscount) / 100);
    if (rebateSP <= 0) { alert('Rebate SP must be positive'); return; }
    const commissionCosts = rawCosts.filter(x => x.costCategory === 'COMMISSION');
    const matchedCommission = commissionCosts.find(x => {
      const bounds = parseRangeBounds(x.costProductRange);
      return bounds ? baseSP >= bounds[0] && baseSP <= bounds[1] : false;
    }) ?? commissionCosts[0];
    const commissionRatePct = matchedCommission?.costValue ?? 0;
    try {
      const result = await calculatePricing({
        skuId: activeProduct.id,
        marketplaceId: parseInt(selectedMarketplaceId),
        mode: 'SELLING_PRICE',
        value: rebateSP,
        inputGst: activeProduct.productCost * (parseFloat(inputGst) || 0) / 100,
        commissionRebatePct: commissionRatePct,
        rebateMode: 'NET',
      });
      const isLoss = result.profit < 0;
      setRebateResult(JSON.stringify({
        isLoss,
        sp: result.sellingPrice,
        profit: result.profit,
        profitPct: result.profitPercentage,
        commission: result.commission,
        commissionBeforeRebate: result.commissionBeforeRebate,
        pendingRebateGross: result.pendingRebateGross,
        mode: 'NET',
        commissionRatePct,
        commissionValueType: matchedCommission?.costValueType ?? 'P',
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Calculation failed. Please check that the pricing service is running.';
      alert(msg);
    }
  };

  if (loading) {
    return (
      <div className="pricing-bg">
        <main className="pricing-main">
          <p style={{ padding: '40px', color: '#454545' }}>Loading pricing data...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="pricing-bg">
      <main className="pricing-main">
        <header className="pricing-header">
          <h1 className="pricing-title">Pricing</h1>
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

        <div className="pricing-divider" />

        {error && (
          <div style={{ color: 'red', padding: '10px 0', marginBottom: '16px' }}>{error}</div>
        )}

        {/* Select Brand Section */}
        <section className="marketplace-section">
          <h2 className="section-title">Select Brand</h2>
          <div className="marketplace-card">
            <div className="dropdown-wrapper">
              <select
                className="dropdown-select"
                value={selectedBrandId}
                onChange={(e) => handleBrandChange(e.target.value)}
              >
                <option value="">Select Brand</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <svg className="dropdown-icon" width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 4L9 1" stroke="#454545" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </section>

        {/* Select Product Section */}
        <section className="product-section">
          <h2 className="section-title">Select Product</h2>
          <div className="product-card">
            <div className="product-dropdowns">
              {/* SKU / Product Name */}
              <div className="dropdown-wrapper">
                <label className="dropdown-label">SKU / Product Name</label>
                <select
                  className="dropdown-select"
                  value={selectedSKUProductId}
                  onChange={(e) => handleSKUChange(e.target.value)}
                >
                  <option value="">Select SKU</option>
                  {brandFilteredProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.skuCode} — {p.name}
                    </option>
                  ))}
                </select>
                <svg className="dropdown-icon" width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 4L9 1" stroke="#454545" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="or-divider">OR</div>

              {/* Parent Category */}
              <div className="dropdown-wrapper">
                <label className="dropdown-label">Parent Category</label>
                <select
                  className="dropdown-select"
                  value={selectedParentCategoryId}
                  onChange={(e) => handleParentCategoryChange(e.target.value)}
                >
                  <option value="">Select Parent Category</option>
                  {parentCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <svg className="dropdown-icon" width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 4L9 1" stroke="#454545" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Category */}
              <div className="dropdown-wrapper">
                <label className="dropdown-label">Category</label>
                <select
                  className="dropdown-select"
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={!selectedParentCategoryId}
                >
                  <option value="">Select Category</option>
                  {childCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <svg className="dropdown-icon" width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 4L9 1" stroke="#454545" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Product under Category */}
              <div className="dropdown-wrapper">
                <label className="dropdown-label">Product</label>
                <select
                  className="dropdown-select"
                  value={selectedCategoryProductId}
                  onChange={(e) => handleCategoryProductChange(e.target.value)}
                  disabled={!selectedCategoryId}
                >
                  <option value="">Select Product</option>
                  {categoryFilteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <svg className="dropdown-icon" width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 4L9 1" stroke="#454545" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Selected product summary */}
            {activeProduct && (
              <div style={{ marginTop: '14px', padding: '10px 16px', background: '#F5F9FA', borderRadius: '8px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: '#454545' }}>
                <span><strong>SKU:</strong> {activeProduct.skuCode}</span>
                <span><strong>MRP:</strong> ₹{activeProduct.mrp}</span>
                <span><strong>Cost:</strong> ₹{activeProduct.productCost}</span>
                <span><strong>Proposed SP:</strong> ₹{activeProduct.proposedSellingPriceSales}</span>
              </div>
            )}
          </div>
        </section>

        {/* Select Marketplace Section */}
        <section className="marketplace-section">
          <h2 className="section-title">Select Marketplace</h2>
          <div className="marketplace-card">
            <div className="dropdown-wrapper">
              <select
                className="dropdown-select"
                value={selectedMarketplaceId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMarketplaceId(val);
                  setCalculatedProfit('');
                  setCalculatedSellingPrice('');
                  if (val) {
                    fetchMarketplaceCosts(parseInt(val), selectedBrandId ? parseInt(selectedBrandId) : undefined);
                  } else {
                    setMarketplaceCosts(null);
                    setRawCosts([]);
                  }
                }}
              >
                <option value="">Select Marketplace</option>
                {displayedMarketplaces.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <svg className="dropdown-icon" width="10" height="5" viewBox="0 0 10 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 4L9 1" stroke="#454545" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {marketplaceCosts && (
              <div style={{ marginTop: '14px', padding: '10px 16px', background: '#F5F9FA', borderRadius: '8px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: '#454545' }}>
                <span><strong>Commission:</strong> {marketplaceCosts.commission}</span>
                <span><strong>Shipping:</strong> {marketplaceCosts.shipping}</span>
                <span><strong>Marketing:</strong> {marketplaceCosts.marketing}</span>
              </div>
            )}

          </div>
        </section>

        {/* Input GST Section */}
        <section className="marketplace-section">
          <h2 className="section-title">Input GST (%)</h2>
          <div className="marketplace-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                value={inputGst}
                onChange={(e) => { setInputGst(e.target.value); setCalculatedProfit(''); setCalculatedSellingPrice(''); }}
                style={{ maxWidth: 220 }}
                min="0"
                max="100"
              />
              <span style={{ fontSize: 13, color: '#7C7C7C' }}>% of product cost paid as Input GST on purchase</span>
            </div>
          </div>
        </section>

        {/* Calculation Section */}
        <section className="calculation-section">
          <div className="calc-container">
            {/* Calculate Profit */}
            <div className="calc-card">
              <h3 className="calc-title">Calculate Profit</h3>
              <div className="calc-content">
                <div className="input-group">
                  <label className="input-label">
                    Selling Price
                    {activeProduct && <span style={{ color: '#7C7C7C', fontWeight: 400 }}> (Cost: ₹{costPrice})</span>}
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Enter selling price"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
                <button className="calc-button" onClick={handleCalculateProfit}>
                  Calculate
                </button>
                {calculatedProfit && (() => {
                  const p = JSON.parse(calculatedProfit);
                  return (
                    <>
                      <div className="result-display">
                        <span className="result-label" style={{ color: p.isLoss ? '#c00' : undefined }}>
                          {p.isLoss ? 'Loss:' : 'Profit:'}
                        </span>
                        <span className="result-value" style={{ color: p.isLoss ? '#c00' : '#008000' }}>
                          {p.text}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#F5F9FA', borderRadius: 6, fontSize: 12, color: '#454545', lineHeight: '1.8' }}>
                        <div><strong>Output GST:</strong> ₹{(p.outputGst ?? 0).toFixed(2)}</div>
                        <div><strong>Input GST:</strong> ₹{(p.inputGst ?? 0).toFixed(2)}</div>
                        <div><strong>GST Difference:</strong> <span style={{ color: (p.gstDifference ?? 0) < 0 ? '#008000' : '#c00' }}>₹{(p.gstDifference ?? 0).toFixed(2)}</span></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Calculate Selling Price */}
            <div className="calc-card">
              <h3 className="calc-title">Calculate Selling Price</h3>
              <div className="calc-content">
                <div className="input-group">
                  <label className="input-label">
                    Profit %
                    {activeProduct && <span style={{ color: '#7C7C7C', fontWeight: 400 }}> (Cost: ₹{costPrice})</span>}
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Enter profit %"
                    value={profitPercentage}
                    onChange={(e) => setProfitPercentage(e.target.value)}
                  />
                </div>
                <button className="calc-button" onClick={handleCalculateSellingPrice}>
                  Calculate
                </button>
                {calculatedSellingPrice && (() => {
                  const s = JSON.parse(calculatedSellingPrice);
                  return (
                    <>
                      <div className="result-display">
                        <span className="result-label">Selling Price:</span>
                        <span className="result-value">₹{(s.sp ?? 0).toFixed(2)}</span>
                      </div>
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#F5F9FA', borderRadius: 6, fontSize: 12, color: '#454545', lineHeight: '1.8' }}>
                        <div><strong>Output GST:</strong> ₹{(s.outputGst ?? 0).toFixed(2)}</div>
                        <div><strong>Input GST:</strong> ₹{(s.inputGst ?? 0).toFixed(2)}</div>
                        <div><strong>GST Difference:</strong> <span style={{ color: (s.gstDifference ?? 0) < 0 ? '#008000' : '#c00' }}>₹{(s.gstDifference ?? 0).toFixed(2)}</span></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

          </div>
        </section>

        {/* Rebate Discount Analysis Section */}
        <section className="calculation-section">
          <div className="calc-container">
            <div className="calc-card">
              <h3 className="calc-title">Rebate Discount Analysis</h3>
              <div className="calc-content">
                <div className="input-group">
                  <label className="input-label">
                    Rebate Discount (%)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Enter value"
                    value={rebateDiscount}
                    onChange={e => { setRebateDiscount(e.target.value); setRebateResult(''); }}
                    min="0" max="100"
                  />
                </div>
                <button className="calc-button" onClick={handleCalculateRebate}>
                  Calculate Rebate
                </button>
                {rebateResult && (() => {
                  const r = JSON.parse(rebateResult);
                  return (
                    <>
                      <div className="result-display">
                        <span className="result-label" style={{ color: r.isLoss ? '#c00' : undefined }}>
                          {r.isLoss ? 'Loss:' : 'Profit:'}
                        </span>
                        <span className="result-value" style={{ color: r.isLoss ? '#c00' : '#008000' }}>
                          {Math.abs(r.profitPct ?? 0).toFixed(2)}% (₹{Math.abs(r.profit ?? 0).toFixed(2)})
                        </span>
                      </div>
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#F5F9FA', borderRadius: 6, fontSize: 12, color: '#454545', lineHeight: '1.8' }}>
                        <div><strong>Rebate SP:</strong> ₹{(r.sp ?? 0).toFixed(2)}</div>
                        {r.commissionBeforeRebate != null && (
                          <div>
                            <strong>Commission:</strong> ₹{(r.commission ?? 0).toFixed(2)}{' '}
                            <span style={{ color: '#7C7C7C' }}>(reduced from ₹{r.commissionBeforeRebate.toFixed(2)} — {r.commissionRatePct}{r.commissionValueType === 'P' ? '%' : '₹'} rebate)</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PricingPage;

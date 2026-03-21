import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import './PricingPage.css';
import marketplaceService, { Marketplace, MarketplaceCost } from '../services/marketplaceService';
import productService, { Product } from '../services/productService';
import categoryService, { Category } from '../services/categoryService';
import brandService, { Brand } from '../services/brandService';
import { calculatePricing } from '../services/pricingService';

type UploadRow = {
  rowNumber: number;
  product: Product;
  asp: number;
  inputGst: number;
};

type OutputRow = {
  rowNumber: number;
  productId: number;
  skuCode: string;
  productName: string;
  asp: number;
  inputGst: number;
  reverseFixedFee: number;
  pickAndPack: number;
  baseProfit: number;
  finalProfit: number;
  finalProfitPercentage: number;
  status: 'success' | 'error';
  message: string;
};

const PricingPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedFirstCategoryId, setSelectedFirstCategoryId] = useState('');
  const [selectedSecondCategoryId, setSelectedSecondCategoryId] = useState('');
  const [brandMarketplaceIds, setBrandMarketplaceIds] = useState<Set<number> | null>(null);

  const [selectedMarketplaceCosts, setSelectedMarketplaceCosts] = useState<MarketplaceCost[]>([]);

  const [calculateReverseFixedFee, setCalculateReverseFixedFee] = useState(true);
  const [calculatePickAndPack, setCalculatePickAndPack] = useState(true);
  const [calculateInputGst, setCalculateInputGst] = useState(true);

  const [uploadedRows, setUploadedRows] = useState<UploadRow[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [outputRows, setOutputRows] = useState<OutputRow[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [mpRes, prodRes, catRes, brandRes] = await Promise.all([
          marketplaceService.getAllMarketplaces(0, 200),
          productService.getAllProducts(0, 500),
          categoryService.getAllCategories(),
          brandService.getAllBrands(),
        ]);

        setMarketplaces(mpRes.marketplaces?.content ?? []);
        setProducts((prodRes.content ?? []).filter(p => p.enabled));
        setCategories((catRes.categories ?? []).filter(c => c.enabled));
        setBrands((brandRes.brands ?? []).filter(b => b.enabled));
      } catch (e) {
        console.error(e);
        setError('Failed to load pricing data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const parentCategories = useMemo(
    () => categories.filter(c => c.parentCategoryId === null),
    [categories]
  );

  const secondCategories = useMemo(() => {
    if (!selectedFirstCategoryId) return [];
    const parentId = Number(selectedFirstCategoryId);
    return categories.filter(c => c.parentCategoryId === parentId);
  }, [categories, selectedFirstCategoryId]);

  const displayedMarketplaces = useMemo(() => {
    if (!brandMarketplaceIds) {
      return marketplaces;
    }

    const filtered = marketplaces.filter(m => brandMarketplaceIds.has(m.id));
    // If no mapping exists for selected brand, fall back to all marketplaces.
    return filtered.length > 0 ? filtered : marketplaces;
  }, [marketplaces, brandMarketplaceIds]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const brandOk = selectedBrandId ? product.brandId === Number(selectedBrandId) : true;
      const secondCategoryOk = selectedSecondCategoryId ? product.categoryId === Number(selectedSecondCategoryId) : true;

      let firstCategoryOk = true;
      if (selectedFirstCategoryId) {
        const firstId = Number(selectedFirstCategoryId);
        const category = categories.find(c => c.id === product.categoryId);
        firstCategoryOk = !!category && (category.id === firstId || category.parentCategoryId === firstId);
      }

      return brandOk && firstCategoryOk && secondCategoryOk;
    });
  }, [products, categories, selectedBrandId, selectedFirstCategoryId, selectedSecondCategoryId]);

  const brandNameMap = useMemo(() => {
    const map = new Map<number, string>();
    brands.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [brands]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const fetchMarketplaceCosts = async (marketplaceId: number, brandId?: number) => {
    try {
      let costs: MarketplaceCost[] = [];

      if (brandId) {
        const bmRes = await marketplaceService.getBrandMappings(marketplaceId);
        const brandMapping = bmRes.mappings?.find((m: any) => m.brandId === brandId);
        if (brandMapping?.costs?.length) {
          costs = brandMapping.costs as MarketplaceCost[];
        }
      }

      if (!costs.length) {
        const mpRes = await marketplaceService.getMarketplaceCosts(marketplaceId);
        costs = (mpRes.costs ?? mpRes.marketplace?.costs ?? []) as MarketplaceCost[];
      }

      setSelectedMarketplaceCosts(costs);
    } catch (e) {
      console.error(e);
      setSelectedMarketplaceCosts([]);
    }
  };

  const handleBrandChange = async (value: string) => {
    setSelectedBrandId(value);
    setSelectedMarketplaceId('');
    setSelectedMarketplaceCosts([]);
    setUploadedRows([]);
    setUploadErrors([]);
    setOutputRows([]);

    if (!value) {
      setBrandMarketplaceIds(null);
      return;
    }

    const brandId = Number(value);
    try {
      const results = await Promise.all(
        marketplaces.map((m) =>
          marketplaceService
            .getBrandMappings(m.id)
            .then((res) => ({
              marketplaceId: m.id,
              hasBrand: res.mappings?.some((bm: any) => bm.brandId === brandId) ?? false,
            }))
            .catch(() => ({ marketplaceId: m.id, hasBrand: false }))
        )
      );

      const ids = new Set(results.filter(r => r.hasBrand).map(r => r.marketplaceId));
      setBrandMarketplaceIds(ids.size > 0 ? ids : null);
    } catch {
      setBrandMarketplaceIds(null);
    }
  };

  const handleMarketplaceChange = async (value: string) => {
    setSelectedMarketplaceId(value);
    setUploadedRows([]);
    setUploadErrors([]);
    setOutputRows([]);

    if (!value) {
      setSelectedMarketplaceCosts([]);
      return;
    }

    await fetchMarketplaceCosts(Number(value), selectedBrandId ? Number(selectedBrandId) : undefined);
  };

  const parseRangeBounds = (range: string | undefined): [number, number] | null => {
    if (!range) return null;
    const normalized = range.replace('gt:', '').replace('kg', '');
    if (normalized.toLowerCase() === 'flat') return null;

    const dashIndex = normalized.indexOf('-', 1);
    if (dashIndex < 0) return null;

    const from = parseFloat(normalized.substring(0, dashIndex).trim());
    const to = parseFloat(normalized.substring(dashIndex + 1).trim());
    if (Number.isNaN(from) || Number.isNaN(to)) return null;

    return [from, to];
  };

  const getCostAmount = (cost: MarketplaceCost, asp: number) =>
    cost.costValueType === 'P' ? (asp * cost.costValue) / 100 : cost.costValue;

  const getMatchedCostSum = (categoriesToInclude: string[], asp: number): number => {
    const relevant = selectedMarketplaceCosts.filter(c => categoriesToInclude.includes(c.costCategory));
    if (!relevant.length) return 0;

    const matched = relevant.filter((cost) => {
      const bounds = parseRangeBounds(cost.costProductRange);
      if (!bounds) return (cost.costProductRange ?? '').toLowerCase() === 'flat';
      return asp >= bounds[0] && asp <= bounds[1];
    });

    const picked = matched.length ? matched : relevant.filter(c => (c.costProductRange ?? '').toLowerCase() === 'flat');
    return picked.reduce((acc, cost) => acc + getCostAmount(cost, asp), 0);
  };

  const downloadWorkbook = (rows: Record<string, string | number>[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pricing');
    XLSX.writeFile(workbook, fileName);
  };

  const handleDownloadSample = () => {
    const marketplaceName = selectedMarketplaceId
      ? (displayedMarketplaces.find(m => m.id === Number(selectedMarketplaceId))?.name ?? '')
      : '';

    const rows = filteredProducts.map((product) => ({
      'Product ID': product.id,
      'SKU Code': product.skuCode,
      'Product Name': product.name,
      'Marketplace': marketplaceName,
      'Brand': brandNameMap.get(product.brandId) ?? '',
      '1st List Category': (() => {
        const cat = categories.find(c => c.id === product.categoryId);
        if (!cat) return '';
        if (cat.parentCategoryId === null) return cat.name;
        return categoryNameMap.get(cat.parentCategoryId) ?? '';
      })(),
      '2nd List Category': categoryNameMap.get(product.categoryId) ?? '',
      'Product Cost': product.productCost,
      'MRP': product.mrp,
      'ASP': '',
      'Input GST': '',
      'Profit in Rs': '',
    }));

    downloadWorkbook(rows, 'pricing-sample.xlsx');
    setPageMessage(`Sample downloaded with ${rows.length} products.`);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const parsePositiveNumber = (value: unknown) => {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (Number.isNaN(n) || n < 0) return null;
    return n;
  };

  const getProductFromRow = (row: Record<string, any>) => {
    const byIdRaw = row['Product ID'];
    if (byIdRaw !== undefined && byIdRaw !== null && byIdRaw !== '') {
      const id = Number(byIdRaw);
      if (!Number.isNaN(id)) {
        return filteredProducts.find(p => p.id === id) ?? null;
      }
    }

    const sku = String(row['SKU Code'] ?? '').trim();
    if (sku) {
      return filteredProducts.find(p => p.skuCode.toLowerCase() === sku.toLowerCase()) ?? null;
    }

    return null;
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadErrors([]);
    setUploadedRows([]);
    setOutputRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      const errors: string[] = [];
      const parsed: UploadRow[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const product = getProductFromRow(row);
        if (!product) {
          errors.push(`Row ${rowNumber}: Product not found in selected filters (check Product ID/SKU Code).`);
          return;
        }

        const asp = parsePositiveNumber(row['ASP']);
        if (asp === null || asp <= 0) {
          errors.push(`Row ${rowNumber}: ASP must be a positive number.`);
          return;
        }

        const inputGst = parsePositiveNumber(row['Input GST']) ?? 0;

        parsed.push({ rowNumber, product, asp, inputGst });
      });

      setUploadErrors(errors);
      setUploadedRows(parsed);
      setPageMessage(`Uploaded ${parsed.length} valid rows${errors.length ? `, ${errors.length} invalid rows` : ''}.`);
    } catch (e) {
      console.error(e);
      setUploadErrors(['Failed to read file. Upload a valid .xlsx file.']);
      setUploadedRows([]);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCalculate = async () => {
    if (!selectedMarketplaceId) {
      setError('Please select a marketplace before calculation.');
      return;
    }
    if (!uploadedRows.length) {
      setError('Please upload a sample file with valid rows first.');
      return;
    }

    setError(null);
    setPageMessage(null);
    setProcessing(true);

    try {
      const marketplaceId = Number(selectedMarketplaceId);
      const computed: OutputRow[] = [];

      for (const row of uploadedRows) {
        try {
          const result = await calculatePricing({
            skuId: row.product.id,
            marketplaceId,
            mode: 'SELLING_PRICE',
            value: row.asp,
            inputGst: calculateInputGst ? row.inputGst : 0,
          });

          const reverseFixedFee = calculateReverseFixedFee
            ? getMatchedCostSum(['FIXED_FEE', 'REVERSE_SHIPPING'], row.asp)
            : 0;

          const pickAndPack = calculatePickAndPack
            ? getMatchedCostSum(['PICK_AND_PACK'], row.asp)
            : 0;

          const finalProfit = result.profit - reverseFixedFee - pickAndPack;
          const denominator = result.sellingPrice > 0 ? result.sellingPrice : 1;
          const finalProfitPercentage = (finalProfit / denominator) * 100;

          computed.push({
            rowNumber: row.rowNumber,
            productId: row.product.id,
            skuCode: row.product.skuCode,
            productName: row.product.name,
            asp: row.asp,
            inputGst: calculateInputGst ? row.inputGst : 0,
            reverseFixedFee,
            pickAndPack,
            baseProfit: result.profit,
            finalProfit,
            finalProfitPercentage,
            status: 'success',
            message: 'Calculated',
          });
        } catch (e: any) {
          computed.push({
            rowNumber: row.rowNumber,
            productId: row.product.id,
            skuCode: row.product.skuCode,
            productName: row.product.name,
            asp: row.asp,
            inputGst: calculateInputGst ? row.inputGst : 0,
            reverseFixedFee: 0,
            pickAndPack: 0,
            baseProfit: 0,
            finalProfit: 0,
            finalProfitPercentage: 0,
            status: 'error',
            message: e?.response?.data?.message ?? e?.message ?? 'Calculation failed',
          });
        }
      }

      setOutputRows(computed);

      const exportRows = computed.map((r) => ({
        'Row Number': r.rowNumber,
        'Product ID': r.productId,
        'SKU Code': r.skuCode,
        'Product Name': r.productName,
        'ASP': r.asp,
        'Input GST': r.inputGst,
        'Reverse Fixed Fee': Number(r.reverseFixedFee.toFixed(2)),
        'Pick and Pack': Number(r.pickAndPack.toFixed(2)),
        'Base Profit': Number(r.baseProfit.toFixed(2)),
        'Profit in Rs': Number(r.finalProfit.toFixed(2)),
        'Profit %': Number(r.finalProfitPercentage.toFixed(2)),
        'Status': r.status,
        'Message': r.message,
      }));

      downloadWorkbook(exportRows, 'pricing-calculation-result.xlsx');
      setPageMessage(`Calculation completed for ${computed.length} rows. Result file downloaded.`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="pricing-bg">
        <main className="pricing-main">
          <p className="pricing-note">Loading pricing data...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="pricing-bg">
      <main className="pricing-main">
        <header className="pricing-header">
          <h1 className="pricing-title">Pricing Module</h1>
        </header>

        <div className="pricing-divider" />

        {error && <div className="pricing-alert pricing-alert-error">{error}</div>}
        {pageMessage && <div className="pricing-alert pricing-alert-info">{pageMessage}</div>}

        <section className="pricing-block">
          <div className={`pricing-grid-row ${selectedFirstCategoryId ? 'has-second-category' : 'three-fields'}`}>
            <div className="pricing-field">
              <label>Marketplace</label>
              <select value={selectedMarketplaceId} onChange={(e) => handleMarketplaceChange(e.target.value)}>
                <option value="">Select Marketplace</option>
                {displayedMarketplaces.map(m => (
                  <option key={m.id} value={m.id}>{m.enabled ? m.name : `${m.name} (Inactive)`}</option>
                ))}
              </select>
            </div>

            <div className="pricing-field">
              <label>Brand</label>
              <select value={selectedBrandId} onChange={(e) => void handleBrandChange(e.target.value)}>
                <option value="">Select Brand</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="pricing-field">
              <label>1st List Category</label>
              <select
                value={selectedFirstCategoryId}
                onChange={(e) => {
                  setSelectedFirstCategoryId(e.target.value);
                  setSelectedSecondCategoryId('');
                  setUploadedRows([]);
                  setUploadErrors([]);
                  setOutputRows([]);
                }}
              >
                <option value="">Select Category</option>
                {parentCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {selectedFirstCategoryId && (
              <div className="pricing-field">
                <label>2nd List Category</label>
                <select
                  value={selectedSecondCategoryId}
                  onChange={(e) => {
                    setSelectedSecondCategoryId(e.target.value);
                    setUploadedRows([]);
                    setUploadErrors([]);
                    setOutputRows([]);
                  }}
                >
                  <option value="">Select Category</option>
                  {secondCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pricing-checklist">
            <label>
              <input
                type="checkbox"
                checked={calculateReverseFixedFee}
                onChange={(e) => setCalculateReverseFixedFee(e.target.checked)}
              />
              <span>Calculate Reverse Fixed Fee</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={calculatePickAndPack}
                onChange={(e) => setCalculatePickAndPack(e.target.checked)}
              />
              <span>Calculate Pick and Pack</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={calculateInputGst}
                onChange={(e) => setCalculateInputGst(e.target.checked)}
              />
              <span>Calculate Input GST</span>
            </label>
          </div>

          <div className="pricing-actions-row">
            <button className="pricing-btn pricing-btn-secondary" onClick={handleDownloadSample}>
              Download Sample
            </button>
            <button className="pricing-btn pricing-btn-secondary" onClick={handleUploadClick}>
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden-file-input"
              onChange={handleFileSelected}
            />

            <div className="pricing-calculate-wrap">
              <button
                className="pricing-btn pricing-btn-primary"
                onClick={handleCalculate}
                disabled={processing}
              >
                {processing ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>

          <div className="pricing-stats-row">
            <span>Filtered Products: {filteredProducts.length}</span>
            <span>Uploaded Valid Rows: {uploadedRows.length}</span>
            <span>Result Rows: {outputRows.length}</span>
          </div>

          {uploadErrors.length > 0 && (
            <div className="pricing-errors-box">
              <h4>Upload Validation Errors</h4>
              <ul>
                {uploadErrors.slice(0, 20).map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
              {uploadErrors.length > 20 && (
                <p>+ {uploadErrors.length - 20} more errors</p>
              )}
            </div>
          )}

          {outputRows.length > 0 && (
            <div className="pricing-result-table-wrap">
              <table className="pricing-result-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>SKU</th>
                    <th>ASP</th>
                    <th>Input GST</th>
                    <th>Reverse Fixed Fee</th>
                    <th>Pick and Pack</th>
                    <th>Profit in Rs</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outputRows.slice(0, 50).map((row) => (
                    <tr key={`${row.rowNumber}-${row.skuCode}`}>
                      <td>{row.rowNumber}</td>
                      <td>{row.skuCode}</td>
                      <td>{row.asp.toFixed(2)}</td>
                      <td>{row.inputGst.toFixed(2)}</td>
                      <td>{row.reverseFixedFee.toFixed(2)}</td>
                      <td>{row.pickAndPack.toFixed(2)}</td>
                      <td>{row.finalProfit.toFixed(2)}</td>
                      <td className={row.status === 'success' ? 'status-success' : 'status-error'}>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {outputRows.length > 50 && <p>Showing first 50 rows in preview. Full data is in downloaded result file.</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PricingPage;

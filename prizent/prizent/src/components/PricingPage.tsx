import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import './PricingPage.css';
import marketplaceService, { Marketplace } from '../services/marketplaceService';
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

type SheetRow = Record<string, unknown>;

type DownloadWorkbookOptions = {
  sheetName?: string;
  orangeColumns?: string[];
  includeInstructions?: boolean;
  instructionsTitle?: string;
  instructions?: string[];
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
  finalSettlement: number;
  codbWithGtPercentage: number;
  finalDiscountPercentage: number;
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
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<number[]>([]);
  const [brandMarketplaceIds, setBrandMarketplaceIds] = useState<Set<number> | null>(null);
  const [marketplaceBrandIds, setMarketplaceBrandIds] = useState<Set<number> | null>(null);

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

  const parentById = useMemo(() => {
    const map = new Map<number, number | null>();
    categories.forEach((c) => map.set(c.id, c.parentCategoryId));
    return map;
  }, [categories]);

  const categoryLevels = useMemo(() => {
    const levels: Category[][] = [];
    let parentId: number | null = null;

    while (true) {
      const options = categories.filter(c => c.parentCategoryId === parentId);
      if (!options.length) break;

      levels.push(options);
      const selectedAtLevel = selectedCategoryPath[levels.length - 1];
      if (!selectedAtLevel) break;

      parentId = selectedAtLevel;
    }

    return levels;
  }, [categories, selectedCategoryPath]);

  const displayedMarketplaces = useMemo(() => {
    if (!brandMarketplaceIds) {
      return marketplaces;
    }

    const filtered = marketplaces.filter(m => brandMarketplaceIds.has(m.id));
    // If no mapping exists for selected brand, fall back to all marketplaces.
    return filtered.length > 0 ? filtered : marketplaces;
  }, [marketplaces, brandMarketplaceIds]);

  const displayedBrands = useMemo(() => {
    if (!selectedMarketplaceId || !marketplaceBrandIds) {
      return brands;
    }

    const filtered = brands.filter((b) => marketplaceBrandIds.has(b.id));
    return filtered;
  }, [brands, selectedMarketplaceId, marketplaceBrandIds]);

  const filteredProducts = useMemo(() => {
    const selectedCategoryId = selectedCategoryPath.length
      ? selectedCategoryPath[selectedCategoryPath.length - 1]
      : null;

    const isInSelectedCategoryBranch = (productCategoryId: number): boolean => {
      if (!selectedCategoryId) return true;

      let currentId: number | null = productCategoryId;
      while (currentId !== null) {
        if (currentId === selectedCategoryId) return true;
        currentId = parentById.get(currentId) ?? null;
      }

      return false;
    };

    return products.filter((product) => {
      const brandOk = selectedBrandId ? product.brandId === Number(selectedBrandId) : true;
      const categoryOk = isInSelectedCategoryBranch(product.categoryId);

      return brandOk && categoryOk;
    });
  }, [products, selectedBrandId, selectedCategoryPath, parentById]);

  const handleCategoryLevelChange = (levelIndex: number, value: string) => {
    const trimmedPath = selectedCategoryPath.slice(0, levelIndex);
    const nextPath = value ? [...trimmedPath, Number(value)] : trimmedPath;

    setSelectedCategoryPath(nextPath);
    setUploadedRows([]);
    setUploadErrors([]);
    setOutputRows([]);
  };

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

  const handleBrandChange = async (value: string) => {
    setSelectedBrandId(value);
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

  const getMappedBrandIdsFromProducts = async (marketplaceId: number): Promise<Set<number>> => {
    const checks = await Promise.all(
      products.map(async (product) => {
        try {
          const mappings = await productService.getMarketplaceMappings(product.id);
          const isMapped = mappings.some((m) => m.marketplaceId === marketplaceId);
          return isMapped ? product.brandId : null;
        } catch {
          return null;
        }
      })
    );

    return new Set(checks.filter((id): id is number => id !== null));
  };

  const handleMarketplaceChange = async (value: string) => {
    setSelectedMarketplaceId(value);
    setUploadedRows([]);
    setUploadErrors([]);
    setOutputRows([]);

    if (!value) {
      setMarketplaceBrandIds(null);
      return;
    }

    try {
      const res = await marketplaceService.getBrandMappings(Number(value));
      let ids = new Set((res.mappings ?? []).map((m) => m.brandId));

      // If no explicit brand mappings exist at marketplace level,
      // derive mapped brands from product-marketplace mappings.
      if (!ids.size) {
        ids = await getMappedBrandIdsFromProducts(Number(value));
      }

      setMarketplaceBrandIds(ids.size > 0 ? ids : new Set<number>());

      if (selectedBrandId && !ids.has(Number(selectedBrandId))) {
        setSelectedBrandId('');
        setBrandMarketplaceIds(null);
      }
    } catch {
      setMarketplaceBrandIds(new Set<number>());
      setSelectedBrandId('');
      setBrandMarketplaceIds(null);
    }
  };

  const downloadWorkbook = async (
    rows: Record<string, string | number>[],
    fileName: string,
    options?: DownloadWorkbookOptions
  ) => {
    if (!rows.length) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Prizent';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(options?.sheetName ?? 'Pricing', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const columns = Object.keys(rows[0]);
    worksheet.columns = columns.map((header) => ({
      header,
      key: header,
      width: Math.max(14, Math.min(40, header.length + 6)),
    }));

    const orangeColumns = new Set(options?.orangeColumns ?? []);

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell, colNumber) => {
      const header = columns[colNumber - 1];
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        name: 'Calibri',
        size: 11,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: orangeColumns.has(header) ? 'FFFFA500' : 'FF1F4E78',
        },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF4B5563' } },
        left: { style: 'thin', color: { argb: 'FF4B5563' } },
        bottom: { style: 'thin', color: { argb: 'FF4B5563' } },
        right: { style: 'thin', color: { argb: 'FF4B5563' } },
      };
    });

    const numericCurrencyColumns = new Set([
      'Product Cost',
      'MRP',
      'ASP',
      'Input GST',
      'Profit in Rs',
      'Base Profit',
      'Final Settlement',
      'Excess Fixed Fee',
      'Pick and Pack',
    ]);

    const numericPercentColumns = new Set([
      'Profit in %',
      'Profit %',
      'CODB with GT %',
      'Final Disc %',
    ]);

    rows.forEach((rowData, index) => {
      const row = worksheet.addRow(rowData);
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        const header = columns[colNumber - 1];
        const evenRow = index % 2 === 0;

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: evenRow ? 'FFF9FAFB' : 'FFFFFFFF' },
        };

        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF111827' },
        };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        if (numericCurrencyColumns.has(header)) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (numericPercentColumns.has(header)) {
          cell.numFmt = '0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    worksheet.columns.forEach((column, i) => {
      const header = columns[i];
      let maxLength = header.length;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = String(cell.value ?? '').length;
        if (cellLength > maxLength) maxLength = cellLength;
      });
      column.width = Math.max(14, Math.min(42, maxLength + 3));
    });

    if (options?.includeInstructions) {
      const infoSheet = workbook.addWorksheet('Instructions');
      const title = options.instructionsTitle ?? '=== Pricing Import Instructions ===';
      const lines = options.instructions ?? [
        'Fill data in the Products sheet starting from row 2.',
        'Orange headers are required fields.',
        'Required: Product ID OR SKU Code, ASP.',
        'Optional: Input GST, Profit in %, Profit in Rs.',
        'Do not change header names.',
      ];

      infoSheet.getCell('A1').value = title;
      infoSheet.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1F4E78' } };

      lines.forEach((line, idx) => {
        infoSheet.getCell(`A${idx + 2}`).value = line;
      });

      infoSheet.getColumn(1).width = 80;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSample = async () => {
    const marketplaceName = selectedMarketplaceId
      ? (displayedMarketplaces.find(m => m.id === Number(selectedMarketplaceId))?.name ?? '')
      : '';

    let sampleProducts = filteredProducts;

    if (selectedMarketplaceId) {
      const marketplaceId = Number(selectedMarketplaceId);
      const mappingChecks = await Promise.all(
        filteredProducts.map(async (product) => {
          try {
            const mappings = await productService.getMarketplaceMappings(product.id);
            const isMapped = mappings.some((m) => m.marketplaceId === marketplaceId);
            return { product, isMapped };
          } catch {
            return { product, isMapped: false };
          }
        })
      );

      sampleProducts = mappingChecks.filter((x) => x.isMapped).map((x) => x.product);
    }

    const rows: Record<string, string | number>[] = sampleProducts.map((product) => {
      const pathNames: string[] = [];
      let current = categories.find(c => c.id === product.categoryId) ?? null;
      while (current) {
        pathNames.unshift(current.name);
        if (current.parentCategoryId === null) break;
        current = categories.find(c => c.id === current!.parentCategoryId) ?? null;
      }

      const category = pathNames[0] ?? '';
      const subCategory = pathNames.length > 1 ? pathNames.slice(1).join(' > ') : '';

      return {
        'Product ID': product.id,
        'SKU Code': product.skuCode,
        'Product Name': product.name,
        'Marketplace': marketplaceName,
        'Brand': brandNameMap.get(product.brandId) ?? '',
        'Category': category,
        'Sub Category': subCategory,
        'Product Cost': product.productCost,
        'MRP': product.mrp,
        'ASP': '',
        'Profit in %': '',
        'Profit in Rs': '',
      };
    });

    if (!rows.length) {
      rows.push({
        'Product ID': '',
        'SKU Code': '',
        'Product Name': '',
        'Marketplace': marketplaceName,
        'Brand': '',
        'Category': '',
        'Sub Category': '',
        'Product Cost': '',
        'MRP': '',
        'ASP': '',
        'Profit in %': '',
        'Profit in Rs': '',
      });
      setPageMessage('No mapped products found for current selection. Downloaded a template with headers.');
    } else {
      setPageMessage(`Sample downloaded with ${rows.length} products.`);
    }

    await downloadWorkbook(rows, 'pricing-sample.xlsx', {
      sheetName: 'Products',
      orangeColumns: ['ASP', 'Profit in %', 'Profit in Rs'],
      includeInstructions: true,
      instructionsTitle: '=== Pricing Import Instructions ===',
      instructions: [
        'Fill pricing data in the Products sheet.',
        'Orange headers are required fields.',
        'Required: Product ID or SKU Code, ASP.',
        'Optional: Profit in %, Profit in Rs.',
        'Use values only; do not rename headers.',
      ],
    });
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

  const getProductFromRow = (row: SheetRow) => {
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
      const rows = XLSX.utils.sheet_to_json<SheetRow>(firstSheet, { defval: '' });

      const errors: string[] = [];
      const parsed: UploadRow[] = [];

      rows.forEach((row: SheetRow, index: number) => {
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
            inputGst: calculateInputGst ? 0 : row.inputGst,
          });

          const reverseFixedFee = calculateReverseFixedFee ? (result.excessFixedFee ?? 0) : 0;
          const pickAndPack = calculatePickAndPack ? (result.pickAndPackFee ?? 0) : 0;
          const finalProfit = result.profit;
          const finalProfitPercentage = result.profitPercentage;

          computed.push({
            rowNumber: row.rowNumber,
            productId: row.product.id,
            skuCode: row.product.skuCode,
            productName: row.product.name,
            asp: result.desiredSellingPrice ?? result.sellingPrice,
            inputGst: result.inputGst,
            reverseFixedFee,
            pickAndPack,
            baseProfit: result.profit,
            finalProfit,
            finalProfitPercentage,
            finalSettlement: result.finalSettlement ?? 0,
            codbWithGtPercentage: result.codbWithGtPercentage ?? 0,
            finalDiscountPercentage: result.finalDiscountPercentage ?? 0,
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
            finalSettlement: 0,
            codbWithGtPercentage: 0,
            finalDiscountPercentage: 0,
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
        'Excess Fixed Fee': Number(r.reverseFixedFee.toFixed(2)),
        'Pick and Pack': Number(r.pickAndPack.toFixed(2)),
        'Base Profit': Number(r.baseProfit.toFixed(2)),
        'Profit in Rs': Number(r.finalProfit.toFixed(2)),
        'Profit %': Number(r.finalProfitPercentage.toFixed(2)),
        'Final Settlement': Number(r.finalSettlement.toFixed(2)),
        'CODB with GT %': Number(r.codbWithGtPercentage.toFixed(2)),
        'Final Disc %': Number(r.finalDiscountPercentage.toFixed(2)),
        'Status': r.status,
        'Message': r.message,
      }));

      await downloadWorkbook(exportRows, 'pricing-calculation-result.xlsx', {
        sheetName: 'Pricing Result',
      });
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
          <div className="pricing-grid-row">
            <div className="pricing-field">
              <label>Marketplace</label>
              <select value={selectedMarketplaceId} onChange={(e) => void handleMarketplaceChange(e.target.value)}>
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
                {displayedBrands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {categoryLevels.map((levelCategories, levelIndex) => {
              const selectedAtLevel = selectedCategoryPath[levelIndex];
              const label = levelIndex === 0 ? 'Category' : 'Sub Category';
              const placeholder = levelIndex === 0 ? 'Category' : 'Sub Category';

              return (
                <div className="pricing-field" key={`category-level-${levelIndex}`}>
                  <label>{label}</label>
                  <select
                    value={selectedAtLevel ? String(selectedAtLevel) : ''}
                    onChange={(e) => handleCategoryLevelChange(levelIndex, e.target.value)}
                  >
                    <option value="">{placeholder}</option>
                    {levelCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="pricing-checklist">
            <label>
              <input
                type="checkbox"
                checked={calculateReverseFixedFee}
                onChange={(e) => setCalculateReverseFixedFee(e.target.checked)}
              />
              <span>Calculate Excess Fixed Fee</span>
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
            <div className="pricing-secondary-actions">
              <button className="pricing-btn pricing-btn-secondary" onClick={handleDownloadSample}>
                Download Sample
              </button>
              <button className="pricing-btn pricing-btn-secondary" onClick={handleUploadClick}>
                Upload File
              </button>
            </div>
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
                    <th>Excess Fixed Fee</th>
                    <th>Pick and Pack</th>
                    <th>Profit in Rs</th>
                    <th>Final Settlement</th>
                    <th>CODB with GT %</th>
                    <th>Final Disc %</th>
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
                      <td>{row.finalSettlement.toFixed(2)}</td>
                      <td>{row.codbWithGtPercentage.toFixed(2)}</td>
                      <td>{row.finalDiscountPercentage.toFixed(2)}</td>
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

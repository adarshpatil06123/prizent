import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AddMarketplacePage.css";
import marketplaceService, { CreateMarketplaceRequest, CreateMarketplaceCostRequest } from '../../services/marketplaceService';
import { getCustomFields, saveCustomFieldValue, CustomFieldResponse } from '../../services/customFieldService';
import brandService, { Brand } from '../../services/brandService';
import categoryService from '../../services/categoryService';

interface BrandSlab { from: string; to: string; value: string; valueType: 'P' | 'A'; brandId: string; parentCategoryId: string; categoryId: string; subCategoryId: string; }
interface WeightSlab { 
  weightFrom: string; 
  weightTo: string; 
  local: string; 
  zonal: string; 
  national: string;
  value: string;
}
interface FixedFeeSlab {
  aspFrom: string;
  aspTo: string;
  fee: string;
}
interface CollectionFeeSlab {
  orderValueFrom: string;
  orderValueTo: string;
  prepaid: string;
  postpaid: string;
}
interface PickAndPackSlab {
  brand: string;
  parentCategoryId: string;
  categoryId: string;
  subCategoryId: string;
  from: string;
  to: string;
  pnpValue: string;
}
interface BrandMapping {
  localId: string;
  brandId: string;
  commissionSlabs: BrandSlab[];
  marketingSlabs: BrandSlab[];
  shippingSlabs: BrandSlab[];
  commissionValueType: 'P' | 'A';
  marketingValueType: 'P' | 'A';
  shippingValueType: 'P' | 'A';
}

const AddMarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    accNo: '',
    enabled: false
  });
  
  // Cost slabs state
  const [productCostSlabs, setProductCostSlabs] = useState([{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);
  const [marketingSlabs, setMarketingSlabs] = useState([{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);
  // NEW: Weight-based shipping state
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([{ weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  
  // NEW: Simple fee sections
  const [shippingPercentage, setShippingPercentage] = useState({ local: '0', zonal: '0', national: '0' });
  const [fixedFeeSlabs, setFixedFeeSlabs] = useState<FixedFeeSlab[]>([{ aspFrom: '0', aspTo: '0', fee: '0' }]);

  
  // Flat based values for Shipping, Marketing, Fixed Fee
  const [shippingFlatValue, setShippingFlatValue] = useState('0');
  const [marketingFlatValue, setMarketingFlatValue] = useState('0');
  const [fixedFeeFlatValue, setFixedFeeFlatValue] = useState('0');
  const [commissionFlatValue, setCommissionFlatValue] = useState('0');
  
  // Value types for flat panels (% or Rs toggle)
  const [shippingFlatValueType, setShippingFlatValueType] = useState<'P' | 'A'>('A');
  const [marketingFlatValueType, setMarketingFlatValueType] = useState<'P' | 'A'>('A');
  const [fixedFeeFlatValueType, setFixedFeeFlatValueType] = useState<'P' | 'A'>('A');
  const [commissionFlatValueType, setCommissionFlatValueType] = useState<'P' | 'A'>('A');
  
  // Value types for slab table toggles (% or Rs toggle)
  const [marketingSlabValueType, setMarketingSlabValueType] = useState<'P' | 'A'>('A');
  const [shippingSlabValueType, setShippingSlabValueType] = useState<'P' | 'A'>('A');
  const [commissionSlabValueType, setCommissionSlabValueType] = useState<'P' | 'A'>('A');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productCostValueType, setProductCostValueType] = useState<'P' | 'A'>('A');
  const [marketingValueType, setMarketingValueType] = useState<'P' | 'A'>('A');
  const [shippingValueType, setShippingValueType] = useState<'A' | 'P' | 'gt' | 'none'>('A');
  const [customFields, setCustomFields] = useState<CustomFieldResponse[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: number]: string }>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brandMappings, setBrandMappings] = useState<BrandMapping[]>([]);

  // NEW: Commission/Marketing filters
  const [commissionFilters, setCommissionFilters] = useState({ brandId: '', categoryId: '', none: false });
  const [marketingFilters, setMarketingFilters] = useState({ brandId: '', categoryId: '', none: false });
  const [fixedFeeFilters, setFixedFeeFilters] = useState({ brandId: '', categoryId: '', subCategoryId: '', subSubCategoryId: '' });
  const [fixedFeeValueType, setFixedFeeValueType] = useState<'P' | 'A'>('A');
  const [fixedFeeType, setFixedFeeType] = useState<'flat' | 'gt' | 'none'>('gt');
  
  // Reverse Shipping Cost states
  const [reverseShippingType, setReverseShippingType] = useState<'flat' | 'weight' | 'none'>('weight');
  const [reverseWeightSlabs, setReverseWeightSlabs] = useState<WeightSlab[]>([{ weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  const [reverseWeightValueType, setReverseWeightValueType] = useState<'P' | 'A'>('A');
  const [reverseShippingFlatValue, setReverseShippingFlatValue] = useState('0');
  const [reverseShippingFlatValueType, setReverseShippingFlatValueType] = useState<'P' | 'A'>('A');

  // Collection Fee states
  const [collectionFeeType, setCollectionFeeType] = useState<'value' | 'none'>('value');
  const [collectionFeeSlabs, setCollectionFeeSlabs] = useState<CollectionFeeSlab[]>([{ orderValueFrom: '0', orderValueTo: '0', prepaid: '0', postpaid: '0' }]);
  const [prepaidValueType, setPrepaidValueType] = useState<'P' | 'A'>('A');
  const [postpaidValueType, setPostpaidValueType] = useState<'P' | 'A'>('A');

  // Royalty states
  const [royaltyType, setRoyaltyType] = useState<'flat' | 'none'>('flat');
  const [royaltyValue, setRoyaltyValue] = useState('0');
  const [royaltyValueType, setRoyaltyValueType] = useState<'P' | 'A'>('A');

  // Pick and Pack states
  const [pickAndPackType, setPickAndPackType] = useState<'slab' | 'none'>('slab');
  const [pickAndPackSlabs, setPickAndPackSlabs] = useState<PickAndPackSlab[]>([
    { brand: '', parentCategoryId: '', categoryId: '', subCategoryId: '', from: '0', to: '0', pnpValue: '0' }
  ]);
  const [pickAndPackValueType, setPickAndPackValueType] = useState<'P' | 'A'>('A');

  // Update all existing slabs when value type toggle changes
  const handleProductCostValueTypeChange = (newType: 'P' | 'A') => {
    setProductCostValueType(newType);
    setProductCostSlabs(prev => prev.map(slab => ({ ...slab, valueType: newType })));
  };

  const handleMarketingValueTypeChange = (newType: 'P' | 'A') => {
    setMarketingValueType(newType);
    setMarketingSlabs(prev => prev.map(slab => ({ ...slab, valueType: newType })));
  };

  const handleShippingValueTypeChange = (newType: 'A' | 'P' | 'gt' | 'none') => {
    setShippingValueType(newType);
  };

  // Validate numeric input - only allow numbers and decimal point
  const validateNumericInput = (value: string): string => {
    return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  };

  // Fetch brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await brandService.getAllBrands();
        if (res.success && res.brands) setBrands(res.brands.filter(b => b.enabled));
      } catch (e) {
        console.error('Failed to fetch brands:', e);
      }
    };
    fetchBrands();
  }, []);

  // Fetch custom fields for marketplaces
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const fields = await getCustomFields('m');
        const enabledFields = fields.filter(f => f.enabled);
        setCustomFields(enabledFields);
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      }
    };
    fetchCustomFields();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getAllCategories();
        if (res.success && res.categories) setCategories(res.categories.filter((c: any) => c.enabled));
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      }
    };
    fetchCategories();
  }, []);

  // Brand mapping functions
  const addBrandMapping = () => {
    setBrandMappings(prev => [...prev, {
      localId: `temp-${Date.now()}`,
      brandId: '',
      commissionSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }],
      marketingSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }],
      shippingSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }],
      commissionValueType: 'A' as 'P' | 'A',
      marketingValueType: 'A' as 'P' | 'A',
      shippingValueType: 'A' as 'P' | 'A',
    }]);
  };

  const removeBrandMapping = (localId: string) => setBrandMappings(prev => prev.filter(m => m.localId !== localId));

  const updateBrandMapping = (localId: string, field: keyof BrandMapping, value: any) =>
    setBrandMappings(prev => prev.map(m => m.localId === localId ? { ...m, [field]: value } : m));

  const updateBrandValueType = (localId: string, category: 'commission' | 'marketing' | 'shipping', type: 'P' | 'A') => {
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    const typeKey = `${category}ValueType` as keyof BrandMapping;
    setBrandMappings(prev => prev.map(m => {
      if (m.localId !== localId) return m;
      return { ...m, [typeKey]: type, [slabKey]: (m[slabKey] as BrandSlab[]).map(s => ({ ...s, valueType: type })) };
    }));
  };

  const addBrandSlab = (localId: string, category: 'commission' | 'marketing' | 'shipping') => {
    const typeKey = `${category}ValueType` as keyof BrandMapping;
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    setBrandMappings(prev => prev.map(m => {
      if (m.localId !== localId) return m;
      return { ...m, [slabKey]: [...(m[slabKey] as BrandSlab[]), { from: '0', to: '0', value: '0', valueType: m[typeKey] as 'P' | 'A' }] };
    }));
  };

  const removeBrandSlab = (localId: string, category: 'commission' | 'marketing' | 'shipping', index: number) => {
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    setBrandMappings(prev => prev.map(m => {
      if (m.localId !== localId) return m;
      const slabs = m[slabKey] as BrandSlab[];
      if (slabs.length <= 1) return m;
      return { ...m, [slabKey]: slabs.filter((_, i) => i !== index) };
    }));
  };

  const updateBrandSlab = (localId: string, category: 'commission' | 'marketing' | 'shipping', index: number, field: string, value: string) => {
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    const validated = field !== 'valueType' ? validateNumericInput(value) : value;
    setBrandMappings(prev => prev.map(m => {
      if (m.localId !== localId) return m;
      return { ...m, [slabKey]: (m[slabKey] as BrandSlab[]).map((s, i) => i === index ? { ...s, [field]: validated } : s) };
    }));
  };
  // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addProductCostSlab = () => {
    setProductCostSlabs(prev => [...prev, { from: '0', to: '0', value: '0', valueType: productCostValueType, brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);
  };

  const removeProductCostSlab = (index: number) => {
    if (productCostSlabs.length > 1) {
      setProductCostSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateProductCostSlab = (index: number, field: string, value: string) => {
    const numericFields = ['from', 'to', 'value'];
    const validatedValue = numericFields.includes(field) ? validateNumericInput(value) : value;
    setProductCostSlabs(prev => prev.map((slab, i) => {
      if (i !== index) return slab;
      // When parent category changes, reset child category
      if (field === 'parentCategoryId') return { ...slab, parentCategoryId: validatedValue, categoryId: '', subCategoryId: '' };
      if (field === 'categoryId') return { ...slab, categoryId: validatedValue, subCategoryId: '' };
      return { ...slab, [field]: validatedValue };
    }));
  };

  const addMarketingSlab = () => {
    setMarketingSlabs(prev => [...prev, { from: '0', to: '0', value: '0', valueType: marketingValueType, brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);
  };

  const removeMarketingSlab = (index: number) => {
    if (marketingSlabs.length > 1) {
      setMarketingSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateMarketingSlab = (index: number, field: string, value: string) => {
    const numericFields = ['from', 'to', 'value'];
    const validatedValue = numericFields.includes(field) ? validateNumericInput(value) : value;
    setMarketingSlabs(prev => prev.map((slab, i) => {
      if (i !== index) return slab;
      if (field === 'parentCategoryId') return { ...slab, parentCategoryId: validatedValue, categoryId: '', subCategoryId: '' };
      if (field === 'categoryId') return { ...slab, categoryId: validatedValue, subCategoryId: '' };
      return { ...slab, [field]: validatedValue };
    }));
  };

  // ══════════ NEW: Weight-based Shipping Handlers ══════════
  const addWeightSlab = () => {
    setWeightSlabs(prev => [...prev, { weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  };

  const removeWeightSlab = (index: number) => {
    if (weightSlabs.length > 1) {
      setWeightSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateWeightSlab = (index: number, field: keyof WeightSlab, value: string) => {
    const validatedValue = validateNumericInput(value);
    setWeightSlabs(prev => prev.map((slab, i) => 
      i === index ? { ...slab, [field]: validatedValue } : slab
    ));
  };

  // ══════════ Reverse Weight-based Shipping Handlers ══════════
  const addReverseWeightSlab = () => {
    setReverseWeightSlabs(prev => [...prev, { weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  };

  const removeReverseWeightSlab = (index: number) => {
    if (reverseWeightSlabs.length > 1) {
      setReverseWeightSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateReverseWeightSlab = (index: number, field: keyof WeightSlab, value: string) => {
    const validatedValue = validateNumericInput(value);
    setReverseWeightSlabs(prev => prev.map((slab, i) => 
      i === index ? { ...slab, [field]: validatedValue } : slab
    ));
  };

  const handleReverseWeightValueTypeChange = (newType: 'P' | 'A') => {
    setReverseWeightValueType(newType);
  };

  // ══════════ Collection Fee Handlers ══════════
  const addCollectionFeeSlab = () => {
    setCollectionFeeSlabs(prev => [...prev, { orderValueFrom: '0', orderValueTo: '0', prepaid: '0', postpaid: '0' }]);
  };

  const removeCollectionFeeSlab = (index: number) => {
    if (collectionFeeSlabs.length > 1) {
      setCollectionFeeSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateCollectionFeeSlab = (index: number, field: keyof CollectionFeeSlab, value: string) => {
    const validatedValue = validateNumericInput(value);
    setCollectionFeeSlabs(prev => prev.map((slab, i) => 
      i === index ? { ...slab, [field]: validatedValue } : slab
    ));
  };

  const handlePrepaidValueTypeChange = (newType: 'P' | 'A') => {
    setPrepaidValueType(newType);
  };

  const handlePostpaidValueTypeChange = (newType: 'P' | 'A') => {
    setPostpaidValueType(newType);
  };

  // ══════════ Pick and Pack Handlers ══════════
  const addPickAndPackSlab = () => {
    setPickAndPackSlabs(prev => [...prev, { brand: '', parentCategoryId: '', categoryId: '', subCategoryId: '', from: '0', to: '0', pnpValue: '0' }]);
  };

  const removePickAndPackSlab = (index: number) => {
    if (pickAndPackSlabs.length > 1) {
      setPickAndPackSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updatePickAndPackSlab = (index: number, field: keyof PickAndPackSlab, value: string) => {
    const validatedValue = (field === 'from' || field === 'to' || field === 'pnpValue') 
      ? validateNumericInput(value) 
      : value;
    setPickAndPackSlabs(prev => prev.map((slab, i) => {
      if (i !== index) return slab;
      if (field === 'parentCategoryId') return { ...slab, parentCategoryId: validatedValue, categoryId: '', subCategoryId: '' };
      if (field === 'categoryId') return { ...slab, categoryId: validatedValue, subCategoryId: '' };
      return { ...slab, [field]: validatedValue };
    }));
  };

  const handlePickAndPackValueTypeChange = (newType: 'P' | 'A') => {
    setPickAndPackValueType(newType);
  };

  // ══════════ NEW: Fixed Fee Handlers ══════════
  const addFixedFeeSlab = () => {
    setFixedFeeSlabs(prev => [...prev, { aspFrom: '0', aspTo: '0', fee: '0' }]);
  };

  const removeFixedFeeSlab = (index: number) => {
    if (fixedFeeSlabs.length > 1) {
      setFixedFeeSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateFixedFeeSlab = (index: number, field: keyof FixedFeeSlab, value: string) => {
    const validatedValue = validateNumericInput(value);
    setFixedFeeSlabs(prev => prev.map((slab, i) => 
      i === index ? { ...slab, [field]: validatedValue } : slab
    ));
  };

  // ══════════ NEW: Simple Input Handlers ══════════
  const handleShippingPercentageChange = (field: 'local' | 'zonal' | 'national', value: string) => {
    setShippingPercentage(prev => ({ ...prev, [field]: validateNumericInput(value) }));
  };



  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Marketplace name is required');
        setLoading(false);
        return;
      }

      // Validate slab ranges
      const validateSlabs = (slabs: { from: string; to: string; value: string }[], name: string): string | null => {
        for (const slab of slabs) {
          const fromVal = parseFloat(slab.from) || 0;
          const toVal = parseFloat(slab.to) || 0;
          const val = parseFloat(slab.value) || 0;
          // Only validate slabs where the user has actually entered meaningful data
          if (toVal > 0 || val > 0) {
            if (fromVal >= toVal) {
              return `${name}: "From cost" must be less than "To cost"`;
            }
            if (val <= 0) {
              return `${name}: Value must be greater than 0`;
            }
          }
        }
        return null;
      };

      // Only validate slabs when the section is actually in slab mode
      if (productCostValueType === 'P') {
        const commissionError = validateSlabs(productCostSlabs, 'Commission');
        if (commissionError) {
          setError(commissionError);
          setLoading(false);
          return;
        }
      }

      if (marketingValueType === 'P' && !marketingFilters.none) {
        const marketingError = validateSlabs(marketingSlabs, 'Marketing');
        if (marketingError) {
          setError(marketingError);
          setLoading(false);
          return;
        }
      }

      // Note: shippingSlabs (zombie state) removed from validation; actual shipping uses weightSlabs
      
      // Prepare cost data
      const costs: CreateMarketplaceCostRequest[] = [];

      // ── Commission ──
      if (productCostValueType === 'A') {
        // Flat based commission
        if (parseFloat(commissionFlatValue) > 0) {
          costs.push({ costCategory: 'COMMISSION', costValueType: commissionFlatValueType, costValue: parseFloat(commissionFlatValue), costProductRange: 'flat' });
        }
      } else {
        // Slab based commission
        productCostSlabs.forEach((slab) => {
          if (parseFloat(slab.to) > parseFloat(slab.from) && parseFloat(slab.value) > 0) {
            const categoryId = slab.subCategoryId ? parseInt(slab.subCategoryId) : slab.categoryId ? parseInt(slab.categoryId) : slab.parentCategoryId ? parseInt(slab.parentCategoryId) : undefined;
            costs.push({ costCategory: 'COMMISSION', costValueType: commissionSlabValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.from}-${slab.to}`, ...(categoryId !== undefined && { categoryId }), ...(slab.brandId && { brandId: parseInt(slab.brandId) }) });
          }
        });
      }

      // ── Marketing ──
      if (!marketingFilters.none) {
        if (marketingValueType === 'A') {
          // Flat based marketing
          if (parseFloat(marketingFlatValue) > 0) {
            costs.push({ costCategory: 'MARKETING', costValueType: marketingFlatValueType, costValue: parseFloat(marketingFlatValue), costProductRange: 'flat' });
          }
        } else {
          // Slab based marketing
          marketingSlabs.forEach((slab) => {
            if (parseFloat(slab.to) > parseFloat(slab.from) && parseFloat(slab.value) > 0) {
              const categoryId = slab.subCategoryId ? parseInt(slab.subCategoryId) : slab.categoryId ? parseInt(slab.categoryId) : slab.parentCategoryId ? parseInt(slab.parentCategoryId) : undefined;
              costs.push({ costCategory: 'MARKETING', costValueType: marketingSlabValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.from}-${slab.to}`, ...(categoryId !== undefined && { categoryId }), ...(slab.brandId && { brandId: parseInt(slab.brandId) }) });
            }
          });
        }
      }

      // ── Shipping ──
      if (shippingValueType === 'A' || shippingValueType === 'gt') {
        // Flat/GT based shipping
        if (parseFloat(shippingFlatValue) > 0) {
          costs.push({ costCategory: 'SHIPPING', costValueType: shippingFlatValueType, costValue: parseFloat(shippingFlatValue), costProductRange: shippingValueType === 'gt' ? 'gt' : 'flat' });
        }
      } else if (shippingValueType === 'P') {
        // Weight based shipping
        weightSlabs.forEach((slab) => {
          if (parseFloat(slab.weightTo) > parseFloat(slab.weightFrom)) {
            if (parseFloat(slab.local) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING_LOCAL', costValueType: shippingSlabValueType, costValue: parseFloat(slab.local), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.zonal) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING_ZONAL', costValueType: shippingSlabValueType, costValue: parseFloat(slab.zonal), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.national) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING_NATIONAL', costValueType: shippingSlabValueType, costValue: parseFloat(slab.national), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.value) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING', costValueType: shippingSlabValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
          }
        });
      }

      // ── Shipping Percentage ──
      if (parseFloat(shippingPercentage.local) > 0) costs.push({ costCategory: 'SHIPPING_PERCENTAGE_LOCAL', costValueType: 'P', costValue: parseFloat(shippingPercentage.local), costProductRange: 'local' });
      if (parseFloat(shippingPercentage.zonal) > 0) costs.push({ costCategory: 'SHIPPING_PERCENTAGE_ZONAL', costValueType: 'P', costValue: parseFloat(shippingPercentage.zonal), costProductRange: 'zonal' });
      if (parseFloat(shippingPercentage.national) > 0) costs.push({ costCategory: 'SHIPPING_PERCENTAGE_NATIONAL', costValueType: 'P', costValue: parseFloat(shippingPercentage.national), costProductRange: 'national' });

      // ── Fixed Fee ──
      if (fixedFeeType === 'flat') {
        if (parseFloat(fixedFeeFlatValue) > 0) {
          costs.push({ costCategory: 'FIXED_FEE', costValueType: fixedFeeFlatValueType, costValue: parseFloat(fixedFeeFlatValue), costProductRange: 'flat' });
        }
      } else if (fixedFeeType === 'gt') {
        fixedFeeSlabs.forEach((slab) => {
          if (parseFloat(slab.aspTo) > parseFloat(slab.aspFrom) && parseFloat(slab.fee) > 0) {
            const categoryId = fixedFeeFilters.subSubCategoryId ? parseInt(fixedFeeFilters.subSubCategoryId)
              : fixedFeeFilters.subCategoryId ? parseInt(fixedFeeFilters.subCategoryId)
              : fixedFeeFilters.categoryId ? parseInt(fixedFeeFilters.categoryId)
              : undefined;
            costs.push({ costCategory: 'FIXED_FEE', costValueType: fixedFeeValueType, costValue: parseFloat(slab.fee), costProductRange: `${slab.aspFrom}-${slab.aspTo}`, ...(categoryId !== undefined && { categoryId }), ...(fixedFeeFilters.brandId && { brandId: parseInt(fixedFeeFilters.brandId) }) });
          }
        });
      }

      // ── Reverse Shipping ──
      if (reverseShippingType === 'flat') {
        if (parseFloat(reverseShippingFlatValue) > 0) {
          costs.push({ costCategory: 'REVERSE_SHIPPING', costValueType: reverseShippingFlatValueType, costValue: parseFloat(reverseShippingFlatValue), costProductRange: 'flat' });
        }
      } else if (reverseShippingType === 'weight') {
        reverseWeightSlabs.forEach((slab) => {
          if (parseFloat(slab.weightTo) > parseFloat(slab.weightFrom)) {
            if (parseFloat(slab.local) > 0) costs.push({ costCategory: 'REVERSE_SHIPPING_LOCAL', costValueType: reverseWeightValueType, costValue: parseFloat(slab.local), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.zonal) > 0) costs.push({ costCategory: 'REVERSE_SHIPPING_ZONAL', costValueType: reverseWeightValueType, costValue: parseFloat(slab.zonal), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.national) > 0) costs.push({ costCategory: 'REVERSE_SHIPPING_NATIONAL', costValueType: reverseWeightValueType, costValue: parseFloat(slab.national), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.value) > 0) costs.push({ costCategory: 'REVERSE_WEIGHT_SHIPPING', costValueType: reverseWeightValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
          }
        });
      }

      // ── Collection Fee ──
      if (collectionFeeType === 'value') {
        collectionFeeSlabs.forEach((slab) => {
          if (parseFloat(slab.orderValueTo) > parseFloat(slab.orderValueFrom)) {
            if (parseFloat(slab.prepaid) > 0) costs.push({ costCategory: 'COLLECTION_FEE_PREPAID', costValueType: prepaidValueType, costValue: parseFloat(slab.prepaid), costProductRange: `${slab.orderValueFrom}-${slab.orderValueTo}` });
            if (parseFloat(slab.postpaid) > 0) costs.push({ costCategory: 'COLLECTION_FEE_POSTPAID', costValueType: postpaidValueType, costValue: parseFloat(slab.postpaid), costProductRange: `${slab.orderValueFrom}-${slab.orderValueTo}` });
          }
        });
      }

      // ── Royalty ──
      if (royaltyType === 'flat' && parseFloat(royaltyValue) > 0) {
        costs.push({ costCategory: 'ROYALTY', costValueType: royaltyValueType, costValue: parseFloat(royaltyValue), costProductRange: 'flat' });
      }

      // ── Pick and Pack ──
      if (pickAndPackType === 'slab') {
        pickAndPackSlabs.forEach((slab) => {
          if (parseFloat(slab.pnpValue) > 0) {
            const categoryId = slab.subCategoryId ? parseInt(slab.subCategoryId) : slab.categoryId ? parseInt(slab.categoryId) : slab.parentCategoryId ? parseInt(slab.parentCategoryId) : undefined;
            costs.push({ costCategory: 'PICK_AND_PACK', costValueType: pickAndPackValueType, costValue: parseFloat(slab.pnpValue), costProductRange: `${slab.from}-${slab.to}`, ...(categoryId !== undefined && { categoryId }), ...(slab.brand && { brandId: parseInt(slab.brand) }) });
          }
        });
      }
      
      const request: CreateMarketplaceRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        enabled: formData.enabled,
        accNo: formData.accNo.trim() || undefined,
        costs
      };
      
      const response = await marketplaceService.createMarketplace(request);
      
      if (response.success) {
        // Save custom field values
        if (Object.keys(customFieldValues).length > 0 && response.marketplace) {
          try {
            await Promise.all(
              Object.entries(customFieldValues).map(async ([fieldId, value]) => {
                const trimmedValue = value.trim();
                if (trimmedValue) {
                  await saveCustomFieldValue({
                    customFieldId: Number(fieldId),
                    module: 'm',
                    moduleId: response.marketplace!.id,
                    value: trimmedValue
                  });
                }
              })
            );
          } catch (fieldError) {
            console.error('Error saving custom field values:', fieldError);
          }
        }

        navigate('/marketplaces');
      } else {
        setError(response.message || 'Failed to create marketplace');
      }
    } catch (err: any) {
      console.error('Error creating marketplace:', err);
      setError(err.response?.data?.message || 'Failed to create marketplace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-marketplace-bg">
      <main className="add-marketplace-main">
        <header className="add-marketplace-header">
          <button className="back-btn" onClick={() => navigate("/marketplaces")}> 
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="breadcrumb">Add Marketplace</h2>

          <div className="header-actions">
            <button className="icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 21L16.65 16.65" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="icon-btn profile-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        <h3 className="section-title">Marketplace Details</h3>

        {error && (
          <div className="error-message" style={{padding: '15px', marginBottom: '20px', backgroundColor: '#fee', color: '#c23939', borderRadius: '8px'}}>
            {error}
          </div>
        )}

        <div className="marketplace-details-container">
          <div className="details-row-1">
            <div className="form-field">
              <label className="field-label">Marketplace Name</label>
              <input 
                className="text-input" 
                placeholder="enter marketplace name" 
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="field-label">Acc.no</label>
              <input 
                className="text-input" 
                placeholder="enter account number" 
                value={formData.accNo}
                onChange={(e) => handleInputChange('accNo', e.target.value)}
              />
            </div>
          </div>
          
          <div className="details-row-2">
            <div className="form-field">
              <label className="field-label">Description</label>
              <textarea 
                className="text-input description-textarea" 
                placeholder="description" 
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          {/* Custom Fields Row - Moved from separate section */}
          {customFields.length > 0 && (
            <div className="details-row-custom-fields">
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                {customFields.map((field) => (
                  <div key={field.id} className="form-field">
                    <label className="field-label">{field.name}{field.required ? ' *' : ''}</label>
                    {field.fieldType === 'text' || field.fieldType === 'numeric' ? (
                      <input
                        type={field.fieldType === 'numeric' ? 'number' : 'text'}
                        placeholder={field.name + (field.required ? ' *' : '')}
                        className="text-input"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                        required={field.required}
                        disabled={loading}
                      />
                    ) : field.fieldType === 'dropdown' && field.dropdownOptions ? (
                      <select
                        className="select-input"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                        required={field.required}
                        disabled={loading}
                      >
                        <option value="">{field.name + (field.required ? ' *' : '')}</option>
                        {field.dropdownOptions.split(',').map((option: string, idx: number) => (
                          <option key={idx} value={option.trim()}>
                            {option.trim()}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="details-row-3">
            <label className="activate-row">
              <input 
                type="checkbox" 
                checked={formData.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
              />
              <span>Activate marketplace</span>
            </label>
          </div>
        </div>

        {/* ═══════════════════════ COMMISSION SECTION ═══════════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Commission</h3>
          
          {/* Radio Toggle: Flat based / Slab based */}
          <div className="commission-toggle-container">
            <label className="commission-radio-option">
              <input
                type="radio"
                name="commissionType"
                value="flat"
                checked={productCostValueType === 'A'}
                onChange={() => handleProductCostValueTypeChange('A')}
              />
              <span className="commission-radio-label">Flat based Commission</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="commissionType"
                value="slab"
                checked={productCostValueType === 'P'}
                onChange={() => handleProductCostValueTypeChange('P')}
              />
              <span className="commission-radio-label">Slab based Commission</span>
            </label>
          </div>

          {/* Flat Based Panel */}
          {productCostValueType === 'A' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={commissionFlatValueType === 'A'}
                    onChange={() => setCommissionFlatValueType(commissionFlatValueType === 'P' ? 'A' : 'P')}
                  />
                  <span className="slider"></span>
                </label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input 
                  className="royalty-input" 
                  type="text" 
                  placeholder="0" 
                  value={commissionFlatValue}
                  onChange={e => setCommissionFlatValue(validateNumericInput(e.target.value))}
                />
                <span className="royalty-unit">{commissionFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}

          {/* Commission Table */}
          {productCostValueType === 'P' && (() => {
            const commissionHasSubCat = productCostSlabs.some(s => s.parentCategoryId !== '');
            const commissionHasSubSubCat = productCostSlabs.some(s => s.categoryId !== '');
            const commissionVisibleCategoryFields = commissionHasSubSubCat ? 3 : commissionHasSubCat ? 2 : 1;
            const commissionGridTemplate = `1fr ${commissionVisibleCategoryFields}fr 0.8fr 0.8fr 0.8fr 0.5fr`;
            return (
          <div className="commission-panel">
            {/* Table Header */}
            <div className="commission-table-header" style={{ gridTemplateColumns: commissionGridTemplate }}>
              <span className="commission-header-label">Brand</span>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                {commissionHasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                {commissionHasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
              </div>
              <span className="commission-header-label">From</span>
              <span className="commission-header-label">To</span>
              <span className="commission-header-label">Value</span>
              <div className="commission-value-toggle">
                <span>%</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={commissionSlabValueType === 'A'}
                    onChange={e => setCommissionSlabValueType(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>

              </div>
            </div>

            {/* Table Rows */}
            {productCostSlabs.map((slab, i) => (
              <div key={i} className="commission-table-row" style={{ gridTemplateColumns: commissionGridTemplate }}>
                <select className="commission-dropdown" style={{ width: '100%' }} value={slab.brandId} onChange={e => updateProductCostSlab(i, 'brandId', e.target.value)}>
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: '1 1 0', minWidth: 0 }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={slab.parentCategoryId} onChange={e => updateProductCostSlab(i, 'parentCategoryId', e.target.value)}>
                      <option value="">All Categories</option>
                      {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                  </div>
                  {commissionHasSubCat && (
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <select className="commission-dropdown" style={{ width: '100%' }} value={slab.categoryId} onChange={e => updateProductCostSlab(i, 'categoryId', e.target.value)} disabled={!slab.parentCategoryId}>
                        <option value="">All Sub Categories</option>
                        {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.parentCategoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {commissionHasSubSubCat && (
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <select className="commission-dropdown" style={{ width: '100%' }} value={slab.subCategoryId} onChange={e => updateProductCostSlab(i, 'subCategoryId', e.target.value)} disabled={!slab.categoryId}>
                        <option value="">All Sub Sub Categories</option>
                        {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.categoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updateProductCostSlab(i, 'from', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updateProductCostSlab(i, 'to', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateProductCostSlab(i, 'value', e.target.value)} />
                {productCostSlabs.length > 1 ? (
                  <button className="commission-delete-btn" onClick={() => removeProductCostSlab(i)} type="button">
                    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                    </svg>
                  </button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Slab Button */}
            <button className="commission-add-slab" onClick={addProductCostSlab} type="button">
              <span>+</span>
              <span>Add Slab</span>
            </button>
          </div>
            );
          })()}
        </div>

        {/* ═══════════════════════ MARKETING SECTION ═══════════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Marketing</h3>
          
          {/* Radio Toggle: Flat based / Slab based / None */}
          <div className="commission-toggle-container">
            <label className="commission-radio-option">
              <input
                type="radio"
                name="marketingType"
                value="flat"
                checked={marketingValueType === 'A' && !marketingFilters.none}
                onChange={() => {
                  handleMarketingValueTypeChange('A');
                  setMarketingFilters(prev => ({ ...prev, none: false }));
                }}
              />
              <span className="commission-radio-label">Flat based Marketing</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="marketingType"
                value="slab"
                checked={marketingValueType === 'P' && !marketingFilters.none}
                onChange={() => {
                  handleMarketingValueTypeChange('P');
                  setMarketingFilters(prev => ({ ...prev, none: false }));
                }}
              />
              <span className="commission-radio-label">Slab based Marketing</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="marketingType"
                value="none"
                checked={marketingFilters.none}
                onChange={() => setMarketingFilters(prev => ({ ...prev, none: true }))}
              />
              <span className="commission-radio-label">None</span>
            </label>
          </div>

          {/* Flat Based Panel */}
          {marketingValueType === 'A' && !marketingFilters.none && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={marketingFlatValueType === 'A'}
                    onChange={() => setMarketingFlatValueType(marketingFlatValueType === 'P' ? 'A' : 'P')}
                  />
                  <span className="slider"></span>
                </label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input 
                  className="royalty-input" 
                  type="text" 
                  placeholder="0" 
                  value={marketingFlatValue}
                  onChange={e => setMarketingFlatValue(validateNumericInput(e.target.value))}
                />
                <span className="royalty-unit">{marketingFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}

          {/* Marketing Table */}
          {marketingValueType === 'P' && !marketingFilters.none && (() => {
            const marketingHasSubCat = marketingSlabs.some(s => s.parentCategoryId !== '');
            const marketingHasSubSubCat = marketingSlabs.some(s => s.categoryId !== '');
            const marketingVisibleCategoryFields = marketingHasSubSubCat ? 3 : marketingHasSubCat ? 2 : 1;
            const marketingGridTemplate = `1fr ${marketingVisibleCategoryFields}fr 0.8fr 0.8fr 0.8fr 0.5fr`;
            return (
          <div className="commission-panel">
            {/* Table Header */}
            <div className="commission-table-header" style={{ gridTemplateColumns: marketingGridTemplate }}>
              <span className="commission-header-label">Brand</span>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                {marketingHasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                {marketingHasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
              </div>
              <span className="commission-header-label">From</span>
              <span className="commission-header-label">To</span>
              <span className="commission-header-label">Contri</span>
              <div className="commission-value-toggle">
                <span>%</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={marketingSlabValueType === 'A'}
                    onChange={e => setMarketingSlabValueType(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>

            {/* Table Rows */}
            {marketingSlabs.map((slab, i) => (
              <div key={i} className="commission-table-row" style={{ gridTemplateColumns: marketingGridTemplate }}>
                <select className="commission-dropdown" style={{ width: '100%' }} value={slab.brandId} onChange={e => updateMarketingSlab(i, 'brandId', e.target.value)}>
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: '1 1 0', minWidth: 0 }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={slab.parentCategoryId} onChange={e => updateMarketingSlab(i, 'parentCategoryId', e.target.value)}>
                      <option value="">All Categories</option>
                      {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                  </div>
                  {marketingHasSubCat && (
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <select className="commission-dropdown" style={{ width: '100%' }} value={slab.categoryId} onChange={e => updateMarketingSlab(i, 'categoryId', e.target.value)} disabled={!slab.parentCategoryId}>
                        <option value="">All Sub Categories</option>
                        {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.parentCategoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {marketingHasSubSubCat && (
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <select className="commission-dropdown" style={{ width: '100%' }} value={slab.subCategoryId} onChange={e => updateMarketingSlab(i, 'subCategoryId', e.target.value)} disabled={!slab.categoryId}>
                        <option value="">All Sub Sub Categories</option>
                        {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.categoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updateMarketingSlab(i, 'from', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updateMarketingSlab(i, 'to', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateMarketingSlab(i, 'value', e.target.value)} />
                {marketingSlabs.length > 1 ? (
                  <button className="commission-delete-btn" onClick={() => removeMarketingSlab(i)} type="button">
                    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                    </svg>
                  </button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Slab Button */}
            <button className="commission-add-slab" onClick={addMarketingSlab} type="button">
              <span>+</span>
              <span>Add Slab</span>
            </button>
          </div>
            );
          })()}
        </div>

        {/* ═══════════════════════ SHIPPING SECTION ═══════════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Shipping</h3>
          
          {/* Radio Toggle: Flat based / Weight based / GT based / None */}
          <div className="commission-toggle-container" style={{ gap: '80px' }}>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="shippingType"
                value="flat"
                checked={shippingValueType === 'A'}
                onChange={() => handleShippingValueTypeChange('A')}
              />
              <span className="commission-radio-label">Flat based Shipping</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="shippingType"
                value="weight"
                checked={shippingValueType === 'P'}
                onChange={() => handleShippingValueTypeChange('P')}
              />
              <span className="commission-radio-label">Weight based Shipping</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="shippingType"
                value="gt"
                checked={shippingValueType === 'gt'}
                onChange={() => handleShippingValueTypeChange('gt')}
              />
              <span className="commission-radio-label">GT based</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="shippingType"
                value="none"
                checked={shippingValueType === 'none'}
                onChange={() => handleShippingValueTypeChange('none')}
              />
              <span className="commission-radio-label">None</span>
            </label>
          </div>

          {/* Flat/GT Based Panel */}
          {(shippingValueType === 'A' || shippingValueType === 'gt') && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={shippingFlatValueType === 'A'}
                    onChange={() => setShippingFlatValueType(shippingFlatValueType === 'P' ? 'A' : 'P')}
                  />
                  <span className="slider"></span>
                </label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input 
                  className="royalty-input" 
                  type="text" 
                  placeholder="0" 
                  value={shippingFlatValue}
                  onChange={e => setShippingFlatValue(validateNumericInput(e.target.value))}
                />
                <span className="royalty-unit">{shippingFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}

          {/* Shipping Table - Weight Based */}
          {shippingValueType === 'P' && (
          <div className="commission-panel">
            {/* Table Header */}
            <div className="shipping-table-header">
              <span className="commission-header-label">Weight From(kg)</span>
              <span className="commission-header-label">Weight To(kg)</span>
              <span className="commission-header-label">Local(₹)</span>
              <span className="commission-header-label">Zonal(₹)</span>
              <span className="commission-header-label">National(₹)</span>
              <span className="commission-header-label">Value</span>
              <div className="commission-value-toggle">
                <span>%</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={shippingSlabValueType === 'A'}
                    onChange={e => setShippingSlabValueType(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>

            {/* Table Rows */}
            {weightSlabs.map((slab, i) => (
              <div key={i} className="shipping-table-row">
                <input className="commission-input" placeholder="0" value={slab.weightFrom} onChange={e => updateWeightSlab(i, 'weightFrom', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.weightTo} onChange={e => updateWeightSlab(i, 'weightTo', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.local} onChange={e => updateWeightSlab(i, 'local', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.zonal} onChange={e => updateWeightSlab(i, 'zonal', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.national} onChange={e => updateWeightSlab(i, 'national', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateWeightSlab(i, 'value', e.target.value)} />
                {weightSlabs.length > 1 ? (
                  <button className="commission-delete-btn" onClick={() => removeWeightSlab(i)} type="button">
                    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                    </svg>
                  </button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Weight Slab Button */}
            <button className="commission-add-slab" onClick={addWeightSlab} type="button">
              <span>+</span>
              <span>Add Weight Slab</span>
            </button>
          </div>
          )}
        </div>

        {/* ═══════════════════════ SHIPPING PERCENTAGE SECTION ═══════════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Shipping Percentage</h3>
          
          <div className="shipping-percentage-panel">
            {/* Labels Row */}
            <div className="shipping-percentage-labels">
              <span className="shipping-percentage-label">Local(%)</span>
              <span className="shipping-percentage-label">Zonal(%)</span>
              <span className="shipping-percentage-label">National(%)</span>
            </div>
            
            {/* Separator Line */}
            <div className="shipping-percentage-divider"></div>
            
            {/* Inputs Row */}
            <div className="shipping-percentage-inputs">
              <input 
                className="shipping-percentage-input" 
                type="text" 
                placeholder="50%" 
                value={shippingPercentage.local} 
                onChange={e => handleShippingPercentageChange('local', e.target.value)} 
              />
              <input 
                className="shipping-percentage-input" 
                type="text" 
                placeholder="50%" 
                value={shippingPercentage.zonal} 
                onChange={e => handleShippingPercentageChange('zonal', e.target.value)} 
              />
              <input 
                className="shipping-percentage-input" 
                type="text" 
                placeholder="50%" 
                value={shippingPercentage.national} 
                onChange={e => handleShippingPercentageChange('national', e.target.value)} 
              />
              <button className="commission-delete-btn" type="button" onClick={() => setShippingPercentage({ local: '0', zonal: '0', national: '0' })}>
                <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ FIXED FEE SECTION ═══════════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Fixed Fee</h3>
          
          {/* Radio Toggle: Flat based / GT based on seller ASP / None */}
          <div className="commission-toggle-container" style={{ gap: '80px' }}>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="fixedFeeType"
                value="flat"
                checked={fixedFeeType === 'flat'}
                onChange={() => setFixedFeeType('flat')}
              />
              <span className="commission-radio-label">Flat based Shipping</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="fixedFeeType"
                value="gt"
                checked={fixedFeeType === 'gt'}
                onChange={() => setFixedFeeType('gt')}
              />
              <span className="commission-radio-label">GT based on seller ASP</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="fixedFeeType"
                value="none"
                checked={fixedFeeType === 'none'}
                onChange={() => setFixedFeeType('none')}
              />
              <span className="commission-radio-label">None</span>
            </label>
          </div>

          {/* Flat Based Panel */}
          {fixedFeeType === 'flat' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={fixedFeeFlatValueType === 'A'}
                    onChange={() => setFixedFeeFlatValueType(fixedFeeFlatValueType === 'P' ? 'A' : 'P')}
                  />
                  <span className="slider"></span>
                </label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input 
                  className="royalty-input" 
                  type="text" 
                  placeholder="0" 
                  value={fixedFeeFlatValue}
                  onChange={e => setFixedFeeFlatValue(validateNumericInput(e.target.value))}
                />
                <span className="royalty-unit">{fixedFeeFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}

          {/* Fixed Fee Table */}
          {fixedFeeType === 'gt' && (() => {
            const fixedFeeHasSubCat = fixedFeeFilters.categoryId !== '';
            const fixedFeeHasSubSubCat = fixedFeeFilters.subCategoryId !== '';
            const visibleCategoryFields = fixedFeeHasSubSubCat ? 3 : fixedFeeHasSubCat ? 2 : 1;
            const fixedFeeGridTemplate = `1fr ${visibleCategoryFields}fr 0.9fr 0.9fr 0.9fr 1fr`;
            return (
          <div className="commission-panel">
            {/* Table Header */}
            <div className="commission-table-header" style={{ gridTemplateColumns: fixedFeeGridTemplate }}>
              <span className="commission-header-label">Brand</span>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                {fixedFeeHasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                {fixedFeeHasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
              </div>
              <span className="commission-header-label">ASP From</span>
              <span className="commission-header-label">ASP To</span>
              <span className="commission-header-label">Fixed Fee</span>
              <div className="commission-value-toggle">
                <span>%</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={fixedFeeValueType === 'A'}
                    onChange={e => setFixedFeeValueType(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>

            {/* Table Rows */}
            {fixedFeeSlabs.map((slab, i) => (
              <div key={i} className="commission-table-row" style={{ gridTemplateColumns: fixedFeeGridTemplate }}>
                <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.brandId} onChange={e => setFixedFeeFilters(prev => ({ ...prev, brandId: e.target.value }))}>
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: '1 1 0', minWidth: 0 }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.categoryId} onChange={e => setFixedFeeFilters(prev => ({ ...prev, categoryId: e.target.value, subCategoryId: '', subSubCategoryId: '' }))}>
                      <option value="">All Categories</option>
                      {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                  </div>
                  {fixedFeeHasSubCat && (
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.subCategoryId} onChange={e => setFixedFeeFilters(prev => ({ ...prev, subCategoryId: e.target.value, subSubCategoryId: '' }))}>
                        <option value="">All Sub Categories</option>
                        {categories.filter(c => c.parentCategoryId !== null && c.parentCategoryId === parseInt(fixedFeeFilters.categoryId || '0')).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {fixedFeeHasSubSubCat && (
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.subSubCategoryId} onChange={e => setFixedFeeFilters(prev => ({ ...prev, subSubCategoryId: e.target.value }))}>
                        <option value="">All Sub Categories</option>
                        {categories.filter(c => c.parentCategoryId !== null && c.parentCategoryId === parseInt(fixedFeeFilters.subCategoryId || '0')).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <input className="commission-input" placeholder="500" value={slab.aspFrom} onChange={e => updateFixedFeeSlab(i, 'aspFrom', e.target.value)} />
                <input className="commission-input" placeholder="500" value={slab.aspTo} onChange={e => updateFixedFeeSlab(i, 'aspTo', e.target.value)} />
                <input className="commission-input" placeholder="500" value={slab.fee} onChange={e => updateFixedFeeSlab(i, 'fee', e.target.value)} />
                {fixedFeeSlabs.length > 1 ? (
                  <button className="commission-delete-btn" onClick={() => removeFixedFeeSlab(i)} type="button">
                    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                    </svg>
                  </button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Slab Button */}
            <button className="commission-add-slab" onClick={addFixedFeeSlab} type="button">
              <span>+</span>
              <span>Add Slab</span>
            </button>
          </div>
            );
          })()}
        </div>

        {/* ══════════════════ Reverse Shipping Cost Section ══════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Reverse Shipping Cost</h3>
          
          {/* Radio Toggle */}
          <div className="commission-toggle-container">
            <label className={`commission-toggle-option ${reverseShippingType === 'flat' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={reverseShippingType === 'flat'}
                onChange={() => setReverseShippingType('flat')}
              />
              <span>Flat based Shipping</span>
            </label>
            <label className={`commission-toggle-option ${reverseShippingType === 'weight' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={reverseShippingType === 'weight'}
                onChange={() => setReverseShippingType('weight')}
              />
              <span>Weight based Reverse Shipping</span>
            </label>
            <label className={`commission-toggle-option ${reverseShippingType === 'none' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={reverseShippingType === 'none'}
                onChange={() => setReverseShippingType('none')}
              />
              <span>None</span>
            </label>
          </div>

          {/* Flat Based Panel */}
          {reverseShippingType === 'flat' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={reverseShippingFlatValueType === 'A'}
                    onChange={() => setReverseShippingFlatValueType(reverseShippingFlatValueType === 'P' ? 'A' : 'P')}
                  />
                  <span className="slider"></span>
                </label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input 
                  className="royalty-input" 
                  type="text" 
                  placeholder="0" 
                  value={reverseShippingFlatValue}
                  onChange={e => setReverseShippingFlatValue(validateNumericInput(e.target.value))}
                />
                <span className="royalty-unit">{reverseShippingFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}

          {/* Weight Based Panel - Weight Table */}
          {reverseShippingType === 'weight' && (
            <div className="commission-panel">
              {/* Table Header */}
              <div className="shipping-table-header">
                <span>Weight From(kg)</span>
                <span>Weight To(kg)</span>
                <span>Local(₹)</span>
                <span>Zonal(₹)</span>
                <span>National(₹)</span>
                <span>Value</span>
                <div className="commission-value-toggle">
                  <span>%</span>
                  <label className="switch">
                    <input type="checkbox" checked={reverseWeightValueType === 'A'} onChange={e => handleReverseWeightValueTypeChange(e.target.checked ? 'A' : 'P')} />
                    <span className="slider"></span>
                  </label>
                  <span>Rs</span>
                </div>
              </div>

              {/* Table Rows */}
              {reverseWeightSlabs.map((slab, i) => (
                <div className="shipping-table-row" key={i}>
                  <input className="commission-input" placeholder="0" value={slab.weightFrom} onChange={e => updateReverseWeightSlab(i, 'weightFrom', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.weightTo} onChange={e => updateReverseWeightSlab(i, 'weightTo', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.local} onChange={e => updateReverseWeightSlab(i, 'local', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.zonal} onChange={e => updateReverseWeightSlab(i, 'zonal', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.national} onChange={e => updateReverseWeightSlab(i, 'national', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateReverseWeightSlab(i, 'value', e.target.value)} />
                  <div className="commission-delete-cell">
                    <button className="commission-delete-btn" onClick={() => removeReverseWeightSlab(i)} type="button">
                      <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Weight Slab Button */}
              <button className="commission-add-slab" onClick={addReverseWeightSlab} type="button">
                <span>+</span>
                <span>Add Weight Slab</span>
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════ Collection Fee Section ══════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Collection Fee</h3>
          
          {/* Radio Toggle */}
          <div className="commission-toggle-container">
            <label className={`commission-toggle-option ${collectionFeeType === 'value' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={collectionFeeType === 'value'}
                onChange={() => setCollectionFeeType('value')}
              />
              <span>Value based collection fee</span>
            </label>
            <label className={`commission-toggle-option ${collectionFeeType === 'none' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={collectionFeeType === 'none'}
                onChange={() => setCollectionFeeType('none')}
              />
              <span>None</span>
            </label>
          </div>

          {/* Value Based Panel */}
          {collectionFeeType === 'value' && (
            <div className="commission-panel">
              {/* Table Header */}
              <div className="collection-fee-table-header">
                <span>Order Value From</span>
                <span>Order Value To</span>
                <div className="collection-fee-col-header">
                  <span>Prepaid</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch">
                      <input type="checkbox" checked={prepaidValueType === 'A'} onChange={e => handlePrepaidValueTypeChange(e.target.checked ? 'A' : 'P')} />
                      <span className="slider"></span>
                    </label>
                    <span>Rs</span>
                  </div>
                </div>
                <div className="collection-fee-col-header">
                  <span>Postpaid</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch">
                      <input type="checkbox" checked={postpaidValueType === 'A'} onChange={e => handlePostpaidValueTypeChange(e.target.checked ? 'A' : 'P')} />
                      <span className="slider"></span>
                    </label>
                    <span>Rs</span>
                  </div>
                </div>
                <span></span>
              </div>

              {/* Table Rows */}
              {collectionFeeSlabs.map((slab, i) => (
                <div className="collection-fee-table-row" key={i}>
                  <input className="commission-input" placeholder="500" value={slab.orderValueFrom} onChange={e => updateCollectionFeeSlab(i, 'orderValueFrom', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.orderValueTo} onChange={e => updateCollectionFeeSlab(i, 'orderValueTo', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.prepaid} onChange={e => updateCollectionFeeSlab(i, 'prepaid', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.postpaid} onChange={e => updateCollectionFeeSlab(i, 'postpaid', e.target.value)} />
                  <div className="commission-delete-cell">
                    <button className="commission-delete-btn" onClick={() => removeCollectionFeeSlab(i)} type="button">
                      <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Weight Slab Button */}
              <button className="commission-add-slab" onClick={addCollectionFeeSlab} type="button">
                <span>+</span>
                <span>Add Weight Slab</span>
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════ Royalty Section ══════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Royalty</h3>
          
          {/* Radio Toggle */}
          <div className="commission-toggle-container">
            <label className={`commission-toggle-option ${royaltyType === 'flat' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={royaltyType === 'flat'}
                onChange={() => setRoyaltyType('flat')}
              />
              <span>Flat based Royalty</span>
            </label>
            <label className={`commission-toggle-option ${royaltyType === 'none' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={royaltyType === 'none'}
                onChange={() => setRoyaltyType('none')}
              />
              <span>None</span>
            </label>
          </div>

          {/* Flat Based Panel */}
          {royaltyType === 'flat' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={royaltyValueType === 'A'}
                    onChange={() => setRoyaltyValueType(royaltyValueType === 'P' ? 'A' : 'P')}
                  />
                  <span className="slider"></span>
                </label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input 
                  className="royalty-input" 
                  type="text" 
                  placeholder="5" 
                  value={royaltyValue}
                  onChange={e => setRoyaltyValue(validateNumericInput(e.target.value))}
                />
                <span className="royalty-unit">{royaltyValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════ Pick and Pack Section ══════════════════ */}
        <div className="commission-section">
          <h3 className="section-title">Pick and Pack</h3>
          
          {/* Radio Toggle */}
          <div className="commission-toggle-container">
            <label className={`commission-toggle-option ${pickAndPackType === 'slab' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={pickAndPackType === 'slab'}
                onChange={() => setPickAndPackType('slab')}
              />
              <span>Slab based Commission</span>
            </label>
            <label className={`commission-toggle-option ${pickAndPackType === 'none' ? 'active' : ''}`}>
              <input
                type="radio"
                checked={pickAndPackType === 'none'}
                onChange={() => setPickAndPackType('none')}
              />
              <span>None</span>
            </label>
          </div>

          {/* Slab Based Table */}
          {pickAndPackType === 'slab' && (() => {
            const pnpHasSubCat = pickAndPackSlabs.some(s => s.parentCategoryId !== '');
            const pnpHasSubSubCat = pickAndPackSlabs.some(s => s.categoryId !== '');
            const pnpVisibleCategoryFields = pnpHasSubSubCat ? 3 : pnpHasSubCat ? 2 : 1;
            const pnpGridTemplate = `1fr ${pnpVisibleCategoryFields}fr 0.8fr 0.8fr 0.8fr 0.5fr`;
            return (
              <div className="commission-panel">
                {/* Table Header */}
                <div className="commission-table-header" style={{ gridTemplateColumns: pnpGridTemplate }}>
                  <span className="commission-header-label">Brand</span>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                    <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                    {pnpHasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                    {pnpHasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                  </div>
                  <span className="commission-header-label">From</span>
                  <span className="commission-header-label">To</span>
                  <span className="commission-header-label">Pnp Value</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={pickAndPackValueType === 'A'}
                        onChange={e => handlePickAndPackValueTypeChange(e.target.checked ? 'A' : 'P')}
                      />
                      <span className="slider" />
                    </label>
                    <span>Rs</span>
                  </div>
                </div>

                {/* Table Rows */}
                {pickAndPackSlabs.map((slab, index) => (
                  <div key={index} className="commission-table-row" style={{ gridTemplateColumns: pnpGridTemplate }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={slab.brand} onChange={e => updatePickAndPackSlab(index, 'brand', e.target.value)}>
                      <option value="">All Brands</option>
                      {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: '1 1 0', minWidth: 0 }}>
                        <select className="commission-dropdown" style={{ width: '100%' }} value={slab.parentCategoryId} onChange={e => updatePickAndPackSlab(index, 'parentCategoryId', e.target.value)}>
                          <option value="">All Categories</option>
                          {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                      </div>
                      {pnpHasSubCat && (
                        <div style={{ flex: '1 1 0', minWidth: 0 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.categoryId} onChange={e => updatePickAndPackSlab(index, 'categoryId', e.target.value)} disabled={!slab.parentCategoryId}>
                            <option value="">All Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.parentCategoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                      {pnpHasSubSubCat && (
                        <div style={{ flex: '1 1 0', minWidth: 0 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.subCategoryId} onChange={e => updatePickAndPackSlab(index, 'subCategoryId', e.target.value)} disabled={!slab.categoryId}>
                            <option value="">All Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.categoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updatePickAndPackSlab(index, 'from', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updatePickAndPackSlab(index, 'to', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.pnpValue} onChange={e => updatePickAndPackSlab(index, 'pnpValue', e.target.value)} />
                    {pickAndPackSlabs.length > 1 ? (
                      <button className="commission-delete-btn" onClick={() => removePickAndPackSlab(index)} type="button">
                        <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                        </svg>
                      </button>
                    ) : <div></div>}
                  </div>
                ))}

                <button className="commission-add-slab" onClick={addPickAndPackSlab} type="button">
                  <span>+</span>
                  <span>Add Slab</span>
                </button>
              </div>
            );
          })()}
        </div>

        <div className="footer-actions">
          <button 
            className="cancel-btn" 
            onClick={() => navigate('/marketplaces')}
            type="button"
          >
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSubmit}
            disabled={loading}
            type="button"
          >
            {loading ? 'Saving...' : 'SAVE'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AddMarketplacePage;

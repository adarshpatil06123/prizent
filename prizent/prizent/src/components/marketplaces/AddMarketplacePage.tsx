import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AddMarketplacePage.css";
import marketplaceService, { CreateMarketplaceRequest, CreateMarketplaceCostRequest } from '../../services/marketplaceService';
import { getCustomFields, saveCustomFieldValue, CustomFieldResponse } from '../../services/customFieldService';
import brandService, { Brand } from '../../services/brandService';
import categoryService from '../../services/categoryService';

interface BrandSlab { from: string; to: string; value: string; valueType: 'P' | 'A'; }
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
    enabled: false
  });
  
  // Cost slabs state
  const [productCostSlabs, setProductCostSlabs] = useState([{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A' }]);
  const [marketingSlabs, setMarketingSlabs] = useState([{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A' }]);
  const [shippingSlabs, setShippingSlabs] = useState([{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A' }]);
  
  // NEW: Weight-based shipping state
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([{ weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  
  // NEW: Simple fee sections
  const [shippingPercentage, setShippingPercentage] = useState({ local: '0', zonal: '0', national: '0' });
  const [fixedFeeSlabs, setFixedFeeSlabs] = useState<FixedFeeSlab[]>([{ aspFrom: '0', aspTo: '0', fee: '0' }]);
  const [reverseShippingCost, setReverseShippingCost] = useState('0');
  const [collectionFee, setCollectionFee] = useState({ prepaid: '0', postpaid: '0' });
  const [royalty, setRoyalty] = useState('0');
  const [pickAndPack, setPickAndPack] = useState('0');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productCostValueType, setProductCostValueType] = useState<'P' | 'A'>('A');
  const [marketingValueType, setMarketingValueType] = useState<'P' | 'A'>('A');
  const [shippingValueType, setShippingValueType] = useState<'P' | 'A'>('A');
  const [customFields, setCustomFields] = useState<CustomFieldResponse[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: number]: string }>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brandMappings, setBrandMappings] = useState<BrandMapping[]>([]);

  // NEW: Commission/Marketing filters
  const [commissionFilters, setCommissionFilters] = useState({ brandId: '', categoryId: '', gender: '', none: false });
  const [marketingFilters, setMarketingFilters] = useState({ brandId: '', categoryId: '', gender: '', none: false });
  const [fixedFeeFilters, setFixedFeeFilters] = useState({ brandId: '', categoryId: '', subCategoryId: '', gender: '' });
  const [fixedFeeValueType, setFixedFeeValueType] = useState<'P' | 'A'>('A');
  const [fixedFeeType, setFixedFeeType] = useState<'flat' | 'gt' | 'none'>('gt');
  
  // Reverse Shipping Cost states
  const [reverseShippingType, setReverseShippingType] = useState<'flat' | 'weight' | 'none'>('weight');
  const [reverseShippingValues, setReverseShippingValues] = useState({ grossUnitScale: '0', cr: '0', rto: '0', netUnitScale: '0' });
  const [reverseWeightSlabs, setReverseWeightSlabs] = useState<WeightSlab[]>([{ weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  const [reverseWeightValueType, setReverseWeightValueType] = useState<'P' | 'A'>('A');

  // Collection Fee states
  const [collectionFeeType, setCollectionFeeType] = useState<'value' | 'none'>('value');
  const [collectionFeeSlabs, setCollectionFeeSlabs] = useState<CollectionFeeSlab[]>([{ orderValueFrom: '0', orderValueTo: '0', prepaid: '0', postpaid: '0' }]);
  const [prepaidValueType, setPrepaidValueType] = useState<'P' | 'A'>('A');
  const [postpaidValueType, setPostpaidValueType] = useState<'P' | 'A'>('A');

  // Royalty states
  const [royaltyType, setRoyaltyType] = useState<'flat' | 'none'>('flat');
  const [royaltyValue, setRoyaltyValue] = useState('0');
  const [royaltyValueType, setRoyaltyValueType] = useState<'P' | 'A'>('A');

  // Update all existing slabs when value type toggle changes
  const handleProductCostValueTypeChange = (newType: 'P' | 'A') => {
    setProductCostValueType(newType);
    setProductCostSlabs(prev => prev.map(slab => ({ ...slab, valueType: newType })));
  };

  const handleMarketingValueTypeChange = (newType: 'P' | 'A') => {
    setMarketingValueType(newType);
    setMarketingSlabs(prev => prev.map(slab => ({ ...slab, valueType: newType })));
  };

  const handleShippingValueTypeChange = (newType: 'P' | 'A') => {
    setShippingValueType(newType);
    setShippingSlabs(prev => prev.map(slab => ({ ...slab, valueType: newType })));
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
      commissionSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A' }],
      marketingSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A' }],
      shippingSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A' }],
      commissionValueType: 'A',
      marketingValueType: 'A',
      shippingValueType: 'A',
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
    setProductCostSlabs(prev => [...prev, { from: '0', to: '0', value: '0', valueType: productCostValueType }]);
  };

  const removeProductCostSlab = (index: number) => {
    if (productCostSlabs.length > 1) {
      setProductCostSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateProductCostSlab = (index: number, field: string, value: string) => {
    const validatedValue = field !== 'valueType' ? validateNumericInput(value) : value;
    setProductCostSlabs(prev => prev.map((slab, i) => 
      i === index ? { ...slab, [field]: validatedValue } : slab
    ));
  };

  const addMarketingSlab = () => {
    setMarketingSlabs(prev => [...prev, { from: '0', to: '0', value: '0', valueType: marketingValueType }]);
  };

  const removeMarketingSlab = (index: number) => {
    if (marketingSlabs.length > 1) {
      setMarketingSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateMarketingSlab = (index: number, field: string, value: string) => {
    const validatedValue = field !== 'valueType' ? validateNumericInput(value) : value;
    setMarketingSlabs(prev => prev.map((slab, i) => 
      i === index ? { ...slab, [field]: validatedValue } : slab
    ));
  };

  const addShippingSlab = () => {
    setShippingSlabs(prev => [...prev, { from: '0', to: '0', value: '0', valueType: shippingValueType }]);
  };

  const removeShippingSlab = (index: number) => {
    if (shippingSlabs.length > 1) {
      setShippingSlabs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateShippingSlab = (index: number, field: string, value: string) => {
    const validatedValue = field !== 'valueType' ? validateNumericInput(value) : value;
    setShippingSlabs(prev => prev.map((slab, i) => 
      i === index ? { ...slab, [field]: validatedValue } : slab
    ));
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

  const handleCollectionFeeChange = (field: 'prepaid' | 'postpaid', value: string) => {
    setCollectionFee(prev => ({ ...prev, [field]: validateNumericInput(value) }));
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
      const validateSlabs = (slabs: typeof productCostSlabs, name: string): string | null => {
        for (const slab of slabs) {
          if (slab.from || slab.to || slab.value) {
            if (!slab.from || !slab.to || !slab.value) {
              return `${name}: All fields (From, To, Value) are required for each slab`;
            }
            const fromVal = parseFloat(slab.from);
            const toVal = parseFloat(slab.to);
            if (fromVal >= toVal) {
              return `${name}: "From cost" must be less than "To cost"`;
            }
            if (parseFloat(slab.value) <= 0) {
              return `${name}: Value must be greater than 0`;
            }
          }
        }
        return null;
      };

      const commissionError = validateSlabs(productCostSlabs, 'Commission');
      if (commissionError) {
        setError(commissionError);
        setLoading(false);
        return;
      }

      const marketingError = validateSlabs(marketingSlabs, 'Marketing');
      if (marketingError) {
        setError(marketingError);
        setLoading(false);
        return;
      }

      const shippingError = validateSlabs(shippingSlabs, 'Shipping');
      if (shippingError) {
        setError(shippingError);
        setLoading(false);
        return;
      }
      
      // Prepare cost data
      const costs: CreateMarketplaceCostRequest[] = [];
      
      // Add product cost slabs
      productCostSlabs.forEach((slab) => {
        if (parseFloat(slab.to) > parseFloat(slab.from) && parseFloat(slab.value) > 0) {
          costs.push({
            costCategory: 'COMMISSION',
            costValueType: slab.valueType,
            costValue: parseFloat(slab.value),
            costProductRange: `${slab.from}-${slab.to}`
          });
        }
      });
      
      // Add marketing slabs
      marketingSlabs.forEach((slab) => {
        if (parseFloat(slab.to) > parseFloat(slab.from) && parseFloat(slab.value) > 0) {
          costs.push({
            costCategory: 'MARKETING',
            costValueType: slab.valueType,
            costValue: parseFloat(slab.value),
            costProductRange: `${slab.from}-${slab.to}`
          });
        }
      });
      
      // Add shipping slabs
      shippingSlabs.forEach((slab) => {
        if (parseFloat(slab.to) > parseFloat(slab.from) && parseFloat(slab.value) > 0) {
          costs.push({
            costCategory: 'SHIPPING',
            costValueType: slab.valueType,
            costValue: parseFloat(slab.value),
            costProductRange: `${slab.from}-${slab.to}`
          });
        }
      });
      
      // ══════════ NEW: Add weight-based shipping ══════════
      weightSlabs.forEach((slab) => {
        if (parseFloat(slab.weightTo) > parseFloat(slab.weightFrom)) {
          if (parseFloat(slab.local) > 0) {
            costs.push({
              costCategory: 'WEIGHT_SHIPPING_LOCAL' as any,
              costValueType: 'A',
              costValue: parseFloat(slab.local),
              costProductRange: `${slab.weightFrom}-${slab.weightTo}kg`
            });
          }
          if (parseFloat(slab.zonal) > 0) {
            costs.push({
              costCategory: 'WEIGHT_SHIPPING_ZONAL' as any,
              costValueType: 'A',
              costValue: parseFloat(slab.zonal),
              costProductRange: `${slab.weightFrom}-${slab.weightTo}kg`
            });
          }
          if (parseFloat(slab.national) > 0) {
            costs.push({
              costCategory: 'WEIGHT_SHIPPING_NATIONAL' as any,
              costValueType: 'A',
              costValue: parseFloat(slab.national),
              costProductRange: `${slab.weightFrom}-${slab.weightTo}kg`
            });
          }
        }
      });

      // ══════════ NEW: Add shipping percentage ══════════
      if (parseFloat(shippingPercentage.local) > 0) {
        costs.push({
          costCategory: 'SHIPPING_PERCENTAGE_LOCAL' as any,
          costValueType: 'P',
          costValue: parseFloat(shippingPercentage.local),
          costProductRange: 'local'
        });
      }
      if (parseFloat(shippingPercentage.zonal) > 0) {
        costs.push({
          costCategory: 'SHIPPING_PERCENTAGE_ZONAL' as any,
          costValueType: 'P',
          costValue: parseFloat(shippingPercentage.zonal),
          costProductRange: 'zonal'
        });
      }
      if (parseFloat(shippingPercentage.national) > 0) {
        costs.push({
          costCategory: 'SHIPPING_PERCENTAGE_NATIONAL' as any,
          costValueType: 'P',
          costValue: parseFloat(shippingPercentage.national),
          costProductRange: 'national'
        });
      }

      // ══════════ NEW: Add fixed fee slabs ══════════
      fixedFeeSlabs.forEach((slab) => {
        if (parseFloat(slab.aspTo) > parseFloat(slab.aspFrom) && parseFloat(slab.fee) > 0) {
          costs.push({
            costCategory: 'FIXED_FEE' as any,
            costValueType: 'A',
            costValue: parseFloat(slab.fee),
            costProductRange: `${slab.aspFrom}-${slab.aspTo}`
          });
        }
      });

      // ══════════ NEW: Add reverse shipping cost ══════════
      if (parseFloat(reverseShippingCost) > 0) {
        costs.push({
          costCategory: 'REVERSE_SHIPPING' as any,
          costValueType: 'A',
          costValue: parseFloat(reverseShippingCost),
          costProductRange: 'flat'
        });
      }

      // ══════════ NEW: Add collection fee ══════════
      if (parseFloat(collectionFee.prepaid) > 0) {
        costs.push({
          costCategory: 'COLLECTION_FEE_PREPAID' as any,
          costValueType: 'P',
          costValue: parseFloat(collectionFee.prepaid),
          costProductRange: 'prepaid'
        });
      }
      if (parseFloat(collectionFee.postpaid) > 0) {
        costs.push({
          costCategory: 'COLLECTION_FEE_POSTPAID' as any,
          costValueType: 'P',
          costValue: parseFloat(collectionFee.postpaid),
          costProductRange: 'postpaid'
        });
      }

      // ══════════ NEW: Add royalty ══════════
      if (parseFloat(royalty) > 0) {
        costs.push({
          costCategory: 'ROYALTY' as any,
          costValueType: 'P',
          costValue: parseFloat(royalty),
          costProductRange: 'flat'
        });
      }

      // ══════════ NEW: Add pick and pack ══════════
      if (parseFloat(pickAndPack) > 0) {
        costs.push({
          costCategory: 'PICK_AND_PACK' as any,
          costValueType: 'A',
          costValue: parseFloat(pickAndPack),
          costProductRange: 'flat'
        });
      }
      
      const request: CreateMarketplaceRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        enabled: formData.enabled,
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

        // Save brand mappings
        if (response.marketplace) {
          try {
            const mappingRequests = brandMappings
              .filter(m => m.brandId)
              .map(m => {
                const costs: any[] = [];
                m.commissionSlabs.forEach(s => { if (parseFloat(s.to) > parseFloat(s.from) && parseFloat(s.value) > 0) costs.push({ costCategory: 'COMMISSION', costValueType: s.valueType, costValue: parseFloat(s.value), costProductRange: `${s.from}-${s.to}` }); });
                m.marketingSlabs.forEach(s => { if (parseFloat(s.to) > parseFloat(s.from) && parseFloat(s.value) > 0) costs.push({ costCategory: 'MARKETING', costValueType: s.valueType, costValue: parseFloat(s.value), costProductRange: `${s.from}-${s.to}` }); });
                m.shippingSlabs.forEach(s => { if (parseFloat(s.to) > parseFloat(s.from) && parseFloat(s.value) > 0) costs.push({ costCategory: 'SHIPPING', costValueType: s.valueType, costValue: parseFloat(s.value), costProductRange: `${s.from}-${s.to}` }); });
                return { brandId: Number(m.brandId), costs };
              });
            await marketplaceService.saveBrandMappings(response.marketplace.id, mappingRequests);
          } catch (brandError: any) {
            const msg = brandError?.response?.data?.message || brandError?.message || 'Failed to save brand mappings';
            console.error('Error saving brand mappings:', msg, brandError);
            setError(`Marketplace created but brand mappings failed: ${msg}`);
            setLoading(false);
            return;
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

        <div className="details-card">
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
            <label className="field-label">Description</label>
            <input 
              className="text-input" 
              placeholder="description" 
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
          <label className="activate-row">
            <input 
              type="checkbox" 
              checked={formData.enabled}
              onChange={(e) => handleInputChange('enabled', e.target.checked)}
            />
            <span>Activate marketplace</span>
          </label>
        </div>

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <div className="panel" style={{ marginTop: '32px' }}>
            <h3 className="panel-title">Custom Fields</h3>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {customFields.map((field) => (
                <div key={field.id} className="form-field">
                  <label className="field-label">{field.name}{field.required ? ' *' : ''}</label>
                  {field.fieldType === 'text' || field.fieldType === 'numeric' ? (
                    <input
                      type={field.fieldType === 'numeric' ? 'number' : 'text'}
                      placeholder={field.name + (field.required ? ' *' : '')}
                      className="form-input"
                      value={customFieldValues[field.id] || ''}
                      onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                      required={field.required}
                      disabled={loading}
                    />
                  ) : field.fieldType === 'dropdown' && field.dropdownOptions ? (
                    <select
                      className="form-select"
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

          {/* Commission Table */}
          <div className="commission-panel">
            {/* Table Header */}
            <div className="commission-table-header">
              <span className="commission-header-label">Brand</span>
              <span className="commission-header-label">Category</span>
              <span className="commission-header-label">Sub Category</span>
              <span className="commission-header-label">Gender</span>
              <span className="commission-header-label">From</span>
              <span className="commission-header-label">To</span>
              <span className="commission-header-label">Value</span>
              <div className="commission-value-toggle">
                <span>%</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={productCostValueType === 'A'}
                    onChange={e => handleProductCostValueTypeChange(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>

            {/* Table Rows */}
            {productCostSlabs.map((slab, i) => (
              <div key={i} className="commission-table-row">
                <select className="commission-dropdown" value={commissionFilters.brandId} onChange={e => setCommissionFilters(prev => ({ ...prev, brandId: e.target.value }))}>
                  <option value="">Ivon</option>
                  {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                <select className="commission-dropdown" value={commissionFilters.categoryId} onChange={e => setCommissionFilters(prev => ({ ...prev, categoryId: e.target.value }))}>
                  <option value="">Bottom Wear</option>
                  {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <select className="commission-dropdown">
                  <option value="">Jeans</option>
                </select>
                <select className="commission-dropdown" value={commissionFilters.gender} onChange={e => setCommissionFilters(prev => ({ ...prev, gender: e.target.value }))}>
                  <option value="">Female</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unisex">Unisex</option>
                </select>
                <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updateProductCostSlab(i, 'from', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updateProductCostSlab(i, 'to', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateProductCostSlab(i, 'value', e.target.value)} />
                {productCostSlabs.length > 1 ? (
                  <button className="commission-delete-btn" onClick={() => removeProductCostSlab(i)} type="button">🗑️</button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Slab Button */}
            <button className="commission-add-slab" onClick={addProductCostSlab} type="button">
              <span>+</span>
              <span>Add Slab</span>
            </button>
          </div>
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

          {/* Marketing Table */}
          <div className="commission-panel">
            {/* Table Header */}
            <div className="commission-table-header">
              <span className="commission-header-label">Brand</span>
              <span className="commission-header-label">Category</span>
              <span className="commission-header-label">Sub Category</span>
              <span className="commission-header-label">Gender</span>
              <span className="commission-header-label">From</span>
              <span className="commission-header-label">To</span>
              <span className="commission-header-label">Contri</span>
              <div className="commission-value-toggle">
                <span>%</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={marketingValueType === 'A'}
                    onChange={e => handleMarketingValueTypeChange(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>

            {/* Table Rows */}
            {marketingSlabs.map((slab, i) => (
              <div key={i} className="commission-table-row">
                <select className="commission-dropdown" value={marketingFilters.brandId} onChange={e => setMarketingFilters(prev => ({ ...prev, brandId: e.target.value }))}>
                  <option value="">Ivon</option>
                  {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                <select className="commission-dropdown" value={marketingFilters.categoryId} onChange={e => setMarketingFilters(prev => ({ ...prev, categoryId: e.target.value }))}>
                  <option value="">Bottom Wear</option>
                  {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <select className="commission-dropdown">
                  <option value="">Jeans</option>
                </select>
                <select className="commission-dropdown" value={marketingFilters.gender} onChange={e => setMarketingFilters(prev => ({ ...prev, gender: e.target.value }))}>
                  <option value="">Female</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unisex">Unisex</option>
                </select>
                <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updateMarketingSlab(i, 'from', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updateMarketingSlab(i, 'to', e.target.value)} />
                <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateMarketingSlab(i, 'value', e.target.value)} />
                {marketingSlabs.length > 1 ? (
                  <button className="commission-delete-btn" onClick={() => removeMarketingSlab(i)} type="button">🗑️</button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Slab Button */}
            <button className="commission-add-slab" onClick={addMarketingSlab} type="button">
              <span>+</span>
              <span>Add Slab</span>
            </button>
          </div>
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
              />
              <span className="commission-radio-label">GT based</span>
            </label>
            <label className="commission-radio-option">
              <input
                type="radio"
                name="shippingType"
                value="none"
              />
              <span className="commission-radio-label">None</span>
            </label>
          </div>

          {/* Shipping Table - Weight Based */}
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
                    checked={shippingValueType === 'A'}
                    onChange={e => handleShippingValueTypeChange(e.target.checked ? 'A' : 'P')}
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
                  <button className="commission-delete-btn" onClick={() => removeWeightSlab(i)} type="button">🗑️</button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Weight Slab Button */}
            <button className="commission-add-slab" onClick={addWeightSlab} type="button">
              <span>+</span>
              <span>Add Weight Slab</span>
            </button>
          </div>
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
              <button className="commission-delete-btn" type="button">🗑️</button>
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

          {/* Fixed Fee Table */}
          <div className="commission-panel">
            {/* Table Header */}
            <div className="commission-table-header" style={{ gridTemplateColumns: '1fr 1.2fr 1.2fr 1fr 0.9fr 0.9fr 0.9fr 1fr' }}>
              <span className="commission-header-label">Brand</span>
              <span className="commission-header-label">Category</span>
              <span className="commission-header-label">Sub Category</span>
              <span className="commission-header-label">Gender</span>
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
              <div key={i} className="commission-table-row" style={{ gridTemplateColumns: '1fr 1.2fr 1.2fr 1fr 0.9fr 0.9fr 0.9fr 1fr' }}>
                <select className="commission-dropdown" value={fixedFeeFilters.brandId} onChange={e => setFixedFeeFilters(prev => ({ ...prev, brandId: e.target.value }))}>
                  <option value="">Ivon</option>
                  {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                <select className="commission-dropdown" value={fixedFeeFilters.categoryId} onChange={e => setFixedFeeFilters(prev => ({ ...prev, categoryId: e.target.value }))}>
                  <option value="">Bottom Wear</option>
                  {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <select className="commission-dropdown" value={fixedFeeFilters.subCategoryId} onChange={e => setFixedFeeFilters(prev => ({ ...prev, subCategoryId: e.target.value }))}>
                  <option value="">Jeans</option>
                  {categories.filter(c => c.parentId && c.parentId === parseInt(fixedFeeFilters.categoryId || '0')).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <select className="commission-dropdown" value={fixedFeeFilters.gender} onChange={e => setFixedFeeFilters(prev => ({ ...prev, gender: e.target.value }))}>
                  <option value="">Female</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unisex">Unisex</option>
                </select>
                <input className="commission-input" placeholder="500" value={slab.aspFrom} onChange={e => updateFixedFeeSlab(i, 'aspFrom', e.target.value)} />
                <input className="commission-input" placeholder="500" value={slab.aspTo} onChange={e => updateFixedFeeSlab(i, 'aspTo', e.target.value)} />
                <input className="commission-input" placeholder="500" value={slab.fee} onChange={e => updateFixedFeeSlab(i, 'fee', e.target.value)} />
                {fixedFeeSlabs.length > 1 ? (
                  <button className="commission-delete-btn" onClick={() => removeFixedFeeSlab(i)} type="button">🗑️</button>
                ) : <div></div>}
              </div>
            ))}

            {/* Add Slab Button */}
            <button className="commission-add-slab" onClick={addFixedFeeSlab} type="button">
              <span>+</span>
              <span>Add Slab</span>
            </button>
          </div>
        </div>

        {/* ══════════════════ Reverse Shipping Cost Section ══════════════════ */}
        <div className="commission-section">
          <h3>Reverse Shipping Cost</h3>
          
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

          {/* Flat Based Panel - 4 Input Fields */}
          {reverseShippingType === 'flat' && (
            <div className="reverse-shipping-flat-panel">
              <div className="reverse-shipping-field">
                <label>Gross Unit Scale:</label>
                <input 
                  type="text" 
                  placeholder="5" 
                  value={reverseShippingValues.grossUnitScale}
                  onChange={e => setReverseShippingValues(prev => ({ ...prev, grossUnitScale: validateNumericInput(e.target.value) }))}
                />
              </div>
              <div className="reverse-shipping-field">
                <label>CR%:</label>
                <input 
                  type="text" 
                  placeholder="5" 
                  value={reverseShippingValues.cr}
                  onChange={e => setReverseShippingValues(prev => ({ ...prev, cr: validateNumericInput(e.target.value) }))}
                />
              </div>
              <div className="reverse-shipping-field">
                <label>RTO%:</label>
                <input 
                  type="text" 
                  placeholder="5" 
                  value={reverseShippingValues.rto}
                  onChange={e => setReverseShippingValues(prev => ({ ...prev, rto: validateNumericInput(e.target.value) }))}
                />
              </div>
              <div className="reverse-shipping-field">
                <label>NET Unit Scale:</label>
                <input 
                  type="text" 
                  placeholder="5" 
                  value={reverseShippingValues.netUnitScale}
                  onChange={e => setReverseShippingValues(prev => ({ ...prev, netUnitScale: validateNumericInput(e.target.value) }))}
                />
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
                  <span className={reverseWeightValueType === 'P' ? 'active' : ''} onClick={() => handleReverseWeightValueTypeChange('P')}>%</span>
                  <div className="toggle-slider" style={{ left: reverseWeightValueType === 'A' ? '50%' : '0%' }}></div>
                  <span className={reverseWeightValueType === 'A' ? 'active' : ''} onClick={() => handleReverseWeightValueTypeChange('A')}>Rs</span>
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
                    <button className="commission-delete-btn" onClick={() => removeReverseWeightSlab(i)} type="button">🗑️</button>
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
          <h3>Collection Fee</h3>
          
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
                <span>Prepaid</span>
                <div className="commission-value-toggle">
                  <span className={prepaidValueType === 'P' ? 'active' : ''} onClick={() => handlePrepaidValueTypeChange('P')}>%</span>
                  <div className="toggle-slider" style={{ left: prepaidValueType === 'A' ? '50%' : '0%' }}></div>
                  <span className={prepaidValueType === 'A' ? 'active' : ''} onClick={() => handlePrepaidValueTypeChange('A')}>Rs</span>
                </div>
                <span>Postpaid</span>
                <div className="commission-value-toggle">
                  <span className={postpaidValueType === 'P' ? 'active' : ''} onClick={() => handlePostpaidValueTypeChange('P')}>%</span>
                  <div className="toggle-slider" style={{ left: postpaidValueType === 'A' ? '50%' : '0%' }}></div>
                  <span className={postpaidValueType === 'A' ? 'active' : ''} onClick={() => handlePostpaidValueTypeChange('A')}>Rs</span>
                </div>
              </div>

              {/* Table Rows */}
              {collectionFeeSlabs.map((slab, i) => (
                <div className="collection-fee-table-row" key={i}>
                  <input className="commission-input" placeholder="500" value={slab.orderValueFrom} onChange={e => updateCollectionFeeSlab(i, 'orderValueFrom', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.orderValueTo} onChange={e => updateCollectionFeeSlab(i, 'orderValueTo', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.prepaid} onChange={e => updateCollectionFeeSlab(i, 'prepaid', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.postpaid} onChange={e => updateCollectionFeeSlab(i, 'postpaid', e.target.value)} />
                  <div className="commission-delete-cell">
                    <button className="commission-delete-btn" onClick={() => removeCollectionFeeSlab(i)} type="button">🗑️</button>
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
          <h3>Royalty</h3>
          
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
                <div className="commission-value-toggle">
                  <span className={royaltyValueType === 'P' ? 'active' : ''} onClick={() => setRoyaltyValueType('P')}>%</span>
                  <div className="toggle-slider" style={{ left: royaltyValueType === 'A' ? '50%' : '0%' }}></div>
                  <span className={royaltyValueType === 'A' ? 'active' : ''} onClick={() => setRoyaltyValueType('A')}>Rs</span>
                </div>
              </div>
              <label className="royalty-label">Value :</label>
              <input 
                className="royalty-input" 
                type="text" 
                placeholder="5" 
                value={royaltyValue}
                onChange={e => setRoyaltyValue(validateNumericInput(e.target.value))}
              />
              <span className="royalty-unit">Rs</span>
            </div>
          )}
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

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AddMarketplacePage.css";
import marketplaceService, { UpdateMarketplaceRequest, UpdateMarketplaceCostRequest } from '../../services/marketplaceService';
import { getCustomFields, saveCustomFieldValue, getCustomFieldValues, CustomFieldResponse } from '../../services/customFieldService';
import brandService, { Brand } from '../../services/brandService';
import categoryService from '../../services/categoryService';

interface BrandSlab { from: string; to: string; value: string; valueType: 'P' | 'A'; brandId: string; parentCategoryId: string; categoryId: string; subCategoryId: string; }
interface WeightSlab { weightFrom: string; weightTo: string; local: string; zonal: string; national: string; value: string; }
interface FixedFeeSlab { aspFrom: string; aspTo: string; fee: string; }
interface CollectionFeeSlab { orderValueFrom: string; orderValueTo: string; prepaid: string; postpaid: string; }
interface PickAndPackSlab { brand: string; parentCategoryId: string; categoryId: string; subCategoryId: string; from: string; to: string; pnpValue: string; }
interface BrandMapping {
  localId: string; brandId: string;
  commissionSlabs: BrandSlab[]; marketingSlabs: BrandSlab[]; shippingSlabs: BrandSlab[];
  commissionValueType: 'P' | 'A'; marketingValueType: 'P' | 'A'; shippingValueType: 'P' | 'A';
}

const resolveCategoryLevel = (
  catId: number | undefined,
  categories: any[]
): { parentCategoryId: string; categoryId: string; subCategoryId: string } => {
  if (!catId) return { parentCategoryId: '', categoryId: '', subCategoryId: '' };
  const cat = categories.find(c => c.id === catId);
  if (!cat) return { parentCategoryId: '', categoryId: '', subCategoryId: '' };
  if (cat.parentCategoryId === null) return { parentCategoryId: String(catId), categoryId: '', subCategoryId: '' };
  const parent = categories.find(c => c.id === cat.parentCategoryId);
  if (!parent) return { parentCategoryId: String(catId), categoryId: '', subCategoryId: '' };
  if (parent.parentCategoryId === null) return { parentCategoryId: String(parent.id), categoryId: String(catId), subCategoryId: '' };
  return { parentCategoryId: String(parent.parentCategoryId), categoryId: String(parent.id), subCategoryId: String(catId) };
};

const parseRange = (range: string): { from: string; to: string; brandId: string } => {
  const [rangePart, ...extras] = range.split('|');
  const [from, to] = rangePart.split('-');
  let brandId = '';
  for (const extra of extras) { if (extra.startsWith('brand:')) brandId = extra.replace('brand:', ''); }
  return { from: from || '0', to: to || '0', brandId };
};

const EditMarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [formData, setFormData] = useState({ name: '', description: '', accNo: '', enabled: false });

  const [productCostValueType, setProductCostValueType] = useState<'P' | 'A'>('A');
  const [commissionFlatValue, setCommissionFlatValue] = useState('0');
  const [commissionFlatValueType, setCommissionFlatValueType] = useState<'P' | 'A'>('A');
  const [commissionSlabValueType, setCommissionSlabValueType] = useState<'P' | 'A'>('A');
  const [productCostSlabs, setProductCostSlabs] = useState([{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);

  const [marketingValueType, setMarketingValueType] = useState<'P' | 'A'>('A');
  const [marketingFilters, setMarketingFilters] = useState({ brandId: '', categoryId: '', none: false });
  const [marketingFlatValue, setMarketingFlatValue] = useState('0');
  const [marketingFlatValueType, setMarketingFlatValueType] = useState<'P' | 'A'>('A');
  const [marketingSlabValueType, setMarketingSlabValueType] = useState<'P' | 'A'>('A');
  const [marketingSlabs, setMarketingSlabs] = useState([{ from: '0', to: '0', value: '0', valueType: 'A' as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);

  const [shippingValueType, setShippingValueType] = useState<'A' | 'P' | 'gt' | 'none'>('none');
  const [shippingFlatValue, setShippingFlatValue] = useState('0');
  const [shippingFlatValueType, setShippingFlatValueType] = useState<'P' | 'A'>('A');
  const [shippingSlabValueType, setShippingSlabValueType] = useState<'P' | 'A'>('A');
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([{ weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);

  const [shippingPercentage, setShippingPercentage] = useState({ local: '0', zonal: '0', national: '0' });

  const [fixedFeeType, setFixedFeeType] = useState<'flat' | 'gt' | 'none'>('none');
  const [fixedFeeFlatValue, setFixedFeeFlatValue] = useState('0');
  const [fixedFeeFlatValueType, setFixedFeeFlatValueType] = useState<'P' | 'A'>('A');
  const [fixedFeeValueType, setFixedFeeValueType] = useState<'P' | 'A'>('A');
  const [fixedFeeFilters, setFixedFeeFilters] = useState({ brandId: '', categoryId: '', subCategoryId: '', subSubCategoryId: '' });
  const [fixedFeeSlabs, setFixedFeeSlabs] = useState<FixedFeeSlab[]>([{ aspFrom: '0', aspTo: '0', fee: '0' }]);

  const [reverseShippingType, setReverseShippingType] = useState<'flat' | 'weight' | 'none'>('none');
  const [reverseShippingFlatValue, setReverseShippingFlatValue] = useState('0');
  const [reverseShippingFlatValueType, setReverseShippingFlatValueType] = useState<'P' | 'A'>('A');
  const [reverseWeightValueType, setReverseWeightValueType] = useState<'P' | 'A'>('A');
  const [reverseWeightSlabs, setReverseWeightSlabs] = useState<WeightSlab[]>([{ weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);

  const [collectionFeeType, setCollectionFeeType] = useState<'value' | 'none'>('none');
  const [prepaidValueType, setPrepaidValueType] = useState<'P' | 'A'>('A');
  const [postpaidValueType, setPostpaidValueType] = useState<'P' | 'A'>('A');
  const [collectionFeeSlabs, setCollectionFeeSlabs] = useState<CollectionFeeSlab[]>([{ orderValueFrom: '0', orderValueTo: '0', prepaid: '0', postpaid: '0' }]);

  const [royaltyType, setRoyaltyType] = useState<'flat' | 'none'>('none');
  const [royaltyValue, setRoyaltyValue] = useState('0');
  const [royaltyValueType, setRoyaltyValueType] = useState<'P' | 'A'>('A');

  const [pickAndPackType, setPickAndPackType] = useState<'slab' | 'none'>('none');
  const [pickAndPackValueType, setPickAndPackValueType] = useState<'P' | 'A'>('A');
  const [pickAndPackSlabs, setPickAndPackSlabs] = useState<PickAndPackSlab[]>([{ brand: '', parentCategoryId: '', categoryId: '', subCategoryId: '', from: '0', to: '0', pnpValue: '0' }]);

  const [loading, setLoading] = useState(false);
  const [loadingMarketplace, setLoadingMarketplace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldResponse[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: number]: string }>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brandMappings, setBrandMappings] = useState<BrandMapping[]>([]);

  const validateNumericInput = (value: string): string =>
    value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

  const handleInputChange = (field: string, value: string | boolean) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    brandService.getAllBrands().then(res => {
      if (res.success && res.brands) setBrands(res.brands.filter(b => b.enabled));
    }).catch(e => console.error('Failed to fetch brands:', e));
    categoryService.getAllCategories().then(res => {
      if (res.success && res.categories) setCategories(res.categories.filter((c: any) => c.enabled));
    }).catch(e => console.error('Failed to fetch categories:', e));
    getCustomFields('m').then(fields => setCustomFields(fields.filter(f => f.enabled)))
      .catch(e => console.error('Failed to fetch custom fields:', e));
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchMarketplace = async () => {
      try {
        setLoadingMarketplace(true);
        const [mpRes, catRes] = await Promise.all([
          marketplaceService.getMarketplaceById(Number(id)),
          categoryService.getAllCategories(),
        ]);
        const allCats = catRes.success && catRes.categories ? catRes.categories.filter((c: any) => c.enabled) : [];

        if (mpRes.success && mpRes.marketplace) {
          const mp = mpRes.marketplace;
          setFormData({ name: mp.name || '', description: mp.description || '', accNo: (mp as any).accNo || '', enabled: mp.enabled || false });
          const costs = mp.costs || [];

          // Commission
          const commCosts = costs.filter(c => c.costCategory === 'COMMISSION');
          if (commCosts.length > 0) {
            if (commCosts[0].costProductRange === 'flat') {
              setProductCostValueType('A');
              setCommissionFlatValue(String(commCosts[0].costValue));
              setCommissionFlatValueType(commCosts[0].costValueType);
            } else {
              setProductCostValueType('P');
              setCommissionSlabValueType(commCosts[0].costValueType);
              setProductCostSlabs(commCosts.map(c => {
                const { from, to } = parseRange(c.costProductRange);
                const cat = resolveCategoryLevel(c.categoryId, allCats);
                return { from, to, value: String(c.costValue), valueType: c.costValueType, brandId: c.brandId ? String(c.brandId) : '', ...cat };
              }));
            }
          }

          // Marketing
          const mktCosts = costs.filter(c => c.costCategory === 'MARKETING');
          if (mktCosts.length === 0) {
            setMarketingFilters(prev => ({ ...prev, none: true }));
          } else if (mktCosts[0].costProductRange === 'flat') {
            setMarketingValueType('A');
            setMarketingFlatValue(String(mktCosts[0].costValue));
            setMarketingFlatValueType(mktCosts[0].costValueType);
          } else {
            setMarketingValueType('P');
            setMarketingSlabValueType(mktCosts[0].costValueType);
            setMarketingSlabs(mktCosts.map(c => {
              const { from, to } = parseRange(c.costProductRange);
              const cat = resolveCategoryLevel(c.categoryId, allCats);
              return { from, to, value: String(c.costValue), valueType: c.costValueType, brandId: c.brandId ? String(c.brandId) : '', ...cat };
            }));
          }

          // Shipping flat
          const shipFlat = costs.find(c => c.costCategory === 'SHIPPING' && c.costProductRange === 'flat');
          if (shipFlat) { setShippingValueType('A'); setShippingFlatValue(String(shipFlat.costValue)); setShippingFlatValueType(shipFlat.costValueType); }

          // Shipping weight
          const localSlabs = costs.filter(c => c.costCategory === 'WEIGHT_SHIPPING_LOCAL');
          const zonalSlabs = costs.filter(c => c.costCategory === 'WEIGHT_SHIPPING_ZONAL');
          const nationalSlabs = costs.filter(c => c.costCategory === 'WEIGHT_SHIPPING_NATIONAL');
          const weightValueSlabs = costs.filter(c => c.costCategory === 'WEIGHT_SHIPPING');
          if (localSlabs.length > 0 || zonalSlabs.length > 0 || nationalSlabs.length > 0 || weightValueSlabs.length > 0) {
            setShippingValueType('P');
            setShippingSlabValueType(localSlabs[0]?.costValueType || 'A');
            const rangeMap: { [key: string]: WeightSlab } = {};
            [...localSlabs, ...zonalSlabs, ...nationalSlabs, ...weightValueSlabs].forEach(c => {
              if (!rangeMap[c.costProductRange]) {
                const [wf, wt] = c.costProductRange.replace('kg', '').split('-');
                rangeMap[c.costProductRange] = { weightFrom: wf || '0', weightTo: wt || '0', local: '0', zonal: '0', national: '0', value: '0' };
              }
            });
            localSlabs.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].local = String(c.costValue); });
            zonalSlabs.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].zonal = String(c.costValue); });
            nationalSlabs.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].national = String(c.costValue); });
            weightValueSlabs.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].value = String(c.costValue); });
            const slabs = Object.values(rangeMap);
            if (slabs.length > 0) setWeightSlabs(slabs);
          }

          // Shipping Percentage
          const spLocal = costs.find(c => c.costCategory === 'SHIPPING_PERCENTAGE_LOCAL');
          const spZonal = costs.find(c => c.costCategory === 'SHIPPING_PERCENTAGE_ZONAL');
          const spNational = costs.find(c => c.costCategory === 'SHIPPING_PERCENTAGE_NATIONAL');
          setShippingPercentage({ local: spLocal ? String(spLocal.costValue) : '0', zonal: spZonal ? String(spZonal.costValue) : '0', national: spNational ? String(spNational.costValue) : '0' });

          // Fixed Fee
          const ffCosts = costs.filter(c => c.costCategory === 'FIXED_FEE');
          if (ffCosts.length > 0) {
            if (ffCosts[0].costProductRange === 'flat') {
              setFixedFeeType('flat'); setFixedFeeFlatValue(String(ffCosts[0].costValue)); setFixedFeeFlatValueType(ffCosts[0].costValueType);
            } else {
              setFixedFeeType('gt');
              setFixedFeeValueType(ffCosts[0].costValueType);
              const cat = resolveCategoryLevel(ffCosts[0].categoryId, allCats);
              setFixedFeeFilters({ brandId: ffCosts[0].brandId ? String(ffCosts[0].brandId) : '', categoryId: cat.parentCategoryId, subCategoryId: cat.categoryId, subSubCategoryId: cat.subCategoryId });
              setFixedFeeSlabs(ffCosts.map(c => { const { from, to } = parseRange(c.costProductRange); return { aspFrom: from, aspTo: to, fee: String(c.costValue) }; }));
            }
          }

          // Reverse Shipping
          const rsFlat = costs.find(c => c.costCategory === 'REVERSE_SHIPPING' && c.costProductRange === 'flat');
          if (rsFlat) {
            setReverseShippingType('flat'); setReverseShippingFlatValue(String(rsFlat.costValue)); setReverseShippingFlatValueType(rsFlat.costValueType);
          } else {
            const rsLocal = costs.filter(c => c.costCategory === 'REVERSE_SHIPPING_LOCAL');
            const rsZonal = costs.filter(c => c.costCategory === 'REVERSE_SHIPPING_ZONAL');
            const rsNational = costs.filter(c => c.costCategory === 'REVERSE_SHIPPING_NATIONAL');
            const rsValue = costs.filter(c => c.costCategory === 'REVERSE_WEIGHT_SHIPPING');
            if (rsLocal.length > 0 || rsZonal.length > 0 || rsNational.length > 0 || rsValue.length > 0) {
              setReverseShippingType('weight');
              setReverseWeightValueType(rsLocal[0]?.costValueType || 'A');
              const rangeMap: { [key: string]: WeightSlab } = {};
              [...rsLocal, ...rsZonal, ...rsNational, ...rsValue].forEach(c => {
                if (!rangeMap[c.costProductRange]) {
                  const [wf, wt] = c.costProductRange.replace('kg', '').split('-');
                  rangeMap[c.costProductRange] = { weightFrom: wf || '0', weightTo: wt || '0', local: '0', zonal: '0', national: '0', value: '0' };
                }
              });
              rsLocal.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].local = String(c.costValue); });
              rsZonal.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].zonal = String(c.costValue); });
              rsNational.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].national = String(c.costValue); });
              rsValue.forEach(c => { if (rangeMap[c.costProductRange]) rangeMap[c.costProductRange].value = String(c.costValue); });
              const slabs = Object.values(rangeMap);
              if (slabs.length > 0) setReverseWeightSlabs(slabs);
            }
          }

          // Collection Fee
          const cfPrepaid = costs.filter(c => c.costCategory === 'COLLECTION_FEE_PREPAID');
          const cfPostpaid = costs.filter(c => c.costCategory === 'COLLECTION_FEE_POSTPAID');
          if (cfPrepaid.length > 0 || cfPostpaid.length > 0) {
            setCollectionFeeType('value');
            if (cfPrepaid.length > 0) setPrepaidValueType(cfPrepaid[0].costValueType);
            if (cfPostpaid.length > 0) setPostpaidValueType(cfPostpaid[0].costValueType);
            const rangeKeys = Array.from(new Set([...cfPrepaid, ...cfPostpaid].map(c => c.costProductRange)));
            setCollectionFeeSlabs(rangeKeys.map(rng => {
              const [f, t] = rng.split('-');
              const pre = cfPrepaid.find(c => c.costProductRange === rng);
              const post = cfPostpaid.find(c => c.costProductRange === rng);
              return { orderValueFrom: f || '0', orderValueTo: t || '0', prepaid: pre ? String(pre.costValue) : '0', postpaid: post ? String(post.costValue) : '0' };
            }));
          }

          // Royalty
          const royaltyCost = costs.find(c => c.costCategory === 'ROYALTY');
          if (royaltyCost) { setRoyaltyType('flat'); setRoyaltyValue(String(royaltyCost.costValue)); setRoyaltyValueType(royaltyCost.costValueType); }

          // Pick and Pack
          const pnpCosts = costs.filter(c => c.costCategory === 'PICK_AND_PACK');
          if (pnpCosts.length > 0) {
            setPickAndPackType('slab');
            setPickAndPackValueType(pnpCosts[0].costValueType);
            setPickAndPackSlabs(pnpCosts.map(c => {
              const { from, to } = parseRange(c.costProductRange);
              const cat = resolveCategoryLevel(c.categoryId, allCats);
              return { brand: c.brandId ? String(c.brandId) : '', parentCategoryId: cat.parentCategoryId, categoryId: cat.categoryId, subCategoryId: cat.subCategoryId, from, to, pnpValue: String(c.costValue) };
            }));
          }

          // Custom field values
          try {
            const fvs = await getCustomFieldValues('m', Number(id));
            const map: { [key: number]: string } = {};
            fvs.forEach(fv => { map[fv.customFieldId] = fv.value; });
            setCustomFieldValues(map);
          } catch (e) { console.error('Failed to load custom field values:', e); }

          // Brand mappings
          try {
            const bmRes = await marketplaceService.getBrandMappings(Number(id));
            if (bmRes.success && bmRes.mappings && bmRes.mappings.length > 0) {
              const loaded: BrandMapping[] = bmRes.mappings.map(m => {
                const toSlab = (c: any): BrandSlab => {
                  const { from, to, brandId } = parseRange(c.costProductRange || '0-0');
                  return { from, to, value: String(c.costValue), valueType: c.costValueType as 'P' | 'A', brandId, parentCategoryId: '', categoryId: '', subCategoryId: '' };
                };
                const commSlabs = m.costs.filter(c => c.costCategory === 'COMMISSION').map(toSlab);
                const mktSlabs = m.costs.filter(c => c.costCategory === 'MARKETING').map(toSlab);
                const shipSlabs = m.costs.filter(c => c.costCategory === 'SHIPPING').map(toSlab);
                return {
                  localId: String(m.id || Date.now() + Math.random()), brandId: String(m.brandId),
                  commissionSlabs: commSlabs.length ? commSlabs : [{ from: '0', to: '0', value: '0', valueType: 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }],
                  marketingSlabs: mktSlabs.length ? mktSlabs : [{ from: '0', to: '0', value: '0', valueType: 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }],
                  shippingSlabs: shipSlabs.length ? shipSlabs : [{ from: '0', to: '0', value: '0', valueType: 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }],
                  commissionValueType: commSlabs[0]?.valueType || 'A',
                  marketingValueType: mktSlabs[0]?.valueType || 'A',
                  shippingValueType: shipSlabs[0]?.valueType || 'A',
                };
              });
              setBrandMappings(loaded);
            }
          } catch (e: any) { console.error('Error loading brand mappings:', e?.message || e); }

        } else { setError('Failed to load marketplace data'); }
      } catch (err) { console.error('Error fetching marketplace:', err); setError('Failed to load marketplace data'); }
      finally { setLoadingMarketplace(false); }
    };
    fetchMarketplace();
  }, [id]);

  // Commission handlers
  const handleProductCostValueTypeChange = (newType: 'P' | 'A') => { setProductCostValueType(newType); setProductCostSlabs(prev => prev.map(s => ({ ...s, valueType: newType }))); };
  const addProductCostSlab = () => setProductCostSlabs(prev => [...prev, { from: '0', to: '0', value: '0', valueType: productCostValueType, brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);
  const removeProductCostSlab = (i: number) => { if (productCostSlabs.length > 1) setProductCostSlabs(prev => prev.filter((_, idx) => idx !== i)); };
  const updateProductCostSlab = (i: number, field: string, value: string) => {
    const v = ['from', 'to', 'value'].includes(field) ? validateNumericInput(value) : value;
    setProductCostSlabs(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      if (field === 'parentCategoryId') return { ...s, parentCategoryId: v, categoryId: '', subCategoryId: '' };
      if (field === 'categoryId') return { ...s, categoryId: v, subCategoryId: '' };
      return { ...s, [field]: v };
    }));
  };

  // Marketing handlers
  const handleMarketingValueTypeChange = (newType: 'P' | 'A') => { setMarketingValueType(newType); setMarketingSlabs(prev => prev.map(s => ({ ...s, valueType: newType }))); };
  const addMarketingSlab = () => setMarketingSlabs(prev => [...prev, { from: '0', to: '0', value: '0', valueType: marketingValueType, brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }]);
  const removeMarketingSlab = (i: number) => { if (marketingSlabs.length > 1) setMarketingSlabs(prev => prev.filter((_, idx) => idx !== i)); };
  const updateMarketingSlab = (i: number, field: string, value: string) => {
    const v = ['from', 'to', 'value'].includes(field) ? validateNumericInput(value) : value;
    setMarketingSlabs(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      if (field === 'parentCategoryId') return { ...s, parentCategoryId: v, categoryId: '', subCategoryId: '' };
      if (field === 'categoryId') return { ...s, categoryId: v, subCategoryId: '' };
      return { ...s, [field]: v };
    }));
  };

  // Weight shipping handlers
  const addWeightSlab = () => setWeightSlabs(prev => [...prev, { weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  const removeWeightSlab = (i: number) => { if (weightSlabs.length > 1) setWeightSlabs(prev => prev.filter((_, idx) => idx !== i)); };
  const updateWeightSlab = (i: number, field: keyof WeightSlab, value: string) => setWeightSlabs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: validateNumericInput(value) } : s));

  // Reverse weight handlers
  const addReverseWeightSlab = () => setReverseWeightSlabs(prev => [...prev, { weightFrom: '0', weightTo: '0', local: '0', zonal: '0', national: '0', value: '0' }]);
  const removeReverseWeightSlab = (i: number) => { if (reverseWeightSlabs.length > 1) setReverseWeightSlabs(prev => prev.filter((_, idx) => idx !== i)); };
  const updateReverseWeightSlab = (i: number, field: keyof WeightSlab, value: string) => setReverseWeightSlabs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: validateNumericInput(value) } : s));

  // Fixed Fee handlers
  const addFixedFeeSlab = () => setFixedFeeSlabs(prev => [...prev, { aspFrom: '0', aspTo: '0', fee: '0' }]);
  const removeFixedFeeSlab = (i: number) => { if (fixedFeeSlabs.length > 1) setFixedFeeSlabs(prev => prev.filter((_, idx) => idx !== i)); };
  const updateFixedFeeSlab = (i: number, field: keyof FixedFeeSlab, value: string) => setFixedFeeSlabs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: validateNumericInput(value) } : s));

  // Collection Fee handlers
  const addCollectionFeeSlab = () => setCollectionFeeSlabs(prev => [...prev, { orderValueFrom: '0', orderValueTo: '0', prepaid: '0', postpaid: '0' }]);
  const removeCollectionFeeSlab = (i: number) => { if (collectionFeeSlabs.length > 1) setCollectionFeeSlabs(prev => prev.filter((_, idx) => idx !== i)); };
  const updateCollectionFeeSlab = (i: number, field: keyof CollectionFeeSlab, value: string) => setCollectionFeeSlabs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: validateNumericInput(value) } : s));

  // Pick and Pack handlers
  const addPickAndPackSlab = () => setPickAndPackSlabs(prev => [...prev, { brand: '', parentCategoryId: '', categoryId: '', subCategoryId: '', from: '0', to: '0', pnpValue: '0' }]);
  const removePickAndPackSlab = (i: number) => { if (pickAndPackSlabs.length > 1) setPickAndPackSlabs(prev => prev.filter((_, idx) => idx !== i)); };
  const updatePickAndPackSlab = (i: number, field: keyof PickAndPackSlab, value: string) => {
    const v = ['from', 'to', 'pnpValue'].includes(field) ? validateNumericInput(value) : value;
    setPickAndPackSlabs(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      if (field === 'parentCategoryId') return { ...s, parentCategoryId: v, categoryId: '', subCategoryId: '' };
      if (field === 'categoryId') return { ...s, categoryId: v, subCategoryId: '' };
      return { ...s, [field]: v };
    }));
  };

  // Brand mapping handlers
  const addBrandMapping = () => setBrandMappings(prev => [...prev, { localId: `temp-${Date.now()}`, brandId: '', commissionSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }], marketingSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }], shippingSlabs: [{ from: '0', to: '0', value: '0', valueType: 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }], commissionValueType: 'A', marketingValueType: 'A', shippingValueType: 'A' }]);
  const removeBrandMapping = (localId: string) => setBrandMappings(prev => prev.filter(m => m.localId !== localId));
  const updateBrandMapping = (localId: string, field: keyof BrandMapping, value: any) => setBrandMappings(prev => prev.map(m => m.localId === localId ? { ...m, [field]: value } : m));
  const updateBrandValueType = (localId: string, category: 'commission' | 'marketing' | 'shipping', type: 'P' | 'A') => {
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    const typeKey = `${category}ValueType` as keyof BrandMapping;
    setBrandMappings(prev => prev.map(m => m.localId !== localId ? m : { ...m, [typeKey]: type, [slabKey]: (m[slabKey] as BrandSlab[]).map(s => ({ ...s, valueType: type })) }));
  };
  const addBrandSlab = (localId: string, category: 'commission' | 'marketing' | 'shipping') => {
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    const typeKey = `${category}ValueType` as keyof BrandMapping;
    setBrandMappings(prev => prev.map(m => m.localId !== localId ? m : { ...m, [slabKey]: [...(m[slabKey] as BrandSlab[]), { from: '0', to: '0', value: '0', valueType: m[typeKey] as 'P' | 'A', brandId: '', parentCategoryId: '', categoryId: '', subCategoryId: '' }] }));
  };
  const removeBrandSlab = (localId: string, category: 'commission' | 'marketing' | 'shipping', index: number) => {
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    setBrandMappings(prev => prev.map(m => { if (m.localId !== localId) return m; const slabs = m[slabKey] as BrandSlab[]; if (slabs.length <= 1) return m; return { ...m, [slabKey]: slabs.filter((_, i) => i !== index) }; }));
  };
  const updateBrandSlab = (localId: string, category: 'commission' | 'marketing' | 'shipping', index: number, field: string, value: string) => {
    const slabKey = `${category}Slabs` as keyof BrandMapping;
    const validated = field !== 'valueType' ? validateNumericInput(value) : value;
    setBrandMappings(prev => prev.map(m => m.localId !== localId ? m : { ...m, [slabKey]: (m[slabKey] as BrandSlab[]).map((s, i) => i === index ? { ...s, [field]: validated } : s) }));
  };

  const handleSubmit = async () => {
    if (!id) { setError('Marketplace ID is missing'); return; }
    try {
      setLoading(true); setError(null);
      if (!formData.name.trim()) { setError('Marketplace name is required'); setLoading(false); return; }

      const costs: UpdateMarketplaceCostRequest[] = [];

      // Commission
      if (productCostValueType === 'A') {
        if (parseFloat(commissionFlatValue) > 0) costs.push({ costCategory: 'COMMISSION', costValueType: commissionFlatValueType, costValue: parseFloat(commissionFlatValue), costProductRange: 'flat' });
      } else {
        productCostSlabs.forEach(slab => {
          if (parseFloat(slab.to) > parseFloat(slab.from) && parseFloat(slab.value) > 0) {
            const categoryId = slab.subCategoryId ? parseInt(slab.subCategoryId) : slab.categoryId ? parseInt(slab.categoryId) : slab.parentCategoryId ? parseInt(slab.parentCategoryId) : undefined;
            costs.push({ costCategory: 'COMMISSION', costValueType: commissionSlabValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.from}-${slab.to}`, ...(categoryId !== undefined && { categoryId }), ...(slab.brandId && { brandId: parseInt(slab.brandId) }) });
          }
        });
      }

      // Marketing
      if (!marketingFilters.none) {
        if (marketingValueType === 'A') {
          if (parseFloat(marketingFlatValue) > 0) costs.push({ costCategory: 'MARKETING', costValueType: marketingFlatValueType, costValue: parseFloat(marketingFlatValue), costProductRange: 'flat' });
        } else {
          marketingSlabs.forEach(slab => {
            if (parseFloat(slab.to) > parseFloat(slab.from) && parseFloat(slab.value) > 0) {
              const categoryId = slab.subCategoryId ? parseInt(slab.subCategoryId) : slab.categoryId ? parseInt(slab.categoryId) : slab.parentCategoryId ? parseInt(slab.parentCategoryId) : undefined;
              costs.push({ costCategory: 'MARKETING', costValueType: marketingSlabValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.from}-${slab.to}`, ...(categoryId !== undefined && { categoryId }), ...(slab.brandId && { brandId: parseInt(slab.brandId) }) });
            }
          });
        }
      }

      // Shipping
      if (shippingValueType === 'A') {
        if (parseFloat(shippingFlatValue) > 0) costs.push({ costCategory: 'SHIPPING', costValueType: shippingFlatValueType, costValue: parseFloat(shippingFlatValue), costProductRange: 'flat' });
      } else if (shippingValueType === 'P') {
        weightSlabs.forEach(slab => {
          if (parseFloat(slab.weightTo) > parseFloat(slab.weightFrom)) {
            if (parseFloat(slab.local) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING_LOCAL', costValueType: shippingSlabValueType, costValue: parseFloat(slab.local), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.zonal) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING_ZONAL', costValueType: shippingSlabValueType, costValue: parseFloat(slab.zonal), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.national) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING_NATIONAL', costValueType: shippingSlabValueType, costValue: parseFloat(slab.national), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.value) > 0) costs.push({ costCategory: 'WEIGHT_SHIPPING', costValueType: shippingSlabValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
          }
        });
      }

      // Shipping Percentage
      if (parseFloat(shippingPercentage.local) > 0) costs.push({ costCategory: 'SHIPPING_PERCENTAGE_LOCAL', costValueType: 'P', costValue: parseFloat(shippingPercentage.local), costProductRange: 'local' });
      if (parseFloat(shippingPercentage.zonal) > 0) costs.push({ costCategory: 'SHIPPING_PERCENTAGE_ZONAL', costValueType: 'P', costValue: parseFloat(shippingPercentage.zonal), costProductRange: 'zonal' });
      if (parseFloat(shippingPercentage.national) > 0) costs.push({ costCategory: 'SHIPPING_PERCENTAGE_NATIONAL', costValueType: 'P', costValue: parseFloat(shippingPercentage.national), costProductRange: 'national' });

      // Fixed Fee
      if (fixedFeeType === 'flat') {
        if (parseFloat(fixedFeeFlatValue) > 0) costs.push({ costCategory: 'FIXED_FEE', costValueType: fixedFeeFlatValueType, costValue: parseFloat(fixedFeeFlatValue), costProductRange: 'flat' });
      } else if (fixedFeeType === 'gt') {
        fixedFeeSlabs.forEach(slab => {
          if (parseFloat(slab.aspTo) > parseFloat(slab.aspFrom) && parseFloat(slab.fee) > 0) {
            const categoryId = fixedFeeFilters.subSubCategoryId ? parseInt(fixedFeeFilters.subSubCategoryId) : fixedFeeFilters.subCategoryId ? parseInt(fixedFeeFilters.subCategoryId) : fixedFeeFilters.categoryId ? parseInt(fixedFeeFilters.categoryId) : undefined;
            costs.push({ costCategory: 'FIXED_FEE', costValueType: fixedFeeValueType, costValue: parseFloat(slab.fee), costProductRange: `${slab.aspFrom}-${slab.aspTo}`, ...(categoryId !== undefined && { categoryId }), ...(fixedFeeFilters.brandId && { brandId: parseInt(fixedFeeFilters.brandId) }) });
          }
        });
      }

      // Reverse Shipping
      if (reverseShippingType === 'flat') {
        if (parseFloat(reverseShippingFlatValue) > 0) costs.push({ costCategory: 'REVERSE_SHIPPING', costValueType: reverseShippingFlatValueType, costValue: parseFloat(reverseShippingFlatValue), costProductRange: 'flat' });
      } else if (reverseShippingType === 'weight') {
        reverseWeightSlabs.forEach(slab => {
          if (parseFloat(slab.weightTo) > parseFloat(slab.weightFrom)) {
            if (parseFloat(slab.local) > 0) costs.push({ costCategory: 'REVERSE_SHIPPING_LOCAL', costValueType: reverseWeightValueType, costValue: parseFloat(slab.local), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.zonal) > 0) costs.push({ costCategory: 'REVERSE_SHIPPING_ZONAL', costValueType: reverseWeightValueType, costValue: parseFloat(slab.zonal), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.national) > 0) costs.push({ costCategory: 'REVERSE_SHIPPING_NATIONAL', costValueType: reverseWeightValueType, costValue: parseFloat(slab.national), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
            if (parseFloat(slab.value) > 0) costs.push({ costCategory: 'REVERSE_WEIGHT_SHIPPING', costValueType: reverseWeightValueType, costValue: parseFloat(slab.value), costProductRange: `${slab.weightFrom}-${slab.weightTo}kg` });
          }
        });
      }

      // Collection Fee
      if (collectionFeeType === 'value') {
        collectionFeeSlabs.forEach(slab => {
          if (parseFloat(slab.orderValueTo) > parseFloat(slab.orderValueFrom)) {
            if (parseFloat(slab.prepaid) > 0) costs.push({ costCategory: 'COLLECTION_FEE_PREPAID', costValueType: prepaidValueType, costValue: parseFloat(slab.prepaid), costProductRange: `${slab.orderValueFrom}-${slab.orderValueTo}` });
            if (parseFloat(slab.postpaid) > 0) costs.push({ costCategory: 'COLLECTION_FEE_POSTPAID', costValueType: postpaidValueType, costValue: parseFloat(slab.postpaid), costProductRange: `${slab.orderValueFrom}-${slab.orderValueTo}` });
          }
        });
      }

      // Royalty
      if (royaltyType === 'flat' && parseFloat(royaltyValue) > 0) costs.push({ costCategory: 'ROYALTY', costValueType: royaltyValueType, costValue: parseFloat(royaltyValue), costProductRange: 'flat' });

      // Pick and Pack
      if (pickAndPackType === 'slab') {
        pickAndPackSlabs.forEach(slab => {
          if (parseFloat(slab.pnpValue) > 0) {
            const categoryId = slab.subCategoryId ? parseInt(slab.subCategoryId) : slab.categoryId ? parseInt(slab.categoryId) : slab.parentCategoryId ? parseInt(slab.parentCategoryId) : undefined;
            costs.push({ costCategory: 'PICK_AND_PACK', costValueType: pickAndPackValueType, costValue: parseFloat(slab.pnpValue), costProductRange: `${slab.from}-${slab.to}`, ...(categoryId !== undefined && { categoryId }), ...(slab.brand && { brandId: parseInt(slab.brand) }) });
          }
        });
      }

      const request: UpdateMarketplaceRequest = { name: formData.name.trim(), description: formData.description.trim() || '', enabled: formData.enabled, accNo: formData.accNo.trim() || undefined, costs };
      const response = await marketplaceService.updateMarketplace(Number(id), request);

      if (response.success) {
        try {
          await Promise.all(Object.entries(customFieldValues).map(async ([fieldId, value]) => {
            const trimmedValue = value.trim();
            if (trimmedValue) await saveCustomFieldValue({ customFieldId: Number(fieldId), module: 'm', moduleId: Number(id), value: trimmedValue });
          }));
        } catch (e) { console.error('Error saving custom field values:', e); }

        navigate('/marketplaces');
      } else { setError(response.message || 'Failed to update marketplace'); }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update marketplace. Please try again.');
    } finally { setLoading(false); }
  };

  if (loadingMarketplace) {
    return <div className="add-marketplace-bg"><div style={{ padding: '40px', textAlign: 'center' }}>Loading marketplace...</div></div>;
  }

  return (
    <div className="add-marketplace-bg">
      <main className="add-marketplace-main">
        <header className="add-marketplace-header">
          <button className="back-btn" onClick={() => navigate("/marketplaces")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="breadcrumb">Edit Marketplace</h2>
          <div className="header-actions">
            <button className="icon-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 21L16.65 16.65" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <button className="icon-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <button className="icon-btn profile-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </div>
        </header>

        <h3 className="section-title">Marketplace Details</h3>
        {error && <div className="error-message" style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#fee', color: '#c23939', borderRadius: '8px' }}>{error}</div>}

        <div className="marketplace-details-container">
          <div className="details-row-1">
            <div className="form-field">
              <label className="field-label">Marketplace Name</label>
              <input className="text-input" placeholder="enter marketplace name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Acc.no</label>
              <input className="text-input" placeholder="enter account number" value={formData.accNo} onChange={e => handleInputChange('accNo', e.target.value)} />
            </div>
          </div>
          <div className="details-row-2">
            <div className="form-field">
              <label className="field-label">Description</label>
              <textarea className="text-input description-textarea" placeholder="description" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} rows={3} />
            </div>
          </div>
          {customFields.length > 0 && (
            <div className="details-row-custom-fields">
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                {customFields.map(field => (
                  <div key={field.id} className="form-field">
                    <label className="field-label">{field.name}{field.required ? ' *' : ''}</label>
                    {field.fieldType === 'text' || field.fieldType === 'numeric' ? (
                      <input type={field.fieldType === 'numeric' ? 'number' : 'text'} placeholder={field.name} className="text-input" value={customFieldValues[field.id] || ''} onChange={e => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })} required={field.required} disabled={loading} />
                    ) : field.fieldType === 'dropdown' && field.dropdownOptions ? (
                      <select className="select-input" value={customFieldValues[field.id] || ''} onChange={e => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })} required={field.required} disabled={loading}>
                        <option value="">{field.name}</option>
                        {field.dropdownOptions.split(',').map((opt: string, idx: number) => <option key={idx} value={opt.trim()}>{opt.trim()}</option>)}
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="details-row-3">
            <label className="activate-row">
              <input type="checkbox" checked={formData.enabled} onChange={e => handleInputChange('enabled', e.target.checked)} />
              <span>Activate marketplace</span>
            </label>
          </div>
        </div>

        {/* COMMISSION */}
        <div className="commission-section">
          <h3 className="section-title">Commission</h3>
          <div className="commission-toggle-container">
            <label className="commission-radio-option"><input type="radio" name="commissionType" checked={productCostValueType === 'A'} onChange={() => handleProductCostValueTypeChange('A')} /><span className="commission-radio-label">Flat based Commission</span></label>
            <label className="commission-radio-option"><input type="radio" name="commissionType" checked={productCostValueType === 'P'} onChange={() => handleProductCostValueTypeChange('P')} /><span className="commission-radio-label">Slab based Commission</span></label>
          </div>
          {productCostValueType === 'A' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch"><input type="checkbox" checked={commissionFlatValueType === 'A'} onChange={() => setCommissionFlatValueType(commissionFlatValueType === 'P' ? 'A' : 'P')} /><span className="slider"></span></label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input className="royalty-input" type="text" placeholder="0" value={commissionFlatValue} onChange={e => setCommissionFlatValue(validateNumericInput(e.target.value))} />
                <span className="royalty-unit">{commissionFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}
          {productCostValueType === 'P' && (() => {
            const hasSubCat = productCostSlabs.some(s => s.parentCategoryId !== '');
            const hasSubSubCat = productCostSlabs.some(s => s.categoryId !== '');
            return (
              <div className="commission-panel">
                <div className="commission-table-header" style={{ gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 0.8fr 0.5fr' }}>
                  <span className="commission-header-label">Brand</span>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                    <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                    {hasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                    {hasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                  </div>
                  <span className="commission-header-label">From</span>
                  <span className="commission-header-label">To</span>
                  <span className="commission-header-label">Value</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch"><input type="checkbox" checked={commissionSlabValueType === 'A'} onChange={e => setCommissionSlabValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                    <span>Rs</span>
                  </div>
                </div>
                {productCostSlabs.map((slab, i) => (
                  <div key={i} className="commission-table-row" style={{ gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 0.8fr 0.5fr' }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={slab.brandId} onChange={e => updateProductCostSlab(i, 'brandId', e.target.value)}>
                      <option value="">All Brands</option>
                      {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <select className="commission-dropdown" style={{ width: '100%' }} value={slab.parentCategoryId} onChange={e => updateProductCostSlab(i, 'parentCategoryId', e.target.value)}>
                          <option value="">All Categories</option>
                          {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                      </div>
                      {slab.parentCategoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.categoryId} onChange={e => updateProductCostSlab(i, 'categoryId', e.target.value)}>
                            <option value="">All Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.parentCategoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                      {slab.categoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.subCategoryId} onChange={e => updateProductCostSlab(i, 'subCategoryId', e.target.value)}>
                            <option value="">All Sub Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.categoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updateProductCostSlab(i, 'from', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updateProductCostSlab(i, 'to', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateProductCostSlab(i, 'value', e.target.value)} />
                    {productCostSlabs.length > 1 ? <button className="commission-delete-btn" onClick={() => removeProductCostSlab(i)} type="button">X</button> : <div></div>}
                  </div>
                ))}
                <button className="commission-add-slab" onClick={addProductCostSlab} type="button"><span>+</span><span>Add Slab</span></button>
              </div>
            );
          })()}
        </div>

        {/* MARKETING */}
        <div className="commission-section">
          <h3 className="section-title">Marketing</h3>
          <div className="commission-toggle-container">
            <label className="commission-radio-option"><input type="radio" name="marketingType" checked={marketingValueType === 'A' && !marketingFilters.none} onChange={() => { handleMarketingValueTypeChange('A'); setMarketingFilters(p => ({ ...p, none: false })); }} /><span className="commission-radio-label">Flat based Marketing</span></label>
            <label className="commission-radio-option"><input type="radio" name="marketingType" checked={marketingValueType === 'P' && !marketingFilters.none} onChange={() => { handleMarketingValueTypeChange('P'); setMarketingFilters(p => ({ ...p, none: false })); }} /><span className="commission-radio-label">Slab based Marketing</span></label>
            <label className="commission-radio-option"><input type="radio" name="marketingType" checked={marketingFilters.none} onChange={() => setMarketingFilters(p => ({ ...p, none: true }))} /><span className="commission-radio-label">None</span></label>
          </div>
          {marketingValueType === 'A' && !marketingFilters.none && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch"><input type="checkbox" checked={marketingFlatValueType === 'A'} onChange={() => setMarketingFlatValueType(marketingFlatValueType === 'P' ? 'A' : 'P')} /><span className="slider"></span></label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input className="royalty-input" type="text" placeholder="0" value={marketingFlatValue} onChange={e => setMarketingFlatValue(validateNumericInput(e.target.value))} />
                <span className="royalty-unit">{marketingFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}
          {marketingValueType === 'P' && !marketingFilters.none && (() => {
            const hasSubCat = marketingSlabs.some(s => s.parentCategoryId !== '');
            const hasSubSubCat = marketingSlabs.some(s => s.categoryId !== '');
            return (
              <div className="commission-panel">
                <div className="commission-table-header" style={{ gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 0.8fr 0.5fr' }}>
                  <span className="commission-header-label">Brand</span>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                    <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                    {hasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                    {hasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                  </div>
                  <span className="commission-header-label">From</span>
                  <span className="commission-header-label">To</span>
                  <span className="commission-header-label">Contri</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch"><input type="checkbox" checked={marketingSlabValueType === 'A'} onChange={e => setMarketingSlabValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                    <span>Rs</span>
                  </div>
                </div>
                {marketingSlabs.map((slab, i) => (
                  <div key={i} className="commission-table-row" style={{ gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 0.8fr 0.5fr' }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={slab.brandId} onChange={e => updateMarketingSlab(i, 'brandId', e.target.value)}>
                      <option value="">All Brands</option>
                      {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <select className="commission-dropdown" style={{ width: '100%' }} value={slab.parentCategoryId} onChange={e => updateMarketingSlab(i, 'parentCategoryId', e.target.value)}>
                          <option value="">All Categories</option>
                          {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                      </div>
                      {slab.parentCategoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.categoryId} onChange={e => updateMarketingSlab(i, 'categoryId', e.target.value)}>
                            <option value="">All Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.parentCategoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                      {slab.categoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.subCategoryId} onChange={e => updateMarketingSlab(i, 'subCategoryId', e.target.value)}>
                            <option value="">All Sub Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.categoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updateMarketingSlab(i, 'from', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updateMarketingSlab(i, 'to', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateMarketingSlab(i, 'value', e.target.value)} />
                    {marketingSlabs.length > 1 ? <button className="commission-delete-btn" onClick={() => removeMarketingSlab(i)} type="button">X</button> : <div></div>}
                  </div>
                ))}
                <button className="commission-add-slab" onClick={addMarketingSlab} type="button"><span>+</span><span>Add Slab</span></button>
              </div>
            );
          })()}
        </div>

        {/* SHIPPING */}
        <div className="commission-section">
          <h3 className="section-title">Shipping</h3>
          <div className="commission-toggle-container" style={{ gap: '80px' }}>
            <label className="commission-radio-option"><input type="radio" name="shippingType" checked={shippingValueType === 'A'} onChange={() => setShippingValueType('A')} /><span className="commission-radio-label">Flat based Shipping</span></label>
            <label className="commission-radio-option"><input type="radio" name="shippingType" checked={shippingValueType === 'P'} onChange={() => setShippingValueType('P')} /><span className="commission-radio-label">Weight based Shipping</span></label>
            <label className="commission-radio-option"><input type="radio" name="shippingType" checked={shippingValueType === 'gt'} onChange={() => setShippingValueType('gt')} /><span className="commission-radio-label">GT based</span></label>
            <label className="commission-radio-option"><input type="radio" name="shippingType" checked={shippingValueType === 'none'} onChange={() => setShippingValueType('none')} /><span className="commission-radio-label">None</span></label>
          </div>
          {shippingValueType === 'A' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch"><input type="checkbox" checked={shippingFlatValueType === 'A'} onChange={() => setShippingFlatValueType(shippingFlatValueType === 'P' ? 'A' : 'P')} /><span className="slider"></span></label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input className="royalty-input" type="text" placeholder="0" value={shippingFlatValue} onChange={e => setShippingFlatValue(validateNumericInput(e.target.value))} />
                <span className="royalty-unit">{shippingFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}
          {shippingValueType === 'P' && (
            <div className="commission-panel">
              <div className="shipping-table-header">
                <span className="commission-header-label">Weight From(kg)</span>
                <span className="commission-header-label">Weight To(kg)</span>
                <span className="commission-header-label">Local(Rs)</span>
                <span className="commission-header-label">Zonal(Rs)</span>
                <span className="commission-header-label">National(Rs)</span>
                <span className="commission-header-label">Value</span>
                <div className="commission-value-toggle">
                  <span>%</span>
                  <label className="switch"><input type="checkbox" checked={shippingSlabValueType === 'A'} onChange={e => setShippingSlabValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                  <span>Rs</span>
                </div>
              </div>
              {weightSlabs.map((slab, i) => (
                <div key={i} className="shipping-table-row">
                  <input className="commission-input" placeholder="0" value={slab.weightFrom} onChange={e => updateWeightSlab(i, 'weightFrom', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.weightTo} onChange={e => updateWeightSlab(i, 'weightTo', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.local} onChange={e => updateWeightSlab(i, 'local', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.zonal} onChange={e => updateWeightSlab(i, 'zonal', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.national} onChange={e => updateWeightSlab(i, 'national', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateWeightSlab(i, 'value', e.target.value)} />
                  {weightSlabs.length > 1 ? <button className="commission-delete-btn" onClick={() => removeWeightSlab(i)} type="button">X</button> : <div></div>}
                </div>
              ))}
              <button className="commission-add-slab" onClick={addWeightSlab} type="button"><span>+</span><span>Add Weight Slab</span></button>
            </div>
          )}
        </div>

        {/* SHIPPING PERCENTAGE */}
        <div className="commission-section">
          <h3 className="section-title">Shipping Percentage</h3>
          <div className="shipping-percentage-panel">
            <div className="shipping-percentage-labels">
              <span className="shipping-percentage-label">Local(%)</span>
              <span className="shipping-percentage-label">Zonal(%)</span>
              <span className="shipping-percentage-label">National(%)</span>
            </div>
            <div className="shipping-percentage-divider"></div>
            <div className="shipping-percentage-inputs">
              <input className="shipping-percentage-input" type="text" placeholder="50%" value={shippingPercentage.local} onChange={e => setShippingPercentage(p => ({ ...p, local: validateNumericInput(e.target.value) }))} />
              <input className="shipping-percentage-input" type="text" placeholder="50%" value={shippingPercentage.zonal} onChange={e => setShippingPercentage(p => ({ ...p, zonal: validateNumericInput(e.target.value) }))} />
              <input className="shipping-percentage-input" type="text" placeholder="50%" value={shippingPercentage.national} onChange={e => setShippingPercentage(p => ({ ...p, national: validateNumericInput(e.target.value) }))} />
              <button className="commission-delete-btn" type="button" onClick={() => setShippingPercentage({ local: '0', zonal: '0', national: '0' })}>X</button>
            </div>
          </div>
        </div>

        {/* FIXED FEE */}
        <div className="commission-section">
          <h3 className="section-title">Fixed Fee</h3>
          <div className="commission-toggle-container" style={{ gap: '80px' }}>
            <label className="commission-radio-option"><input type="radio" name="fixedFeeType" checked={fixedFeeType === 'flat'} onChange={() => setFixedFeeType('flat')} /><span className="commission-radio-label">Flat based</span></label>
            <label className="commission-radio-option"><input type="radio" name="fixedFeeType" checked={fixedFeeType === 'gt'} onChange={() => setFixedFeeType('gt')} /><span className="commission-radio-label">GT based on seller ASP</span></label>
            <label className="commission-radio-option"><input type="radio" name="fixedFeeType" checked={fixedFeeType === 'none'} onChange={() => setFixedFeeType('none')} /><span className="commission-radio-label">None</span></label>
          </div>
          {fixedFeeType === 'flat' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch"><input type="checkbox" checked={fixedFeeFlatValueType === 'A'} onChange={() => setFixedFeeFlatValueType(fixedFeeFlatValueType === 'P' ? 'A' : 'P')} /><span className="slider"></span></label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input className="royalty-input" type="text" placeholder="0" value={fixedFeeFlatValue} onChange={e => setFixedFeeFlatValue(validateNumericInput(e.target.value))} />
                <span className="royalty-unit">{fixedFeeFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}
          {fixedFeeType === 'gt' && (() => {
            const hasSubCat = fixedFeeFilters.categoryId !== '';
            const hasSubSubCat = fixedFeeFilters.subCategoryId !== '';
            return (
              <div className="commission-panel">
                <div className="commission-table-header" style={{ gridTemplateColumns: '2fr 2fr 0.9fr 0.9fr 0.9fr 1fr' }}>
                  <span className="commission-header-label">Brand</span>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                    <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                    {hasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                    {hasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                  </div>
                  <span className="commission-header-label">ASP From</span>
                  <span className="commission-header-label">ASP To</span>
                  <span className="commission-header-label">Fixed Fee</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch"><input type="checkbox" checked={fixedFeeValueType === 'A'} onChange={e => setFixedFeeValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                    <span>Rs</span>
                  </div>
                </div>
                {fixedFeeSlabs.map((slab, i) => (
                  <div key={i} className="commission-table-row" style={{ gridTemplateColumns: '2fr 2fr 0.9fr 0.9fr 0.9fr 1fr' }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.brandId} onChange={e => setFixedFeeFilters(p => ({ ...p, brandId: e.target.value }))}>
                      <option value="">All Brands</option>
                      {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.categoryId} onChange={e => setFixedFeeFilters(p => ({ ...p, categoryId: e.target.value, subCategoryId: '', subSubCategoryId: '' }))}>
                          <option value="">All Categories</option>
                          {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                      </div>
                      {fixedFeeFilters.categoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.subCategoryId} onChange={e => setFixedFeeFilters(p => ({ ...p, subCategoryId: e.target.value, subSubCategoryId: '' }))}>
                            <option value="">All Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && c.parentCategoryId === parseInt(fixedFeeFilters.categoryId || '0')).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                      {fixedFeeFilters.subCategoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={fixedFeeFilters.subSubCategoryId} onChange={e => setFixedFeeFilters(p => ({ ...p, subSubCategoryId: e.target.value }))}>
                            <option value="">All Sub Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && c.parentCategoryId === parseInt(fixedFeeFilters.subCategoryId || '0')).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <input className="commission-input" placeholder="500" value={slab.aspFrom} onChange={e => updateFixedFeeSlab(i, 'aspFrom', e.target.value)} />
                    <input className="commission-input" placeholder="500" value={slab.aspTo} onChange={e => updateFixedFeeSlab(i, 'aspTo', e.target.value)} />
                    <input className="commission-input" placeholder="500" value={slab.fee} onChange={e => updateFixedFeeSlab(i, 'fee', e.target.value)} />
                    {fixedFeeSlabs.length > 1 ? <button className="commission-delete-btn" onClick={() => removeFixedFeeSlab(i)} type="button">X</button> : <div></div>}
                  </div>
                ))}
                <button className="commission-add-slab" onClick={addFixedFeeSlab} type="button"><span>+</span><span>Add Slab</span></button>
              </div>
            );
          })()}
        </div>

        {/* REVERSE SHIPPING */}
        <div className="commission-section">
          <h3 className="section-title">Reverse Shipping Cost</h3>
          <div className="commission-toggle-container">
            <label className="commission-radio-option"><input type="radio" name="reverseShippingType" checked={reverseShippingType === 'flat'} onChange={() => setReverseShippingType('flat')} /><span className="commission-radio-label">Flat based Shipping</span></label>
            <label className="commission-radio-option"><input type="radio" name="reverseShippingType" checked={reverseShippingType === 'weight'} onChange={() => setReverseShippingType('weight')} /><span className="commission-radio-label">Weight based Reverse Shipping</span></label>
            <label className="commission-radio-option"><input type="radio" name="reverseShippingType" checked={reverseShippingType === 'none'} onChange={() => setReverseShippingType('none')} /><span className="commission-radio-label">None</span></label>
          </div>
          {reverseShippingType === 'flat' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch"><input type="checkbox" checked={reverseShippingFlatValueType === 'A'} onChange={() => setReverseShippingFlatValueType(reverseShippingFlatValueType === 'P' ? 'A' : 'P')} /><span className="slider"></span></label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input className="royalty-input" type="text" placeholder="0" value={reverseShippingFlatValue} onChange={e => setReverseShippingFlatValue(validateNumericInput(e.target.value))} />
                <span className="royalty-unit">{reverseShippingFlatValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}
          {reverseShippingType === 'weight' && (
            <div className="commission-panel">
              <div className="shipping-table-header">
                <span className="commission-header-label">Weight From(kg)</span>
                <span className="commission-header-label">Weight To(kg)</span>
                <span className="commission-header-label">Local(Rs)</span>
                <span className="commission-header-label">Zonal(Rs)</span>
                <span className="commission-header-label">National(Rs)</span>
                <span className="commission-header-label">Value</span>
                <div className="commission-value-toggle">
                  <span>%</span>
                  <label className="switch"><input type="checkbox" checked={reverseWeightValueType === 'A'} onChange={e => setReverseWeightValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                  <span>Rs</span>
                </div>
              </div>
              {reverseWeightSlabs.map((slab, i) => (
                <div className="shipping-table-row" key={i}>
                  <input className="commission-input" placeholder="0" value={slab.weightFrom} onChange={e => updateReverseWeightSlab(i, 'weightFrom', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.weightTo} onChange={e => updateReverseWeightSlab(i, 'weightTo', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.local} onChange={e => updateReverseWeightSlab(i, 'local', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.zonal} onChange={e => updateReverseWeightSlab(i, 'zonal', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.national} onChange={e => updateReverseWeightSlab(i, 'national', e.target.value)} />
                  <input className="commission-input" placeholder="0" value={slab.value} onChange={e => updateReverseWeightSlab(i, 'value', e.target.value)} />
                  {reverseWeightSlabs.length > 1 ? <button className="commission-delete-btn" onClick={() => removeReverseWeightSlab(i)} type="button">X</button> : <div></div>}
                </div>
              ))}
              <button className="commission-add-slab" onClick={addReverseWeightSlab} type="button"><span>+</span><span>Add Weight Slab</span></button>
            </div>
          )}
        </div>

        {/* COLLECTION FEE */}
        <div className="commission-section">
          <h3 className="section-title">Collection Fee</h3>
          <div className="commission-toggle-container">
            <label className="commission-radio-option"><input type="radio" name="collectionFeeType" checked={collectionFeeType === 'value'} onChange={() => setCollectionFeeType('value')} /><span className="commission-radio-label">Value based collection fee</span></label>
            <label className="commission-radio-option"><input type="radio" name="collectionFeeType" checked={collectionFeeType === 'none'} onChange={() => setCollectionFeeType('none')} /><span className="commission-radio-label">None</span></label>
          </div>
          {collectionFeeType === 'value' && (
            <div className="commission-panel">
              <div className="collection-fee-table-header">
                <span className="commission-header-label">Order Value From</span>
                <span className="commission-header-label">Order Value To</span>
                <div className="collection-fee-col-header">
                  <span className="commission-header-label">Prepaid</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch"><input type="checkbox" checked={prepaidValueType === 'A'} onChange={e => setPrepaidValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                    <span>Rs</span>
                  </div>
                </div>
                <div className="collection-fee-col-header">
                  <span className="commission-header-label">Postpaid</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch"><input type="checkbox" checked={postpaidValueType === 'A'} onChange={e => setPostpaidValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                    <span>Rs</span>
                  </div>
                </div>
                <span></span>
              </div>
              {collectionFeeSlabs.map((slab, i) => (
                <div className="collection-fee-table-row" key={i}>
                  <input className="commission-input" placeholder="500" value={slab.orderValueFrom} onChange={e => updateCollectionFeeSlab(i, 'orderValueFrom', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.orderValueTo} onChange={e => updateCollectionFeeSlab(i, 'orderValueTo', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.prepaid} onChange={e => updateCollectionFeeSlab(i, 'prepaid', e.target.value)} />
                  <input className="commission-input" placeholder="500" value={slab.postpaid} onChange={e => updateCollectionFeeSlab(i, 'postpaid', e.target.value)} />
                  {collectionFeeSlabs.length > 1 ? <button className="commission-delete-btn" onClick={() => removeCollectionFeeSlab(i)} type="button">X</button> : <div></div>}
                </div>
              ))}
              <button className="commission-add-slab" onClick={addCollectionFeeSlab} type="button"><span>+</span><span>Add Slab</span></button>
            </div>
          )}
        </div>

        {/* ROYALTY */}
        <div className="commission-section">
          <h3 className="section-title">Royalty</h3>
          <div className="commission-toggle-container">
            <label className="commission-radio-option"><input type="radio" name="royaltyType" checked={royaltyType === 'flat'} onChange={() => setRoyaltyType('flat')} /><span className="commission-radio-label">Flat based Royalty</span></label>
            <label className="commission-radio-option"><input type="radio" name="royaltyType" checked={royaltyType === 'none'} onChange={() => setRoyaltyType('none')} /><span className="commission-radio-label">None</span></label>
          </div>
          {royaltyType === 'flat' && (
            <div className="royalty-panel">
              <div className="royalty-toggle-wrapper">
                <span className="royalty-toggle-label">%</span>
                <label className="switch"><input type="checkbox" checked={royaltyValueType === 'A'} onChange={() => setRoyaltyValueType(royaltyValueType === 'P' ? 'A' : 'P')} /><span className="slider"></span></label>
                <span className="royalty-toggle-label">Rs</span>
              </div>
              <div className="royalty-content">
                <label className="royalty-label">Value :</label>
                <input className="royalty-input" type="text" placeholder="5" value={royaltyValue} onChange={e => setRoyaltyValue(validateNumericInput(e.target.value))} />
                <span className="royalty-unit">{royaltyValueType === 'P' ? '%' : 'Rs'}</span>
              </div>
            </div>
          )}
        </div>

        {/* PICK AND PACK */}
        <div className="commission-section">
          <h3 className="section-title">Pick and Pack</h3>
          <div className="commission-toggle-container">
            <label className="commission-radio-option"><input type="radio" name="pickAndPackType" checked={pickAndPackType === 'slab'} onChange={() => setPickAndPackType('slab')} /><span className="commission-radio-label">Slab based Commission</span></label>
            <label className="commission-radio-option"><input type="radio" name="pickAndPackType" checked={pickAndPackType === 'none'} onChange={() => setPickAndPackType('none')} /><span className="commission-radio-label">None</span></label>
          </div>
          {pickAndPackType === 'slab' && (() => {
            const hasSubCat = pickAndPackSlabs.some(s => s.parentCategoryId !== '');
            const hasSubSubCat = pickAndPackSlabs.some(s => s.categoryId !== '');
            return (
              <div className="commission-panel">
                <div className="commission-table-header" style={{ gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 0.8fr 0.5fr' }}>
                  <span className="commission-header-label">Brand</span>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                    <span className="commission-header-label" style={{ flex: 1 }}>Category</span>
                    {hasSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                    {hasSubSubCat && <span className="commission-header-label" style={{ flex: 1 }}>Sub-category</span>}
                  </div>
                  <span className="commission-header-label">From</span>
                  <span className="commission-header-label">To</span>
                  <span className="commission-header-label">Pnp Value</span>
                  <div className="commission-value-toggle">
                    <span>%</span>
                    <label className="switch"><input type="checkbox" checked={pickAndPackValueType === 'A'} onChange={e => setPickAndPackValueType(e.target.checked ? 'A' : 'P')} /><span className="slider" /></label>
                    <span>Rs</span>
                  </div>
                </div>
                {pickAndPackSlabs.map((slab, i) => (
                  <div key={i} className="commission-table-row" style={{ gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 0.8fr 0.5fr' }}>
                    <select className="commission-dropdown" style={{ width: '100%' }} value={slab.brand} onChange={e => updatePickAndPackSlab(i, 'brand', e.target.value)}>
                      <option value="">All Brands</option>
                      {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <select className="commission-dropdown" style={{ width: '100%' }} value={slab.parentCategoryId} onChange={e => updatePickAndPackSlab(i, 'parentCategoryId', e.target.value)}>
                          <option value="">All Categories</option>
                          {categories.filter(c => c.parentCategoryId === null).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                      </div>
                      {slab.parentCategoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.categoryId} onChange={e => updatePickAndPackSlab(i, 'categoryId', e.target.value)}>
                            <option value="">All Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.parentCategoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                      {slab.categoryId && (
                        <div style={{ flex: 1 }}>
                          <select className="commission-dropdown" style={{ width: '100%' }} value={slab.subCategoryId} onChange={e => updatePickAndPackSlab(i, 'subCategoryId', e.target.value)}>
                            <option value="">All Sub Sub Categories</option>
                            {categories.filter(c => c.parentCategoryId !== null && String(c.parentCategoryId) === slab.categoryId).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <input className="commission-input" placeholder="0" value={slab.from} onChange={e => updatePickAndPackSlab(i, 'from', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.to} onChange={e => updatePickAndPackSlab(i, 'to', e.target.value)} />
                    <input className="commission-input" placeholder="0" value={slab.pnpValue} onChange={e => updatePickAndPackSlab(i, 'pnpValue', e.target.value)} />
                    {pickAndPackSlabs.length > 1 ? <button className="commission-delete-btn" onClick={() => removePickAndPackSlab(i)} type="button">X</button> : <div></div>}
                  </div>
                ))}
                <button className="commission-add-slab" onClick={addPickAndPackSlab} type="button"><span>+</span><span>Add Slab</span></button>
              </div>
            );
          })()}
        </div>

        <div className="footer-actions">
          <button className="cancel-btn" onClick={() => navigate('/marketplaces')} type="button">Cancel</button>
          <button className="save-btn" onClick={handleSubmit} disabled={loading} type="button">
            {loading ? 'UPDATING...' : 'UPDATE'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default EditMarketplacePage;

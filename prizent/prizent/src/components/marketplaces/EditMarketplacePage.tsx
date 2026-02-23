import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./EditMarketplacePage.css";
import marketplaceService, { UpdateMarketplaceRequest, UpdateMarketplaceCostRequest } from '../../services/marketplaceService';
import { getCustomFields, saveCustomFieldValue, getCustomFieldValues, CustomFieldResponse } from '../../services/customFieldService';

const EditMarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: false
  });
  
  // Cost slabs state
  const [productCostSlabs, setProductCostSlabs] = useState([{ from: '', to: '', value: '', valueType: 'A' as 'P' | 'A' }]);
  const [marketingSlabs, setMarketingSlabs] = useState([{ from: '', to: '', value: '', valueType: 'A' as 'P' | 'A' }]);
  const [shippingSlabs, setShippingSlabs] = useState([{ from: '', to: '', value: '', valueType: 'A' as 'P' | 'A' }]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingMarketplace, setLoadingMarketplace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productCostValueType, setProductCostValueType] = useState<'P' | 'A'>('A');
  const [marketingValueType, setMarketingValueType] = useState<'P' | 'A'>('A');
  const [shippingValueType, setShippingValueType] = useState<'P' | 'A'>('A');
  const [customFields, setCustomFields] = useState<CustomFieldResponse[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: number]: string }>({});

  // Fetch custom fields for marketplaces
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const fields = await getCustomFields('m');
        const enabledFields = fields.filter(f => f.enabled);
        setCustomFields(enabledFields);
        console.log('Loaded marketplace custom fields:', enabledFields);
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      }
    };
    fetchCustomFields();
  }, []);

  // Fetch marketplace data
  useEffect(() => {
    const fetchMarketplace = async () => {
      if (!id) return;

      try {
        setLoadingMarketplace(true);
        const response = await marketplaceService.getMarketplaceById(Number(id));
        
        if (response.success && response.marketplace) {
          const marketplace = response.marketplace;
          
          setFormData({
            name: marketplace.name || '',
            description: marketplace.description || '',
            enabled: marketplace.enabled || false
          });

          // Parse cost data if available
          if (marketplace.costs && marketplace.costs.length > 0) {
            const commissionCosts = marketplace.costs.filter(c => c.costCategory === 'COMMISSION');
            const marketingCosts = marketplace.costs.filter(c => c.costCategory === 'MARKETING');
            const shippingCosts = marketplace.costs.filter(c => c.costCategory === 'SHIPPING');

            if (commissionCosts.length > 0) {
              setProductCostSlabs(commissionCosts.map(c => {
                const [from, to] = c.costProductRange?.split('-') || ['', ''];
                return { 
                  from, 
                  to, 
                  value: String(c.costValue || ''),
                  valueType: c.costValueType 
                };
              }));
              setProductCostValueType(commissionCosts[0].costValueType);
            }

            if (marketingCosts.length > 0) {
              setMarketingSlabs(marketingCosts.map(c => {
                const [from, to] = c.costProductRange?.split('-') || ['', ''];
                return { 
                  from, 
                  to, 
                  value: String(c.costValue || ''),
                  valueType: c.costValueType 
                };
              }));
              setMarketingValueType(marketingCosts[0].costValueType);
            }

            if (shippingCosts.length > 0) {
              setShippingSlabs(shippingCosts.map(c => {
                const [from, to] = c.costProductRange?.split('-') || ['', ''];
                return { 
                  from, 
                  to, 
                  value: String(c.costValue || ''),
                  valueType: c.costValueType 
                };
              }));
              setShippingValueType(shippingCosts[0].costValueType);
            }
          }

          // Load custom field values
          try {
            const fieldValues = await getCustomFieldValues('m', Number(id));
            const valuesMap: { [key: number]: string } = {};
            fieldValues.forEach(fv => {
              valuesMap[fv.customFieldId] = fv.value;
            });
            setCustomFieldValues(valuesMap);
            console.log('Loaded custom field values:', valuesMap);
          } catch (error) {
            console.error('Failed to load custom field values:', error);
          }
        } else {
          setError('Failed to load marketplace data');
        }
      } catch (err) {
        console.error('Error fetching marketplace:', err);
        setError('Failed to load marketplace data');
      } finally {
        setLoadingMarketplace(false);
      }
    };

    fetchMarketplace();
  }, [id]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Update all existing slabs when value type toggle changes
  const handleProductCostValueTypeChange = (newType: 'P' | 'A') => {
    console.log('=== COMMISSION VALUE TYPE CHANGE ===');
    console.log('New type:', newType, newType === 'P' ? '(Percentage)' : '(Amount)');
    setProductCostValueType(newType);
    setProductCostSlabs(prev => {
      const updated = prev.map(slab => ({ ...slab, valueType: newType }));
      console.log('Updated commission slabs:', updated);
      return updated;
    });
  };

  const handleMarketingValueTypeChange = (newType: 'P' | 'A') => {
    console.log('=== MARKETING VALUE TYPE CHANGE ===');
    console.log('New type:', newType, newType === 'P' ? '(Percentage)' : '(Amount)');
    setMarketingValueType(newType);
    setMarketingSlabs(prev => {
      const updated = prev.map(slab => ({ ...slab, valueType: newType }));
      console.log('Updated marketing slabs:', updated);
      return updated;
    });
  };

  const handleShippingValueTypeChange = (newType: 'P' | 'A') => {
    console.log('=== SHIPPING VALUE TYPE CHANGE ===');
    console.log('New type:', newType, newType === 'P' ? '(Percentage)' : '(Amount)');
    setShippingValueType(newType);
    setShippingSlabs(prev => {
      const updated = prev.map(slab => ({ ...slab, valueType: newType }));
      console.log('Updated shipping slabs:', updated);
      return updated;
    });
  };

  // Validate numeric input - only allow numbers and decimal point
  const validateNumericInput = (value: string): string => {
    return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  };

  const addProductCostSlab = () => {
    setProductCostSlabs(prev => [...prev, { from: '', to: '', value: '', valueType: productCostValueType }]);
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
    setMarketingSlabs(prev => [...prev, { from: '', to: '', value: '', valueType: marketingValueType }]);
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
    setShippingSlabs(prev => [...prev, { from: '', to: '', value: '', valueType: shippingValueType }]);
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

  const handleSubmit = async () => {
    if (!id) {
      setError('Marketplace ID is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Marketplace name is required');
        return;
      }
      
      // Prepare cost data
      const costs: UpdateMarketplaceCostRequest[] = [];
      
      console.log('=== PREPARING COSTS FOR UPDATE ===');
      console.log('Current productCostSlabs:', productCostSlabs);
      console.log('Current marketingSlabs:', marketingSlabs);
      console.log('Current shippingSlabs:', shippingSlabs);
      
      // Add product cost slabs (Commission)
      productCostSlabs.forEach((slab) => {
        if (slab.from && slab.to && slab.value) {
          console.log('Adding COMMISSION cost:', { valueType: slab.valueType, value: slab.value, range: `${slab.from}-${slab.to}` });
          costs.push({
            costCategory: 'COMMISSION',
            costValueType: slab.valueType,
            costValue: parseFloat(slab.value) || 0,
            costProductRange: `${slab.from}-${slab.to}`
          });
        }
      });
      
      // Add marketing slabs
      marketingSlabs.forEach((slab) => {
        if (slab.from && slab.to && slab.value) {
          console.log('Adding MARKETING cost:', { valueType: slab.valueType, value: slab.value, range: `${slab.from}-${slab.to}` });
          costs.push({
            costCategory: 'MARKETING',
            costValueType: slab.valueType,
            costValue: parseFloat(slab.value) || 0,
            costProductRange: `${slab.from}-${slab.to}`
          });
        }
      });
      
      // Add shipping slabs
      shippingSlabs.forEach((slab) => {
        if (slab.from && slab.to && slab.value) {
          console.log('Adding SHIPPING cost:', { valueType: slab.valueType, value: slab.value, range: `${slab.from}-${slab.to}` });
          costs.push({
            costCategory: 'SHIPPING',
            costValueType: slab.valueType,
            costValue: parseFloat(slab.value) || 0,
            costProductRange: `${slab.from}-${slab.to}`
          });
        }
      });
      
      const request: UpdateMarketplaceRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        enabled: formData.enabled,
        costs
      };
      
      console.log('Updating marketplace with data:', request);
      const response = await marketplaceService.updateMarketplace(Number(id), request);
      
      if (response.success) {
        console.log('✓ Marketplace updated successfully!');

        // Save custom field values
        try {
          await Promise.all(
            Object.entries(customFieldValues).map(async ([fieldId, value]) => {
              const trimmedValue = value.trim();
              if (trimmedValue) {
                await saveCustomFieldValue({
                  customFieldId: Number(fieldId),
                  module: 'm',
                  moduleId: Number(id),
                  value: trimmedValue
                });
              }
            })
          );
          console.log('Custom field values saved');
        } catch (fieldError) {
          console.error('Error saving custom field values:', fieldError);
          // Continue with navigation even if custom fields fail
        }

        navigate('/marketplaces');
      } else {
        setError(response.message || 'Failed to update marketplace');
      }
    } catch (err: any) {
      console.error('Error updating marketplace:', err);
      setError(err.response?.data?.message || 'Failed to update marketplace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingMarketplace) {
    return (
      <div className="edit-marketplace-bg">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Loading marketplace...
        </div>
      </div>
    );
  }

  return (
    <div className="edit-marketplace-bg">
      <main className="edit-marketplace-main">
        <header className="edit-marketplace-header">
          <button className="back-btn" onClick={() => navigate("/marketplaces")}> 
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="breadcrumb">Edit Marketplace</h2>

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
          <input 
            className="text-input" 
            placeholder="enter marketplace name" 
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
          <input 
            className="text-input" 
            placeholder="description" 
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
          />
          <label className="activate-row">
            <input 
              type="checkbox" 
              checked={formData.enabled}
              onChange={(e) => handleInputChange('enabled', e.target.checked)}
            />
            <span>Activate marketplace</span>
          </label>
        </div>

        <div className="grid-3">
          <div className="panel">
            <div className="panel-header">
              <span>Commission</span>
              <div className="panel-units">
                <span>%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={productCostValueType === 'A'}
                    onChange={(e) => handleProductCostValueTypeChange(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>
            <div className="panel-divider" />
            <div className="panel-columns" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
              <span>From cost</span>
              <span>To cost</span>
              <span>Value</span>
              <span></span>
            </div>
            {productCostSlabs.map((slab, index) => (
              <div className="panel-form-grid" key={index} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                <input 
                  className="small-input" 
                  placeholder="0" 
                  value={slab.from}
                  onChange={(e) => updateProductCostSlab(index, 'from', e.target.value)}
                />
                <input 
                  className="small-input" 
                  placeholder="1750" 
                  value={slab.to}
                  onChange={(e) => updateProductCostSlab(index, 'to', e.target.value)}
                />
                <input 
                  className="small-input" 
                  placeholder="10" 
                  value={slab.value}
                  onChange={(e) => updateProductCostSlab(index, 'value', e.target.value)}
                />
                {productCostSlabs.length > 1 && (
                  <button 
                    className="delete-btn" 
                    onClick={() => removeProductCostSlab(index)} 
                    type="button"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#C23939', fontSize: '20px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button className="link-btn" onClick={addProductCostSlab} type="button">+ Add slab</button>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span>Marketing</span>
              <div className="panel-units">
                <span>%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={marketingValueType === 'A'}
                    onChange={(e) => handleMarketingValueTypeChange(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>
            <div className="panel-divider" />
            <div className="panel-columns" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
              <span>From cost</span>
              <span>To cost</span>
              <span>Value</span>
              <span></span>
            </div>
            {marketingSlabs.map((slab, index) => (
              <div className="panel-form-grid" key={index} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                <input 
                  className="small-input" 
                  placeholder="0" 
                  value={slab.from}
                  onChange={(e) => updateMarketingSlab(index, 'from', e.target.value)}
                />
                <input 
                  className="small-input" 
                  placeholder="750" 
                  value={slab.to}
                  onChange={(e) => updateMarketingSlab(index, 'to', e.target.value)}
                />
                <input 
                  className="small-input" 
                  placeholder="100" 
                  value={slab.value}
                  onChange={(e) => updateMarketingSlab(index, 'value', e.target.value)}
                />
                {marketingSlabs.length > 1 && (
                  <button 
                    className="delete-btn" 
                    onClick={() => removeMarketingSlab(index)} 
                    type="button"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#C23939', fontSize: '20px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button className="link-btn" onClick={addMarketingSlab} type="button">+ Add slab</button>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span>Shipping</span>
              <div className="panel-units">
                <span>%</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={shippingValueType === 'A'}
                    onChange={(e) => handleShippingValueTypeChange(e.target.checked ? 'A' : 'P')}
                  />
                  <span className="slider" />
                </label>
                <span>Rs</span>
              </div>
            </div>
            <div className="panel-divider" />
            <div className="panel-columns" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
              <span>From cost</span>
              <span>To cost</span>
              <span>Value</span>
              <span></span>
            </div>
            {shippingSlabs.map((slab, index) => (
              <div className="panel-form-grid" key={index} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                <input 
                  className="small-input" 
                  placeholder="0" 
                  value={slab.from}
                  onChange={(e) => updateShippingSlab(index, 'from', e.target.value)}
                />
                <input 
                  className="small-input" 
                  placeholder="750" 
                  value={slab.to}
                  onChange={(e) => updateShippingSlab(index, 'to', e.target.value)}
                />
                <input 
                  className="small-input" 
                  placeholder="13" 
                  value={slab.value}
                  onChange={(e) => updateShippingSlab(index, 'value', e.target.value)}
                />
                {shippingSlabs.length > 1 && (
                  <button 
                    className="delete-btn" 
                    onClick={() => removeShippingSlab(index)} 
                    type="button"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#C23939', fontSize: '20px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button className="link-btn" onClick={addShippingSlab} type="button">+ Add slab</button>
          </div>
        </div>

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <div className="panel" style={{ marginTop: '32px' }}>
            <h3 className="panel-title">Custom Fields</h3>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '24px' }}>
              {customFields.map((field) => (
                <div key={field.id}>
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

        <div className="footer-actions">
          <button 
            className="cancel-btn" 
            onClick={() => navigate('/marketplaces')}
            type="button"
          >
            Cancel
          </button>
          <button 
            className="update-btn" 
            onClick={handleSubmit}
            disabled={loading}
            type="button"
          >
            {loading ? 'UPDATING...' : 'UPDATE'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default EditMarketplacePage;

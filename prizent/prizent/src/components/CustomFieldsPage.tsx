import React, { useState, useEffect } from 'react';
import './CustomFieldsPage.css';
import {
  createCustomField,
  getCustomFields,
  updateCustomField,
  deleteCustomField,
  toggleCustomField,
  CustomFieldResponse
} from '../services/customFieldService';

const CustomFieldsPage: React.FC = () => {
  // Form state
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [enableField, setEnableField] = useState(true);
  const [applyToProducts, setApplyToProducts] = useState(false);
  const [applyToCategories, setApplyToCategories] = useState(false);
  const [applyToMarketplaces, setApplyToMarketplaces] = useState(false);

  // Data state
  const [existingFields, setExistingFields] = useState<CustomFieldResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit mode state
  const [editingField, setEditingField] = useState<CustomFieldResponse | null>(null);

  // Fetch existing custom fields on component mount
  useEffect(() => {
    fetchCustomFields();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching custom fields...');
      const fields = await getCustomFields();
      console.log('Custom fields fetched:', fields);
      setExistingFields(fields);
      if (fields.length === 0) {
        console.log('No custom fields found');
      }
    } catch (err: any) {
      console.error('Error fetching custom fields:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load custom fields';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFieldName('');
    setFieldType('text');
    setFieldRequired(false);
    setEnableField(true);
    setApplyToProducts(false);
    setApplyToCategories(false);
    setApplyToMarketplaces(false);
    setEditingField(null);
  };

  const getSelectedModules = (): string[] => {
    const modules: string[] = [];
    if (applyToProducts) modules.push('p');
    if (applyToCategories) modules.push('c');
    if (applyToMarketplaces) modules.push('m');
    return modules;
  };

  const handleAddField = async () => {
    try {
      // Validation
      if (!fieldName.trim()) {
        setError('Field name is required');
        return;
      }

      const selectedModules = getSelectedModules();
      if (selectedModules.length === 0) {
        setError('Please select at least one module (Products, Categories, or Marketplaces)');
        return;
      }

      setLoading(true);
      setError(null);

      // Create custom field for each selected module
      const promises = selectedModules.map(module =>
        createCustomField({
          name: fieldName,
          fieldType: fieldType as any,
          module: module as any,
          required: fieldRequired,
          enabled: enableField
        })
      );

      await Promise.all(promises);
      
      setSuccessMessage(`Custom field "${fieldName}" created successfully for ${selectedModules.length} module(s)`);
      resetForm();
      await fetchCustomFields();
    } catch (err: any) {
      console.error('Error creating custom field:', err);
      setError(err.response?.data?.message || 'Failed to create custom field');
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (field: CustomFieldResponse) => {
    setEditingField(field);
    setFieldName(field.name);
    setFieldType(field.fieldType);
    setFieldRequired(field.required);
    setEnableField(field.enabled);
    
    // Set the module checkboxes based on the field's module
    setApplyToProducts(field.module === 'p');
    setApplyToCategories(field.module === 'c');
    setApplyToMarketplaces(field.module === 'm');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateField = async () => {
    if (!editingField) return;

    try {
      if (!fieldName.trim()) {
        setError('Field name is required');
        return;
      }

      setLoading(true);
      setError(null);

      await updateCustomField(editingField.id, {
        name: fieldName,
        fieldType: fieldType as any,
        required: fieldRequired
      });

      setSuccessMessage(`Custom field "${fieldName}" updated successfully`);
      resetForm();
      await fetchCustomFields();
    } catch (err: any) {
      console.error('Error updating custom field:', err);
      setError(err.response?.data?.message || 'Failed to update custom field');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (fieldId: number, fieldName: string) => {
    if (!window.confirm(`Are you sure you want to delete the custom field "${fieldName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteCustomField(fieldId);
      setSuccessMessage(`Custom field "${fieldName}" deleted successfully`);
      await fetchCustomFields();
    } catch (err: any) {
      console.error('Error deleting custom field:', err);
      setError(err.response?.data?.message || 'Failed to delete custom field');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (fieldId: number, currentStatus: boolean, fieldName: string) => {
    try {
      setLoading(true);
      setError(null);
      await toggleCustomField(fieldId, !currentStatus);
      setSuccessMessage(`Custom field "${fieldName}" ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      await fetchCustomFields();
    } catch (err: any) {
      console.error('Error toggling custom field:', err);
      setError(err.response?.data?.message || 'Failed to toggle custom field status');
    } finally {
      setLoading(false);
    }
  };

  const getModuleName = (moduleCode: string): string => {
    const moduleMap: { [key: string]: string } = {
      'p': 'Products',
      'c': 'Categories',
      'm': 'Marketplaces',
      'b': 'Brands'
    };
    return moduleMap[moduleCode] || moduleCode;
  };

  const getFieldTypeName = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'text': 'Text',
      'numeric': 'Number',
      'dropdown': 'Dropdown',
      'date': 'Date',
      'file': 'File'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="custom-fields-page">
      {/* Header */}
      <header className="page-header">
        <h2 className="breadcrumb">Configuration &gt; Custom Fields</h2>
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
              <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0ZM12.9615 2.12C12.2389 1.3974 11.2406 0.95043 10.1381 0.95043C9.0356 0.95043 8.03737 1.3974 7.31477 2.12C6.59217 2.8426 6.1452 3.84083 6.1452 4.94335C6.1452 6.04588 6.59217 7.04473 7.31477 7.76671C8.03737 8.48931 9.0356 8.93565 10.1381 8.93565C11.2406 8.93565 12.2389 8.48869 12.9615 7.76671C13.6841 7.04411 14.131 6.04588 14.131 4.94335C14.131 3.84083 13.6841 2.8426 12.9615 2.12ZM14.606 12.1377H5.6703C4.37223 12.1377 3.19272 12.6691 2.33665 13.5245C1.48121 14.38 0.949809 15.5601 0.949809 16.8576V19.0496H19.3264V16.8576C19.3264 15.5601 18.795 14.38 17.9396 13.5245C17.0841 12.6691 15.904 12.1377 14.606 12.1377Z" fill="white"/>
              <path d="M13.6338 1.44768L14.3409 0.740576L14.3407 0.740331L13.6338 1.44768ZM6.64246 8.4384L5.93535 9.14551L5.93559 9.14575L6.64246 8.4384ZM7.31477 7.76671L8.02188 7.0596L8.02157 7.0593L7.31477 7.76671ZM12.9615 7.76671L13.6683 8.47412L13.6686 8.47381L12.9615 7.76671ZM2.33665 13.5245L1.6298 12.8172L1.62955 12.8174L2.33665 13.5245ZM0.949809 19.0496H-0.050191V20.0496H0.949809V19.0496ZM19.3264 19.0496V20.0496H20.3264V19.0496H19.3264ZM5.6703 11.1873V12.1873H14.606V11.1873V10.1873H5.6703V11.1873ZM14.606 11.1873V12.1873C15.8879 12.1873 17.055 12.7108 17.9042 13.5599L18.6113 12.8528L19.3184 12.1457C18.1127 10.9401 16.4441 10.1873 14.606 10.1873V11.1873ZM18.6113 12.8528L17.9042 13.5599C18.7533 14.4091 19.2769 15.5762 19.2769 16.8582H20.2769H21.2769C21.2769 15.0201 20.5241 13.3514 19.3184 12.1457L18.6113 12.8528ZM20.2769 16.8582H19.2769V19.5251H20.2769H21.2769V16.8582H20.2769ZM20.2769 19.5251H19.2769C19.2769 19.2348 19.5117 19 19.802 19V20V21C20.6162 21 21.2769 20.3394 21.2769 19.5251H20.2769ZM19.802 20V19H0.474905V20V21H19.802V20ZM0.474905 20V19C0.765445 19 1 19.2356 1 19.5251H0H-1C-1 20.3385 -0.340825 21 0.474905 21V20ZM0 19.5251H1V16.8582H0H-1V19.5251H0ZM0 16.8582H1C1 15.5764 1.52342 14.4097 2.3729 13.5597L1.66558 12.8528L0.95826 12.1459C-0.247076 13.352 -1 15.0199 -1 16.8582H0ZM1.66558 12.8528L2.3729 13.5597C3.22177 12.7103 4.38869 12.1873 5.67092 12.1873V11.1873V10.1873C3.83306 10.1873 2.1642 10.9393 0.95826 12.1459L1.66558 12.8528ZM5.67092 11.1873V10.1873H5.6703V11.1873V12.1873H5.67092V11.1873ZM10.1381 0V1C11.2273 1 12.2115 1.44007 12.9269 2.15503L13.6338 1.44768L14.3407 0.740331C13.2658 -0.333818 11.7792 -1 10.1381 -1V0ZM13.6338 1.44768L12.9267 2.15479C13.6413 2.86943 14.0815 3.85404 14.0815 4.94273H15.0815H16.0815C16.0815 3.30243 15.4154 1.81505 14.3409 0.740576L13.6338 1.44768ZM15.0815 4.94273H14.0815C14.0815 6.03211 13.6413 7.0167 12.9267 7.73129L13.6338 8.4384L14.3409 9.14551C15.4154 8.07098 16.0815 6.58358 16.0815 4.94273H15.0815ZM13.6338 8.4384L12.9267 7.73129C12.2121 8.44589 11.2275 8.88608 10.1381 8.88608V9.88608V10.8861C11.779 10.8861 13.2664 10.22 14.3409 9.14551L13.6338 8.4384ZM10.1381 9.88608V8.88608C9.04893 8.88608 8.06478 8.44602 7.34932 7.73105L6.64246 8.4384L5.93559 9.14575C7.01049 10.2199 8.49708 10.8861 10.1381 10.8861V9.88608ZM6.64246 8.4384L7.34956 7.73129C6.63497 7.0167 6.19477 6.03211 6.19477 4.94273H5.19477H4.19477C4.19477 6.58358 4.86082 8.07098 5.93535 9.14551L6.64246 8.4384ZM5.19477 4.94273H6.19477C6.19477 3.85404 6.63492 2.86943 7.34956 2.15479L6.64246 1.44768L5.93535 0.740576C4.86087 1.81505 4.19477 3.30243 4.19477 4.94273H5.19477ZM6.64246 1.44768L7.34956 2.15479C8.06415 1.4402 9.04874 1 10.1381 1V0V-1C8.49727 -1 7.00987 -0.333949 5.93535 0.740576L6.64246 1.44768ZM12.9615 2.12L13.6686 1.41289C12.7661 0.510456 11.5166 -0.0495702 10.1381 -0.0495702V0.95043V1.95043C10.9647 1.95043 11.7116 2.28434 12.2544 2.82711L12.9615 2.12ZM10.1381 0.95043V-0.0495702C8.75969 -0.0495702 7.5101 0.510456 6.60766 1.41289L7.31477 2.12L8.02188 2.82711C8.56464 2.28434 9.31151 1.95043 10.1381 1.95043V0.95043ZM7.31477 2.12L6.60766 1.41289C5.70523 2.31533 5.1452 3.56492 5.1452 4.94335H6.1452H7.1452C7.1452 4.11674 7.47911 3.36987 8.02188 2.82711L7.31477 2.12ZM6.1452 4.94335H5.1452C5.1452 6.32155 5.70507 7.57199 6.60797 8.47412L7.31477 7.76671L8.02157 7.0593C7.47928 6.51746 7.1452 5.7702 7.1452 4.94335H6.1452ZM7.31477 7.76671L6.60766 8.47381C7.51039 9.37654 8.76008 9.93565 10.1381 9.93565V8.93565V7.93565C9.31112 7.93565 8.56435 7.60208 8.02188 7.0596L7.31477 7.76671ZM10.1381 8.93565V9.93565C11.5165 9.93565 12.766 9.37567 13.6683 8.47412L12.9615 7.76671L12.2547 7.0593C11.7118 7.6017 10.9648 7.93565 10.1381 7.93565V8.93565ZM12.9615 7.76671L13.6686 8.47381C14.571 7.57138 15.131 6.32179 15.131 4.94335H14.131H13.131C13.131 5.76997 12.7971 6.51684 12.2544 7.0596L12.9615 7.76671ZM14.131 4.94335H15.131C15.131 3.56492 14.571 2.31533 13.6686 1.41289L12.9615 2.12L12.2544 2.82711C12.7971 3.36987 13.131 4.11674 13.131 4.94335H14.131ZM14.606 12.1377V11.1377H5.6703V12.1377V13.1377H14.606V12.1377ZM5.6703 12.1377V11.1377C4.09375 11.1377 2.6637 11.784 1.6298 12.8172L2.33665 13.5245L3.0435 14.2319C3.72174 13.5542 4.6507 13.1377 5.6703 13.1377V12.1377ZM2.33665 13.5245L1.62955 12.8174C0.596056 13.8509 -0.050191 15.2818 -0.050191 16.8576H0.949809H1.94981C1.94981 15.8385 2.36636 14.909 3.04376 14.2316L2.33665 13.5245ZM0.949809 16.8576H-0.050191V19.0496H0.949809H1.94981V16.8576H0.949809ZM0.949809 19.0496V20.0496H19.3264V19.0496V18.0496H0.949809V19.0496ZM19.3264 19.0496H20.3264V16.8576H19.3264H18.3264V19.0496H19.3264ZM19.3264 16.8576H20.3264C20.3264 15.2818 19.6802 13.8509 18.6467 12.8174L17.9396 13.5245L17.2325 14.2316C17.9099 14.909 18.3264 15.8385 18.3264 16.8576H19.3264ZM17.9396 13.5245L18.6467 12.8174C17.6132 11.7839 16.1823 11.1377 14.606 11.1377V12.1377V13.1377C15.6257 13.1377 16.5551 13.5543 17.2325 14.2316L17.9396 13.5245Z" fill="#000000" mask="url(#path-1-inside-1_166_508)"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="alert alert-success">
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          ✗ {error}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="content-wrapper">
        {/* Top Section */}
        <div className="top-section">
          {/* Create Custom Field Card */}
          <div className="create-field-card">
            <h3 className="section-title">
              {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
            </h3>
            
            <div className="field-inputs-row">
              <div className="inputs-container">
                <input
                  type="text"
                  placeholder="enter field name"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="field-input"
                />
                
                <div className="select-wrapper">
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="field-select"
                  >
                    <option value="">field type</option>
                    <option value="text">Text</option>
                    <option value="numeric">Number</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="date">Date</option>
                    <option value="file">File</option>
                  </select>
                </div>
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                  />
                  <span>Field required</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={enableField}
                    onChange={(e) => setEnableField(e.target.checked)}
                  />
                  <span>Enable field</span>
                </label>
              </div>
            </div>
          </div>

          {/* Apply To Card */}
          <div className="apply-to-card">
            <h3 className="section-title">Apply to</h3>
            
            <div className="apply-options">
              <label className="apply-checkbox">
                <input
                  type="checkbox"
                  checked={applyToProducts}
                  onChange={(e) => setApplyToProducts(e.target.checked)}
                  disabled={editingField !== null}
                />
                <span>Products</span>
              </label>
              
              <label className="apply-checkbox">
                <input
                  type="checkbox"
                  checked={applyToCategories}
                  onChange={(e) => setApplyToCategories(e.target.checked)}
                  disabled={editingField !== null}
                />
                <span>Categories</span>
              </label>
              
              <label className="apply-checkbox">
                <input
                  type="checkbox"
                  checked={applyToMarketplaces}
                  onChange={(e) => setApplyToMarketplaces(e.target.checked)}
                  disabled={editingField !== null}
                />
                <span>Marketplaces</span>
              </label>
            </div>
            {editingField && (
              <p className="info-text">
                <small>Note: Module cannot be changed when editing</small>
              </p>
            )}
          </div>
        </div>

        {/* Add/Update Field Button */}
        <div className="button-row">
          {editingField ? (
            <>
              <button 
                className="add-field-btn" 
                onClick={handleUpdateField}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Field'}
              </button>
              <button 
                className="cancel-btn" 
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              className="add-field-btn" 
              onClick={handleAddField}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Field'}
            </button>
          )}
        </div>

        {/* Previously Added Fields Section */}
        <div className="previous-fields-section">
          <h3 className="section-title">Previously added custom fields</h3>
          
          {loading && existingFields.length === 0 ? (
            <div className="loading-state">Loading custom fields...</div>
          ) : existingFields.length === 0 ? (
            <div className="empty-state">
              No custom fields created yet. Create your first custom field above.
            </div>
          ) : (
            <div className="fields-table-container">
              <table className="fields-table">
                <thead>
                  <tr>
                    <th>Field Name</th>
                    <th>Field Type</th>
                    <th>Required</th>
                    <th>Apply to</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {existingFields.map((field) => (
                    <tr key={field.id}>
                      <td>{field.name}</td>
                      <td>{getFieldTypeName(field.fieldType)}</td>
                      <td>{field.required ? 'Yes' : 'No'}</td>
                      <td>{getModuleName(field.module)}</td>
                      <td>
                        <button
                          className={`status-badge ${field.enabled ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleStatus(field.id, field.enabled, field.name)}
                          disabled={loading}
                          title={`Click to ${field.enabled ? 'disable' : 'enable'}`}
                        >
                          {field.enabled ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleEditField(field)}
                            disabled={loading}
                            title="Edit custom field"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12.9143 0C12.1418 0 11.3694 0.292612 10.7809 0.880547L1.48058 10.1845C1.44913 10.2159 1.42726 10.2556 1.41632 10.2986L0.00812566 15.6873C-0.0144334 15.7734 0.01086 15.8643 0.0730658 15.9265C0.135273 15.9894 0.22619 16.014 0.312324 15.9922L5.70245 14.5838C5.74484 14.5729 5.7838 14.5503 5.81525 14.5196L15.1182 5.21773C16.2939 4.04182 16.2939 2.12692 15.1182 0.950983L15.0478 0.880567C14.4599 0.292613 13.6867 0.000701771 12.9143 0.000701771L12.9143 0ZM12.9143 0.496332C13.5575 0.496332 14.2022 0.742441 14.6951 1.2347L14.7634 1.30306C15.7485 2.28822 15.7485 3.87844 14.7634 4.86361L13.1549 6.47159L9.52723 2.84348L11.135 1.23482C11.6272 0.742585 12.2705 0.496458 12.9144 0.496458L12.9143 0.496332ZM9.17369 3.19685L12.8014 6.82496L5.50887 14.119L0.598061 15.4015L1.88252 10.4902L9.17369 3.19685Z" fill="#656565"/>
                            </svg>
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteField(field.id, field.name)}
                            disabled={loading}
                            title="Delete custom field"
                          >
                            <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5.55545 0C4.96388 0 4.47766 0.449134 4.47766 0.998756V1.55795H1.36658C0.615143 1.55795 0 2.12808 0 2.82538C0 3.45977 0.508322 3.98752 1.16547 4.07775L1.1662 13.8999C1.1662 15.06 2.18285 16 3.43369 16H11.5684C12.8193 16 13.8338 15.06 13.8338 13.8999L13.8345 4.07845C14.4924 3.9889 15 3.46047 15 2.82608C15 2.12878 14.3871 1.55865 13.6356 1.55865H10.5245V0.999456C10.5245 0.450517 10.0383 0.000699971 9.44601 0.000699971L5.55545 0ZM5.55545 0.499728H9.44599C9.74657 0.499728 9.98526 0.719168 9.98526 0.998091V1.55729L5.01689 1.55797V0.998775C5.01689 0.719851 5.25484 0.500412 5.55543 0.500412L5.55545 0.499728ZM1.36655 2.05768H13.6349C14.0975 2.05768 14.4622 2.39607 14.4622 2.82538C14.4622 3.25468 14.0975 3.59171 13.6349 3.59171H1.3673C0.904656 3.59171 0.539252 3.25468 0.539252 2.82538C0.539252 2.39607 0.904656 2.05768 1.3673 2.05768H1.36655ZM1.7047 4.09142L13.2975 4.0921V13.8999C13.2975 14.7914 12.5313 15.5016 11.5692 15.5016L3.43372 15.5023C2.47158 15.5023 1.70468 14.792 1.70468 13.9006L1.7047 4.09142ZM4.30091 6.66871C4.22945 6.66871 4.16093 6.69537 4.11084 6.74185C4.06001 6.78902 4.03201 6.85328 4.03201 6.91959V12.6743C4.03275 12.8124 4.15283 12.9231 4.30091 12.9238C4.37237 12.9238 4.44162 12.8978 4.49245 12.8514C4.54254 12.8042 4.57128 12.7406 4.57201 12.6743V6.9196C4.57201 6.8526 4.54328 6.78903 4.49319 6.74186C4.44235 6.69469 4.3731 6.66802 4.30091 6.66871ZM7.50119 6.66871C7.42973 6.66802 7.36048 6.69469 7.30965 6.74185C7.25882 6.78902 7.23082 6.8526 7.23082 6.91959V12.6743C7.23156 12.7406 7.26029 12.8042 7.31039 12.8513C7.36122 12.8978 7.42973 12.9238 7.50119 12.9238C7.64927 12.9231 7.76935 12.8117 7.77009 12.6743V6.91958C7.77009 6.85327 7.74209 6.7897 7.692 6.74253C7.64117 6.69536 7.57264 6.66871 7.50119 6.66871ZM10.6999 6.66871C10.6285 6.66871 10.56 6.69537 10.5091 6.74254C10.459 6.78971 10.431 6.85328 10.431 6.91959V12.6743C10.4318 12.8117 10.5519 12.9231 10.6999 12.9238C10.8488 12.9245 10.9696 12.8124 10.9703 12.6743V6.91959C10.9703 6.8526 10.9423 6.78902 10.8915 6.74186C10.8407 6.69469 10.7714 6.66802 10.6999 6.66871Z" fill="#656565"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomFieldsPage;

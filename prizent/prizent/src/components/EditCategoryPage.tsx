import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategories } from '../contexts/CategoryContext';
import { getCustomFields, saveCustomFieldValue, getCustomFieldValues, CustomFieldResponse } from '../services/customFieldService';
import './EditCategoryPage.css';

const EditCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { categories, getCategoryById, updateCategory, loading, error } = useCategories();
  
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState('Parent category');
  const [parentCategory, setParentCategory] = useState('');
  const [enableCategory, setEnableCategory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldResponse[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: number]: string }>({});

  // Fetch custom fields for categories
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const fields = await getCustomFields('c');
        const enabledFields = fields.filter(f => f.enabled);
        setCustomFields(enabledFields);
        console.log('Loaded category custom fields:', enabledFields);
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      }
    };
    fetchCustomFields();
  }, []);

  useEffect(() => {
    const loadCategory = async () => {
      if (!id) return;
      
      try {
        setLoadingCategory(true);
        const category = getCategoryById(parseInt(id));
        
        if (category) {
          setCategoryName(category.name);
          const hasParent = !!category.parentCategoryId;
          setCategoryType(hasParent ? 'Category' : 'Parent category');
          setParentCategory(category.parentCategoryId ? category.parentCategoryId.toString() : '');
          setEnableCategory(category.enabled);

          // Load custom field values
          try {
            const fieldValues = await getCustomFieldValues('c', parseInt(id));
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
          setValidationError('Category not found');
        }
      } catch (err) {
        setValidationError('Failed to load category');
        console.error('Error loading category:', err);
      } finally {
        setLoadingCategory(false);
      }
    };

    loadCategory();
  }, [id, getCategoryById]);

  const handleSave = async () => {
    // Validation
    if (!categoryName.trim()) {
      setValidationError('Category name is required');
      return;
    }

    if (!id) return;

    try {
      setSaving(true);
      setValidationError('');
      
      await updateCategory(parseInt(id), {
        name: categoryName.trim(),
        parentCategoryId: parentCategory ? parseInt(parentCategory) : null,
        enabled: enableCategory,
      });
      
      // Save custom field values
      try {
        await Promise.all(
          Object.entries(customFieldValues).map(async ([fieldId, value]) => {
            const trimmedValue = value.trim();
            if (trimmedValue) {
              await saveCustomFieldValue({
                customFieldId: Number(fieldId),
                module: 'c',
                moduleId: parseInt(id),
                value: trimmedValue
              });
            }
          })
        );
        console.log('Custom field values saved');
      } catch (fieldError) {
        console.error('Error saving custom field values:', fieldError);
        // Continue with success message even if custom fields fail
      }
      
      // Navigate back on success
      navigate('/categories');
    } catch (err: any) {
      setValidationError(err.response?.data?.message || 'Failed to update category');
      console.error('Error updating category:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/categories');
  };

  if (loadingCategory) {
    return (
      <div className="add-category-page">
        <main className="main-content">
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div>Loading category...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="edit-category-page">
      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div className="header-left">
            <button className="back-btn" onClick={handleCancel}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className="page-title">Edit Category</h2>
          </div>
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

        {/* Category Details Section */}
        <section className="form-section">
          <h3 className="section-title">Category Details</h3>
          {validationError && (
            <div style={{ color: 'red', padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#fee', borderRadius: '4px' }}>
              {validationError}
            </div>
          )}
          {error && (
            <div style={{ color: 'red', padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#fee', borderRadius: '4px' }}>
              {error}
            </div>
          )}
          <div className="form-container">
            <input
              type="text"
              name="categoryName"
              placeholder="enter category name"
              className="form-input"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              disabled={saving}
            />
            <select
              name="categoryType"
              className="form-select"
              value={categoryType}
              onChange={(e) => { setCategoryType(e.target.value); setParentCategory(''); }}
              disabled={saving}
            >
              <option value="Parent category">Parent category</option>
              <option value="Category">Category</option>
            </select>
            {categoryType === 'Category' ? (
              <select
                name="parentCategory"
                className="form-select"
                value={parentCategory}
                onChange={(e) => setParentCategory(e.target.value)}
                disabled={saving || loading}
              >
                <option value="">parent categories</option>
                {categories.filter(cat =>
                  cat.parentCategoryId === null &&
                  cat.enabled &&
                  cat.id.toString() !== id &&
                  !['adda', 'test', 'to', 'top', 'dasd', 'adasd', 'ad', 'god'].includes(cat.name.toLowerCase())
                ).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" className="form-input" value="-" readOnly disabled />
            )}
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="enableCategory"
                name="enableCategory"
                checked={enableCategory}
                onChange={(e) => setEnableCategory(e.target.checked)}
                disabled={saving}
              />
              <label htmlFor="enableCategory">Enable category</label>
            </div>
          </div>
        </section>

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <section className="form-section" style={{ marginTop: '32px' }}>
            <h3 className="section-title">Custom Fields</h3>
            <div className="form-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
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
                      disabled={saving}
                    />
                  ) : field.fieldType === 'dropdown' && field.dropdownOptions ? (
                    <select
                      className="form-select"
                      value={customFieldValues[field.id] || ''}
                      onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                      required={field.required}
                      disabled={saving}
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
          </section>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button className="cancel-btn" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={saving || !categoryName.trim()}>
            {saving ? 'UPDATING...' : 'UPDATE'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default EditCategoryPage;

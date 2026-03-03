import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddCategoryPage.css';
import { useCategories } from '../contexts/CategoryContext';
import { Category } from '../services/categoryService';

// A single row in the dynamic category creation chain
interface CategoryRow {
  rowId: string;
  name: string;
  parentId: number | null;
  savedId: number | null;       // set after a successful save
  savedName: string;            // name that was saved
  status: 'idle' | 'saving' | 'saved' | 'error';
  error: string;
}

let rowCounter = 0;
const makeRow = (parentId: number | null = null): CategoryRow => ({
  rowId: `row-${++rowCounter}`,
  name: '',
  parentId,
  savedId: null,
  savedName: '',
  status: 'idle',
  error: '',
});

const AddCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { createCategory, categories, fetchCategories } = useCategories();

  // rows = the dynamic list of category inputs
  const [rows, setRows] = useState<CategoryRow[]>([makeRow()]);
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  const [enabled, setEnabled] = useState(true);

  // All categories available in dropdowns: context categories + any we saved this session
  const [sessionCategories, setSessionCategories] = useState<Category[]>([]);

  // Merge context categories with session-saved ones (session ones may not yet be in context)
  const allAvailableCategories: Category[] = React.useMemo(() => {
    const ids = new Set(categories.map(c => c.id));
    const extras = sessionCategories.filter(c => !ids.has(c.id));
    return [...categories, ...extras].filter(c => c.enabled);
  }, [categories, sessionCategories]);

  // Update a single field on a row
  const updateRow = useCallback((rowId: string, patch: Partial<CategoryRow>) => {
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, ...patch } : r));
  }, []);

  // When parent is selected on the last row:
  // - if row has a name → auto-save it, then spawn new row with saved category as parent
  // - if row has no name → just spawn a blank new row
  const handleParentChange = useCallback(async (rowId: string, parentId: number | null) => {
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, parentId, error: '' } : r));
    if (parentId === null) return;

    const current = rowsRef.current;
    const row = current.find(r => r.rowId === rowId);
    if (!row || row.status === 'saved') return;
    if (current[current.length - 1].rowId !== rowId) return;

    if (!row.name.trim()) {
      setRows(prev => [...prev, makeRow()]);
      return;
    }

    // Has a name — auto-save then spawn new row with that category as parent
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, status: 'saving', error: '' } : r));
    try {
      const response = await createCategory(row.name.trim(), parentId, enabled);
      const savedCategory: Category = response?.category;
      if (!savedCategory?.id) throw new Error('No ID returned');
      setSessionCategories(prev => [...prev, savedCategory]);
      setRows(prev => [
        ...prev.map(r => r.rowId === rowId
          ? { ...r, status: 'saved' as const, savedId: savedCategory.id, savedName: row.name.trim(), parentId }
          : r),
        makeRow(),
      ]);
      fetchCategories();
    } catch (err: any) {
      setRows(prev => prev.map(r => r.rowId === rowId
        ? { ...r, status: 'idle' as const, error: err.response?.data?.message || 'Failed to save' }
        : r
      ));
      setRows(prev => [...prev, makeRow()]);
    }
  }, [createCategory, fetchCategories, enabled]);

  const handleSave = useCallback(async (rowId: string) => {
    setRows(prev => prev.map(r =>
      r.rowId === rowId ? { ...r, error: '' } : r
    ));

    const row = rows.find(r => r.rowId === rowId);
    if (!row) return;

    if (!row.name.trim()) {
      updateRow(rowId, { error: 'Category name is required' });
      return;
    }

    updateRow(rowId, { status: 'saving', error: '' });

    try {
      const response = await createCategory(row.name.trim(), row.parentId, enabled);
      const savedCategory: Category = response?.category;

      if (!savedCategory?.id) {
        throw new Error('Category was created but no ID was returned');
      }

      // Add to session cache so it's immediately available in subsequent dropdowns
      setSessionCategories(prev => [...prev, savedCategory]);

      // Mark this row as saved
      updateRow(rowId, {
        status: 'saved',
        savedId: savedCategory.id,
        savedName: row.name.trim(),
      });

      // Refresh context in background
      fetchCategories();
    } catch (err: any) {
      updateRow(rowId, {
        status: 'error',
        error: err.response?.data?.message || 'Failed to save category',
      });
    }
  }, [rows, createCategory, fetchCategories, updateRow]);

  const handleCancel = () => navigate('/categories');

  // Save ALL unsaved rows that have a name filled, then navigate
  const handleFinalSave = useCallback(async () => {
    const pending = rows.filter(r => r.status !== 'saved' && r.name.trim());
    for (const row of pending) {
      await handleSave(row.rowId);
    }
    navigate('/categories');
  }, [rows, handleSave, navigate]);

  // Find the parent name for display
  const getParentName = (parentId: number | null) => {
    if (!parentId) return null;
    return allAvailableCategories.find(c => c.id === parentId)?.name ?? `#${parentId}`;
  };

  return (
    <div className="add-category-page">
      <main className="main-content">
        <div className="scroll-area">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleCancel}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="page-title-main">Add Categories</h1>
          </div>
          <div className="header-actions">
            <button className="icon-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.85713 0.000114168C3.97542 0.000114168 0 3.97554 0 8.85724C0 13.7389 3.97542 17.7144 8.85713 17.7144C10.9899 17.7144 12.9497 16.9555 14.4811 15.6932L18.5368 19.7489C18.8717 20.0837 19.4141 20.0837 19.7489 19.7489C20.0837 19.4141 20.0837 18.8705 19.7489 18.5368L15.6932 14.4811C16.9555 12.9499 17.7144 10.99 17.7144 8.85713C17.7144 3.97542 13.7388 0.000114168 8.85713 0.000114168ZM8.85713 1.7144C12.8125 1.7144 16 4.90182 16 8.85724C16 12.8127 12.8125 16.0001 8.85713 16.0001C4.90171 16.0001 1.71428 12.8127 1.71428 8.85724C1.71428 4.90182 4.90171 1.7144 8.85713 1.7144Z" fill="#1E1E1E"/>
              </svg>
            </button>
            <button className="icon-btn">
              <svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.74966 0.25C6.66274 0.25 5.77627 1.13519 5.77627 2.22038V3.15169C3.34058 3.96277 1.58929 6.23466 1.58929 8.9187V14.0271L0.283816 16.7429C0.25865 16.7955 0.247214 16.8535 0.250574 16.9116C0.253933 16.9697 0.271978 17.026 0.303028 17.0753C0.334077 17.1246 0.37712 17.1652 0.428145 17.1934C0.47917 17.2216 0.536515 17.2364 0.594837 17.2366H4.71029V17.2493C4.71029 18.9083 6.07492 20.25 7.74966 20.25C9.4244 20.25 10.787 18.9083 10.787 17.2493V17.2366H14.9025C14.961 17.2369 15.0187 17.2224 15.0701 17.1944C15.1215 17.1664 15.1649 17.1258 15.1963 17.0765C15.2276 17.0271 15.2459 16.9706 15.2494 16.9123C15.2529 16.8539 15.2414 16.7957 15.2162 16.7429L13.91 14.0271V8.9187C13.91 6.23391 12.1578 3.96151 9.72103 3.15102V2.22038C9.72103 1.13519 8.83658 0.25 7.74966 0.25Z" fill="black" stroke="#1E1E1E" strokeWidth="0.5"/>
              </svg>
            </button>
            <button className="icon-btn profile-btn">
              <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.6703 11.1873H14.606C16.166 11.1873 17.5839 11.8254 18.6113 12.8528C19.6387 13.8802 20.2769 15.2981 20.2769 16.8582V19.5251C20.2769 19.7871 20.0639 20 19.802 20H0.474905C0.21231 20 0 19.7871 0 19.5251V16.8582C0 15.2981 0.638172 13.8809 1.66558 12.8528C2.69299 11.8248 4.11087 11.1873 5.67092 11.1873H5.6703ZM10.1381 0C11.5032 0 12.7386 0.553124 13.6338 1.44768C14.5284 2.34224 15.0815 3.57823 15.0815 4.94273C15.0815 6.30785 14.5284 7.54384 13.6338 8.4384C12.7392 9.33296 11.5032 9.88608 10.1381 9.88608C8.77301 9.88608 7.53763 9.33296 6.64246 8.4384C5.7479 7.54384 5.19477 6.30785 5.19477 4.94273C5.19477 3.57823 5.7479 2.34224 6.64246 1.44768C7.53701 0.553124 8.77301 0 10.1381 0Z" fill="white"/>
              </svg>
            </button>
          </div>
        </header>

        <div className="content-wrapper">
          <h2 className="section-title">Category Details</h2>
          <div className="brand-form" style={{ flexDirection: 'column', gap: '12px', padding: '30px 40px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {rows.map((row, index) => (
              <div
                key={row.rowId}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e0e4ea',
                  background: '#fff',
                }}
              >
                {/* Category Name */}
                <div className="form-field" style={{ flex: 1, margin: 0 }}>
                  <label className="field-label">Category Name</label>
                  <input
                    type="text"
                    placeholder="Enter category name"
                    className="form-input"
                    value={row.status === 'saved' ? row.savedName : row.name}
                    onChange={e => updateRow(row.rowId, {
                      name: e.target.value,
                      savedName: e.target.value,
                      status: 'idle',
                      error: ''
                    })}
                    disabled={row.status === 'saving'}
                    onKeyDown={e => e.key === 'Enter' && handleSave(row.rowId)}
                    autoFocus={index > 0}
                  />
                </div>

                {/* Parent Category */}
                <div className="form-field" style={{ flex: 1, margin: 0 }}>
                  <label className="field-label">Parent Category</label>
                  <select
                    className="form-select"
                    value={row.parentId ?? ''}
                    onChange={e => handleParentChange(row.rowId, e.target.value ? Number(e.target.value) : null)}
                    disabled={row.status === 'saving'}
                  >
                    <option value="">Parent Category</option>
                    {allAvailableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>


              </div>
            ))}

            {/* Error messages */}
            {rows.map(row =>
              row.error ? (
                <div
                  key={`err-${row.rowId}`}
                  style={{
                    color: '#c0392b',
                    fontSize: '13px',
                    padding: '6px 12px',
                    background: '#ffeaea',
                    borderRadius: '4px',
                  }}
                >
                  {row.error}
                </div>
              ) : null
            )}
          </div>

          <div className="activate-section">
            <input
              type="checkbox"
              id="activate-category"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            <label htmlFor="activate-category">Activate category</label>
          </div>
        </div>

          </div>{/* end content-wrapper */}
        </div>{/* end scroll-area */}

        {/* Action Buttons - always visible at bottom */}
        <div className="actions-footer">
            <button className="cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="save-btn"
              onClick={handleFinalSave}
              disabled={rows.some(r => r.status === 'saving')}
            >
              {rows.some(r => r.status === 'saving') ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
      </main>
    </div>
  );
};

export default AddCategoryPage;


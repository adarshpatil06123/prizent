import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ImportCategoriesPage.css';

// ── Types matching backend ImportResultDTO ──────────────────────────────────

interface ImportRowError {
  rowNumber: number;
  field: string;
  message: string;
}

interface ImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: ImportRowError[];
}

// ── Component ─────────────────────────────────────────────────────────────────

const ImportCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile]         = useState<File | null>(null);
  const [uploading, setUploading]               = useState(false);
  const [uploadProgress, setUploadProgress]     = useState(0);
  const [error, setError]                       = useState<string | null>(null);
  const [successMessage, setSuccessMessage]     = useState<string | null>(null);
  const [result, setResult]                     = useState<ImportResult | null>(null);
  const [dragActive, setDragActive]             = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const getToken = () =>
    localStorage.getItem('token') || sessionStorage.getItem('token') || '';

  const handleBack = () => navigate('/categories');

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const token = getToken();
      const res = await fetch('/api/admin/categories/import/template', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'categories_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template. Please try again.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleBrowseClick = () => fileInputRef.current?.click();

  const validateFile = (file: File): boolean => {
    const validExtensions = ['.xls', '.xlsx', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError('Please select a valid Excel (.xls, .xlsx) or CSV file');
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50 MB');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    setSuccessMessage(null);
    setResult(null);
    if (validateFile(file)) setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);
    setResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Please select a file to upload'); return; }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setResult(null);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return prev; }
        return prev + 10;
      });
    }, 300);

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/categories/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Server error ${res.status}`);
      }

      const data: ImportResult = await res.json();
      setResult(data);

      if (data.failedCount === 0) {
        setSuccessMessage(`All ${data.successCount} category(ies) imported successfully!`);
        setSelectedFile(null);
      } else if (data.successCount > 0) {
        setSuccessMessage(`${data.successCount} category(ies) imported. ${data.failedCount} row(s) had errors (see below).`);
        setSelectedFile(null);
      } else {
        setError(`Import failed — ${data.failedCount} row(s) had errors. No categories were saved.`);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="import-categories-page">
      <div className="import-main-content">
        <div className="scroll-area">

          {/* Header */}
          <header className="header">
            <div className="header-left">
              <button className="back-btn" type="button" onClick={handleBack}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h1 className="page-title">Import Excel</h1>
            </div>
            <button className="download-sample-btn" type="button" onClick={handleDownloadTemplate} disabled={downloadingTemplate}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1V11M8 11L11 8M8 11L5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 11V14C1 14.5523 1.44772 15 2 15H14C14.5523 15 15 14.5523 15 14V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {downloadingTemplate ? 'Downloading...' : 'Download Sample'}
            </button>
          </header>

          <div className="content-separator"></div>

          {/* Upload Section */}
          <div className="upload-container">
            <div className="upload-card">
              <h2 className="upload-title">Upload Excel / CSV File</h2>
              <p className="upload-subtitle">Download the sample template, fill in your category data, then upload it here.</p>

              {/* Drop Zone */}
              <div
                className={`drop-zone${dragActive ? ' active' : ''}${selectedFile ? ' has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {!selectedFile ? (
                  <>
                    <div className="drop-icon">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <path d="M20 4L20 26" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round"/>
                        <path d="M12 18L20 26L28 18" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 30V34C6 35.1046 6.89543 36 8 36H32C33.1046 36 34 35.1046 34 34V30" stroke="#BDBDBD" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="drop-text">Drag and drop your file here</p>
                    <p className="drop-or">or</p>
                    <button className="browse-btn" type="button" onClick={handleBrowseClick}>
                      Browse Files
                    </button>
                    <p className="drop-hint">Supported: .xls, .xlsx, .csv · Max 50 MB</p>
                  </>
                ) : (
                  <div className="selected-file">
                    <div className="file-icon">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path d="M18 2H8C6.89543 2 6 2.89543 6 4V28C6 29.1046 6.89543 30 8 30H24C25.1046 30 26 29.1046 26 28V10L18 2Z" fill="#4CAF50" stroke="#4CAF50" strokeWidth="2"/>
                        <path d="M18 2V10H26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="file-info">
                      <p className="file-name">{selectedFile.name}</p>
                      <p className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button className="remove-file-btn" type="button" onClick={handleRemoveFile}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 5L5 15M5 5L15 15" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="progress-text">{uploadProgress}% Uploaded</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="alert alert-error">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M10 6V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="10" cy="14" r="1" fill="currentColor"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Success */}
              {successMessage && (
                <div className="alert alert-success">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {successMessage}
                </div>
              )}

              {/* Error Table */}
              {result && result.errors && result.errors.length > 0 && (
                <div className="error-table-wrap">
                  <p className="error-table-title">Row Errors</p>
                  <div className="error-table-scroll">
                    <table className="error-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Field</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((err, i) => (
                          <tr key={i}>
                            <td className="err-row">#{err.rowNumber}</td>
                            <td className="err-field">{err.field}</td>
                            <td>{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="upload-actions">
                <button className="cancel-btn" type="button" onClick={handleBack} disabled={uploading}>
                  Cancel
                </button>
                <button
                  className="upload-btn"
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImportCategoriesPage;

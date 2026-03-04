import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ImportCategoriesPage.css';

const ImportCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleBack = () => {
    navigate('/categories');
  };

  const handleDownloadSample = () => {
    // Create a sample CSV/Excel file content
    const headers = ['Category Name', 'Parent Category ID', 'Enabled'];
    const sampleData = [
      ['Electronics', '', 'true'],
      ['Mobile Phones', '1', 'true'],
      ['Laptops', '1', 'true'],
      ['Clothing', '', 'true'],
      ['Men', '4', 'true'],
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'categories_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    const validExtensions = ['.xls', '.xlsx', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Please select a valid Excel (.xls, .xlsx) or CSV file');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size must be less than 5MB');
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    setSuccessMessage(null);

    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // TODO: Replace with actual API call
      // const response = await categoryService.importCategories(formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccessMessage(`File "${selectedFile.name}" uploaded successfully! Categories will be imported shortly.`);
      setSelectedFile(null);

      // Navigate back after success
      setTimeout(() => {
        navigate('/categories');
      }, 2000);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="import-categories-page">
      <main className="main-content">
        <div className="scroll-area">
          {/* Header */}
          <header className="header">
            <div className="header-left">
              <button className="back-btn" onClick={handleBack}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18L9 12L15 6" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h1 className="page-title">Import Excel</h1>
            </div>
            <button className="download-sample-btn" onClick={handleDownloadSample}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1V11M8 11L11 8M8 11L5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 11V14C1 14.5523 1.44772 15 2 15H14C14.5523 15 15 14.5523 15 14V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Download Sample
            </button>
          </header>

          <div className="content-separator"></div>

          {/* Upload Section */}
          <div className="upload-container">
            <div className="upload-card">
              <h2 className="upload-title">Upload Excel File</h2>
              <p className="upload-subtitle">Select or drag and drop your Excel file containing category data</p>

              {/* File Drop Zone */}
              <div 
                className={`drop-zone ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
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
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <path d="M24 4C22.8954 4 22 4.89543 22 6V22H6C4.89543 22 4 22.8954 4 24C4 25.1046 4.89543 26 6 26H22V42C22 43.1046 22.8954 44 24 44C25.1046 44 26 43.1046 26 42V26H42C43.1046 26 44 25.1046 44 24C44 22.8954 43.1046 22 42 22H26V6C26 4.89543 25.1046 4 24 4Z" fill="#E0E0E0"/>
                      </svg>
                    </div>
                    <p className="drop-text">Drag and drop file here</p>
                    <p className="drop-or">or</p>
                    <button className="browse-btn" onClick={handleBrowseClick}>
                      Browse Files
                    </button>
                    <p className="drop-hint">Supported formats: .xls, .xlsx, .csv (Max 5MB)</p>
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
                    <button className="remove-file-btn" onClick={handleRemoveFile}>
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

              {/* Error Message */}
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

              {/* Success Message */}
              {successMessage && (
                <div className="alert alert-success">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {successMessage}
                </div>
              )}

              {/* Upload Button */}
              <div className="upload-actions">
                <button className="cancel-btn" onClick={handleBack} disabled={uploading}>
                  Cancel
                </button>
                <button 
                  className="upload-btn" 
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ImportCategoriesPage;

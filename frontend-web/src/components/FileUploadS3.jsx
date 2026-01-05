/**
 * Composant d'Upload avec S3
 * Upload direct vers S3 avec URLs signées
 */

import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { useLanguage } from '../contexts/LanguageContext';

export default function FileUploadS3({ folderId, onUploadComplete, onError }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCurrentFile(file);
    setUploading(true);
    setProgress(0);

    try {
      // Décider entre upload simple ou multipart
      const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100 MB
      
      let fileRecord;
      
      if (file.size > LARGE_FILE_THRESHOLD) {
        // Upload multipart pour gros fichiers
        fileRecord = await storageService.uploadFileMultipart(file, {
          folderId,
          chunkSize: 5 * 1024 * 1024, // 5 MB par chunk
          onProgress: (uploaded, total) => {
            setProgress((uploaded / total) * 100);
          }
        });
      } else {
        // Upload simple
        fileRecord = await storageService.uploadFile(file, {
          folderId,
          onProgress: (uploaded, total) => {
            setProgress((uploaded / total) * 100);
          }
        });
      }

      setProgress(100);
      onUploadComplete?.(fileRecord);
      
      // Reset
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setCurrentFile(null);
        event.target.value = ''; // Reset input
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
        id="file-upload-s3"
      />
      <label
        htmlFor="file-upload-s3"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: uploading ? '#ccc' : '#2196F3',
          color: 'white',
          borderRadius: '8px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}
      >
        {uploading ? `⏳ ${t('uploading')}... ${Math.round(progress)}%` : `📤 ${t('uploadFile')}`}
      </label>
      
      {uploading && currentFile && (
        <div style={{ marginTop: '8px' }}>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {currentFile.name} - {Math.round(progress)}%
          </div>
        </div>
      )}
    </div>
  );
}


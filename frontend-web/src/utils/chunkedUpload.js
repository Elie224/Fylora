/**
 * Utilitaire pour upload en chunks
 * Permet d'uploader de gros fichiers par morceaux pour meilleure performance
 */
import apiClient from '../services/api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB par chunk

export class ChunkedUploader {
  constructor(file, options = {}) {
    this.file = file;
    this.chunkSize = options.chunkSize || CHUNK_SIZE;
    this.chunkId = options.chunkId || `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.uploadedChunks = 0;
  }

  async upload() {
    try {
      // Uploader tous les chunks
      for (let i = 0; i < this.totalChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);

        await this.uploadChunk(chunk, i);
        this.uploadedChunks++;
        
        // Appeler le callback de progression
        const progress = (this.uploadedChunks / this.totalChunks) * 100;
        this.onProgress(progress);
      }

      // Finaliser l'upload
      await this.finalize();
      this.onComplete();
    } catch (error) {
      this.onError(error);
      throw error;
    }
  }

  async uploadChunk(chunk, chunkIndex) {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkId', this.chunkId);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', this.totalChunks);
    formData.append('originalFilename', this.file.name);
    formData.append('mimeType', this.file.type);

    const response = await apiClient.post('/chunked-upload/chunk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const chunkProgress = (progressEvent.loaded / progressEvent.total) * 100;
        const totalProgress = ((this.uploadedChunks + chunkProgress / 100) / this.totalChunks) * 100;
        this.onProgress(totalProgress);
      },
    });

    return response.data;
  }

  async finalize(folderId = null) {
    const response = await apiClient.post('/chunked-upload/finalize', {
      chunkId: this.chunkId,
      originalFilename: this.file.name,
      mimeType: this.file.type,
      folder_id: folderId,
    });

    return response.data;
  }
}

// Fonction helper pour upload simple
export async function uploadFileInChunks(file, options = {}) {
  const uploader = new ChunkedUploader(file, options);
  return await uploader.upload();
}



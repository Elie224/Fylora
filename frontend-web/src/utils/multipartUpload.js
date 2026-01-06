/**
 * Utilitaire pour Upload Multipart
 * Gère l'upload de gros fichiers avec chunks et résume
 */

import apiClient from '../services/api';

class MultipartUploader {
  constructor(file, options = {}) {
    this.file = file;
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5 MB par défaut
    this.maxConcurrent = options.maxConcurrent || 3; // 3 chunks en parallèle
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
    this.onComplete = options.onComplete || (() => {});
    
    this.uploadId = null;
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.uploadedChunks = [];
    this.uploadedBytes = 0;
    this.isPaused = false;
    this.isCancelled = false;
  }

  /**
   * Calculer le hash SHA-256 d'un chunk (Web Crypto API)
   */
  async calculateHash(chunk) {
    const arrayBuffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Lire un chunk du fichier
   */
  readChunk(chunkIndex) {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    return this.file.slice(start, end);
  }

  /**
   * Uploader un chunk
   */
  async uploadChunk(chunkIndex) {
    if (this.isCancelled || this.isPaused) {
      return;
    }

    try {
      const chunk = this.readChunk(chunkIndex);
      const chunkHash = await this.calculateHash(chunk);
      
      // Convertir le chunk en base64
      const chunkBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result;
          const bytes = new Uint8Array(arrayBuffer);
          const binary = String.fromCharCode.apply(null, bytes);
          resolve(btoa(binary));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(chunk);
      });

      const response = await apiClient.post(`/multipart/chunk/${this.uploadId}`, {
        chunkIndex,
        chunkHash,
        chunk: chunkBase64, // Le backend attend 'chunk' en base64
      });

      this.uploadedChunks.push({
        index: chunkIndex,
        hash: chunkHash,
      });

      this.uploadedBytes += chunk.size;
      const progress = (this.uploadedBytes / this.file.size) * 100;
      this.onProgress(progress, this.uploadedBytes, this.file.size);

      return response.data;
    } catch (err) {
      this.onError(err, chunkIndex);
      throw err;
    }
  }

  /**
   * Uploader tous les chunks
   */
  async uploadAllChunks() {
    const chunksToUpload = [];
    for (let i = 0; i < this.totalChunks; i++) {
      if (!this.uploadedChunks.find(c => c.index === i)) {
        chunksToUpload.push(i);
      }
    }

    // Uploader par batch (maxConcurrent en parallèle)
    for (let i = 0; i < chunksToUpload.length; i += this.maxConcurrent) {
      if (this.isCancelled || this.isPaused) {
        break;
      }

      const batch = chunksToUpload.slice(i, i + this.maxConcurrent);
      await Promise.all(
        batch.map(chunkIndex => this.uploadChunk(chunkIndex))
      );
    }
  }

  /**
   * Démarrer l'upload
   */
  async start() {
    try {
      // 1. Initialiser l'upload
      const initResponse = await apiClient.post('/multipart/initiate', {
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type,
      });

      const responseData = initResponse.data.data || initResponse.data;
      this.uploadId = responseData.uploadId;
      this.totalChunks = responseData.totalChunks || this.totalChunks;

      // 2. Uploader tous les chunks
      await this.uploadAllChunks();

      if (this.isCancelled) {
        await this.cancel();
        return;
      }

      // 3. Finaliser l'upload
      const finalizeResponse = await apiClient.post(`/multipart/finalize/${this.uploadId}`);
      
      const finalData = finalizeResponse.data.data || finalizeResponse.data;
      this.onComplete(finalData);
      return finalData;
    } catch (err) {
      this.onError(err);
      throw err;
    }
  }

  /**
   * Reprendre l'upload (après pause)
   */
  async resume() {
    if (!this.uploadId) {
      throw new Error('Upload not initialized');
    }

    this.isPaused = false;
    await this.uploadAllChunks();

    if (!this.isCancelled) {
      const finalizeResponse = await apiClient.post(`/multipart/finalize/${this.uploadId}`);
      const finalData = finalizeResponse.data.data || finalizeResponse.data;
      this.onComplete(finalData);
      return finalData;
    }
  }

  /**
   * Mettre en pause
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Annuler l'upload
   */
  async cancel() {
    this.isCancelled = true;
    if (this.uploadId) {
      try {
        await apiClient.delete(`/multipart/cancel/${this.uploadId}`);
      } catch (err) {
        console.error('Error cancelling upload:', err);
      }
    }
  }

  /**
   * Obtenir le statut
   */
  async getStatus() {
    if (!this.uploadId) {
      return null;
    }

    try {
      const response = await apiClient.get(`/multipart/status/${this.uploadId}`);
      return response.data.data || response.data;
    } catch (err) {
      return null;
    }
  }
}

export default MultipartUploader;


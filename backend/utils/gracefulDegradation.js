/**
 * Graceful Degradation
 * Fallbacks intelligents quand un service est indisponible
 */

const logger = require('../utils/logger');
const { circuitBreakers } = require('./circuitBreaker');
const { retryWithBackoff } = require('./retry');

/**
 * Wrapper pour ElasticSearch avec fallback MongoDB
 */
async function searchWithFallback(query, userId, options = {}) {
  const searchService = require('../services/searchService');
  const FileModel = require('../models/fileModel');

  try {
    // Essayer ElasticSearch avec circuit breaker
    return await circuitBreakers.elasticsearch.execute(
      () => searchService.search(query, userId, options)
    );
  } catch (elasticsearchError) {
    logger.logWarn('ElasticSearch unavailable, falling back to MongoDB', {
      error: elasticsearchError.message,
      query,
    });

    // Fallback vers MongoDB
    try {
      return await searchService.mongoFallbackSearch(query, userId, options);
    } catch (mongoError) {
      logger.logError(mongoError, {
        context: 'search_fallback_failed',
        query,
      });
      throw new Error('Search service unavailable');
    }
  }
}

/**
 * Wrapper pour Cloudinary avec fallback local
 */
async function uploadWithFallback(fileBuffer, fileName, userId, mimeType) {
  const cloudinaryService = require('../services/cloudinaryService');
  const fs = require('fs').promises;
  const path = require('path');
  const config = require('../config');
  const { v4: uuidv4 } = require('uuid');

  try {
    // Essayer Cloudinary avec circuit breaker
    return await circuitBreakers.cloudinary.execute(
      () => cloudinaryService.uploadFile(fileBuffer, fileName, userId, mimeType)
    );
  } catch (cloudinaryError) {
    logger.logWarn('Cloudinary unavailable, falling back to local storage', {
      error: cloudinaryError.message,
      fileName,
    });

    // Fallback vers stockage local
    try {
      const uploadDir = path.resolve(config.upload.uploadDir);
      const userDir = path.join(uploadDir, userId);
      await fs.mkdir(userDir, { recursive: true });

      const fileExtension = fileName.split('.').pop() || '';
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const filePath = path.join(userDir, uniqueFileName);

      await fs.writeFile(filePath, fileBuffer);

      return {
        fileKey: filePath,
        url: `/uploads/${userId}/${uniqueFileName}`,
        size: fileBuffer.length,
        format: fileExtension,
      };
    } catch (localError) {
      logger.logError(localError, {
        context: 'upload_fallback_failed',
        fileName,
      });
      throw new Error('Storage service unavailable');
    }
  }
}

/**
 * Wrapper pour Redis avec fallback mémoire
 */
async function cacheWithFallback(key, getter, ttl = 300) {
  const redisCache = require('./redisCache');
  const memoryCache = new Map();
  const memoryCacheTTL = new Map();

  try {
    // Essayer Redis avec circuit breaker
    return await circuitBreakers.redis.execute(async () => {
      // Vérifier le cache Redis
      const cached = await redisCache.get(key);
      if (cached) {
        return cached;
      }

      // Obtenir la valeur
      const value = await getter();

      // Mettre en cache
      await redisCache.set(key, value, ttl);

      return value;
    });
  } catch (redisError) {
    logger.logWarn('Redis unavailable, using memory cache', {
      error: redisError.message,
      key,
    });

    // Fallback vers cache mémoire
    const ttlTimestamp = memoryCacheTTL.get(key);
    if (ttlTimestamp && Date.now() < ttlTimestamp) {
      return memoryCache.get(key);
    }

    // Obtenir la valeur
    const value = await getter();

    // Mettre en cache mémoire
    memoryCache.set(key, value);
    memoryCacheTTL.set(key, Date.now() + (ttl * 1000));

    // Nettoyer le cache mémoire périodiquement
    if (memoryCache.size > 10000) {
      const now = Date.now();
      for (const [k, ttl] of memoryCacheTTL.entries()) {
        if (now >= ttl) {
          memoryCache.delete(k);
          memoryCacheTTL.delete(k);
        }
      }
    }

    return value;
  }
}

/**
 * Wrapper pour OCR avec fallback (upload OK même si OCR échoue)
 */
async function processFileWithOCR(fileBuffer, mimeType, options = {}) {
  const ocrService = require('../services/ocrService');

  // Si OCR n'est pas disponible, continuer quand même
  if (!ocrService.isAvailable()) {
    logger.logWarn('OCR service not available, skipping OCR processing');
    return null;
  }

  try {
    return await retryWithBackoff(
      () => ocrService.processFile(fileBuffer, mimeType, options),
      {
        maxRetries: 2,
        shouldRetry: (error) => {
          // Retry seulement sur erreurs temporaires
          return error.message?.includes('timeout') ||
                 error.message?.includes('ECONNREFUSED');
        },
      }
    );
  } catch (ocrError) {
    // OCR échoue mais on continue quand même (graceful degradation)
    logger.logWarn('OCR processing failed, continuing without OCR', {
      error: ocrError.message,
    });
    return null;
  }
}

/**
 * Wrapper pour MongoDB avec retry
 */
async function mongoWithRetry(operation, options = {}) {
  const mongoose = require('mongoose');

  return retryWithBackoff(
    async () => {
      // Vérifier la connexion
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }

      return await operation();
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        return error.message?.includes('not connected') ||
               error.message?.includes('timeout') ||
               error.code === 'ECONNREFUSED';
      },
      ...options,
    }
  );
}

module.exports = {
  searchWithFallback,
  uploadWithFallback,
  cacheWithFallback,
  processFileWithOCR,
  mongoWithRetry,
};



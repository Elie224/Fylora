/**
 * Moteur de recherche optimisé avec indexation async
 */
const FileModel = require('../models/fileModel');
const FileMetadata = require('../models/FileMetadata');
const smartCache = require('../utils/smartCache');
const fileIntelligenceService = require('./fileIntelligenceService');
const mongoose = require('mongoose');

class SearchEngine {
  constructor() {
    this.indexingQueue = [];
    this.isIndexing = false;
  }

  /**
   * Recherche optimisée avec cache
   */
  async search(userId, query, options = {}) {
    // Vérifier le cache d'abord
    const cacheKey = `${userId}:${query}:${JSON.stringify(options)}`;
    const cached = await smartCache.getCachedSearch(userId, cacheKey);
    if (cached) {
      return cached;
    }

    const {
      limit = 50,
      offset = 0,
      type = null, // file, folder, all
      mimeType = null,
      dateFrom = null,
      dateTo = null,
    } = options;

    // Recherche dans les fichiers
    const fileResults = await this.searchFiles(userId, query, {
      limit,
      offset,
      mimeType,
      dateFrom,
      dateTo,
    });

    // Recherche dans les métadonnées (OCR, mots-clés)
    const metadataResults = await this.searchMetadata(userId, query, {
      limit: limit - fileResults.length,
      offset: 0,
    });

    // Combiner et dédupliquer
    const results = this.mergeResults(fileResults, metadataResults);

    // Mettre en cache (TTL dynamique selon popularité)
    const ttl = query.length > 10 ? 1800 : 600; // Requêtes longues = cache plus long
    await smartCache.cacheSearch(userId, cacheKey, results, ttl);

    return results;
  }

  /**
   * Recherche dans les fichiers
   */
  async searchFiles(userId, query, options = {}) {
    const File = mongoose.models.File || mongoose.model('File');
    
    const matchQuery = {
      owner_id: new mongoose.Types.ObjectId(userId),
      is_deleted: false,
    };

    if (query) {
      matchQuery.name = { $regex: query, $options: 'i' };
    }

    if (options.mimeType) {
      matchQuery.mime_type = options.mimeType;
    }

    if (options.dateFrom || options.dateTo) {
      matchQuery.updated_at = {};
      if (options.dateFrom) matchQuery.updated_at.$gte = new Date(options.dateFrom);
      if (options.dateTo) matchQuery.updated_at.$lte = new Date(options.dateTo);
    }

    const files = await File.find(matchQuery)
      .select('name size mime_type updated_at folder_id')
      .lean()
      .limit(options.limit || 50)
      .skip(options.offset || 0)
      .sort({ updated_at: -1 });

    return files.map(f => FileModel.toDTO(f));
  }

  /**
   * Recherche dans les métadonnées (OCR, mots-clés)
   */
  async searchMetadata(userId, query, options = {}) {
    if (!query) return [];

    const File = mongoose.models.File || mongoose.model('File');
    
    const metadataResults = await FileMetadata.find({
      user_id: new mongoose.Types.ObjectId(userId),
      $or: [
        { ocr_text: { $regex: query, $options: 'i' } },
        { 'keywords.keyword': { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
      ],
    })
      .select('file_id')
      .limit(options.limit || 50)
      .lean();

    const fileIds = metadataResults.map(m => m.file_id);
    if (fileIds.length === 0) return [];

    const files = await File.find({
      _id: { $in: fileIds },
      is_deleted: false,
    })
      .select('name size mime_type updated_at folder_id')
      .lean();

    return files.map(f => FileModel.toDTO(f));
  }

  /**
   * Fusionner les résultats en dédupliquant
   */
  mergeResults(fileResults, metadataResults) {
    const seen = new Set();
    const merged = [];

    // Ajouter les résultats de fichiers
    fileResults.forEach(file => {
      if (!seen.has(file.id)) {
        seen.add(file.id);
        merged.push({ ...file, source: 'filename' });
      }
    });

    // Ajouter les résultats de métadonnées
    metadataResults.forEach(file => {
      if (!seen.has(file.id)) {
        seen.add(file.id);
        merged.push({ ...file, source: 'content' });
      }
    });

    return merged;
  }

  /**
   * Indexer un fichier de manière asynchrone
   */
  async indexFileAsync(fileId, userId, filePath, mimeType) {
    // Ajouter à la queue d'indexation
    this.indexingQueue.push({ fileId, userId, filePath, mimeType });
    
    // Traiter si pas déjà en cours
    if (!this.isIndexing) {
      this.processIndexingQueue();
    }
  }

  /**
   * Traiter la queue d'indexation
   */
  async processIndexingQueue() {
    if (this.isIndexing || this.indexingQueue.length === 0) {
      return;
    }

    this.isIndexing = true;

    while (this.indexingQueue.length > 0) {
      const job = this.indexingQueue.shift();
      try {
        // Traitement intelligent en arrière-plan
        await fileIntelligenceService.processFile(
          job.fileId,
          job.userId,
          job.filePath,
          job.mimeType
        );
      } catch (error) {
        console.error('Indexing error:', error);
      }
    }

    this.isIndexing = false;
  }

  /**
   * Autocomplete pour recherche
   */
  async autocomplete(userId, prefix, limit = 10) {
    const File = mongoose.models.File || mongoose.model('File');
    
    const files = await File.find({
      owner_id: new mongoose.Types.ObjectId(userId),
      is_deleted: false,
      name: { $regex: `^${prefix}`, $options: 'i' },
    })
      .select('name mime_type')
      .limit(limit)
      .lean();

    return files.map(f => ({
      name: f.name,
      type: f.mime_type,
    }));
  }
}

module.exports = new SearchEngine();



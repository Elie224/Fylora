/**
 * Service de recherche par phrase naturelle
 */
const FileModel = require('../models/fileModel');
const FileMetadata = require('../models/FileMetadata');
const mongoose = require('mongoose');

class NaturalSearchService {
  /**
   * Rechercher avec une phrase naturelle
   */
  async search(userId, naturalQuery) {
    try {
      // Parser la requête naturelle
      const parsedQuery = this.parseNaturalQuery(naturalQuery);
      
      // Construire la requête MongoDB
      const searchQuery = this.buildSearchQuery(userId, parsedQuery);
      
      // Rechercher dans les fichiers
      const files = await FileModel.search(userId, searchQuery.textQuery, {
        mimeType: searchQuery.filters.mimeType,
        dateFrom: searchQuery.filters.dateFrom,
        dateTo: searchQuery.filters.dateTo,
        sortBy: searchQuery.sortBy,
        sortOrder: searchQuery.sortOrder,
        limit: searchQuery.limit,
      });

      // Rechercher aussi dans les métadonnées (OCR, mots-clés)
      const metadataFiles = await this.searchInMetadata(userId, parsedQuery);
      
      // Combiner et dédupliquer
      const fileMap = new Map();
      files.forEach(file => fileMap.set(file.id, file));
      metadataFiles.forEach(file => {
        if (!fileMap.has(file.id)) {
          fileMap.set(file.id, file);
        }
      });

      return Array.from(fileMap.values());
    } catch (error) {
      console.error('Error in natural search:', error);
      throw error;
    }
  }

  /**
   * Parser une requête naturelle
   */
  parseNaturalQuery(query) {
    const lowerQuery = query.toLowerCase();
    const parsed = {
      text: query,
      filters: {},
      sortBy: 'updated_at',
      sortOrder: 'desc',
      dateRange: null,
      fileTypes: [],
    };

    // Détecter les types de fichiers
    const typePatterns = {
      images: ['image', 'photo', 'picture', 'img'],
      videos: ['video', 'movie', 'film'],
      documents: ['document', 'pdf', 'doc', 'text'],
      audio: ['audio', 'music', 'sound', 'mp3'],
    };

    Object.entries(typePatterns).forEach(([type, keywords]) => {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        parsed.fileTypes.push(type);
      }
    });

    // Détecter les plages de dates
    const datePatterns = [
      { pattern: /(today|aujourd'hui)/i, days: 0 },
      { pattern: /(yesterday|hier)/i, days: 1 },
      { pattern: /(last week|semaine dernière)/i, days: 7 },
      { pattern: /(last month|mois dernier)/i, days: 30 },
      { pattern: /(this year|cette année)/i, days: 365 },
    ];

    for (const { pattern, days } of datePatterns) {
      if (pattern.test(query)) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        parsed.dateRange = { from: date };
        break;
      }
    }

    // Détecter le tri
    if (lowerQuery.includes('recent') || lowerQuery.includes('récent')) {
      parsed.sortBy = 'updated_at';
      parsed.sortOrder = 'desc';
    } else if (lowerQuery.includes('old') || lowerQuery.includes('ancien')) {
      parsed.sortBy = 'updated_at';
      parsed.sortOrder = 'asc';
    } else if (lowerQuery.includes('large') || lowerQuery.includes('gros')) {
      parsed.sortBy = 'size';
      parsed.sortOrder = 'desc';
    } else if (lowerQuery.includes('small') || lowerQuery.includes('petit')) {
      parsed.sortBy = 'size';
      parsed.sortOrder = 'asc';
    }

    return parsed;
  }

  /**
   * Construire la requête de recherche
   */
  buildSearchQuery(userId, parsedQuery) {
    const searchQuery = {
      textQuery: parsedQuery.text,
      filters: {},
      sortBy: parsedQuery.sortBy,
      sortOrder: parsedQuery.sortOrder,
      limit: 50,
    };

    // Filtrer par type MIME
    if (parsedQuery.fileTypes.includes('images')) {
      searchQuery.filters.mimeType = 'image/';
    } else if (parsedQuery.fileTypes.includes('videos')) {
      searchQuery.filters.mimeType = 'video/';
    } else if (parsedQuery.fileTypes.includes('documents')) {
      searchQuery.filters.mimeType = 'application/pdf';
    } else if (parsedQuery.fileTypes.includes('audio')) {
      searchQuery.filters.mimeType = 'audio/';
    }

    // Filtrer par date
    if (parsedQuery.dateRange) {
      searchQuery.filters.dateFrom = parsedQuery.dateRange.from.toISOString();
    }

    return searchQuery;
  }

  /**
   * Rechercher dans les métadonnées (OCR, mots-clés)
   */
  async searchInMetadata(userId, parsedQuery) {
    try {
      const File = mongoose.models.File || mongoose.model('File');
      const searchText = parsedQuery.text.toLowerCase();

      // Rechercher dans les métadonnées
      const metadataResults = await FileMetadata.find({
        user_id: new mongoose.Types.ObjectId(userId),
        $or: [
          { ocr_text: { $regex: searchText, $options: 'i' } },
          { 'keywords.keyword': { $regex: searchText, $options: 'i' } },
          { summary: { $regex: searchText, $options: 'i' } },
        ],
      }).select('file_id').lean();

      const fileIds = metadataResults.map(m => m.file_id);

      if (fileIds.length === 0) {
        return [];
      }

      // Récupérer les fichiers
      const files = await File.find({
        _id: { $in: fileIds },
        is_deleted: false,
      }).lean();

      return files.map(f => FileModel.toDTO(f));
    } catch (error) {
      console.error('Error searching in metadata:', error);
      return [];
    }
  }
}

module.exports = new NaturalSearchService();



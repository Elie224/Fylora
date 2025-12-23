/**
 * Optimiseur de requêtes MongoDB
 * Évite les SELECT *, utilise les projections, optimise les requêtes
 */
const mongoose = require('mongoose');

class QueryOptimizer {
  /**
   * Optimiser une requête avec projection minimale
   */
  static optimizeQuery(query, fields = []) {
    if (fields.length > 0) {
      const projection = {};
      fields.forEach(field => {
        projection[field] = 1;
      });
      // Toujours inclure _id
      projection._id = 1;
      return query.select(projection);
    }
    return query;
  }

  /**
   * Requête optimisée pour liste de fichiers
   */
  static getFileListQuery(userId, folderId = null, options = {}) {
    const File = mongoose.models.File || mongoose.model('File');
    const query = File.find({
      owner_id: new mongoose.Types.ObjectId(userId),
      folder_id: folderId ? new mongoose.Types.ObjectId(folderId) : null,
      is_deleted: false,
    });

    // Projection minimale pour liste
    const fields = ['name', 'size', 'mime_type', 'created_at', 'updated_at', 'folder_id'];
    return this.optimizeQuery(query, fields)
      .lean()
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .sort(options.sort || { name: 1 });
  }

  /**
   * Requête optimisée pour dashboard
   */
  static getDashboardQuery(userId) {
    const File = mongoose.models.File || mongoose.model('File');
    
    // Agrégation optimisée pour stats
    return File.aggregate([
      {
        $match: {
          owner_id: new mongoose.Types.ObjectId(userId),
          is_deleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
          totalFiles: { $sum: 1 },
          byType: {
            $push: {
              type: '$mime_type',
              size: '$size',
            },
          },
        },
      },
    ]);
  }

  /**
   * Requête optimisée pour recherche
   */
  static getSearchQuery(userId, searchTerm, filters = {}) {
    const File = mongoose.models.File || mongoose.model('File');
    const matchQuery = {
      owner_id: new mongoose.Types.ObjectId(userId),
      is_deleted: false,
    };

    if (searchTerm) {
      matchQuery.name = { $regex: searchTerm, $options: 'i' };
    }

    if (filters.mimeType) {
      matchQuery.mime_type = filters.mimeType;
    }

    const query = File.find(matchQuery);
    
    // Projection pour recherche
    const fields = ['name', 'size', 'mime_type', 'updated_at'];
    return this.optimizeQuery(query, fields)
      .lean()
      .limit(filters.limit || 50)
      .sort({ updated_at: -1 });
  }
}

module.exports = QueryOptimizer;



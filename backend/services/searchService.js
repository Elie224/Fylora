/**
 * Service de Recherche Avancée avec ElasticSearch
 * Recherche full-text, sémantique, autocomplétion
 */

const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.indexName = 'fylora_files';
  }

  /**
   * Initialiser la connexion ElasticSearch
   */
  async init() {
    try {
      const elasticUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
      
      this.client = new Client({
        node: elasticUrl,
        requestTimeout: 30000,
        pingTimeout: 3000,
      });

      // Tester la connexion
      const health = await this.client.cluster.health();
      this.isConnected = true;

      logger.logInfo('ElasticSearch connected', {
        cluster: health.cluster_name,
        status: health.status,
      });

      // Créer l'index s'il n'existe pas
      await this.createIndex();

      return true;
    } catch (err) {
      logger.logError(err, { context: 'elasticsearch_init' });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Créer l'index avec mapping optimisé
   */
  async createIndex() {
    if (!this.isConnected) return;

    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  fylora_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'french_stemmer'],
                  },
                },
                filter: {
                  french_stemmer: {
                    type: 'stemmer',
                    language: 'french',
                  },
                },
              },
            },
            mappings: {
              properties: {
                fileId: { type: 'keyword' },
                userId: { type: 'keyword' },
                fileName: {
                  type: 'text',
                  analyzer: 'fylora_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                mimeType: { type: 'keyword' },
                content: {
                  type: 'text',
                  analyzer: 'fylora_analyzer',
                },
                tags: { type: 'keyword' },
                folderId: { type: 'keyword' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                size: { type: 'long' },
              },
            },
          },
        });

        logger.logInfo('ElasticSearch index created', { index: this.indexName });
      }
    } catch (err) {
      logger.logError(err, { context: 'elasticsearch_create_index' });
    }
  }

  /**
   * Indexer un fichier
   */
  async indexFile(file) {
    if (!this.isConnected) {
      logger.logWarn('ElasticSearch not connected, skipping indexing');
      return;
    }

    try {
      await this.client.index({
        index: this.indexName,
        id: file.id || file._id,
        body: {
          fileId: String(file.id || file._id),
          userId: String(file.owner_id || file.ownerId),
          fileName: file.name,
          mimeType: file.mime_type || file.mimeType,
          content: file.content || '', // Contenu OCR/extrait
          tags: file.tags || [],
          folderId: String(file.folder_id || file.folderId || ''),
          createdAt: file.created_at || file.createdAt,
          updatedAt: file.updated_at || file.updatedAt,
          size: file.size || 0,
        },
      });

      logger.logInfo('File indexed in ElasticSearch', {
        fileId: file.id || file._id,
        fileName: file.name,
      });
    } catch (err) {
      logger.logError(err, {
        context: 'elasticsearch_index',
        fileId: file.id || file._id,
      });
    }
  }

  /**
   * Rechercher des fichiers
   */
  async search(query, userId, options = {}) {
    if (!this.isConnected) {
      // Fallback vers recherche MongoDB basique
      logger.logWarn('ElasticSearch not connected, using MongoDB fallback');
      return this.mongoFallbackSearch(query, userId, options);
    }

    try {
      const {
        folderId = null,
        mimeType = null,
        limit = 20,
        offset = 0,
      } = options;

      // Construire la requête
      const mustClauses = [
        {
          match: {
            query: {
              query,
              analyzer: 'fylora_analyzer',
              fuzziness: 'AUTO',
            },
          },
        },
        {
          term: { userId: String(userId) },
        },
      ];

      if (folderId) {
        mustClauses.push({ term: { folderId: String(folderId) } });
      }

      if (mimeType) {
        mustClauses.push({ term: { mimeType } });
      }

      const searchBody = {
        query: {
          bool: {
            must: mustClauses,
          },
        },
        highlight: {
          fields: {
            fileName: {},
            content: {},
          },
        },
        sort: [{ _score: { order: 'desc' } }, { updatedAt: { order: 'desc' } }],
        from: offset,
        size: limit,
      };

      const result = await this.client.search({
        index: this.indexName,
        body: searchBody,
      });

      // Formater les résultats
      const files = result.body.hits.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        fileName: hit._source.fileName,
        mimeType: hit._source.mimeType,
        highlights: hit.highlight,
        ...hit._source,
      }));

      return {
        files,
        total: result.body.hits.total.value,
        took: result.body.took,
      };
    } catch (err) {
      logger.logError(err, { context: 'elasticsearch_search', query });
      return this.mongoFallbackSearch(query, userId, options);
    }
  }

  /**
   * Recherche par autocomplétion
   */
  async autocomplete(query, userId, limit = 10) {
    if (!this.isConnected) {
      return [];
    }

    try {
      const result = await this.client.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: [
                {
                  match_phrase_prefix: {
                    fileName: {
                      query,
                      max_expansions: 50,
                    },
                  },
                },
                { term: { userId: String(userId) } },
              ],
            },
          },
          size: limit,
          _source: ['fileId', 'fileName', 'mimeType'],
        },
      });

      return result.body.hits.hits.map((hit) => ({
        id: hit._source.fileId,
        name: hit._source.fileName,
        mimeType: hit._source.mimeType,
      }));
    } catch (err) {
      logger.logError(err, { context: 'elasticsearch_autocomplete', query });
      return [];
    }
  }

  /**
   * Supprimer un fichier de l'index
   */
  async deleteFile(fileId) {
    if (!this.isConnected) return;

    try {
      await this.client.delete({
        index: this.indexName,
        id: String(fileId),
      });

      logger.logInfo('File deleted from ElasticSearch', { fileId });
    } catch (err) {
      // Ignorer si le document n'existe pas
      if (err.meta?.statusCode !== 404) {
        logger.logError(err, { context: 'elasticsearch_delete', fileId });
      }
    }
  }

  /**
   * Fallback vers MongoDB si ElasticSearch n'est pas disponible
   */
  async mongoFallbackSearch(query, userId, options) {
    const FileModel = require('../models/fileModel');
    const mongoose = require('mongoose');
    const File = mongoose.models.File;

    const searchQuery = {
      owner_id: userId,
      is_deleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { mime_type: { $regex: query, $options: 'i' } },
      ],
    };

    if (options.folderId) {
      searchQuery.folder_id = options.folderId;
    }

    const files = await File.find(searchQuery)
      .limit(options.limit || 20)
      .skip(options.offset || 0)
      .sort({ updated_at: -1 })
      .lean();

    return {
      files: files.map(f => FileModel.toDTO(f)),
      total: files.length,
      took: 0,
    };
  }
}

// Instance singleton
const searchService = new SearchService();

// Initialiser au démarrage
if (process.env.ELASTICSEARCH_URL) {
  searchService.init().catch(err => {
    logger.logError(err, { context: 'search_service_startup' });
  });
}

module.exports = searchService;

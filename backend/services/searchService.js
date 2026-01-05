/**
 * Service de Recherche avec ElasticSearch
 * Recherche instantanée < 100ms
 * 
 * Architecture: ElasticSearch pour recherche, MongoDB pour métadonnées
 */

const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

let esClient = null;
const ES_ENABLED = process.env.ELASTICSEARCH_URL && process.env.ELASTICSEARCH_URL !== '';

/**
 * Initialiser le client ElasticSearch
 */
function initElasticSearch() {
  if (!ES_ENABLED) {
    logger.logWarn('ElasticSearch not configured, using MongoDB search fallback');
    return null;
  }

  try {
    esClient = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: process.env.ELASTICSEARCH_AUTH ? {
        username: process.env.ELASTICSEARCH_USERNAME || '',
        password: process.env.ELASTICSEARCH_PASSWORD || '',
      } : undefined,
      requestTimeout: 30000,
      pingTimeout: 3000,
    });

    logger.logInfo('ElasticSearch client initialized', {
      node: process.env.ELASTICSEARCH_URL.replace(/\/\/.*@/, '//****@')
    });

    return esClient;
  } catch (error) {
    logger.logError(error, { context: 'elasticsearch_init' });
    return null;
  }
}

// Initialiser au démarrage
if (ES_ENABLED) {
  initElasticSearch();
}

/**
 * Créer l'index ElasticSearch
 */
async function createIndex() {
  if (!esClient) {
    return;
  }

  const indexName = 'fylora-files';

  try {
    const exists = await esClient.indices.exists({ index: indexName });
    
    if (!exists) {
      await esClient.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              file_id: { type: 'keyword' },
              name: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              content: {
                type: 'text',
                analyzer: 'standard'
              },
              tags: { type: 'keyword' },
              owner_id: { type: 'keyword' },
              mime_type: { type: 'keyword' },
              folder_id: { type: 'keyword' },
              size: { type: 'long' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0, // 0 en développement, 1+ en production
            analysis: {
              analyzer: {
                french: {
                  type: 'standard',
                  stopwords: '_french_'
                }
              }
            }
          }
        }
      });

      logger.logInfo('ElasticSearch index created', { index: indexName });
    }
  } catch (error) {
    logger.logError(error, { context: 'create_elasticsearch_index' });
  }
}

/**
 * Indexer un fichier
 * @param {string} fileId - ID du fichier
 * @param {Object} fileData - { name, content?, tags?, ownerId, mimeType, folderId, size, createdAt, updatedAt }
 */
async function indexFile(fileId, fileData) {
  if (!esClient) {
    return;
  }

  try {
    await esClient.index({
      index: 'fylora-files',
      id: fileId,
      body: {
        file_id: fileId,
        name: fileData.name,
        content: fileData.content || '',
        tags: fileData.tags || [],
        owner_id: fileData.ownerId,
        mime_type: fileData.mimeType,
        folder_id: fileData.folderId || null,
        size: fileData.size || 0,
        created_at: fileData.createdAt,
        updated_at: fileData.updatedAt,
      }
    });

    // Rafraîchir l'index pour que les résultats soient immédiatement disponibles
    await esClient.indices.refresh({ index: 'fylora-files' });
  } catch (error) {
    logger.logError(error, { context: 'index_file', fileId });
  }
}

/**
 * Supprimer un fichier de l'index
 * @param {string} fileId - ID du fichier
 */
async function deleteFile(fileId) {
  if (!esClient) {
    return;
  }

  try {
    await esClient.delete({
      index: 'fylora-files',
      id: fileId,
      ignore: [404] // Ignorer si le fichier n'existe pas
    });
  } catch (error) {
    logger.logError(error, { context: 'delete_file_index', fileId });
  }
}

/**
 * Rechercher des fichiers
 * @param {string} userId - ID utilisateur
 * @param {string} query - Requête de recherche
 * @param {Object} options - { folderId?, mimeType?, tags?, skip?, limit? }
 * @returns {Promise<Array>} Fichiers trouvés
 */
async function searchFiles(userId, query, options = {}) {
  if (!esClient) {
    // Fallback sur MongoDB si ElasticSearch non disponible
    return searchFilesMongoDB(userId, query, options);
  }

  const {
    folderId,
    mimeType,
    tags,
    skip = 0,
    limit = 50
  } = options;

  try {
    const must = [
      { term: { owner_id: userId } },
    ];

    // Requête de recherche
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: ['name^3', 'content', 'tags^2'], // name a plus de poids
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Filtres
    const filters = [];
    if (folderId) {
      filters.push({ term: { folder_id: folderId } });
    }
    if (mimeType) {
      filters.push({ term: { mime_type: mimeType } });
    }
    if (tags && tags.length > 0) {
      filters.push({ terms: { tags: tags } });
    }

    const body = {
      query: {
        bool: {
          must,
          filter: filters
        }
      },
      sort: [
        { updated_at: { order: 'desc' } },
        { _score: { order: 'desc' } }
      ],
      from: skip,
      size: limit,
      highlight: {
        fields: {
          name: {},
          content: {}
        }
      }
    };

    const result = await esClient.search({
      index: 'fylora-files',
      body
    });

    return {
      files: result.body.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
        highlights: hit.highlight
      })),
      total: result.body.hits.total.value,
      took: result.body.took
    };
  } catch (error) {
    logger.logError(error, { context: 'search_files_elasticsearch', userId, query });
    // Fallback sur MongoDB
    return searchFilesMongoDB(userId, query, options);
  }
}

/**
 * Recherche avec MongoDB (fallback)
 */
async function searchFilesMongoDB(userId, query, options) {
  const mongoose = require('mongoose');
  const File = mongoose.models.File || mongoose.model('File');
  
  const searchQuery = {
    owner_id: new mongoose.Types.ObjectId(userId),
    is_deleted: false
  };

  if (options.folderId) {
    searchQuery.folder_id = new mongoose.Types.ObjectId(options.folderId);
  }

  if (options.mimeType) {
    searchQuery.mime_type = options.mimeType;
  }

  const files = await File.find(searchQuery)
    .select('name size mime_type folder_id owner_id created_at updated_at _id')
    .sort({ updated_at: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50)
    .lean()
    .maxTimeMS(2000);

  return {
    files: files.map(f => ({
      id: f._id.toString(),
      ...f
    })),
    total: files.length,
    took: 0
  };
}

/**
 * Autocomplétion
 * @param {string} userId - ID utilisateur
 * @param {string} prefix - Préfixe de recherche
 * @param {number} limit - Nombre de suggestions
 * @returns {Promise<Array>} Suggestions
 */
async function autocomplete(userId, prefix, limit = 10) {
  if (!esClient) {
    return [];
  }

  try {
    const result = await esClient.search({
      index: 'fylora-files',
      body: {
        query: {
          bool: {
            must: [
              { term: { owner_id: userId } },
              {
                prefix: {
                  'name.keyword': prefix
                }
              }
            ]
          }
        },
        size: limit,
        _source: ['name', 'mime_type']
      }
    });

    return result.body.hits.hits.map(hit => ({
      name: hit._source.name,
      mimeType: hit._source.mime_type
    }));
  } catch (error) {
    logger.logError(error, { context: 'autocomplete', userId, prefix });
    return [];
  }
}

/**
 * Recherche naturelle (parsing intelligent)
 * @param {string} userId - ID utilisateur
 * @param {string} naturalQuery - Requête naturelle ("fichiers images de la semaine dernière")
 * @returns {Promise<Array>} Fichiers trouvés
 */
async function naturalSearch(userId, naturalQuery) {
  // Parser la requête naturelle
  const query = naturalQuery.toLowerCase();
  const options = {};

  // Détecter le type MIME
  if (query.includes('image') || query.includes('photo')) {
    options.mimeType = 'image/';
  } else if (query.includes('video') || query.includes('film')) {
    options.mimeType = 'video/';
  } else if (query.includes('document') || query.includes('pdf')) {
    options.mimeType = 'application/pdf';
  }

  // Détecter la période
  if (query.includes('semaine') || query.includes('week')) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    options.dateFrom = weekAgo;
  } else if (query.includes('mois') || query.includes('month')) {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    options.dateFrom = monthAgo;
  }

  // Extraire les mots-clés
  const keywords = query
    .replace(/fichiers?|files?/gi, '')
    .replace(/de|du|la|le|les/gi, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2);

  const searchQuery = keywords.join(' ');

  return await searchFiles(userId, searchQuery, options);
}

// Créer l'index au démarrage
if (ES_ENABLED && esClient) {
  createIndex().catch(err => {
    logger.logError(err, { context: 'create_elasticsearch_index_startup' });
  });
}

module.exports = {
  initElasticSearch,
  createIndex,
  indexFile,
  deleteFile,
  searchFiles,
  autocomplete,
  naturalSearch,
  isEnabled: () => ES_ENABLED && esClient !== null,
};


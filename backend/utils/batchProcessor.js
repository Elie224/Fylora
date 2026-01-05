/**
 * Processeur de batch pour optimiser les requêtes multiples
 * Réduit le nombre d'appels API en groupant les requêtes
 */

const logger = require('./logger');

/**
 * Traiter plusieurs requêtes en batch
 */
class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 50;
    this.batchTimeout = options.batchTimeout || 100; // 100ms
    this.pendingBatches = new Map();
    this.processors = new Map();
  }

  /**
   * Enregistrer un processeur pour un type de batch
   */
  register(type, processor) {
    this.processors.set(type, processor);
  }

  /**
   * Ajouter une requête à un batch
   */
  async addToBatch(type, data) {
    return new Promise((resolve, reject) => {
      const batchKey = `${type}:${Date.now()}`;
      
      if (!this.pendingBatches.has(batchKey)) {
        this.pendingBatches.set(batchKey, {
          type,
          items: [],
          resolves: [],
          rejects: [],
          timer: null
        });
      }

      const batch = this.pendingBatches.get(batchKey);
      batch.items.push(data);
      batch.resolves.push(resolve);
      batch.rejects.push(reject);

      // Réinitialiser le timer
      if (batch.timer) {
        clearTimeout(batch.timer);
      }

      // Si le batch est plein, le traiter immédiatement
      if (batch.items.length >= this.batchSize) {
        this.processBatch(batchKey);
      } else {
        // Sinon, attendre le timeout
        batch.timer = setTimeout(() => {
          this.processBatch(batchKey);
        }, this.batchTimeout);
      }
    });
  }

  /**
   * Traiter un batch
   */
  async processBatch(batchKey) {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.items.length === 0) {
      return;
    }

    this.pendingBatches.delete(batchKey);
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    const processor = this.processors.get(batch.type);
    if (!processor) {
      batch.rejects.forEach(reject => reject(new Error(`No processor for type: ${batch.type}`)));
      return;
    }

    try {
      const results = await processor(batch.items);
      
      // Distribuer les résultats
      if (Array.isArray(results) && results.length === batch.items.length) {
        results.forEach((result, index) => {
          batch.resolves[index](result);
        });
      } else {
        // Si un seul résultat pour tous les items
        batch.resolves.forEach(resolve => resolve(results));
      }
    } catch (error) {
      logger.logError(error, { context: 'batch_processor', type: batch.type });
      batch.rejects.forEach(reject => reject(error));
    }
  }

  /**
   * Traiter immédiatement tous les batches en attente
   */
  async flush() {
    const batchKeys = Array.from(this.pendingBatches.keys());
    await Promise.all(batchKeys.map(key => this.processBatch(key)));
  }
}

// Instance globale
const globalBatchProcessor = new BatchProcessor();

/**
 * Middleware Express pour gérer les batch requests
 */
function batchMiddleware(req, res, next) {
  if (req.method === 'POST' && req.path === '/api/batch') {
    const { requests } = req.body;
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: { message: 'Invalid batch request' } });
    }

    // Limiter le nombre de requêtes par batch
    if (requests.length > 50) {
      return res.status(400).json({ error: { message: 'Batch size too large (max 50)' } });
    }

    // Traiter toutes les requêtes en parallèle
    Promise.all(requests.map(async (request) => {
      try {
        // Simuler l'exécution de la requête
        // En production, cela devrait router vers les bons contrôleurs
        return {
          id: request.id,
          status: 200,
          data: { message: 'Batch request processed' }
        };
      } catch (error) {
        return {
          id: request.id,
          status: 500,
          error: { message: error.message }
        };
      }
    })).then(results => {
      res.status(200).json({ data: results });
    }).catch(error => {
      res.status(500).json({ error: { message: error.message } });
    });
  } else {
    next();
  }
}

module.exports = {
  BatchProcessor,
  globalBatchProcessor,
  batchMiddleware,
};


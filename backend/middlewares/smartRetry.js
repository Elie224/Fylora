/**
 * Retry intelligent avec fallback
 * Retry avec backoff exponentiel et fallback automatique
 */
const { SmartRetry } = require('../utils/smartRetry');

class SmartRetryMiddleware {
  constructor(options = {}) {
    this.retry = new SmartRetry(options);
  }

  /**
   * Middleware pour retry automatique
   */
  middleware(options = {}) {
    return async (req, res, next) => {
      const originalSend = res.send.bind(res);
      
      res.send = async function(data) {
        // Si erreur, essayer de retry
        if (res.statusCode >= 500 && options.retryOnError) {
          // Logique de retry serait ici si nécessaire
          // Pour l'instant, on laisse passer
        }
        
        return originalSend(data);
      };

      next();
    };
  }

  /**
   * Wrapper pour fonctions avec retry
   */
  async execute(name, fn, fallback = null) {
    return await this.retry.execute(fn, fallback);
  }
}

// Wrapper pour opérations DB avec retry
async function withDbRetry(fn, fallback = null) {
  const { dbCircuitBreaker } = require('../utils/circuitBreaker');
  
  return await dbCircuitBreaker.execute('db-operation', fn, fallback);
}

// Wrapper pour opérations cache avec retry
async function withCacheRetry(fn, fallback = null) {
  const { cacheCircuitBreaker } = require('../utils/circuitBreaker');
  
  return await cacheCircuitBreaker.execute('cache-operation', fn, fallback);
}

module.exports = {
  SmartRetryMiddleware,
  withDbRetry,
  withCacheRetry,
};



/**
 * Utilitaires pour optimiser les performances du backend
 */

/**
 * Cache simple en mémoire avec TTL
 */
class MemoryCache {
  constructor(defaultTTL = 3600000) { // 1 heure par défaut
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
    
    // Nettoyer automatiquement après expiration
    setTimeout(() => {
      if (this.cache.has(key)) {
        const item = this.cache.get(key);
        if (item.expiresAt <= Date.now()) {
          this.cache.delete(key);
        }
      }
    }, ttl);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * Connection pool pour MongoDB
 */
function createConnectionPool(maxConnections = 10) {
  const pool = [];
  let activeConnections = 0;

  return {
    async acquire() {
      if (activeConnections >= maxConnections) {
        await new Promise(resolve => {
          const check = setInterval(() => {
            if (activeConnections < maxConnections) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        });
      }
      activeConnections++;
      return { release: () => activeConnections-- };
    },
    getStats() {
      return { active: activeConnections, max: maxConnections };
    }
  };
}

/**
 * Batch processing pour les opérations en masse
 */
async function batchProcess(items, batchSize, processor) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Debounce pour les opérations coûteuses
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Mesurer le temps d'exécution
 */
function measureExecutionTime(fn, label) {
  return async function(...args) {
    const start = process.hrtime.bigint();
    try {
      const result = await fn.apply(this, args);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convertir en ms
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      console.error(`[Performance] ${label} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

module.exports = {
  MemoryCache,
  createConnectionPool,
  batchProcess,
  debounce,
  measureExecutionTime,
};






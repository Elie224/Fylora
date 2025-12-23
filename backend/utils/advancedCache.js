/**
 * Cache fin et optimisé
 * Cache multi-niveaux avec stratégies intelligentes
 */
const redisCache = require('./redisCache');
const NodeCache = require('node-cache');

class AdvancedCache {
  constructor() {
    // Cache mémoire local (L1)
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes par défaut
      checkperiod: 60,
      useClones: false,
    });

    // Statistiques
    this.stats = {
      hits: { memory: 0, redis: 0 },
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Obtenir avec cache multi-niveaux
   */
  async get(key, options = {}) {
    // Niveau 1: Mémoire
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== undefined) {
      this.stats.hits.memory++;
      return memoryValue;
    }

    // Niveau 2: Redis
    try {
      const redisValue = await redisCache.get(key);
      if (redisValue !== null) {
        this.stats.hits.redis++;
        // Mettre en cache mémoire pour prochaine fois
        this.memoryCache.set(key, redisValue, options.memoryTTL || 300);
        return redisValue;
      }
    } catch (error) {
      // Redis indisponible - continuer sans cache
      console.warn('Redis cache unavailable, using memory only');
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Mettre en cache avec stratégie intelligente
   */
  async set(key, value, options = {}) {
    const {
      ttl = 3600, // 1 heure par défaut
      memoryTTL = 300, // 5 minutes en mémoire
      priority = 'normal', // normal, high, low
    } = options;

    // Toujours mettre en mémoire (accès rapide)
    this.memoryCache.set(key, value, memoryTTL);

    // Mettre en Redis selon priorité
    if (priority !== 'low') {
      try {
        await redisCache.set(key, value, ttl);
        this.stats.sets++;
      } catch (error) {
        // Redis indisponible - continuer avec mémoire seulement
        console.warn('Redis cache unavailable, using memory only');
      }
    }
  }

  /**
   * Invalider intelligemment
   */
  async invalidate(key, pattern = false) {
    // Invalider mémoire
    if (pattern) {
      const keys = this.memoryCache.keys();
      keys.forEach(k => {
        if (k.includes(key)) {
          this.memoryCache.del(k);
        }
      });
    } else {
      this.memoryCache.del(key);
    }

    // Invalider Redis
    try {
      if (pattern) {
        await redisCache.deletePattern(key);
      } else {
        await redisCache.delete(key);
      }
    } catch (error) {
      // Ignorer erreurs Redis
    }
  }

  /**
   * Précharger des données fréquentes
   */
  async warmup(keys, loaderFn) {
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const value = await loaderFn(key);
        if (value) {
          await this.set(key, value, { priority: 'high' });
        }
      })
    );

    return results.filter(r => r.status === 'fulfilled').length;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const totalHits = this.stats.hits.memory + this.stats.hits.redis;
    const totalRequests = totalHits + this.stats.misses;
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate.toFixed(4)),
      memorySize: this.memoryCache.keys().length,
    };
  }
}

module.exports = new AdvancedCache();



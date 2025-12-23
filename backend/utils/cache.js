// Système de cache en mémoire pour améliorer les performances
// Note: Pour la production à grande échelle, utiliser Redis

class MemoryCache {
  constructor(defaultTTL = 300000) { // 5 minutes par défaut
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Nettoyage toutes les minutes
  }

  /**
   * Obtenir une valeur du cache
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Stocker une valeur dans le cache
   */
  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Supprimer une clé du cache
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Vider tout le cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Nettoyer les entrées expirées
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Instance globale du cache avec TTL plus court pour éviter les données obsolètes
const cache = new MemoryCache(60000); // 1 minute TTL par défaut (peut être surchargé par route)

/**
 * Middleware de cache pour les routes GET
 */
function cacheMiddleware(ttl = 300000, keyGenerator = null) {
  return (req, res, next) => {
    // Ne cacher que les requêtes GET
    if (req.method !== 'GET') {
      return next();
    }

    // Générer la clé de cache
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : `cache:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

    // Vérifier le cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Sauvegarder la fonction res.json originale
    const originalJson = res.json.bind(res);

    // Intercepter res.json pour mettre en cache
    res.json = function(data) {
      // Ne cacher que les réponses 200 et si les données sont valides
      if (res.statusCode === 200 && data && !res.headersSent) {
        try {
          cache.set(cacheKey, data, ttl);
        } catch (err) {
          // Ignorer les erreurs de cache silencieusement
        }
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalider le cache pour un utilisateur
 */
function invalidateUserCache(userId) {
  const stats = cache.getStats();
  for (const key of stats.keys) {
    if (key.includes(`:${userId}:`) || key.includes(`:${userId}`)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalider tout le cache
 */
function invalidateAllCache() {
  cache.clear();
}

module.exports = {
  cache,
  cacheMiddleware,
  invalidateUserCache,
  invalidateAllCache,
};



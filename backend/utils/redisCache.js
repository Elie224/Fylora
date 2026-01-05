/**
 * Cache Redis haute performance pour Fylora
 * Optimisé pour supporter des millions d'utilisateurs
 */

const redis = require('redis');
const config = require('../config');
const logger = require('./logger');

let redisClient = null;
let isConnected = false;

// Configuration Redis optimisée
const redisConfig = {
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.logError(new Error('Redis max reconnection attempts reached'), { retries });
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    }
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: false, // Ne pas mettre en queue si déconnecté
};

/**
 * Initialiser la connexion Redis
 */
async function initRedis() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    
    // Si pas de Redis URL ou si c'est localhost (Render free tier), utiliser cache mémoire
    if (!redisUrl || redisUrl.includes('127.0.0.1') || redisUrl.includes('localhost')) {
      logger.logWarn('Redis not available, using in-memory cache');
      return null;
    }

    redisClient = redis.createClient({
      url: redisUrl,
      ...redisConfig
    });

    redisClient.on('error', (err) => {
      logger.logError(err, { context: 'redis_error' });
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.logInfo('Redis cache connected');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      logger.logInfo('Redis cache ready');
      isConnected = true;
    });

    redisClient.on('end', () => {
      logger.logWarn('Redis connection ended');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    logger.logError(err, { context: 'redis_init' });
    return null;
  }
}

// Cache mémoire de fallback
const memoryCache = new Map();
const memoryCacheTTL = new Map();

/**
 * Obtenir une valeur du cache
 */
async function get(key) {
  try {
    if (redisClient && isConnected) {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    }
  } catch (err) {
    logger.logWarn('Redis get error, using memory cache', { error: err.message });
  }

  // Fallback: cache mémoire
  if (memoryCache.has(key)) {
    const ttl = memoryCacheTTL.get(key);
    if (ttl && Date.now() < ttl) {
      return memoryCache.get(key);
    }
    memoryCache.delete(key);
    memoryCacheTTL.delete(key);
  }
  return null;
}

/**
 * Définir une valeur dans le cache
 */
async function set(key, value, ttlSeconds = 300) {
  try {
    if (redisClient && isConnected) {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    }
  } catch (err) {
    logger.logWarn('Redis set error, using memory cache', { error: err.message });
  }

  // Fallback: cache mémoire
  memoryCache.set(key, value);
  memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
  
  // Nettoyer le cache mémoire périodiquement
  if (memoryCache.size > 10000) {
    const now = Date.now();
    for (const [k, ttl] of memoryCacheTTL.entries()) {
      if (now >= ttl) {
        memoryCache.delete(k);
        memoryCacheTTL.delete(k);
      }
    }
  }
  return true;
}

/**
 * Supprimer une clé du cache
 */
async function del(key) {
  try {
    if (redisClient && isConnected) {
      await redisClient.del(key);
    }
  } catch (err) {
    logger.logWarn('Redis del error', { error: err.message });
  }

  // Fallback: cache mémoire
  memoryCache.delete(key);
  memoryCacheTTL.delete(key);
}

/**
 * Supprimer toutes les clés correspondant à un pattern
 */
async function delPattern(pattern) {
  try {
    if (redisClient && isConnected) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  } catch (err) {
    logger.logWarn('Redis delPattern error', { error: err.message });
  }

  // Fallback: cache mémoire
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern.replace('*', ''))) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
}

/**
 * Incrémenter une valeur (pour les compteurs)
 */
async function incr(key, ttlSeconds = 3600) {
  try {
    if (redisClient && isConnected) {
      const value = await redisClient.incr(key);
      if (value === 1) {
        await redisClient.expire(key, ttlSeconds);
      }
      return value;
    }
  } catch (err) {
    logger.logWarn('Redis incr error', { error: err.message });
  }

  // Fallback: cache mémoire
  const current = memoryCache.get(key) || 0;
  const newValue = current + 1;
  memoryCache.set(key, newValue);
  memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
  return newValue;
}

/**
 * Obtenir plusieurs clés en une seule requête (pipeline)
 */
async function mget(keys) {
  try {
    if (redisClient && isConnected && keys.length > 0) {
      const values = await redisClient.mGet(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    }
  } catch (err) {
    logger.logWarn('Redis mget error', { error: err.message });
  }

  // Fallback: cache mémoire
  return keys.map(key => {
    if (memoryCache.has(key)) {
      const ttl = memoryCacheTTL.get(key);
      if (ttl && Date.now() < ttl) {
        return memoryCache.get(key);
      }
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
    return null;
  });
}

/**
 * Middleware de cache pour Express
 */
function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Ne pas mettre en cache les requêtes POST/PUT/DELETE
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next();
    }

    const cacheKey = `cache:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
    
    try {
      const cached = await get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }
    } catch (err) {
      // Continuer si le cache échoue
    }

    // Sauvegarder la fonction json originale
    const originalJson = res.json.bind(res);
    
    // Intercepter la réponse
    res.json = function(data) {
      // Mettre en cache seulement les réponses 200
      if (res.statusCode === 200) {
        set(cacheKey, data, ttlSeconds).catch(() => {});
      }
      return originalJson(data);
    };

    res.setHeader('X-Cache', 'MISS');
    next();
  };
}

// Initialiser Redis au démarrage
initRedis().catch(err => {
  logger.logError(err, { context: 'redis_init_startup' });
});

module.exports = {
  initRedis,
  get,
  set,
  del,
  delPattern,
  incr,
  mget,
  cacheMiddleware,
  isConnected: () => isConnected,
};

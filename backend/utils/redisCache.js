/**
 * Cache Redis avec fallback mémoire
 * Supporte Redis pour la production, mémoire pour le développement
 */
const MemoryCache = require('./cache').cache;

class RedisCache {
  constructor() {
    this.redis = null;
    this.memoryCache = MemoryCache;
    this.useRedis = false;
    this.connectionAttempted = false;
    this.connectionFailed = false;
    this.init();
  }

  async init() {
    // Éviter les tentatives multiples
    if (this.connectionAttempted) {
      return;
    }
    this.connectionAttempted = true;

    // Si REDIS_URL n'est pas défini, utiliser directement le cache mémoire sans essayer Redis
    if (!process.env.REDIS_URL) {
      this.useRedis = false;
      // Message informatif mais discret
      if (process.env.NODE_ENV === 'production') {
        // En production, message discret pour indiquer que Redis n'est pas configuré
        console.log('ℹ️  Redis not configured (REDIS_URL not set), using memory cache');
      } else {
        console.log('ℹ️  Redis not configured (REDIS_URL not set), using memory cache');
      }
      return;
    }

    try {
      // Essayer de se connecter à Redis si REDIS_URL est défini
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            // Arrêter les tentatives après 3 essais
            if (retries > 3) {
              if (!this.connectionFailed) {
                // En production, message plus discret
                const message = process.env.NODE_ENV === 'production'
                  ? 'Redis unavailable, using memory cache'
                  : '⚠️  Redis connection failed after 3 attempts, using memory cache';
                console.warn(message);
                this.connectionFailed = true;
              }
              return false;
            }
            return Math.min(retries * 50, 500);
          },
          connectTimeout: 2000, // Timeout de 2 secondes
        }
      });

      // Supprimer les erreurs répétées - ne logger qu'une seule fois
      let errorLogged = false;
      client.on('error', (err) => {
        if (!errorLogged && !this.connectionFailed) {
          // Ne logger que les erreurs importantes, pas les ECONNRESET répétés
          if (!err.message.includes('ECONNRESET') && !err.message.includes('Socket closed')) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('Redis error:', err.message);
            }
          }
          errorLogged = true;
        }
        this.useRedis = false;
      });

      // Timeout pour la connexion initiale
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 2000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      
      this.redis = client;
      this.useRedis = true;
      console.log('✅ Redis cache connected');
    } catch (error) {
      if (!this.connectionFailed) {
        // Message plus informatif selon le contexte
        if (process.env.NODE_ENV === 'production') {
          // En production, vérifier si c'est une erreur de connexion ou simplement non configuré
          if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
            console.warn('⚠️  Redis connection failed, using memory cache');
          } else {
            console.warn('⚠️  Redis unavailable, using memory cache');
          }
        } else {
          console.warn('⚠️  Redis not available, using memory cache');
        }
        this.connectionFailed = true;
      }
      this.useRedis = false;
      // Nettoyer le client si créé
      if (this.redis) {
        try {
          await this.redis.quit();
        } catch (e) {
          // Ignorer les erreurs de fermeture
        }
        this.redis = null;
      }
    }
  }

  async get(key) {
    if (this.useRedis && this.redis && !this.connectionFailed) {
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        // Si erreur de connexion, désactiver Redis et utiliser mémoire
        if (error.message.includes('closed') || error.message.includes('ECONNRESET')) {
          this.useRedis = false;
          this.connectionFailed = true;
        }
        return this.memoryCache.get(key);
      }
    }
    return this.memoryCache.get(key);
  }

  async set(key, value, ttl = 300) {
    const serialized = JSON.stringify(value);
    
    if (this.useRedis && this.redis && !this.connectionFailed) {
      try {
        await this.redis.setEx(key, ttl, serialized);
        return;
      } catch (error) {
        // Si erreur de connexion, désactiver Redis et utiliser mémoire
        if (error.message.includes('closed') || error.message.includes('ECONNRESET')) {
          this.useRedis = false;
          this.connectionFailed = true;
        }
      }
    }
    
    // Fallback sur mémoire (ttl en millisecondes)
    this.memoryCache.set(key, value, ttl * 1000);
  }

  async delete(key) {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
    this.memoryCache.delete(key);
  }

  async deletePattern(pattern) {
    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } catch (error) {
        console.error('Redis deletePattern error:', error);
      }
    }
    // Pour mémoire, on doit itérer manuellement
    const stats = this.memoryCache.getStats();
    for (const key of stats.keys) {
      if (key.includes(pattern.replace('*', ''))) {
        this.memoryCache.delete(key);
      }
    }
  }

  async clear() {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.flushAll();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
    this.memoryCache.clear();
  }

  async getStats() {
    if (this.useRedis && this.redis) {
      try {
        const info = await this.redis.info('stats');
        return { type: 'redis', info };
      } catch (error) {
        return { type: 'memory', stats: this.memoryCache.getStats() };
      }
    }
    return { type: 'memory', stats: this.memoryCache.getStats() };
  }
}

// Instance singleton
const redisCache = new RedisCache();

module.exports = redisCache;



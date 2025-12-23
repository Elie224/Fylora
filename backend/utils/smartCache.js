/**
 * Cache intelligent avec invalidation et TTL dynamique
 */
const redisCache = require('./redisCache');

class SmartCache {
  constructor() {
    this.cachePrefixes = {
      fileMetadata: 'file:meta:',
      permissions: 'perm:',
      search: 'search:',
      dashboard: 'dashboard:',
      user: 'user:',
    };
  }

  /**
   * Générer une clé de cache avec préfixe
   */
  _getKey(prefix, id, suffix = '') {
    return `${this.cachePrefixes[prefix]}${id}${suffix ? ':' + suffix : ''}`;
  }

  /**
   * Cache des métadonnées de fichier avec TTL dynamique
   */
  async cacheFileMetadata(fileId, metadata, ttl = 3600) {
    const key = this._getKey('fileMetadata', fileId);
    await redisCache.set(key, metadata, ttl);
  }

  async getFileMetadata(fileId) {
    const key = this._getKey('fileMetadata', fileId);
    return await redisCache.get(key);
  }

  /**
   * Cache des permissions avec TTL court
   */
  async cachePermission(userId, resourceId, resourceType, permission, ttl = 300) {
    const key = this._getKey('permissions', `${userId}:${resourceType}:${resourceId}`);
    await redisCache.set(key, permission, ttl);
  }

  async getPermission(userId, resourceId, resourceType) {
    const key = this._getKey('permissions', `${userId}:${resourceType}:${resourceId}`);
    return await redisCache.get(key);
  }

  /**
   * Cache de recherche avec TTL dynamique selon popularité
   */
  async cacheSearch(userId, query, results, ttl = 600) {
    const queryHash = require('crypto').createHash('md5').update(query).digest('hex');
    const key = this._getKey('search', `${userId}:${queryHash}`);
    await redisCache.set(key, results, ttl);
  }

  async getCachedSearch(userId, query) {
    const queryHash = require('crypto').createHash('md5').update(query).digest('hex');
    const key = this._getKey('search', `${userId}:${queryHash}`);
    return await redisCache.get(key);
  }

  /**
   * Cache du dashboard avec invalidation intelligente
   */
  async cacheDashboard(userId, data, ttl = 300) {
    const key = this._getKey('dashboard', userId);
    await redisCache.set(key, data, ttl);
  }

  async getCachedDashboard(userId) {
    const key = this._getKey('dashboard', userId);
    return await redisCache.get(key);
  }

  /**
   * Invalider le cache d'un fichier et ses dépendances
   */
  async invalidateFile(fileId, userId) {
    // Invalider métadonnées
    await redisCache.delete(this._getKey('fileMetadata', fileId));
    
    // Invalider dashboard
    await redisCache.delete(this._getKey('dashboard', userId));
    
    // Invalider toutes les recherches de l'utilisateur
    await redisCache.deletePattern(`search:${userId}:*`);
  }

  /**
   * Invalider le cache d'un utilisateur
   */
  async invalidateUser(userId) {
    const patterns = [
      `dashboard:${userId}`,
      `search:${userId}:*`,
      `permissions:${userId}:*`,
    ];

    for (const pattern of patterns) {
      await redisCache.deletePattern(pattern);
    }
  }

  /**
   * Warm-up cache pour données fréquentes
   */
  async warmupCache(userId) {
    // Précharger le dashboard
    const dashboardKey = this._getKey('dashboard', userId);
    const cached = await redisCache.get(dashboardKey);
    if (!cached) {
      // Le cache sera rempli lors de la prochaine requête
      // On peut aussi précharger ici si nécessaire
    }
  }
}

module.exports = new SmartCache();



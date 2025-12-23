/**
 * Cache intelligent des permissions
 * Évite de recalculer les permissions à chaque requête
 */
const smartCache = require('./smartCache');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');

class PermissionCache {
  /**
   * Vérifier les permissions avec cache
   */
  async checkPermission(userId, resourceId, resourceType, action = 'read') {
    // Vérifier le cache d'abord
    const cached = await smartCache.getPermission(userId, resourceId, resourceType);
    if (cached) {
      return cached[action] || false;
    }

    // Calculer les permissions
    let resource;
    if (resourceType === 'file') {
      resource = await FileModel.findById(resourceId);
    } else if (resourceType === 'folder') {
      resource = await FolderModel.findById(resourceId);
    } else {
      return false;
    }

    if (!resource) {
      return false;
    }

    // Propriétaire a tous les droits
    const isOwner = resource.owner_id.toString() === userId;
    const permissions = {
      read: isOwner,
      write: isOwner,
      delete: isOwner,
      share: isOwner,
    };

    // Mettre en cache (TTL court pour permissions)
    await smartCache.cachePermission(userId, resourceId, resourceType, permissions, 300);

    return permissions[action] || false;
  }

  /**
   * Invalider le cache de permissions pour une ressource
   */
  async invalidatePermission(resourceId, resourceType) {
    // Invalider toutes les permissions pour cette ressource
    await smartCache.redisCache.deletePattern(`perm:*:${resourceType}:${resourceId}`);
  }

  /**
   * Vérifier plusieurs permissions en batch
   */
  async checkBatchPermissions(userId, resources) {
    const results = await Promise.all(
      resources.map(async ({ resourceId, resourceType, action }) => {
        return {
          resourceId,
          resourceType,
          action,
          allowed: await this.checkPermission(userId, resourceId, resourceType, action),
        };
      })
    );

    return results;
  }
}

module.exports = new PermissionCache();



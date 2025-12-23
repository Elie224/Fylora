/**
 * Warm-up du cache au démarrage
 * Précharge les données fréquemment utilisées
 */
const smartCache = require('./smartCache');
const mongoose = require('mongoose');

class CacheWarmup {
  /**
   * Réchauffer le cache au démarrage
   */
  async warmup() {
    console.log('🔥 Starting cache warmup...');

    try {
      // Warm-up des données système
      await this.warmupSystemData();

      // Warm-up des données utilisateurs actifs récents
      await this.warmupActiveUsers();

      console.log('✅ Cache warmup completed');
    } catch (error) {
      console.error('❌ Cache warmup error:', error);
    }
  }

  /**
   * Réchauffer les données système
   */
  async warmupSystemData() {
    // Précharger les configurations fréquentes
    const systemConfig = {
      maxFileSize: process.env.MAX_FILE_SIZE || 10737418240, // 10GB
      allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
      version: '1.0.0',
    };

    await smartCache.redisCache.set('system:config', systemConfig, 3600);
  }

  /**
   * Réchauffer les données des utilisateurs actifs
   */
  async warmupActiveUsers() {
    const User = mongoose.models.User;
    
    try {
      // Récupérer les utilisateurs actifs récents (dernières 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsers = await User.find({
        last_login_at: { $gte: oneDayAgo },
        is_active: true,
      })
        .select('_id')
        .limit(50) // Limiter pour éviter surcharge
        .lean();

      // Précharger le dashboard pour chaque utilisateur
      const warmupPromises = activeUsers.map(async (user) => {
        try {
          await smartCache.warmupCache(user._id.toString());
        } catch (error) {
          // Ignorer les erreurs individuelles
          console.warn(`Could not warmup cache for user ${user._id}:`, error.message);
        }
      });

      await Promise.all(warmupPromises);
      console.log(`✅ Warmed up cache for ${activeUsers.length} active users`);
    } catch (error) {
      console.warn('Could not warmup active users:', error.message);
    }
  }

  /**
   * Réchauffer le cache d'un utilisateur spécifique
   */
  async warmupUser(userId) {
    await smartCache.warmupCache(userId);
  }
}

module.exports = new CacheWarmup();



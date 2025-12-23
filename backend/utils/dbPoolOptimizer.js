/**
 * Optimisation du pool de connexions MongoDB
 * Gestion intelligente des connexions pour meilleures performances
 */
const mongoose = require('mongoose');

class DBPoolOptimizer {
  constructor() {
    this.metrics = {
      connections: {
        active: 0,
        idle: 0,
        total: 0,
      },
      queries: {
        slow: [],
        total: 0,
      },
    };
  }

  /**
   * Optimiser la configuration du pool
   */
  optimizePoolConfig() {
    const config = {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 50,
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    return config;
  }

  /**
   * Surveiller le pool de connexions
   */
  async monitorPool() {
    const db = mongoose.connection;
    
    if (db.readyState === 1) {
      const admin = db.db.admin();
      try {
        const serverStatus = await admin.serverStatus();
        const connections = serverStatus.connections || {};
        
        this.metrics.connections = {
          active: connections.current || 0,
          available: connections.available || 0,
          total: (connections.current || 0) + (connections.available || 0),
        };
      } catch (error) {
        console.warn('Could not get server status:', error.message);
      }
    }

    return this.metrics.connections;
  }

  /**
   * Détecter les requêtes lentes
   */
  async detectSlowQueries() {
    // MongoDB ne fournit pas directement les requêtes lentes
    // On utilise le profiler si activé
    const db = mongoose.connection.db;
    
    try {
      const profilerData = await db.collection('system.profile')
        .find({ millis: { $gt: 1000 } })
        .sort({ ts: -1 })
        .limit(10)
        .toArray();

      this.metrics.queries.slow = profilerData.map(q => ({
        command: q.command,
        duration: q.millis,
        timestamp: q.ts,
      }));
    } catch (error) {
      // Profiler pas activé ou erreur
      this.metrics.queries.slow = [];
    }

    return this.metrics.queries.slow;
  }

  /**
   * Obtenir les statistiques du pool
   */
  getPoolStats() {
    return {
      ...this.metrics,
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * Obtenir des recommandations d'optimisation
   */
  getRecommendations() {
    const recommendations = [];
    const { active, total } = this.metrics.connections;

    if (active / total > 0.8) {
      recommendations.push({
        type: 'warning',
        message: 'Pool de connexions presque saturé',
        suggestion: 'Augmenter maxPoolSize ou optimiser les requêtes',
      });
    }

    if (this.metrics.queries.slow.length > 5) {
      recommendations.push({
        type: 'error',
        message: 'Plusieurs requêtes lentes détectées',
        suggestion: 'Vérifier les index et optimiser les requêtes',
      });
    }

    return recommendations;
  }
}

module.exports = new DBPoolOptimizer();



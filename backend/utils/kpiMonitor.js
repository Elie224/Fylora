/**
 * Système de monitoring avec KPI en temps réel
 * Mesure les performances réelles de l'application
 */
const performanceMonitor = require('./performanceMonitor');
const advancedMonitoring = require('./advancedMonitoring');
const redisCache = require('./redisCache');

class KPIMonitor {
  constructor() {
    this.kpis = {
      backend: {
        avgResponseTime: 0,
        errorRate: 0,
        slowQueries: 0,
        cacheHitRate: 0,
      },
      frontend: {
        firstLoad: 0,
        navigationTime: 0,
        timeToInteractive: 0,
      },
      database: {
        slowQueries: [],
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0,
        },
      },
    };
    this.thresholds = {
      apiResponseTime: 200, // ms
      errorRate: 0.01, // 1%
      cacheHitRate: 0.70, // 70%
      firstLoad: 2000, // ms
      navigationTime: 300, // ms
      timeToInteractive: 3000, // ms
    };
    this.startTime = Date.now();
  }

  /**
   * Calculer les KPI backend
   */
  async calculateBackendKPIs() {
    const stats = performanceMonitor.getStats();
    const cacheStats = await redisCache.getStats();
    
    const totalRequests = stats.totalRequests || 1;
    const avgResponseTime = stats.avgResponseTime || 0;
    const errorRate = stats.errors / totalRequests;
    const slowQueries = stats.slowRequests || 0;
    
    // Cache hit rate
    const cacheHits = cacheStats.hits || 0;
    const cacheMisses = cacheStats.misses || 0;
    const cacheHitRate = (cacheHits + cacheMisses) > 0 
      ? cacheHits / (cacheHits + cacheMisses) 
      : 0;

    this.kpis.backend = {
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: parseFloat(errorRate.toFixed(4)),
      slowQueries,
      cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
    };

    return this.kpis.backend;
  }

  /**
   * Vérifier si les KPI sont dans les seuils
   */
  checkKPIs() {
    const backend = this.kpis.backend;
    const frontend = this.kpis.frontend;

    const results = {
      backend: {
        avgResponseTime: backend.avgResponseTime < this.thresholds.apiResponseTime,
        errorRate: backend.errorRate < this.thresholds.errorRate,
        slowQueries: backend.slowQueries === 0,
        cacheHitRate: backend.cacheHitRate > this.thresholds.cacheHitRate,
        allGood: 
          backend.avgResponseTime < this.thresholds.apiResponseTime &&
          backend.errorRate < this.thresholds.errorRate &&
          backend.slowQueries === 0 &&
          backend.cacheHitRate > this.thresholds.cacheHitRate,
      },
      frontend: {
        firstLoad: frontend.firstLoad < this.thresholds.firstLoad,
        navigationTime: frontend.navigationTime < this.thresholds.navigationTime,
        timeToInteractive: frontend.timeToInteractive < this.thresholds.timeToInteractive,
        allGood:
          frontend.firstLoad < this.thresholds.firstLoad &&
          frontend.navigationTime < this.thresholds.navigationTime &&
          frontend.timeToInteractive < this.thresholds.timeToInteractive,
      },
    };

    return results;
  }

  /**
   * Obtenir tous les KPI
   */
  async getKPIs() {
    await this.calculateBackendKPIs();
    const checks = this.checkKPIs();
    const uptime = Date.now() - this.startTime;

    return {
      kpis: this.kpis,
      thresholds: this.thresholds,
      checks,
      uptime: Math.floor(uptime / 1000), // secondes
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Identifier les goulots d'étranglement
   */
  async identifyBottlenecks() {
    const stats = performanceMonitor.getStats();
    const slowRequests = performanceMonitor.metrics.requests
      .filter(r => r.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const bottlenecks = {
      slowRoutes: slowRequests.map(r => ({
        route: r.route,
        method: r.method,
        duration: r.duration,
        count: r.count || 1,
      })),
      highErrorRoutes: this.getHighErrorRoutes(),
      cacheMisses: await this.getCacheMisses(),
      dbSlowQueries: this.kpis.database.slowQueries,
    };

    return bottlenecks;
  }

  /**
   * Obtenir les routes avec taux d'erreur élevé
   */
  getHighErrorRoutes() {
    const stats = performanceMonitor.getStats();
    // Implémentation simplifiée - à améliorer avec tracking par route
    return [];
  }

  /**
   * Obtenir les cache misses fréquents
   */
  async getCacheMisses() {
    const cacheStats = await redisCache.getStats();
    return {
      misses: cacheStats.misses || 0,
      hits: cacheStats.hits || 0,
      hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
    };
  }

  /**
   * Enregistrer une métrique frontend
   */
  recordFrontendMetric(metric, value) {
    if (this.kpis.frontend[metric] !== undefined) {
      this.kpis.frontend[metric] = value;
    }
  }
}

module.exports = new KPIMonitor();



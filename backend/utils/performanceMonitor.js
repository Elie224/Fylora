/**
 * Monitoring des performances
 * Track les temps de réponse, requêtes lentes, etc.
 */
const logger = require('./logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      slowRequests: [],
      errors: [],
    };
    this.startTime = Date.now();
  }

  /**
   * Middleware pour tracker les performances
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = require('uuid').v4();

      // Ajouter l'ID de requête pour le tracking
      req.requestId = requestId;

      // Intercepter res.end pour mesurer le temps
      const originalEnd = res.end.bind(res);
      res.end = function(...args) {
        const duration = Date.now() - startTime;
        const route = `${req.method} ${req.path}`;

        // Logger les requêtes lentes (> 1 seconde)
        if (duration > 1000) {
          logger.logWarn(`Slow request: ${route} took ${duration}ms`, {
            requestId,
            duration,
            route,
            userId: req.user?.id,
            ip: req.ip,
          });

          // Stocker pour analyse
          this.metrics.slowRequests.push({
            requestId,
            route,
            duration,
            timestamp: new Date(),
            userId: req.user?.id,
          });
        }

        // Logger les erreurs
        if (res.statusCode >= 400) {
          this.metrics.errors.push({
            requestId,
            route,
            statusCode: res.statusCode,
            timestamp: new Date(),
            userId: req.user?.id,
          });
        }

        // Stocker la métrique
        this.metrics.requests.push({
          requestId,
          route,
          duration,
          statusCode: res.statusCode,
          timestamp: new Date(),
        });

        // Garder seulement les 1000 dernières requêtes
        if (this.metrics.requests.length > 1000) {
          this.metrics.requests.shift();
        }
        if (this.metrics.slowRequests.length > 100) {
          this.metrics.slowRequests.shift();
        }
        if (this.metrics.errors.length > 100) {
          this.metrics.errors.shift();
        }

        return originalEnd(...args);
      }.bind(this);

      next();
    };
  }

  /**
   * Obtenir les statistiques de performance
   */
  getStats() {
    const requests = this.metrics.requests;
    if (requests.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: this.metrics.slowRequests.length,
        errors: this.metrics.errors.length,
      };
    }

    const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0);
    const averageResponseTime = totalDuration / requests.length;

    // Grouper par route
    const routes = {};
    requests.forEach(r => {
      if (!routes[r.route]) {
        routes[r.route] = { count: 0, totalDuration: 0 };
      }
      routes[r.route].count++;
      routes[r.route].totalDuration += r.duration;
    });

    const routeStats = Object.entries(routes).map(([route, stats]) => ({
      route,
      count: stats.count,
      averageTime: stats.totalDuration / stats.count,
    })).sort((a, b) => b.averageTime - a.averageTime);

    return {
      totalRequests: requests.length,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests: this.metrics.slowRequests.length,
      errors: this.metrics.errors.length,
      uptime: Date.now() - this.startTime,
      routeStats: routeStats.slice(0, 10), // Top 10 routes les plus lentes
    };
  }

  /**
   * Obtenir les requêtes lentes récentes
   */
  getSlowRequests(limit = 10) {
    return this.metrics.slowRequests
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obtenir les erreurs récentes
   */
  getRecentErrors(limit = 10) {
    return this.metrics.errors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Réinitialiser les métriques
   */
  reset() {
    this.metrics = {
      requests: [],
      slowRequests: [],
      errors: [],
    };
    this.startTime = Date.now();
  }
}

// Instance singleton
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;



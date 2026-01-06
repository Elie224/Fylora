/**
 * API Gateway - Point d'entrée unique pour tous les microservices
 * Gère: Auth, Rate Limiting, Routing, Logging, Versioning
 */

const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { generalLimiter, authLimiter } = require('../middlewares/rateLimiter');
const logger = require('../utils/logger');
const { performanceMiddleware } = require('../middlewares/performance');

class APIGateway {
  constructor() {
    this.app = express();
    this.services = new Map();
    this.middlewares = [];
  }

  /**
   * Enregistrer un microservice
   */
  registerService(name, basePath, handler) {
    this.services.set(name, {
      basePath,
      handler,
      registeredAt: new Date(),
    });
    logger.logInfo('Service registered in API Gateway', { service: name, path: basePath });
  }

  /**
   * Middleware global pour logging et monitoring
   */
  setupGlobalMiddleware() {
    // Performance monitoring
    this.app.use(performanceMiddleware);

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.requestId = requestId;

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.logInfo('API Gateway request', {
          requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration,
          userAgent: req.get('user-agent'),
          ip: req.ip,
        });
      });

      next();
    });

    // API Versioning
    this.app.use((req, res, next) => {
      const apiVersion = req.headers['api-version'] || 'v1';
      req.apiVersion = apiVersion;
      res.setHeader('X-API-Version', apiVersion);
      next();
    });
  }

  /**
   * Router vers les microservices
   */
  setupRouting() {
    // Route de santé pour le gateway
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        gateway: 'operational',
        services: Array.from(this.services.keys()),
        timestamp: new Date().toISOString(),
      });
    });

    // Routes vers les services
    this.app.use('/api/auth', authLimiter, require('../routes/auth'));
    this.app.use('/api/files', generalLimiter, require('../routes/files'));
    this.app.use('/api/folders', generalLimiter, require('../routes/folders'));
    this.app.use('/api/share', generalLimiter, require('../routes/share'));
    this.app.use('/api/search', generalLimiter, require('../routes/search'));
    this.app.use('/api/billing', generalLimiter, require('../routes/billing'));
    this.app.use('/api/plans', require('../routes/plans'));
    this.app.use('/api/notifications', generalLimiter, require('../routes/notifications'));
    this.app.use('/api/intelligence', generalLimiter, require('../routes/intelligence'));
  }

  /**
   * Gestion d'erreurs centralisée
   */
  setupErrorHandling() {
    this.app.use((err, req, res, next) => {
      logger.logError(err, {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });

      const statusCode = err.statusCode || 500;
      const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

      res.status(statusCode).json({
        error: {
          message,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      });
    });
  }

  /**
   * Obtenir les statistiques du gateway
   */
  getStats() {
    return {
      services: Array.from(this.services.entries()).map(([name, config]) => ({
        name,
        path: config.basePath,
        registeredAt: config.registeredAt,
      })),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

// Instance singleton
const apiGateway = new APIGateway();

module.exports = apiGateway;


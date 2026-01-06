/**
 * Service d'Observabilité Avancée
 * Metrics, Logs, Traces distribuées
 */

const logger = require('../utils/logger');

class ObservabilityService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        byStatus: new Map(),
      },
      latency: {
        byEndpoint: new Map(),
        percentiles: {
          p50: new Map(),
          p95: new Map(),
          p99: new Map(),
        },
      },
      errors: {
        total: 0,
        byType: new Map(),
        byEndpoint: new Map(),
      },
      uploads: {
        total: 0,
        totalSize: 0,
        averageSize: 0,
        averageTime: 0,
        byMimeType: new Map(),
      },
      storage: {
        totalFiles: 0,
        totalSize: 0,
        byStorageType: new Map(),
      },
    };

    this.traces = [];
    this.maxTraces = 1000; // Garder les 1000 dernières traces
  }

  /**
   * Enregistrer une requête
   */
  recordRequest(method, endpoint, statusCode, duration) {
    this.metrics.requests.total++;
    
    // Par endpoint
    const endpointKey = `${method} ${endpoint}`;
    const endpointCount = this.metrics.requests.byEndpoint.get(endpointKey) || 0;
    this.metrics.requests.byEndpoint.set(endpointKey, endpointCount + 1);

    // Par méthode
    const methodCount = this.metrics.requests.byMethod.get(method) || 0;
    this.metrics.requests.byMethod.set(method, methodCount + 1);

    // Par statut
    const statusCount = this.metrics.requests.byStatus.get(statusCode) || 0;
    this.metrics.requests.byStatus.set(statusCode, statusCount + 1);

    // Latence
    const latencyData = this.metrics.latency.byEndpoint.get(endpointKey) || [];
    latencyData.push(duration);
    if (latencyData.length > 100) {
      latencyData.shift(); // Garder seulement les 100 dernières
    }
    this.metrics.latency.byEndpoint.set(endpointKey, latencyData);

    // Calculer les percentiles
    if (latencyData.length > 0) {
      const sorted = [...latencyData].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      this.metrics.latency.percentiles.p50.set(endpointKey, p50);
      this.metrics.latency.percentiles.p95.set(endpointKey, p95);
      this.metrics.latency.percentiles.p99.set(endpointKey, p99);
    }
  }

  /**
   * Enregistrer une erreur
   */
  recordError(error, context = {}) {
    this.metrics.errors.total++;

    // Par type
    const errorType = error.name || 'UnknownError';
    const typeCount = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, typeCount + 1);

    // Par endpoint si disponible
    if (context.endpoint) {
      const endpointCount = this.metrics.errors.byEndpoint.get(context.endpoint) || 0;
      this.metrics.errors.byEndpoint.set(context.endpoint, endpointCount + 1);
    }

    // Logger l'erreur
    logger.logError(error, context);
  }

  /**
   * Enregistrer un upload
   */
  recordUpload(fileSize, mimeType, duration) {
    this.metrics.uploads.total++;
    this.metrics.uploads.totalSize += fileSize;

    // Taille moyenne
    this.metrics.uploads.averageSize = 
      this.metrics.uploads.totalSize / this.metrics.uploads.total;

    // Temps moyen
    const totalTime = this.metrics.uploads.averageTime * (this.metrics.uploads.total - 1) + duration;
    this.metrics.uploads.averageTime = totalTime / this.metrics.uploads.total;

    // Par type MIME
    const mimeCount = this.metrics.uploads.byMimeType.get(mimeType) || 0;
    this.metrics.uploads.byMimeType.set(mimeType, mimeCount + 1);
  }

  /**
   * Enregistrer une trace distribuée
   */
  recordTrace(operation, duration, metadata = {}) {
    const trace = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.traces.push(trace);

    // Limiter le nombre de traces
    if (this.traces.length > this.maxTraces) {
      this.traces.shift();
    }
  }

  /**
   * Obtenir les métriques
   */
  getMetrics() {
    return {
      requests: {
        total: this.metrics.requests.total,
        byEndpoint: Object.fromEntries(this.metrics.requests.byEndpoint),
        byMethod: Object.fromEntries(this.metrics.requests.byMethod),
        byStatus: Object.fromEntries(this.metrics.requests.byStatus),
      },
      latency: {
        byEndpoint: Object.fromEntries(
          Array.from(this.metrics.latency.byEndpoint.entries()).map(([key, values]) => [
            key,
            {
              average: values.reduce((a, b) => a + b, 0) / values.length,
              min: Math.min(...values),
              max: Math.max(...values),
              p50: this.metrics.latency.percentiles.p50.get(key),
              p95: this.metrics.latency.percentiles.p95.get(key),
              p99: this.metrics.latency.percentiles.p99.get(key),
            },
          ])
        ),
      },
      errors: {
        total: this.metrics.errors.total,
        byType: Object.fromEntries(this.metrics.errors.byType),
        byEndpoint: Object.fromEntries(this.metrics.errors.byEndpoint),
      },
      uploads: {
        total: this.metrics.uploads.total,
        totalSize: this.metrics.uploads.totalSize,
        averageSize: this.metrics.uploads.averageSize,
        averageTime: this.metrics.uploads.averageTime,
        byMimeType: Object.fromEntries(this.metrics.uploads.byMimeType),
      },
      storage: {
        totalFiles: this.metrics.storage.totalFiles,
        totalSize: this.metrics.storage.totalSize,
        byStorageType: Object.fromEntries(this.metrics.storage.byStorageType),
      },
    };
  }

  /**
   * Obtenir les traces récentes
   */
  getTraces(limit = 100) {
    return this.traces.slice(-limit);
  }

  /**
   * Réinitialiser les métriques
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        byStatus: new Map(),
      },
      latency: {
        byEndpoint: new Map(),
        percentiles: {
          p50: new Map(),
          p95: new Map(),
          p99: new Map(),
        },
      },
      errors: {
        total: 0,
        byType: new Map(),
        byEndpoint: new Map(),
      },
      uploads: {
        total: 0,
        totalSize: 0,
        averageSize: 0,
        averageTime: 0,
        byMimeType: new Map(),
      },
      storage: {
        totalFiles: 0,
        totalSize: 0,
        byStorageType: new Map(),
      },
    };
    this.traces = [];
  }
}

// Instance singleton
const observabilityService = new ObservabilityService();

module.exports = observabilityService;



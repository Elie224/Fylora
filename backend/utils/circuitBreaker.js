/**
 * Circuit Breaker Pattern
 * Protège contre les cascades de pannes
 */

const logger = require('./logger');

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5; // Nombre d'échecs avant ouverture
    this.resetTimeout = options.resetTimeout || 60000; // 60 secondes
    this.monitoringWindow = options.monitoringWindow || 60000; // Fenêtre de monitoring
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Statistiques
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateChanges: [],
    };
  }

  /**
   * Exécuter une fonction avec circuit breaker
   */
  async execute(fn, ...args) {
    this.stats.totalRequests++;

    // Vérifier l'état du circuit
    if (this.state === 'OPEN') {
      // Vérifier si on peut tenter une réouverture (half-open)
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.logInfo('Circuit breaker entering HALF_OPEN state', {
          circuit: this.name,
        });
      } else {
        // Circuit ouvert, rejeter immédiatement
        this.stats.totalFailures++;
        throw new Error(`Circuit breaker OPEN: ${this.name} is unavailable`);
      }
    }

    try {
      // Exécuter la fonction
      const result = await fn(...args);
      
      // Succès
      this.onSuccess();
      return result;
    } catch (error) {
      // Échec
      this.onFailure();
      throw error;
    }
  }

  /**
   * Gérer un succès
   */
  onSuccess() {
    this.stats.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      // Si on a plusieurs succès en half-open, fermer le circuit
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        this.successCount = 0;
        this.stats.stateChanges.push({
          from: 'HALF_OPEN',
          to: 'CLOSED',
          timestamp: new Date().toISOString(),
        });
        logger.logInfo('Circuit breaker CLOSED', {
          circuit: this.name,
        });
      }
    }
  }

  /**
   * Gérer un échec
   */
  onFailure() {
    this.stats.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // En half-open, un seul échec rouvre le circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.stats.stateChanges.push({
        from: 'HALF_OPEN',
        to: 'OPEN',
        timestamp: new Date().toISOString(),
      });
      logger.logWarn('Circuit breaker reopened', {
        circuit: this.name,
      });
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Ouvrir le circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.stats.stateChanges.push({
        from: 'CLOSED',
        to: 'OPEN',
        timestamp: new Date().toISOString(),
      });
      logger.logError(new Error('Circuit breaker OPENED'), {
        circuit: this.name,
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
      });
    }
  }

  /**
   * Obtenir l'état actuel
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      stats: { ...this.stats },
    };
  }

  /**
   * Réinitialiser manuellement
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    logger.logInfo('Circuit breaker manually reset', {
      circuit: this.name,
    });
  }
}

// Instances globales pour les services critiques
const circuitBreakers = {
  elasticsearch: new CircuitBreaker('elasticsearch', {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 secondes
  }),
  cloudinary: new CircuitBreaker('cloudinary', {
    failureThreshold: 3,
    resetTimeout: 60000, // 60 secondes
  }),
  redis: new CircuitBreaker('redis', {
    failureThreshold: 5,
    resetTimeout: 30000,
  }),
  mongodb: new CircuitBreaker('mongodb', {
    failureThreshold: 10,
    resetTimeout: 60000,
  }),
};

module.exports = {
  CircuitBreaker,
  circuitBreakers,
};

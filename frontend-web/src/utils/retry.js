/**
 * Utilitaires pour retry logic et gestion d'erreurs robuste
 */

/**
 * Retry une fonction avec backoff exponentiel
 * @param {Function} fn - Fonction à réessayer
 * @param {Object} options - Options de retry
 * @returns {Promise}
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Ne pas réessayer si c'est la dernière tentative
      if (attempt === maxRetries) {
        break;
      }

      // Ne pas réessayer si l'erreur n'est pas retryable
      const errorCode = error.code || error.response?.status;
      const isRetryable = 
        retryableErrors.includes(errorCode) ||
        (errorCode >= 500 && errorCode < 600) || // Erreurs serveur
        errorCode === 408 || // Timeout
        errorCode === 429; // Too Many Requests

      if (!isRetryable) {
        throw error;
      }

      // Attendre avant de réessayer avec backoff exponentiel
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Retry avec jitter pour éviter le thundering herd
 * @param {Function} fn - Fonction à réessayer
 * @param {Object} options - Options de retry
 * @returns {Promise}
 */
export async function retryWithJitter(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Ajouter du jitter aléatoire pour éviter les collisions
      const jitter = Math.random() * 0.3 * baseDelay; // Jitter de 30%
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + jitter,
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Circuit breaker pattern pour éviter de surcharger un service défaillant
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      // Vérifier si on peut passer en HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}





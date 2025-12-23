/**
 * Smart retry avec backoff exponentiel et jitter
 * Pour requêtes réseau robustes
 */
export class SmartRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.retryableStatuses = options.retryableStatuses || [408, 429, 500, 502, 503, 504];
  }

  /**
   * Exécuter une fonction avec retry intelligent
   */
  async execute(fn, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      const shouldRetry = this.shouldRetry(error, attempt);
      
      if (!shouldRetry) {
        throw error;
      }

      const delay = this.calculateDelay(attempt);
      await this.sleep(delay);

      return this.execute(fn, attempt + 1);
    }
  }

  /**
   * Déterminer si on doit réessayer
   */
  shouldRetry(error, attempt) {
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Erreur réseau
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Status HTTP retryable
    if (error.response) {
      return this.retryableStatuses.includes(error.response.status);
    }

    return false;
  }

  /**
   * Calculer le délai avec backoff exponentiel et jitter
   */
  calculateDelay(attempt) {
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, attempt - 1),
      this.maxDelay
    );

    // Ajouter jitter pour éviter le thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    
    return exponentialDelay + jitter;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Wrapper pour axios
export function createRetryableRequest(axiosInstance, options = {}) {
  const retry = new SmartRetry(options);

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (retry.shouldRetry(error, 1)) {
        return retry.execute(() => axiosInstance.request(error.config));
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}



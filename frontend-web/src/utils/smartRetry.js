/**
 * Smart retry avec backoff exponentiel et jitter
 * Pour requêtes réseau robustes
 */
export class SmartRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.retryableStatuses = options.retryableStatuses || [408, 500, 502, 503, 504]; // 429 retiré car ne doit pas être retry
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

    // Status HTTP retryable (mais pas pour les erreurs 500 dues à des bugs)
    if (error.response) {
      const status = error.response.status;
      // Ne pas retry pour les erreurs 500 (souvent des bugs) sauf si c'est clairement un problème réseau
      if (status === 500) {
        // Vérifier si c'est une erreur de validation ou un bug (ne pas retry)
        const errorMessage = error.response?.data?.error?.message || '';
        // Si c'est une erreur de validation/bug (user.save is not a function, etc.), ne pas retry
        if (errorMessage.includes('is not a function') || 
            errorMessage.includes('Cannot read property') ||
            errorMessage.includes('validation')) {
          return false;
        }
      }
      // Ne pas retry pour les erreurs 429 (rate limiting) - le serveur demande explicitement d'arrêter
      if (status === 429) {
        return false;
      }
      return this.retryableStatuses.includes(status);
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



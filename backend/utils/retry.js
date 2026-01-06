/**
 * Retry avec Backoff Exponentiel
 * Gère les retries intelligents avec idempotence
 */

const logger = require('./logger');

/**
 * Retry avec backoff exponentiel
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 seconde
    maxDelay = 30000, // 30 secondes
    factor = 2, // Multiplicateur
    onRetry = null,
    shouldRetry = (error) => {
      // Par défaut, retry sur erreurs réseau/timeout
      return error.code === 'ECONNREFUSED' ||
             error.code === 'ETIMEDOUT' ||
             error.code === 'ENOTFOUND' ||
             error.message?.includes('timeout') ||
             error.message?.includes('ECONNREFUSED');
    },
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Vérifier si on doit retry
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Logger le retry
      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      } else {
        logger.logWarn('Retrying after error', {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error.message,
        });
      }

      // Attendre avant de retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculer le prochain délai (backoff exponentiel)
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Retry avec jitter (pour éviter le thundering herd)
 */
async function retryWithJitter(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true,
  } = options;

  return retryWithBackoff(fn, {
    ...options,
    initialDelay: baseDelay,
    maxDelay,
    onRetry: (error, attempt, delay) => {
      // Ajouter du jitter aléatoire
      const jitteredDelay = jitter
        ? delay + Math.random() * delay * 0.3 // ±30% de variation
        : delay;

      logger.logWarn('Retrying with jitter', {
        attempt,
        delay: jitteredDelay,
        error: error.message,
      });

      return new Promise(resolve => setTimeout(resolve, jitteredDelay));
    },
  });
}

/**
 * Retry avec idempotence (pour les opérations critiques)
 */
async function retryWithIdempotence(fn, idempotencyKey, options = {}) {
  const {
    maxRetries = 3,
    cache = new Map(), // Cache des résultats idempotents
  } = options;

  // Vérifier si on a déjà exécuté cette opération
  if (cache.has(idempotencyKey)) {
    logger.logInfo('Idempotent operation, returning cached result', {
      key: idempotencyKey,
    });
    return cache.get(idempotencyKey);
  }

  try {
    const result = await retryWithBackoff(fn, options);
    
    // Mettre en cache le résultat
    cache.set(idempotencyKey, result);
    
    // Nettoyer le cache après 1 heure
    setTimeout(() => {
      cache.delete(idempotencyKey);
    }, 3600000);

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Wrapper pour les appels HTTP avec retry
 */
async function httpRetry(url, options = {}, retryOptions = {}) {
  // Utiliser axios si disponible, sinon fetch natif (Node.js 18+)
  let fetchFn;
  try {
    const axios = require('axios');
    fetchFn = async (url, opts) => {
      const response = await axios({ url, ...opts, validateStatus: () => true });
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
      };
    };
  } catch {
    // Node.js 18+ a fetch natif
    fetchFn = global.fetch || require('node-fetch');
  }
  
  return retryWithBackoff(async () => {
    const response = await fetchFn(url, options);
    
    if (!response.ok && response.status >= 500) {
      // Retry sur erreurs serveur
      throw new Error(`HTTP ${response.status}: ${response.statusText || 'Server Error'}`);
    }
    
    return response;
  }, {
    shouldRetry: (error) => {
      // Retry sur erreurs réseau et serveur
      return error.message?.includes('timeout') ||
             error.message?.includes('ECONNREFUSED') ||
             error.message?.startsWith('HTTP 5');
    },
    ...retryOptions,
  });
}

module.exports = {
  retryWithBackoff,
  retryWithJitter,
  retryWithIdempotence,
  httpRetry,
};



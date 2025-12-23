/**
 * Gestionnaire de timeouts maîtrisés
 * Timeouts adaptatifs selon le type d'opération
 */
class TimeoutManager {
  constructor() {
    this.timeouts = {
      database: 10000, // 10 secondes
      cache: 2000, // 2 secondes
      externalAPI: 5000, // 5 secondes
      fileUpload: 300000, // 5 minutes
      fileDownload: 60000, // 1 minute
      default: 30000, // 30 secondes
    };
  }

  /**
   * Créer un timeout avec Promise
   */
  createTimeout(promise, type = 'default', customTimeout = null) {
    const timeout = customTimeout || this.timeouts[type] || this.timeouts.default;

    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      }),
    ]);
  }

  /**
   * Wrapper pour opérations avec timeout
   */
  async withTimeout(fn, type = 'default', customTimeout = null) {
    return await this.createTimeout(
      Promise.resolve(fn()),
      type,
      customTimeout
    );
  }

  /**
   * Timeout adaptatif selon la charge
   */
  getAdaptiveTimeout(baseType, loadFactor = 1) {
    const baseTimeout = this.timeouts[baseType] || this.timeouts.default;
    
    // Augmenter le timeout si charge élevée
    if (loadFactor > 1.5) {
      return baseTimeout * 1.5;
    }
    
    return baseTimeout;
  }
}

module.exports = new TimeoutManager();



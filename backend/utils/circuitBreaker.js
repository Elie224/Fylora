/**
 * Circuit Breaker pour résilience
 * Évite la cascade d'erreurs en cas de problème
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    
    this.states = {
      CLOSED: 'closed',
      OPEN: 'open',
      HALF_OPEN: 'half_open',
    };

    this.circuits = new Map();
  }

  /**
   * Exécuter une fonction avec circuit breaker
   */
  async execute(name, fn, fallback = null) {
    const circuit = this.getOrCreateCircuit(name);

    // Si le circuit est ouvert, utiliser le fallback
    if (circuit.state === this.states.OPEN) {
      if (Date.now() - circuit.lastFailureTime < this.resetTimeout) {
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker ${name} is OPEN`);
      } else {
        // Tenter de rouvrir (half-open)
        circuit.state = this.states.HALF_OPEN;
      }
    }

    try {
      const result = await fn();
      this.onSuccess(circuit);
      return result;
    } catch (error) {
      this.onFailure(circuit);
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  /**
   * Obtenir ou créer un circuit
   */
  getOrCreateCircuit(name) {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        name,
        state: this.states.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastSuccessTime: Date.now(),
      });
    }
    return this.circuits.get(name);
  }

  /**
   * Gérer le succès
   */
  onSuccess(circuit) {
    circuit.successes++;
    circuit.lastSuccessTime = Date.now();
    
    if (circuit.state === this.states.HALF_OPEN) {
      // Réussite en half-open -> fermer le circuit
      circuit.state = this.states.CLOSED;
      circuit.failures = 0;
    }
  }

  /**
   * Gérer l'échec
   */
  onFailure(circuit) {
    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.failures >= this.failureThreshold) {
      circuit.state = this.states.OPEN;
    }
  }

  /**
   * Obtenir l'état d'un circuit
   */
  getState(name) {
    const circuit = this.circuits.get(name);
    return circuit ? circuit.state : this.states.CLOSED;
  }

  /**
   * Réinitialiser un circuit
   */
  reset(name) {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = this.states.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
    }
  }

  /**
   * Obtenir les statistiques de tous les circuits
   */
  getStats() {
    const stats = {};
    this.circuits.forEach((circuit, name) => {
      stats[name] = {
        state: circuit.state,
        failures: circuit.failures,
        successes: circuit.successes,
        lastFailureTime: circuit.lastFailureTime,
        lastSuccessTime: circuit.lastSuccessTime,
      };
    });
    return stats;
  }
}

// Instance globale
const circuitBreaker = new CircuitBreaker();

// Circuit breakers spécifiques
const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
});

const cacheCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 10000,
});

module.exports = {
  circuitBreaker,
  dbCircuitBreaker,
  cacheCircuitBreaker,
  CircuitBreaker,
};



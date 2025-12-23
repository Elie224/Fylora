/**
 * Monitoring avancé avec métriques et alertes
 */
const performanceMonitor = require('./performanceMonitor');
const logger = require('./logger');

class AdvancedMonitoring {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        errors: 0,
        slow: 0,
      },
      latency: {
        p50: 0,
        p95: 0,
        p99: 0,
      },
      errors: {
        byType: {},
        recent: [],
      },
    };
    this.alerts = [];
    this.thresholds = {
      errorRate: 0.05, // 5%
      slowRequestRate: 0.1, // 10%
      latencyP95: 1000, // 1 seconde
    };
  }

  /**
   * Enregistrer une métrique
   */
  recordMetric(name, value, tags = {}) {
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    this.metrics[name].push({ value, tags, timestamp: Date.now() });
    
    // Garder seulement les 1000 dernières métriques
    if (this.metrics[name].length > 1000) {
      this.metrics[name].shift();
    }

    // Vérifier les alertes
    this.checkAlerts(name, value);
  }

  /**
   * Calculer les percentiles de latence
   */
  calculateLatencyPercentiles() {
    const stats = performanceMonitor.getStats();
    const requests = performanceMonitor.metrics.requests;

    if (requests.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const latencies = requests.map(r => r.duration).sort((a, b) => a - b);
    
    return {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
    };
  }

  /**
   * Vérifier les alertes
   */
  checkAlerts(metricName, value) {
    const stats = performanceMonitor.getStats();
    
    // Alerte taux d'erreur élevé
    if (stats.totalRequests > 100) {
      const errorRate = stats.errors / stats.totalRequests;
      if (errorRate > this.thresholds.errorRate) {
        this.triggerAlert('high_error_rate', {
          errorRate: (errorRate * 100).toFixed(2) + '%',
          threshold: (this.thresholds.errorRate * 100).toFixed(2) + '%',
        });
      }
    }

    // Alerte latence élevée
    const latency = this.calculateLatencyPercentiles();
    if (latency.p95 > this.thresholds.latencyP95) {
      this.triggerAlert('high_latency', {
        p95: latency.p95,
        threshold: this.thresholds.latencyP95,
      });
    }

    // Alerte requêtes lentes
    if (stats.totalRequests > 100) {
      const slowRate = stats.slowRequests / stats.totalRequests;
      if (slowRate > this.thresholds.slowRequestRate) {
        this.triggerAlert('high_slow_requests', {
          slowRate: (slowRate * 100).toFixed(2) + '%',
          threshold: (this.thresholds.slowRequestRate * 100).toFixed(2) + '%',
        });
      }
    }
  }

  /**
   * Déclencher une alerte
   */
  triggerAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: new Date(),
      resolved: false,
    };

    // Éviter les doublons récents
    const recentAlert = this.alerts.find(
      a => a.type === type && !a.resolved && Date.now() - a.timestamp < 60000
    );

    if (!recentAlert) {
      this.alerts.push(alert);
      logger.logWarn(`Alert triggered: ${type}`, data);
      
      // Envoyer notification si configuré
      if (process.env.ALERT_WEBHOOK) {
        this.sendAlertWebhook(alert);
      }
    }
  }

  /**
   * Envoyer une alerte via webhook
   */
  async sendAlertWebhook(alert) {
    try {
      const axios = require('axios');
      await axios.post(process.env.ALERT_WEBHOOK, {
        alert: alert.type,
        data: alert.data,
        timestamp: alert.timestamp,
      });
    } catch (error) {
      console.error('Failed to send alert webhook:', error);
    }
  }

  /**
   * Obtenir toutes les métriques
   */
  getMetrics() {
    const stats = performanceMonitor.getStats();
    const latency = this.calculateLatencyPercentiles();

    return {
      ...stats,
      latency,
      alerts: this.alerts.filter(a => !a.resolved),
      metrics: this.metrics,
    };
  }

  /**
   * Résoudre une alerte
   */
  resolveAlert(type) {
    const alert = this.alerts.find(a => a.type === type && !a.resolved);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }
}

module.exports = new AdvancedMonitoring();



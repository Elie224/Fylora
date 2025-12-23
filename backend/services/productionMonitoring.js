/**
 * Monitoring continu en production
 * Surveille la latence, charge, erreurs en temps réel
 */
const kpiMonitor = require('../utils/kpiMonitor');
const advancedMonitoring = require('../utils/advancedMonitoring');
const logger = require('../utils/logger');
const axios = require('axios');

class ProductionMonitoring {
  constructor() {
    this.isRunning = false;
    this.metrics = {
      latency: [],
      errors: [],
      load: [],
      users: [],
    };
    this.alertThresholds = {
      latency: 500, // ms
      errorRate: 0.02, // 2%
      cpuUsage: 80, // %
      memoryUsage: 85, // %
      activeUsers: null, // Pas de limite par défaut
    };
    this.alertChannels = {
      webhook: process.env.ALERT_WEBHOOK,
      email: process.env.ALERT_EMAIL,
    };
  }

  /**
   * Démarrer le monitoring continu
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('🔍 Production monitoring started');

    // Surveiller toutes les 30 secondes
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Vérifier les alertes toutes les minutes
    setInterval(() => {
      this.checkAlerts();
    }, 60000);

    // Collecter immédiatement
    this.collectMetrics();
  }

  /**
   * Collecter les métriques
   */
  async collectMetrics() {
    try {
      const [kpis, bottlenecks, systemMetrics] = await Promise.all([
        kpiMonitor.getKPIs(),
        kpiMonitor.identifyBottlenecks(),
        this.getSystemMetrics(),
      ]);

      // Enregistrer les métriques
      this.recordMetric('latency', kpis.kpis.backend.avgResponseTime);
      this.recordMetric('errors', kpis.kpis.backend.errorRate);
      this.recordMetric('load', systemMetrics.cpu);
      this.recordMetric('users', systemMetrics.activeUsers || 0);

      // Détecter les anomalies
      this.detectAnomalies(kpis, bottlenecks);

    } catch (error) {
      logger.logError('Error collecting metrics', error);
    }
  }

  /**
   * Obtenir les métriques système
   */
  async getSystemMetrics() {
    const os = require('os');
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;

    // CPU usage (approximation)
    const cpus = os.cpus();
    const cpuUsage = this.calculateCpuUsage(cpus);

    return {
      cpu: cpuUsage,
      memory: memUsage,
      totalMemory: totalMem,
      freeMemory: freeMem,
      loadAverage: os.loadavg(),
    };
  }

  /**
   * Calculer l'utilisation CPU (approximation)
   */
  calculateCpuUsage(cpus) {
    // Simplifié - en production utiliser un module dédié
    const loadAvg = require('os').loadavg()[0];
    const cpuCount = cpus.length;
    return Math.min((loadAvg / cpuCount) * 100, 100);
  }

  /**
   * Enregistrer une métrique
   */
  recordMetric(type, value) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }

    this.metrics[type].push({
      value,
      timestamp: Date.now(),
    });

    // Garder seulement les 100 dernières valeurs
    if (this.metrics[type].length > 100) {
      this.metrics[type].shift();
    }
  }

  /**
   * Détecter les anomalies
   */
  detectAnomalies(kpis, bottlenecks) {
    const alerts = [];

    // Latence élevée
    if (kpis.kpis.backend.avgResponseTime > this.alertThresholds.latency) {
      alerts.push({
        type: 'high_latency',
        severity: 'warning',
        message: `Latence moyenne élevée: ${kpis.kpis.backend.avgResponseTime}ms`,
        value: kpis.kpis.backend.avgResponseTime,
        threshold: this.alertThresholds.latency,
      });
    }

    // Taux d'erreur élevé
    if (kpis.kpis.backend.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'error',
        message: `Taux d'erreur élevé: ${(kpis.kpis.backend.errorRate * 100).toFixed(2)}%`,
        value: kpis.kpis.backend.errorRate,
        threshold: this.alertThresholds.errorRate,
      });
    }

    // Requêtes lentes détectées
    if (bottlenecks.slowRoutes && bottlenecks.slowRoutes.length > 0) {
      alerts.push({
        type: 'slow_routes',
        severity: 'warning',
        message: `${bottlenecks.slowRoutes.length} route(s) lente(s) détectée(s)`,
        routes: bottlenecks.slowRoutes.slice(0, 5),
      });
    }

    // Envoyer les alertes
    alerts.forEach(alert => this.sendAlert(alert));
  }

  /**
   * Vérifier les alertes
   */
  async checkAlerts() {
    const systemMetrics = await this.getSystemMetrics();

    // CPU élevé
    if (systemMetrics.cpu > this.alertThresholds.cpuUsage) {
      this.sendAlert({
        type: 'high_cpu',
        severity: 'warning',
        message: `CPU usage élevé: ${systemMetrics.cpu.toFixed(2)}%`,
        value: systemMetrics.cpu,
        threshold: this.alertThresholds.cpuUsage,
      });
    }

    // Mémoire élevée
    if (systemMetrics.memory > this.alertThresholds.memoryUsage) {
      this.sendAlert({
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage élevé: ${systemMetrics.memory.toFixed(2)}%`,
        value: systemMetrics.memory,
        threshold: this.alertThresholds.memoryUsage,
      });
    }
  }

  /**
   * Envoyer une alerte
   */
  async sendAlert(alert) {
    logger.logWarn(`Alert: ${alert.type}`, alert);

    // Envoyer via webhook si configuré
    if (this.alertChannels.webhook) {
      try {
        await axios.post(this.alertChannels.webhook, {
          alert: alert.type,
          severity: alert.severity,
          message: alert.message,
          data: alert,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.logError('Failed to send webhook alert', error);
      }
    }

    // Envoyer via email si configuré (à implémenter)
    if (this.alertChannels.email && alert.severity === 'error') {
      // TODO: Implémenter envoi email
    }
  }

  /**
   * Obtenir le dashboard de monitoring
   */
  async getDashboard() {
    const [kpis, bottlenecks, systemMetrics] = await Promise.all([
      kpiMonitor.getKPIs(),
      kpiMonitor.identifyBottlenecks(),
      this.getSystemMetrics(),
    ]);

    return {
      kpis: kpis.kpis,
      bottlenecks,
      system: systemMetrics,
      metrics: this.metrics,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new ProductionMonitoring();



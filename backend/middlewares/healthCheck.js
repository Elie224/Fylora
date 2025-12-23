/**
 * Health check middleware pour surveiller la santé de l'application
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Vérifier la santé de l'application
 */
async function healthCheck(req, res) {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  // Vérifier MongoDB
  try {
    const mongoStatus = mongoose.connection.readyState;
    checks.checks.mongodb = {
      status: mongoStatus === 1 ? 'ok' : 'error',
      readyState: mongoStatus,
      message: mongoStatus === 1 
        ? 'Connected' 
        : mongoStatus === 2 
        ? 'Connecting' 
        : mongoStatus === 3 
        ? 'Disconnecting' 
        : 'Disconnected',
    };

    if (mongoStatus === 1) {
      // Test de ping
      await mongoose.connection.db.admin().ping();
      checks.checks.mongodb.ping = 'ok';
    }
  } catch (error) {
    checks.checks.mongodb = {
      status: 'error',
      error: error.message,
    };
    checks.status = 'degraded';
  }

  // Vérifier la mémoire
  const memoryUsage = process.memoryUsage();
  checks.checks.memory = {
    status: 'ok',
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
  };

  // Alerte si utilisation mémoire > 80%
  const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (memoryPercent > 80) {
    checks.checks.memory.status = 'warning';
    checks.status = 'degraded';
    logger.logWarn('High memory usage detected', {
      percent: memoryPercent.toFixed(2),
      heapUsed: checks.checks.memory.heapUsed,
      heapTotal: checks.checks.memory.heapTotal,
    });
  }

  // Vérifier le CPU
  const cpuUsage = process.cpuUsage();
  checks.checks.cpu = {
    status: 'ok',
    user: cpuUsage.user,
    system: cpuUsage.system,
  };

  // Déterminer le code de statut HTTP
  const statusCode = checks.status === 'ok' ? 200 : checks.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(checks);
}

/**
 * Endpoint de readiness (prêt à recevoir du trafic)
 */
async function readinessCheck(req, res) {
  const checks = {
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Vérifier MongoDB
  const mongoStatus = mongoose.connection.readyState;
  checks.checks.mongodb = mongoStatus === 1;

  if (!checks.checks.mongodb) {
    checks.ready = false;
    return res.status(503).json(checks);
  }

  res.status(200).json(checks);
}

/**
 * Endpoint de liveness (application vivante)
 */
async function livenessCheck(req, res) {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
};





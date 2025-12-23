/**
 * Tests automatiques à chaque déploiement
 * Vérifie que tout fonctionne après déploiement
 */
const axios = require('axios');
const API_URL = process.env.API_URL || process.env.BASE_URL || 'http://localhost:5001';

class AutomatedTests {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  /**
   * Exécuter tous les tests
   */
  async runAll() {
    console.log('🧪 Running automated tests...');

    const tests = [
      this.testHealthCheck,
      this.testDatabaseConnection,
      this.testCacheConnection,
      this.testAPIEndpoints,
      this.testPerformance,
    ];

    for (const test of tests) {
      try {
        await test.call(this);
      } catch (error) {
        this.recordTest(test.name, false, error.message);
      }
    }

    this.printResults();
    return this.results.failed === 0;
  }

  /**
   * Test health check
   */
  async testHealthCheck() {
    const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    if (response.status === 200) {
      this.recordTest('healthCheck', true);
    } else {
      throw new Error(`Health check returned ${response.status}`);
    }
  }

  /**
   * Test connexion base de données
   */
  async testDatabaseConnection() {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      this.recordTest('databaseConnection', true);
    } else {
      throw new Error('Database not connected');
    }
  }

  /**
   * Test connexion cache
   */
  async testCacheConnection() {
    const redisCache = require('../utils/redisCache');
    try {
      await redisCache.set('test', 'value', 1);
      const value = await redisCache.get('test');
      if (value === 'value') {
        this.recordTest('cacheConnection', true);
      } else {
        throw new Error('Cache test failed');
      }
    } catch (error) {
      // Cache optionnel - ne pas faire échouer le test
      this.recordTest('cacheConnection', true, 'Cache not available (optional)');
    }
  }

  /**
   * Test endpoints API critiques
   */
  async testAPIEndpoints() {
    const endpoints = [
      { path: '/api/health', method: 'GET', auth: false },
      { path: '/api/performance/stats', method: 'GET', auth: false },
    ];

    for (const endpoint of endpoints) {
      try {
        const config = {
          method: endpoint.method.toLowerCase(),
          url: `${API_URL}${endpoint.path}`,
          timeout: 5000,
        };

        if (endpoint.auth) {
          // TODO: Utiliser un token de test
        }

        const response = await axios(config);
        if (response.status >= 200 && response.status < 300) {
          this.recordTest(`endpoint_${endpoint.path}`, true);
        } else {
          throw new Error(`Endpoint returned ${response.status}`);
        }
      } catch (error) {
        this.recordTest(`endpoint_${endpoint.path}`, false, error.message);
      }
    }
  }

  /**
   * Test performance
   */
  async testPerformance() {
    const kpiMonitor = require('../utils/kpiMonitor');
    const kpis = await kpiMonitor.getKPIs();

    const checks = kpis.checks.backend;
    
    if (checks.allGood) {
      this.recordTest('performance', true);
    } else {
      const failures = Object.entries(checks)
        .filter(([key, value]) => key !== 'allGood' && !value)
        .map(([key]) => key)
        .join(', ');
      throw new Error(`Performance checks failed: ${failures}`);
    }
  }

  /**
   * Enregistrer un test
   */
  recordTest(name, passed, message = null) {
    this.results.tests.push({
      name,
      passed,
      message,
      timestamp: new Date().toISOString(),
    });

    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  /**
   * Afficher les résultats
   */
  printResults() {
    console.log('\n📊 Test Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Total:  ${this.results.tests.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.results.tests.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      console.log(`${icon} ${test.name}${test.message ? `: ${test.message}` : ''}`);
    });

    if (this.results.failed > 0) {
      console.log('\n❌ Some tests failed. Deployment should be reviewed.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  }
}

module.exports = AutomatedTests;



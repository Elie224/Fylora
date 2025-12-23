/**
 * Planificateur de tests de charge réguliers
 * Exécute des tests de charge automatiquement
 */
const cron = require('node-cron');
const LoadTester = require('../../scripts/loadTest');

class LoadTestScheduler {
  constructor() {
    this.isRunning = false;
    this.lastResults = null;
  }

  /**
   * Démarrer le scheduler
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Test de charge quotidien à 2h du matin
    cron.schedule('0 2 * * *', () => {
      this.runDailyLoadTest();
    });

    // Test de charge hebdomadaire le dimanche à 3h
    cron.schedule('0 3 * * 0', () => {
      this.runWeeklyLoadTest();
    });

    console.log('✅ Load test scheduler started');
  }

  /**
   * Test de charge quotidien (100 utilisateurs)
   */
  async runDailyLoadTest() {
    console.log('🧪 Running daily load test...');
    
    process.env.CONCURRENT_USERS = '100';
    process.env.REQUESTS_PER_USER = '10';
    
    const tester = new LoadTester();
    await tester.run();
    
    this.lastResults = tester.results;
    this.checkResults(tester.results);
  }

  /**
   * Test de charge hebdomadaire (1000 utilisateurs)
   */
  async runWeeklyLoadTest() {
    console.log('🧪 Running weekly load test...');
    
    process.env.CONCURRENT_USERS = '1000';
    process.env.REQUESTS_PER_USER = '20';
    
    const tester = new LoadTester();
    await tester.run();
    
    this.lastResults = tester.results;
    this.checkResults(tester.results);
  }

  /**
   * Vérifier les résultats et alerter si nécessaire
   */
  checkResults(results) {
    const errorRate = results.failedRequests / results.totalRequests;
    const avgResponseTime = results.responseTimes.length > 0
      ? results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length
      : 0;

    if (errorRate > 0.01) {
      console.error(`❌ Load test failed: Error rate ${(errorRate * 100).toFixed(2)}%`);
      // Envoyer alerte
    }

    if (avgResponseTime > 500) {
      console.warn(`⚠️  Load test warning: Avg response time ${avgResponseTime.toFixed(2)}ms`);
    }
  }

  /**
   * Obtenir les derniers résultats
   */
  getLastResults() {
    return this.lastResults;
  }
}

module.exports = new LoadTestScheduler();



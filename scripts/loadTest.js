/**
 * Script de test de charge
 * Simule 100-1000 utilisateurs pour tester les performances
 */
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5001';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 100;
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER) || 10;

class LoadTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
    };
  }

  /**
   * Simuler un utilisateur
   */
  async simulateUser(userId) {
    const results = [];
    
    try {
      // Login
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: `test${userId}@example.com`,
        password: 'testpassword',
      });

      const token = loginResponse.data.data.access_token;

      // Faire plusieurs requêtes
      for (let i = 0; i < REQUESTS_PER_USER; i++) {
        const start = Date.now();
        
        try {
          // Dashboard
          await axios.get(`${API_URL}/api/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          // Liste fichiers
          await axios.get(`${API_URL}/api/files`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const duration = Date.now() - start;
          results.push({ success: true, duration });
        } catch (error) {
          const duration = Date.now() - start;
          results.push({ success: false, duration, error: error.message });
        }
      }
    } catch (error) {
      console.error(`User ${userId} failed:`, error.message);
    }

    return results;
  }

  /**
   * Exécuter le test de charge
   */
  async run() {
    console.log(`🚀 Starting load test with ${CONCURRENT_USERS} concurrent users`);
    console.log(`   ${REQUESTS_PER_USER} requests per user`);
    
    const startTime = Date.now();
    const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => i + 1);

    // Exécuter en parallèle (batch de 10)
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(userId => this.simulateUser(userId))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          result.value.forEach(req => {
            this.results.totalRequests++;
            if (req.success) {
              this.results.successfulRequests++;
              this.results.responseTimes.push(req.duration);
            } else {
              this.results.failedRequests++;
              this.results.errors.push(req.error);
            }
          });
        }
      });

      console.log(`   Processed ${Math.min(i + batchSize, users.length)}/${users.length} users`);
    }

    const totalTime = Date.now() - startTime;
    this.printResults(totalTime);
  }

  /**
   * Afficher les résultats
   */
  printResults(totalTime) {
    const avgResponseTime = this.results.responseTimes.length > 0
      ? this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length
      : 0;

    const sortedTimes = [...this.results.responseTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    console.log('\n📊 Load Test Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Requests:     ${this.results.totalRequests}`);
    console.log(`Successful:         ${this.results.successfulRequests} (${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed:             ${this.results.failedRequests} (${((this.results.failedRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Total Time:         ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Avg Response Time:  ${avgResponseTime.toFixed(2)}ms`);
    console.log(`P50:                ${p50 || 0}ms`);
    console.log(`P95:                ${p95 || 0}ms`);
    console.log(`P99:                ${p99 || 0}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Vérifier les KPI
    const errorRate = this.results.failedRequests / this.results.totalRequests;
    const avgResponseOk = avgResponseTime < 200;
    const errorRateOk = errorRate < 0.01;

    console.log('\n✅ KPI Check:');
    console.log(`   Avg Response < 200ms: ${avgResponseOk ? '✅' : '❌'} (${avgResponseTime.toFixed(2)}ms)`);
    console.log(`   Error Rate < 1%:      ${errorRateOk ? '✅' : '❌'} (${(errorRate * 100).toFixed(2)}%)`);
  }
}

// Exécuter le test
if (require.main === module) {
  const tester = new LoadTester();
  tester.run().catch(console.error);
}

module.exports = LoadTester;



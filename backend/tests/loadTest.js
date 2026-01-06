/**
 * Tests de charge pour Fylora
 * Simule 10k uploads simultanés et 1M lectures/jour
 * 
 * Usage:
 *   node backend/tests/loadTest.js --scenario=upload --concurrent=1000
 *   node backend/tests/loadTest.js --scenario=read --requests=1000000
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const API_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:5001';
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test@fylora.com',
  password: process.env.TEST_PASSWORD || 'Test1234!',
};

// Statistiques
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  timeouts: 0,
  latencies: [],
  startTime: null,
  endTime: null,
};

/**
 * Authentifier un utilisateur de test
 */
async function authenticate() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (response.data?.data?.access_token) {
      return response.data.data.access_token;
    }

    // Si l'utilisateur n'existe pas, le créer
    await axios.post(`${API_URL}/api/auth/register`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      display_name: 'Load Test User',
    });

    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    return loginResponse.data?.data?.access_token;
  } catch (err) {
    console.error('❌ Authentication failed:', err.message);
    throw err;
  }
}

/**
 * Test d'upload simple
 */
async function testUpload(token, fileIndex) {
  const startTime = Date.now();
  const testFile = Buffer.from(`Test file content ${fileIndex} - ${Date.now()}`);
  const formData = new FormData();
  formData.append('file', testFile, {
    filename: `test-file-${fileIndex}.txt`,
    contentType: 'text/plain',
  });

  try {
    const response = await axios.post(`${API_URL}/api/files/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders(), // Inclure les headers FormData (Content-Type avec boundary)
      },
      timeout: 30000, // 30 secondes
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const latency = Date.now() - startTime;
    stats.success++;
    stats.latencies.push(latency);

    return { success: true, latency, fileId: response.data?.data?.id };
  } catch (err) {
    const latency = Date.now() - startTime;
    stats.errors++;

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      stats.timeouts++;
    }

    return { success: false, latency, error: err.message };
  }
}

/**
 * Test de lecture (list files)
 */
async function testRead(token) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${API_URL}/api/files`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 2000, // 2 secondes
    });

    const latency = Date.now() - startTime;
    stats.success++;
    stats.latencies.push(latency);

    return { success: true, latency, count: response.data?.data?.items?.length || 0 };
  } catch (err) {
    const latency = Date.now() - startTime;
    stats.errors++;

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      stats.timeouts++;
    }

    return { success: false, latency, error: err.message };
  }
}

/**
 * Test de download
 */
async function testDownload(token, fileId) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${API_URL}/api/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      responseType: 'stream',
      timeout: 10000, // 10 secondes
    });

    const latency = Date.now() - startTime;
    stats.success++;
    stats.latencies.push(latency);

    return { success: true, latency };
  } catch (err) {
    const latency = Date.now() - startTime;
    stats.errors++;

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      stats.timeouts++;
    }

    return { success: false, latency, error: err.message };
  }
}

/**
 * Calculer les statistiques
 */
function calculateStats() {
  const latencies = stats.latencies.sort((a, b) => a - b);
  const count = latencies.length;

  if (count === 0) {
    return {
      p50: 0,
      p95: 0,
      p99: 0,
      avg: 0,
      min: 0,
      max: 0,
    };
  }

  return {
    p50: latencies[Math.floor(count * 0.5)],
    p95: latencies[Math.floor(count * 0.95)],
    p99: latencies[Math.floor(count * 0.99)],
    avg: latencies.reduce((a, b) => a + b, 0) / count,
    min: latencies[0],
    max: latencies[count - 1],
  };
}

/**
 * Afficher les résultats
 */
function printResults() {
  const duration = (stats.endTime - stats.startTime) / 1000; // secondes
  const rps = stats.total / duration; // requests per second
  const latencyStats = calculateStats();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSULTATS DES TESTS DE CHARGE');
  console.log('='.repeat(60));
  console.log(`Total requêtes: ${stats.total}`);
  console.log(`Succès: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(2)}%)`);
  console.log(`Erreurs: ${stats.errors} (${((stats.errors / stats.total) * 100).toFixed(2)}%)`);
  console.log(`Timeouts: ${stats.timeouts}`);
  console.log(`Durée: ${duration.toFixed(2)}s`);
  console.log(`Requêtes/seconde: ${rps.toFixed(2)}`);
  console.log('\n📈 LATENCE (ms):');
  console.log(`  p50: ${latencyStats.p50}ms`);
  console.log(`  p95: ${latencyStats.p95}ms`);
  console.log(`  p99: ${latencyStats.p99}ms`);
  console.log(`  Moyenne: ${latencyStats.avg.toFixed(2)}ms`);
  console.log(`  Min: ${latencyStats.min}ms`);
  console.log(`  Max: ${latencyStats.max}ms`);
  console.log('='.repeat(60) + '\n');

  // Sauvegarder les résultats
  const results = {
    timestamp: new Date().toISOString(),
    total: stats.total,
    success: stats.success,
    errors: stats.errors,
    timeouts: stats.timeouts,
    duration,
    rps,
    latencies: latencyStats,
  };

  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `load-test-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`💾 Résultats sauvegardés: ${resultsFile}`);
}

/**
 * Test d'upload simultané
 */
async function testConcurrentUploads(concurrent = 1000) {
  console.log(`🚀 Test d'upload simultané: ${concurrent} uploads`);
  
  const token = await authenticate();
  console.log('✅ Authentifié');

  stats.startTime = Date.now();
  stats.total = concurrent;

  // Créer toutes les promesses
  const promises = [];
  for (let i = 0; i < concurrent; i++) {
    promises.push(testUpload(token, i));
  }

  // Attendre toutes les promesses
  await Promise.allSettled(promises);

  stats.endTime = Date.now();
  printResults();
}

/**
 * Test de lecture massif
 */
async function testMassiveReads(totalRequests = 1000000) {
  console.log(`🚀 Test de lecture massif: ${totalRequests} requêtes`);
  
  const token = await authenticate();
  console.log('✅ Authentifié');

  stats.startTime = Date.now();
  stats.total = totalRequests;

  // Traiter par batch pour éviter la saturation mémoire
  const batchSize = 100;
  const batches = Math.ceil(totalRequests / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, totalRequests);
    const batchSizeActual = batchEnd - batchStart;

    const promises = [];
    for (let i = 0; i < batchSizeActual; i++) {
      promises.push(testRead(token));
    }

    await Promise.allSettled(promises);

    // Afficher la progression
    if ((batch + 1) % 10 === 0) {
      const progress = ((batch + 1) / batches * 100).toFixed(2);
      console.log(`📊 Progression: ${progress}% (${batch + 1}/${batches} batches)`);
    }
  }

  stats.endTime = Date.now();
  printResults();
}

/**
 * Test mixte (upload + read)
 */
async function testMixed(concurrent = 500, readRatio = 0.7) {
  console.log(`🚀 Test mixte: ${concurrent} requêtes (${(readRatio * 100).toFixed(0)}% lecture)`);
  
  const token = await authenticate();
  console.log('✅ Authentifié');

  stats.startTime = Date.now();
  stats.total = concurrent;

  const promises = [];
  for (let i = 0; i < concurrent; i++) {
    if (Math.random() < readRatio) {
      promises.push(testRead(token));
    } else {
      promises.push(testUpload(token, i));
    }
  }

  await Promise.allSettled(promises);

  stats.endTime = Date.now();
  printResults();
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const scenario = args.find(arg => arg.startsWith('--scenario='))?.split('=')[1] || 'upload';
  const concurrent = parseInt(args.find(arg => arg.startsWith('--concurrent='))?.split('=')[1] || '1000');
  const requests = parseInt(args.find(arg => arg.startsWith('--requests='))?.split('=')[1] || '1000000');

  console.log('🧪 TESTS DE CHARGE FYLORA');
  console.log(`API URL: ${API_URL}`);
  console.log(`Scénario: ${scenario}`);
  console.log('');
  
  // Vérifier que le serveur est accessible
  try {
    const healthCheck = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    console.log('✅ Serveur accessible');
  } catch (err) {
    console.error('❌ Serveur non accessible:', err.message);
    console.error(`   Vérifiez que le serveur est démarré sur ${API_URL}`);
    console.error('   Ou configurez API_URL avec: export API_URL=https://votre-api.com');
    process.exit(1);
  }

  try {
    switch (scenario) {
      case 'upload':
        await testConcurrentUploads(concurrent);
        break;
      case 'read':
        await testMassiveReads(requests);
        break;
      case 'mixed':
        await testMixed(concurrent);
        break;
      default:
        console.error(`❌ Scénario inconnu: ${scenario}`);
        console.log('Scénarios disponibles: upload, read, mixed');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Erreur lors des tests:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testConcurrentUploads,
  testMassiveReads,
  testMixed,
};


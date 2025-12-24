/**
 * Script de test pour vérifier la configuration GitHub OAuth
 */

require('dotenv').config();
const config = require('../config');

console.log('🔍 Test de la configuration GitHub OAuth\n');

const expectedCallbackUri = 'http://localhost:5001/api/auth/github/callback';
const actualCallbackUri = config.oauth.github?.redirectUri;

console.log('📋 Configuration actuelle:');
console.log(`   Client ID: ${config.oauth.github?.clientId || 'MANQUANT'}`);
console.log(`   Client Secret: ${config.oauth.github?.clientSecret ? '✅ Présent' : '❌ MANQUANT'}`);
console.log(`   Redirect URI: ${actualCallbackUri || 'MANQUANT'}`);
console.log('');

console.log('📋 Configuration attendue:');
console.log(`   Redirect URI: ${expectedCallbackUri}`);
console.log('');

if (!actualCallbackUri) {
  console.log('❌ ERREUR: Redirect URI non configuré!');
  process.exit(1);
}

if (actualCallbackUri !== expectedCallbackUri) {
  console.log('❌ ERREUR: Redirect URI ne correspond pas!');
  console.log(`   Attendu: ${expectedCallbackUri}`);
  console.log(`   Actuel:  ${actualCallbackUri}`);
  console.log('');
  console.log('💡 Vérifiez:');
  console.log('   1. Que l\'URI dans GitHub Settings est EXACTEMENT:');
  console.log(`      ${expectedCallbackUri}`);
  console.log('   2. Que l\'URI dans le .env est EXACTEMENT:');
  console.log(`      GITHUB_REDIRECT_URI=${expectedCallbackUri}`);
  process.exit(1);
}

console.log('✅ Configuration correcte!');
console.log('');
console.log('⚠️  IMPORTANT: Vérifiez dans GitHub Settings que:');
console.log(`   Authorization callback URL = ${expectedCallbackUri}`);
console.log('   (Pas de faute de frappe, pas de slash final, pas d\'espace)');
console.log('');
console.log('📝 Si l\'URI dans GitHub est différente, corrigez-la et redémarrez le serveur.');





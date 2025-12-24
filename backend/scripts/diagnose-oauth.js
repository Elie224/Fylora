/**
 * Script de diagnostic OAuth
 * Affiche la configuration actuelle et vérifie les problèmes courants
 */

require('dotenv').config();
const config = require('../config');

console.log('🔍 Diagnostic de la configuration OAuth\n');

// Google OAuth
console.log('📋 Google OAuth:');
console.log('  Client ID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : '❌ MANQUANT');
console.log('  Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Présent' : '❌ MANQUANT');
console.log('  Redirect URI configuré:', config.oauth.google?.redirectUri || 'Non défini');
console.log('  Redirect URI attendu: http://localhost:5001/api/auth/google/callback');
console.log('  ✅ URI correspond:', config.oauth.google?.redirectUri === 'http://localhost:5001/api/auth/google/callback' ? 'OUI' : '❌ NON');
console.log('');

// GitHub OAuth
console.log('📋 GitHub OAuth:');
console.log('  Client ID:', process.env.GITHUB_CLIENT_ID ? `${process.env.GITHUB_CLIENT_ID.substring(0, 10)}...` : '❌ MANQUANT');
console.log('  Client Secret:', process.env.GITHUB_CLIENT_SECRET ? '✅ Présent' : '❌ MANQUANT');
console.log('  Redirect URI configuré:', config.oauth.github?.redirectUri || 'Non défini');
console.log('  Redirect URI attendu: http://localhost:5001/api/auth/github/callback');
console.log('  ✅ URI correspond:', config.oauth.github?.redirectUri === 'http://localhost:5001/api/auth/github/callback' ? 'OUI' : '❌ NON');
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 Actions à effectuer:');
console.log('');
console.log('1. Si "deleted_client" → Créez un NOUVEAU client OAuth dans:');
console.log('   https://console.cloud.google.com/apis/credentials');
console.log('');
console.log('2. URI de redirection à configurer dans Google Cloud Console:');
console.log('   http://localhost:5001/api/auth/google/callback');
console.log('');
console.log('3. Après création, mettez à jour votre .env avec les nouveaux identifiants');
console.log('4. Redémarrez le serveur');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');





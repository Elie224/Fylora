/**
 * Script de vérification de la configuration OAuth
 * Vérifie que toutes les variables d'environnement nécessaires sont présentes
 */

require('dotenv').config();

console.log('🔍 Vérification de la configuration OAuth...\n');

const checks = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:5001/api/auth/github/callback',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  session: {
    secret: process.env.SESSION_SECRET,
  },
};

let allValid = true;

// Vérifier Google OAuth
console.log('📋 Google OAuth:');
if (checks.google.clientId && checks.google.clientSecret) {
  console.log('  ✅ Client ID: présent');
  console.log('  ✅ Client Secret: présent');
  console.log(`  ✅ Redirect URI: ${checks.google.redirectUri}`);
} else {
  console.log('  ❌ Configuration incomplète:');
  if (!checks.google.clientId) console.log('    - GOOGLE_CLIENT_ID manquant');
  if (!checks.google.clientSecret) console.log('    - GOOGLE_CLIENT_SECRET manquant');
  allValid = false;
}
console.log('');

// Vérifier GitHub OAuth
console.log('📋 GitHub OAuth:');
if (checks.github.clientId && checks.github.clientSecret) {
  console.log('  ✅ Client ID: présent');
  console.log('  ✅ Client Secret: présent');
  console.log(`  ✅ Redirect URI: ${checks.github.redirectUri}`);
} else {
  console.log('  ❌ Configuration incomplète:');
  if (!checks.github.clientId) console.log('    - GITHUB_CLIENT_ID manquant');
  if (!checks.github.clientSecret) console.log('    - GITHUB_CLIENT_SECRET manquant');
  allValid = false;
}
console.log('');

// Vérifier Frontend URL
console.log('📋 Frontend:');
console.log(`  ✅ URL: ${checks.frontend.url}`);
console.log('');

// Vérifier Session Secret
console.log('📋 Session:');
if (checks.session.secret) {
  console.log('  ✅ SESSION_SECRET: présent');
} else {
  console.log('  ⚠️  SESSION_SECRET: manquant (utilisera une valeur par défaut)');
}
console.log('');

// Résumé
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (allValid) {
  console.log('✅ Configuration OAuth complète et valide!');
  console.log('\n📝 Prochaines étapes:');
  console.log('  1. Vérifiez que les URIs de redirection sont correctement configurées dans:');
  console.log('     - Google Cloud Console > Credentials > OAuth client');
  console.log('     - GitHub Settings > Developer settings > OAuth Apps');
  console.log('  2. Redémarrez le serveur backend');
  console.log('  3. Testez la connexion OAuth depuis le frontend');
} else {
  console.log('❌ Configuration OAuth incomplète');
  console.log('\n📝 Pour configurer OAuth:');
  console.log('  1. Consultez le guide: backend/OAUTH_SETUP.md');
  console.log('  2. Ajoutez les variables manquantes dans votre fichier .env');
  console.log('  3. Relancez ce script pour vérifier');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(allValid ? 0 : 1);



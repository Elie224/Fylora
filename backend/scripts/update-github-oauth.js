/**
 * Script pour mettre à jour les identifiants GitHub OAuth dans le .env
 * Usage: node scripts/update-github-oauth.js <CLIENT_ID> <CLIENT_SECRET>
 * 
 * Exemple: node scripts/update-github-oauth.js Ov23ligHjSabcdef GOCSPX-abcdefghijklmnop
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('❌ Usage: node scripts/update-github-oauth.js <CLIENT_ID> <CLIENT_SECRET>');
  console.log('');
  console.log('Exemple:');
  console.log('  node scripts/update-github-oauth.js Ov23ligHjSabcdef GOCSPX-abcdefghijklmnop');
  process.exit(1);
}

const GITHUB_CLIENT_ID = args[0];
const GITHUB_CLIENT_SECRET = args[1];
const GITHUB_REDIRECT_URI = 'http://localhost:5001/api/auth/github/callback';

const envPath = path.join(__dirname, '..', '.env');

console.log('🔄 Mise à jour des identifiants GitHub OAuth...\n');

try {
  // Lire le fichier .env
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Fonction pour mettre à jour ou ajouter une variable
  const updateEnvVar = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      return content + (content.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
    }
  };

  // Mettre à jour les variables
  envContent = updateEnvVar(envContent, 'GITHUB_CLIENT_ID', GITHUB_CLIENT_ID);
  envContent = updateEnvVar(envContent, 'GITHUB_CLIENT_SECRET', GITHUB_CLIENT_SECRET);
  envContent = updateEnvVar(envContent, 'GITHUB_REDIRECT_URI', GITHUB_REDIRECT_URI);

  // Écrire le fichier .env
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('✅ Identifiants GitHub OAuth mis à jour avec succès!\n');
  console.log('📋 Configuration:');
  console.log(`   Client ID: ${GITHUB_CLIENT_ID.substring(0, 20)}...`);
  console.log(`   Client Secret: ${GITHUB_CLIENT_SECRET.substring(0, 10)}...`);
  console.log(`   Redirect URI: ${GITHUB_REDIRECT_URI}\n`);
  console.log('⚠️  IMPORTANT:');
  console.log('   1. Vérifiez que l\'URI de redirection dans GitHub Settings est:');
  console.log(`      ${GITHUB_REDIRECT_URI}`);
  console.log('   2. Redémarrez le serveur backend pour appliquer les changements!');
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour:', error.message);
  process.exit(1);
}



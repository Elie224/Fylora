/**
 * Script pour mettre à jour les identifiants Google OAuth dans le .env
 * Usage: node scripts/update-google-oauth.js
 */

const fs = require('fs');
const path = require('path');

// Remplacez ces valeurs par vos propres credentials Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'VOTRE_CLIENT_ID_GOOGLE';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'VOTRE_CLIENT_SECRET_GOOGLE';
const GOOGLE_REDIRECT_URI = 'http://localhost:5001/api/auth/google/callback';

const envPath = path.join(__dirname, '..', '.env');

console.log('🔄 Mise à jour des identifiants Google OAuth...\n');

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
  envContent = updateEnvVar(envContent, 'GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID);
  envContent = updateEnvVar(envContent, 'GOOGLE_CLIENT_SECRET', GOOGLE_CLIENT_SECRET);
  envContent = updateEnvVar(envContent, 'GOOGLE_REDIRECT_URI', GOOGLE_REDIRECT_URI);

  // Écrire le fichier .env
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('✅ Identifiants Google OAuth mis à jour avec succès!\n');
  console.log('📋 Configuration:');
  console.log(`   Client ID: ${GOOGLE_CLIENT_ID.substring(0, 30)}...`);
  console.log(`   Client Secret: ${GOOGLE_CLIENT_SECRET.substring(0, 10)}...`);
  console.log(`   Redirect URI: ${GOOGLE_REDIRECT_URI}\n`);
  console.log('⚠️  IMPORTANT: Redémarrez le serveur backend pour appliquer les changements!');
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour:', error.message);
  process.exit(1);
}


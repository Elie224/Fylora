/**
 * Script pour vérifier que le Client Secret GitHub correspond
 */

require('dotenv').config();

console.log('🔍 Vérification du Client Secret GitHub\n');

const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const expectedLength = 40; // Les Client Secrets GitHub font généralement 40 caractères

if (!clientSecret) {
  console.log('❌ GITHUB_CLIENT_SECRET non trouvé dans le .env');
  process.exit(1);
}

console.log('📋 Client Secret GitHub:');
console.log(`   Longueur: ${clientSecret.length} caractères`);
console.log(`   Attendu: ${expectedLength} caractères`);
console.log(`   Début: ${clientSecret.substring(0, 10)}...`);
console.log(`   Fin: ...${clientSecret.substring(clientSecret.length - 10)}`);
console.log('');

if (clientSecret.length !== expectedLength) {
  console.log('⚠️  ATTENTION: La longueur du Client Secret ne correspond pas à la longueur attendue.');
  console.log('   Cela peut indiquer que le Client Secret est incorrect.');
  console.log('');
}

console.log('📝 Pour régénérer le Client Secret:');
console.log('   1. Allez sur https://github.com/settings/developers');
console.log('   2. Cliquez sur votre application OAuth');
console.log('   3. Cliquez sur "Generate a new client secret"');
console.log('   4. Copiez le nouveau secret');
console.log('   5. Mettez à jour le .env avec:');
console.log(`      GITHUB_CLIENT_SECRET=${clientSecret.substring(0, 10)}...`);
console.log('   6. Redémarrez le serveur');


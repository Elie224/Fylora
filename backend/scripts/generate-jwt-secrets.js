/**
 * Script pour générer des secrets JWT aléatoires
 * Usage: node scripts/generate-jwt-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 Génération de secrets JWT aléatoires...\n');

const jwtSecret = crypto.randomBytes(32).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');

console.log('✅ Secrets générés avec succès!\n');
console.log('📋 Ajoutez ces valeurs dans vos variables d\'environnement Render :\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}\n`);
console.log('⚠️  IMPORTANT: Gardez ces secrets en sécurité et ne les partagez jamais!');


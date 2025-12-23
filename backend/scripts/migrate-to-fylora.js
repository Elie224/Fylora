/**
 * Script de migration vers Fylora
 * 
 * Ce script effectue les migrations suivantes :
 * 1. Met à jour le quota_limit de tous les utilisateurs de 30GB à 1TO
 * 2. Vérifie que la collection 'folders' existe
 * 
 * Usage: node scripts/migrate-to-fylora.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');

let mongoUri = config.database.mongoUri || process.env.MONGO_URI;

// ⚠️ PROTECTION STRICTE : Ne jamais utiliser la base "supfile"
function garantirBaseFylora(uri) {
  if (!uri) {
    return 'mongodb://localhost:27017/Fylora';
  }
  
  // Détecter toute référence à "supfile" (insensible à la casse)
  const uriLower = uri.toLowerCase();
  if (uriLower.includes('/supfile') || uriLower.includes('supfile')) {
    console.warn('⚠️  Détection de référence à "supfile" dans l\'URI MongoDB');
    console.warn('   Redirection automatique vers "Fylora" (protection active)...');
    uri = uri.replace(/\/supfile(\?|$)/gi, '/Fylora$1');
    uri = uri.replace(/supfile/gi, 'Fylora');
  }
  
  // Extraire le nom de la base de données de l'URI
  const dbMatch = uri.match(/\/([^\/\?]+)(\?|$)/);
  
  // Si une base de données est spécifiée et ce n'est pas Fylora, la remplacer
  if (dbMatch && dbMatch[1].toLowerCase() !== 'fylora') {
    console.warn(`⚠️  Base de données "${dbMatch[1]}" détectée, remplacement par "Fylora"...`);
    uri = uri.replace(/\/([^\/\?]+)(\?|$)/, '/Fylora$2');
  }
  
  // Si aucune base n'est spécifiée, ajouter Fylora
  if (!dbMatch) {
    uri = uri.replace(/(\?|$)/, '/Fylora$1');
  }
  
  return uri;
}

// Appliquer la protection stricte
mongoUri = garantirBaseFylora(mongoUri);

// Vérification finale avant connexion
const uriFinale = mongoUri.toLowerCase();
if (uriFinale.includes('supfile')) {
  console.error('❌ Protection active : La base "supfile" ne peut pas être utilisée. Arrêt du script.');
  process.exit(1);
}

mongoose.set('strictQuery', false);

async function migrate() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const db = mongoose.connection.db;
    const nomBase = db.databaseName;
    
    // ⚠️ VÉRIFICATION FINALE : S'assurer que la connexion est bien à Fylora
    if (nomBase.toLowerCase() === 'supfile') {
      console.error(`❌ Protection active : Connexion à la base "supfile" détectée!`);
      console.error('   La connexion sera fermée immédiatement pour protéger la base "supfile".');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    if (nomBase.toLowerCase() !== 'fylora') {
      console.warn(`⚠️  Attention : Connexion à la base "${nomBase}" au lieu de "Fylora"`);
    }
    
    console.log(`✓ Connecté à MongoDB - Base: ${nomBase}`);
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // 1. Migration du quota_limit de 30GB à 1TO
    console.log('\n📊 Migration du quota_limit...');
    const oldQuota = 32212254720; // 30 GB
    const newQuota = 1099511627776; // 1 TO

    const result = await User.updateMany(
      { quota_limit: oldQuota },
      { $set: { quota_limit: newQuota } }
    );

    console.log(`✓ ${result.modifiedCount} utilisateur(s) mis à jour avec le nouveau quota (1 TO)`);

    // Mettre à jour aussi les utilisateurs qui n'ont pas de quota_limit défini
    const resultDefault = await User.updateMany(
      { quota_limit: { $exists: false } },
      { $set: { quota_limit: newQuota } }
    );

    console.log(`✓ ${resultDefault.modifiedCount} utilisateur(s) sans quota_limit ont reçu le quota par défaut (1 TO)`);

    // 2. Vérifier que la collection 'folders' existe
    console.log('\n📁 Vérification de la collection folders...');
    const collections = await db.listCollections({ name: 'folders' }).toArray();
    
    if (collections.length === 0) {
      console.log('⚠️  La collection "folders" n\'existe pas. Création...');
      await db.createCollection('folders');
      console.log('✓ Collection "folders" créée');
    } else {
      console.log('✓ Collection "folders" existe déjà');
    }

    // Vérifier les index sur la collection folders
    const foldersCollection = db.collection('folders');
    const indexes = await foldersCollection.indexes();
    console.log(`✓ ${indexes.length} index(es) trouvé(s) sur la collection folders`);

    console.log('\n✅ Migration terminée avec succès!');
    console.log('\n📝 Résumé:');
    console.log(`   - Quota mis à jour: ${result.modifiedCount + resultDefault.modifiedCount} utilisateur(s)`);
    console.log(`   - Collection folders: ✓`);
    console.log(`   - Nouveau quota par défaut: 1 TO (1099511627776 bytes)`);
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Erreur lors de la migration:', err.message || err);
    process.exit(1);
  }
}

migrate();




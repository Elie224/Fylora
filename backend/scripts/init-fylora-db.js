/**
 * Script d'initialisation de la base de données Fylora
 * 
 * Ce script crée toutes les collections nécessaires avec leurs index
 * pour le projet Fylora dans MongoDB.
 * 
 * ⚠️ IMPORTANT : Ne touche PAS à la base "supfile" (projet séparé)
 * 
 * Usage: node scripts/init-fylora-db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');

// Récupérer l'URI de connexion et pointer vers Fylora
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

// Pour l'exécution locale, utiliser localhost sans authentification
if (process.argv.includes('--local') || !mongoUri || mongoUri.includes('@db:') || mongoUri.includes('authSource')) {
  console.log('ℹ Mode local détecté, utilisation de localhost sans authentification...');
  mongoUri = 'mongodb://localhost:27017/Fylora';
} else {
  // Appliquer la protection stricte
  mongoUri = garantirBaseFylora(mongoUri);
}

// Vérification finale avant connexion
const uriFinale = mongoUri.toLowerCase();
if (uriFinale.includes('supfile')) {
  console.error('❌ Protection active : La base "supfile" ne peut pas être utilisée. Arrêt du script.');
  process.exit(1);
}

mongoose.set('strictQuery', false);

async function initFyloraDatabase() {
  try {
    console.log('🔄 Connexion à MongoDB (base Fylora)...');
    console.log('📍 URI:', mongoUri.replace(/:[^:]*@/, ':****@'));
    
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
    
    console.log(`✓ Connecté à MongoDB - Base: ${nomBase}\n`);

    // Définir toutes les collections avec leurs index
    const collections = [
      {
        name: 'users',
        description: 'Utilisateurs de la plateforme',
        indexes: [
          { key: { email: 1 }, unique: true, name: 'email_unique' },
          { key: { oauth_provider: 1, oauth_id: 1 }, unique: true, sparse: true, name: 'oauth_unique' },
          { key: { is_active: 1 }, name: 'is_active_idx' },
          { key: { created_at: 1 }, name: 'created_at_idx' },
        ],
      },
      {
        name: 'sessions',
        description: 'Sessions utilisateur et tokens de rafraîchissement',
        indexes: [
          { key: { user_id: 1 }, name: 'user_id_idx' },
          { key: { refresh_token: 1 }, unique: true, name: 'refresh_token_unique' },
          { key: { expires_at: 1 }, expireAfterSeconds: 0, name: 'expires_at_ttl' },
          { key: { is_revoked: 1 }, name: 'is_revoked_idx' },
        ],
      },
      {
        name: 'folders',
        description: 'Dossiers et arborescence des fichiers',
        indexes: [
          { key: { owner_id: 1 }, name: 'owner_id_idx' },
          { key: { parent_id: 1 }, name: 'parent_id_idx' },
          { key: { owner_id: 1, parent_id: 1 }, name: 'owner_parent_idx' },
          { key: { created_at: 1 }, name: 'created_at_idx' },
        ],
      },
      {
        name: 'files',
        description: 'Fichiers uploadés par les utilisateurs',
        indexes: [
          { key: { folder_id: 1 }, name: 'folder_id_idx' },
          { key: { owner_id: 1 }, name: 'owner_id_idx' },
          { key: { file_path: 1 }, unique: true, name: 'file_path_unique' },
          { key: { is_deleted: 1 }, name: 'is_deleted_idx' },
          { key: { created_at: 1 }, name: 'created_at_idx' },
        ],
      },
      {
        name: 'shares',
        description: 'Partages de fichiers et dossiers',
        indexes: [
          { key: { public_token: 1 }, unique: true, sparse: true, name: 'public_token_unique' },
          { key: { file_id: 1 }, name: 'file_id_idx' },
          { key: { folder_id: 1 }, name: 'folder_id_idx' },
          { key: { created_by_id: 1 }, name: 'created_by_idx' },
          { key: { shared_with_user_id: 1 }, name: 'shared_with_idx' },
          { key: { expires_at: 1 }, name: 'expires_at_idx' },
          { key: { is_active: 1 }, name: 'is_active_idx' },
        ],
      },
      {
        name: 'audit_logs',
        description: 'Logs d\'audit pour la traçabilité des actions',
        indexes: [
          { key: { user_id: 1 }, name: 'user_id_idx' },
          { key: { action: 1 }, name: 'action_idx' },
          { key: { created_at: 1 }, name: 'created_at_idx' },
          { key: { resource_type: 1, resource_id: 1 }, name: 'resource_idx' },
        ],
      },
    ];

    console.log('📊 Initialisation des collections...\n');

    for (const col of collections) {
      try {
        // Vérifier si la collection existe déjà
        const exists = await db.listCollections({ name: col.name }).toArray();
        
        if (exists.length === 0) {
          // Créer la collection
          await db.createCollection(col.name);
          console.log(`✓ Collection créée: ${col.name} (${col.description})`);
        } else {
          console.log(`ℹ Collection existe déjà: ${col.name}`);
        }

        // Créer ou mettre à jour les index
        const collection = db.collection(col.name);
        console.log(`   📑 Création des index pour ${col.name}...`);
        
        for (const idx of col.indexes) {
          const keyObj = idx.key;
          const options = { ...idx };
          delete options.key;
          
          try {
            await collection.createIndex(keyObj, options);
            const indexName = idx.name || JSON.stringify(keyObj);
            console.log(`     ✓ Index créé: ${indexName}`);
          } catch (e) {
            if (e.code === 85 || e.code === 86) {
              // Index existe déjà avec des options différentes ou identiques
              const indexName = idx.name || JSON.stringify(keyObj);
              console.log(`     ℹ Index existe déjà: ${indexName}`);
            } else {
              console.warn(`     ⚠ Erreur lors de la création de l'index: ${e.message}`);
            }
          }
        }
        console.log('');
      } catch (e) {
        console.error(`✗ Erreur lors de la configuration de ${col.name}:`, e.message);
      }
    }

    // Vérification finale
    console.log('🔍 Vérification finale...\n');
    const allCollections = await db.listCollections().toArray();
    console.log(`✓ ${allCollections.length} collection(s) dans la base "Fylora":`);
    
    for (const col of allCollections) {
      const collection = db.collection(col.name);
      const count = await collection.countDocuments();
      const indexes = await collection.indexes();
      console.log(`   - ${col.name}: ${count} document(s), ${indexes.length} index(es)`);
    }

    console.log('\n✅ Initialisation de la base Fylora terminée avec succès!');
    console.log('⚠️  Note: La base "supfile" n\'a pas été touchée (projet séparé)');
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Erreur lors de l\'initialisation:', err.message || err);
    console.error(err.stack);
    process.exit(1);
  }
}

initFyloraDatabase();




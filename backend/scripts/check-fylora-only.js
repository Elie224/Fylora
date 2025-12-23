/**
 * Script de vérification spécifique de la base "Fylora"
 * Ne touche PAS à la base "supfile"
 * 
 * Usage: node scripts/check-fylora-only.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');

// Récupérer l'URI de connexion
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

async function checkFyloraOnly() {
  try {
    console.log('🔄 Connexion à MongoDB (base Fylora uniquement)...');
    console.log('📍 URI:', mongoUri.replace(/:[^:]*@/, ':****@'));
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    
    // ⚠️ VÉRIFICATION FINALE : S'assurer que la connexion est bien à Fylora
    if (dbName.toLowerCase() === 'supfile') {
      console.error(`❌ Protection active : Connexion à la base "supfile" détectée!`);
      console.error('   La connexion sera fermée immédiatement pour protéger la base "supfile".');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    if (dbName.toLowerCase() !== 'fylora') {
      console.warn(`⚠️  Attention : Connexion à la base "${dbName}" au lieu de "Fylora"`);
    }
    
    console.log('✓ Connecté à MongoDB\n');
    console.log(`📊 Base de données: "${dbName}"\n`);

    // Lister toutes les collections dans Fylora
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('⚠️  Aucune collection trouvée dans la base "Fylora"');
    } else {
      console.log(`✓ ${collections.length} collection(s) trouvée(s) dans "Fylora":\n`);
      
      for (const col of collections) {
        const collection = db.collection(col.name);
        const count = await collection.countDocuments();
        const indexes = await collection.indexes();
        
        console.log(`📁 Collection: ${col.name}`);
        console.log(`   - Documents: ${count}`);
        console.log(`   - Indexes: ${indexes.length}`);
        
        if (count > 0 && count <= 10) {
          // Afficher quelques exemples si peu de documents
          const samples = await collection.find({}).limit(5).toArray();
          console.log(`   - Exemples (${samples.length}):`);
          samples.forEach((doc, idx) => {
            const preview = JSON.stringify(doc).substring(0, 150);
            console.log(`     ${idx + 1}. ${preview}...`);
          });
        } else if (count > 10) {
          // Afficher juste un échantillon
          const sample = await collection.findOne({});
          if (sample) {
            const preview = JSON.stringify(sample).substring(0, 150);
            console.log(`   - Exemple: ${preview}...`);
          }
        }
        console.log('');
      }
    }

    console.log('✅ Vérification terminée!');
    console.log('⚠️  Note: La base "supfile" n\'a pas été touchée (projet séparé)');
    process.exit(0);
  } catch (err) {
    console.error('✗ Erreur lors de la vérification:', err.message || err);
    console.error(err.stack);
    process.exit(1);
  }
}

checkFyloraOnly();




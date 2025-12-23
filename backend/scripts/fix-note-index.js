/**
 * Script pour corriger l'index public_token dans la collection notes
 * À exécuter une seule fois pour corriger l'index existant
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');

async function fixNoteIndex() {
  try {
    // Construire l'URI MongoDB
    const mongoUri = config.database.mongoUri || 
      `mongodb://${config.database.user ? `${config.database.user}:${config.database.password}@` : ''}${config.database.host}:${config.database.port}/${config.database.database || 'Fylora'}`;
    
    console.log('🔌 Connexion à MongoDB...');
    
    // Connexion à MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;
    const notesCollection = db.collection('notes');

    // Supprimer l'ancien index s'il existe
    try {
      await notesCollection.dropIndex('public_token_1');
      console.log('✅ Ancien index public_token_1 supprimé');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index public_token_1 n\'existe pas, création d\'un nouveau');
      } else {
        throw err;
      }
    }

    // Créer le nouvel index avec sparse: true
    await notesCollection.createIndex(
      { public_token: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'public_token_1'
      }
    );

    console.log('✅ Nouvel index public_token_1 créé avec sparse: true');

    // Vérifier l'index
    const indexes = await notesCollection.indexes();
    const publicTokenIndex = indexes.find(idx => idx.name === 'public_token_1');
    
    if (publicTokenIndex) {
      console.log('✅ Index vérifié:', JSON.stringify(publicTokenIndex, null, 2));
    }

    console.log('✅ Migration terminée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

fixNoteIndex();


/**
 * Script pour nettoyer les valeurs null de public_token dans les notes existantes
 * Convertit les null en undefined pour éviter les problèmes d'index
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const Note = require('../models/Note');

async function cleanNullPublicTokens() {
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

    // Trouver toutes les notes avec public_token null
    const notesWithNull = await Note.find({ public_token: null });
    console.log(`📝 Trouvé ${notesWithNull.length} note(s) avec public_token null`);

    if (notesWithNull.length > 0) {
      // Mettre à jour pour supprimer le champ public_token (undefined)
      const result = await Note.updateMany(
        { public_token: null },
        { $unset: { public_token: "" } }
      );
      
      console.log(`✅ ${result.modifiedCount} note(s) mise(s) à jour`);
    }

    console.log('✅ Nettoyage terminé avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

cleanNullPublicTokens();





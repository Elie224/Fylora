/**
 * Script pour définir kouroumaelisee@gmail.com comme administrateur
 * Usage: node backend/scripts/setAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');

async function setAdmin() {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || config.mongodb.uri;
    console.log('🔄 Connexion à MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connexion MongoDB établie');

    // Charger le modèle User
    require('../models/userModel');
    const User = mongoose.models.User;

    const adminEmail = 'kouroumaelisee@gmail.com';

    // Trouver l'utilisateur
    console.log(`🔍 Recherche de l'utilisateur ${adminEmail}...`);
    const user = await User.findOne({ email: adminEmail.toLowerCase().trim() });

    if (!user) {
      console.log(`❌ Utilisateur ${adminEmail} non trouvé`);
      console.log('   Veuillez d\'abord créer cet utilisateur via l\'interface d\'inscription.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Vérifier si déjà admin
    if (user.is_admin) {
      console.log(`ℹ️  ${adminEmail} est déjà administrateur`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Définir comme admin
    user.is_admin = true;
    await user.save();

    console.log(`✅ ${adminEmail} est maintenant administrateur`);
    console.log(`   ID utilisateur: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   is_admin: ${user.is_admin}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

setAdmin();

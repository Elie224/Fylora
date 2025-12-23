/**
 * Script pour définir kouroumaelisee@gmail.com comme administrateur
 * Usage: node backend/scripts/setAdmin.js
 */

const mongoose = require('mongoose');
const config = require('../config');
const db = require('../models/db');

async function setAdmin() {
  try {
    // Attendre la connexion MongoDB
    await db.connectionPromise;
    console.log('✅ Connexion MongoDB établie');

    // Charger le modèle User - UserModel exporte le modèle Mongoose directement
    require('../models/userModel');
    const User = mongoose.models.User;

    const adminEmail = 'kouroumaelisee@gmail.com';

    // Trouver l'utilisateur
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.log(`❌ Utilisateur ${adminEmail} non trouvé`);
      console.log('   Veuillez d\'abord créer cet utilisateur via l\'interface d\'inscription.');
      process.exit(1);
    }

    // Définir comme admin
    user.is_admin = true;
    await user.save();

    console.log(`✅ ${adminEmail} est maintenant administrateur`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

setAdmin();



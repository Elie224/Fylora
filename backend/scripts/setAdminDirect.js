/**
 * Script pour définir kouroumaelisee@gmail.com comme administrateur
 * Se connecte directement à MongoDB sans passer par l'API
 * Usage: node backend/scripts/setAdminDirect.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function setAdminDirect() {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI non trouvé dans les variables d\'environnement');
      process.exit(1);
    }

    // S'assurer que l'URI pointe vers la base Fylora
    let finalUri = mongoUri;
    if (!finalUri.includes('/Fylora') && !finalUri.includes('/fylora')) {
      if (finalUri.endsWith('/')) {
        finalUri = finalUri + 'Fylora';
      } else {
        finalUri = finalUri.replace(/\/([^\/\?]+)(\?|$)/, '/Fylora$2');
      }
    }

    console.log('🔄 Connexion à MongoDB...');
    console.log('📍 URI:', finalUri.replace(/:[^:@]+@/, ':****@')); // Masquer le mot de passe
    
    await mongoose.connect(finalUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connexion MongoDB établie');

    // Charger le modèle User
    const { Schema } = mongoose;
    const UserSchema = new Schema({
      email: String,
      password_hash: String,
      display_name: String,
      avatar_url: String,
      quota_limit: Number,
      quota_used: Number,
      preferences: Schema.Types.Mixed,
      is_active: Boolean,
      is_admin: Boolean,
      last_login_at: Date,
    }, { 
      timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
      },
      collection: 'users'
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

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
      console.log(`   ID utilisateur: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   is_admin: ${user.is_admin}`);
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
    console.log(`   Display name: ${user.display_name || 'N/A'}`);
    
    await mongoose.disconnect();
    console.log('✅ Déconnexion MongoDB');
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

setAdminDirect();


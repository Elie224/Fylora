/**
 * Script de migration pour réduire le quota de stockage de 100 GO à 20 GO
 * 
 * Ce script met à jour tous les utilisateurs existants qui ont un quota de 100 GO
 * pour le réduire à 20 GO (plan FREE uniquement).
 * 
 * Usage:
 *   node backend/scripts/migrate-quota-100-to-20.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Constantes
const OLD_QUOTA = 100 * 1024 * 1024 * 1024; // 100 GO en octets
const NEW_QUOTA = 20 * 1024 * 1024 * 1024;  // 20 GO en octets
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fylora';

// Schéma User simplifié pour la migration
const UserSchema = new mongoose.Schema({
  quota_limit: Number,
  plan: { type: String, default: 'free' }
}, { collection: 'users' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function migrateQuota() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connecté à MongoDB\n');

    // Compter les utilisateurs affectés
    const countQuery = {
      quota_limit: OLD_QUOTA,
      plan: 'free' // Ne modifier que les utilisateurs du plan FREE
    };
    
    const totalAffected = await User.countDocuments(countQuery);
    console.log(`📊 Nombre d'utilisateurs à mettre à jour: ${totalAffected}`);

    if (totalAffected === 0) {
      console.log('✅ Aucun utilisateur à mettre à jour. Migration terminée.');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`\n🔄 Mise à jour de ${totalAffected} utilisateur(s)...`);
    
    // Mettre à jour tous les utilisateurs avec quota de 100 GO (plan FREE uniquement)
    const result = await User.updateMany(
      countQuery,
      { 
        $set: { quota_limit: NEW_QUOTA }
      }
    );

    console.log(`✅ Migration terminée avec succès !`);
    console.log(`   - Utilisateurs modifiés: ${result.modifiedCount}`);
    console.log(`   - Utilisateurs correspondants: ${result.matchedCount}`);
    
    // Vérification
    const remainingCount = await User.countDocuments(countQuery);
    if (remainingCount > 0) {
      console.log(`⚠️  Attention: ${remainingCount} utilisateur(s) ont toujours un quota de 100 GO`);
    } else {
      console.log(`✅ Vérification: Tous les utilisateurs du plan FREE ont maintenant un quota de 20 GO`);
    }

    // Afficher les utilisateurs qui ont dépassé le nouveau quota (pour information)
    const overQuotaCount = await User.countDocuments({
      plan: 'free',
      quota_limit: NEW_QUOTA,
      quota_used: { $gt: NEW_QUOTA }
    });

    if (overQuotaCount > 0) {
      console.log(`\n⚠️  Attention: ${overQuotaCount} utilisateur(s) utilisent plus de 20 GO`);
      console.log('   Ils ne pourront plus uploader de fichiers jusqu\'à ce qu\'ils libèrent de l\'espace.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Migration terminée avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

// Exécuter la migration
if (require.main === module) {
  migrateQuota();
}

module.exports = { migrateQuota };

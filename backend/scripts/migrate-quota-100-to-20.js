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

// Utiliser la même logique de connexion que l'application
const config = require('../config');
let mongoUri = config.database.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URI;

// Constantes
const OLD_QUOTA = 100 * 1024 * 1024 * 1024; // 100 GO en octets
const NEW_QUOTA = 20 * 1024 * 1024 * 1024;  // 20 GO en octets
const MONGODB_URI = mongoUri || 'mongodb://localhost:27017/Fylora';

// Utiliser directement le modèle User existant
// Note: On doit se connecter d'abord avant de charger le modèle
let User;

async function migrateQuota() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connecté à MongoDB\n');

    // Charger le modèle User après la connexion
    // Utiliser mongoose directement pour accéder à la collection
    User = mongoose.connection.collection('users');

    // D'abord, afficher des statistiques pour comprendre la situation
    const totalUsers = await User.countDocuments({});
    console.log(`📊 Statistiques de la base de données:`);
    console.log(`   - Total d'utilisateurs: ${totalUsers}`);

    // Compter les utilisateurs avec quota de 100 GO (tous plans confondus)
    const usersWith100GB = await User.countDocuments({ quota_limit: OLD_QUOTA });
    console.log(`   - Utilisateurs avec quota de 100 GO: ${usersWith100GB}`);

    // Compter les utilisateurs avec plan 'free' et quota de 100 GO
    const usersFreeWith100GB = await User.countDocuments({ 
      quota_limit: OLD_QUOTA,
      plan: 'free'
    });
    console.log(`   - Utilisateurs plan FREE avec quota de 100 GO: ${usersFreeWith100GB}`);

    // Compter les utilisateurs sans plan défini et quota de 100 GO
    const usersNoPlanWith100GB = await User.countDocuments({
      quota_limit: OLD_QUOTA,
      $or: [
        { plan: { $exists: false } },
        { plan: null },
        { plan: '' }
      ]
    });
    console.log(`   - Utilisateurs sans plan défini avec quota de 100 GO: ${usersNoPlanWith100GB}\n`);

    // Si aucun utilisateur avec 100 GO, vérifier s'il y a des utilisateurs avec d'autres quotas
    if (usersWith100GB === 0) {
      const sampleUsers = await User.find({}).limit(5).toArray();
      if (sampleUsers.length > 0) {
        console.log(`\n📋 Exemples de quotas trouvés (5 premiers utilisateurs):`);
        sampleUsers.forEach((user, index) => {
          const quotaGB = user.quota_limit ? (user.quota_limit / (1024 * 1024 * 1024)).toFixed(2) : 'N/A';
          const plan = user.plan || 'non défini';
          console.log(`   ${index + 1}. Email: ${user.email || 'N/A'}, Plan: ${plan}, Quota: ${quotaGB} GO`);
        });
      }
    }

    // Requête pour trouver TOUS les utilisateurs avec quota de 100 GO
    // (plan FREE, plan non défini, ou plan null)
    const countQuery = {
      quota_limit: OLD_QUOTA,
      $or: [
        { plan: 'free' },
        { plan: { $exists: false } },
        { plan: null },
        { plan: '' }
      ]
    };
    
    const totalAffected = await User.countDocuments(countQuery);
    console.log(`\n📊 Nombre d'utilisateurs à mettre à jour: ${totalAffected}`);

    if (totalAffected === 0) {
      console.log('\n✅ Aucun utilisateur à mettre à jour. Migration terminée.');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`\n🔄 Mise à jour de ${totalAffected} utilisateur(s)...`);
    
    // Mettre à jour tous les utilisateurs avec quota de 100 GO
    // (plan FREE ou plan non défini)
    const result = await User.updateMany(
      countQuery,
      { 
        $set: { 
          quota_limit: NEW_QUOTA,
          plan: 'free' // S'assurer que tous ont le plan 'free'
        }
      }
    );

    console.log(`\n✅ Migration terminée avec succès !`);
    console.log(`   - Utilisateurs modifiés: ${result.modifiedCount}`);
    console.log(`   - Utilisateurs correspondants: ${result.matchedCount}`);
    
    // Vérification
    const remainingCount = await User.countDocuments({ quota_limit: OLD_QUOTA });
    if (remainingCount > 0) {
      console.log(`\n⚠️  Attention: ${remainingCount} utilisateur(s) ont toujours un quota de 100 GO`);
      console.log('   (Ils ont probablement un plan payant - non modifiés intentionnellement)');
    } else {
      console.log(`\n✅ Vérification: Tous les utilisateurs du plan FREE ont maintenant un quota de 20 GO`);
    }

    // Afficher les utilisateurs qui ont dépassé le nouveau quota (pour information)
    const overQuotaCount = await User.countDocuments({
      $or: [
        { plan: 'free' },
        { plan: { $exists: false } },
        { plan: null }
      ],
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

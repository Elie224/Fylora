/**
 * Script de Migration des Utilisateurs vers Plan FREE
 * Met à jour tous les utilisateurs existants avec:
 * - plan: 'free'
 * - quota_limit: 100 Go (au lieu de 1 To)
 * 
 * Usage: node scripts/migrateUsersToFreePlan.js [--dry-run] [--user-id=xxx]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const planService = require('../services/planService');
const User = require('../models/userModel');
const logger = require('../utils/logger');

const DRY_RUN = process.argv.includes('--dry-run');
const USER_ID_FILTER = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];

async function migrateUser(user) {
  const currentPlan = user.plan || null;
  const currentQuota = user.quota_limit || 100 * 1024 * 1024 * 1024; // 100 Go par défaut (plan FREE)
  const freeQuota = planService.getStorageQuota('free'); // 100 Go

  // Vérifier si déjà migré
  if (user.plan === 'free' && user.quota_limit === freeQuota) {
    return { migrated: false, reason: 'already_migrated' };
  }

  // Vérifier si l'utilisateur utilise plus que 100 Go
  const used = user.quota_used || 0;
  if (used > freeQuota) {
    logger.logWarn('User exceeds FREE quota', {
      userId: user._id.toString(),
      email: user.email,
      used: used,
      freeQuota: freeQuota,
      currentQuota: currentQuota
    });
    // On migre quand même mais l'utilisateur devra upgrader
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would migrate: ${user.email}`);
    console.log(`  Current plan: ${currentPlan || 'null'} → free`);
    console.log(`  Current quota: ${(currentQuota / 1024 / 1024 / 1024).toFixed(2)} GB → ${(freeQuota / 1024 / 1024 / 1024).toFixed(2)} GB`);
    return { migrated: false, dryRun: true };
  }

  try {
    await User.findByIdAndUpdate(user._id, {
      plan: 'free',
      quota_limit: freeQuota,
    });

    console.log(`✅ Migrated: ${user.email}`);
    console.log(`  Plan: ${currentPlan || 'null'} → free`);
    console.log(`  Quota: ${(currentQuota / 1024 / 1024 / 1024).toFixed(2)} GB → ${(freeQuota / 1024 / 1024 / 1024).toFixed(2)} GB`);
    
    return {
      migrated: true,
      userId: user._id.toString(),
      email: user.email,
      oldPlan: currentPlan,
      oldQuota: currentQuota,
      newQuota: freeQuota,
    };
  } catch (error) {
    console.error(`❌ Error migrating ${user.email}:`, error.message);
    return { migrated: false, error: error.message };
  }
}

async function main() {
  console.log('🔄 Starting migration to FREE plan...');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  
  // Connecter à MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Construire la requête
  const query = {};
  if (USER_ID_FILTER) {
    query._id = new mongoose.Types.ObjectId(USER_ID_FILTER);
  }

  // Récupérer les utilisateurs
  const users = await User.find(query).lean();
  
  console.log(`📊 Found ${users.length} users to migrate`);

  if (users.length === 0) {
    console.log('✅ No users to migrate');
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  let alreadyMigrated = 0;
  let errors = 0;
  let exceedsQuota = 0;

  // Migrer utilisateur par utilisateur
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`\n[${i + 1}/${users.length}] Processing: ${user.email}`);

    const result = await migrateUser(user);
    
    if (result.migrated) {
      migrated++;
      if (result.oldQuota && result.oldQuota > planService.getStorageQuota('free')) {
        exceedsQuota++;
      }
    } else if (result.reason === 'already_migrated') {
      alreadyMigrated++;
    } else {
      errors++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Total users: ${users.length}`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Already migrated: ${alreadyMigrated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Users exceeding FREE quota: ${exceedsQuota}`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No users were actually migrated.');
    console.log('   Run without --dry-run to perform the actual migration.');
  } else {
    console.log('\n✅ Migration completed!');
    if (exceedsQuota > 0) {
      console.log(`\n⚠️  Warning: ${exceedsQuota} users exceed the FREE quota limit.`);
      console.log('   They will need to upgrade to continue using their files.');
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});


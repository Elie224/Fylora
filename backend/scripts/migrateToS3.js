/**
 * Script de Migration vers S3
 * Migre les fichiers locaux vers Object Storage (S3)
 * 
 * Usage: node scripts/migrateToS3.js [--dry-run] [--user-id=xxx]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const storageService = require('../services/storageService');
const FileModel = require('../models/fileModel');
const config = require('../config');

const DRY_RUN = process.argv.includes('--dry-run');
const USER_ID_FILTER = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];

async function migrateFile(file, uploadDir) {
  const filePath = path.join(uploadDir, file.file_path);
  
  try {
    // Vérifier que le fichier existe
    await fs.access(filePath);
    
    // Lire le fichier
    const fileBuffer = await fs.readFile(filePath);
    const fileSize = fileBuffer.length;
    
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would migrate: ${file.name} (${fileSize} bytes)`);
      return { migrated: false, dryRun: true };
    }

    // Uploader vers S3
    const fileKey = `users/${file.owner_id}/${path.basename(file.file_path)}`;
    
    // Utiliser l'API S3 directement pour uploader
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      s3ForcePathStyle: !!process.env.S3_ENDPOINT,
    });

    const bucketName = process.env.S3_BUCKET || 'fylora-files';

    await s3.putObject({
      Bucket: bucketName,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: file.mime_type,
      Metadata: {
        'original-name': encodeURIComponent(file.name),
        'user-id': file.owner_id.toString(),
        'file-size': fileSize.toString(),
      },
      ServerSideEncryption: 'AES256',
    }).promise();

    // Mettre à jour la métadonnée
    await FileModel.update(file._id.toString(), {
      file_path: fileKey,
      s3_key: fileKey,
      storage_type: 's3',
    });

    console.log(`✅ Migrated: ${file.name} → ${fileKey}`);
    
    return {
      migrated: true,
      fileKey,
      size: fileSize
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`⚠️  File not found (orphan): ${file.name} (${filePath})`);
      return { migrated: false, error: 'file_not_found' };
    }
    
    console.error(`❌ Error migrating ${file.name}:`, error.message);
    return { migrated: false, error: error.message };
  }
}

async function main() {
  console.log('🔄 Starting migration to S3...');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  
  if (!storageService.isStorageConfigured()) {
    console.error('❌ S3 not configured. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  // Connecter à MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Construire la requête
  const query = {
    is_deleted: false,
    storage_type: { $ne: 's3' }, // Fichiers pas encore migrés
  };

  if (USER_ID_FILTER) {
    query.owner_id = new mongoose.Types.ObjectId(USER_ID_FILTER);
  }

  // Récupérer les fichiers
  const File = mongoose.models.File || mongoose.model('File');
  const files = await File.find(query).lean();
  
  console.log(`📊 Found ${files.length} files to migrate`);

  if (files.length === 0) {
    console.log('✅ No files to migrate');
    await mongoose.disconnect();
    return;
  }

  const uploadDir = path.resolve(config.upload.uploadDir);
  let migrated = 0;
  let errors = 0;
  let notFound = 0;
  let totalSize = 0;

  // Migrer fichier par fichier
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n[${i + 1}/${files.length}] Processing: ${file.name}`);

    const result = await migrateFile(file, uploadDir);
    
    if (result.migrated) {
      migrated++;
      totalSize += result.size || 0;
    } else if (result.error === 'file_not_found') {
      notFound++;
    } else {
      errors++;
    }

    // Pause pour ne pas surcharger
    if ((i + 1) % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Total files: ${files.length}`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Not found (orphan): ${notFound}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total size migrated: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No files were actually migrated.');
    console.log('   Run without --dry-run to perform the actual migration.');
  } else {
    console.log('\n✅ Migration completed!');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});


/**
 * Indexation MongoDB pour optimiser les performances des requêtes
 * À exécuter au démarrage de l'application
 */

const mongoose = require('mongoose');

/**
 * Créer tous les index nécessaires pour optimiser les performances
 */
async function createIndexes() {
  try {
    const File = mongoose.models.File;
    const Folder = mongoose.models.Folder;
    const User = mongoose.models.User;
    const Share = mongoose.models.Share;

    // Index pour les fichiers
    if (File) {
      await File.collection.createIndex({ owner_id: 1, folder_id: 1 });
      await File.collection.createIndex({ owner_id: 1, is_deleted: 1 });
      await File.collection.createIndex({ owner_id: 1, created_at: -1 });
      await File.collection.createIndex({ owner_id: 1, name: 1 });
      await File.collection.createIndex({ mime_type: 1 });
      await File.collection.createIndex({ size: 1 });
      console.log('✓ File indexes created');
    }

    // Index pour les dossiers
    if (Folder) {
      await Folder.collection.createIndex({ owner_id: 1, parent_id: 1 });
      await Folder.collection.createIndex({ owner_id: 1, is_deleted: 1 });
      await Folder.collection.createIndex({ owner_id: 1, created_at: -1 });
      await Folder.collection.createIndex({ owner_id: 1, name: 1 });
      console.log('✓ Folder indexes created');
    }

    // Index pour les utilisateurs
    if (User) {
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ created_at: -1 });
      console.log('✓ User indexes created');
    }

    // Index pour les partages
    if (Share) {
      try {
        // Supprimer l'ancien index sur 'token' s'il existe (erreur de nom)
        try {
          await Share.collection.dropIndex('token_1');
        } catch (dropErr) {
          // Ignorer si l'index n'existe pas
        }
        
        // Créer l'index sur public_token avec sparse pour ignorer les valeurs null
        // (les partages internes n'ont pas de public_token)
        await Share.collection.createIndex({ public_token: 1 }, { unique: true, sparse: true });
      } catch (tokenIndexErr) {
        // Si l'index existe déjà ou s'il y a des doublons, essayer de le recréer
        if (tokenIndexErr.code === 11000 || tokenIndexErr.codeName === 'DuplicateKey') {
          console.warn('⚠️  Duplicate tokens found, cleaning up...');
          // Supprimer l'index problématique et le recréer
          try {
            await Share.collection.dropIndex('token_1');
          } catch (e) {}
          try {
            await Share.collection.dropIndex('public_token_1');
          } catch (e) {}
          // Recréer avec sparse pour ignorer les null
          await Share.collection.createIndex({ public_token: 1 }, { unique: true, sparse: true });
        } else {
          throw tokenIndexErr;
        }
      }
      
      await Share.collection.createIndex({ file_id: 1 });
      await Share.collection.createIndex({ folder_id: 1 });
      
      // Gérer l'index expires_at avec TTL (peut avoir des options différentes)
      try {
        // Supprimer l'ancien index s'il existe avec des options différentes
        try {
          await Share.collection.dropIndex('expires_at_1');
        } catch (dropErr) {
          // Ignorer si l'index n'existe pas
        }
        // Créer l'index avec TTL (expireAfterSeconds: 0 signifie pas d'expiration automatique)
        await Share.collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
      } catch (expiresErr) {
        // Si l'index existe déjà avec les bonnes options, c'est OK
        if (expiresErr.code !== 85 && expiresErr.codeName !== 'IndexOptionsConflict') {
          throw expiresErr;
        }
        // Vérifier si l'index existe déjà
        const indexes = await Share.collection.indexes();
        const expiresIndex = indexes.find(idx => idx.name === 'expires_at_1');
        if (expiresIndex) {
          console.log('✓ Share expires_at index already exists');
        } else {
          // Si l'index n'existe pas, essayer sans expireAfterSeconds
          await Share.collection.createIndex({ expires_at: 1 });
        }
      }
      
      console.log('✓ Share indexes created');
    }

    // Index pour les versions de fichiers
    const FileVersion = mongoose.models.FileVersion;
    if (FileVersion) {
      await FileVersion.collection.createIndex({ file_id: 1, version_number: -1 });
      await FileVersion.collection.createIndex({ file_id: 1, is_current: 1 });
      await FileVersion.collection.createIndex({ created_at: 1 });
      console.log('✓ FileVersion indexes created');
    }

    // Index pour les notifications
    const Notification = mongoose.models.Notification;
    if (Notification) {
      await Notification.collection.createIndex({ user_id: 1, is_read: 1, created_at: -1 });
      await Notification.collection.createIndex({ user_id: 1, type: 1 });
      await Notification.collection.createIndex({ read_at: 1 }, { expireAfterSeconds: 2592000, partialFilterExpression: { is_read: true } });
      console.log('✓ Notification indexes created');
    }

    // Index pour les activités
    const ActivityLog = mongoose.models.ActivityLog;
    if (ActivityLog) {
      await ActivityLog.collection.createIndex({ user_id: 1, created_at: -1 });
      await ActivityLog.collection.createIndex({ resource_type: 1, resource_id: 1 });
      await ActivityLog.collection.createIndex({ action_type: 1, created_at: -1 });
      await ActivityLog.collection.createIndex({ created_at: 1 }, { expireAfterSeconds: 31536000 });
      console.log('✓ ActivityLog indexes created');
    }

    // Index pour les tags
    const Tag = mongoose.models.Tag;
    if (Tag) {
      await Tag.collection.createIndex({ user_id: 1, name: 1 }, { unique: true });
      await Tag.collection.createIndex({ user_id: 1 });
      console.log('✓ Tag indexes created');
    }

    // Index pour les notes
    const Note = mongoose.models.Note;
    if (Note) {
      await Note.collection.createIndex({ owner_id: 1, is_deleted: 1, created_at: -1 });
      await Note.collection.createIndex({ folder_id: 1, is_deleted: 1 });
      await Note.collection.createIndex({ 'shared_with.user_id': 1, is_deleted: 1 });
      await Note.collection.createIndex({ public_token: 1 });
      console.log('✓ Note indexes created');
    }

    // Index pour les versions de notes
    const NoteVersion = mongoose.models.NoteVersion;
    if (NoteVersion) {
      await NoteVersion.collection.createIndex({ note_id: 1, version_number: -1 });
      await NoteVersion.collection.createIndex({ note_id: 1, created_at: -1 });
      console.log('✓ NoteVersion indexes created');
    }

    // Index pour les commentaires
    const Comment = mongoose.models.Comment;
    if (Comment) {
      await Comment.collection.createIndex({ note_id: 1, resolved: 1, created_at: -1 });
      await Comment.collection.createIndex({ user_id: 1, created_at: -1 });
      console.log('✓ Comment indexes created');
    }

    // Index pour les templates de notes
    const NoteTemplate = mongoose.models.NoteTemplate;
    if (NoteTemplate) {
      await NoteTemplate.collection.createIndex({ category: 1, is_public: 1 });
      await NoteTemplate.collection.createIndex({ created_by: 1 });
      await NoteTemplate.collection.createIndex({ usage_count: -1 });
      console.log('✓ NoteTemplate indexes created');
    }

    console.log('✅ All database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    // Ne pas bloquer le démarrage si les index existent déjà
    if (error.code !== 85 && error.code !== 86) {
      throw error;
    }
  }
}

// Index pour les nouveaux modèles
async function createAdditionalIndexes() {
  try {
    // Les index sont déjà définis dans les schémas Mongoose
    // Cette fonction peut être utilisée pour créer des index supplémentaires si nécessaire
    console.log('✓ Additional indexes ready');
  } catch (error) {
    console.warn('⚠️  Could not create additional indexes:', error.message);
  }
}

module.exports = { createIndexes, createAdditionalIndexes };


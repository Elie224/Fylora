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
      await Share.collection.createIndex({ token: 1 }, { unique: true });
      await Share.collection.createIndex({ file_id: 1 });
      await Share.collection.createIndex({ folder_id: 1 });
      await Share.collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
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


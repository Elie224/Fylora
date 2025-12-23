/**
 * Index composites pour requêtes complexes optimisées
 * Améliore les performances des requêtes multi-critères
 */
const mongoose = require('mongoose');

class CompositeIndexManager {
  /**
   * Créer tous les index composites nécessaires
   */
  async createCompositeIndexes() {
    try {
      const File = mongoose.models.File;
      const Folder = mongoose.models.Folder;
      const User = mongoose.models.User;

      // Index composites pour fichiers
      if (File) {
        // Recherche par owner + folder + deleted (très fréquent)
        await File.collection.createIndex(
          { owner_id: 1, folder_id: 1, is_deleted: 1 },
          { name: 'idx_owner_folder_deleted' }
        );

        // Recherche par owner + type + date (dashboard)
        await File.collection.createIndex(
          { owner_id: 1, mime_type: 1, updated_at: -1 },
          { name: 'idx_owner_type_date' }
        );

        // Recherche par owner + name (recherche)
        await File.collection.createIndex(
          { owner_id: 1, name: 'text' },
          { name: 'idx_owner_name_text' }
        );

        // Recherche par owner + size (tri par taille)
        await File.collection.createIndex(
          { owner_id: 1, size: -1 },
          { name: 'idx_owner_size' }
        );

        console.log('✓ Composite indexes created for File');
      }

      // Index composites pour dossiers
      if (Folder) {
        // Recherche par owner + parent + deleted
        await Folder.collection.createIndex(
          { owner_id: 1, parent_id: 1, is_deleted: 1 },
          { name: 'idx_folder_owner_parent_deleted' }
        );

        // Recherche par owner + name (recherche)
        await Folder.collection.createIndex(
          { owner_id: 1, name: 'text' },
          { name: 'idx_folder_owner_name_text' }
        );

        console.log('✓ Composite indexes created for Folder');
      }

      // Index composites pour utilisateurs
      if (User) {
        // Recherche par email + status
        await User.collection.createIndex(
          { email: 1, is_active: 1 },
          { name: 'idx_user_email_active' }
        );

        console.log('✓ Composite indexes created for User');
      }

      console.log('✅ All composite indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating composite indexes:', error);
      if (error.code !== 85 && error.code !== 86) {
        throw error;
      }
    }
  }

  /**
   * Analyser les requêtes pour suggérer des index
   */
  async analyzeQueries() {
    const db = mongoose.connection.db;
    const suggestions = [];

    try {
      // Analyser le profiler MongoDB
      const profilerData = await db.collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(100)
        .toArray();

      // Grouper par pattern de requête
      const queryPatterns = {};
      profilerData.forEach(query => {
        const pattern = this.extractQueryPattern(query.command);
        if (!queryPatterns[pattern]) {
          queryPatterns[pattern] = {
            count: 0,
            totalDuration: 0,
            avgDuration: 0,
          };
        }
        queryPatterns[pattern].count++;
        queryPatterns[pattern].totalDuration += query.millis || 0;
      });

      // Suggérer des index pour les requêtes lentes fréquentes
      Object.entries(queryPatterns).forEach(([pattern, stats]) => {
        stats.avgDuration = stats.totalDuration / stats.count;
        if (stats.avgDuration > 100 && stats.count > 10) {
          suggestions.push({
            pattern,
            count: stats.count,
            avgDuration: stats.avgDuration,
            suggestion: this.suggestIndex(pattern),
          });
        }
      });
    } catch (error) {
      console.warn('Could not analyze queries:', error.message);
    }

    return suggestions;
  }

  /**
   * Extraire le pattern d'une requête
   */
  extractQueryPattern(command) {
    if (!command) return 'unknown';
    
    const keys = Object.keys(command).sort().join(',');
    return keys;
  }

  /**
   * Suggérer un index basé sur un pattern
   */
  suggestIndex(pattern) {
    // Logique simplifiée - à améliorer avec analyse plus poussée
    if (pattern.includes('owner_id') && pattern.includes('folder_id')) {
      return 'Index composite sur owner_id + folder_id';
    }
    return 'Analyser manuellement';
  }
}

module.exports = new CompositeIndexManager();



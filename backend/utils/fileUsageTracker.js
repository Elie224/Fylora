/**
 * Utilitaire pour tracker l'utilisation des fichiers
 */
const FileUsage = require('../models/FileUsage');

/**
 * Enregistrer l'utilisation d'un fichier
 */
async function trackFileUsage(fileId, userId, actionType, metadata = {}) {
  try {
    if (!fileId || !userId) {
      return; // Ne pas tracker si pas d'ID valide
    }

    // Chercher une utilisation existante
    let usage = await FileUsage.findOne({
      file_id: fileId,
      user_id: userId,
      action_type: actionType,
    });

    if (usage) {
      // Mettre à jour
      usage.access_count += 1;
      usage.last_accessed_at = new Date();
      if (metadata.duration_ms) {
        usage.duration_ms = metadata.duration_ms;
      }
      if (metadata.ip_address) {
        usage.ip_address = metadata.ip_address;
      }
      if (metadata.user_agent) {
        usage.user_agent = metadata.user_agent;
      }
      if (metadata.metadata) {
        usage.metadata = { ...usage.metadata, ...metadata.metadata };
      }
    } else {
      // Créer nouveau
      usage = new FileUsage({
        file_id: fileId,
        user_id: userId,
        action_type: actionType,
        access_count: 1,
        last_accessed_at: new Date(),
        first_accessed_at: new Date(),
        duration_ms: metadata.duration_ms || 0,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        metadata: metadata.metadata || {},
      });
    }

    await usage.save();
  } catch (error) {
    // Ne pas bloquer si le tracking échoue
    console.error('Error tracking file usage:', error);
  }
}

module.exports = {
  trackFileUsage,
};



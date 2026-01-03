/**
 * Contrôleur GDPR/RGPD pour la conformité avec le Règlement Général sur la Protection des Données
 * 
 * Implémente les droits des utilisateurs selon le RGPD :
 * - Article 15 : Droit d'accès aux données personnelles
 * - Article 17 : Droit à l'effacement (droit à l'oubli)
 * - Article 20 : Droit à la portabilité des données
 * - Article 7 : Consentement explicite
 */

const UserModel = require('../models/userModel');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const SessionModel = require('../models/sessionModel');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const logger = require('../utils/logger');

/**
 * Article 15 RGPD - Droit d'accès aux données personnelles
 * Export complet de toutes les données d'un utilisateur
 */
async function exportUserData(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Vérifier que l'utilisateur demande ses propres données
    if (req.params.id && req.params.id !== userId) {
      return res.status(403).json({
        error: { message: 'Vous ne pouvez exporter que vos propres données' }
      });
    }

    const User = mongoose.models.User || mongoose.model('User');
    const user = await User.findById(userId).lean();
    
    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    // Récupérer toutes les données de l'utilisateur
    const [files, folders, sessions] = await Promise.all([
      FileModel.findByOwner(userId, null, true), // Inclure les fichiers supprimés
      FolderModel.findByOwner(userId, null, true), // Inclure les dossiers supprimés
      SessionModel.findActiveSessionsByUserId(userId)
    ]);

    // Préparer les données pour l'export (sans informations sensibles)
    const exportData = {
      user: {
        id: user._id.toString(),
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        quota_limit: user.quota_limit,
        quota_used: user.quota_used,
        preferences: user.preferences,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
        is_active: user.is_active,
        // Ne pas inclure password_hash, oauth_id, etc.
      },
      files: files.map(f => ({
        id: f.id || f._id?.toString(),
        name: f.name,
        mime_type: f.mime_type,
        size: f.size,
        created_at: f.created_at,
        updated_at: f.updated_at,
        is_deleted: f.is_deleted || false,
        deleted_at: f.deleted_at || null,
        // Ne pas inclure file_path pour la sécurité
      })),
      folders: folders.map(f => ({
        id: f.id || f._id?.toString(),
        name: f.name,
        parent_id: f.parent_id?.toString() || null,
        created_at: f.created_at,
        updated_at: f.updated_at,
        is_deleted: f.is_deleted || false,
        deleted_at: f.deleted_at || null,
      })),
      sessions: sessions.map(s => ({
        id: s._id?.toString(),
        created_at: s.created_at,
        expires_at: s.expires_at,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        is_revoked: s.is_revoked || false,
        // Ne pas inclure les tokens pour la sécurité
      })),
      export_date: new Date().toISOString(),
      rgpd_compliance: {
        article_15: 'Droit d\'accès aux données personnelles',
        data_retention: 'Les données sont conservées conformément à la politique de rétention',
        encryption: 'Les fichiers sont chiffrés bout en bout'
      }
    };

    // Retourner les données en JSON
    res.status(200).json({
      data: exportData,
      message: 'Export de données personnelles conforme RGPD'
    });
  } catch (err) {
    logger.logError(err, { context: 'exportUserData', userId: req.user?.id });
    next(err);
  }
}

/**
 * Article 17 RGPD - Droit à l'effacement (droit à l'oubli)
 * Suppression complète et définitive de toutes les données d'un utilisateur
 */
async function deleteUserData(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Vérifier que l'utilisateur demande la suppression de ses propres données
    if (req.params.id && req.params.id !== userId) {
      return res.status(403).json({
        error: { message: 'Vous ne pouvez supprimer que vos propres données' }
      });
    }

    const User = mongoose.models.User || mongoose.model('User');
    const File = mongoose.models.File || mongoose.model('File');
    const Folder = mongoose.models.Folder || mongoose.model('Folder');
    const Session = mongoose.models.Session || mongoose.model('Session');

    // Récupérer tous les fichiers de l'utilisateur pour suppression physique
    const files = await File.find({ owner_id: userId }).lean();
    
    // Supprimer physiquement tous les fichiers
    for (const file of files) {
      if (file.file_path) {
        try {
          await fs.unlink(file.file_path);
        } catch (err) {
          logger.logError(err, { context: 'deleteUserData - file deletion', fileId: file._id });
          // Continuer même si un fichier ne peut pas être supprimé
        }
      }
    }

    // Supprimer tous les dossiers de l'utilisateur
    const folders = await Folder.find({ owner_id: userId }).lean();
    for (const folder of folders) {
      try {
        await Folder.findByIdAndDelete(folder._id);
      } catch (err) {
        logger.logError(err, { context: 'deleteUserData - folder deletion', folderId: folder._id });
      }
    }

    // Supprimer tous les fichiers de la base de données
    await File.deleteMany({ owner_id: userId });

    // Supprimer toutes les sessions
    await Session.deleteMany({ user_id: userId });

    // Supprimer le répertoire utilisateur s'il existe
    const uploadDir = path.join(process.cwd(), 'uploads', `user_${userId}`);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (err) {
      logger.logError(err, { context: 'deleteUserData - directory deletion' });
    }

    // Supprimer l'utilisateur de la base de données
    await User.findByIdAndDelete(userId);

    // Journaliser la suppression pour conformité RGPD
    logger.logInfo({
      message: 'User data deleted - RGPD Article 17',
      userId: userId,
      timestamp: new Date().toISOString(),
      article: 'Article 17 - Droit à l\'effacement'
    });

    res.status(200).json({
      data: {
        message: 'Toutes vos données ont été supprimées conformément à l\'Article 17 du RGPD',
        deleted_at: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.logError(err, { context: 'deleteUserData', userId: req.user?.id });
    next(err);
  }
}

/**
 * Article 20 RGPD - Droit à la portabilité des données
 * Export des données dans un format structuré et couramment utilisé
 */
async function exportDataPortability(req, res, next) {
  try {
    const userId = req.user.id;
    
    const User = mongoose.models.User || mongoose.model('User');
    const user = await User.findById(userId).lean();
    
    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    const [files, folders] = await Promise.all([
      FileModel.findByOwner(userId, null, true),
      FolderModel.findByOwner(userId, null, true)
    ]);

    // Format JSON structuré pour portabilité
    const portableData = {
      format_version: '1.0',
      export_date: new Date().toISOString(),
      user: {
        email: user.email,
        display_name: user.display_name,
        preferences: user.preferences
      },
      files: files.map(f => ({
        name: f.name,
        type: f.mime_type,
        size: f.size,
        created: f.created_at,
        modified: f.updated_at
      })),
      folders: folders.map(f => ({
        name: f.name,
        created: f.created_at,
        modified: f.updated_at
      }))
    };

    // Créer un fichier ZIP avec les données
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment(`fylora-export-${userId}-${Date.now()}.zip`);
    archive.pipe(res);

    // Ajouter les données JSON
    archive.append(JSON.stringify(portableData, null, 2), { name: 'data.json' });

    // Ajouter un fichier README avec les informations RGPD
    const readme = `Export de données personnelles - Fylora
Conforme RGPD Article 20 - Droit à la portabilité

Date d'export: ${new Date().toISOString()}
Format: JSON structuré

Vos données personnelles sont incluses dans ce fichier.
Vous pouvez utiliser ces données avec d'autres services conformément au RGPD.

Pour toute question, contactez: support@fylora.com
`;
    archive.append(readme, { name: 'README.txt' });

    await archive.finalize();
  } catch (err) {
    logger.logError(err, { context: 'exportDataPortability', userId: req.user?.id });
    next(err);
  }
}

/**
 * Vérifier le consentement RGPD d'un utilisateur
 */
async function getConsentStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    res.status(200).json({
      data: {
        gdpr_consent: user.preferences?.gdpr_consent || false,
        consent_date: user.preferences?.gdpr_consent_date || null,
        data_processing_consent: user.preferences?.data_processing_consent || false
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Enregistrer le consentement RGPD d'un utilisateur
 */
async function updateConsent(req, res, next) {
  try {
    const userId = req.user.id;
    const { gdpr_consent, data_processing_consent } = req.body;

    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    // Mettre à jour les préférences avec le consentement
    const preferences = user.preferences || {};
    preferences.gdpr_consent = Boolean(gdpr_consent);
    preferences.data_processing_consent = Boolean(data_processing_consent);
    
    if (gdpr_consent) {
      preferences.gdpr_consent_date = new Date().toISOString();
    }

    await UserModel.updatePreferences(userId, preferences);

    res.status(200).json({
      data: {
        message: 'Consentement RGPD enregistré',
        gdpr_consent: preferences.gdpr_consent,
        consent_date: preferences.gdpr_consent_date
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportUserData,
  deleteUserData,
  exportDataPortability,
  getConsentStatus,
  updateConsent
};


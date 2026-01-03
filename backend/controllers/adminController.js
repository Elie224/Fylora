const UserModel = require('../models/userModel');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Statistiques générales
async function getStats(req, res, next) {
  try {
    const User = mongoose.models.User || mongoose.model('User');
    const File = mongoose.models.File || mongoose.model('File');
    const Folder = mongoose.models.Folder || mongoose.model('Folder');

    const [
      totalUsers,
      activeUsers,
      totalFiles,
      totalFolders,
      totalStorageUsed,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      File.countDocuments({ deleted_at: null }),
      Folder.countDocuments({ deleted_at: null }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: '$quota_used' } } }
      ]),
      User.find()
        .sort({ created_at: -1 })
        .limit(10)
        .select('email display_name created_at last_login_at is_active')
        .lean()
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      files: {
        total: totalFiles
      },
      folders: {
        total: totalFolders
      },
      storage: {
        total_used: totalStorageUsed[0]?.total || 0
      },
      recent_users: recentUsers.map(u => ({
        id: u._id.toString(),
        email: u.email,
        display_name: u.display_name,
        created_at: u.created_at,
        last_login_at: u.last_login_at,
        is_active: u.is_active
      }))
    };

    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
}

// Lister tous les utilisateurs
async function getUsers(req, res, next) {
  try {
    const User = mongoose.models.User || mongoose.model('User');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } }
      ];
    }

    // IMPORTANT: L'admin ne peut voir que les informations de profil publiques, pas les fichiers/données personnelles
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password_hash') // Ne jamais exposer le hash du mot de passe
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      data: {
        users: users.map(u => ({
          id: u._id.toString(),
          email: u.email,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          quota_limit: u.quota_limit,
          quota_used: u.quota_used, // Statistique agrégée uniquement
          is_active: u.is_active,
          is_admin: u.is_admin || false,
          created_at: u.created_at,
          last_login_at: u.last_login_at
          // IMPORTANT: Ne pas exposer les fichiers, dossiers ou autres données personnelles
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les détails d'un utilisateur
async function getUser(req, res, next) {
  try {
    const userId = req.params.id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    // Compter les fichiers et dossiers de l'utilisateur
    // IMPORTANT: L'admin ne peut voir que les statistiques agrégées, pas les fichiers eux-mêmes
    const File = mongoose.models.File || mongoose.model('File');
    const Folder = mongoose.models.Folder || mongoose.model('Folder');

    const [filesCount, foldersCount] = await Promise.all([
      File.countDocuments({ owner_id: userId, deleted_at: null }),
      Folder.countDocuments({ owner_id: userId, deleted_at: null })
    ]);

    res.status(200).json({
      data: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        quota_limit: user.quota_limit,
        quota_used: user.quota_used,
        is_active: user.is_active,
        is_admin: user.is_admin || false,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        files_count: filesCount,
        folders_count: foldersCount
      }
    });
  } catch (err) {
    next(err);
  }
}

// Mettre à jour un utilisateur
async function updateUser(req, res, next) {
  try {
    const userId = req.params.id;
    const { display_name, quota_limit, is_active, is_admin } = req.body;

    const User = mongoose.models.User || mongoose.model('User');
    
    // Récupérer l'utilisateur actuel pour vérifier le quota
    const currentUser = await User.findById(userId).select('quota_limit quota_used').lean();
    if (!currentUser) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    const updateData = {};

    if (display_name !== undefined) updateData.display_name = display_name;
    
    // Gestion du quota_limit avec validation
    if (quota_limit !== undefined) {
      const newQuotaLimit = parseInt(quota_limit);
      
      // Validation : le quota doit être un nombre positif
      if (isNaN(newQuotaLimit) || newQuotaLimit < 0) {
        return res.status(400).json({
          error: { message: 'Le quota doit être un nombre positif' }
        });
      }

      // Validation : le nouveau quota doit être supérieur ou égal à l'espace utilisé
      const currentQuotaUsed = currentUser.quota_used || 0;
      if (newQuotaLimit < currentQuotaUsed) {
        return res.status(400).json({
          error: { 
            message: `Le nouveau quota (${formatBytes(newQuotaLimit)}) ne peut pas être inférieur à l'espace utilisé (${formatBytes(currentQuotaUsed)})`,
            quota_used: currentQuotaUsed,
            quota_limit: newQuotaLimit
          }
        });
      }

      updateData.quota_limit = newQuotaLimit;
      
      // Journaliser la modification du quota par l'admin
      logger.logInfo({
        message: 'Admin updated user quota',
        adminId: req.user.id,
        userId: userId,
        oldQuota: currentUser.quota_limit,
        newQuota: newQuotaLimit,
        quotaUsed: currentQuotaUsed,
        timestamp: new Date().toISOString()
      });
    }
    
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (is_admin !== undefined) updateData.is_admin = Boolean(is_admin);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password_hash').lean();

    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    // Calculer le pourcentage d'utilisation
    const quotaUsed = user.quota_used || 0;
    const quotaLimit = user.quota_limit || 0;
    const usagePercent = quotaLimit > 0 ? ((quotaUsed / quotaLimit) * 100).toFixed(2) : 0;

    res.status(200).json({
      data: {
        id: user._id.toString(),
        email: user.email,
        display_name: user.display_name,
        quota_limit: user.quota_limit,
        quota_used: user.quota_used,
        quota_available: Math.max(0, user.quota_limit - (user.quota_used || 0)),
        usage_percent: parseFloat(usagePercent),
        is_active: user.is_active,
        is_admin: user.is_admin || false,
        quota_formatted: {
          limit: formatBytes(user.quota_limit),
          used: formatBytes(user.quota_used || 0),
          available: formatBytes(Math.max(0, user.quota_limit - (user.quota_used || 0)))
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// Étendre le stockage d'un utilisateur (fonction dédiée)
async function extendStorage(req, res, next) {
  try {
    const userId = req.params.id;
    const { additional_storage, new_quota_limit } = req.body;

    const User = mongoose.models.User || mongoose.model('User');
    const user = await User.findById(userId).select('quota_limit quota_used').lean();

    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    const currentQuotaLimit = user.quota_limit || 0;
    const currentQuotaUsed = user.quota_used || 0;
    let newQuotaLimit;

    // Deux modes : extension par ajout ou définition d'un nouveau quota
    if (additional_storage !== undefined) {
      // Mode 1 : Ajouter de l'espace supplémentaire
      const additionalBytes = parseInt(additional_storage);
      
      if (isNaN(additionalBytes) || additionalBytes <= 0) {
        return res.status(400).json({
          error: { message: 'L\'espace supplémentaire doit être un nombre positif' }
        });
      }

      newQuotaLimit = currentQuotaLimit + additionalBytes;
    } else if (new_quota_limit !== undefined) {
      // Mode 2 : Définir un nouveau quota total
      newQuotaLimit = parseInt(new_quota_limit);
      
      if (isNaN(newQuotaLimit) || newQuotaLimit < 0) {
        return res.status(400).json({
          error: { message: 'Le quota doit être un nombre positif' }
        });
      }

      // Validation : le nouveau quota doit être supérieur à l'espace utilisé
      if (newQuotaLimit < currentQuotaUsed) {
        return res.status(400).json({
          error: { 
            message: `Le nouveau quota (${formatBytes(newQuotaLimit)}) ne peut pas être inférieur à l'espace utilisé (${formatBytes(currentQuotaUsed)})`,
            quota_used: currentQuotaUsed,
            quota_limit: newQuotaLimit
          }
        });
      }
    } else {
      return res.status(400).json({
        error: { message: 'Vous devez fournir soit "additional_storage" soit "new_quota_limit"' }
      });
    }

    // Mettre à jour le quota
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { quota_limit: newQuotaLimit } },
      { new: true }
    ).select('-password_hash').lean();

    // Journaliser l'extension du stockage
    logger.logInfo({
      message: 'Admin extended user storage',
      adminId: req.user.id,
      userId: userId,
      oldQuota: currentQuotaLimit,
      newQuota: newQuotaLimit,
      additionalStorage: additional_storage ? parseInt(additional_storage) : (newQuotaLimit - currentQuotaLimit),
      quotaUsed: currentQuotaUsed,
      timestamp: new Date().toISOString()
    });

    // Calculer le pourcentage d'utilisation
    const usagePercent = newQuotaLimit > 0 ? ((currentQuotaUsed / newQuotaLimit) * 100).toFixed(2) : 0;

    res.status(200).json({
      data: {
        message: 'Stockage étendu avec succès',
        user: {
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          display_name: updatedUser.display_name,
          quota_limit: newQuotaLimit,
          quota_used: currentQuotaUsed,
          quota_available: newQuotaLimit - currentQuotaUsed,
          usage_percent: parseFloat(usagePercent),
          quota_formatted: {
            limit: formatBytes(newQuotaLimit),
            used: formatBytes(currentQuotaUsed),
            available: formatBytes(newQuotaLimit - currentQuotaUsed)
          }
        },
        extension: {
          old_quota: currentQuotaLimit,
          new_quota: newQuotaLimit,
          additional_storage: newQuotaLimit - currentQuotaLimit,
          additional_storage_formatted: formatBytes(newQuotaLimit - currentQuotaLimit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// Fonction utilitaire pour formater les bytes en format lisible
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Supprimer un utilisateur
async function deleteUser(req, res, next) {
  try {
    const userId = req.params.id;

    // Ne pas permettre de supprimer son propre compte
    if (userId === req.user.id) {
      return res.status(400).json({
        error: { message: 'Vous ne pouvez pas supprimer votre propre compte' }
      });
    }

    const User = mongoose.models.User || mongoose.model('User');
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        error: { message: 'Utilisateur non trouvé' }
      });
    }

    res.status(200).json({
      data: { message: 'Utilisateur supprimé avec succès' }
    });
  } catch (err) {
    next(err);
  }
}

// Route temporaire pour définir l'admin (à supprimer après utilisation)
// ⚠️ Cette fonction doit être supprimée après avoir défini l'admin pour des raisons de sécurité
async function setAdminUser(req, res, next) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: { message: 'Email requis' }
      });
    }

    const User = mongoose.models.User || mongoose.model('User');
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({
        error: { message: `Utilisateur ${email} non trouvé` }
      });
    }

    if (user.is_admin) {
      return res.status(200).json({
        data: { 
          message: `${email} est déjà administrateur`,
          user: {
            id: user._id.toString(),
            email: user.email,
            is_admin: user.is_admin
          }
        }
      });
    }

    user.is_admin = true;
    await user.save();

    return res.status(200).json({
      data: {
        message: `${email} est maintenant administrateur`,
        user: {
          id: user._id.toString(),
          email: user.email,
          is_admin: user.is_admin
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// Nettoyer les fichiers orphelins
async function cleanupOrphans(req, res, next) {
  try {
    const { dryRun = false, userId = null } = req.query;
    const orphanCleanupService = require('../services/orphanCleanupService');

    let stats;
    if (userId) {
      // Nettoyer pour un utilisateur spécifique
      stats = await orphanCleanupService.cleanupUserOrphans(userId, { 
        dryRun: dryRun === 'true' 
      });
    } else {
      // Nettoyer pour tous les utilisateurs
      stats = await orphanCleanupService.cleanupAllOrphans({ 
        dryRun: dryRun === 'true' 
      });
    }

    res.status(200).json({
      data: {
        stats,
        message: dryRun === 'true' 
          ? 'Dry run completed. No files were deleted.' 
          : 'Orphan cleanup completed successfully'
      }
    });
  } catch (err) {
    logger.logError('Error in cleanupOrphans', {
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

// Obtenir les statistiques du nettoyage
async function getCleanupStats(req, res, next) {
  try {
    const orphanCleanupService = require('../services/orphanCleanupService');
    const stats = orphanCleanupService.getStats();

    res.status(200).json({
      data: stats
    });
  } catch (err) {
    logger.logError('Error in getCleanupStats', {
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

module.exports = {
  getStats,
  getUsers,
  getUser,
  updateUser,
  extendStorage,
  deleteUser,
  setAdminUser,
  cleanupOrphans,
  getCleanupStats,
};


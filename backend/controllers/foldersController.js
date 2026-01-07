const FolderModel = require('../models/folderModel');
const FileModel = require('../models/fileModel');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs').promises;
const { calculateRealQuotaUsed, syncQuotaUsed } = require('../utils/quota');
const logger = require('../utils/logger');

// Créer un dossier
// IMPORTANT: Même les admins ne peuvent créer des dossiers que pour eux-mêmes
async function createFolder(req, res, next) {
  try {
    const userId = req.user.id; // Toujours utiliser req.user.id pour garantir l'isolation des données
    // Utiliser les données validées si disponibles, sinon req.body
    const { name, parent_id } = req.validatedBody || req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: { message: 'Folder name is required' } });
    }

    // Normaliser parent_id : convertir chaîne vide en null
    let parentId = (parent_id && parent_id.trim && parent_id.trim() !== '') ? parent_id.trim() : null;

    // Vérifier le dossier parent s'il est spécifié
    if (parentId) {
      const parent = await FolderModel.findById(parentId);
      if (!parent) {
        return res.status(404).json({ error: { message: 'Parent folder not found' } });
      }
      
      // Comparer les ObjectId correctement
      const parentOwnerId = parent.owner_id?.toString ? parent.owner_id.toString() : parent.owner_id;
      const userOwnerId = userId?.toString ? userId.toString() : userId;
      
      if (parentOwnerId !== userOwnerId) {
        return res.status(403).json({ error: { message: 'Access denied' } });
      }
    } else {
      // Créer ou récupérer le dossier racine si nécessaire
      let rootFolder = await FolderModel.findRootFolder(userId);
      if (!rootFolder) {
        rootFolder = await FolderModel.create({ name: 'Root', ownerId: userId, parentId: null });
      }
    }

    const folder = await FolderModel.create({ name: name.trim(), ownerId: userId, parentId });
    res.status(201).json({ data: folder, message: 'Folder created' });
  } catch (err) {
    next(err);
  }
}

// Lister les dossiers
async function listFolders(req, res, next) {
  try {
    const userId = req.user.id;
    const { parent_id } = req.query;
    
    // Normaliser parent_id : convertir chaîne vide en null
    const parentId = (parent_id && parent_id.trim && parent_id.trim() !== '') ? parent_id.trim() : null;
    
    const folders = await FolderModel.findByOwner(userId, parentId);
    
    res.status(200).json({
      data: {
        items: folders,
        count: folders.length
      },
      message: 'Folders retrieved'
    });
  } catch (err) {
    next(err);
  }
}

// Renommer un dossier
async function updateFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, parent_id } = req.body;

    const folder = await FolderModel.findById(id);
    if (!folder) {
      return res.status(404).json({ error: { message: 'Folder not found' } });
    }

    // Comparer les ObjectId correctement
    const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (folderOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (parent_id !== undefined) {
      if (parent_id) {
        const parent = await FolderModel.findById(parent_id);
        if (!parent) {
          return res.status(404).json({ error: { message: 'Parent folder not found' } });
        }
        
        // Comparer les ObjectId correctement
        const parentOwnerId = parent.owner_id?.toString ? parent.owner_id.toString() : parent.owner_id;
        if (parentOwnerId !== userOwnerId) {
          return res.status(403).json({ error: { message: 'Access denied' } });
        }
        // Vérifier qu'on ne crée pas de boucle
        if (parent_id === id) {
          return res.status(400).json({ error: { message: 'Cannot move folder into itself' } });
        }
      }
      updates.parent_id = parent_id || null;
    }

    const updated = await FolderModel.update(id, updates);
    res.status(200).json({ data: updated, message: 'Folder updated' });
  } catch (err) {
    next(err);
  }
}

// Supprimer un dossier
async function deleteFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const folder = await FolderModel.findById(id);
    if (!folder) {
      return res.status(404).json({ error: { message: 'Folder not found' } });
    }

    // Comparer les ObjectId correctement
    const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (folderOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    await FolderModel.softDelete(id);
    
    // Synchroniser le quota après suppression du dossier
    // (les fichiers du dossier sont maintenant marqués comme supprimés)
    await syncQuotaUsed(userId);
    
    // Invalider le cache du dashboard
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    // Invalider le cache de la liste des fichiers pour cet utilisateur
    // Récupérer le cache depuis filesController
    try {
      const filesController = require('./filesController');
      const filesListCache = filesController.filesListCache;
      const rootFolderCache = filesController.rootFolderCache;
      
      if (filesListCache) {
        // Supprimer toutes les clés de cache qui commencent par "files_"
        const cacheKeysToDelete = [];
        for (const [key] of filesListCache.entries()) {
          if (key.startsWith(`files_${userId}_`)) {
            cacheKeysToDelete.push(key);
          }
        }
        cacheKeysToDelete.forEach(key => filesListCache.delete(key));
      }
      
      // Invalider le cache du root folder
      if (rootFolderCache) {
        rootFolderCache.delete(`root_${userId}`);
      }
    } catch (cacheErr) {
      // Ignorer les erreurs de cache (non critique)
      console.warn('Could not invalidate file cache:', cacheErr.message);
    }
    
    res.status(200).json({ message: 'Folder deleted' });
  } catch (err) {
    next(err);
  }
}

// Télécharger un dossier en ZIP
async function downloadFolder(req, res, next) {
  try {
    const userId = req.user?.id; // Peut être undefined pour les partages publics
    const { id } = req.params;
    const { token, password } = req.query;

    const folder = await FolderModel.findById(id);
    if (!folder) {
      return res.status(404).json({ error: { message: 'Folder not found' } });
    }

    // Vérifier la propriété ou le partage public
    let hasAccess = false;
    
    // Vérifier si l'utilisateur est le propriétaire
    if (userId) {
      const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;
      const userOwnerId = userId?.toString ? userId.toString() : userId;
      if (folderOwnerId === userOwnerId) {
        hasAccess = true;
      }
    }
    
    // Si pas propriétaire, vérifier le partage public
    if (!hasAccess && token) {
      const ShareModel = require('../models/shareModel');
      const share = await ShareModel.findByToken(token);
      
      if (share) {
        const shareFolderId = share.folder_id?.toString ? share.folder_id.toString() : share.folder_id;
        const folderId = id?.toString ? id.toString() : id;
        
        if (shareFolderId === folderId) {
          // Vérifier si le partage est expiré ou désactivé
          if (share.expires_at && new Date(share.expires_at) < new Date()) {
            return res.status(410).json({ error: { message: 'Share expired' } });
          }
          if (share.is_active === false) {
            return res.status(403).json({ error: { message: 'Share deactivated' } });
          }
          // Vérifier le mot de passe si requis
          if (share.password_hash) {
            if (!password) {
              return res.status(401).json({ error: { message: 'Password required' } });
            }
            const bcrypt = require('bcryptjs');
            const isValid = await bcrypt.compare(password, share.password_hash);
            if (!isValid) {
              return res.status(401).json({ error: { message: 'Invalid password' } });
            }
          }
          hasAccess = true;
        }
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Utiliser le owner_id du dossier pour récupérer les fichiers (même pour les partages)
    const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;

    // Récupérer récursivement tous les fichiers du dossier
    async function getAllFiles(folderId, basePath = '') {
      const files = await FileModel.findByFolder(folderId, false);
      const subfolders = await FolderModel.findByOwner(folderOwnerId, folderId, false);
      
      const result = [];
      
      for (const file of files) {
        result.push({ ...file, path: `${basePath}/${file.name}` });
      }
      
      for (const subfolder of subfolders) {
        const subFiles = await getAllFiles(subfolder.id, `${basePath}/${subfolder.name}`);
        result.push(...subFiles);
      }
      
      return result;
    }

    const allFiles = await getAllFiles(id, folder.name);

    // Créer l'archive ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of allFiles) {
      try {
        await fs.access(file.file_path);
        archive.file(file.file_path, { name: file.path });
      } catch (err) {
        console.error(`File not found: ${file.file_path}`);
      }
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
}

// Restaurer un dossier
async function restoreFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const folder = await FolderModel.findById(id);
    if (!folder) {
      return res.status(404).json({ error: { message: 'Folder not found' } });
    }

    // Comparer les ObjectId correctement
    const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (folderOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    await FolderModel.restore(id);
    
    // Synchroniser le quota après restauration du dossier
    // (les fichiers du dossier sont maintenant restaurés)
    await syncQuotaUsed(userId);
    
    // Invalider le cache du dashboard
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    res.status(200).json({ message: 'Folder restored' });
  } catch (err) {
    console.error('Error restoring folder:', err);
    next(err);
  }
}

// Supprimer définitivement un dossier
async function permanentDeleteFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const folder = await FolderModel.findById(id);
    if (!folder) {
      return res.status(404).json({ error: { message: 'Folder not found' } });
    }

    // Comparer les ObjectId correctement
    const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (folderOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Vérifier que le dossier est bien dans la corbeille
    if (!folder.is_deleted) {
      return res.status(400).json({ error: { message: 'Folder is not in trash. Use delete endpoint instead.' } });
    }

    // Récupérer tous les fichiers du dossier pour les supprimer définitivement
    const mongoose = require('mongoose');
    const File = mongoose.models.File;
    const files = await File.find({ 
      owner_id: new mongoose.Types.ObjectId(userId),
      folder_id: new mongoose.Types.ObjectId(id),
      is_deleted: true 
    }).lean();
    
    // Supprimer définitivement tous les fichiers du dossier
    const fs = require('fs').promises;
    const path = require('path');
    const config = require('../config');
    let totalSize = 0;
    for (const file of files) {
      if (file.file_path) {
        // Vérifier si le fichier est sur Cloudinary (non supporté)
        const storageType = file.storage_type || 'local';
        if (storageType === 'cloudinary' || (file.file_path && file.file_path.startsWith('fylora/'))) {
          // Pour les fichiers Cloudinary, on ne peut pas les supprimer physiquement
          logger.logWarn('File is on Cloudinary (no longer supported), cannot delete physically', {
            fileId: file._id,
            fileName: file.name
          });
          // Continuer avec la suppression en base seulement
        } else if (storageType === 'local') {
          // Supprimer le fichier local
          try {
            let filePath = file.file_path;
            if (!path.isAbsolute(filePath)) {
              filePath = path.resolve(config.upload.uploadDir, filePath);
            }
            await fs.unlink(filePath);
          } catch (err) {
            // Le fichier n'existe peut-être pas (déjà supprimé ou fichier orphelin)
            logger.logWarn('Could not delete physical file', {
              fileId: file._id,
              filePath: file.file_path,
              error: err.message,
              userId
            });
            // Continuer même si le fichier physique n'existe pas
          }
        }
      }
      totalSize += file.size || 0;
      await FileModel.delete(file._id.toString());
    }
    
    // Supprimer définitivement le dossier de la base de données
    await FolderModel.delete(id);
    
    // Mettre à jour le quota utilisé (soustraire la taille totale des fichiers)
    if (totalSize > 0) {
      const { updateQuotaAfterOperation } = require('../utils/quota');
      await updateQuotaAfterOperation(userId, -totalSize);
    }
    
    // Invalider le cache du dashboard
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    res.status(200).json({ message: 'Folder permanently deleted' });
  } catch (err) {
    console.error('Error permanently deleting folder:', err);
    next(err);
  }
}

// Lister les dossiers supprimés (corbeille)
async function listTrash(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Convertir userId en ObjectId si nécessaire
    const mongoose = require('mongoose');
    const Folder = mongoose.models.Folder;
    const userIdObj = userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId);
    
    // Récupérer tous les dossiers de l'utilisateur supprimés
    const folders = await Folder.find({ 
      owner_id: userIdObj,
      is_deleted: true 
    }).sort({ deleted_at: -1 }).lean();
    
    const deletedFolders = folders.map(f => FolderModel.toDTO(f));
    
    res.status(200).json({
      data: {
        items: deletedFolders,
        total: deletedFolders.length,
      },
    });
  } catch (err) {
    console.error('Error listing trash folders:', err);
    console.error('Error details:', err.message, err.stack);
    next(err);
  }
}

// Récupérer un dossier par ID
async function getFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const folder = await FolderModel.findById(id);
    if (!folder) {
      return res.status(404).json({ error: { message: 'Folder not found' } });
    }

    // Comparer les ObjectId correctement
    const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (folderOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    res.status(200).json({ data: folder });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFolder,
  listFolders,
  getFolder,
  updateFolder,
  deleteFolder,
  restoreFolder,
  permanentDeleteFolder,
  downloadFolder,
  listTrash,
};


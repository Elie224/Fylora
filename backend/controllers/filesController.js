const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const UserModel = require('../models/userModel');
const config = require('../config');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { compareObjectIds } = require('../utils/objectId');
const { successResponse, errorResponse } = require('../utils/response');
const { calculateRealQuotaUsed, updateQuotaAfterOperation } = require('../utils/quota');
const { trackFileUsage } = require('../utils/fileUsageTracker');
const fileDeduplication = require('../utils/fileDeduplication');
const { queues } = require('../utils/queue');
const searchEngine = require('../services/searchEngine');
const smartCache = require('../utils/smartCache');

// Configuration multer pour l'upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return cb(new Error('User not authenticated'));
      }
      
      // Résoudre le chemin absolu du répertoire d'upload
      const baseDir = path.resolve(config.upload.uploadDir);
      const uploadDir = path.join(baseDir, `user_${userId}`);
      
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Vérifier que le répertoire existe et est accessible
      await fs.access(uploadDir);
      
      cb(null, uploadDir);
    } catch (error) {
      logger.logError(error, { contexte: 'création_répertoire_upload' });
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    // Validation basique du nom de fichier
    if (!file.originalname || file.originalname.length > 255) {
      return cb(new AppError('Invalid filename', 400));
    }
    
    // En développement, accepter tous les types pour faciliter les tests
    // En production, la validation stricte sera faite par validateFileUpload
    cb(null, true);
  },
}).single('file');

// Middleware pour gérer l'upload
const uploadMiddleware = (req, res, next) => {
  // Vérifier que l'utilisateur est authentifié
  if (!req.user || !req.user.id) {
    logger.logWarn('Upload middleware: User not authenticated', { user: req.user });
    return errorResponse(res, 'Authentication required', 401);
  }
  
  logger.logDebug('Upload middleware: Starting upload', {
    userId: req.user.id,
    contentType: req.headers['content-type'],
    hasFile: !!req.file,
  });
  
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      logger.logError(err, { context: 'multer error', code: err.code });
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large', 413, 'FILE_TOO_LARGE'));
      }
      return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
    }
    if (err) {
      logger.logError(err, { context: 'upload middleware' });
      return next(err);
    }
    
    // Vérifier que le fichier a bien été reçu
    if (!req.file) {
      logger.logWarn('Upload middleware: No file received', {
        body: req.body,
        files: req.files,
      });
      return errorResponse(res, 'No file provided. Please ensure the file is sent with the field name "file"', 400);
    }
    
    logger.logInfo('Upload middleware: File received successfully', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
    
    next();
  });
};

// Lister les fichiers d'un dossier
async function listFiles(req, res, next) {
  try {
    const userId = req.user.id;
    const { folder_id, skip = 0, limit = 50, sort_by = 'name', sort_order = 'asc' } = req.query;

    const folderId = folder_id === 'root' || !folder_id ? null : folder_id;

    // Si folderId est null (racine), récupérer ou créer le dossier Root
    let actualFolderId = folderId;
    if (!actualFolderId) {
      let rootFolder = await FolderModel.findRootFolder(userId);
      if (!rootFolder) {
        // Créer le dossier Root s'il n'existe pas
        rootFolder = await FolderModel.create({ name: 'Root', ownerId: userId, parentId: null });
      }
      actualFolderId = rootFolder.id;
    } else {
      // Vérifier que le dossier appartient à l'utilisateur
      const folder = await FolderModel.findById(actualFolderId);
      if (!folder) {
        return res.status(404).json({ error: { message: 'Folder not found' } });
      }
      
      // Vérifier que le dossier appartient à l'utilisateur
      if (!compareObjectIds(folder.owner_id, userId)) {
        return errorResponse(res, 'Access denied', 403);
      }
    }

    // Utiliser FileModel.findByOwner pour requêtes optimisées avec formatage cohérent
    const skipNum = parseInt(skip);
    const limitNum = parseInt(limit);
    
    // Récupérer en parallèle avec pagination optimisée
    // Pour les dossiers, si folderId est null (racine), chercher les dossiers avec parent_id = null
    // Pour les fichiers, utiliser actualFolderId (qui sera le Root si on est à la racine)
    const [files, folders, totalFiles, totalFolders] = await Promise.all([
      FileModel.findByOwner(userId, actualFolderId, false, { skip: skipNum, limit: limitNum, sortBy: sort_by, sortOrder: sort_order }),
      FolderModel.findByOwner(userId, folderId, false, { skip: skipNum, limit: limitNum, sortBy: sort_by, sortOrder: sort_order }),
      FileModel.countByOwner(userId, actualFolderId, false),
      FolderModel.countByOwner(userId, folderId, false),
    ]);

    // Si on est à la racine (folderId est null), exclure le dossier Root de la liste
    // car l'utilisateur est déjà dans le Root
    const filteredFolders = folderId 
      ? folders 
      : folders.filter(f => f.name !== 'Root' || f.parent_id !== null);
    
    // Combiner et trier (tri déjà fait côté DB, mais combiner pour l'affichage)
    const items = [
      ...filteredFolders.map(f => ({ ...f, type: 'folder' })),
      ...files.map(f => ({ ...f, type: 'file' })),
    ];

    // Trier à nouveau pour combiner fichiers et dossiers (si nécessaire)
    if (sort_by === 'name') {
      items.sort((a, b) => {
        const aVal = a.name || '';
        const bVal = b.name || '';
        const comparison = aVal.localeCompare(bVal, 'fr', { sensitivity: 'base' });
        return sort_order === 'asc' ? comparison : -comparison;
      });
    }

    const total = totalFiles + totalFolders;

    res.status(200).json({
      data: {
        items,
        pagination: {
          total,
          skip: skipNum,
          limit: limitNum,
          hasMore: (skipNum + limitNum) < total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// Uploader un fichier
async function uploadFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { folder_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file provided' } });
    }

    const fileSize = req.file.size;
    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

    // OPTIMISATION: Utiliser quota_used stocké au lieu de recalculer (beaucoup plus rapide)
    // Utiliser mongoose directement pour avoir accès à .select()
    const mongoose = require('mongoose');
    const User = mongoose.models.User || mongoose.model('User');
    const user = await User.findById(userId).select('quota_used quota_limit').lean();
    if (!user) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    const currentUsed = user.quota_used || 0;
    const quotaLimit = user.quota_limit || 1099511627776; // 1 TO par défaut

    // Vérification rapide du quota
    if (currentUsed + fileSize > quotaLimit) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(507).json({ error: { message: 'Insufficient storage quota' } });
    }

    // OPTIMISATION: Vérifier le dossier parent
    let folderId = folder_id || null;
    let folderResult;

    if (folderId) {
      // Utiliser mongoose directement pour avoir accès à .lean()
      const Folder = mongoose.models.Folder || mongoose.model('Folder');
      folderResult = await Folder.findById(folderId).lean();
      if (!folderResult) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({ error: { message: 'Folder not found' } });
      }
      
      if (!compareObjectIds(folderResult.owner_id, userId)) {
        await fs.unlink(req.file.path).catch(() => {});
        return errorResponse(res, 'Access denied', 403);
      }
    } else {
      // Créer ou récupérer le dossier racine
      folderResult = await FolderModel.findRootFolder(userId);
      if (!folderResult) {
        const rootFolder = await FolderModel.create({ name: 'Root', ownerId: userId, parentId: null });
        folderId = rootFolder.id;
      } else {
        folderId = folderResult.id;
      }
    }

    // Vérifier que le fichier existe physiquement
    try {
      await fs.access(req.file.path);
    } catch (accessErr) {
      console.error('Uploaded file not accessible:', req.file.path);
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ error: { message: 'Failed to save file' } });
    }

    let finalFilePath = req.file.path;
    let actualSize = fileSize;
    let isDuplicate = false;

    // OPTIMISATION: Pour les petits fichiers, vérifier la déduplication immédiatement
    // Pour les gros fichiers, faire en arrière-plan pour ne pas bloquer la réponse
    if (fileSize < LARGE_FILE_THRESHOLD) {
      try {
        const duplicateCheck = await fileDeduplication.checkDuplicate(userId, req.file.path);
        isDuplicate = duplicateCheck.isDuplicate;

        if (duplicateCheck.isDuplicate) {
          try {
            const newPath = path.join(config.upload.uploadDir, `user_${userId}`, `${uuidv4()}${path.extname(req.file.originalname)}`);
            await fileDeduplication.createSymlink(duplicateCheck.existingFilePath, newPath);
            finalFilePath = newPath;
            actualSize = 0;
          } catch (symlinkErr) {
            logger.logError(symlinkErr, { context: 'create_symlink', userId, filePath: req.file.path });
            // Continuer avec le fichier original si la création du symlink échoue
            isDuplicate = false;
          }
        }
      } catch (dedupErr) {
        logger.logError(dedupErr, { context: 'deduplication_check', userId, filePath: req.file.path });
        // Continuer avec l'upload si la déduplication échoue
        isDuplicate = false;
      }
    } else {
      // Pour les gros fichiers, la déduplication sera faite en arrière-plan
      // On continue avec le fichier tel quel pour répondre rapidement
    }

    // Créer l'entrée en base de données
    let file;
    try {
      file = await FileModel.create({
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        size: fileSize,
        folderId,
        ownerId: userId,
        filePath: finalFilePath,
      });
    } catch (dbError) {
      logger.logError(dbError, { 
        context: 'file_creation_db', 
        userId,
        fileName: req.file.originalname,
        folderId
      });
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ 
        error: { 
          message: 'Failed to create file record in database',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        } 
      });
    }

    // OPTIMISATION: Mettre à jour le quota de manière asynchrone (ne pas attendre)
    if (!isDuplicate) {
      updateQuotaAfterOperation(userId, fileSize).catch(err => {
        logger.logError(err, { context: 'quota_update_async' });
      });
    }

    // OPTIMISATION: Répondre immédiatement, puis traiter en arrière-plan
    res.status(201).json({
      data: file,
      message: 'File uploaded successfully',
      isDuplicate: isDuplicate,
    });

    // Traitement asynchrone en arrière-plan (ne pas attendre)
    Promise.all([
      // Déduplication pour les gros fichiers
      fileSize >= LARGE_FILE_THRESHOLD ? (async () => {
        try {
          const duplicateCheck = await fileDeduplication.checkDuplicate(userId, finalFilePath);
          if (duplicateCheck.isDuplicate) {
            const newPath = path.join(config.upload.uploadDir, `user_${userId}`, `${uuidv4()}${path.extname(req.file.originalname)}`);
            await fileDeduplication.createSymlink(duplicateCheck.existingFilePath, newPath);
            await FileModel.findByIdAndUpdate(file.id, { file_path: newPath });
            await updateQuotaAfterOperation(userId, -fileSize); // Retirer le quota car doublon
            await fs.unlink(finalFilePath).catch(() => {}); // Supprimer le fichier original
          }
        } catch (err) {
          logger.logError(err, { context: 'background_deduplication' });
        }
      })() : Promise.resolve(),
      
      // Traitement asynchrone (OCR, métadonnées, empreinte)
      queues.fileProcessing.add({
        fileId: file.id,
        userId,
        filePath: finalFilePath,
        mimeType: req.file.mimetype,
        fileSize,
      }).catch(err => logger.logError(err, { context: 'file_processing_queue' })),
      
      // Indexation async pour recherche
      searchEngine.indexFileAsync(file.id, userId, finalFilePath, req.file.mimetype).catch(err => 
        logger.logError(err, { context: 'search_indexing' })
      ),
      
      // Invalider le cache
      smartCache.invalidateFile(file.id, userId).catch(() => {}),
    ]).catch(err => {
      logger.logError(err, { context: 'background_processing' });
    });

    // Invalider le cache utilisateur de manière asynchrone
    try {
      const { invalidateUserCache } = require('../utils/cache');
      invalidateUserCache(userId);
    } catch (cacheErr) {
      // Ignorer les erreurs de cache silencieusement
      logger.logError(cacheErr, { context: 'invalidate_user_cache' });
    }

  } catch (err) {
    // Supprimer le fichier en cas d'erreur
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    // Logger l'erreur pour le débogage
    logger.logError(err, { 
      context: 'uploadFile', 
      userId: req.user?.id,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      folderId: req.body?.folder_id
    });
    console.error('Upload error details:', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      fileName: req.file?.originalname
    });
    next(err);
  }
}

// Télécharger un fichier
async function downloadFile(req, res, next) {
  try {
    const userId = req.user?.id; // Peut être undefined pour les partages publics
    const { id } = req.params;
    const { token, password } = req.query;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Vérifier la propriété ou le partage public
    let hasAccess = false;
    
    // Vérifier si l'utilisateur est le propriétaire
    if (userId) {
      const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
      const userOwnerId = userId?.toString ? userId.toString() : userId;
      if (fileOwnerId === userOwnerId) {
        hasAccess = true;
      }
    }
    
    // Si pas propriétaire, vérifier le partage public
    if (!hasAccess && token) {
      const ShareModel = require('../models/shareModel');
      const share = await ShareModel.findByToken(token);
      
      if (share) {
        const shareFileId = share.file_id?.toString ? share.file_id.toString() : share.file_id;
        const fileId = id?.toString ? id.toString() : id;
        
        if (shareFileId === fileId) {
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

    // Vérifier que le fichier existe physiquement
    try {
      await fs.access(file.file_path);
    } catch {
      return res.status(404).json({ error: { message: 'File not found on disk' } });
    }

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Length', file.size);

    // Tracker l'utilisation
    if (userId) {
      trackFileUsage(id, userId, 'download', {
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      }).catch(() => {}); // Ne pas bloquer si le tracking échoue
    }

    res.sendFile(path.resolve(file.file_path));
  } catch (err) {
    next(err);
  }
}

// Prévisualiser un fichier
async function previewFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (fileOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Pour les images, PDF, texte - servir directement
    if (file.mime_type?.startsWith('image/') || 
        file.mime_type === 'application/pdf' ||
        file.mime_type?.startsWith('text/')) {
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
      
      // Tracker l'utilisation
      trackFileUsage(id, userId, 'preview', {
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      }).catch(() => {}); // Ne pas bloquer si le tracking échoue
      
      return res.sendFile(path.resolve(file.file_path));
    }

    return res.status(400).json({ error: { message: 'Preview not available for this file type' } });
  } catch (err) {
    next(err);
  }
}

// Stream audio/vidéo
async function streamFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (fileOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    if (!file.mime_type?.startsWith('audio/') && !file.mime_type?.startsWith('video/')) {
      return res.status(400).json({ error: { message: 'Streaming only available for audio/video files' } });
    }

    // Support des Range requests pour le streaming
    const range = req.headers.range;
    if (range) {
      const filePath = path.resolve(file.file_path);
      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.mime_type,
      });

      const stream = require('fs').createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Length', file.size);
      res.sendFile(path.resolve(file.file_path));
    }
  } catch (err) {
    next(err);
  }
}

// Renommer ou déplacer un fichier
async function updateFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, folder_id } = req.body;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (fileOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    const updates = {};
    if (name) updates.name = name;
    if (folder_id !== undefined) {
      if (folder_id) {
        const folder = await FolderModel.findById(folder_id);
        if (!folder) {
          return res.status(404).json({ error: { message: 'Folder not found' } });
        }
        
        // Comparer les ObjectId correctement
        const folderOwnerId = folder.owner_id?.toString ? folder.owner_id.toString() : folder.owner_id;
        if (folderOwnerId !== userOwnerId) {
          return res.status(403).json({ error: { message: 'Access denied' } });
        }
      }
      updates.folder_id = folder_id || null;
    }

    const updated = await FileModel.update(id, updates);
    
    // Invalider le cache du dashboard pour cet utilisateur
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    res.status(200).json({ data: updated, message: 'File updated' });
  } catch (err) {
    next(err);
  }
}

// Supprimer un fichier (soft delete)
async function deleteFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (fileOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Récupérer la taille du fichier avant suppression
    const fileSize = file.size || 0;
    
    await FileModel.softDelete(id);
    
    // Mettre à jour le quota utilisé (soustraire la taille du fichier)
    await updateQuotaAfterOperation(userId, -fileSize);
    
    // Invalider le cache du dashboard pour cet utilisateur
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    res.status(200).json({ message: 'File deleted' });
  } catch (err) {
    console.error('Error deleting file:', err);
    next(err);
  }
}

// Restaurer un fichier
async function restoreFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (fileOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Récupérer la taille du fichier avant restauration
    const fileSize = file.size || 0;
    
    await FileModel.restore(id);
    
    // Mettre à jour le quota utilisé (ajouter la taille du fichier)
    await updateQuotaAfterOperation(userId, fileSize);
    
    // Invalider le cache du dashboard pour cet utilisateur
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    res.status(200).json({ message: 'File restored' });
  } catch (err) {
    console.error('Error restoring file:', err);
    next(err);
  }
}

// Supprimer définitivement un fichier
async function permanentDeleteFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (fileOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Vérifier que le fichier est bien dans la corbeille
    if (!file.is_deleted) {
      return res.status(400).json({ error: { message: 'File is not in trash. Use delete endpoint instead.' } });
    }

    // Récupérer la taille du fichier avant suppression définitive
    const fileSize = file.size || 0;
    
    // Supprimer le fichier physique du système de fichiers
    const fs = require('fs').promises;
    const path = require('path');
    if (file.file_path) {
      try {
        await fs.unlink(file.file_path);
      } catch (err) {
        console.warn(`Could not delete physical file: ${file.file_path}`, err);
        // Continuer même si le fichier physique n'existe pas
      }
    }
    
    // Supprimer définitivement de la base de données
    await FileModel.delete(id);
    
    // Mettre à jour le quota utilisé (soustraire la taille du fichier)
    await updateQuotaAfterOperation(userId, -fileSize);
    
    // Invalider le cache du dashboard pour cet utilisateur
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    res.status(200).json({ message: 'File permanently deleted' });
  } catch (err) {
    console.error('Error permanently deleting file:', err);
    next(err);
  }
}

// Lister les fichiers supprimés (corbeille)
async function listTrash(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Convertir userId en ObjectId si nécessaire
    const mongoose = require('mongoose');
    const File = mongoose.models.File;
    const userIdObj = userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId);
    
    // Récupérer tous les fichiers de l'utilisateur supprimés
    const files = await File.find({ 
      owner_id: userIdObj,
      is_deleted: true 
    }).sort({ deleted_at: -1 }).lean();
    
    const deletedFiles = files.map(f => FileModel.toDTO(f));
    
    res.status(200).json({
      data: {
        items: deletedFiles,
        total: deletedFiles.length,
      },
    });
  } catch (err) {
    console.error('Error listing trash files:', err);
    console.error('Error details:', err.message, err.stack);
    next(err);
  }
}

module.exports = {
  uploadMiddleware,
  listFiles,
  uploadFile,
  downloadFile,
  previewFile,
  streamFile,
  updateFile,
  deleteFile,
  restoreFile,
  permanentDeleteFile,
  listTrash,
};


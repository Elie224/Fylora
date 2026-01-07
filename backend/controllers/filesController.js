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

// Stockage local uniquement

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

// Utiliser le cache Redis si disponible, sinon cache mémoire
const redisCache = require('../utils/redisCache');

// Cache simple en mémoire pour les Root folders (fallback si Redis indisponible)
const rootFolderCache = new Map();

// Cache simple en mémoire pour les listes de fichiers (fallback si Redis indisponible)
const filesListCache = new Map();

// Lister les fichiers d'un dossier
// IMPORTANT: Même les admins ne peuvent voir que leurs propres fichiers
// Le filtrage par owner_id garantit l'isolation des données entre utilisateurs
async function listFiles(req, res, next) {
  try {
    const userId = req.user.id; // Toujours utiliser req.user.id, jamais permettre l'accès aux fichiers d'autres utilisateurs
    const { folder_id, skip = 0, limit = 50, sort_by = 'name', sort_order = 'asc' } = req.query;
    
    // OPTIMISATION: Vérifier le cache Redis d'abord, puis cache mémoire
    const cacheKey = `files:${userId}:${folder_id || 'root'}:${skip}:${limit}:${sort_by}:${sort_order}`;
    
    // Essayer Redis cache d'abord
    try {
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT-REDIS');
        return res.status(200).json(cached);
      }
    } catch (err) {
      // Fallback sur cache mémoire si Redis échoue
    }
    
    // Fallback: cache mémoire
    if (filesListCache.has(cacheKey)) {
      const cached = filesListCache.get(cacheKey);
      // Cache valide pendant 30 secondes
      if (Date.now() - cached.timestamp < 30000) {
        res.setHeader('X-Cache', 'HIT-MEMORY');
        return res.status(200).json(cached.data);
      } else {
        filesListCache.delete(cacheKey);
      }
    }

    const folderId = folder_id === 'root' || !folder_id ? null : folder_id;

    // OPTIMISATION: Cache du Root folder pour éviter les requêtes répétées
    // Si folderId est null (racine), récupérer ou créer le dossier Root
    let actualFolderId = folderId;
    try {
      if (!actualFolderId) {
        // Vérifier le cache d'abord
        const cacheKey = `root_${userId}`;
        if (rootFolderCache.has(cacheKey)) {
          actualFolderId = rootFolderCache.get(cacheKey);
        } else {
          // OPTIMISATION: Utiliser findRootFolder qui est optimisé
          let rootFolder = await FolderModel.findRootFolder(userId);
          
          if (!rootFolder) {
            // Créer le dossier Root s'il n'existe pas (en arrière-plan si possible)
            try {
              rootFolder = await FolderModel.create({ name: 'Root', ownerId: userId, parentId: null });
              actualFolderId = rootFolder.id;
            } catch (createErr) {
              logger.logError(createErr, { context: 'listFiles - create Root folder', userId });
              // Si la création échoue, essayer de trouver à nouveau
              rootFolder = await FolderModel.findRootFolder(userId);
              if (!rootFolder) {
                throw new Error('Failed to create or find Root folder');
              }
              actualFolderId = rootFolder.id;
            }
          } else {
            actualFolderId = rootFolder.id;
          }
          
          // Mettre en cache (expire après 10 minutes pour réduire les requêtes)
          rootFolderCache.set(cacheKey, actualFolderId);
          setTimeout(() => rootFolderCache.delete(cacheKey), 10 * 60 * 1000);
        }
      } else {
        // OPTIMISATION: Vérifier le dossier avec une requête optimisée (seulement owner_id)
        const mongoose = require('mongoose');
        const Folder = mongoose.models.Folder || mongoose.model('Folder');
        const folderObjectId = new mongoose.Types.ObjectId(actualFolderId);
        const ownerObjectId = new mongoose.Types.ObjectId(userId);
        
        const folder = await Folder.findOne({ 
          _id: folderObjectId, 
          owner_id: ownerObjectId 
        })
        .select('owner_id')
        .lean()
        .maxTimeMS(2000); // Timeout réduit à 2 secondes
        
        if (!folder) {
          return res.status(404).json({ error: { message: 'Folder not found' } });
        }
      }
    } catch (folderErr) {
      logger.logError(folderErr, { context: 'listFiles - folder resolution', userId, folderId });
      return res.status(500).json({ error: { message: 'Failed to resolve folder' } });
    }

    // Utiliser FileModel.findByOwner pour requêtes optimisées avec formatage cohérent
    const skipNum = parseInt(skip);
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Limiter à 100 max
    
    // OPTIMISATION: Ne jamais compter pour les petites requêtes (améliore drastiquement les performances)
    const needCount = false; // Désactiver le comptage pour améliorer les performances
    
    // Optimisation: findByOwner utilise déjà lean() en interne
    // Exécuter les requêtes en parallèle avec timeout
    // S'assurer que actualFolderId n'est pas null/undefined
    if (!actualFolderId) {
      logger.logError(new Error('actualFolderId is null or undefined'), { 
        context: 'listFiles', 
        userId, 
        folderId 
      });
      return res.status(500).json({ error: { message: 'Failed to resolve root folder' } });
    }
    
    // OPTIMISATION: Limiter le nombre d'items récupérés pour améliorer les performances
    // Si limit est trop grand, le réduire à 50 max pour éviter les requêtes lentes
    const effectiveLimit = Math.min(limitNum, 50); // Maximum 50 items pour performance
    
    // Exécuter les requêtes en parallèle avec Promise.race pour timeout global
    const queryPromise = Promise.all([
      FileModel.findByOwner(userId, actualFolderId, false, { 
        skip: skipNum, 
        limit: effectiveLimit, 
        sortBy: sort_by, 
        sortOrder: sort_order 
      }).catch(err => {
        logger.logError(err, { context: 'listFiles - FileModel.findByOwner', userId, actualFolderId });
        return [];
      }),
      FolderModel.findByOwner(userId, folderId, false, { 
        skip: skipNum, 
        limit: effectiveLimit, 
        sortBy: sort_by, 
        sortOrder: sort_order 
      }).catch(err => {
        logger.logError(err, { context: 'listFiles - FolderModel.findByOwner', userId, folderId });
        return [];
      }),
    ]);
    
    // Timeout global de 2 secondes pour éviter les requêtes trop longues
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 2000)
    );
    
    let files, folders;
    try {
      [files, folders] = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);
    } catch (timeoutErr) {
      logger.logError(timeoutErr, { 
        context: 'listFiles - query timeout', 
        userId, 
        actualFolderId, 
        folderId 
      });
      // Retourner des tableaux vides plutôt qu'une erreur pour éviter de bloquer l'interface
      files = [];
      folders = [];
    }

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

    // Calculer le total (utiliser la longueur des résultats pour éviter les requêtes coûteuses)
    const total = items.length;

    const responseData = {
      data: {
        items,
        pagination: {
          total,
          skip: skipNum,
          limit: limitNum, // Utiliser limitNum (la limite demandée par l'utilisateur)
          hasMore: items.length >= effectiveLimit, // Si on a récupéré le nombre demandé, il y a probablement plus
        },
      },
    };
    
    // OPTIMISATION: Mettre en cache la réponse (seulement pour les petites requêtes)
    if (skipNum === 0 && limitNum <= 50) {
      // Mettre en cache Redis (TTL 30 secondes)
      redisCache.set(cacheKey, responseData, 30).catch(() => {});
      
      // Fallback: cache mémoire
      filesListCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });
      // Nettoyer le cache après 30 secondes
      setTimeout(() => {
        filesListCache.delete(cacheKey);
      }, 30000);
    }
    
    res.setHeader('X-Cache', 'MISS');

    res.status(200).json(responseData);
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

    let fileSize = req.file.size;
    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB
    
    // Vérifier la taille maximale de fichier selon le plan
    const planService = require('../services/planService');
    const mongoose = require('mongoose');
    const User = mongoose.models.User || UserModel;
    // Récupérer tous les champs nécessaires en une seule requête (plan, quota_used, quota_limit)
    const user = await User.findById(userId).select('plan quota_used quota_limit').lean();
    const planId = user?.plan || 'free';
    const fileSizeCheck = planService.canUploadFile(planId, fileSize);
    
    if (!fileSizeCheck.allowed) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(413).json({
        error: { message: fileSizeCheck.reason || 'File size exceeds plan limit' }
      });
    }
    
    // Vérifier le bandwidth (pour upload)
    const limitationsService = require('../services/limitationsService');
    const bandwidthCheck = await limitationsService.checkBandwidthLimit(userId, fileSize);
    
    if (!bandwidthCheck.allowed) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(429).json({
        error: {
          message: bandwidthCheck.reason || 'Bandwidth limit exceeded',
          used: bandwidthCheck.used,
          limit: bandwidthCheck.limit
        }
      });
    }

    // Compression automatique des images
    const isImage = req.file.mimetype?.startsWith('image/');
    if (isImage) {
      try {
        const sharp = require('sharp');
        const originalPath = req.file.path;
        const compressedPath = path.join(path.dirname(originalPath), `compressed_${path.basename(originalPath)}`);
        
        // Compresser l'image avec Sharp
        await sharp(originalPath)
          .resize(1920, 1920, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 85, 
            progressive: true,
            mozjpeg: true 
          })
          .webp({ 
            quality: 85 
          })
          .toFile(compressedPath);

        // Vérifier si la compression a réduit la taille
        const compressedStats = await fs.stat(compressedPath);
        if (compressedStats.size < fileSize) {
          // Remplacer l'original par la version compressée
          await fs.unlink(originalPath).catch(() => {});
          await fs.rename(compressedPath, originalPath);
          fileSize = compressedStats.size;
          logger.logInfo('Image compressed', {
            userId,
            originalSize: req.file.size,
            compressedSize: fileSize,
            reduction: `${((1 - fileSize / req.file.size) * 100).toFixed(1)}%`
          });
        } else {
          // Garder l'original si la compression n'a pas réduit la taille
          await fs.unlink(compressedPath).catch(() => {});
        }
      } catch (compressErr) {
        // Si la compression échoue, continuer avec l'original
        logger.logWarn('Image compression failed', {
          error: compressErr.message,
          file: req.file.originalname
        });
      }
    }

    // OPTIMISATION: Utiliser quota_used stocké au lieu de recalculer (beaucoup plus rapide)
    // Réutiliser la variable user déjà récupérée plus haut avec tous les champs nécessaires
    if (!user) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    const currentUsed = user.quota_used || 0;
    const quotaLimit = user.quota_limit || 100 * 1024 * 1024 * 1024; // 100 Go par défaut (plan FREE)

    // Vérification rapide du quota (avec la taille après compression)
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

    // Vérifier que le fichier existe physiquement et est accessible
    try {
      await fs.access(req.file.path);
      // Vérifier également que le fichier a une taille > 0
      const stats = await fs.stat(req.file.path);
      if (stats.size === 0) {
        logger.logError('Uploaded file is empty', { filePath: req.file.path, userId });
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: { message: 'Uploaded file is empty' } });
      }
      // Vérifier que la taille correspond (après compression pour les images)
      // Pour les images compressées, fileSize a déjà été mis à jour avec la taille compressée
      if (stats.size !== fileSize) {
        logger.logWarn('File size mismatch', { 
          expected: fileSize, 
          actual: stats.size, 
          filePath: req.file.path, 
          userId,
          isImage: isImage
        });
        // Utiliser la taille réelle du fichier sur disque
        fileSize = stats.size;
      }
    } catch (accessErr) {
      logger.logError('Uploaded file not accessible', { 
        filePath: req.file.path, 
        error: accessErr.message, 
        userId 
      });
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

    // Utiliser Supabase en priorité (plus simple), puis S3, sinon stockage local
    const supabaseStorage = require('../services/supabaseStorageService');
    const storageService = require('../services/storageService');
    let storagePath = finalFilePath;
    let storageType = 'local';
    
    // Vérifier que le fichier existe avant de créer l'entrée en base
    try {
      await fs.access(finalFilePath);
    } catch (finalCheckErr) {
      logger.logError('File does not exist before database creation', { 
        path: finalFilePath, 
        error: finalCheckErr.message, 
        userId 
      });
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ 
        error: { 
          message: 'File was not saved correctly. Please try again.',
        } 
      });
    }
    
    // Si Supabase est configuré, uploader vers Supabase (plus simple que S3)
    if (supabaseStorage.isSupabaseConfigured()) {
      try {
        const fileBuffer = await fs.readFile(finalFilePath);
        
        const uploadResult = await supabaseStorage.uploadFile(
          fileBuffer,
          userId,
          req.file.originalname,
          req.file.mimetype
        );
        
        // Utiliser la clé Supabase comme chemin
        storagePath = uploadResult.fileKey;
        storageType = 'supabase';
        
        // Supprimer le fichier local après upload Supabase réussi
        await fs.unlink(finalFilePath).catch(() => {});
        
        logger.logInfo('File uploaded to Supabase', {
          fileName: req.file.originalname,
          supabaseKey: uploadResult.fileKey,
          size: fileSize,
          userId
        });
      } catch (supabaseErr) {
        logger.logError(supabaseErr, {
          context: 'supabase_upload_fallback',
          fileName: req.file.originalname,
          userId
        });
        // Fallback vers S3 ou local si Supabase échoue
        logger.logWarn('Falling back to S3 or local storage', {
          fileName: req.file.originalname
        });
        // Vérifier que le fichier local existe toujours
        try {
          await fs.access(finalFilePath);
        } catch (accessErr) {
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(500).json({ 
            error: { 
              message: 'File was not saved correctly. Please try again.',
            } 
          });
        }
      }
    }
    // Si S3 est configuré (et Supabase ne l'est pas), uploader vers S3
    else if (storageService.isStorageConfigured()) {
      try {
        const AWS = require('aws-sdk');
        const fileBuffer = await fs.readFile(finalFilePath);
        
        // Générer une clé unique pour S3
        const { v4: uuidv4 } = require('uuid');
        const fileExtension = req.file.originalname.split('.').pop() || '';
        const fileKey = `users/${userId}/${uuidv4()}.${fileExtension}`;
        
        // Uploader vers S3
        const s3Config = {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
          signatureVersion: 'v4',
        };
        
        const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
        if (endpoint) {
          s3Config.endpoint = endpoint;
          s3Config.s3ForcePathStyle = endpoint.includes('minio') || endpoint.includes('localhost');
        }
        
        const s3 = new AWS.S3(s3Config);
        const bucketName = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'fylora-files';
        
        const uploadResult = await s3.putObject({
          Bucket: bucketName,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: req.file.mimetype,
          Metadata: {
            'original-name': encodeURIComponent(req.file.originalname),
            'user-id': userId,
            'file-size': fileSize.toString(),
          },
          ServerSideEncryption: 'AES256',
        }).promise();
        
        // Utiliser la clé S3 comme chemin
        storagePath = fileKey;
        storageType = storageService.getStorageType() || 's3';
        
        // Supprimer le fichier local après upload S3 réussi
        await fs.unlink(finalFilePath).catch(() => {});
        
        logger.logInfo('File uploaded to S3', {
          fileName: req.file.originalname,
          s3Key: fileKey,
          size: fileSize,
          userId,
          etag: uploadResult.ETag
        });
      } catch (s3Err) {
        logger.logError(s3Err, {
          context: 's3_upload_fallback',
          fileName: req.file.originalname,
          userId
        });
        // Fallback vers stockage local si S3 échoue
        logger.logWarn('Falling back to local storage', {
          fileName: req.file.originalname
        });
        // Vérifier que le fichier local existe toujours
        try {
          await fs.access(finalFilePath);
        } catch (accessErr) {
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(500).json({ 
            error: { 
              message: 'File was not saved correctly. Please try again.',
            } 
          });
        }
      }
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
        filePath: storagePath,
        storageType: storageType,
      });
      
      // Vérifier que le fichier existe (stockage local)
      try {
        await fs.access(storagePath);
        logger.logInfo('File uploaded and saved successfully (local)', {
          fileId: file.id,
          fileName: req.file.originalname,
          filePath: storagePath,
          size: fileSize,
          userId
        });
      } catch (postCreateErr) {
        logger.logError('File disappeared after database creation', {
          fileId: file.id,
          filePath: storagePath,
          error: postCreateErr.message,
          userId
        });
        await FileModel.delete(file.id).catch(() => {});
        return res.status(500).json({ 
          error: { 
            message: 'File was not saved correctly. Please try again.',
          } 
        });
      }
    } catch (dbError) {
      logger.logError(dbError, { 
        context: 'file_creation_db', 
        userId,
        fileName: req.file.originalname,
        folderId
      });
      // Nettoyer le fichier physique si la création en base échoue
      if (storageType === 'local' && finalFilePath) {
        await fs.unlink(finalFilePath).catch(() => {});
      } else if (storageType !== 'local' && storagePath) {
        // Supprimer de S3 si la création en base échoue
        await storageService.deleteFile(storagePath).catch(() => {});
      }
      return res.status(500).json({ 
        error: { 
          message: 'Failed to create file record in database',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        } 
      });
    }

    // Invalider le cache de la liste des fichiers pour cet utilisateur IMMÉDIATEMENT
    const cacheKey = `files:list:${userId}:${folderId || 'root'}`;
    await redisCache.delete(cacheKey).catch(() => {});
    if (filesListCache) {
      filesListCache.delete(cacheKey);
    }
    
    // OPTIMISATION: Mettre à jour le quota de manière asynchrone (ne pas attendre)
    if (!isDuplicate) {
      updateQuotaAfterOperation(userId, fileSize).catch(err => {
        logger.logError(err, { context: 'quota_update_async' });
      });
    }

    // Publier événement via Event Bus
    const eventBus = require('../services/eventBus');
    const { Events } = require('../services/eventBus');
    eventBus.publish(Events.FILE_UPLOADED, {
      fileId: file.id,
      fileName: file.name,
      fileSize: file.size,
      userId,
      folderId,
      storageType,
    }, {
      requestId: req.requestId,
    }).catch(err => {
      logger.logError(err, { context: 'event_publish_file_uploaded' });
    });

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
        storageType: storageType,
        storagePath: storagePath,
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
    // Récupérer l'ID utilisateur - peut être id ou _id selon le format du JWT
    const userId = req.user?.id || req.user?._id; // Peut être undefined pour les partages publics
    const { id } = req.params;
    const { token, password } = req.query;
    
    // IMPORTANT: Si pas de token de partage ET pas d'utilisateur authentifié, exiger l'authentification
    if (!token && !req.user) {
      logger.logWarn('Download request without authentication or share token', {
        fileId: id,
        hasAuthHeader: !!req.headers.authorization
      });
      return res.status(401).json({ error: { message: 'Authentication required or share token required' } });
    }
    
    // Logger pour déboguer (toujours logger en production pour diagnostiquer)
    logger.logInfo('Download request', {
      fileId: id,
      userId: userId,
      hasUser: !!req.user,
      userKeys: req.user ? Object.keys(req.user) : [],
      userValues: req.user ? {
        id: req.user.id,
        _id: req.user._id,
        email: req.user.email
      } : null,
      hasToken: !!token,
      authHeader: req.headers.authorization ? 'present' : 'missing'
    });

    // Utiliser mongoose directement pour avoir accès à tous les champs, y compris is_deleted
    const mongoose = require('mongoose');
    const File = mongoose.models.File || mongoose.model('File');
    const file = await File.findById(id).lean();
    
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Vérifier que le fichier n'est pas supprimé
    if (file.is_deleted) {
      logger.logInfo('Attempt to download deleted file', { fileId: id, userId });
      return res.status(404).json({ error: { message: 'File has been deleted' } });
    }

    // Vérifier la propriété ou le partage public
    let hasAccess = false;
    
    // Vérifier si l'utilisateur est le propriétaire
    // IMPORTANT: Même les admins ne peuvent pas accéder aux fichiers des autres utilisateurs
    if (userId) {
      // Utiliser compareObjectIds pour une comparaison fiable des ObjectIds
      const fileOwnerId = file.owner_id;
      const userOwnerId = userId;
      
      // Logger pour déboguer
      logger.logInfo('Download access check', {
        fileId: id,
        userId: userOwnerId,
        fileOwnerId: fileOwnerId?.toString ? fileOwnerId.toString() : fileOwnerId,
        userOwnerIdStr: userOwnerId?.toString ? userOwnerId.toString() : userOwnerId,
        types: {
          fileOwnerIdType: typeof fileOwnerId,
          userOwnerIdType: typeof userOwnerId
        }
      });
      
      if (compareObjectIds(fileOwnerId, userOwnerId)) {
        hasAccess = true;
      }
      // Les admins n'ont pas d'accès spécial aux fichiers des utilisateurs
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
      logger.logWarn('Download access denied', {
        fileId: id,
        userId: userId,
        fileOwnerId: file.owner_id?.toString ? file.owner_id.toString() : file.owner_id,
        hasToken: !!token
      });
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Vérifier le type de stockage
    const storageType = file.storage_type || 'local';
    
    // Si le fichier est marqué comme Cloudinary, retourner une erreur car Cloudinary n'est plus utilisé
    if (storageType === 'cloudinary' || (file.file_path && file.file_path.startsWith('fylora/'))) {
      return res.status(410).json({ 
        error: { 
          message: 'This file is stored on Cloudinary which is no longer supported. Please re-upload the file.',
          fileId: id,
          fileName: file.name
        } 
      });
    }
    
    // Si c'est un fichier Supabase, générer une URL signée pour le téléchargement
    if (storageType === 'supabase') {
      const supabaseStorage = require('../services/supabaseStorageService');
      if (supabaseStorage.isSupabaseConfigured()) {
        try {
          const downloadUrl = await supabaseStorage.generateDownloadUrl(
            file.file_path,
            15 * 60 // 15 minutes
          );
          
          // Servir le fichier avec les bons headers
          res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
          res.setHeader('Content-Length', file.size);
          
          // Rediriger vers l'URL signée Supabase
          return res.redirect(downloadUrl);
        } catch (supabaseErr) {
          logger.logError(supabaseErr, {
            context: 'supabase_download',
            fileId: id,
            supabaseKey: file.file_path
          });
          return res.status(500).json({ 
            error: { message: 'Failed to generate download URL' } 
          });
        }
      }
    }
    // Si c'est un fichier S3, générer une URL signée pour le téléchargement
    else if (storageType === 's3' || storageType === 'minio') {
      const storageService = require('../services/storageService');
      if (storageService.isStorageConfigured()) {
        try {
          const downloadData = await storageService.generateDownloadUrl(
            file.file_path,
            file.name,
            15 // 15 minutes
          );
          
          // Servir le fichier avec les bons headers
          res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
          res.setHeader('Content-Length', file.size);
          
          // Rediriger vers l'URL signée S3
          return res.redirect(downloadData.downloadUrl);
        } catch (s3Err) {
          logger.logError(s3Err, {
            context: 's3_download',
            fileId: id,
            s3Key: file.file_path
          });
          return res.status(500).json({ 
            error: { message: 'Failed to generate download URL' } 
          });
        }
      }
    }
    
    // Pour stockage local, vérifier que le fichier existe physiquement
    if (storageType === 'local') {
      let fileExists = false;
      try {
        await fs.access(file.file_path);
        fileExists = true;
      } catch (accessErr) {
        // Fichier orphelin - log mais permettre quand même le téléchargement si l'utilisateur a accès
        logger.logWarn('File not found on disk (orphan file)', {
          fileId: id,
          fileName: file.name,
          filePath: file.file_path,
          userId: userId,
          error: accessErr.message
        });
        // Ne pas bloquer - le fichier pourrait être restauré ou ré-uploadé
        // Retourner 404 seulement si c'est vraiment un problème
        if (!file.file_path) {
          return res.status(404).json({ error: { message: 'File path not found' } });
        }
      }
    }

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Length', file.size);

    // Vérifier les limitations de bandwidth
    if (userId) {
      const limitationsService = require('../services/limitationsService');
      const bandwidthCheck = await limitationsService.checkBandwidthLimit(userId, file.size);
      
      if (!bandwidthCheck.allowed) {
        return res.status(429).json({
          error: {
            message: bandwidthCheck.reason || 'Bandwidth limit exceeded',
            used: bandwidthCheck.used,
            limit: bandwidthCheck.limit
          }
        });
      }
    }

    // Tracker l'utilisation
    if (userId) {
      trackFileUsage(id, userId, 'download', {
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      }).catch(() => {}); // Ne pas bloquer si le tracking échoue
      
      // Mettre à jour last_accessed_at
      const File = mongoose.models.File || mongoose.model('File');
      await File.findByIdAndUpdate(id, {
        last_accessed_at: new Date()
      }).catch(() => {});
      
      // Ajouter au bandwidth utilisé
      const limitationsService = require('../services/limitationsService');
      await limitationsService.addBandwidthUsage(userId, file.size).catch(() => {});
    }

    // Pour stockage local, envoyer le fichier
    // Note: Si on arrive ici, c'est que le fichier est en stockage local
    if (storageType === 'local') {
      res.sendFile(path.resolve(file.file_path));
    } else {
      // Ne devrait pas arriver ici car on a déjà géré S3 et Cloudinary plus haut
      return res.status(500).json({ error: { message: 'Storage type not supported' } });
    }
  } catch (err) {
    next(err);
  }
}

// Prévisualiser un fichier
// IMPORTANT: Même les admins ne peuvent prévisualiser que leurs propres fichiers
async function previewFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Valider l'ID
    if (!id) {
      return res.status(400).json({ error: { message: 'File ID is required' } });
    }

    // Utiliser mongoose directement pour avoir accès à tous les champs, y compris is_deleted
    // FileModel.findById utilise toDTO qui pourrait filtrer certains champs
    const mongoose = require('mongoose');
    
    // Valider que l'ID est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid file ID format' } });
    }
    
    const File = mongoose.models.File;
    
    if (!File) {
      logger.logError('File model not available in previewFile', { fileId: id });
      return res.status(500).json({ error: { message: 'File model not available' } });
    }
    
    const file = await File.findById(id).lean();
    
    if (!file) {
      logger.logInfo('File not found in database', { fileId: id, userId });
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    // SÉCURITÉ: Vérifier que l'utilisateur est le propriétaire - même les admins ne peuvent pas accéder aux fichiers des autres
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : String(file.owner_id);
    const userOwnerId = userId?.toString ? userId.toString() : String(userId);
    
    if (fileOwnerId !== userOwnerId) {
      logger.logInfo('Access denied to file', { fileId: id, fileOwnerId, userOwnerId });
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Vérifier que le fichier n'est pas supprimé
    if (file.is_deleted) {
      logger.logInfo('Attempt to preview deleted file', { fileId: id, userId });
      return res.status(404).json({ error: { message: 'File has been deleted' } });
    }

    // Vérifier que le fichier existe physiquement
    if (!file.file_path) {
      logger.logError('File path is missing', { fileId: id, userId });
      return res.status(404).json({ error: { message: 'File path not found' } });
    }
    
    // Vérifier si le fichier est sur Cloudinary (non supporté)
    const storageType = file.storage_type || 'local';
    if (storageType === 'cloudinary' || (file.file_path && file.file_path.startsWith('fylora/'))) {
      return res.status(410).json({ 
        error: { 
          message: 'This file is stored on Cloudinary which is no longer supported. Please re-upload the file.',
          fileId: id,
          fileName: file.name
        } 
      });
    }
    
    // Stockage local - résoudre le chemin du fichier
    let filePath;
    if (path.isAbsolute(file.file_path)) {
      filePath = file.file_path;
    } else {
      // Chemin relatif - le combiner avec le répertoire d'upload
      filePath = path.resolve(config.upload.uploadDir, file.file_path);
    }
    
    // Vérifier que le fichier existe physiquement
    try {
      await fs.access(filePath);
    } catch (accessErr) {
      // Le fichier n'existe pas physiquement - c'est un fichier orphelin
      logger.logWarn('File not found on disk (orphan file)', { 
        fileId: id, 
        filePath, 
        originalPath: file.file_path, 
        error: accessErr.message, 
        userId,
        fileName: file.name,
        mimeType: file.mime_type,
        uploadDir: config.upload.uploadDir
      });
      
      return res.status(404).json({ 
        error: { 
          message: 'File not found on disk',
          details: 'The file record exists in the database but the physical file is missing. This can happen if the file was manually deleted or if the server was restarted and temporary files were lost.',
          suggestion: 'This file will be automatically cleaned up by the orphan cleanup service. You can also delete it manually from your file list.',
          fileId: id,
          fileName: file.name,
          isOrphan: true
        } 
      });
    }

    // Pour les images, PDF, texte - servir directement
    if (file.mime_type?.startsWith('image/') || 
        file.mime_type === 'application/pdf' ||
        file.mime_type?.startsWith('text/')) {
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name || 'file')}"`);
      
      // Vérifier les limitations de bandwidth
      const limitationsService = require('../services/limitationsService');
      const bandwidthCheck = await limitationsService.checkBandwidthLimit(userId, file.size);
      
      if (!bandwidthCheck.allowed) {
        return res.status(429).json({
          error: {
            message: bandwidthCheck.reason || 'Bandwidth limit exceeded',
            used: bandwidthCheck.used,
            limit: bandwidthCheck.limit
          }
        });
      }

      // Tracker l'utilisation (ne pas bloquer si le tracking échoue)
      try {
        trackFileUsage(id, userId, 'preview', {
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        }).catch((trackErr) => {
          logger.logError('Failed to track file usage', { error: trackErr.message, fileId: id, userId });
        });
        
        // Mettre à jour last_accessed_at
        const File = mongoose.models.File || mongoose.model('File');
        await File.findByIdAndUpdate(id, {
          last_accessed_at: new Date()
        }).catch(() => {});
        
        // Ajouter au bandwidth utilisé
        await limitationsService.addBandwidthUsage(userId, file.size).catch(() => {});
      } catch (trackErr) {
        logger.logError('Failed to track file usage', { error: trackErr.message, fileId: id, userId });
      }
      
      // Utiliser sendFile avec gestion d'erreur
      try {
        // Vérifier une dernière fois que le fichier existe avant d'essayer de le servir
        await fs.access(filePath);
        
        return res.sendFile(filePath, (err) => {
          if (err) {
            // Gérer spécifiquement les erreurs ENOENT (fichier non trouvé)
            if (err.code === 'ENOENT' || err.message?.includes('ENOENT')) {
              logger.logWarn('File not found when sending (orphan file)', { 
                error: err.message, 
                filePath, 
                fileId: id, 
                userId,
                fileName: file.name 
              });
              if (!res.headersSent) {
                return res.status(404).json({ 
                  error: { 
                    message: 'File not found on disk',
                    details: 'The file record exists in the database but the physical file is missing.',
                    isOrphan: true,
                    fileId: id,
                    fileName: file.name
                  } 
                });
              }
            } else {
              logger.logError('Error sending file', { error: err.message, filePath, fileId: id, userId });
              if (!res.headersSent) {
                res.status(500).json({ error: { message: 'Error sending file' } });
              }
            }
          }
        });
      } catch (sendErr) {
        // Gérer spécifiquement les erreurs ENOENT
        if (sendErr.code === 'ENOENT' || sendErr.message?.includes('ENOENT')) {
          logger.logWarn('File not found when accessing (orphan file)', { 
            error: sendErr.message, 
            filePath, 
            fileId: id, 
            userId,
            fileName: file.name 
          });
          return res.status(404).json({ 
            error: { 
              message: 'File not found on disk',
              details: 'The file record exists in the database but the physical file is missing.',
              isOrphan: true,
              fileId: id,
              fileName: file.name
            } 
          });
        }
        logger.logError('Error in sendFile', { error: sendErr.message, filePath, fileId: id, userId });
        return res.status(500).json({ error: { message: 'Error sending file' } });
      }
    }

    return res.status(400).json({ error: { message: 'Preview not available for this file type' } });
  } catch (err) {
    logger.logError('Error in previewFile', { error: err.message, stack: err.stack, fileId: req.params?.id, userId: req.user?.id });
    if (!res.headersSent) {
      return res.status(500).json({ error: { message: 'Internal server error' } });
    }
    next(err);
  }
}

// Stream audio/vidéo
// IMPORTANT: Même les admins ne peuvent streamer que leurs propres fichiers
async function streamFile(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    // SÉCURITÉ: Vérifier que l'utilisateur est le propriétaire - même les admins ne peuvent pas accéder aux fichiers des autres
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
      // Vérifier si le fichier est sur Cloudinary (non supporté)
      const storageType = file.storage_type || 'local';
      if (storageType === 'cloudinary' || (file.file_path && file.file_path.startsWith('fylora/'))) {
        return res.status(410).json({ 
          error: { 
            message: 'This file is stored on Cloudinary which is no longer supported. Please re-upload the file.',
            fileId: id,
            fileName: file.name
          } 
        });
      }
      
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Length', file.size);
      res.sendFile(path.resolve(file.file_path));
    }
  } catch (err) {
    next(err);
  }
}

// Renommer ou déplacer un fichier
// IMPORTANT: Même les admins ne peuvent modifier que leurs propres fichiers
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
    // SÉCURITÉ: Vérifier que l'utilisateur est le propriétaire - même les admins ne peuvent pas modifier les fichiers des autres
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

// Mettre à jour le contenu d'un fichier texte
async function updateFileContent(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file provided' } });
    }

    const file = await FileModel.findById(id);
    if (!file) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Comparer les ObjectId correctement
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : file.owner_id;
    const userOwnerId = userId?.toString ? userId.toString() : userId;
    
    if (fileOwnerId !== userOwnerId) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Vérifier que c'est un fichier texte
    if (!file.mime_type?.startsWith('text/') && !file.mime_type?.includes('markdown')) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: { message: 'Only text files can be updated' } });
    }

    const oldSize = file.size || 0;
    const newSize = req.file.size;
    const sizeDiff = newSize - oldSize;

    // Vérifier le quota
    const User = require('mongoose').models.User || require('mongoose').model('User');
    const user = await User.findById(userId).select('quota_used quota_limit').lean();
    if (!user) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const currentUsed = user.quota_used || 0;
    const quotaLimit = user.quota_limit || 100 * 1024 * 1024 * 1024; // 100 Go par défaut (plan FREE)

    if (sizeDiff > 0 && currentUsed + sizeDiff > quotaLimit) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(507).json({ error: { message: 'Insufficient storage quota' } });
    }

    // Supprimer l'ancien fichier
    try {
      await fs.unlink(file.file_path);
    } catch (unlinkErr) {
      logger.logWarn('Could not delete old file', { path: file.file_path, error: unlinkErr });
    }

    // Déplacer le nouveau fichier
    const finalFilePath = req.file.path;

    // Mettre à jour en base de données
    const updated = await FileModel.update(id, {
      size: newSize,
      file_path: finalFilePath,
      updated_at: new Date(),
    });

    // Mettre à jour le quota
    if (sizeDiff !== 0) {
      await updateQuotaAfterOperation(userId, sizeDiff);
    }

    // Invalider le cache
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    smartCache.invalidateFile(id, userId).catch(() => {});

    res.status(200).json({ data: updated, message: 'File content updated successfully' });
  } catch (err) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    logger.logError(err, { context: 'updateFileContent', userId: req.user?.id, fileId: req.params?.id });
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
    // Vérifier le type de stockage
    const storageType = file.storage_type || 'local';
    
    // Si le fichier est marqué comme Cloudinary, on ne peut pas le supprimer physiquement
    if (storageType === 'cloudinary' || (file.file_path && file.file_path.startsWith('fylora/'))) {
      logger.logWarn('File is on Cloudinary (no longer supported), soft delete only', {
        fileId: id,
        fileName: file.name
      });
    } else if (storageType === 'supabase') {
      // Supprimer de Supabase
      const supabaseStorage = require('../services/supabaseStorageService');
      if (supabaseStorage.isSupabaseConfigured() && file.file_path) {
        try {
          await supabaseStorage.deleteFile(file.file_path);
          logger.logInfo('File deleted from Supabase', {
            fileId: id,
            supabaseKey: file.file_path,
            userId
          });
        } catch (supabaseErr) {
          logger.logError(supabaseErr, {
            context: 'supabase_delete',
            fileId: id,
            supabaseKey: file.file_path,
            userId
          });
          // Continuer même si la suppression Supabase échoue (soft delete en base)
        }
      }
    } else if (storageType === 's3' || storageType === 'minio') {
      // Supprimer de S3
      const storageService = require('../services/storageService');
      if (storageService.isStorageConfigured() && file.file_path) {
        try {
          await storageService.deleteFile(file.file_path);
          logger.logInfo('File deleted from S3', {
            fileId: id,
            s3Key: file.file_path,
            userId
          });
        } catch (s3Err) {
          logger.logError(s3Err, {
            context: 's3_delete',
            fileId: id,
            s3Key: file.file_path,
            userId
          });
          // Continuer même si la suppression S3 échoue (soft delete en base)
        }
      }
    } else if (storageType === 'local' && file.file_path) {
      // Supprimer le fichier local (optionnel - soft delete garde le fichier)
      // On ne supprime pas physiquement pour permettre la restauration
      // await fs.unlink(file.file_path).catch(() => {});
    }
    
    await FileModel.softDelete(id);
    
    // Mettre à jour le quota utilisé (soustraire la taille du fichier)
    await updateQuotaAfterOperation(userId, -fileSize);
    
    // Invalider le cache du dashboard pour cet utilisateur
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    // Invalider le cache de la liste des fichiers pour cet utilisateur
    // Supprimer toutes les clés de cache qui commencent par "files_"
    const cacheKeysToDelete = [];
    for (const [key] of filesListCache.entries()) {
      if (key.startsWith(`files_${userId}_`)) {
        cacheKeysToDelete.push(key);
      }
    }
    cacheKeysToDelete.forEach(key => filesListCache.delete(key));
    
    // Invalider le cache smartCache pour ce fichier
    smartCache.invalidateFile(id, userId).catch(() => {});
    
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
    
    // Invalider TOUS les caches pour cet utilisateur (liste fichiers, dashboard, etc.)
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);
    
    // Invalider aussi le cache Redis si disponible
    const redisCache = require('../utils/redisCache');
    const cacheKey = `files:list:${userId}:${file.folder_id || 'root'}`;
    await redisCache.delete(cacheKey).catch(() => {});
    
    // Invalider le cache de la liste des fichiers
    if (filesListCache) {
      filesListCache.delete(cacheKey);
    }
    
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
    
    // Vérifier le type de stockage
    const storageType = file.storage_type || 'local';
    
    // Supprimer le fichier selon son type de stockage
    if (file.file_path) {
      if (storageType === 'cloudinary' || (file.file_path && file.file_path.startsWith('fylora/'))) {
        // Pour les fichiers Cloudinary, on ne peut pas les supprimer physiquement
        logger.logWarn('File is on Cloudinary (no longer supported), cannot delete physically', {
          fileId: id,
          fileName: file.name
        });
        // Continuer avec la suppression en base seulement
      } else if (storageType === 's3' || storageType === 'minio') {
        // Supprimer de S3
        const storageService = require('../services/storageService');
        if (storageService.isStorageConfigured()) {
          try {
            await storageService.deleteFile(file.file_path);
            logger.logInfo('File deleted from S3', {
              fileId: id,
              s3Key: file.file_path,
              userId
            });
          } catch (s3Err) {
            logger.logWarn('Could not delete file from S3', {
              fileId: id,
              s3Key: file.file_path,
              error: s3Err.message,
              userId
            });
            // Continuer même si la suppression S3 échoue
          }
        }
      } else if (storageType === 'local') {
        // Supprimer le fichier local
        const fs = require('fs').promises;
        const path = require('path');
        const config = require('../config');
        try {
          let filePath = file.file_path;
          if (!path.isAbsolute(filePath)) {
            filePath = path.resolve(config.upload.uploadDir, filePath);
          }
          await fs.unlink(filePath);
        } catch (err) {
          // Le fichier n'existe peut-être pas (déjà supprimé ou fichier orphelin)
          logger.logWarn('Could not delete physical file', {
            fileId: id,
            filePath: file.file_path,
            error: err.message,
            userId
          });
          // Continuer même si le fichier physique n'existe pas
        }
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

// Store pour les tokens de prévisualisation publique temporaires
// Format: { token: { fileId, userId, expiresAt } }
const publicPreviewTokens = new Map();

// Nettoyer les tokens expirés toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of publicPreviewTokens.entries()) {
    if (data.expiresAt < now) {
      publicPreviewTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

// Générer une URL publique temporaire pour les viewers externes
async function generatePublicPreviewUrl(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Valider l'ID
    if (!id) {
      return res.status(400).json({ error: { message: 'File ID is required' } });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid file ID format' } });
    }

    const File = mongoose.models.File;
    if (!File) {
      return res.status(500).json({ error: { message: 'File model not available' } });
    }

    const file = await File.findById(id).lean();
    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Vérifier que l'utilisateur est le propriétaire
    const fileOwnerId = file.owner_id?.toString ? file.owner_id.toString() : String(file.owner_id);
    const userOwnerId = userId?.toString ? userId.toString() : String(userId);
    
    if (fileOwnerId !== userOwnerId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Vérifier que le fichier n'est pas supprimé
    if (file.is_deleted) {
      return res.status(404).json({ error: { message: 'File has been deleted' } });
    }

    // Générer un token temporaire (valide 1 heure)
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 heure

    // Stocker le token
    publicPreviewTokens.set(token, {
      fileId: id,
      userId: userId,
      expiresAt: expiresAt
    });

    // Générer l'URL publique en utilisant l'URL de la requête
    // Cela garantit que l'URL est accessible depuis les viewers externes
    const protocol = req.protocol || 'https';
    const host = req.get('host') || process.env.API_URL || process.env.VITE_API_URL || 'localhost:5001';
    
    // En production, forcer HTTPS si nécessaire
    const baseUrl = process.env.NODE_ENV === 'production' && !host.includes('localhost')
      ? `https://${host.replace(/^https?:\/\//, '')}`
      : `${protocol}://${host.replace(/^https?:\/\//, '')}`;
    
    const publicUrl = `${baseUrl}/api/files/public/${token}`;

    return res.json({
      publicUrl: publicUrl,
      expiresAt: new Date(expiresAt).toISOString()
    });
  } catch (err) {
    next(err);
  }
}

// Servir un fichier publiquement avec validation du token
async function servePublicPreview(req, res, next) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: { message: 'Token is required' } });
    }

    // Vérifier le token
    const tokenData = publicPreviewTokens.get(token);
    if (!tokenData) {
      return res.status(404).json({ error: { message: 'Invalid or expired token' } });
    }

    if (tokenData.expiresAt < Date.now()) {
      publicPreviewTokens.delete(token);
      return res.status(404).json({ error: { message: 'Token has expired' } });
    }

    // Récupérer le fichier
    const mongoose = require('mongoose');
    const File = mongoose.models.File;
    const file = await File.findById(tokenData.fileId).lean();

    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    if (file.is_deleted) {
      return res.status(404).json({ error: { message: 'File has been deleted' } });
    }

    // Vérifier le type de stockage
    const storageType = file.storage_type || 'local';
    
    // Si le fichier est marqué comme Cloudinary, retourner une erreur
    if (storageType === 'cloudinary' || (file.file_path && file.file_path.startsWith('fylora/'))) {
      return res.status(410).json({ 
        error: { 
          message: 'This file is stored on Cloudinary which is no longer supported. Please re-upload the file.',
          fileId: tokenData.fileId,
          fileName: file.name
        } 
      });
    }
    
    // Si c'est un fichier Supabase, générer une URL signée pour la prévisualisation publique
    if (storageType === 'supabase') {
      const supabaseStorage = require('../services/supabaseStorageService');
      if (supabaseStorage.isSupabaseConfigured()) {
        try {
          // Générer une URL signée (fonctionne avec buckets privés)
          const previewUrl = await supabaseStorage.generatePreviewUrl(
            file.file_path,
            15 * 60 // 15 minutes
          );
          
          // Rediriger vers l'URL signée Supabase
          return res.redirect(previewUrl);
        } catch (supabaseErr) {
          logger.logError(supabaseErr, {
            context: 'supabase_public_preview',
            fileId: tokenData.fileId,
            supabaseKey: file.file_path
          });
          return res.status(500).json({ 
            error: { message: 'Failed to generate preview URL' } 
          });
        }
      }
    }
    // Si c'est un fichier S3, générer une URL signée pour la prévisualisation publique
    else if (storageType === 's3' || storageType === 'minio') {
      const storageService = require('../services/storageService');
      if (storageService.isStorageConfigured()) {
        try {
          const previewData = await storageService.generatePreviewUrl(
            file.file_path,
            file.mime_type,
            60 // 60 minutes pour les URLs publiques
          );
          
          // Rediriger vers l'URL signée S3
          return res.redirect(previewData.previewUrl);
        } catch (s3Err) {
          logger.logError(s3Err, {
            context: 's3_public_preview',
            fileId: tokenData.fileId,
            s3Key: file.file_path
          });
          return res.status(500).json({ 
            error: { message: 'Failed to generate preview URL' } 
          });
        }
      }
    }

    // Pour les fichiers locaux, servir le fichier
    let filePath;
    if (path.isAbsolute(file.file_path)) {
      filePath = file.file_path;
    } else {
      filePath = path.resolve(config.upload.uploadDir, file.file_path);
    }

    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (accessErr) {
      return res.status(404).json({ 
        error: { 
          message: 'File not found on disk',
        } 
      });
    }

    // Servir le fichier avec les bons headers CORS pour les viewers externes
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name || 'file')}"`);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permettre l'accès depuis n'importe quel domaine
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache pour améliorer les performances
    res.setHeader('Content-Length', file.size); // Ajouter la taille du fichier
    
    return res.sendFile(filePath);
  } catch (err) {
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
  updateFileContent,
  deleteFile,
  restoreFile,
  permanentDeleteFile,
  listTrash,
  generatePublicPreviewUrl,
  servePublicPreview,
  // Exporter les caches pour invalidation depuis d'autres contrôleurs
  filesListCache,
  rootFolderCache,
};


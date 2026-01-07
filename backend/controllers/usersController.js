const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const SessionModel = require('../models/sessionModel');
const { AppError } = require('../middlewares/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

// Configuration multer pour l'avatar
const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(config.upload.uploadDir, 'avatars');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    // Valider que c'est une image
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400));
    }
    
    // Valider le nom de fichier
    if (!file.originalname || file.originalname.length > 255) {
      return cb(new AppError('Invalid filename', 400));
    }
    
    // Vérifier les extensions dangereuses
    const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.js'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (dangerousExts.includes(ext)) {
      return cb(new AppError('File type not allowed for security reasons', 403));
    }
    
    cb(null, true);
  },
}).single('avatar');

// Obtenir les informations de l'utilisateur connecté
async function getMe(req, res, next) {
  try {
    const userId = req.user.id;
    // Utiliser UserModel.findById() qui est la méthode disponible dans UserModel
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // UserModel.findById() retourne déjà un objet formaté avec id au lieu de _id
    // Retirer les informations sensibles
    // Formater les dates correctement (ISO string ou null)
    const formatDate = (date) => {
      if (!date) return null;
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') return date;
      return null;
    };
    
    const safeUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      country: user.country,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      quota_used: user.quota_used,
      quota_limit: user.quota_limit,
      preferences: user.preferences,
      is_admin: user.is_admin || false,
      created_at: formatDate(user.created_at),
      last_login_at: formatDate(user.last_login_at),
    };

    res.status(200).json({ data: safeUser });
  } catch (err) {
    next(err);
  }
}

// Mettre à jour le profil
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { email, display_name, first_name, last_name, phone, country } = req.body;

    const updates = {};
    if (email) {
      // Vérifier que l'email n'est pas déjà utilisé
      const existing = await UserModel.findByEmail(email);
      if (existing && existing.id !== userId) {
        return res.status(409).json({ error: { message: 'Email already in use' } });
      }
      updates.email = email;
    }
    if (display_name !== undefined) {
      updates.display_name = display_name;
    }
    if (first_name !== undefined) {
      updates.first_name = first_name;
    }
    if (last_name !== undefined) {
      updates.last_name = last_name;
    }
    if (phone !== undefined) {
      updates.phone = phone;
    }
    if (country !== undefined) {
      updates.country = country;
    }

    // Mettre à jour dans MongoDB
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    await User.findByIdAndUpdate(userId, updates);

    const updated = await UserModel.findById(userId);
    const safeUser = {
      id: updated.id,
      email: updated.email,
      first_name: updated.first_name,
      last_name: updated.last_name,
      phone: updated.phone,
      country: updated.country,
      display_name: updated.display_name,
      avatar_url: updated.avatar_url,
      quota_used: updated.quota_used,
      quota_limit: updated.quota_limit,
      preferences: updated.preferences,
    };

    res.status(200).json({ data: safeUser, message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
}

// Uploader un avatar
async function uploadAvatar(req, res, next) {
  avatarUpload(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ error: { message: 'No file provided' } });
      }

      // Supprimer l'ancien avatar s'il existe
      const user = await UserModel.findById(userId);
      if (user.avatar_url) {
        try {
          await fs.unlink(path.resolve(user.avatar_url));
        } catch (e) {
          // Ignorer si le fichier n'existe pas
        }
      }

      // Mettre à jour l'URL de l'avatar
      const avatarUrl = `/avatars/${req.file.filename}`;
      const mongoose = require('mongoose');
      const User = mongoose.models.User;
      await User.findByIdAndUpdate(userId, { avatar_url: avatarUrl });

      res.status(200).json({
        data: { avatar_url: avatarUrl },
        message: 'Avatar uploaded',
      });
    } catch (err) {
      // Supprimer le fichier en cas d'erreur
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      next(err);
    }
  });
}

// Changer le mot de passe
async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: { message: 'Current password and new password are required' } });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.password_hash) {
      return res.status(400).json({ error: { message: 'User has no password set (OAuth account)' } });
    }

    // Vérifier le mot de passe actuel
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: { message: 'Current password is incorrect' } });
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Mettre à jour
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    await User.findByIdAndUpdate(userId, { password_hash: newPasswordHash });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// Mettre à jour les préférences
async function updatePreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: { message: 'Preferences object is required' } });
    }

    await UserModel.updatePreferences(userId, preferences);

    const user = await UserModel.findById(userId);
    res.status(200).json({
      data: { preferences: user.preferences },
      message: 'Preferences updated',
    });
  } catch (err) {
    next(err);
  }
}

// Lister les utilisateurs (pour le partage interne)
async function listUsers(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { search } = req.query;

    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    
    const query = { is_active: true };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('email display_name avatar_url')
      .limit(50)
      .lean();

    // Exclure l'utilisateur actuel et formater les résultats
    const safeUsers = users
      .filter(u => u._id.toString() !== currentUserId)
      .map(u => ({
        id: u._id.toString(),
        email: u.email,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
      }));

    res.status(200).json({ data: safeUsers });
  } catch (err) {
    next(err);
  }
}

// Lister les sessions actives de l'utilisateur
async function getActiveSessions(req, res, next) {
  try {
    const userId = req.user.id;
    const mongoose = require('mongoose');
    const Session = mongoose.models.Session || mongoose.model('Session');
    
    const sessions = await Session.find({
      user_id: userId,
      is_revoked: false,
      expires_at: { $gt: new Date() },
    })
    .sort({ created_at: -1 })
    .lean();

    // Formater les sessions (on ne peut pas comparer le refresh token côté serveur pour des raisons de sécurité)
    const formattedSessions = sessions.map(session => ({
      id: session._id.toString(),
      user_agent: session.user_agent || 'Inconnu',
      ip_address: session.ip_address || 'Inconnu',
      device_name: session.device_name || 'Appareil inconnu',
      created_at: session.created_at,
      expires_at: session.expires_at,
      refresh_token: session.refresh_token, // Inclure pour comparaison côté client
    }));

    return res.status(200).json({ data: { sessions: formattedSessions } });
  } catch (err) {
    logger.logError(err, { context: 'getActiveSessions', userId: req.user?.id });
    next(err);
  }
}

// Révoquer une session
async function revokeSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const mongoose = require('mongoose');
    const Session = mongoose.models.Session || mongoose.model('Session');
    
    const session = await Session.findById(sessionId).lean();
    
    if (!session) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    // Vérifier que la session appartient à l'utilisateur
    if (session.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // Révoquer la session
    await Session.findByIdAndUpdate(sessionId, { is_revoked: true });

    logger.logInfo('Session revoked', { userId, sessionId });

    return res.status(200).json({ data: { message: 'Session revoked successfully' } });
  } catch (err) {
    logger.logError(err, { context: 'revokeSession', userId: req.user?.id, sessionId: req.params?.sessionId });
    next(err);
  }
}

// Révoquer toutes les sessions sauf la session actuelle
async function revokeAllOtherSessions(req, res, next) {
  try {
    const userId = req.user.id;
    const currentRefreshToken = req.body.refresh_token || null;
    const mongoose = require('mongoose');
    const Session = mongoose.models.Session || mongoose.model('Session');
    
    // Révoquer toutes les autres sessions
    const query = {
      user_id: userId,
      is_revoked: false,
    };
    
    if (currentRefreshToken) {
      query.refresh_token = { $ne: currentRefreshToken };
    }
    
    const result = await Session.updateMany(query, { is_revoked: true });

    logger.logInfo('All other sessions revoked', { userId, revokedCount: result.modifiedCount });

    return res.status(200).json({ 
      data: { 
        message: 'All other sessions revoked successfully',
        revokedCount: result.modifiedCount,
      }
    });
  } catch (err) {
    logger.logError(err, { context: 'revokeAllOtherSessions', userId: req.user?.id });
    next(err);
  }
}

module.exports = {
  getMe,
  updateProfile,
  uploadAvatar,
  changePassword,
  updatePreferences,
  listUsers,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
};


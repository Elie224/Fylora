/**
 * Contrôleur pour l'accès par code temporaire
 */
const TemporaryAccess = require('../models/TemporaryAccess');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Générer un code d'accès temporaire
function generateAccessCode() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Créer un code d'accès temporaire
async function createTemporaryAccess(req, res, next) {
  try {
    const userId = req.user.id;
    const { resource_type, resource_id, expires_at, max_uses, permissions, password } = req.body;

    if (!resource_type || !resource_id || !expires_at) {
      return res.status(400).json({
        error: { message: 'resource_type, resource_id, and expires_at are required' },
      });
    }

    // Vérifier que la ressource existe et appartient à l'utilisateur
    let resource;
    if (resource_type === 'file') {
      resource = await FileModel.findById(resource_id);
    } else if (resource_type === 'folder') {
      resource = await FolderModel.findById(resource_id);
    } else {
      return res.status(400).json({
        error: { message: 'Invalid resource_type' },
      });
    }

    if (!resource || resource.owner_id.toString() !== userId) {
      return res.status(404).json({
        error: { message: 'Resource not found or access denied' },
      });
    }

    const expirationDate = new Date(expires_at);
    if (expirationDate <= new Date()) {
      return res.status(400).json({
        error: { message: 'expires_at must be in the future' },
      });
    }

    const accessCode = generateAccessCode();
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const temporaryAccess = new TemporaryAccess({
      access_code: accessCode,
      resource_type,
      resource_id,
      owner_id: userId,
      expires_at: expirationDate,
      max_uses: max_uses || null,
      permissions: permissions || ['view'],
      password_hash: passwordHash,
    });

    await temporaryAccess.save();

    res.status(201).json({
      data: {
        access_code: accessCode,
        expires_at: expirationDate,
        max_uses: max_uses || null,
        permissions: permissions || ['view'],
      },
      message: 'Temporary access code created successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Utiliser un code d'accès temporaire
async function useTemporaryAccess(req, res, next) {
  try {
    const { code } = req.params;
    const { password } = req.body;

    const temporaryAccess = await TemporaryAccess.findOne({
      access_code: code,
      is_active: true,
    });

    if (!temporaryAccess) {
      return res.status(404).json({
        error: { message: 'Invalid or expired access code' },
      });
    }

    // Vérifier l'expiration
    if (new Date(temporaryAccess.expires_at) < new Date()) {
      temporaryAccess.is_active = false;
      await temporaryAccess.save();
      return res.status(410).json({
        error: { message: 'Access code has expired' },
      });
    }

    // Vérifier le nombre d'utilisations
    if (temporaryAccess.max_uses && temporaryAccess.use_count >= temporaryAccess.max_uses) {
      temporaryAccess.is_active = false;
      await temporaryAccess.save();
      return res.status(410).json({
        error: { message: 'Access code has reached maximum uses' },
      });
    }

    // Vérifier le mot de passe si requis
    if (temporaryAccess.password_hash) {
      if (!password) {
        return res.status(401).json({
          error: { message: 'Password required' },
        });
      }
      const isValid = await bcrypt.compare(password, temporaryAccess.password_hash);
      if (!isValid) {
        return res.status(401).json({
          error: { message: 'Invalid password' },
        });
      }
    }

    // Enregistrer l'utilisation
    temporaryAccess.use_count += 1;
    temporaryAccess.uses.push({
      used_at: new Date(),
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });
    await temporaryAccess.save();

    // Récupérer la ressource
    let resource;
    if (temporaryAccess.resource_type === 'file') {
      resource = await FileModel.findById(temporaryAccess.resource_id);
    } else {
      resource = await FolderModel.findById(temporaryAccess.resource_id);
    }

    res.status(200).json({
      data: {
        resource,
        permissions: temporaryAccess.permissions,
        remaining_uses: temporaryAccess.max_uses
          ? temporaryAccess.max_uses - temporaryAccess.use_count
          : null,
      },
      message: 'Access granted',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les codes d'accès temporaires d'un utilisateur
async function getTemporaryAccesses(req, res, next) {
  try {
    const userId = req.user.id;

    const accesses = await TemporaryAccess.find({
      owner_id: userId,
    })
      .populate('resource_id', 'name size mime_type')
      .sort({ created_at: -1 })
      .lean();

    res.status(200).json({ data: accesses });
  } catch (err) {
    next(err);
  }
}

// Révoquer un code d'accès temporaire
async function revokeTemporaryAccess(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const temporaryAccess = await TemporaryAccess.findOne({
      _id: id,
      owner_id: userId,
    });

    if (!temporaryAccess) {
      return res.status(404).json({
        error: { message: 'Temporary access not found' },
      });
    }

    temporaryAccess.is_active = false;
    await temporaryAccess.save();

    res.status(200).json({
      message: 'Temporary access revoked successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTemporaryAccess,
  useTemporaryAccess,
  getTemporaryAccesses,
  revokeTemporaryAccess,
};



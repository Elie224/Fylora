/**
 * Utilitaires de sécurité pour le backend
 */

const crypto = require('crypto');

/**
 * Générer un token CSRF sécurisé
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hasher un mot de passe avec bcrypt
 */
async function hashPassword(password) {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12; // Augmenté pour plus de sécurité
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Vérifier un mot de passe
 */
async function verifyPassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
}

/**
 * Générer un token aléatoire sécurisé
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Valider et nettoyer un nom de fichier
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }
  
  // Supprimer les caractères dangereux
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\.\./g, '')
    .trim()
    .substring(0, 255); // Limiter la longueur
}

/**
 * Valider un chemin de fichier pour prévenir les directory traversal
 */
function validateFilePath(filePath, baseDir) {
  const path = require('path');
  const resolvedPath = path.resolve(baseDir, filePath);
  const resolvedBase = path.resolve(baseDir);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Invalid file path: directory traversal detected');
  }
  
  return resolvedPath;
}

/**
 * Rate limiting personnalisé par IP
 */
function createRateLimiter(maxRequests, windowMs) {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const record = requests.get(ip);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: {
          message: 'Too many requests, please try again later',
          status: 429
        }
      });
    }
    
    record.count++;
    next();
  };
}

/**
 * Sanitizer pour les inputs utilisateur
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();
}

module.exports = {
  generateCSRFToken,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  sanitizeFileName,
  validateFilePath,
  createRateLimiter,
  sanitizeInput,
};






/**
 * Génération d'URLs signées temporaires pour fichiers
 * Permet un accès sécurisé sans authentification pour CDN/stockage externe
 */
const crypto = require('crypto');
const config = require('../config');

class SignedUrlGenerator {
  constructor() {
    this.secret = process.env.SIGNED_URL_SECRET || config.jwt.secret || 'fylora-secret';
    this.defaultTTL = 3600; // 1 heure par défaut
  }

  /**
   * Générer une URL signée pour un fichier
   */
  generate(fileId, userId, options = {}) {
    const {
      expiresIn = this.defaultTTL,
      action = 'download', // download, preview, stream
    } = options;

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    
    // Créer la signature
    const payload = `${fileId}:${userId}:${action}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    const baseUrl = process.env.API_URL || 'http://localhost:5001';
    const url = `${baseUrl}/api/files/${fileId}/${action}?signature=${signature}&expires=${expiresAt}&user=${userId}`;

    return {
      url,
      expiresAt: new Date(expiresAt * 1000),
      signature,
    };
  }

  /**
   * Vérifier une URL signée
   */
  verify(fileId, userId, action, signature, expires) {
    // Vérifier l'expiration
    const now = Math.floor(Date.now() / 1000);
    if (expires < now) {
      return { valid: false, reason: 'URL expired' };
    }

    // Vérifier la signature
    const payload = `${fileId}:${userId}:${action}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid signature' };
    }

    return { valid: true };
  }

  /**
   * Générer une URL pour CDN
   */
  generateCDNUrl(fileId, userId, options = {}) {
    const signed = this.generate(fileId, userId, options);
    
    // Si CDN configuré, utiliser l'URL CDN
    const cdnUrl = process.env.CDN_URL;
    if (cdnUrl) {
      return {
        ...signed,
        cdnUrl: `${cdnUrl}/files/${fileId}?${signed.url.split('?')[1]}`,
      };
    }

    return signed;
  }
}

module.exports = new SignedUrlGenerator();



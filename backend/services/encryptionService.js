/**
 * Service de Chiffrement - AES-256 at rest
 * Chiffre les fichiers sensibles avant stockage
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class EncryptionService {
  constructor() {
    // Clé de chiffrement (doit être dans les variables d'environnement)
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey();
    this.algorithm = 'aes-256-gcm'; // AES-256 avec GCM pour authentification
    this.keyLength = 32; // 256 bits
  }

  /**
   * Générer une clé de chiffrement (pour développement uniquement)
   */
  generateKey() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set in production');
    }
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Dériver une clé depuis la clé principale et un salt
   */
  deriveKey(salt) {
    return crypto.pbkdf2Sync(
      this.encryptionKey,
      salt,
      100000, // 100k itérations
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Chiffrer un buffer de données
   */
  encrypt(buffer, userId) {
    try {
      // Générer un salt unique pour cet utilisateur/fichier
      const salt = crypto.randomBytes(16);
      const key = this.deriveKey(salt);
      
      // Générer un IV (Initialization Vector)
      const iv = crypto.randomBytes(16);
      
      // Créer le cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Chiffrer les données
      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final(),
      ]);
      
      // Récupérer l'authentification tag
      const authTag = cipher.getAuthTag();
      
      // Combiner: salt + iv + authTag + données chiffrées
      const result = Buffer.concat([
        salt,
        iv,
        authTag,
        encrypted,
      ]);
      
      return result;
    } catch (err) {
      logger.logError(err, { context: 'encryption_error', userId });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Déchiffrer un buffer de données
   */
  decrypt(encryptedBuffer, userId) {
    try {
      // Extraire les composants
      const salt = encryptedBuffer.slice(0, 16);
      const iv = encryptedBuffer.slice(16, 32);
      const authTag = encryptedBuffer.slice(32, 48);
      const encrypted = encryptedBuffer.slice(48);
      
      // Dériver la clé
      const key = this.deriveKey(salt);
      
      // Créer le decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      // Déchiffrer
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      
      return decrypted;
    } catch (err) {
      logger.logError(err, { context: 'decryption_error', userId });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Chiffrer un fichier stream (pour gros fichiers)
   */
  createEncryptStream(userId) {
    const salt = crypto.randomBytes(16);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Écrire le salt et l'IV en premier
    const saltIvBuffer = Buffer.concat([salt, iv]);
    
    return {
      stream: cipher,
      saltIv: saltIvBuffer,
      getAuthTag: () => cipher.getAuthTag(),
    };
  }

  /**
   * Déchiffrer un fichier stream
   */
  createDecryptStream(encryptedStream, saltIv, authTag, userId) {
    const salt = saltIv.slice(0, 16);
    const iv = saltIv.slice(16);
    const key = this.deriveKey(salt);
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    return decipher;
  }

  /**
   * Vérifier si le chiffrement est activé
   */
  isEnabled() {
    return !!process.env.ENCRYPTION_KEY;
  }
}

// Instance singleton
const encryptionService = new EncryptionService();

module.exports = encryptionService;

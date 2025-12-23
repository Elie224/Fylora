/**
 * Service de chiffrement de bout en bout (E2E)
 * Chiffre les fichiers avant l'upload et déchiffre lors du téléchargement
 */
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Générer une clé de chiffrement à partir d'un mot de passe
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Chiffrer un fichier
 */
async function encryptFile(inputPath, outputPath, encryptionKey) {
  try {
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const input = await fs.readFile(inputPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    
    const authTag = cipher.getAuthTag();

    // Format: salt + iv + authTag + encryptedData
    const output = Buffer.concat([
      salt,
      iv,
      authTag,
      encrypted,
    ]);

    await fs.writeFile(outputPath, output);

    return {
      encrypted: true,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    logger.logError(error, { context: 'encryptFile' });
    throw error;
  }
}

/**
 * Déchiffrer un fichier
 */
async function decryptFile(inputPath, outputPath, encryptionKey) {
  try {
    const key = Buffer.from(encryptionKey, 'hex');
    const encryptedData = await fs.readFile(inputPath);

    // Extraire les composants
    const salt = encryptedData.slice(0, SALT_LENGTH);
    const iv = encryptedData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = encryptedData.slice(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + 16
    );
    const encrypted = encryptedData.slice(SALT_LENGTH + IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    await fs.writeFile(outputPath, decrypted);

    return { decrypted: true };
  } catch (error) {
    logger.logError(error, { context: 'decryptFile' });
    throw error;
  }
}

/**
 * Générer une clé de chiffrement pour un utilisateur
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Chiffrer un buffer en mémoire (pour les petits fichiers)
 */
function encryptBuffer(buffer, encryptionKey) {
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: Buffer.concat([iv, authTag, encrypted]),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Déchiffrer un buffer en mémoire
 */
function decryptBuffer(encryptedBuffer, encryptionKey) {
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = encryptedBuffer.slice(0, IV_LENGTH);
  const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = encryptedBuffer.slice(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

module.exports = {
  encryptFile,
  decryptFile,
  generateEncryptionKey,
  encryptBuffer,
  decryptBuffer,
  ALGORITHM,
};



/**
 * Middleware pour upload en chunks
 * Permet d'uploader de gros fichiers par morceaux
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Stockage temporaire des chunks
const chunksDir = path.join(config.upload.uploadDir, 'chunks');

// S'assurer que le dossier existe
fs.mkdir(chunksDir, { recursive: true }).catch(() => {});

/**
 * Middleware pour recevoir un chunk de fichier
 */
const chunkedUploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await fs.mkdir(chunksDir, { recursive: true });
        cb(null, chunksDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const { chunkId, chunkIndex, totalChunks } = req.body;
      const filename = `${chunkId}_${chunkIndex}_${totalChunks}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB par chunk
  },
}).single('chunk');

/**
 * Reconstruire le fichier à partir des chunks
 */
async function reassembleFile(chunkId, userId, originalFilename, mimeType) {
  const chunks = [];
  let totalChunks = 0;

  // Lister tous les chunks pour ce fichier
  const files = await fs.readdir(chunksDir);
  const chunkFiles = files
    .filter(f => f.startsWith(`${chunkId}_`))
    .sort((a, b) => {
      const aIndex = parseInt(a.split('_')[1]);
      const bIndex = parseInt(b.split('_')[1]);
      return aIndex - bIndex;
    });

  if (chunkFiles.length === 0) {
    throw new Error('No chunks found');
  }

  totalChunks = parseInt(chunkFiles[0].split('_')[2]);

  // Vérifier qu'on a tous les chunks
  if (chunkFiles.length !== totalChunks) {
    throw new Error(`Missing chunks: expected ${totalChunks}, got ${chunkFiles.length}`);
  }

  // Lire tous les chunks
  for (const chunkFile of chunkFiles) {
    const chunkPath = path.join(chunksDir, chunkFile);
    const chunkData = await fs.readFile(chunkPath);
    chunks.push(chunkData);
  }

  // Reconstruire le fichier
  const finalBuffer = Buffer.concat(chunks);
  const finalPath = path.join(config.upload.uploadDir, `user_${userId}`, `${uuidv4()}${path.extname(originalFilename)}`);

  // S'assurer que le dossier existe
  await fs.mkdir(path.dirname(finalPath), { recursive: true });

  // Écrire le fichier final
  await fs.writeFile(finalPath, finalBuffer);

  // Supprimer les chunks
  for (const chunkFile of chunkFiles) {
    await fs.unlink(path.join(chunksDir, chunkFile)).catch(() => {});
  }

  return {
    path: finalPath,
    size: finalBuffer.length,
    originalFilename,
    mimeType,
  };
}

module.exports = {
  chunkedUploadMiddleware,
  reassembleFile,
};



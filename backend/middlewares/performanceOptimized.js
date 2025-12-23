/**
 * Middleware d'optimisation des performances
 * Compression avancée, cache headers, etc.
 */
const compression = require('compression');
const zlib = require('zlib');

// Compression Brotli si disponible (meilleure que gzip)
const brotliCompress = zlib.brotliCompressSync ? zlib.brotliCompressSync : null;

/**
 * Middleware de compression optimisée
 */
function optimizedCompression(req, res, next) {
  // Vérifier si le client supporte Brotli
  const acceptsBrotli = req.headers['accept-encoding']?.includes('br');
  const acceptsGzip = req.headers['accept-encoding']?.includes('gzip');

  // Compression standard pour les autres cas
  const standardCompression = compression({
    threshold: 1024, // 1KB
    level: 6,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      const contentType = res.getHeader('content-type') || '';
      return contentType.includes('application/json') ||
             contentType.includes('text/') ||
             contentType.includes('application/javascript');
    },
  });

  // Intercepter res.json pour compression Brotli si disponible
  if (acceptsBrotli && brotliCompress) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (res.statusCode === 200 && data && !res.headersSent) {
        try {
          const jsonString = JSON.stringify(data);
          const compressed = brotliCompress(Buffer.from(jsonString));
          
          if (compressed.length < jsonString.length) {
            res.setHeader('Content-Encoding', 'br');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Length', compressed.length);
            return res.send(compressed);
          }
        } catch (error) {
          // Fallback sur compression standard
        }
      }
      return originalJson(data);
    };
  }

  // Appliquer compression standard
  standardCompression(req, res, next);
}

/**
 * Middleware pour les headers de cache optimisés
 */
function cacheHeaders(req, res, next) {
  // Ne pas cacher les réponses d'erreur
  if (res.statusCode >= 400) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return next();
  }

  // Headers de cache pour les fichiers statiques
  if (req.path.startsWith('/public/') || req.path.startsWith('/avatars/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${Date.now()}"`);
  }

  // Headers pour les API (cache court)
  if (req.path.startsWith('/api/')) {
    // Cache court pour les données dynamiques
    res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
  }

  next();
}

/**
 * Middleware pour optimiser les réponses JSON
 */
function optimizeJsonResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Supprimer les champs null/undefined pour réduire la taille
    if (data && typeof data === 'object') {
      data = removeNullFields(data);
    }
    
    return originalJson(data);
  };
  
  next();
}

function removeNullFields(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeNullFields);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        cleaned[key] = removeNullFields(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

module.exports = {
  optimizedCompression,
  cacheHeaders,
  optimizeJsonResponse,
};


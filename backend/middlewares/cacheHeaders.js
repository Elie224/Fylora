/**
 * Middleware pour optimiser les cache headers (Browser/CDN)
 * Structure: Browser Cache → CDN Cache → Redis Cache → Database
 */

/**
 * Définir les headers de cache optimaux
 * @param {number} maxAge - Durée de cache en secondes
 * @param {boolean} publicCache - Si true, peut être mis en cache par CDN
 * @param {boolean} mustRevalidate - Si true, doit revalider avec le serveur
 */
function cacheHeaders(maxAge = 300, publicCache = false, mustRevalidate = true) {
  return (req, res, next) => {
    // Ne pas mettre en cache les requêtes POST/PUT/DELETE
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return next();
    }

    // Headers de cache optimisés
    const cacheControl = [
      publicCache ? 'public' : 'private',
      `max-age=${maxAge}`,
      mustRevalidate ? 'must-revalidate' : '',
      'stale-while-revalidate=60', // Permet de servir du contenu stale pendant 60s pendant la revalidation
    ].filter(Boolean).join(', ');

    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('ETag', generateETag(req));
    
    // Vérifier If-None-Match pour 304 Not Modified
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === generateETag(req)) {
      return res.status(304).end();
    }

    next();
  };
}

/**
 * Générer un ETag basique (peut être amélioré avec hash du contenu)
 */
function generateETag(req) {
  const key = `${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
  // En production, utiliser un hash du contenu réel
  return `"${Buffer.from(key).toString('base64').substring(0, 27)}"`;
}

/**
 * Headers pour les fichiers statiques (images, previews, etc.)
 */
function staticFileCacheHeaders() {
  return cacheHeaders(86400, true, false); // 24h, public, pas de revalidation
}

/**
 * Headers pour les métadonnées (listes de fichiers, dashboard, etc.)
 */
function metadataCacheHeaders() {
  return cacheHeaders(300, false, true); // 5min, private, revalidation requise
}

/**
 * Headers pour les données utilisateur (profil, settings)
 */
function userDataCacheHeaders() {
  return cacheHeaders(60, false, true); // 1min, private, revalidation requise
}

/**
 * Headers pour désactiver complètement le cache
 */
function noCacheHeaders() {
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  };
}

module.exports = {
  cacheHeaders,
  staticFileCacheHeaders,
  metadataCacheHeaders,
  userDataCacheHeaders,
  noCacheHeaders,
};


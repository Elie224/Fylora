const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const searchEngine = require('../services/searchEngine');

// Rechercher des fichiers et dossiers avec moteur optimisé
async function search(req, res, next) {
  try {
    const userId = req.user.id;
    const { q, type, mime_type, date_from, date_to, sort_by = 'updated_at', sort_order = 'desc', skip = 0, limit = 50 } = req.query;

    // Utiliser le moteur de recherche optimisé avec cache
    const results = await searchEngine.search(userId, q || '', {
      limit: parseInt(limit) || 50,
      offset: parseInt(skip) || 0,
      type: type || 'all',
      mimeType: mime_type,
      dateFrom: date_from,
      dateTo: date_to,
    });

    // Séparer fichiers et dossiers
    const files = results.filter(r => !r.folder_id && r.folder_id !== null);
    const folders = results.filter(r => r.folder_id === null || r.type === 'folder');

    res.status(200).json({
      data: {
        items: results,
        pagination: {
          total: results.length,
          totalFiles: files.length,
          totalFolders: folders.length,
          skip: parseInt(skip) || 0,
          limit: parseInt(limit) || 50,
          hasMore: results.length >= (parseInt(limit) || 50),
        },
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    next(err);
  }
}

// Autocomplete pour recherche progressive
async function autocomplete(req, res, next) {
  try {
    const userId = req.user.id;
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({ data: [] });
    }

    const suggestions = await searchEngine.autocomplete(userId, q, parseInt(limit));
    res.status(200).json({ data: suggestions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  search,
  autocomplete,
};


/**
 * Contrôleur pour les statistiques personnelles
 */
const statisticsService = require('../services/statisticsService');

// Obtenir les fichiers les plus ouverts
async function getMostOpenedFiles(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const files = await statisticsService.getMostOpenedFiles(userId, limit);
    res.status(200).json({ data: files });
  } catch (err) {
    next(err);
  }
}

// Obtenir les fichiers inutilisés
async function getUnusedFiles(req, res, next) {
  try {
    const userId = req.user.id;
    const daysThreshold = parseInt(req.query.days) || 90;
    const limit = parseInt(req.query.limit) || 50;

    const files = await statisticsService.getUnusedFiles(userId, daysThreshold, limit);
    res.status(200).json({ data: files });
  } catch (err) {
    next(err);
  }
}

// Obtenir les fichiers récents
async function getRecentFiles(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const files = await statisticsService.getRecentFiles(userId, limit);
    res.status(200).json({ data: files });
  } catch (err) {
    next(err);
  }
}

// Obtenir toutes les statistiques personnelles
async function getPersonalStatistics(req, res, next) {
  try {
    const userId = req.user.id;

    const stats = await statisticsService.getPersonalStatistics(userId);
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMostOpenedFiles,
  getUnusedFiles,
  getRecentFiles,
  getPersonalStatistics,
};



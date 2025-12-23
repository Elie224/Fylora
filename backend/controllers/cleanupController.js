/**
 * Contrôleur pour le nettoyage guidé
 */
const cleanupService = require('../services/cleanupService');
const FileRecommendation = require('../models/FileRecommendation');

// Analyser et obtenir les suggestions de nettoyage
async function analyzeCleanup(req, res, next) {
  try {
    const userId = req.user.id;

    const analysis = await cleanupService.analyzeCleanup(userId);
    res.status(200).json({
      data: analysis,
      message: `Vous pouvez libérer ${analysis.formatted_total} en supprimant ces fichiers`,
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les recommandations de nettoyage
async function getCleanupRecommendations(req, res, next) {
  try {
    const userId = req.user.id;
    const { applied, ignored } = req.query;

    const query = { user_id: userId };
    if (applied !== undefined) query.applied = applied === 'true';
    if (ignored !== undefined) query.ignored = ignored === 'true';

    const recommendations = await FileRecommendation.find(query)
      .populate('file_ids', 'name size mime_type')
      .sort({ confidence_score: -1, created_at: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ data: recommendations });
  } catch (err) {
    next(err);
  }
}

// Appliquer une recommandation
async function applyRecommendation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const recommendation = await FileRecommendation.findOne({
      _id: id,
      user_id: userId,
    });

    if (!recommendation) {
      return res.status(404).json({ error: { message: 'Recommendation not found' } });
    }

    if (recommendation.applied) {
      return res.status(400).json({ error: { message: 'Recommendation already applied' } });
    }

    // Ici, on pourrait implémenter la logique d'application
    // Pour l'instant, on marque juste comme appliqué
    recommendation.applied = true;
    recommendation.applied_at = new Date();
    await recommendation.save();

    res.status(200).json({
      data: recommendation,
      message: 'Recommendation applied successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Ignorer une recommandation
async function ignoreRecommendation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const recommendation = await FileRecommendation.findOne({
      _id: id,
      user_id: userId,
    });

    if (!recommendation) {
      return res.status(404).json({ error: { message: 'Recommendation not found' } });
    }

    recommendation.ignored = true;
    recommendation.ignored_at = new Date();
    await recommendation.save();

    res.status(200).json({
      data: recommendation,
      message: 'Recommendation ignored',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  analyzeCleanup,
  getCleanupRecommendations,
  applyRecommendation,
  ignoreRecommendation,
};



/**
 * Contrôleur pour la recherche par phrase naturelle
 */
const naturalSearchService = require('../services/naturalSearchService');

// Rechercher avec une phrase naturelle
async function naturalSearch(req, res, next) {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: { message: 'Query parameter "q" is required' },
      });
    }

    const results = await naturalSearchService.search(userId, q.trim());
    
    res.status(200).json({
      data: results,
      query: q,
      count: results.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  naturalSearch,
};



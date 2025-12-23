const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tagsController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { cacheMiddleware } = require('../utils/cache');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Créer un tag
router.post('/', tagsController.createTag);

// Lister les tags avec cache (30 secondes)
router.get('/', cacheMiddleware(30000), tagsController.listTags);

// Obtenir les ressources d'un tag
router.get('/:id/resources', tagsController.getResourcesByTag);

// Mettre à jour un tag
router.patch('/:id', tagsController.updateTag);

// Supprimer un tag
router.delete('/:id', tagsController.deleteTag);

// Ajouter des tags à une ressource
router.post('/resources/:resource_id/add', tagsController.addTagsToResource);

// Retirer des tags d'une ressource
router.post('/resources/:resource_id/remove', tagsController.removeTagsFromResource);

module.exports = router;



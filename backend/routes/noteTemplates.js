const express = require('express');
const router = express.Router();
const noteTemplatesController = require('../controllers/noteTemplatesController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Créer un template
router.post('/', noteTemplatesController.createTemplate);

// Lister les templates
router.get('/', noteTemplatesController.listTemplates);

// Créer une note depuis un template
router.post('/:template_id/create-note', noteTemplatesController.createNoteFromTemplate);

// Mettre à jour un template
router.patch('/:id', noteTemplatesController.updateTemplate);

// Supprimer un template
router.delete('/:id', noteTemplatesController.deleteTemplate);

module.exports = router;






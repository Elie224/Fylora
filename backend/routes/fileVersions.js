const express = require('express');
const router = express.Router();
const fileVersionsController = require('../controllers/fileVersionsController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Créer une nouvelle version
router.post('/:file_id/versions', fileVersionsController.createVersion);

// Lister les versions d'un fichier
router.get('/:file_id/versions', fileVersionsController.listVersions);

// Restaurer une version
router.post('/:file_id/versions/:version_id/restore', fileVersionsController.restoreVersion);

// Télécharger une version
router.get('/:file_id/versions/:version_id/download', fileVersionsController.downloadVersion);

module.exports = router;






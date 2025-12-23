const express = require('express');
const router = express.Router();
const fileAnnotationController = require('../controllers/fileAnnotationController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/files/:id/annotations', fileAnnotationController.createAnnotation);
router.get('/files/:id/annotations', fileAnnotationController.getAnnotations);
router.patch('/annotations/:annotationId', fileAnnotationController.updateAnnotation);
router.delete('/annotations/:annotationId', fileAnnotationController.deleteAnnotation);

module.exports = router;



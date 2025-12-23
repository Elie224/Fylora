/**
 * Middleware pour batch requests
 * Valide et prépare les requêtes batch
 */
const { body, validationResult } = require('express-validator');

const validateBatch = [
  body('operations')
    .isArray({ min: 1, max: 100 })
    .withMessage('Operations must be an array with 1-100 items'),
  body('operations.*.action')
    .isIn(['delete', 'move', 'rename', 'copy'])
    .withMessage('Invalid action'),
  body('operations.*.fileId')
    .optional()
    .isMongoId()
    .withMessage('Invalid fileId'),
  body('operations.*.folderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid folderId'),
  body('operations.*.data')
    .optional()
    .isObject()
    .withMessage('Data must be an object'),
];

function handleBatchValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array(),
      },
    });
  }
  next();
}

module.exports = {
  validateBatch,
  handleBatchValidation,
};



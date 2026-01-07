/**
 * Middleware de validation robuste pour améliorer la solidité de l'application
 */

const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware pour valider les résultats de validation
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.logWarn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
    });
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array(),
      },
    });
  }
  next();
};

/**
 * Validations communes
 */
const commonValidations = {
  // Validation d'ID MongoDB
  mongoId: (field = 'id') => param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ID`),

  // Validation de nom (fichier/dossier)
  name: (field = 'name') => body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: 1, max: 255 })
    .withMessage(`${field} must be between 1 and 255 characters`)
    .matches(/^[^<>:"/\\|?*\x00-\x1f]+$/)
    .withMessage(`${field} contains invalid characters`),

  // Validation d'email
  email: (field = 'email') => body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isEmail()
    .withMessage(`${field} must be a valid email`)
    .normalizeEmail(),

  // Validation de mot de passe
  password: (field = 'password') => body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: 8 })
    .withMessage(`${field} must be at least 8 characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(`${field} must contain at least one uppercase letter, one lowercase letter, and one number`),

  // Validation de quota
  quota: (field = 'quota') => body(field)
    .optional()
    .isInt({ min: 0 })
    .withMessage(`${field} must be a positive integer`),

  // Validation de type MIME
  mimeType: (field = 'mimeType') => body(field)
    .optional()
    .matches(/^[a-z]+\/[a-z0-9][a-z0-9!#$&\-\^_.]*$/i)
    .withMessage(`${field} must be a valid MIME type`),

  // Validation de date
  date: (field = 'date') => body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`),

  // Validation de booléen
  boolean: (field = 'value') => body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean`),

  // Validation de nombre positif
  positiveNumber: (field = 'number') => body(field)
    .optional()
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`),

  // Validation de pagination
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
      .toInt(),
  ],

  // Validation de recherche
  searchQuery: (field = 'q') => query(field)
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage(`${field} must be less than 200 characters`),

  // Validation de token de partage
  shareToken: (field = 'token') => param(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: 20, max: 100 })
    .withMessage(`${field} must be between 20 and 100 characters`)
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(`${field} contains invalid characters`),
};

/**
 * Sanitisation des entrées
 */
const sanitize = {
  // Sanitiser un nom de fichier/dossier
  filename: (name) => {
    if (!name || typeof name !== 'string') return '';
    return name
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Supprimer les caractères invalides
      .replace(/^\.+/, '') // Supprimer les points au début
      .replace(/\.+$/, '') // Supprimer les points à la fin
      .substring(0, 255); // Limiter la longueur
  },

  // Sanitiser un email
  email: (email) => {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  },

  // Sanitiser une chaîne de recherche
  searchString: (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.trim().substring(0, 200);
  },
};

/**
 * Schémas de validation pour l'authentification
 */
const loginSchema = [
  commonValidations.email('email'),
  body('password')
    .notEmpty()
    .withMessage('password is required')
    .isLength({ min: 1 })
    .withMessage('password is required'),
];

const signupSchema = [
  commonValidations.email('email'),
  commonValidations.password('password'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('firstName is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('firstName must be between 1 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('firstName can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('lastName is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('lastName must be between 1 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('lastName can only contain letters, spaces, hyphens, and apostrophes'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('phone is required')
    .matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/)
    .withMessage('phone must be a valid phone number'),
  body('country')
    .trim()
    .notEmpty()
    .withMessage('country is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('country must be between 2 and 100 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('username can only contain letters, numbers, underscores, and hyphens'),
];

const changePasswordSchema = [
  body('currentPassword')
    .notEmpty()
    .withMessage('currentPassword is required'),
  commonValidations.password('newPassword'),
];

const createFolderSchema = [
  commonValidations.name('name'),
];

const renameSchema = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('name cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('name must be between 1 and 255 characters')
    .matches(/^[^<>:"/\\|?*\x00-\x1f]+$/)
    .withMessage('name contains invalid characters'),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('parentId must be a valid MongoDB ID'),
];

const publicShareSchema = [
  body('fileId')
    .optional()
    .isMongoId()
    .withMessage('fileId must be a valid MongoDB ID'),
  body('folderId')
    .optional()
    .isMongoId()
    .withMessage('folderId must be a valid MongoDB ID'),
  body('password')
    .optional()
    .isLength({ min: 0, max: 100 })
    .withMessage('password must be less than 100 characters'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('expiresAt must be a valid ISO 8601 date'),
];

module.exports = {
  validate,
  commonValidations,
  sanitize,
  loginSchema,
  signupSchema,
  changePasswordSchema,
  createFolderSchema,
  renameSchema,
  publicShareSchema,
};

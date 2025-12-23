const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const User = require('../models/userModel');
const Session = require('../models/sessionModel');
const { AppError } = require('../middlewares/errorHandler');
const config = require('../config');
const logger = require('../utils/logger');
const { verify2FAToken } = require('./twoFactorController');

/**
 * Nombre de rounds pour le hachage bcrypt
 * Plus élevé = plus sécurisé mais plus lent
 */
const SALT_ROUNDS = 10;

async function signup(req, res, next) {
  try {
    // Vérifier que MongoDB est connecté
    const mongoose = require('../models/db');
    const db = mongoose.connection;
    
    // Attendre la connexion si elle n'est pas encore établie
    if (db.readyState !== 1) {
      // Si en cours de connexion, attendre un peu
      if (db.readyState === 2) {
        await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000);
          db.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      // Vérifier à nouveau
      if (db.readyState !== 1) {
        return res.status(503).json({ 
          error: { 
            message: 'Connexion à la base de données impossible. Veuillez réessayer dans un instant.' 
          } 
        });
      }
    }

    const body = req.validatedBody || req.body;
    const { email, password } = body;

    // Vérifier si un utilisateur avec cet email existe déjà
    let utilisateurExistant;
    try {
      utilisateurExistant = await User.findByEmail(email);
    } catch (erreur) {
      logger.logError(erreur, { contexte: 'vérification_email_existant', email });
      if (erreur.message && erreur.message.includes('MongoDB')) {
        return res.status(503).json({ 
          error: { 
            message: 'Connexion à la base de données indisponible. Veuillez réessayer dans un instant.' 
          } 
        });
      }
      throw erreur;
    }
    
    if (utilisateurExistant) {
      logger.logWarn(`Tentative d'inscription avec un email déjà utilisé: ${email}`);
      return res.status(409).json({ 
        error: { 
          message: 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.' 
        } 
      });
    }

    // Hacher le mot de passe de manière sécurisée
    const motDePasseHache = await bcrypt.hash(password, SALT_ROUNDS);

    // Créer le nouvel utilisateur
    let nouvelUtilisateur;
    try {
      nouvelUtilisateur = await User.create({ email, passwordHash: motDePasseHache });
      logger.logInfo(`Nouvel utilisateur créé: ${email}`, { userId: nouvelUtilisateur.id });
    } catch (erreur) {
      logger.logError(erreur, { contexte: 'création_utilisateur', email });
      if (erreur.message && erreur.message.includes('MongoDB')) {
        return res.status(503).json({ 
          error: { 
            message: 'Connexion à la base de données indisponible. Veuillez réessayer dans un instant.' 
          } 
        });
      }
      throw erreur;
    }

    // Créer automatiquement le dossier racine pour le nouvel utilisateur
    const FolderModel = require('../models/folderModel');
    try {
      await FolderModel.create({ 
        name: 'Root', 
        ownerId: nouvelUtilisateur.id, 
        parentId: null 
      });
      logger.logInfo(`Dossier racine créé pour l'utilisateur ${nouvelUtilisateur.id}`);
    } catch (erreur) {
      logger.logError(erreur, { 
        contexte: 'création_dossier_racine', 
        userId: nouvelUtilisateur.id 
      });
      // Ne pas bloquer l'inscription si la création du dossier échoue
      // L'utilisateur pourra créer son dossier racine manuellement si nécessaire
    }

    // Générer les tokens d'authentification
    const donneesToken = { id: nouvelUtilisateur.id, email: nouvelUtilisateur.email };
    const tokenAcces = generateAccessToken(donneesToken);
    const tokenRafraichissement = generateRefreshToken(donneesToken);

    // Enregistrer la session dans la base de données
    try {
      const userAgent = req.get('user-agent') || null;
      const adresseIP = req.ip || req.headers['x-forwarded-for'] || null;
      await Session.createSession({ 
        userId: nouvelUtilisateur.id, 
        refreshToken: tokenRafraichissement, 
        userAgent, 
        ipAddress: adresseIP, 
        deviceName: null, 
        expiresIn: config.jwt.refreshExpiresIn 
      });
      logger.logInfo(`Session créée pour l'utilisateur ${nouvelUtilisateur.id}`);
    } catch (erreur) {
      logger.logError(erreur, { 
        contexte: 'création_session_inscription', 
        userId: nouvelUtilisateur.id 
      });
      // Ne pas bloquer l'inscription si la création de session échoue
    }

    res.status(201).json({ 
      data: { 
        user: nouvelUtilisateur, 
        access_token: tokenAcces, 
        refresh_token: tokenRafraichissement 
      }, 
      message: 'Compte créé avec succès. Bienvenue sur Fylora !' 
    });
  } catch (erreur) {
    logger.logError(erreur, { contexte: 'inscription', email: req.body?.email });
    
    // Gérer les erreurs spécifiques de connexion MongoDB
    if (erreur.message && erreur.message.includes('MongoDB is not connected')) {
      return res.status(503).json({ 
        error: { 
          message: 'Connexion à la base de données indisponible. Veuillez réessayer dans un instant.' 
        } 
      });
    }
    
    // Gérer les erreurs de duplication d'email (index unique)
    if (erreur.name === 'MongoServerError' && erreur.code === 11000) {
      logger.logWarn(`Tentative d'inscription avec email dupliqué: ${req.body?.email}`);
      return res.status(409).json({ 
        error: { 
          message: 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.' 
        } 
      });
    }
    
    // Passer les autres erreurs au gestionnaire d'erreurs global
    next(erreur);
  }
}

async function login(req, res, next) {
  try {
    // Vérifier que MongoDB est connecté
    const mongoose = require('../models/db');
    const db = mongoose.connection;
    
    // Attendre la connexion si elle n'est pas encore établie
    if (db.readyState !== 1) {
      // Si en cours de connexion, attendre un peu
      if (db.readyState === 2) {
        await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000);
          db.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      // Vérifier à nouveau
      if (db.readyState !== 1) {
        return res.status(503).json({ 
          error: { 
            message: 'Connexion à la base de données impossible. Veuillez réessayer dans un instant.' 
          } 
        });
      }
    }

    const donneesRequete = req.validatedBody || req.body;
    const { email, password } = donneesRequete;

    // Rechercher l'utilisateur par email
    const utilisateur = await User.findByEmail(email);
    if (!utilisateur || !utilisateur.password_hash) {
      logger.logWarn(`Tentative de connexion avec email inexistant: ${email}`);
      return res.status(401).json({ 
        error: { 
          message: 'Identifiants incorrects. Vérifiez votre email et votre mot de passe.' 
        } 
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(password, utilisateur.password_hash);
    if (!motDePasseValide) {
      logger.logWarn(`Tentative de connexion avec mot de passe incorrect pour: ${email}`);
      return res.status(401).json({ 
        error: { 
          message: 'Identifiants incorrects. Vérifiez votre email et votre mot de passe.' 
        } 
      });
    }

    // Vérifier si 2FA est activé
    const TwoFactorAuth = require('../models/TwoFactorAuth');
    const twoFactor = await TwoFactorAuth.findOne({ user_id: utilisateur.id, enabled: true });
    
    if (twoFactor) {
      // 2FA activé - vérifier le token
      const { two_factor_token } = donneesRequete;
      
      if (!two_factor_token) {
        return res.status(200).json({
          data: {
            requires_2fa: true,
            message: 'Two-factor authentication required',
          },
        });
      }

      // Vérifier le token 2FA
      const twoFactorResult = await verify2FAToken(utilisateur.id, two_factor_token);
      
      if (!twoFactorResult.valid) {
        logger.logWarn(`Invalid 2FA token for user: ${email}`);
        return res.status(401).json({
          error: {
            message: 'Invalid 2FA token. Please try again.',
          },
        });
      }
    }

    // Mettre à jour la date de dernière connexion
    await User.updateLastLogin(utilisateur.id);
    logger.logInfo(`Connexion réussie pour l'utilisateur: ${email}`, { userId: utilisateur.id });

    // Générer les tokens d'authentification
    const donneesToken = { id: utilisateur.id, email: utilisateur.email };
    const tokenAcces = generateAccessToken(donneesToken);
    const tokenRafraichissement = generateRefreshToken(donneesToken);

    // Enregistrer la session dans la base de données
    try {
      const userAgent = req.get('user-agent') || null;
      const adresseIP = req.ip || req.headers['x-forwarded-for'] || null;
      await Session.createSession({ 
        userId: utilisateur.id, 
        refreshToken: tokenRafraichissement, 
        userAgent, 
        ipAddress: adresseIP, 
        deviceName: null, 
        expiresIn: config.jwt.refreshExpiresIn 
      });
      logger.logInfo(`Session créée pour l'utilisateur ${utilisateur.id}`);
    } catch (erreur) {
      logger.logError(erreur, { 
        contexte: 'création_session_connexion', 
        userId: utilisateur.id 
      });
      // Ne pas bloquer la connexion si la création de session échoue
    }

    // Récupérer les données utilisateur mises à jour (avec last_login_at)
    const utilisateurMisAJour = await User.findById(utilisateur.id);

    // Retirer les champs sensibles avant de retourner les données
    const utilisateurSecurise = {
      id: utilisateurMisAJour.id,
      email: utilisateurMisAJour.email,
      display_name: utilisateurMisAJour.display_name,
      avatar_url: utilisateurMisAJour.avatar_url,
      quota_used: utilisateurMisAJour.quota_used,
      quota_limit: utilisateurMisAJour.quota_limit,
      preferences: utilisateurMisAJour.preferences,
      is_admin: utilisateurMisAJour.is_admin || false,
      created_at: utilisateurMisAJour.created_at,
      last_login_at: utilisateurMisAJour.last_login_at || new Date(),
    };

    res.status(200).json({ 
      data: { 
        user: utilisateurSecurise, 
        access_token: tokenAcces, 
        refresh_token: tokenRafraichissement 
      }, 
      message: 'Connexion réussie. Bienvenue sur Fylora !' 
    });
  } catch (erreur) {
    logger.logError(erreur, { contexte: 'connexion', email: req.body?.email });
    
    if (erreur.message && erreur.message.includes('MongoDB is not connected')) {
      return res.status(503).json({ 
        error: { 
          message: 'Connexion à la base de données indisponible. Veuillez réessayer dans un instant.' 
        } 
      });
    }
    
    next(erreur);
  }
}

/**
 * Rafraîchir les tokens d'authentification
 * Génère de nouveaux tokens d'accès et de rafraîchissement
 */
async function refresh(req, res, next) {
  try {
    const { refresh_token: tokenRafraichissement } = req.body;

    if (!tokenRafraichissement) {
      return res.status(400).json({ 
        error: { 
          message: 'Le token de rafraîchissement est requis.' 
        } 
      });
    }

    // Vérifier et décoder le token de rafraîchissement
    let donneesDecodees;
    try {
      donneesDecodees = verifyToken(tokenRafraichissement, true);
    } catch (erreur) {
      const errorType = erreur.name === 'TokenExpiredError' ? 'expiré' : 'invalide';
      logger.logWarn(`Tentative de rafraîchissement avec token ${errorType}`, { 
        error: erreur.name,
        message: erreur.message 
      });
      return res.status(401).json({ 
        error: { 
          message: 'Token de rafraîchissement invalide ou expiré. Veuillez vous reconnecter.' 
        } 
      });
    }

    // Vérifier que la session existe et n'est pas révoquée
    const session = await Session.findByToken(tokenRafraichissement);
    if (!session || session.is_revoked) {
      const userId = donneesDecodees?.id || 'inconnu';
      const reason = !session ? 'session inexistante' : 'session révoquée';
      logger.logWarn(`Tentative de rafraîchissement avec ${reason} pour l'utilisateur ${userId}`);
      return res.status(401).json({ 
        error: { 
          message: 'Token de rafraîchissement invalide ou expiré. Veuillez vous reconnecter.' 
        } 
      });
    }

    // Générer de nouveaux tokens
    const donneesToken = { id: donneesDecodees.id, email: donneesDecodees.email };
    const nouveauTokenAcces = generateAccessToken(donneesToken);
    const nouveauTokenRafraichissement = generateRefreshToken(donneesToken);

    // Mettre à jour la session avec le nouveau token de rafraîchissement
    await Session.rotateToken(
      tokenRafraichissement, 
      nouveauTokenRafraichissement, 
      config.jwt.refreshExpiresIn
    );
    
    logger.logInfo(`Tokens rafraîchis pour l'utilisateur ${donneesDecodees.id}`);

    res.status(200).json({ 
      data: { 
        access_token: nouveauTokenAcces, 
        refresh_token: nouveauTokenRafraichissement 
      }, 
      message: 'Tokens rafraîchis avec succès.' 
    });
  } catch (erreur) {
    logger.logError(erreur, { contexte: 'rafraîchissement_token' });
    next(erreur);
  }
}

/**
 * Déconnexion de l'utilisateur
 * Révoque le token de rafraîchissement pour invalider la session
 */
async function logout(req, res, next) {
  try {
    const { refresh_token: tokenRafraichissement } = req.body;
    const userId = req.user?.id;

    if (tokenRafraichissement) {
      await Session.revokeByToken(tokenRafraichissement);
      logger.logInfo(`Session révoquée pour l'utilisateur ${userId || 'inconnu'}`);
    }

    res.status(200).json({ 
      message: 'Déconnexion réussie. À bientôt sur Fylora !' 
    });
  } catch (erreur) {
    logger.logError(erreur, { contexte: 'déconnexion', userId: req.user?.id });
    next(erreur);
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
};


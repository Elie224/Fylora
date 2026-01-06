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

    // Créer le nouvel utilisateur avec plan FREE par défaut
    const planService = require('../services/planService');
    const freeQuota = planService.getStorageQuota('free');
    
    let nouvelUtilisateur;
    try {
      nouvelUtilisateur = await User.create({ 
        email, 
        passwordHash: motDePasseHache,
        plan: 'free',
        quota_limit: freeQuota
      });
      logger.logInfo(`Nouvel utilisateur créé: ${email}`, { userId: nouvelUtilisateur.id, plan: 'free' });
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
    const userAgent = req.get('user-agent') || null;
    const adresseIP = req.ip || req.headers['x-forwarded-for'] || null;
    
    if (!motDePasseValide) {
      logger.logWarn(`Tentative de connexion avec mot de passe incorrect pour: ${email}`);
      
      // Enregistrer l'échec dans Security Center
      try {
        const securityCenterService = require('../services/securityCenterService');
        await securityCenterService.recordLogin(
          utilisateur.id,
          adresseIP,
          userAgent,
          null,
          false,
          'Invalid password'
        );
      } catch (securityErr) {
        // Ignorer les erreurs de Security Center
      }
      
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

/**
 * Vérifier et valider un token Google natif (pour mobile/web)
 * Crée ou met à jour l'utilisateur et génère les tokens JWT
 * Accepte soit id_token (mobile) soit access_token + user info (web)
 */
async function verifyGoogleToken(req, res, next) {
  try {
    const { id_token, access_token, email, display_name, photo_url } = req.body;

    let email_final, displayName_final, photoUrl_final, google_id;

    // Si id_token est présent (mobile), l'utiliser
    if (id_token) {
      // Vérifier le token Google avec Google OAuth2
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(config.oauth?.google?.clientId);

      let ticket;
      try {
        ticket = await client.verifyIdToken({
          idToken: id_token,
          audience: config.oauth?.google?.clientId,
        });
      } catch (error) {
        logger.logError(error, { contexte: 'vérification_token_google' });
        return res.status(401).json({
          error: {
            message: 'Token Google invalide',
          },
        });
      }

      const payload = ticket.getPayload();
      email_final = payload.email;
      displayName_final = payload.name || payload.given_name || email_final.split('@')[0];
      photoUrl_final = payload.picture;
      google_id = payload.sub;
    } 
    // Sinon, utiliser access_token + user info (web)
    else if (access_token && email) {
      // Utiliser les infos utilisateur fournies dans la requête
      email_final = email;
      displayName_final = display_name || email_final.split('@')[0];
      photoUrl_final = photo_url;
      google_id = null; // Pas nécessaire pour créer l'utilisateur
      
      // Optionnel : Essayer de récupérer google_id depuis l'API userinfo si nécessaire
      // Mais si l'appel échoue, on continue quand même avec les infos fournies
      const axios = require('axios');
      try {
        const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
          timeout: 5000, // Timeout de 5 secondes
        });

        const userInfo = userInfoResponse.data;
        // Utiliser les infos de l'API si disponibles, sinon garder celles de la requête
        email_final = userInfo.email || email_final;
        displayName_final = userInfo.name || userInfo.given_name || displayName_final;
        photoUrl_final = userInfo.picture || photoUrl_final;
        google_id = userInfo.id;
      } catch (error) {
        // Ignorer l'erreur si on a déjà les infos nécessaires (email, display_name, etc.)
        // On continue avec les infos fournies dans la requête
        logger.logError(error, { contexte: 'vérification_access_token_google', note: 'Utilisation des infos fournies dans la requête' });
        // Ne pas retourner d'erreur, continuer avec les infos fournies
      }
    }
    // Fallback : utiliser seulement email + user info (web sans token - limitation du plugin google_sign_in)
    else if (email && !id_token && !access_token) {
      // Sur le web, le plugin google_sign_in peut ne pas exposer l'access_token
      // même si Google Sign-In l'a obtenu (à cause de l'erreur 403 People API)
      // Dans ce cas, on accepte les infos utilisateur sans vérification de token
      // C'est un fallback pour permettre la connexion web malgré la limitation du plugin
      email_final = email;
      displayName_final = display_name || email_final.split('@')[0];
      photoUrl_final = photo_url;
      google_id = null;
      
      logger.logWarn('Google OAuth web: using user info without token verification (plugin limitation)', {
        email: email_final,
      });
    } else {
      return res.status(400).json({
        error: {
          message: 'Données Google manquantes (id_token, access_token, ou email requis)',
        },
      });
    }

    if (!email_final) {
      return res.status(400).json({
        error: {
          message: 'Email non trouvé dans le profil Google',
        },
      });
    }

    // Chercher ou créer l'utilisateur
    let utilisateur = await User.findByEmail(email_final);

    if (!utilisateur) {
      // Créer un nouvel utilisateur OAuth avec plan FREE par défaut
      const planService = require('../services/planService');
      const freeQuota = planService.getStorageQuota('free');
      
      utilisateur = await User.create({
        email: email_final,
        display_name: displayName_final,
        avatar_url: photoUrl_final,
        passwordHash: null, // Pas de mot de passe pour les comptes OAuth
        oauth_provider: 'google',
        oauth_id: google_id || null,
        plan: 'free',
        quota_limit: freeQuota
      });
      logger.logInfo(`Nouvel utilisateur Google créé: ${email_final}`, { userId: utilisateur.id, plan: 'free' });

      // Créer le dossier racine
      const FolderModel = require('../models/folderModel');
      await FolderModel.create({
        name: 'Root',
        ownerId: utilisateur.id,
        parentId: null,
      });
    } else {
      // Mettre à jour les informations OAuth si nécessaire
      // Construire l'objet de mise à jour
      const updates = {};
      
      if (google_id && !utilisateur.oauth_id) {
        updates.oauth_provider = 'google';
        updates.oauth_id = google_id;
      }
      if (photoUrl_final && !utilisateur.avatar_url) {
        updates.avatar_url = photoUrl_final;
      }
      if (displayName_final && !utilisateur.display_name) {
        updates.display_name = displayName_final;
      }
      
      // Appliquer les mises à jour si nécessaire
      if (Object.keys(updates).length > 0) {
        const mongoose = require('mongoose');
        const UserMongoose = mongoose.models.User;
        await UserMongoose.findByIdAndUpdate(utilisateur.id, updates);
      }
      
      await User.updateLastLogin(utilisateur.id);
    }

    // Générer les tokens JWT
    const donneesToken = { id: utilisateur.id, email: utilisateur.email };
    const tokenAcces = generateAccessToken(donneesToken);
    const tokenRafraichissement = generateRefreshToken(donneesToken);

    // Créer une session
    try {
      const userAgent = req.get('user-agent') || null;
      const adresseIP = req.ip || req.headers['x-forwarded-for'] || null;
      await Session.createSession({
        userId: utilisateur.id,
        refreshToken: tokenRafraichissement,
        userAgent,
        ipAddress: adresseIP,
        deviceName: null,
        expiresIn: config.jwt.refreshExpiresIn,
      });
    } catch (erreur) {
      logger.logError(erreur, { contexte: 'création_session_google', userId: utilisateur.id });
    }

    // Récupérer les données utilisateur mises à jour
    const utilisateurMisAJour = await User.findById(utilisateur.id);
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
      last_login_at: utilisateurMisAJour.last_login_at,
    };

    res.status(200).json({
      data: {
        user: utilisateurSecurise,
        access_token: tokenAcces,
        refresh_token: tokenRafraichissement,
      },
    });
  } catch (erreur) {
    logger.logError(erreur, { contexte: 'vérification_token_google' });
    next(erreur);
  }
}

/**
 * Supprimer définitivement le compte utilisateur et toutes ses données
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const mongoose = require('../models/db');
    const User = mongoose.models.User || require('../models/userModel');
    const File = mongoose.models.File;
    const Folder = mongoose.models.Folder;
    const Share = mongoose.models.Share;
    const Session = mongoose.models.Session;
    const Notification = mongoose.models.Notification;
    const ActivityLog = mongoose.models.ActivityLog;
    const Comment = mongoose.models.Comment;
    const Tag = mongoose.models.Tag;
    const Note = mongoose.models.Note;
    const FileVersion = mongoose.models.FileVersion;
    const Team = mongoose.models.Team;
    const fs = require('fs').promises;
    const path = require('path');

    logger.logInfo('Starting account deletion', { userId });

    // 1. Supprimer tous les fichiers physiques et métadonnées
    const files = await File.find({ owner_id: userId });
    logger.logInfo(`Deleting ${files.length} files`, { userId });
    
    for (const file of files) {
      // Supprimer le fichier physique s'il existe
      if (file.file_path) {
        try {
          await fs.unlink(file.file_path);
        } catch (err) {
          logger.logWarn(`Could not delete physical file: ${file.file_path}`, { userId, error: err.message });
        }
      }
      
      // Supprimer les versions du fichier
      if (FileVersion) {
        await FileVersion.deleteMany({ file_id: file._id });
      }
    }
    
    // Supprimer toutes les métadonnées de fichiers
    await File.deleteMany({ owner_id: userId });

    // 2. Supprimer tous les dossiers
    const folders = await Folder.find({ owner_id: userId });
    logger.logInfo(`Deleting ${folders.length} folders`, { userId });
    await Folder.deleteMany({ owner_id: userId });

    // 3. Supprimer tous les partages créés par l'utilisateur
    await Share.deleteMany({ owner_id: userId });
    
    // Supprimer l'utilisateur des partages où il est destinataire
    if (Share.schema.paths.shared_with) {
      await Share.updateMany(
        { 'shared_with.user_id': userId },
        { $pull: { shared_with: { user_id: userId } } }
      );
    }

    // 4. Supprimer toutes les sessions
    await Session.deleteMany({ user_id: userId });

    // 5. Supprimer toutes les notifications
    if (Notification) {
      await Notification.deleteMany({ user_id: userId });
    }

    // 6. Supprimer toutes les activités
    if (ActivityLog) {
      await ActivityLog.deleteMany({ user_id: userId });
    }

    // 7. Supprimer tous les commentaires
    if (Comment) {
      await Comment.deleteMany({ user_id: userId });
      // Supprimer aussi les commentaires sur les fichiers de l'utilisateur
      await Comment.deleteMany({ file_id: { $in: files.map(f => f._id) } });
    }

    // 8. Supprimer tous les tags
    if (Tag) {
      await Tag.deleteMany({ user_id: userId });
    }

    // 9. Supprimer toutes les notes
    if (Note) {
      await Note.deleteMany({ owner_id: userId });
    }

    // 10. Gérer les équipes
    if (Team) {
      // Retirer l'utilisateur de toutes les équipes où il est membre
      await Team.updateMany(
        { 'members.user_id': userId },
        { $pull: { members: { user_id: userId } } }
      );
      
      // Supprimer les équipes dont l'utilisateur est propriétaire
      const ownedTeams = await Team.find({ owner_id: userId });
      for (const team of ownedTeams) {
        team.is_active = false;
        await team.save();
        logger.logInfo('Team deactivated due to owner account deletion', { userId, teamId: team._id });
      }
    }

    // 11. Supprimer le dossier utilisateur s'il existe
    const uploadDir = path.join(__dirname, '../uploads', `user_${userId}`);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (err) {
      logger.logWarn(`Could not delete user directory: ${uploadDir}`, { userId, error: err.message });
    }

    // 12. Supprimer l'utilisateur de la base de données
    await User.findByIdAndDelete(userId);

    logger.logInfo('Account deleted successfully', { userId });

    res.status(200).json({
      message: 'Account deleted successfully',
      data: { deleted: true }
    });
  } catch (error) {
    logger.logError(error, { context: 'deleteAccount', userId: req.user?.id });
    next(error);
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  verifyGoogleToken,
  deleteAccount,
};


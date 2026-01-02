/**
 * Modèle Utilisateur pour Fylora
 * 
 * Ce modèle représente un utilisateur de la plateforme.
 * Il gère les informations de compte, les préférences, et le quota de stockage.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Schéma de l'utilisateur
 * 
 * Définit la structure des données d'un utilisateur dans la base de données.
 * Les timestamps sont automatiquement gérés (created_at, updated_at).
 */
const UserSchema = new Schema({
  // Email de l'utilisateur (unique et obligatoire)
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true, // Normaliser en minuscules
    trim: true, // Supprimer les espaces
  },
  
  // Hash du mot de passe (null si connexion OAuth uniquement)
  password_hash: { type: String },
  
  // Informations OAuth (si l'utilisateur s'est connecté via Google, GitHub, etc.)
  oauth_provider: String, // 'google', 'github', 'microsoft', etc.
  oauth_id: String, // ID unique fourni par le provider OAuth
  
  // Informations de profil
  display_name: String, // Nom d'affichage (peut être différent de l'email)
  avatar_url: String, // URL de l'avatar de l'utilisateur
  
  // Quota de stockage (en octets)
  quota_limit: { 
    type: Number, 
    default: 1099511627776, // 1 To par défaut (1 099 511 627 776 octets)
  },
  quota_used: { 
    type: Number, 
    default: 0, // Espace utilisé actuellement (en octets)
  },
  
  // Préférences utilisateur (thème, langue, notifications, etc.)
  preferences: { 
    type: Schema.Types.Mixed, 
    default: { 
      theme: 'light', 
      language: 'fr', // Français par défaut pour Fylora
      notifications_enabled: true 
    } 
  },
  
  // Statut du compte
  is_active: { type: Boolean, default: true }, // Compte actif ou désactivé
  is_admin: { type: Boolean, default: false }, // Droits administrateur
  
  // Date de dernière connexion
  last_login_at: Date,
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

// Créer ou récupérer le modèle User
const User = mongoose.models.User || mongoose.model('User', UserSchema);

/**
 * Méthodes du modèle User
 * 
 * Ces fonctions permettent d'interagir avec les utilisateurs dans la base de données.
 * Elles gèrent automatiquement la connexion MongoDB et formatent les données retournées.
 */
const UserModel = {
  /**
   * Trouve un utilisateur par son email
   * 
   * @param {string} email - L'email de l'utilisateur à rechercher
   * @returns {Object|null} Les données de l'utilisateur ou null si non trouvé
   */
  async findByEmail(email) {
    // S'assurer que MongoDB est connecté avant de faire la requête
    const mongoose = require('./db');
    const db = mongoose.connection;
    
    // Si pas encore connecté, attendre un peu (max 10 secondes)
    if (db.readyState !== 1) {
      await new Promise((resolve, reject) => {
        // Si déjà connecté pendant qu'on attend, résoudre immédiatement
        if (db.readyState === 1) {
          resolve();
          return;
        }
        
        // Timeout après 10 secondes
        const timeout = setTimeout(() => {
          reject(new Error('Timeout de connexion MongoDB'));
        }, 10000);
        
        // Résoudre quand la connexion est établie
        db.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        // Rejeter en cas d'erreur
        db.once('error', (erreur) => {
          clearTimeout(timeout);
          reject(erreur);
        });
      });
    }
    
    // Rechercher l'utilisateur dans la base de données
    // .lean() retourne un objet JavaScript simple au lieu d'un document Mongoose
    const utilisateurTrouve = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    
    // Si aucun utilisateur trouvé, retourner null
    if (!utilisateurTrouve) {
      return null;
    }
    
    // Retourner les données formatées (convertir _id en id)
    return {
      id: utilisateurTrouve._id.toString(),
      email: utilisateurTrouve.email,
      password_hash: utilisateurTrouve.password_hash,
      display_name: utilisateurTrouve.display_name,
      avatar_url: utilisateurTrouve.avatar_url,
      quota_limit: utilisateurTrouve.quota_limit,
      quota_used: utilisateurTrouve.quota_used,
      preferences: utilisateurTrouve.preferences,
      is_admin: utilisateurTrouve.is_admin || false,
      oauth_provider: utilisateurTrouve.oauth_provider,
      oauth_id: utilisateurTrouve.oauth_id,
      created_at: utilisateurTrouve.created_at,
      last_login_at: utilisateurTrouve.last_login_at,
    };
  },

  /**
   * Trouve un utilisateur par son ID
   * 
   * @param {string} id - L'ID MongoDB de l'utilisateur
   * @returns {Object|null} Les données de l'utilisateur ou null si non trouvé
   * @throws {Error} Si MongoDB n'est pas connecté
   */
  async findById(id) {
    // Vérifier que MongoDB est connecté
    const mongoose = require('./db');
    const db = mongoose.connection;
    
    if (db.readyState !== 1) {
      throw new Error('MongoDB n\'est pas connecté');
    }
    
    // Rechercher l'utilisateur par son ID
    const utilisateurTrouve = await User.findById(id).lean();
    
    // Si aucun utilisateur trouvé, retourner null
    if (!utilisateurTrouve) {
      return null;
    }
    
    // Retourner les données formatées
    return {
      id: utilisateurTrouve._id.toString(),
      email: utilisateurTrouve.email,
      password_hash: utilisateurTrouve.password_hash,
      display_name: utilisateurTrouve.display_name,
      avatar_url: utilisateurTrouve.avatar_url,
      quota_limit: utilisateurTrouve.quota_limit,
      quota_used: utilisateurTrouve.quota_used,
      preferences: utilisateurTrouve.preferences,
      is_admin: utilisateurTrouve.is_admin || false,
      created_at: utilisateurTrouve.created_at,
      last_login_at: utilisateurTrouve.last_login_at,
    };
  },

  /**
   * Crée un nouvel utilisateur
   * 
   * @param {Object} donneesUtilisateur - Les données du nouvel utilisateur
   * @param {string} donneesUtilisateur.email - Email de l'utilisateur
   * @param {string} donneesUtilisateur.passwordHash - Hash du mot de passe (null pour OAuth)
   * @param {string} [donneesUtilisateur.display_name] - Nom d'affichage
   * @param {string} [donneesUtilisateur.avatar_url] - URL de l'avatar
   * @param {string} [donneesUtilisateur.oauth_provider] - Provider OAuth ('google', 'github', etc.)
   * @param {string} [donneesUtilisateur.oauth_id] - ID OAuth
   * @returns {Object} Les données de l'utilisateur créé
   */
  async create({ email, passwordHash, display_name = null, avatar_url = null, oauth_provider = null, oauth_id = null }) {
    // S'assurer que MongoDB est connecté
    const mongoose = require('./db');
    const db = mongoose.connection;
    
    if (db.readyState !== 1) {
      // Attendre la connexion (max 10 secondes)
      await new Promise((resolve, reject) => {
        if (db.readyState === 1) {
          resolve();
          return;
        }
        
        const timeout = setTimeout(() => {
          reject(new Error('Timeout de connexion MongoDB'));
        }, 10000);
        
        db.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        db.once('error', (erreur) => {
          clearTimeout(timeout);
          reject(erreur);
        });
      });
    }
    
    // Créer un nouvel utilisateur avec les données fournies
    const nouvelUtilisateur = new User({ 
      email: email.toLowerCase().trim(), 
      password_hash: passwordHash, 
      display_name, 
      avatar_url,
      oauth_provider,
      oauth_id
    });
    
    // Sauvegarder dans la base de données
    const utilisateurSauvegarde = await nouvelUtilisateur.save();
    
    // Retourner les données formatées (sans le password_hash pour la sécurité)
    return {
      id: utilisateurSauvegarde._id.toString(),
      email: utilisateurSauvegarde.email,
      display_name: utilisateurSauvegarde.display_name,
      avatar_url: utilisateurSauvegarde.avatar_url,
      quota_limit: utilisateurSauvegarde.quota_limit,
      quota_used: utilisateurSauvegarde.quota_used,
      preferences: utilisateurSauvegarde.preferences,
      created_at: utilisateurSauvegarde.created_at,
    };
  },

  /**
   * Met à jour la date de dernière connexion d'un utilisateur
   * 
   * @param {string} id - L'ID de l'utilisateur
   */
  async updateLastLogin(id) {
    await User.findByIdAndUpdate(id, { 
      last_login_at: new Date() 
    });
  },

  /**
   * Met à jour l'espace utilisé par un utilisateur
   * 
   * @param {string} id - L'ID de l'utilisateur
   * @param {number} quotaUsed - Nouvelle valeur de quota utilisé (en octets)
   */
  async updateQuotaUsed(id, quotaUsed) {
    await User.findByIdAndUpdate(id, { 
      quota_used: quotaUsed 
    });
  },

  /**
   * Met à jour les préférences d'un utilisateur
   * 
   * @param {string} id - L'ID de l'utilisateur
   * @param {Object} preferences - Nouvelles préférences (thème, langue, etc.)
   */
  async updatePreferences(id, preferences) {
    await User.findByIdAndUpdate(id, { 
      preferences 
    });
  },
};

module.exports = UserModel;

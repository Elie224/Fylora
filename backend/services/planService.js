/**
 * Service de Gestion des Plans et Quotas
 * Plans: FREE, PLUS, PRO, TEAM
 * 
 * Architecture: Feature flags et quotas par plan
 */

const logger = require('../utils/logger');

/**
 * Définition des plans
 */
const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    displayName: 'Gratuit',
    storage: 20 * 1024 * 1024 * 1024, // 20 Go
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'USD'
    },
    features: {
      // Stockage
      maxFileSize: 100 * 1024 * 1024, // 100 MB par fichier
      maxFilesPerUpload: 10,
      
      // Partage
      publicSharing: true,
      maxShareLinks: 5, // Permettre 5 partages pour le plan gratuit
      sharePassword: false,
      shareExpiration: false,
      
      // Versions
      fileVersions: 1, // Pas de versions
      versionHistory: 0,
      
      // Recherche
      advancedSearch: false,
      naturalSearch: false,
      ocr: false,
      aiFeatures: false,
      
      // Collaboration
      teams: false,
      comments: false,
      annotations: false,
      activityLog: false,
      
      // Sync
      offlineSync: false,
      
      // Support
      support: 'community',
      priority: false,
      
      // Limitations
      bandwidthLimit: 10 * 1024 * 1024 * 1024, // 10 Go/mois
      coldStorageAfterDays: 90, // Cold storage après 90 jours d'inactivité
      deletionAfterMonths: 12, // Suppression après 12 mois d'inactivité
    }
  },
  
  PLUS: {
    id: 'plus',
    name: 'Plus',
    displayName: 'Plus',
    storage: 500 * 1024 * 1024 * 1024, // 500 Go
    price: {
      monthly: 4.99,
      yearly: 49,
      currency: 'USD'
    },
    features: {
      // Stockage
      maxFileSize: 1 * 1024 * 1024 * 1024, // 1 GB par fichier
      maxFilesPerUpload: 50,
      
      // Partage
      publicSharing: true,
      maxShareLinks: 10,
      sharePassword: true,
      shareExpiration: true,
      
      // Versions
      fileVersions: 10,
      versionHistory: 30, // 30 jours
      
      // Recherche
      advancedSearch: true,
      naturalSearch: false,
      ocr: false,
      aiFeatures: false,
      
      // Collaboration
      teams: false,
      comments: true,
      annotations: false,
      activityLog: true,
      
      // Sync
      offlineSync: false,
      
      // Support
      support: 'email',
      priority: false,
      
      // Limitations
      bandwidthLimit: 100 * 1024 * 1024 * 1024, // 100 Go/mois
      coldStorageAfterDays: null, // Pas de cold storage
      deletionAfterMonths: null, // Pas de suppression automatique
    }
  },
  
  PRO: {
    id: 'pro',
    name: 'Pro',
    displayName: 'Pro',
    storage: 1 * 1024 * 1024 * 1024 * 1024, // 1 To
    price: {
      monthly: 9.99,
      yearly: 99,
      currency: 'USD'
    },
    features: {
      // Stockage
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10 GB par fichier
      maxFilesPerUpload: 100,
      
      // Partage
      publicSharing: true,
      maxShareLinks: -1, // Illimité
      sharePassword: true,
      shareExpiration: true,
      
      // Versions
      fileVersions: -1, // Illimité
      versionHistory: -1, // Illimité
      
      // Recherche
      advancedSearch: true,
      naturalSearch: true,
      ocr: true,
      aiFeatures: true,
      
      // Collaboration
      teams: false,
      comments: true,
      annotations: true,
      activityLog: true,
      
      // Sync
      offlineSync: true,
      
      // Support
      support: 'priority',
      priority: true,
      
      // Limitations
      bandwidthLimit: -1, // Illimité
      coldStorageAfterDays: null,
      deletionAfterMonths: null,
    }
  },
  
  TEAM: {
    id: 'team',
    name: 'Team',
    displayName: 'Équipe',
    storage: 5 * 1024 * 1024 * 1024 * 1024, // 5 To (partagé)
    price: {
      monthly: 24.99,
      yearly: 249,
      currency: 'USD'
    },
    features: {
      // Stockage
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10 GB par fichier
      maxFilesPerUpload: 100,
      
      // Partage
      publicSharing: true,
      maxShareLinks: -1,
      sharePassword: true,
      shareExpiration: true,
      
      // Versions
      fileVersions: -1,
      versionHistory: -1,
      
      // Recherche
      advancedSearch: true,
      naturalSearch: true,
      ocr: true,
      aiFeatures: true,
      
      // Collaboration
      teams: true,
      comments: true,
      annotations: true,
      activityLog: true,
      
      // Sync
      offlineSync: true,
      
      // Support
      support: 'priority',
      priority: true,
      sla: true,
      
      // Limitations
      bandwidthLimit: -1,
      coldStorageAfterDays: null,
      deletionAfterMonths: null,
    }
  }
};

/**
 * Obtenir un plan par ID
 * @param {string} planId - ID du plan
 * @returns {Object|null} Plan ou null
 */
function getPlan(planId) {
  const plan = Object.values(PLANS).find(p => p.id === planId);
  return plan || PLANS.FREE;
}

/**
 * Obtenir tous les plans
 * @returns {Array} Liste des plans
 */
function getAllPlans() {
  return Object.values(PLANS);
}

/**
 * Vérifier si une fonctionnalité est disponible pour un plan
 * @param {string} planId - ID du plan
 * @param {string} feature - Nom de la fonctionnalité
 * @returns {boolean} true si disponible
 */
function hasFeature(planId, feature) {
  const plan = getPlan(planId);
  return plan.features[feature] === true || plan.features[feature] === -1;
}

/**
 * Obtenir la limite d'une fonctionnalité pour un plan
 * @param {string} planId - ID du plan
 * @param {string} feature - Nom de la fonctionnalité
 * @returns {number|null} Limite ou null si illimité
 */
function getFeatureLimit(planId, feature) {
  const plan = getPlan(planId);
  const limit = plan.features[feature];
  
  if (limit === -1) {
    return null; // Illimité
  }
  
  return limit;
}

/**
 * Vérifier si un utilisateur peut uploader un fichier
 * @param {string} planId - ID du plan
 * @param {number} fileSize - Taille du fichier
 * @returns {Object} { allowed: boolean, reason?: string }
 */
function canUploadFile(planId, fileSize) {
  const plan = getPlan(planId);
  const maxFileSize = plan.features.maxFileSize;
  
  if (fileSize > maxFileSize) {
    return {
      allowed: false,
      reason: `File size exceeds limit of ${formatBytes(maxFileSize)} for ${plan.displayName} plan`
    };
  }
  
  return { allowed: true };
}

/**
 * Vérifier si un utilisateur peut créer un partage public
 * @param {string} planId - ID du plan
 * @param {number} currentShareCount - Nombre actuel de partages
 * @returns {Object} { allowed: boolean, reason?: string }
 */
function canCreatePublicShare(planId, currentShareCount) {
  const plan = getPlan(planId);
  
  if (!plan.features.publicSharing) {
    return {
      allowed: false,
      reason: 'Public sharing is not available in Free plan'
    };
  }
  
  const maxShares = plan.features.maxShareLinks;
  if (maxShares !== -1 && currentShareCount >= maxShares) {
    return {
      allowed: false,
      reason: `Maximum ${maxShares} public share links allowed in ${plan.displayName} plan`
    };
  }
  
  return { allowed: true };
}

/**
 * Vérifier si un utilisateur peut utiliser OCR
 * @param {string} planId - ID du plan
 * @returns {Object} { allowed: boolean, reason?: string }
 */
function canUseOCR(planId) {
  const plan = getPlan(planId);
  
  if (!plan.features.ocr) {
    return {
      allowed: false,
      reason: 'OCR is not available in your plan. Upgrade to Pro or Team.'
    };
  }
  
  return { allowed: true };
}

/**
 * Vérifier si un utilisateur peut utiliser la recherche naturelle
 * @param {string} planId - ID du plan
 * @returns {Object} { allowed: boolean, reason?: string }
 */
function canUseNaturalSearch(planId) {
  const plan = getPlan(planId);
  
  if (!plan.features.naturalSearch) {
    return {
      allowed: false,
      reason: 'Natural search is not available in your plan. Upgrade to Pro or Team.'
    };
  }
  
  return { allowed: true };
}

/**
 * Vérifier si un utilisateur peut créer des versions
 * @param {string} planId - ID du plan
 * @param {number} currentVersionCount - Nombre actuel de versions
 * @returns {Object} { allowed: boolean, reason?: string }
 */
function canCreateVersion(planId, currentVersionCount) {
  const plan = getPlan(planId);
  const maxVersions = plan.features.fileVersions;
  
  if (maxVersions === 1) {
    return {
      allowed: false,
      reason: 'File versions are not available in Free plan'
    };
  }
  
  if (maxVersions !== -1 && currentVersionCount >= maxVersions) {
    return {
      allowed: false,
      reason: `Maximum ${maxVersions} versions allowed in ${plan.displayName} plan`
    };
  }
  
  return { allowed: true };
}

/**
 * Formater les bytes en format lisible
 * @param {number} bytes - Nombre de bytes
 * @returns {string} Format lisible
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Obtenir le quota de stockage pour un plan
 * @param {string} planId - ID du plan
 * @returns {number} Quota en bytes
 */
function getStorageQuota(planId) {
  const plan = getPlan(planId);
  return plan.storage;
}

/**
 * Obtenir le prix d'un plan
 * @param {string} planId - ID du plan
 * @param {string} period - 'monthly' ou 'yearly'
 * @returns {number} Prix
 */
function getPlanPrice(planId, period = 'monthly') {
  const plan = getPlan(planId);
  return plan.price[period];
}

/**
 * Calculer l'économie annuelle
 * @param {string} planId - ID du plan
 * @returns {number} Économie en pourcentage
 */
function getYearlySavings(planId) {
  const plan = getPlan(planId);
  const monthly = plan.price.monthly;
  const yearly = plan.price.yearly;
  
  if (monthly === 0) return 0;
  
  const monthlyYearly = monthly * 12;
  const savings = ((monthlyYearly - yearly) / monthlyYearly) * 100;
  
  return Math.round(savings);
}

module.exports = {
  PLANS,
  getPlan,
  getAllPlans,
  hasFeature,
  getFeatureLimit,
  canUploadFile,
  canCreatePublicShare,
  canUseOCR,
  canUseNaturalSearch,
  canCreateVersion,
  getStorageQuota,
  getPlanPrice,
  getYearlySavings,
  formatBytes,
};


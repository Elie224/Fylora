/**
 * Middleware de Vérification de Plan
 * Vérifie les limitations et fonctionnalités selon le plan
 */

const planService = require('../services/planService');
const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

/**
 * Middleware pour vérifier la taille maximale de fichier
 */
function checkFileSizeLimit(req, res, next) {
  const planId = req.user?.plan || 'free';
  const fileSize = req.body.fileSize || req.file?.size || 0;
  
  const check = planService.canUploadFile(planId, fileSize);
  
  if (!check.allowed) {
    return errorResponse(res, check.reason, 413);
  }
  
  next();
}

/**
 * Middleware pour vérifier le partage public
 */
function checkPublicSharing(req, res, next) {
  const planId = req.user?.plan || 'free';
  
  // TODO: Récupérer le nombre actuel de partages
  const currentShareCount = 0;
  
  const check = planService.canCreatePublicShare(planId, currentShareCount);
  
  if (!check.allowed) {
    return errorResponse(res, check.reason, 403);
  }
  
  next();
}

/**
 * Middleware pour vérifier l'utilisation d'OCR
 */
function checkOCR(req, res, next) {
  const planId = req.user?.plan || 'free';
  
  const check = planService.canUseOCR(planId);
  
  if (!check.allowed) {
    return errorResponse(res, check.reason, 403);
  }
  
  next();
}

/**
 * Middleware pour vérifier la recherche naturelle
 */
function checkNaturalSearch(req, res, next) {
  const planId = req.user?.plan || 'free';
  
  const check = planService.canUseNaturalSearch(planId);
  
  if (!check.allowed) {
    return errorResponse(res, check.reason, 403);
  }
  
  next();
}

/**
 * Middleware pour vérifier la création de versions
 */
function checkFileVersions(req, res, next) {
  const planId = req.user?.plan || 'free';
  
  // TODO: Récupérer le nombre actuel de versions
  const currentVersionCount = 0;
  
  const check = planService.canCreateVersion(planId, currentVersionCount);
  
  if (!check.allowed) {
    return errorResponse(res, check.reason, 403);
  }
  
  next();
}

/**
 * Middleware pour ajouter les infos du plan à la requête
 */
function attachPlanInfo(req, res, next) {
  const planId = req.user?.plan || 'free';
  const plan = planService.getPlan(planId);
  
  req.userPlan = plan;
  req.planId = planId;
  
  next();
}

module.exports = {
  checkFileSizeLimit,
  checkPublicSharing,
  checkOCR,
  checkNaturalSearch,
  checkFileVersions,
  attachPlanInfo,
};


/**
 * Utilitaires pour le formatage de dates
 * Fonction réutilisable pour formater les dates de manière cohérente dans toute l'application
 */

/**
 * Formate une date de manière sûre avec gestion des erreurs
 * @param {string|Date} dateString - La date à formater (string ISO ou objet Date)
 * @param {string} language - Langue pour le formatage ('fr' ou 'en', par défaut 'fr')
 * @param {Object} options - Options de formatage supplémentaires
 * @returns {string} Date formatée ou '-' si invalide
 */
export function formatDate(dateString, language = 'fr', options = {}) {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '-';
    }

    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    
    // Options par défaut
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };

    return date.toLocaleString(locale, defaultOptions);
  } catch (err) {
    console.error('Error formatting date:', err, dateString);
    return '-';
  }
}

/**
 * Formate une date courte (jour/mois/année seulement)
 * @param {string|Date} dateString - La date à formater
 * @param {string} language - Langue pour le formatage
 * @returns {string} Date formatée ou '-'
 */
export function formatDateShort(dateString, language = 'fr') {
  return formatDate(dateString, language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: undefined,
    minute: undefined
  });
}

/**
 * Formate une date complète avec secondes
 * @param {string|Date} dateString - La date à formater
 * @param {string} language - Langue pour le formatage
 * @returns {string} Date formatée ou '-'
 */
export function formatDateTime(dateString, language = 'fr') {
  return formatDate(dateString, language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Formate une date relative (il y a X minutes/heures/jours)
 * @param {string|Date} dateString - La date à formater
 * @param {string} language - Langue pour le formatage
 * @returns {string} Date relative ou date formatée si trop ancienne
 */
export function formatDateRelative(dateString, language = 'fr') {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return language === 'en' ? 'Just now' : 'À l\'instant';
    } else if (diffMinutes < 60) {
      return language === 'en' 
        ? `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
        : `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return language === 'en'
        ? `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        : `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return language === 'en'
        ? `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
        : `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      // Si plus d'une semaine, retourner la date formatée
      return formatDateShort(dateString, language);
    }
  } catch (err) {
    console.error('Error formatting relative date:', err);
    return '-';
  }
}

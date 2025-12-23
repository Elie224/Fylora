/**
 * Utilitaires de sécurité pour le frontend
 */

/**
 * Sanitize une chaîne de caractères pour prévenir XSS
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Valider un email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valider un mot de passe fort
 */
export function isValidPassword(password) {
  // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Échapper les caractères HTML
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Valider et nettoyer un nom de fichier
 */
export function sanitizeFileName(fileName) {
  // Supprimer les caractères dangereux
  return fileName
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\./g, '')
    .trim()
    .substring(0, 255); // Limiter la longueur
}

/**
 * Générer un token CSRF
 */
export function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Stocker un token de manière sécurisée
 */
export function setSecureToken(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error('Failed to store token:', e);
  }
}

/**
 * Récupérer un token de manière sécurisée
 */
export function getSecureToken(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('Failed to retrieve token:', e);
    return null;
  }
}

/**
 * Supprimer un token de manière sécurisée
 */
export function removeSecureToken(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to remove token:', e);
  }
}






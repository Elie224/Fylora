/**
 * Gestionnaire de raccourcis clavier global
 */

const shortcuts = new Map();
let isEnabled = true;

/**
 * Enregistrer un raccourci clavier
 * @param {string} key - Touche (ex: 'ctrl+s', 'cmd+n')
 * @param {Function} callback - Fonction à appeler
 * @param {string} description - Description du raccourci
 * @returns {Function} Fonction pour désenregistrer
 */
export function registerShortcut(key, callback, description = '') {
  const normalizedKey = normalizeKey(key);
  
  if (shortcuts.has(normalizedKey)) {
    console.warn(`Shortcut ${key} already registered, replacing...`);
  }
  
  shortcuts.set(normalizedKey, { callback, description, originalKey: key });
  
  // Retourner une fonction pour désenregistrer
  return () => {
    shortcuts.delete(normalizedKey);
  };
}

/**
 * Normaliser la touche (ctrl/cmd -> meta)
 */
function normalizeKey(key) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return key
    .toLowerCase()
    .replace(isMac ? /ctrl/g : /cmd/g, isMac ? 'meta' : 'ctrl')
    .replace(/\s+/g, '')
    .split('+')
    .sort()
    .join('+');
}

/**
 * Gérer les événements clavier
 */
function handleKeyDown(event) {
  if (!isEnabled) return;
  
  // Ignorer si on est dans un input/textarea
  const target = event.target;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    // Permettre certains raccourcis même dans les inputs
    const allowedInInputs = ['ctrl+s', 'cmd+s', 'ctrl+n', 'cmd+n', 'escape'];
    const key = getKeyString(event);
    if (!allowedInInputs.includes(key.toLowerCase())) {
      return;
    }
  }

  const key = getKeyString(event);
  const normalizedKey = normalizeKey(key);
  
  const shortcut = shortcuts.get(normalizedKey);
  if (shortcut) {
    event.preventDefault();
    event.stopPropagation();
    shortcut.callback(event);
  }
}

/**
 * Obtenir la représentation string d'une combinaison de touches
 */
function getKeyString(event) {
  const parts = [];
  
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('cmd');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  
  // Touche principale
  if (event.key && event.key.length === 1) {
    parts.push(event.key.toLowerCase());
  } else if (event.key) {
    parts.push(event.key.toLowerCase());
  }
  
  return parts.join('+');
}

/**
 * Activer/désactiver les raccourcis
 */
export function setShortcutsEnabled(enabled) {
  isEnabled = enabled;
}

/**
 * Obtenir tous les raccourcis enregistrés
 */
export function getAllShortcuts() {
  return Array.from(shortcuts.entries()).map(([key, data]) => ({
    key: data.originalKey,
    normalizedKey: key,
    description: data.description,
  }));
}

/**
 * Initialiser le gestionnaire de raccourcis
 */
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    shortcuts.clear();
  };
}

/**
 * Raccourcis prédéfinis communs
 */
export const CommonShortcuts = {
  SAVE: 'ctrl+s',
  NEW: 'ctrl+n',
  SEARCH: 'ctrl+f',
  ESCAPE: 'escape',
  DELETE: 'delete',
  RENAME: 'f2',
  REFRESH: 'f5',
  HELP: 'f1',
};


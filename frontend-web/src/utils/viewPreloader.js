/**
 * Préchargement intelligent des vues clés
 * Précharge les composants probables avant navigation
 */
import { prefetchManager } from './prefetch';

class ViewPreloader {
  constructor() {
    this.preloadedViews = new Set();
    this.preloadQueue = [];
  }

  /**
   * Précharger une vue
   */
  async preloadView(viewName, preloadFn) {
    if (this.preloadedViews.has(viewName)) {
      return;
    }

    try {
      await preloadFn();
      this.preloadedViews.add(viewName);
    } catch (error) {
      console.warn(`Failed to preload view ${viewName}:`, error);
    }
  }

  /**
   * Précharger les vues probables après connexion
   */
  preloadKeyViews(userId) {
    // Précharger le dashboard
    // Note: apiClient a déjà baseURL avec /api, donc on utilise juste le chemin sans /api
    this.preloadView('dashboard', () => {
      return prefetchManager.prefetch('/dashboard', `dashboard:${userId}`);
    });

    // Précharger les fichiers récents
    this.preloadView('recentFiles', () => {
      return prefetchManager.prefetch('/files?limit=10', `recent:${userId}`);
    });
  }

  /**
   * Précharger au hover d'un lien
   */
  preloadOnHover(element, viewName, preloadFn) {
    let timeout;
    
    element.addEventListener('mouseenter', () => {
      timeout = setTimeout(() => {
        this.preloadView(viewName, preloadFn);
      }, 100); // Précharger après 100ms de hover
    });

    element.addEventListener('mouseleave', () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    });
  }
}

export const viewPreloader = new ViewPreloader();


/**
 * Préchargement intelligent de données
 * Précharge les données probables avant qu'elles ne soient nécessaires
 */
import apiClient from '../services/api';

class PrefetchManager {
  constructor() {
    this.prefetchCache = new Map();
    this.prefetchQueue = [];
  }

  /**
   * Précharger les données d'un utilisateur
   */
  async prefetchUserData(userId) {
    // Précharger en parallèle
    // Note: apiClient a déjà baseURL avec /api, donc on utilise juste le chemin sans /api
    const [dashboard, recentFiles] = await Promise.all([
      this.prefetch('/dashboard', `dashboard:${userId}`),
      this.prefetch('/files?limit=10', `recent:${userId}`),
    ]);

    return { dashboard, recentFiles };
  }

  /**
   * Précharger une route
   */
  async prefetch(url, cacheKey) {
    // Vérifier le cache
    if (this.prefetchCache.has(cacheKey)) {
      return this.prefetchCache.get(cacheKey);
    }

    try {
      const response = await apiClient.get(url);
      this.prefetchCache.set(cacheKey, response.data);
      
      // Expirer après 5 minutes
      setTimeout(() => {
        this.prefetchCache.delete(cacheKey);
      }, 5 * 60 * 1000);

      return response.data;
    } catch (error) {
      console.warn('Prefetch failed:', url, error);
      return null;
    }
  }

  /**
   * Précharger les données d'un dossier
   */
  async prefetchFolder(folderId, userId) {
    const cacheKey = `folder:${folderId}:${userId}`;
    return await this.prefetch(`/files?folder_id=${folderId}`, cacheKey);
  }

  /**
   * Précharger les données d'un fichier
   */
  async prefetchFile(fileId) {
    const cacheKey = `file:${fileId}`;
    return await this.prefetch(`/files/${fileId}`, cacheKey);
  }

  /**
   * Précharger les données probables basées sur la navigation
   */
  async prefetchOnHover(element, prefetchFn) {
    // Précharger quand l'utilisateur survole un élément
    element.addEventListener('mouseenter', () => {
      prefetchFn();
    }, { once: true });
  }
}

export const prefetchManager = new PrefetchManager();

// Hook React pour préchargement
export function usePrefetch(url, cacheKey, enabled = true) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !url) return;

    setLoading(true);
    prefetchManager.prefetch(url, cacheKey).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [url, cacheKey, enabled]);

  return { data, loading };
}


/**
 * Offline-first léger
 * Cache les données localement et synchronise quand online
 */
class OfflineFirst {
  constructor() {
    this.cache = new Map();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    
    // Écouter les changements de connexion
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Obtenir des données (cache d'abord, puis API)
   */
  async get(key, fetchFn) {
    // Vérifier le cache d'abord
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
      return cached.data;
    }

    // Si online, récupérer depuis API
    if (this.isOnline) {
      try {
        const data = await fetchFn();
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
        });
        return data;
      } catch (error) {
        // En cas d'erreur, retourner le cache si disponible
        if (cached) {
          return cached.data;
        }
        throw error;
      }
    }

    // Si offline, retourner le cache
    if (cached) {
      return cached.data;
    }

    throw new Error('No cached data available and offline');
  }

  /**
   * Mettre à jour avec queue de synchronisation
   */
  async update(key, updateFn, data) {
    // Mettre à jour le cache immédiatement
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Si online, synchroniser immédiatement
    if (this.isOnline) {
      try {
        await updateFn(data);
      } catch (error) {
        // En cas d'erreur, ajouter à la queue
        this.syncQueue.push({ key, updateFn, data });
        throw error;
      }
    } else {
      // Si offline, ajouter à la queue
      this.syncQueue.push({ key, updateFn, data });
    }
  }

  /**
   * Synchroniser la queue
   */
  async sync() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queue) {
      try {
        await item.updateFn(item.data);
      } catch (error) {
        // En cas d'erreur, remettre dans la queue
        this.syncQueue.push(item);
      }
    }
  }

  /**
   * Vider le cache
   */
  clear() {
    this.cache.clear();
  }
}

export const offlineFirst = new OfflineFirst();



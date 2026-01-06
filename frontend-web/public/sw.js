/**
 * Service Worker pour Mode Offline (PWA)
 */

const CACHE_NAME = 'fylora-v1';
const STATIC_CACHE = 'fylora-static-v1';
const DYNAMIC_CACHE = 'fylora-dynamic-v1';

// Fichiers à mettre en cache au démarrage
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
];

// Installer le Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static files');
      // Gérer les erreurs individuellement pour éviter qu'une seule erreur bloque tout
      return Promise.allSettled(
        STATIC_FILES.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[Service Worker] Failed to cache ${url}:`, err);
            return null; // Continuer même si un fichier échoue
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activer le Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Intercepter les requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Stratégie: Cache First pour les assets statiques
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((response) => {
          // Mettre en cache si succès
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Stratégie: Network First pour les API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache les réponses réussies
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Si réseau échoue, utiliser le cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Retourner une réponse par défaut pour les API
            return new Response(
              JSON.stringify({ error: { message: 'Offline - No cached data' } }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }
            );
          });
        })
    );
    return;
  }

  // Stratégie: Network First pour les pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});

// Synchronisation en arrière-plan (quand connexion rétablie)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-files') {
    event.waitUntil(syncFiles());
  }
});

async function syncFiles() {
  // Récupérer les fichiers en attente de synchronisation
  // (à implémenter avec IndexedDB)
  console.log('[Service Worker] Syncing files...');
}


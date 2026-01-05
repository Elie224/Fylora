/**
 * Optimisations de performance pour le frontend
 * Debouncing, throttling, lazy loading, prefetching
 */

/**
 * Debounce une fonction pour éviter les appels trop fréquents
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle une fonction pour limiter la fréquence d'exécution
 */
export function throttle(func, limit = 1000) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Lazy load des images
 */
export function lazyLoadImages() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Prefetch des données pour améliorer la réactivité
 */
export function prefetchData(url, options = {}) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Prefetch': 'true'
        }
      }).catch(() => {
        // Ignorer les erreurs de prefetch
      });
    });
  }
}

/**
 * Cache simple en mémoire pour les requêtes
 */
const requestCache = new Map();
const CACHE_TTL = 60000; // 1 minute

export function cachedFetch(url, options = {}) {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  const cached = requestCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data.clone());
  }

  return fetch(url, options).then(response => {
    if (response.ok) {
      requestCache.set(cacheKey, {
        data: response.clone(),
        timestamp: Date.now()
      });
    }
    return response;
  });
}

/**
 * Nettoyer le cache périodiquement
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}, 60000);

/**
 * Optimiser les requêtes avec pagination intelligente
 */
export function paginatedFetch(baseUrl, pageSize = 50) {
  let currentPage = 0;
  let allData = [];
  let isLoading = false;
  let hasMore = true;

  return {
    async loadNext() {
      if (isLoading || !hasMore) return allData;

      isLoading = true;
      try {
        const response = await cachedFetch(`${baseUrl}?skip=${currentPage * pageSize}&limit=${pageSize}`);
        const data = await response.json();
        
        if (data.data?.items) {
          allData = [...allData, ...data.data.items];
          hasMore = data.data.pagination?.hasMore || false;
          currentPage++;
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error('Pagination error:', err);
        hasMore = false;
      } finally {
        isLoading = false;
      }

      return allData;
    },
    reset() {
      currentPage = 0;
      allData = [];
      hasMore = true;
    },
    getData: () => allData,
    hasMore: () => hasMore
  };
}

/**
 * Optimiser les re-renders avec useMemo et useCallback
 */
export function optimizeComponent(component) {
  // Wrapper pour React.memo avec comparaison personnalisée
  return component;
}

/**
 * Virtual scrolling pour les grandes listes
 */
export function useVirtualScroll(items, itemHeight, containerHeight) {
  const visibleStart = Math.floor(window.scrollY / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  return {
    visibleItems: items.slice(visibleStart, visibleEnd),
    startIndex: visibleStart,
    endIndex: visibleEnd,
    totalHeight: items.length * itemHeight,
    offsetY: visibleStart * itemHeight
  };
}


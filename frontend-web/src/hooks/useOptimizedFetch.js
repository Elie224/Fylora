/**
 * Hook personnalisé pour optimiser les requêtes API
 * Avec caching, retry logic et debouncing
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour les requêtes optimisées avec cache
 */
export function useOptimizedFetch(fetchFunction, dependencies = [], options = {}) {
  const {
    cacheKey = null,
    cacheTTL = 5 * 60 * 1000, // 5 minutes par défaut
    retryCount = 3,
    retryDelay = 1000,
    enabled = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async (isRetry = false) => {
    // Vérifier le cache
    if (cacheKey && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        setData(cached.data);
        setError(null);
        return;
      }
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    let attempts = 0;
    while (attempts < retryCount) {
      try {
        const result = await fetchFunction({ signal: abortControllerRef.current.signal });
        
        // Mettre en cache si une clé est fournie
        if (cacheKey) {
          cacheRef.current.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }

        setData(result);
        setError(null);
        setLoading(false);
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // Requête annulée
        }

        attempts++;
        if (attempts >= retryCount) {
          setError(err);
          setLoading(false);
          return;
        }

        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
      }
    }
  }, [fetchFunction, cacheKey, cacheTTL, retryCount, retryDelay]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, ...dependencies]);

  const invalidateCache = useCallback(() => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
  }, [cacheKey]);

  const refetch = useCallback(() => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
    fetchData();
  }, [fetchData, cacheKey]);

  return { data, loading, error, refetch, invalidateCache };
}

/**
 * Hook pour les requêtes avec debouncing
 */
export function useDebouncedFetch(fetchFunction, delay = 300) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const debouncedFetch = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFunction(...args);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [fetchFunction, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { data, loading, error, fetch: debouncedFetch };
}






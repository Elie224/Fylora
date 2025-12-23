/**
 * Optimisations React pour performance
 * Mémoisation, suppression re-renders, etc.
 */
import React from 'react';

/**
 * Hook pour mémoiser les résultats coûteux
 */
export function useMemoizedValue(fn, deps) {
  return React.useMemo(fn, deps);
}

/**
 * Hook pour éviter les re-renders inutiles
 */
export function useStableCallback(callback, deps) {
  return React.useCallback(callback, deps);
}

/**
 * HOC pour mémoiser un composant
 */
export function memoizeComponent(Component, areEqual = null) {
  return React.memo(Component, areEqual);
}

/**
 * Hook pour debounce
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour throttle
 */
export function useThrottle(value, limit) {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Hook pour lazy load avec intersection observer
 */
export function useLazyLoad(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Hook pour précharger des ressources
 */
export function usePreload(src, as = 'image') {
  React.useEffect(() => {
    if (!src) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = as;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [src, as]);
}

/**
 * Hook pour mesurer les performances d'un composant
 */
export function useComponentPerformance(componentName) {
  React.useEffect(() => {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      if (duration > 16) { // Plus d'une frame (16ms)
        console.warn(`Component ${componentName} took ${duration.toFixed(2)}ms to render`);
      }
    };
  });
}



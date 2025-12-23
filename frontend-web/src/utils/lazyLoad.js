/**
 * Utilitaires pour le lazy loading et code splitting
 */
import React, { lazy } from 'react';

// Lazy load des pages principales
export const LazyDashboard = lazy(() => import('../pages/Dashboard'));
export const LazyFiles = lazy(() => import('../pages/Files'));
export const LazyPreview = lazy(() => import('../pages/Preview'));
export const LazyNotes = lazy(() => import('../pages/Notes'));
export const LazySettings = lazy(() => import('../pages/Settings'));

// Composant de suspense avec fallback
export function withSuspense(Component, Fallback = null) {
  return function SuspenseWrapper(props) {
    return (
      <React.Suspense fallback={Fallback || <div>Chargement...</div>}>
        <Component {...props} />
      </React.Suspense>
    );
  };
}

// Hook pour le lazy loading d'images
export function useLazyImage(src) {
  const [imageSrc, setImageSrc] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
    };
  }, [src]);

  return { imageSrc, isLoading, error };
}

// Intersection Observer pour le lazy loading
export function useIntersectionObserver(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      ...options,
    });

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, options]);

  return isIntersecting;
}


/**
 * Hook React pour gérer le responsive de manière centralisée
 * Fournit des breakpoints et utilitaires pour le design responsive
 */

import { useState, useEffect } from 'react';

// Breakpoints standards
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

/**
 * Hook useResponsive
 * Retourne les informations sur la taille de l'écran et des utilitaires
 * 
 * @returns {Object} {
 *   windowWidth: number - Largeur actuelle de la fenêtre
 *   isMobile: boolean - < 768px
 *   isTablet: boolean - 768px - 1023px
 *   isDesktop: boolean - >= 1024px
 *   isSmallMobile: boolean - < 480px
 *   breakpoint: string - 'mobile' | 'tablet' | 'desktop'
 * }
 */
export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(() => {
    // Initialiser avec la largeur actuelle (sécurisé pour SSR)
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024; // Valeur par défaut pour SSR
  });

  useEffect(() => {
    // Gérer le resize avec debounce pour performance
    let timeoutId;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 150); // Debounce de 150ms
    };

    // Vérifier que window existe (pour SSR)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      
      // Mettre à jour immédiatement si nécessaire
      if (window.innerWidth !== windowWidth) {
        setWindowWidth(window.innerWidth);
      }

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [windowWidth]);

  const isMobile = windowWidth < BREAKPOINTS.mobile;
  const isTablet = windowWidth >= BREAKPOINTS.mobile && windowWidth < BREAKPOINTS.tablet;
  const isDesktop = windowWidth >= BREAKPOINTS.tablet;
  const isSmallMobile = windowWidth < 480;

  const breakpoint = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  return {
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    breakpoint,
  };
}

/**
 * Hook useMobileOnly
 * Retourne true uniquement sur mobile (< 768px)
 */
export function useMobileOnly() {
  const { isMobile } = useResponsive();
  return isMobile;
}

/**
 * Hook useDesktopOnly
 * Retourne true uniquement sur desktop (>= 1024px)
 */
export function useDesktopOnly() {
  const { isDesktop } = useResponsive();
  return isDesktop;
}

/**
 * Utilitaires de responsive pour les styles
 */
export const responsiveUtils = {
  /**
   * Retourne un padding responsive
   * @param {Object} paddings - { mobile: string, tablet: string, desktop: string }
   * @param {string} breakpoint - 'mobile' | 'tablet' | 'desktop'
   */
  padding: (paddings, breakpoint) => {
    if (breakpoint === 'mobile') return paddings.mobile || '16px';
    if (breakpoint === 'tablet') return paddings.tablet || '20px';
    return paddings.desktop || '24px';
  },

  /**
   * Retourne une taille de police responsive
   * @param {Object} sizes - { mobile: string, tablet: string, desktop: string }
   * @param {string} breakpoint - 'mobile' | 'tablet' | 'desktop'
   */
  fontSize: (sizes, breakpoint) => {
    if (breakpoint === 'mobile') return sizes.mobile || '14px';
    if (breakpoint === 'tablet') return sizes.tablet || '15px';
    return sizes.desktop || '16px';
  },

  /**
   * Retourne un nombre de colonnes responsive pour grid
   * @param {Object} columns - { mobile: number, tablet: number, desktop: number }
   * @param {string} breakpoint - 'mobile' | 'tablet' | 'desktop'
   */
  gridColumns: (columns, breakpoint) => {
    if (breakpoint === 'mobile') return columns.mobile || 1;
    if (breakpoint === 'tablet') return columns.tablet || 2;
    return columns.desktop || 3;
  },
};

export default useResponsive;

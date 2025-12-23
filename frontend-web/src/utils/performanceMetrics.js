/**
 * Métriques de performance frontend
 * Mesure First Load, Navigation, Time to Interactive
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      firstLoad: null,
      navigation: [],
      timeToInteractive: null,
    };
    this.initialized = false;
  }

  /**
   * Initialiser le tracking
   */
  init() {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    this.initialized = true;

    // Mesurer First Load
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        this.measureFirstLoad();
      });
    }

    // Mesurer Time to Interactive (approximation)
    this.measureTimeToInteractive();

    // Tracker les navigations
    this.trackNavigations();
  }

  /**
   * Mesurer le First Load
   */
  measureFirstLoad() {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    const timing = window.performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    
    this.metrics.firstLoad = loadTime;

    // Envoyer au backend si disponible
    this.sendMetric('firstLoad', loadTime);
  }

  /**
   * Mesurer Time to Interactive (approximation)
   */
  measureTimeToInteractive() {
    if (typeof window === 'undefined') return;

    let tti = null;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          tti = entry.domInteractive - entry.fetchStart;
          this.metrics.timeToInteractive = tti;
          this.sendMetric('timeToInteractive', tti);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
    } catch (e) {
      // Fallback si PerformanceObserver non supporté
      setTimeout(() => {
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
          const tti = Date.now() - performance.timing.navigationStart;
          this.metrics.timeToInteractive = tti;
          this.sendMetric('timeToInteractive', tti);
        }
      }, 1000);
    }
  }

  /**
   * Tracker les navigations
   */
  trackNavigations() {
    if (typeof window === 'undefined') return;

    let navigationStart = Date.now();

    // Tracker les changements de route (React Router)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const trackNavigation = () => {
      const navigationTime = Date.now() - navigationStart;
      this.metrics.navigation.push(navigationTime);
      this.sendMetric('navigation', navigationTime);
      navigationStart = Date.now();
    };

    history.pushState = function(...args) {
      trackNavigation();
      return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
      trackNavigation();
      return originalReplaceState.apply(history, args);
    };
  }

  /**
   * Mesurer une navigation spécifique
   */
  measureNavigation(routeName) {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.metrics.navigation.push({ route: routeName, duration });
      this.sendMetric('navigation', duration, { route: routeName });
    };
  }

  /**
   * Envoyer une métrique au backend
   */
  async sendMetric(type, value, metadata = {}) {
    try {
      // Import dynamique pour éviter les erreurs si le module n'est pas disponible
      const { default: apiClient } = await import('../services/api');
      await apiClient.post('/kpi/frontend', {
        type,
        value,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Ignorer les erreurs silencieusement
      console.debug('Could not send frontend metric:', error);
    }
  }

  /**
   * Obtenir toutes les métriques
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgNavigation: this.metrics.navigation.length > 0
        ? this.metrics.navigation.reduce((a, b) => a + (b.duration || b), 0) / this.metrics.navigation.length
        : 0,
    };
  }
}

// Instance globale
const performanceMetrics = new PerformanceMetrics();

// Initialiser automatiquement
if (typeof window !== 'undefined') {
  performanceMetrics.init();
}

export default performanceMetrics;


// CRITIQUE: React doit être importé en premier pour que Zustand fonctionne
import React, { useEffect, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './services/authStore';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { useToast } from './components/Toast';
import './styles.css';

// Lazy loading des pages pour améliorer les performances
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const OAuthProxy = lazy(() => import('./pages/OAuthProxy'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Files = lazy(() => import('./pages/Files'));
const Settings = lazy(() => import('./pages/Settings'));
const Preview = lazy(() => import('./pages/Preview'));
const Share = lazy(() => import('./pages/Share'));
const Search = lazy(() => import('./pages/Search'));
const Trash = lazy(() => import('./pages/Trash'));
const Activity = lazy(() => import('./pages/Activity'));
const Gallery = lazy(() => import('./pages/Gallery'));
const SetAdmin = lazy(() => import('./pages/SetAdmin'));
const Admin = lazy(() => import('./pages/Admin'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Support = lazy(() => import('./pages/Support'));
const MFASettings = lazy(() => import('./pages/MFASettings'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));

// Composant de chargement
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  }}>
    <div style={{ fontSize: '16px', color: '#666' }}>Chargement...</div>
  </div>
);

// Configuration du router pour éviter les avertissements Fast Refresh
const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function App() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const initialize = useAuthStore((s) => s.initialize);
  const logout = useAuthStore((s) => s.logout);

  // Initialiser l'authentification une seule fois au montage
  useEffect(() => {
    // Initialiser de manière asynchrone pour vérifier la validité du token
    const initAuth = async () => {
      try {
        await initialize();
        
        // Précharger les vues clés après connexion (optionnel)
        if (user && accessToken) {
          try {
            const { viewPreloader } = await import('./utils/viewPreloader');
            viewPreloader.preloadKeyViews(user.id);
          } catch (e) {
            // Ignorer silencieusement
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initialize est stable avec Zustand

  // Initialiser les raccourcis clavier globaux (optionnel)
  useEffect(() => {
    const initShortcuts = async () => {
      try {
        const { initKeyboardShortcuts } = await import('./utils/keyboardShortcuts');
        const cleanup = initKeyboardShortcuts();
        return cleanup;
      } catch (e) {
        // Ignorer silencieusement
        return () => {};
      }
    };
    
    let cleanup = () => {};
    initShortcuts().then((fn) => {
      cleanup = fn;
    });
    
    return () => {
      cleanup();
    };
  }, []);

  // Gérer la déconnexion automatique depuis l'intercepteur API
  useEffect(() => {
    const handleAuthLogout = async () => {
      await logout();
      // La redirection sera gérée par ProtectedRoute
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // logout est stable avec Zustand

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <BrowserRouter future={routerFutureConfig}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
        {/* Page d'accueil - toujours accessible, redirige vers dashboard si connecté */}
        <Route path="/" element={user && accessToken ? <Navigate to="/dashboard" replace /> : <Home />} />
        {/* Pages d'authentification - redirigent vers dashboard si déjà connecté */}
        <Route path="/login" element={user && accessToken ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user && accessToken ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/support" element={<Support />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        {/* Routes de proxy pour les callbacks OAuth directs depuis les providers */}
        <Route path="/auth/callback/google" element={<OAuthProxy provider="google" />} />
        <Route path="/auth/callback/github" element={<OAuthProxy provider="github" />} />
        <Route path="/share/:token" element={<Share />} />
        <Route
          path="/dashboard"
          element={
            <Layout>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/files"
          element={
            <Layout>
              <ProtectedRoute>
                <Files />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/settings"
          element={
            <Layout>
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/mfa"
          element={
            <Layout>
              <ProtectedRoute>
                <MFASettings />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/set-admin"
          element={
            <Layout>
              <ProtectedRoute>
                <SetAdmin />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/admin"
          element={
            <Layout>
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/preview/:id"
          element={
            <Layout>
              <ProtectedRoute>
                <Preview />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/search"
          element={
            <Layout>
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/trash"
          element={
            <Layout>
              <ProtectedRoute>
                <Trash />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/activity"
          element={
            <Layout>
              <ProtectedRoute>
                <Activity />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/gallery"
          element={
            <Layout>
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            </Layout>
          }
        />
        {/* Redirection pour l'ancienne route /favorites (supprimée) */}
        <Route
          path="/favorites"
          element={<Navigate to="/files" replace />}
        />
        {/* Redirection pour l'ancienne route /notes (supprimée) */}
        <Route
          path="/notes"
          element={<Navigate to="/files" replace />}
        />
        <Route
          path="/notes/:id"
          element={<Navigate to="/files" replace />}
        />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Gestion globale des erreurs non capturées
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error, event.error?.stack);
  // Afficher l'erreur dans la console pour le débogage
  if (event.error) {
    console.error('Error details:', {
      message: event.error.message,
      stack: event.error.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (event.reason) {
    console.error('Rejection details:', {
      message: event.reason?.message,
      stack: event.reason?.stack
    });
  }
});

// Enregistrer le Service Worker pour le mode offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('⚠️ Service Worker registration failed:', error);
      });
  });
}

// Log de démarrage
console.log('🚀 Starting Fylora application...');
console.log('React version:', React.version);
console.log('Environment:', import.meta.env.MODE);

// Fonction helper pour créer des messages d'erreur sans scripts inline
function createErrorMessage(title, message) {
  const div = document.createElement('div');
  div.style.cssText = 'padding: 20px; text-align: center; font-family: Arial, sans-serif;';
  div.innerHTML = `<h1>${title}</h1><p>${message}</p>`;
  return div;
}

// Vérifier que React est chargé avant de rendre
if (!React || !ReactDOM) {
  console.error('❌ React or ReactDOM is not loaded');
  const errorDiv = createErrorMessage('Erreur de chargement', 'React n\'a pas pu être chargé. Vérifiez la console pour plus de détails.');
  document.body.appendChild(errorDiv);
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found');
    const errorDiv = createErrorMessage('Erreur de chargement', 'L\'élément root n\'a pas été trouvé.');
    document.body.appendChild(errorDiv);
  } else {
    console.log('✅ Root element found, rendering app...');
    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('✅ App rendered successfully');
    } catch (error) {
      console.error('❌ Error rendering app:', error);
      console.error('Error stack:', error.stack);
      
      // Créer l'élément d'erreur sans utiliser innerHTML avec onclick
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'padding: 20px; text-align: center; font-family: Arial, sans-serif;';
      errorDiv.innerHTML = `
        <h1 style="color: #d32f2f;">Erreur de rendu</h1>
        <p>Une erreur s'est produite lors du chargement de l'application.</p>
        <pre style="text-align: left; background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; max-width: 800px; margin: 20px auto;">${error.toString()}\n\n${error.stack || ''}</pre>
      `;
      
      // Créer le bouton avec event listener au lieu d'onclick inline
      const reloadButton = document.createElement('button');
      reloadButton.textContent = 'Recharger la page';
      reloadButton.style.cssText = 'margin-top: 20px; padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;';
      reloadButton.addEventListener('click', () => {
        window.location.reload();
      });
      
      errorDiv.appendChild(reloadButton);
      rootElement.appendChild(errorDiv);
    }
  }
}

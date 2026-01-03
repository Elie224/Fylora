import React, { useEffect, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './services/authStore';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import performanceMetrics from './utils/performanceMetrics';
import { viewPreloader } from './utils/viewPreloader';
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
const Calendar = lazy(() => import('./pages/Calendar'));
const Admin = lazy(() => import('./pages/Admin'));

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
      await initialize();
      
      // Précharger les vues clés après connexion
      if (user && accessToken) {
        viewPreloader.preloadKeyViews(user.id);
      }
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initialize est stable avec Zustand

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
          <BrowserRouter future={routerFutureConfig}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
        {/* Page d'accueil - toujours accessible, redirige vers dashboard si connecté */}
        <Route path="/" element={user && accessToken ? <Navigate to="/dashboard" replace /> : <Home />} />
        {/* Pages d'authentification - redirigent vers dashboard si déjà connecté */}
        <Route path="/login" element={user && accessToken ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user && accessToken ? <Navigate to="/dashboard" replace /> : <Signup />} />
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

// Vérifier que React est chargé avant de rendre
if (!React || !ReactDOM) {
  console.error('React or ReactDOM is not loaded');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

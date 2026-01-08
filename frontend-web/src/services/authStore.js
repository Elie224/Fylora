import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, userService } from './api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,

      // Inscription
      signup: async (email, password, firstName, lastName, phone, country) => {
        set({ loading: true, error: null });
        
        // NETTOYER COMPLÈTEMENT L'ANCIEN COMPTE AVANT L'INSCRIPTION
        // Supprimer tous les tokens et données de l'ancien utilisateur
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth-storage');
        
        // Réinitialiser complètement le state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });
        
        try {
          const response = await authService.signup(email, password, firstName, lastName, phone, country);
          const { user, access_token, refresh_token } = response.data.data;
          
          // Charger les nouvelles données utilisateur
          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            loading: false,
            error: null,
          });

          // Sauvegarder les nouveaux tokens dans localStorage
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          return { success: true };
        } catch (err) {
          console.error('Signup API error:', err.response?.data);
          let errorMessage = 'L\'inscription a échoué';
          
          if (err.response?.data?.error) {
            // Message principal
            if (err.response.data.error.message) {
              errorMessage = err.response.data.error.message;
            }
            // Détails de validation
            if (err.response.data.error.details && Array.isArray(err.response.data.error.details)) {
              const details = err.response.data.error.details.map(d => d.msg || d.message).filter(Boolean);
              if (details.length > 0) {
                errorMessage = details.join(', ');
              }
            }
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          set({ loading: false, error: errorMessage, user: null, accessToken: null, refreshToken: null });
          return { success: false, error: errorMessage };
        }
      },

      // Connexion
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await authService.login(email, password);
          const { user, access_token, refresh_token } = response.data.data;
          
          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            loading: false,
            error: null,
          });

          // Sauvegarder les tokens dans localStorage
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          return { success: true };
        } catch (err) {
          const errorMessage = err.response?.data?.error?.message || err.message || 'La connexion a échoué';
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Déconnexion
      logout: async () => {
        const { refreshToken, accessToken } = get();
        
        // Appeler l'API de déconnexion si on a un refresh token
        if (refreshToken) {
          try {
            // Utiliser accessToken pour l'authentification si disponible
            await authService.logout(refreshToken);
          } catch (err) {
            console.error('Logout API error:', err);
            // Continuer même si l'API échoue pour s'assurer que la déconnexion locale fonctionne
          }
        }

        // NETTOYER COMPLÈTEMENT LE STATE ET LE STORAGE
        // Réinitialiser le state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
          loading: false,
        });

        // Supprimer tous les tokens du localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Supprimer le storage Zustand persisté pour s'assurer qu'aucune donnée ne reste
        try {
          localStorage.removeItem('auth-storage');
          // Vider aussi sessionStorage au cas où
          sessionStorage.removeItem('auth-storage');
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
        } catch (e) {
          console.error('Error clearing storage:', e);
        }
        
        // Forcer le nettoyage du state Zustand en vidant complètement
        // Le persist middleware se réinitialisera automatiquement
      },

      // Mettre à jour les informations utilisateur
      setUser: (userData) => {
        set({ user: userData });
      },

      // Définir les tokens (pour OAuth callback)
      setTokens: async (accessToken, refreshToken) => {
        set({
          accessToken,
          refreshToken,
        });
        
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        
        // Récupérer les infos utilisateur
        try {
          const response = await userService.getMe();
          set({ user: response.data.data });
        } catch (err) {
          console.error('Failed to fetch user info after OAuth:', err);
        }
      },

      // Initialiser depuis localStorage et vérifier la validité du token
      initialize: async () => {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (accessToken && refreshToken) {
          set({ accessToken, refreshToken });
          
          // Vérifier si le token est toujours valide en récupérant les infos utilisateur
          try {
            const response = await userService.getMe();
            set({ user: response.data.data });
          } catch (err) {
            // Si l'erreur est 401, le token a expiré
            if (err.response?.status === 401) {
              // Essayer de rafraîchir le token
              try {
                const refreshResponse = await authService.refresh(refreshToken);
                const { access_token, refresh_token } = refreshResponse.data.data;
                
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', refresh_token);
                set({ accessToken: access_token, refreshToken: refresh_token });
                
                // Réessayer de récupérer les infos utilisateur
                const userResponse = await userService.getMe();
                set({ user: userResponse.data.data });
              } catch (refreshErr) {
                // Refresh échoué - nettoyer
                console.error('Token refresh failed:', refreshErr);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                set({ user: null, accessToken: null, refreshToken: null });
              }
            } else {
              // Autre erreur - nettoyer
              console.error('Failed to fetch user info:', err);
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              set({ user: null, accessToken: null, refreshToken: null });
            }
          }
        } else {
          // Pas de tokens - nettoyer le state
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export { useAuthStore };




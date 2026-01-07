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
        try {
          const response = await authService.signup(email, password, firstName, lastName, phone, country);
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
          const errorMessage = err.response?.data?.error?.message || err.message || 'L\'inscription a échoué';
          set({ loading: false, error: errorMessage });
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
        const { refreshToken } = get();
        
        // Appeler l'API de déconnexion si on a un refresh token
        if (refreshToken) {
          try {
            await authService.logout(refreshToken);
          } catch (err) {
            console.error('Logout error:', err);
          }
        }

        // Nettoyer le state et localStorage
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
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




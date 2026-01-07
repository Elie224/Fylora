// Service client pour appels API
// À utiliser dans tous les composants React

import axios from 'axios';
import { createRetryableRequest } from '../utils/smartRetry';
import { API_URL } from '../config';

// API_URL est maintenant importé depuis config.js avec la valeur par défaut pour la production

// Créer une instance axios avec configuration par défaut optimisée
const apiClientBase = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Timeout de 30 secondes pour améliorer la stabilité
});

// Appliquer smart retry avec backoff exponentiel
const apiClient = createRetryableRequest(apiClientBase, {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
});

// Instance séparée pour les uploads (sans Content-Type par défaut)
const uploadClient = axios.create({
  baseURL: `${API_URL}/api`,
});

// Intercepteur pour ajouter le JWT à chaque requête
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Ne pas logger pour éviter le spam, mais s'assurer que la requête peut continuer
    // L'intercepteur de réponse gérera l'erreur 401
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercepteur pour les uploads - ajouter le token mais laisser Content-Type géré par le navigateur
uploadClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Ne pas définir Content-Type - laisser le navigateur le faire pour FormData
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Variable pour éviter les boucles infinies de refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Intercepteur pour gérer les erreurs (notamment 401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si c'est une erreur 401 et qu'on n'a pas déjà tenté de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si on est déjà en train de rafraîchir, mettre en queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        // Pas de refresh token - nettoyer et rediriger
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Utiliser un événement personnalisé pour éviter les problèmes de navigation
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }

      try {
        // Créer une requête de refresh sans utiliser apiClient pour éviter les intercepteurs
        const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token, refresh_token } = refreshResponse.data.data;
        
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        // Mettre à jour le header de la requête originale
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        // Traiter la queue et réessayer la requête
        processQueue(null, access_token);
        isRefreshing = false;
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh échoué - nettoyer et rediriger
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Utiliser un événement personnalisé pour éviter les problèmes de navigation
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Services d'authentification
export const authService = {
  signup: (email, password) =>
    apiClient.post('/auth/signup', { email, password }),
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),
  refresh: (refreshToken) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refresh_token: refreshToken }),
};

// Services fichiers
export const fileService = {
  list: (folderId = null, additionalParams = {}) =>
    apiClient.get('/files', { 
      params: { 
        folder_id: folderId,
        ...additionalParams
      }
    }),
  upload: (file, folderId = null, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folder_id', folderId);
    
    const config = {};
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(percentCompleted);
      };
    }
    
    // Utiliser uploadClient qui n'a pas de Content-Type par défaut
    return uploadClient.post('/files/upload', formData, config);
  },
  download: (fileId) => apiClient.get(`/files/${fileId}/download`, { responseType: 'blob' }),
  delete: (fileId) => apiClient.delete(`/files/${fileId}`),
  restore: (fileId) => apiClient.post(`/files/${fileId}/restore`),
  permanentDelete: (fileId) => apiClient.delete(`/files/${fileId}/permanent`),
  listTrash: (params = {}) => apiClient.get('/files/trash', { 
    params
  }),
  rename: (fileId, newName) =>
    apiClient.patch(`/files/${fileId}`, { name: newName }),
  move: (fileId, newFolderId) =>
    apiClient.patch(`/files/${fileId}`, { folder_id: newFolderId }),
  preview: (fileId) => apiClient.get(`/files/${fileId}/preview`),
  stream: (fileId) => apiClient.get(`/files/${fileId}/stream`),
  downloadBatch: (fileIds = [], folderIds = []) =>
    apiClient.post('/files/download-batch', {
      file_ids: fileIds,
      folder_ids: folderIds,
    }, {
      responseType: 'blob',
    }),
};

// Services dossiers
export const folderService = {
  create: (name, parentId = null) =>
    apiClient.post('/folders', { name, parent_id: parentId }),
  get: (folderId) => apiClient.get(`/folders/${folderId}`),
  rename: (folderId, newName) =>
    apiClient.patch(`/folders/${folderId}`, { name: newName }),
  move: (folderId, newParentId) =>
    apiClient.patch(`/folders/${folderId}`, { parent_id: newParentId }),
  delete: (folderId) => apiClient.delete(`/folders/${folderId}`),
  restore: (folderId) => apiClient.post(`/folders/${folderId}/restore`),
  permanentDelete: (folderId) => apiClient.delete(`/folders/${folderId}/permanent`),
  listTrash: (params = {}) => apiClient.get('/folders/trash', { 
    params
  }),
  downloadAsZip: (folderId) =>
    apiClient.get(`/folders/${folderId}/download`, { responseType: 'blob' }),
  list: (parentId = null) =>
    apiClient.get('/folders', { params: { parent_id: parentId || null } }),
};

// Services partage
export const shareService = {
  generatePublicLink: (fileId, options = {}) =>
    apiClient.post('/share/public', {
      file_id: fileId,
      password: options.password,
      expires_at: options.expiresAt,
    }),
  generateFolderLink: (folderId, options = {}) =>
    apiClient.post('/share/public', {
      folder_id: folderId,
      password: options.password,
      expires_at: options.expiresAt,
    }),
  shareWithUser: (fileId, folderId, userId) =>
    apiClient.post('/share/internal', { 
      file_id: fileId || null, 
      folder_id: folderId || null,
      shared_with_user_id: userId 
    }),
  getPublicShare: (token, password = null) => {
    const params = password ? { password } : {};
    return apiClient.get(`/share/${token}`, {
      params,
      validateStatus: () => true, // Autoriser 404, etc.
    });
  },
};

// Services utilisateur
export const userService = {
  getMe: () => apiClient.get('/users/me'),
  listUsers: (search = '') =>
    apiClient.get('/users', { params: { search } }),
  updateProfile: (data) =>
    apiClient.patch('/users/me', data),
  changePassword: (currentPassword, newPassword) =>
    apiClient.patch('/users/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
  updatePreferences: (preferences) =>
    apiClient.patch('/users/me/preferences', preferences),
  getActiveSessions: () => apiClient.get('/users/me/sessions'),
  revokeSession: (sessionId) => apiClient.delete(`/users/me/sessions/${sessionId}`),
  revokeAllOtherSessions: () => apiClient.delete('/users/me/sessions'),
};

// Services dashboard
export const dashboardService = {
  getStats: () => apiClient.get('/dashboard'),
  search: (query, filters = {}) =>
    apiClient.get('/search', {
      params: { q: query, ...filters },
    }),
};

// Export des nouveaux services
export { fileVersionsService } from './fileVersionsService';
export { notificationsService } from './notificationsService';
export { activityService } from './activityService';
export { tagsService } from './tagsService';
export { twoFactorService } from './twoFactorService';
export { teamsService } from './teamsService';
export { scheduledBackupsService } from './scheduledBackupsService';
export { pluginsService } from './pluginsService';
export { offlineSyncService } from './offlineSyncService';

export { apiClient };
export default apiClient;

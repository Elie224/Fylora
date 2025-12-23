/**
 * Service pour l'authentification à deux facteurs (2FA)
 */
import apiClient from './api';

export const twoFactorService = {
  /**
   * Configurer le 2FA
   */
  async setup2FA() {
    const response = await apiClient.post('/2fa/setup');
    return response.data;
  },

  /**
   * Vérifier et activer le 2FA
   */
  async verifyAndEnable2FA(token) {
    const response = await apiClient.post('/2fa/verify', { token });
    return response.data;
  },

  /**
   * Désactiver le 2FA
   */
  async disable2FA(password, token) {
    const response = await apiClient.post('/2fa/disable', { password, token });
    return response.data;
  },

  /**
   * Obtenir le statut 2FA
   */
  async get2FAStatus() {
    const response = await apiClient.get('/2fa/status');
    return response.data;
  },

  /**
   * Régénérer les codes de secours
   */
  async regenerateBackupCodes() {
    const response = await apiClient.post('/2fa/regenerate-backup-codes');
    return response.data;
  },
};



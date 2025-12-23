/**
 * Service pour la gestion des équipes
 */
import apiClient from './api';

export const teamsService = {
  /**
   * Créer une équipe
   */
  async createTeam(data) {
    const response = await apiClient.post('/teams', data);
    return response.data;
  },

  /**
   * Lister les équipes
   */
  async listTeams() {
    const response = await apiClient.get('/teams');
    return response.data;
  },

  /**
   * Obtenir une équipe
   */
  async getTeam(teamId) {
    const response = await apiClient.get(`/teams/${teamId}`);
    return response.data;
  },

  /**
   * Inviter un membre
   */
  async inviteMember(teamId, email, role = 'member') {
    const response = await apiClient.post(`/teams/${teamId}/members`, { email, role });
    return response.data;
  },

  /**
   * Retirer un membre
   */
  async removeMember(teamId, memberId) {
    const response = await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
    return response.data;
  },

  /**
   * Mettre à jour le rôle d'un membre
   */
  async updateMemberRole(teamId, memberId, role) {
    const response = await apiClient.patch(`/teams/${teamId}/members/${memberId}/role`, { role });
    return response.data;
  },

  /**
   * Mettre à jour les paramètres de l'équipe
   */
  async updateTeamSettings(teamId, settings) {
    const response = await apiClient.patch(`/teams/${teamId}/settings`, settings);
    return response.data;
  },

  /**
   * Supprimer une équipe
   */
  async deleteTeam(teamId) {
    const response = await apiClient.delete(`/teams/${teamId}`);
    return response.data;
  },
};



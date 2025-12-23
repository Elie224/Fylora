const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Créer une équipe
router.post('/', teamsController.createTeam);

// Lister les équipes de l'utilisateur
router.get('/', teamsController.listTeams);

// Obtenir une équipe par ID
router.get('/:id', teamsController.getTeam);

// Mettre à jour les paramètres de l'équipe
router.patch('/:id/settings', teamsController.updateTeamSettings);

// Inviter un membre
router.post('/:id/members', teamsController.inviteMember);

// Retirer un membre
router.delete('/:id/members/:memberId', teamsController.removeMember);

// Mettre à jour le rôle d'un membre
router.patch('/:id/members/:memberId/role', teamsController.updateMemberRole);

// Supprimer une équipe
router.delete('/:id', teamsController.deleteTeam);

module.exports = router;



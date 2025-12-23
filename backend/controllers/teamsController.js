/**
 * Contrôleur pour la gestion des équipes/organisations
 */
const Team = require('../models/Team');
const UserModel = require('../models/userModel');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * Créer une équipe
 */
exports.createTeam = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, description, max_members, quota_limit } = req.body;

    if (!name || name.trim().length === 0) {
      return errorResponse(res, 'Team name is required', 400);
    }

    // Générer un slug unique
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    while (await Team.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const team = await Team.create({
      name: name.trim(),
      slug,
      description: description?.trim(),
      owner_id: userId,
      members: [{
        user_id: userId,
        role: 'owner',
        joined_at: new Date(),
      }],
      settings: {
        max_members: max_members || 10,
        quota_limit: quota_limit || 1099511627776,
        quota_used: 0,
      },
    });

    await logActivity(req, 'team_create', 'team', team._id, { team_name: name });

    logger.logInfo('Team created', { userId, team_id: team._id });

    return successResponse(res, { team }, 201);
  } catch (error) {
    logger.logError(error, { context: 'createTeam' });
    next(error);
  }
};

/**
 * Lister les équipes de l'utilisateur
 */
exports.listTeams = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const teams = await Team.find({
      $or: [
        { owner_id: userId },
        { 'members.user_id': userId },
      ],
      is_active: true,
    })
      .populate('owner_id', 'email display_name avatar_url')
      .populate('members.user_id', 'email display_name avatar_url')
      .lean();

    return successResponse(res, {
      teams,
      total: teams.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listTeams' });
    next(error);
  }
};

/**
 * Obtenir une équipe par ID
 */
exports.getTeam = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('owner_id', 'email display_name avatar_url')
      .populate('members.user_id', 'email display_name avatar_url');

    if (!team || !team.is_active) {
      return errorResponse(res, 'Team not found', 404);
    }

    // Vérifier les permissions
    if (!team.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, { team });
  } catch (error) {
    logger.logError(error, { context: 'getTeam' });
    next(error);
  }
};

/**
 * Inviter un utilisateur à rejoindre l'équipe
 */
exports.inviteMember = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { email, role = 'member' } = req.body;

    const team = await Team.findById(id);
    if (!team || !team.is_active) {
      return errorResponse(res, 'Team not found', 404);
    }

    // Vérifier les permissions (admin ou owner)
    if (!team.hasPermission(userId, 'admin')) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Trouver l'utilisateur par email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Vérifier si l'utilisateur est déjà membre
    const isMember = team.members.some(
      m => m.user_id.toString() === user.id
    );
    if (isMember) {
      return errorResponse(res, 'User is already a member', 400);
    }

    // Vérifier la limite de membres
    if (team.members.length >= team.settings.max_members) {
      return errorResponse(res, 'Team member limit reached', 400);
    }

    // Ajouter le membre
    team.members.push({
      user_id: user.id,
      role,
      joined_at: new Date(),
      invited_by: userId,
    });

    await team.save();

    await logActivity(req, 'team_member_invite', 'team', team._id, {
      invited_user_id: user.id,
      role,
    });

    logger.logInfo('Team member invited', { userId, team_id: id, invited_user_id: user.id });

    return successResponse(res, {
      message: 'Member invited successfully',
      team,
    });
  } catch (error) {
    logger.logError(error, { context: 'inviteMember' });
    next(error);
  }
};

/**
 * Retirer un membre de l'équipe
 */
exports.removeMember = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, memberId } = req.params;

    const team = await Team.findById(id);
    if (!team || !team.is_active) {
      return errorResponse(res, 'Team not found', 404);
    }

    // Vérifier les permissions (admin ou owner)
    if (!team.hasPermission(userId, 'admin')) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Ne pas permettre de retirer le propriétaire
    if (memberId === team.owner_id.toString()) {
      return errorResponse(res, 'Cannot remove team owner', 400);
    }

    team.members = team.members.filter(
      m => m.user_id.toString() !== memberId
    );

    await team.save();

    await logActivity(req, 'team_member_remove', 'team', team._id, {
      removed_user_id: memberId,
    });

    logger.logInfo('Team member removed', { userId, team_id: id, removed_user_id: memberId });

    return successResponse(res, {
      message: 'Member removed successfully',
      team,
    });
  } catch (error) {
    logger.logError(error, { context: 'removeMember' });
    next(error);
  }
};

/**
 * Mettre à jour le rôle d'un membre
 */
exports.updateMemberRole = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, memberId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return errorResponse(res, 'Invalid role', 400);
    }

    const team = await Team.findById(id);
    if (!team || !team.is_active) {
      return errorResponse(res, 'Team not found', 404);
    }

    // Seul le propriétaire peut changer les rôles
    if (team.owner_id.toString() !== userId.toString()) {
      return errorResponse(res, 'Only team owner can update roles', 403);
    }

    // Ne pas permettre de changer le rôle du propriétaire
    if (memberId === team.owner_id.toString()) {
      return errorResponse(res, 'Cannot change owner role', 400);
    }

    const member = team.members.find(m => m.user_id.toString() === memberId);
    if (!member) {
      return errorResponse(res, 'Member not found', 404);
    }

    member.role = role;
    await team.save();

    await logActivity(req, 'team_member_role_update', 'team', team._id, {
      member_id: memberId,
      new_role: role,
    });

    logger.logInfo('Team member role updated', { userId, team_id: id, member_id: memberId, role });

    return successResponse(res, {
      message: 'Member role updated successfully',
      team,
    });
  } catch (error) {
    logger.logError(error, { context: 'updateMemberRole' });
    next(error);
  }
};

/**
 * Mettre à jour les paramètres de l'équipe
 */
exports.updateTeamSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, max_members, quota_limit, allow_public_sharing } = req.body;

    const team = await Team.findById(id);
    if (!team || !team.is_active) {
      return errorResponse(res, 'Team not found', 404);
    }

    // Seul le propriétaire peut modifier les paramètres
    if (team.owner_id.toString() !== userId.toString()) {
      return errorResponse(res, 'Only team owner can update settings', 403);
    }

    if (name) team.name = name.trim();
    if (description !== undefined) team.description = description?.trim();
    if (max_members) team.settings.max_members = max_members;
    if (quota_limit) team.settings.quota_limit = quota_limit;
    if (allow_public_sharing !== undefined) {
      team.settings.allow_public_sharing = allow_public_sharing;
    }

    await team.save();

    await logActivity(req, 'team_settings_update', 'team', team._id);

    logger.logInfo('Team settings updated', { userId, team_id: id });

    return successResponse(res, {
      message: 'Team settings updated successfully',
      team,
    });
  } catch (error) {
    logger.logError(error, { context: 'updateTeamSettings' });
    next(error);
  }
};

/**
 * Supprimer une équipe
 */
exports.deleteTeam = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return errorResponse(res, 'Team not found', 404);
    }

    // Seul le propriétaire peut supprimer l'équipe
    if (team.owner_id.toString() !== userId.toString()) {
      return errorResponse(res, 'Only team owner can delete team', 403);
    }

    team.is_active = false;
    await team.save();

    await logActivity(req, 'team_delete', 'team', team._id);

    logger.logInfo('Team deleted', { userId, team_id: id });

    return successResponse(res, { message: 'Team deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'deleteTeam' });
    next(error);
  }
};



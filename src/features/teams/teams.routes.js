'use strict';

const Joi = require('joi');
const { teamDataStore } = require('./teams.data');
const { createTeamSchema, updateTeamSchema, teamMemberSchema, sanitizeTeam } = require('./teams.model');
const { userDataStore } = require('../users/users.data');

// Helper to get user ID from request (assumes authentication)
const getUserId = (request) => {
  return request.auth?.credentials?.id;
};

// Route handlers
const getAllTeams = (request, h) => {
  try {
    const allTeams = teamDataStore.getAllTeams();
    return allTeams.map(team => sanitizeTeam(team));
  } catch (error) {
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const getTeamById = async (request, h) => {
  try {
    const { id } = request.params;
    const team = teamDataStore.getTeamById(id);
    
    if (!team) {
      return h.response({ error: 'Team not found' }).code(404);
    }
    
    // Get team members with user details
    const members = teamDataStore.getTeamMembers(id);
    const membersWithDetails = [];
    
    for (const member of members) {
      const user = userDataStore.getUserById(member.userId);
      if (user) {
        membersWithDetails.push({
          ...member.toObject(),
          user: {
            id: user.id,
            username: user.username,
            name: user.name
          }
        });
      }
    }
    
    return {
      ...sanitizeTeam(team),
      members: membersWithDetails,
      memberCount: teamDataStore.getTeamMemberCount(id)
    };
  } catch (error) {
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const getUserTeams = async (request, h) => {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return h.response({ error: 'Authentication required' }).code(401);
    }
    
    const userTeams = teamDataStore.getUserTeams(userId);
    return userTeams.map(team => sanitizeTeam(team));
  } catch (error) {
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const createTeam = async (request, h) => {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return h.response({ error: 'Authentication required' }).code(401);
    }
    
    const teamData = request.payload;
    const team = await teamDataStore.createTeam(teamData, userId);
    
    return h.response(sanitizeTeam(team)).code(201);
  } catch (error) {
    return h.response({ error: error.message || 'Internal server error' }).code(500);
  }
};

const updateTeam = async (request, h) => {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return h.response({ error: 'Authentication required' }).code(401);
    }
    
    const { id } = request.params;
    const updateData = request.payload;
    
    const team = await teamDataStore.updateTeam(id, updateData, userId);
    return sanitizeTeam(team);
  } catch (error) {
    if (error.message === 'Team not found') {
      return h.response({ error: error.message }).code(404);
    }
    if (error.message.includes('Insufficient permissions')) {
      return h.response({ error: error.message }).code(403);
    }
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const deleteTeam = async (request, h) => {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return h.response({ error: 'Authentication required' }).code(401);
    }
    
    const { id } = request.params;
    
    await teamDataStore.deleteTeam(id, userId);
    return h.response({ message: 'Team deleted successfully' }).code(200);
  } catch (error) {
    if (error.message === 'Team not found') {
      return h.response({ error: error.message }).code(404);
    }
    if (error.message.includes('Only team owner')) {
      return h.response({ error: error.message }).code(403);
    }
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const addTeamMember = async (request, h) => {
  try {
    const requestUserId = getUserId(request);
    if (!requestUserId) {
      return h.response({ error: 'Authentication required' }).code(401);
    }
    
    const { id: teamId } = request.params;
    const { userId, role } = request.payload;
    
    // Check if target user exists
    const targetUser = userDataStore.getUserById(userId);
    if (!targetUser) {
      return h.response({ error: 'User not found' }).code(404);
    }
    
    // Check if requester has permission to add members
    const requestUserRole = teamDataStore.getMemberRole(teamId, requestUserId);
    if (!requestUserRole || (requestUserRole !== 'owner' && requestUserRole !== 'admin')) {
      return h.response({ error: 'Insufficient permissions to add members' }).code(403);
    }
    
    const teamMember = await teamDataStore.addTeamMember(teamId, userId, role);
    return h.response(teamMember.toObject()).code(201);
  } catch (error) {
    if (error.message === 'Team not found') {
      return h.response({ error: error.message }).code(404);
    }
    if (error.message.includes('already a member') || error.message.includes('maximum member capacity')) {
      return h.response({ error: error.message }).code(409);
    }
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const removeTeamMember = async (request, h) => {
  try {
    const requestUserId = getUserId(request);
    if (!requestUserId) {
      return h.response({ error: 'Authentication required' }).code(401);
    }
    
    const { id: teamId, userId } = request.params;
    
    // Check if requester has permission (owner, admin, or removing themselves)
    const requestUserRole = teamDataStore.getMemberRole(teamId, requestUserId);
    const isRemovingSelf = requestUserId === userId;
    
    if (!requestUserRole || (!isRemovingSelf && requestUserRole !== 'owner' && requestUserRole !== 'admin')) {
      return h.response({ error: 'Insufficient permissions to remove member' }).code(403);
    }
    
    teamDataStore.removeTeamMember(teamId, userId);
    return h.response({ message: 'Member removed successfully' }).code(200);
  } catch (error) {
    if (error.message.includes('not a member') || error.message.includes('Team owner cannot leave')) {
      return h.response({ error: error.message }).code(400);
    }
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const updateMemberRole = async (request, h) => {
  try {
    const requestUserId = getUserId(request);
    if (!requestUserId) {
      return h.response({ error: 'Authentication required' }).code(401);
    }
    
    const { id: teamId, userId } = request.params;
    const { role } = request.payload;
    
    const teamMember = teamDataStore.updateMemberRole(teamId, userId, role, requestUserId);
    return teamMember.toObject();
  } catch (error) {
    if (error.message === 'Team not found') {
      return h.response({ error: error.message }).code(404);
    }
    if (error.message.includes('not a member')) {
      return h.response({ error: error.message }).code(404);
    }
    if (error.message.includes('Insufficient permissions') || error.message.includes('Cannot change your own')) {
      return h.response({ error: error.message }).code(403);
    }
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

// Route definitions
const routes = [
  // Team CRUD operations
  {
    method: 'GET',
    path: '/teams',
    handler: getAllTeams,
    options: {
      description: 'Get all teams',
      tags: ['api', 'teams']
    }
  },
  {
    method: 'GET',
    path: '/teams/{id}',
    handler: getTeamById,
    options: {
      description: 'Get team by ID with members',
      tags: ['api', 'teams']
    }
  },
  {
    method: 'GET',
    path: '/my-teams',
    handler: getUserTeams,
    options: {
      description: 'Get current user\'s teams',
      tags: ['api', 'teams'],
      auth: 'jwt'
    }
  },
  {
    method: 'POST',
    path: '/teams',
    handler: createTeam,
    options: {
      description: 'Create a new team',
      tags: ['api', 'teams'],
      auth: 'jwt',
      validate: {
        payload: createTeamSchema
      }
    }
  },
  {
    method: 'PUT',
    path: '/teams/{id}',
    handler: updateTeam,
    options: {
      description: 'Update an existing team',
      tags: ['api', 'teams'],
      auth: 'jwt',
      validate: {
        payload: updateTeamSchema
      }
    }
  },
  {
    method: 'DELETE',
    path: '/teams/{id}',
    handler: deleteTeam,
    options: {
      description: 'Delete a team (owner only)',
      tags: ['api', 'teams'],
      auth: 'jwt'
    }
  },
  
  // Team membership operations
  {
    method: 'POST',
    path: '/teams/{id}/members',
    handler: addTeamMember,
    options: {
      description: 'Add a member to the team',
      tags: ['api', 'teams', 'membership'],
      auth: 'jwt',
      validate: {
        payload: teamMemberSchema
      }
    }
  },
  {
    method: 'DELETE',
    path: '/teams/{id}/members/{userId}',
    handler: removeTeamMember,
    options: {
      description: 'Remove a member from the team',
      tags: ['api', 'teams', 'membership'],
      auth: 'jwt'
    }
  },
  {
    method: 'PUT',
    path: '/teams/{id}/members/{userId}/role',
    handler: updateMemberRole,
    options: {
      description: 'Update a member\'s role in the team',
      tags: ['api', 'teams', 'membership'],
      auth: 'jwt',
      validate: {
        payload: Joi.object({
          role: Joi.string().valid('owner', 'admin', 'member').required()
        })
      }
    }
  }
];

module.exports = {
  routes,
  getAllTeams,
  getTeamById,
  getUserTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateMemberRole
};
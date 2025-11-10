'use strict';

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

// Team validation schemas
const createTeamSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  description: Joi.string().max(500).optional().allow(''),
  maxMembers: Joi.number().integer().min(1).max(50).default(10)
});

const updateTeamSchema = Joi.object({
  name: Joi.string().min(3).max(50).optional(),
  description: Joi.string().max(500).optional().allow(''),
  maxMembers: Joi.number().integer().min(1).max(50).optional()
});

const teamMemberSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  role: Joi.string().valid('owner', 'admin', 'member').default('member')
});

// Team model class
class Team {
  constructor(teamData) {
    this.id = teamData.id || uuidv4();
    this.name = teamData.name;
    this.description = teamData.description || '';
    this.maxMembers = teamData.maxMembers || 10;
    this.ownerId = teamData.ownerId; // User who created the team
    this.createdAt = teamData.createdAt || new Date().toISOString();
    this.updatedAt = teamData.updatedAt || new Date().toISOString();
  }

  // Create a new team
  static create(teamData, ownerId) {
    return new Team({
      ...teamData,
      ownerId
    });
  }

  // Update team properties
  update(updateData) {
    if (updateData.name !== undefined) this.name = updateData.name;
    if (updateData.description !== undefined) this.description = updateData.description;
    if (updateData.maxMembers !== undefined) this.maxMembers = updateData.maxMembers;
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  // Get team data for public display
  toPublicObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      maxMembers: this.maxMembers,
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// Team Member model for managing relationships
class TeamMember {
  constructor(memberData) {
    this.teamId = memberData.teamId;
    this.userId = memberData.userId;
    this.role = memberData.role || 'member';
    this.joinedAt = memberData.joinedAt || new Date().toISOString();
  }

  // Update member role
  updateRole(newRole) {
    this.role = newRole;
    return this;
  }

  // Get member data
  toObject() {
    return {
      teamId: this.teamId,
      userId: this.userId,
      role: this.role,
      joinedAt: this.joinedAt
    };
  }
}

// Helper functions
const sanitizeTeam = (team) => {
  if (!team) return null;
  if (team.toPublicObject) return team.toPublicObject();
  
  // Fallback for plain objects
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    maxMembers: team.maxMembers,
    ownerId: team.ownerId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt
  };
};

module.exports = {
  Team,
  TeamMember,
  createTeamSchema,
  updateTeamSchema,
  teamMemberSchema,
  sanitizeTeam
};
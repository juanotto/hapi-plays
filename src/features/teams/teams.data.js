'use strict';

const { Team, TeamMember } = require('./teams.model');

// In-memory teams storage
class TeamDataStore {
  constructor() {
    this.teams = new Map();           // Map of teamId -> Team
    this.teamMembers = new Map();     // Map of `${teamId}:${userId}` -> TeamMember
    this.userTeams = new Map();       // Map of userId -> Set of teamIds (for quick lookup)
    this.teamMembersList = new Map(); // Map of teamId -> Set of userIds (for quick lookup)
  }

  // Initialize with default data (optional)
  async initialize() {
    // Could add some default teams here if needed
    console.log('Teams data store initialized');
  }

  // Get all teams
  getAllTeams() {
    return Array.from(this.teams.values());
  }

  // Get team by ID
  getTeamById(teamId) {
    return this.teams.get(teamId);
  }

  // Get teams by owner
  getTeamsByOwner(ownerId) {
    return Array.from(this.teams.values()).filter(team => team.ownerId === ownerId);
  }

  // Get teams that a user is a member of
  getUserTeams(userId) {
    const teamIds = this.userTeams.get(userId);
    if (!teamIds) return [];
    
    return Array.from(teamIds).map(teamId => this.teams.get(teamId)).filter(Boolean);
  }

  // Create new team
  async createTeam(teamData, ownerId) {
    const team = Team.create(teamData, ownerId);
    
    // Store team
    this.teams.set(team.id, team);
    
    // Add owner as first member with 'owner' role
    await this.addTeamMember(team.id, ownerId, 'owner');
    
    return team;
  }

  // Update existing team
  async updateTeam(teamId, updateData, requestUserId) {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user has permission to update (owner or admin)
    const memberRole = this.getMemberRole(teamId, requestUserId);
    if (!memberRole || (memberRole !== 'owner' && memberRole !== 'admin')) {
      throw new Error('Insufficient permissions to update team');
    }

    // Update team
    team.update(updateData);
    
    return team;
  }

  // Delete team
  async deleteTeam(teamId, requestUserId) {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Only owner can delete team
    if (team.ownerId !== requestUserId) {
      throw new Error('Only team owner can delete the team');
    }

    // Remove all team memberships
    const memberIds = this.teamMembersList.get(teamId);
    if (memberIds) {
      for (const userId of memberIds) {
        this.removeTeamMember(teamId, userId);
      }
    }

    // Remove team
    this.teams.delete(teamId);
    this.teamMembersList.delete(teamId);
    
    return team;
  }

  // Add member to team
  async addTeamMember(teamId, userId, role = 'member') {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if already a member
    const memberKey = `${teamId}:${userId}`;
    if (this.teamMembers.has(memberKey)) {
      throw new Error('User is already a member of this team');
    }

    // Check team capacity
    const currentMemberCount = this.getTeamMemberCount(teamId);
    if (currentMemberCount >= team.maxMembers) {
      throw new Error('Team has reached maximum member capacity');
    }

    // Create team member relationship
    const teamMember = new TeamMember({ teamId, userId, role });
    
    // Store relationships
    this.teamMembers.set(memberKey, teamMember);
    
    // Update user teams index
    if (!this.userTeams.has(userId)) {
      this.userTeams.set(userId, new Set());
    }
    this.userTeams.get(userId).add(teamId);
    
    // Update team members index
    if (!this.teamMembersList.has(teamId)) {
      this.teamMembersList.set(teamId, new Set());
    }
    this.teamMembersList.get(teamId).add(userId);
    
    return teamMember;
  }

  // Remove member from team
  removeTeamMember(teamId, userId) {
    const memberKey = `${teamId}:${userId}`;
    const teamMember = this.teamMembers.get(memberKey);
    
    if (!teamMember) {
      throw new Error('User is not a member of this team');
    }

    // Don't allow owner to leave team (they must transfer ownership first)
    if (teamMember.role === 'owner') {
      throw new Error('Team owner cannot leave the team. Transfer ownership first.');
    }

    // Remove relationships
    this.teamMembers.delete(memberKey);
    
    // Update indexes
    const userTeams = this.userTeams.get(userId);
    if (userTeams) {
      userTeams.delete(teamId);
      if (userTeams.size === 0) {
        this.userTeams.delete(userId);
      }
    }
    
    const teamMembersList = this.teamMembersList.get(teamId);
    if (teamMembersList) {
      teamMembersList.delete(userId);
      if (teamMembersList.size === 0) {
        this.teamMembersList.delete(teamId);
      }
    }
    
    return teamMember;
  }

  // Get team members
  getTeamMembers(teamId) {
    const memberIds = this.teamMembersList.get(teamId);
    if (!memberIds) return [];
    
    return Array.from(memberIds).map(userId => {
      const memberKey = `${teamId}:${userId}`;
      return this.teamMembers.get(memberKey);
    }).filter(Boolean);
  }

  // Get team member count
  getTeamMemberCount(teamId) {
    const memberIds = this.teamMembersList.get(teamId);
    return memberIds ? memberIds.size : 0;
  }

  // Get member role in team
  getMemberRole(teamId, userId) {
    const memberKey = `${teamId}:${userId}`;
    const teamMember = this.teamMembers.get(memberKey);
    return teamMember ? teamMember.role : null;
  }

  // Check if user is member of team
  isMember(teamId, userId) {
    const memberKey = `${teamId}:${userId}`;
    return this.teamMembers.has(memberKey);
  }

  // Update member role
  updateMemberRole(teamId, userId, newRole, requestUserId) {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const memberKey = `${teamId}:${userId}`;
    const teamMember = this.teamMembers.get(memberKey);
    
    if (!teamMember) {
      throw new Error('User is not a member of this team');
    }

    // Check permissions - only owner and admin can change roles
    const requestUserRole = this.getMemberRole(teamId, requestUserId);
    if (!requestUserRole || (requestUserRole !== 'owner' && requestUserRole !== 'admin')) {
      throw new Error('Insufficient permissions to change member role');
    }

    // Owner cannot change their own role
    if (teamMember.role === 'owner' && userId === requestUserId) {
      throw new Error('Cannot change your own owner role. Transfer ownership first.');
    }

    teamMember.updateRole(newRole);
    return teamMember;
  }
}

// Export singleton instance
const teamDataStore = new TeamDataStore();

module.exports = {
  TeamDataStore,
  teamDataStore
};
'use strict';

const { TokenManager } = require('./auth.model');

// In-memory auth session storage
class AuthDataStore {
  constructor() {
    this.blacklistedTokens = new Set();     // Store invalidated tokens
    this.refreshTokens = new Map();        // Map refreshToken -> userId
    this.userSessions = new Map();         // Map userId -> Set of active refreshTokens
  }

  // Initialize auth store
  async initialize() {
    console.log('Auth data store initialized');
  }

  // Blacklist a token (for logout)
  blacklistToken(token) {
    try {
      const decoded = TokenManager.verifyToken(token);
      this.blacklistedTokens.add(token);
      
      // Clean up expired tokens periodically (simple cleanup)
      if (this.blacklistedTokens.size > 1000) {
        this.cleanupExpiredTokens();
      }
      
      return true;
    } catch (error) {
      // Token is already invalid, no need to blacklist
      return false;
    }
  }

  // Check if token is blacklisted
  isTokenBlacklisted(token) {
    return this.blacklistedTokens.has(token);
  }

  // Store refresh token
  storeRefreshToken(refreshToken, userId) {
    try {
      const decoded = TokenManager.verifyToken(refreshToken);
      
      // Store refresh token mapping
      this.refreshTokens.set(refreshToken, userId);
      
      // Add to user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId).add(refreshToken);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Validate and get user ID from refresh token
  validateRefreshToken(refreshToken) {
    if (!this.refreshTokens.has(refreshToken)) {
      return null;
    }

    try {
      const decoded = TokenManager.verifyToken(refreshToken);
      if (decoded.type !== 'refresh') {
        return null;
      }
      
      return this.refreshTokens.get(refreshToken);
    } catch (error) {
      // Token expired or invalid, remove it
      this.removeRefreshToken(refreshToken);
      return null;
    }
  }

  // Remove refresh token
  removeRefreshToken(refreshToken) {
    const userId = this.refreshTokens.get(refreshToken);
    
    if (userId) {
      // Remove from refresh tokens map
      this.refreshTokens.delete(refreshToken);
      
      // Remove from user sessions
      const userSessions = this.userSessions.get(userId);
      if (userSessions) {
        userSessions.delete(refreshToken);
        if (userSessions.size === 0) {
          this.userSessions.delete(userId);
        }
      }
    }
    
    return userId;
  }

  // Remove all refresh tokens for a user (logout all devices)
  removeAllUserRefreshTokens(userId) {
    const userSessions = this.userSessions.get(userId);
    
    if (userSessions) {
      // Remove all refresh tokens for this user
      for (const refreshToken of userSessions) {
        this.refreshTokens.delete(refreshToken);
      }
      
      // Clear user sessions
      this.userSessions.delete(userId);
      
      return userSessions.size;
    }
    
    return 0;
  }

  // Get active session count for user
  getUserSessionCount(userId) {
    const userSessions = this.userSessions.get(userId);
    return userSessions ? userSessions.size : 0;
  }

  // Clean up expired tokens (simple implementation)
  cleanupExpiredTokens() {
    const now = Date.now();
    const tokensToRemove = [];

    // Check blacklisted tokens
    for (const token of this.blacklistedTokens) {
      try {
        TokenManager.verifyToken(token);
      } catch (error) {
        // Token is expired, safe to remove
        tokensToRemove.push(token);
      }
    }

    // Remove expired blacklisted tokens
    for (const token of tokensToRemove) {
      this.blacklistedTokens.delete(token);
    }

    // Check refresh tokens
    const expiredRefreshTokens = [];
    for (const [refreshToken, userId] of this.refreshTokens.entries()) {
      try {
        TokenManager.verifyToken(refreshToken);
      } catch (error) {
        // Token is expired
        expiredRefreshTokens.push(refreshToken);
      }
    }

    // Remove expired refresh tokens
    for (const refreshToken of expiredRefreshTokens) {
      this.removeRefreshToken(refreshToken);
    }

    console.log(`Cleaned up ${tokensToRemove.length} blacklisted tokens and ${expiredRefreshTokens.length} refresh tokens`);
  }

  // Get auth statistics (for debugging/monitoring)
  getStats() {
    return {
      blacklistedTokens: this.blacklistedTokens.size,
      activeRefreshTokens: this.refreshTokens.size,
      usersWithSessions: this.userSessions.size
    };
  }

  // Clear all data (for testing)
  clearAll() {
    this.blacklistedTokens.clear();
    this.refreshTokens.clear();
    this.userSessions.clear();
  }
}

// Export singleton instance
const authDataStore = new AuthDataStore();

module.exports = {
  AuthDataStore,
  authDataStore
};
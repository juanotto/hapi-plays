'use strict';

const Joi = require('joi');
const { authDataStore } = require('./auth.data');
const { TokenManager, AuthResponse, loginSchema, refreshTokenSchema, sanitizeUserForToken } = require('./auth.model');
const { userDataStore } = require('../users/users.data');

// Helper to get token from request
const getTokenFromRequest = (request) => {
  const authHeader = request.headers.authorization;
  return TokenManager.extractTokenFromHeader(authHeader);
};

// Route handlers
const login = async (request, h) => {
  try {
    const { username, password } = request.payload;
    
    // Validate credentials using existing user validation
    const validationResult = await userDataStore.validateCredentials(username, password);
    
    if (!validationResult.isValid) {
      return h.response(AuthResponse.invalidCredentials()).code(401);
    }
    
    // Get user details
    const user = userDataStore.getUserByUsername(username);
    if (!user) {
      return h.response(AuthResponse.invalidCredentials()).code(401);
    }
    
    // Generate token pair
    const tokens = TokenManager.generateTokenPair(user);
    
    // Store refresh token
    authDataStore.storeRefreshToken(tokens.refreshToken, user.id);
    
    // Return successful login response
    return h.response(AuthResponse.loginSuccess(user, tokens)).code(200);
    
  } catch (error) {
    console.error('Login error:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const logout = async (request, h) => {
  try {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return h.response(AuthResponse.unauthorized()).code(401);
    }
    
    // Blacklist the access token
    authDataStore.blacklistToken(token);
    
    // If refresh token provided in body, remove it too
    const { refreshToken } = request.payload || {};
    if (refreshToken) {
      authDataStore.removeRefreshToken(refreshToken);
    }
    
    return h.response(AuthResponse.logoutSuccess()).code(200);
    
  } catch (error) {
    console.error('Logout error:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const logoutAll = async (request, h) => {
  try {
    const userId = request.auth?.credentials?.id;
    
    if (!userId) {
      return h.response(AuthResponse.unauthorized()).code(401);
    }
    
    // Remove all refresh tokens for the user
    const removedCount = authDataStore.removeAllUserRefreshTokens(userId);
    
    // Blacklist current access token
    const token = getTokenFromRequest(request);
    if (token) {
      authDataStore.blacklistToken(token);
    }
    
    return h.response({
      success: true,
      message: `Logged out from ${removedCount + 1} devices`
    }).code(200);
    
  } catch (error) {
    console.error('Logout all error:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const refreshToken = async (request, h) => {
  try {
    const { refreshToken } = request.payload;
    
    // Validate refresh token
    const userId = authDataStore.validateRefreshToken(refreshToken);
    
    if (!userId) {
      return h.response({ 
        success: false, 
        error: 'Invalid or expired refresh token' 
      }).code(401);
    }
    
    // Get user details
    const user = userDataStore.getUserById(userId);
    if (!user) {
      return h.response({ 
        success: false, 
        error: 'User not found' 
      }).code(404);
    }
    
    // Generate new token pair
    const tokens = TokenManager.generateTokenPair(user);
    
    // Remove old refresh token and store new one
    authDataStore.removeRefreshToken(refreshToken);
    authDataStore.storeRefreshToken(tokens.refreshToken, user.id);
    
    return h.response({
      success: true,
      tokens
    }).code(200);
    
  } catch (error) {
    console.error('Refresh token error:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const me = async (request, h) => {
  try {
    const userId = request.auth?.credentials?.id;
    
    if (!userId) {
      return h.response(AuthResponse.unauthorized()).code(401);
    }
    
    // Get user details
    const user = userDataStore.getUserById(userId);
    if (!user) {
      return h.response({ error: 'User not found' }).code(404);
    }
    
    // Get session info
    const sessionCount = authDataStore.getUserSessionCount(userId);
    
    return h.response({
      success: true,
      user: sanitizeUserForToken(user),
      sessionInfo: {
        activeSessions: sessionCount,
        currentTokenIssued: request.auth.credentials.iat ? 
          new Date(request.auth.credentials.iat * 1000).toISOString() : null
      }
    }).code(200);
    
  } catch (error) {
    console.error('Me endpoint error:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const authStats = async (request, h) => {
  try {
    // This endpoint could be admin-only in production
    const stats = authDataStore.getStats();
    
    return h.response({
      success: true,
      stats
    }).code(200);
    
  } catch (error) {
    console.error('Auth stats error:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const debugToken = async (request, h) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return h.response({
        error: 'No Authorization header found',
        expected: 'Authorization: Bearer <token>'
      }).code(400);
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return h.response({
        error: 'Invalid Authorization header format',
        received: authHeader,
        expected: 'Authorization: Bearer <token>'
      }).code(400);
    }
    
    const token = TokenManager.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return h.response({
        error: 'Could not extract token from header'
      }).code(400);
    }
    
    try {
      const decoded = TokenManager.verifyToken(token);
      const isBlacklisted = authDataStore.isTokenBlacklisted(token);
      
      return h.response({
        success: true,
        token: {
          valid: true,
          blacklisted: isBlacklisted,
          decoded: decoded,
          tokenLength: token.length,
          tokenStart: token.substring(0, 20) + '...'
        }
      }).code(200);
      
    } catch (tokenError) {
      return h.response({
        error: 'Token verification failed',
        details: tokenError.message,
        tokenStart: token.substring(0, 20) + '...'
      }).code(400);
    }
    
  } catch (error) {
    console.error('Debug token error:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

// Route definitions
const routes = [
  {
    method: 'POST',
    path: '/auth/login',
    handler: login,
    options: {
      description: 'Login with username and password',
      tags: ['api', 'auth'],
      auth: false,  // Explicitly disable auth for login
      validate: {
        payload: loginSchema
      }
    }
  },
  {
    method: 'POST',
    path: '/auth/logout',
    handler: logout,
    options: {
      description: 'Logout and invalidate current token',
      tags: ['api', 'auth'],
      auth: 'jwt',
      validate: {
        payload: Joi.object({
          refreshToken: Joi.string().optional()
        }).allow(null)
      }
    }
  },
  {
    method: 'POST',
    path: '/auth/logout-all',
    handler: logoutAll,
    options: {
      description: 'Logout from all devices',
      tags: ['api', 'auth'],
      auth: 'jwt'
    }
  },
  {
    method: 'POST',
    path: '/auth/refresh',
    handler: refreshToken,
    options: {
      description: 'Refresh access token using refresh token',
      tags: ['api', 'auth'],
      auth: false,  // Explicitly disable auth for refresh (uses refresh token in payload)
      validate: {
        payload: refreshTokenSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/auth/me',
    handler: me,
    options: {
      description: 'Get current user information',
      tags: ['api', 'auth'],
      auth: 'jwt'
    }
  },
  {
    method: 'GET',
    path: '/auth/stats',
    handler: authStats,
    options: {
      description: 'Get authentication statistics (debug endpoint)',
      tags: ['api', 'auth', 'debug'],
      auth: false  // Debug endpoint - in production, this should require admin auth
    }
  },
  {
    method: 'GET',
    path: '/auth/debug-token',
    handler: debugToken,
    options: {
      description: 'Debug JWT token validation (debug endpoint)',
      tags: ['api', 'auth', 'debug'],
      auth: 'jwt'  // Debug endpoint
    }
  }
];

module.exports = {
  routes,
  login,
  logout,
  logoutAll,
  refreshToken,
  me,
  authStats,
  debugToken
};
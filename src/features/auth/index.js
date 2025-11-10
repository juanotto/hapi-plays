'use strict';

const { authDataStore } = require('./auth.data');
const { routes } = require('./auth.routes');
const { TokenManager, JWT_SECRET } = require('./auth.model');

// JWT validation function for Hapi auth strategy
const validateJWT = async (decoded, request, h) => {
  console.log('=== JWT VALIDATION FUNCTION CALLED ===');
  try {
    console.log('JWT Validation - Decoded token:', JSON.stringify(decoded, null, 2));
    
    // Check if token is blacklisted
    const token = TokenManager.extractTokenFromHeader(request.headers.authorization);
    console.log('JWT Validation - Extracted token length:', token ? token.length : 'null');
    
    if (token && authDataStore.isTokenBlacklisted(token)) {
      console.log('JWT Validation - Token is blacklisted');
      return { isValid: false };
    }
    
    // Check token type (should be 'access' for API calls)
    if (decoded.decoded.payload.type !== 'access') {
      console.log('JWT Validation - Invalid token type:', decoded.decoded.payload.type);
      return { isValid: false };
    }
    
    console.log('JWT Validation - Token is valid, returning success');
    
    // Token is valid, return credentials
    return {
      isValid: true,
      credentials: {
        id: decoded.decoded.payload.id,
        username: decoded.decoded.payload.username,
        name: decoded.decoded.payload.name,
        iat: decoded.decoded.payload.iat,
        exp: decoded.decoded.payload.exp
      }
    };
    
  } catch (error) {
    console.error('JWT validation error:', error);
    return { isValid: false };
  }
};

// Plugin registration
const plugin = {
  name: 'auth',
  version: '1.0.0',
  register: async (server, options) => {
    // Initialize auth data store
    await authDataStore.initialize();
    
    // Register JWT plugin
    await server.register(require('@hapi/jwt'));
    
    // Setup JWT authentication strategy
    server.auth.strategy('jwt', 'jwt', {
      keys: JWT_SECRET,
      verify: {
        aud: false,
        iss: 'hapit-app',
        sub: false,
        nbf: true,
        exp: true,
        maxAgeSec: 86400, // 24 hours
        timeSkewSec: 15
      },
      validate: validateJWT
    });
    
    // Set JWT as default auth strategy (optional)
    // server.auth.default('jwt');
    
    // Register all auth routes
    server.route(routes);
    
    // Optional: Add cleanup interval for expired tokens
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => {
        authDataStore.cleanupExpiredTokens();
      }, 60 * 60 * 1000); // Cleanup every hour
    }
  }
};

// Export plugin and utilities for external access
module.exports = {
  plugin,
  authDataStore,
  validateJWT
};
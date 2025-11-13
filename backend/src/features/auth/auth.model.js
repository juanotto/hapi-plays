'use strict';

const jwt = require('jsonwebtoken');
const Joi = require('joi');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Auth validation schemas
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// JWT Token utilities
class TokenManager {
  
  // Generate access token
  static generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      type: 'access'
    };
    
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRY,
      issuer: 'hapit-app',
      subject: user.id
    });
  }
  
  // Generate refresh token (longer lived)
  static generateRefreshToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      type: 'refresh'
    };
    
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '7d', // 7 days
      issuer: 'hapit-app',
      subject: user.id
    });
  }
  
  // Verify and decode token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'hapit-app'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Generate token pair (access + refresh)
  static generateTokenPair(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      expiresIn: JWT_EXPIRY
    };
  }
  
  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.slice(7); // Remove 'Bearer ' prefix
  }
}

// Auth response utilities
class AuthResponse {

  // Success login response
  static loginSuccess(user, tokens) {
    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      },
      tokens
    };
  }
  
  // Error responses
  static invalidCredentials() {
    return {
      success: false,
      error: 'Invalid username or password'
    };
  }
  
  static tokenExpired() {
    return {
      success: false,
      error: 'Token has expired'
    };
  }
  
  static unauthorized() {
    return {
      success: false,
      error: 'Authentication required'
    };
  }
  
  static logoutSuccess() {
    return {
      success: true,
      message: 'Logout successful'
    };
  }
}

// Helper to sanitize user for token payload
const sanitizeUserForToken = (user) => {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email || ''
  };
};

module.exports = {
  TokenManager,
  AuthResponse,
  loginSchema,
  refreshTokenSchema,
  sanitizeUserForToken,
  JWT_SECRET,
  JWT_EXPIRY
};
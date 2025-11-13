'use strict';

const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const { init } = require('../../../index');

const { describe, it, before, beforeEach, after } = exports.lab = Lab.script();
const { expect } = Code;

describe('Auth Routes', () => {
  let server;
  let testUser;
  let userDataStore;

  before(async () => {
    server = await init();
    // Notice: No server.start() needed! 
    // Server injection bypasses HTTP entirely

    // Create a shared test user that will be used across ALL tests
    const { userDataStore: uds } = require('../users/users.data');
    const { User } = require('../users/users.model');
    
    userDataStore = uds;
    
    testUser = await User.create({
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    
    // Create the user once in the data store
    userDataStore.createUser(testUser);
  });

  after(async () => {
    // Clean shutdown
    await server.stop();
  });

  beforeEach(async () => {
    // Only clear auth data between tests, keep the user
    const { authDataStore } = require('./auth.data');
    authDataStore.clearAll();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Test: Login with valid credentials using server injection
      // testUser is already created in before()
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser',
          password: 'password123'
        }
      });

      // Debug the login failure
      if (loginResponse.statusCode !== 200) {
        console.log('Login failed:', loginResponse.statusCode, loginResponse.result);
        console.log('User in store:', userDataStore.getUserByUsername('testuser') ? 'found' : 'not found');
      }

      // Assertions - This shows the power of server injection!
      // We get the exact same response structure as HTTP calls, but faster
      expect(loginResponse.statusCode).to.equal(200);
      expect(loginResponse.result.success).to.be.true();
      expect(loginResponse.result.user).to.exist();
      expect(loginResponse.result.user.password).to.not.exist(); // Password should be sanitized
      expect(loginResponse.result.tokens).to.exist();
      expect(loginResponse.result.tokens.accessToken).to.be.a.string();
      expect(loginResponse.result.tokens.refreshToken).to.be.a.string();
    });

    it('should reject login with invalid credentials', async () => {
      // Test: Login with wrong password
      // testUser is already created in beforeEach
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser',
          password: 'wrongpassword'
        }
      });

      // Assertions
      expect(loginResponse.statusCode).to.equal(401);
      expect(loginResponse.result.success).to.be.false();
      expect(loginResponse.result.error).to.equal('Invalid username or password');
    });

    it('should reject login for non-existent user', async () => {
      // Test: Login with non-existent user
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'nonexistent',
          password: 'password123'
        }
      });

      // Assertions
      expect(loginResponse.statusCode).to.equal(401);
      expect(loginResponse.result.success).to.be.false();
      expect(loginResponse.result.error).to.equal('Invalid username or password');
    });

    it('should validate payload schema', async () => {
      // Test: Invalid payload (missing password)
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser'
          // password missing
        }
      });

      expect(response.statusCode).to.equal(400);
    });
  });

  describe('GET /auth/me', () => {
    let userTokens;
    let userId;

    beforeEach(async () => {
      // Setup: Login to get tokens (testUser already created in main beforeEach)
      userId = testUser.id;

      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser',
          password: 'password123'
        }
      });

      userTokens = loginResponse.result.tokens;
    });

    it('should return user info for authenticated request', async () => {
      // Test: Get user info with valid token
      // This shows the beauty of server injection - we can set headers directly
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${userTokens.accessToken}`
        }
      });

      expect(response.statusCode).to.equal(200);
      expect(response.result.success).to.be.true();
      expect(response.result.user).to.exist();
      expect(response.result.user.id).to.equal(userId);
      expect(response.result.user.username).to.equal('testuser');
      expect(response.result.user.password).to.not.exist();
      expect(response.result.sessionInfo).to.exist();
      expect(response.result.sessionInfo.activeSessions).to.be.a.number();
    });

    it('should reject unauthenticated request', async () => {
      // Test: No authorization header
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me'
      });

      expect(response.statusCode).to.equal(401);
    });

    it('should reject invalid token', async () => {
      // Test: Invalid token
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).to.equal(401);
    });
  });

  describe('POST /auth/logout', () => {
    let userTokens;

    beforeEach(async () => {
      // Setup: Login (testUser already created in main beforeEach)
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser',
          password: 'password123'
        }
      });

      userTokens = loginResponse.result.tokens;
    });

    it('should logout successfully', async () => {
      // Test: Logout with valid token
      const response = await server.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: `Bearer ${userTokens.accessToken}`
        },
        payload: {
          refreshToken: userTokens.refreshToken
        }
      });

      expect(response.statusCode).to.equal(200);
      expect(response.result.success).to.be.true();

      // Verify token is blacklisted by trying to use it
      const meResponse = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${userTokens.accessToken}`
        }
      });

      expect(meResponse.statusCode).to.equal(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let userTokens;

    beforeEach(async () => {
      // Setup: Login (testUser already created in main beforeEach)
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testuser',
          password: 'password123'
        }
      });

      userTokens = loginResponse.result.tokens;
    });

    it('should refresh tokens successfully', async () => {
      // Add delay to ensure different timestamp (JWT uses seconds, so need >1000ms)
      await new Promise(resolve => setTimeout(resolve, 1100)); // Ensure different second
      
      // Test: Refresh with valid refresh token
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: userTokens.refreshToken
        }
      });

      expect(response.statusCode).to.equal(200);
      expect(response.result.success).to.be.true();
      expect(response.result.tokens).to.exist();
      expect(response.result.tokens.accessToken).to.be.a.string();
      expect(response.result.tokens.refreshToken).to.be.a.string();
      
      // New tokens should be different from old ones (due to different iat timestamp)
      expect(response.result.tokens.accessToken).to.not.equal(userTokens.accessToken);
      expect(response.result.tokens.refreshToken).to.not.equal(userTokens.refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      // Test: Invalid refresh token
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-refresh-token'
        }
      });

      expect(response.statusCode).to.equal(401);
      expect(response.result.success).to.be.false();
    });
  });

  describe('GET /auth/stats', () => {
    it('should return auth statistics', async () => {
      // Test: Get auth stats (debug endpoint)
      const response = await server.inject({
        method: 'GET',
        url: '/auth/stats'
      });

      expect(response.statusCode).to.equal(200);
      expect(response.result.success).to.be.true();
      expect(response.result.stats).to.exist();
      expect(response.result.stats.blacklistedTokens).to.be.a.number();
      expect(response.result.stats.activeRefreshTokens).to.be.a.number();
      expect(response.result.stats.usersWithSessions).to.be.a.number();
    });
  });
});
'use strict';

const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const { init } = require('../../../index');

const { describe, it, before, beforeEach, after } = exports.lab = Lab.script();
const { expect } = Code;

describe('Users Data Store', () => {
  let server;
  let userDataStore;
  let User;

  before(async () => {
    server = await init();
    
    // Get references to the data store and model
    const { userDataStore: uds } = require('./users.data');
    const { User: UserModel } = require('./users.model');
    
    userDataStore = uds;
    User = UserModel;
    
    console.log('After init - users in store:', userDataStore.getAllUsers().length);
  });

  after(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    // Clear the user store before each test
    userDataStore.clearAll();
    console.log('After clearAll - users in store:', userDataStore.getAllUsers().length);
  });

  describe('Basic Operations', () => {
    it('should start with empty store after clearAll', async () => {
      const users = userDataStore.getAllUsers();
      expect(users).to.have.length(0);
    });

    it('should create a user successfully', async () => {
      const testUser = await User.create({
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });

      const createdUser = userDataStore.createUser(testUser);
      
      expect(createdUser).to.exist();
      expect(createdUser.username).to.equal('testuser');
      expect(createdUser.name).to.equal('Test User');
      
      // Check it's in the store
      const allUsers = userDataStore.getAllUsers();
      expect(allUsers).to.have.length(1);
      expect(allUsers[0].username).to.equal('testuser');
    });

    it('should retrieve user by username', async () => {
      const testUser = await User.create({
        username: 'findme',
        name: 'Find Me',
        email: 'findme@example.com',
        password: 'password123'
      });

      userDataStore.createUser(testUser);
      
      const foundUser = userDataStore.getUserByUsername('findme');
      expect(foundUser).to.exist();
      expect(foundUser.username).to.equal('findme');
      expect(foundUser.name).to.equal('Find Me');
      
      const notFound = userDataStore.getUserByUsername('nonexistent');
      expect(notFound).to.be.null();
    });

    it('should retrieve user by id', async () => {
      const testUser = await User.create({
        username: 'findbyid',
        name: 'Find By ID',
        email: 'findbyid@example.com',
        password: 'password123'
      });

      userDataStore.createUser(testUser);
      const userId = testUser.id;
      
      const foundUser = userDataStore.getUserById(userId);
      expect(foundUser).to.exist();
      expect(foundUser.id).to.equal(userId);
      expect(foundUser.username).to.equal('findbyid');
      
      const notFound = userDataStore.getUserById('nonexistent-id');
      expect(notFound).to.be.null();
    });

    it('should prevent duplicate usernames', async () => {
      const user1 = await User.create({
        username: 'duplicate',
        name: 'First User',
        email: 'first@example.com',
        password: 'password123'
      });

      const user2 = await User.create({
        username: 'duplicate',
        name: 'Second User',
        email: 'second@example.com',
        password: 'password123'
      });

      userDataStore.createUser(user1);
      
      // Should throw error for duplicate username
      expect(() => {
        userDataStore.createUser(user2);
      }).to.throw();
    });
  });

  describe('Password Validation', () => {
    it('should validate correct password', async () => {
      const testUser = await User.create({
        username: 'validpass',
        name: 'Valid Pass',
        email: 'valid@example.com',
        password: 'mypassword123'
      });

      userDataStore.createUser(testUser);
      
      const result = await userDataStore.validateCredentials('validpass', 'mypassword123');
      expect(result.isValid).to.be.true();
      expect(result.credentials).to.exist();
      expect(result.credentials.username).to.equal('validpass');
    });

    it('should reject invalid password', async () => {
      const testUser = await User.create({
        username: 'invalidpass',
        name: 'Invalid Pass',
        email: 'invalid@example.com',
        password: 'correctpassword'
      });

      userDataStore.createUser(testUser);
      
      const result = await userDataStore.validateCredentials('invalidpass', 'wrongpassword');
      expect(result.isValid).to.be.false();
      expect(result.credentials).to.be.null();
    });

    it('should reject non-existent username', async () => {
      const result = await userDataStore.validateCredentials('nonexistent', 'anypassword');
      expect(result.isValid).to.be.false();
      expect(result.credentials).to.be.null();
    });
  });

  describe('Data Persistence', () => {
    it('should maintain users across multiple operations', async () => {
      // Add first user
      const user1 = await User.create({
        username: 'user1',
        name: 'User One',
        email: 'user1@example.com',
        password: 'password1'
      });
      userDataStore.createUser(user1);
      
      // Add second user
      const user2 = await User.create({
        username: 'user2',
        name: 'User Two',
        email: 'user2@example.com',
        password: 'password2'
      });
      userDataStore.createUser(user2);
      
      // Both should exist
      expect(userDataStore.getAllUsers()).to.have.length(2);
      expect(userDataStore.getUserByUsername('user1')).to.exist();
      expect(userDataStore.getUserByUsername('user2')).to.exist();
      
      // Validate both passwords work
      const result1 = await userDataStore.validateCredentials('user1', 'password1');
      const result2 = await userDataStore.validateCredentials('user2', 'password2');
      
      expect(result1.isValid).to.be.true();
      expect(result2.isValid).to.be.true();
    });
  });

  describe('Initialization Behavior', () => {
    it('should have default john user after init (without clearAll)', async () => {
      // Don't call clearAll for this test
      // Reset the store first by calling initialize again
      await userDataStore.initialize();
      
      const users = userDataStore.getAllUsers();
      expect(users).to.have.length(1);
      expect(users[0].username).to.equal('john');
      
      const johnUser = userDataStore.getUserByUsername('john');
      expect(johnUser).to.exist();
      expect(johnUser.name).to.equal('John Doe');
    });
  });
});
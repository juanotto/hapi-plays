'use strict';

const { User } = require('./users.model');

// In-memory user storage
class UserDataStore {
  constructor() {
    this.users = new Map();
    this.usernameIndex = new Map(); // Maps username -> userId for quick lookup
  }

  // Initialize with default data
  async initialize() {
    // Migrate the existing user from main script
    const hashedPassword = '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm'; // 'secret'
    
    const johnUser = new User({
      username: 'john',
      password: hashedPassword,
      name: 'John Doe',
      email: 'john@example.com'
    });

    this.users.set(johnUser.id, johnUser);
    this.usernameIndex.set('john', johnUser.id);
  }

  // Get all users
  getAllUsers() {
    const allUsers = [];
    for (const user of this.users.values()) {
      allUsers.push(user);
    }
    return allUsers;
  }

  // Get user by ID
  getUserById(id) {
    return this.users.get(id);
  }

  // Get user by username
  getUserByUsername(username) {
    const userId = this.usernameIndex.get(username);
    return userId ? this.users.get(userId) : null;
  }

  // Check if username exists
  usernameExists(username) {
    return this.usernameIndex.has(username);
  }

  // Create new user
  async createUser(userData) {
    // Check if username already exists
    if (this.usernameExists(userData.username)) {
      throw new Error('Username already exists');
    }

    const user = await User.create(userData);
    
    // Store user and create username index
    this.users.set(user.id, user);
    this.usernameIndex.set(user.username, user.id);
    
    return user;
  }

  // Update existing user
  async updateUser(id, updateData) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    // If username is being changed, check availability and update index
    if (updateData.username && updateData.username !== user.username) {
      if (this.usernameExists(updateData.username)) {
        throw new Error('Username already exists');
      }
      
      // Remove old username mapping and create new one
      this.usernameIndex.delete(user.username);
      this.usernameIndex.set(updateData.username, id);
    }

    // Update user
    await user.update(updateData);
    
    return user;
  }

  // Delete user (for future use)
  deleteUser(id) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove from both maps
    this.users.delete(id);
    this.usernameIndex.delete(user.username);
    
    return user;
  }

  // Validate user credentials (for auth)
  async validateCredentials(username, password) {
    const user = this.getUserByUsername(username);
    if (!user) {
      return { credentials: null, isValid: false };
    }

    const isValid = await user.verifyPassword(password);
    const credentials = { 
      id: user.id, 
      name: user.name, 
      username: user.username 
    };

    return { isValid, credentials };
  }
}

// Export singleton instance
const userDataStore = new UserDataStore();

module.exports = {
  UserDataStore,
  userDataStore
};
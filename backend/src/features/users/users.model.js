'use strict';

const { v4: uuidv4 } = require('uuid');
const Bcrypt = require('bcrypt');
const Joi = require('joi');

// User validation schemas
const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().optional()
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  password: Joi.string().min(6).optional(),
  name: Joi.string().min(1).max(100).optional(),
  email: Joi.string().email().allow('').optional()
});

// User model class
class User {
  constructor(userData) {
    this.id = userData.id || uuidv4();
    this.username = userData.username;
    this.password = userData.password;
    this.name = userData.name;
    this.email = userData.email || '';
    this.createdAt = userData.createdAt || new Date().toISOString();
    this.updatedAt = userData.updatedAt || new Date().toISOString();
  }

  // Create a new user with hashed password
  static async create(userData) {
    const hashedPassword = await Bcrypt.hash(userData.password, 10);
    return new User({
      ...userData,
      password: hashedPassword
    });
  }

  // Update user properties
  async update(updateData) {
    if (updateData.username !== undefined) this.username = updateData.username;
    if (updateData.password !== undefined) {
      this.password = await Bcrypt.hash(updateData.password, 10);
    }
    if (updateData.name !== undefined) this.name = updateData.name;
    if (updateData.email !== undefined) this.email = updateData.email;
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  // Return user data without password
  toSafeObject() {
    const { password, ...safeUser } = this;
    return safeUser;
  }

  // Verify password
  async verifyPassword(password) {
    return await Bcrypt.compare(password, this.password);
  }
}

// Helper functions
const sanitizeUser = (user) => {
  if (!user) return null;
  if (user.toSafeObject) return user.toSafeObject();
  
  // Fallback for plain objects
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

module.exports = {
  User,
  createUserSchema,
  updateUserSchema,
  sanitizeUser
};
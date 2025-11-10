'use strict';

const { userDataStore } = require('./users.data');
const { createUserSchema, updateUserSchema, sanitizeUser } = require('./users.model');

// Route handlers
const getAllUsers = (request, h) => {
  try {
    const allUsers = userDataStore.getAllUsers();
    return allUsers.map(user => sanitizeUser(user));
  } catch (error) {
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const getUserById = (request, h) => {
  try {
    const { id } = request.params;
    const user = userDataStore.getUserById(id);
    
    if (!user) {
      return h.response({ error: 'User not found' }).code(404);
    }
    
    return sanitizeUser(user);
  } catch (error) {
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const createUser = async (request, h) => {
  try {
    const userData = request.payload;
    const user = await userDataStore.createUser(userData);
    
    return h.response(sanitizeUser(user)).code(201);
  } catch (error) {
    if (error.message === 'Username already exists') {
      return h.response({ error: error.message }).code(409);
    }
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const updateUser = async (request, h) => {
  try {
    const { id } = request.params;
    const updateData = request.payload;
    
    const user = await userDataStore.updateUser(id, updateData);
    return sanitizeUser(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return h.response({ error: error.message }).code(404);
    }
    if (error.message === 'Username already exists') {
      return h.response({ error: error.message }).code(409);
    }
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

// Route definitions
const routes = [
  {
    method: 'GET',
    path: '/users',
    handler: getAllUsers,
    options: {
      description: 'Get all users',
      tags: ['api', 'users']
    }
  },
  {
    method: 'GET',
    path: '/users/{id}',
    handler: getUserById,
    options: {
      description: 'Get user by ID',
      tags: ['api', 'users']
    }
  },
  {
    method: 'POST',
    path: '/users',
    handler: createUser,
    options: {
      description: 'Create a new user',
      tags: ['api', 'users'],
      validate: {
        payload: createUserSchema
      }
    }
  },
  {
    method: 'PUT',
    path: '/users/{id}',
    handler: updateUser,
    options: {
      description: 'Update an existing user',
      tags: ['api', 'users'],
      validate: {
        payload: updateUserSchema
      }
    }
  }
];

module.exports = {
  routes,
  getAllUsers,
  getUserById,
  createUser,
  updateUser
};
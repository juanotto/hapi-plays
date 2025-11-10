'use strict';

const { userDataStore } = require('./users.data');
const { routes } = require('./users.routes');

// Validation function for auth (exported for use in main app)
const validateUser = async (request, username, password) => {
  return await userDataStore.validateCredentials(username, password);
};

// Plugin registration
const plugin = {
  name: 'users',
  version: '1.0.0',
  register: async (server, options) => {
    // Initialize users data store
    await userDataStore.initialize();

    // Register all user routes
    server.route(routes);
  }
};

// Export plugin and validation function
module.exports = {
  plugin,
  validateUser
};

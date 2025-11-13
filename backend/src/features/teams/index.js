'use strict';

const { teamDataStore } = require('./teams.data');
const { routes } = require('./teams.routes');

// Plugin registration
const plugin = {
  name: 'teams',
  version: '1.0.0',
  register: async (server, options) => {
    // Initialize teams data store
    await teamDataStore.initialize();
    
    // Register all team routes
    server.route(routes);
  }
};

// Export plugin and data store for potential external access
module.exports = {
  plugin,
  teamDataStore
};
'use strict';

const Hapi = require('@hapi/hapi');
const { plugin: authPlugin } = require('./src/features/auth');
const { plugin: usersPlugin } = require('./src/features/users');
const { plugin: teamsPlugin } = require('./src/features/teams');

const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    // Register plugins
    await server.register(authPlugin);      // Register auth first to set up JWT strategy
    await server.register(usersPlugin);
    await server.register(teamsPlugin);
    
    // Set JWT as default auth for new routes
    server.auth.default('jwt');

    // Health check endpoint
    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return { status: 'ok', message: 'Hapit API is running' };
        },
        options: {
          auth: false  // Public health check
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();

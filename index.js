'use strict';

const Hapi = require('@hapi/hapi');
const { plugin: authPlugin } = require('./src/features/auth');
const { plugin: usersPlugin } = require('./src/features/users');
const { plugin: teamsPlugin } = require('./src/features/teams');
const { testConnection } = require('./src/config/db');

const init = async () => {

    // Fail fast if required environment variables are missing (except in test mode)
    const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('lab'));
    
    if (!isTest) {
        if (!process.env.PORT) {
            throw new Error('PORT environment variable is required');
        }
        if (!process.env.HOST) {
            throw new Error('HOST environment variable is required');
        }
        
        // Test database connection on startup
        try {
            await testConnection();
        } catch (error) {
            console.error('Failed to connect to database. Application will continue but database operations will fail.');
        }
    }

    const server = Hapi.server({
        port: isTest ? 0 : parseInt(process.env.PORT, 10), // Port 0 = random available port for tests
        host: isTest ? 'localhost' : process.env.HOST
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

    return server;  // Return server without starting (for testing)
};

const start = async () => {
    const server = await init();
    await server.start();
    console.log('Server running on %s', server.info.uri);
    return server;
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

// Export for testing, but start server if called directly
if (require.main === module) {
    start();
}

module.exports = { init, start };

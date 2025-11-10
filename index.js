'use strict';

const Hapi = require('@hapi/hapi');
const { plugin: authPlugin } = require('./src/features/auth');
const { plugin: usersPlugin, validateUser } = require('./src/features/users');
const { plugin: teamsPlugin } = require('./src/features/teams');

const pastaRecipes = [
  { id: 1, name: 'Spaghetti Bolognese' },
  { id: 2, name: 'Fettuccine Alfredo' },
  { id: 3, name: 'Penne Arrabiata' }
];

const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    // Register plugins
    await server.register(authPlugin);      // Register auth first to set up JWT strategy
    await server.register(require('@hapi/basic'));
    await server.register(usersPlugin);
    await server.register(teamsPlugin);
    
    // Setup authentication strategies
    server.auth.strategy('simple', 'basic', { validate: validateUser });
    // JWT strategy is set up by auth plugin
      
    // Set JWT as default auth for new routes (optional)
    server.auth.default('jwt');

    // Leaving this one until proper liveness test is set up
    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return 'Hello World!';
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

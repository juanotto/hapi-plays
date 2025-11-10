'use strict';

const Hapi = require('@hapi/hapi');
const { plugin: usersPlugin, validateUser } = require('./src/features/users');

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
    await server.register(require('@hapi/basic'));
    await server.register(usersPlugin);
    
    // Setup authentication
    server.auth.strategy('simple', 'basic', { validate: validateUser });

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

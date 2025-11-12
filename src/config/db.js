'use strict';

const { Pool } = require('pg');

// Database configuration from environment variables
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'hapit',
    user: process.env.DB_USER || 'hapit',
    password: process.env.DB_PASSWORD || 'hapit123',
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Create a connection pool
const pool = new Pool(config);

// Test database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✓ Database connected successfully at', result.rows[0].now);
        client.release();
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        throw error;
    }
};

module.exports = {
    pool,
    testConnection
};

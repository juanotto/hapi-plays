'use strict';

const { Pool } = require('pg');

class PostgresDatabase {
    constructor() {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            database: process.env.DB_NAME || 'hapit',
            user: process.env.DB_USER || 'hapit',
            password: process.env.DB_PASSWORD || 'hapit123',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
        
        this.pool = new Pool(config);
    }

    async query(sql, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result;
        } finally {
            client.release();
        }
    }

    async testConnection() {
        try {
            const result = await this.query('SELECT NOW()');
            console.log('✓ PostgreSQL database connected successfully at', result.rows[0].now);
            return true;
        } catch (error) {
            console.error('✗ PostgreSQL connection failed:', error.message);
            throw error;
        }
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = PostgresDatabase;

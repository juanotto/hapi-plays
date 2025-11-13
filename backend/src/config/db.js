'use strict';

const PostgresDatabase = require('./database/postgres');
const SqliteDatabase = require('./database/sqlite');

// Determine which database implementation to use
const dbType = process.env.DB_TYPE || (process.env.DB_HOST ? 'postgres' : 'sqlite');

// Create database instance
let database;
if (dbType === 'sqlite') {
    database = new SqliteDatabase();
} else {
    database = new PostgresDatabase();
}

// Export the database instance and its methods
module.exports = {
    query: (sql, params) => database.query(sql, params),
    testConnection: () => database.testConnection(),
    close: () => database.close()
};

'use strict';

const Database = require('better-sqlite3');
const path = require('path');

class SqliteDatabase {
    constructor() {
        const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../hapit.db');
        this.db = new Database(dbPath);
        console.log(`SQLite database initialized at ${dbPath}`);
    }

    async query(sql, params = []) {
        // Wrap in Promise for consistent async interface
        return Promise.resolve().then(() => {
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                const stmt = this.db.prepare(sql);
                const rows = stmt.all(...params);
                return { rows };
            } else {
                const stmt = this.db.prepare(sql);
                const info = stmt.run(...params);
                return { 
                    rows: [],
                    rowCount: info.changes,
                    lastInsertRowid: info.lastInsertRowid
                };
            }
        });
    }

    async testConnection() {
        try {
            const result = await this.query("SELECT datetime('now') as now");
            console.log('✓ SQLite database connected successfully at', result.rows[0].now);
            return true;
        } catch (error) {
            console.error('✗ SQLite connection failed:', error.message);
            throw error;
        }
    }

    async close() {
        this.db.close();
    }
}

module.exports = SqliteDatabase;

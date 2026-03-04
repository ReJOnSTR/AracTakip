const { PrismaClient } = require('./prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('./logger');

let prisma = null;

function getDbPath() {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    return path.join(dataDir, 'aractakip.db');
}

/**
 * Initializes and exports the Prisma Singleton
 * Dynamically binds the correct user data folder path.
 */
function getPrismaClient() {
    if (!prisma) {
        try {
            const dbPath = getDbPath();
            log.info(`Initializing Prisma Client on DB: ${dbPath}`);
            process.env.DATABASE_URL = `file:${dbPath}?connection_limit=1`;

            // Run auto-migrations BEFORE Prisma client starts,
            // so the DB schema matches what Prisma expects.
            runAutoMigrations(dbPath);

            // Edge client initialization with driver adapter for Vite/Electron bundler compatibility.
            // IMPORTANT: Do NOT pass ?connection_limit to the adapter URL, as better-sqlite3 creates a literal file!
            const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
            prisma = new PrismaClient({ adapter });

            // IMPORTANT: Prisma returns BigInt for SQLite's Int/BigInt.
            // Electron's IPC drops BigInt entirely. We must override BigInt serialization.
            BigInt.prototype.toJSON = function () {
                return Number(this);
            };

        } catch (error) {
            log.error('Failed to initialize Prisma:', error);
            throw error;
        }
    }
    return prisma;
}

/**
 * Runs incremental ALTER TABLE migrations on the raw SQLite DB
 * to bring older databases up to date with the current Prisma schema.
 * Each migration is idempotent (checks if column exists before adding).
 */
function runAutoMigrations(dbPath) {
    try {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath);

        // Helper: check if a column exists in a table
        const columnExists = (table, column) => {
            const cols = db.pragma(`table_info(${table})`);
            return cols.some(c => c.name === column);
        };

        // Migration 1: Add is_archived to vehicles (added in v1.0.32)
        if (!columnExists('vehicles', 'is_archived')) {
            log.info('Migration: Adding is_archived column to vehicles table');
            db.exec('ALTER TABLE vehicles ADD COLUMN is_archived INTEGER DEFAULT 0');
        }

        db.close();
        log.info('Auto-migrations completed successfully');
    } catch (error) {
        log.error('Auto-migration error (non-fatal):', error.message);
        // Non-fatal: if migrations fail, the app can still try to run
    }
}

module.exports = { getPrismaClient };

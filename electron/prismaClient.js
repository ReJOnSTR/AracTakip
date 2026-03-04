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
 * Run DB schema migrations using Prisma's $executeRawUnsafe.
 * Must be called AFTER getPrismaClient() and BEFORE any queries.
 */
async function runAutoMigrations() {
    const p = getPrismaClient();
    try {
        // Check if vehicles table has is_archived column
        const cols = await p.$queryRawUnsafe("PRAGMA table_info('vehicles')");
        const hasIsArchived = cols.some(c => c.name === 'is_archived');
        if (!hasIsArchived) {
            log.info('Migration: Adding is_archived column to vehicles table');
            await p.$executeRawUnsafe('ALTER TABLE vehicles ADD COLUMN is_archived INTEGER DEFAULT 0');
            log.info('Migration: is_archived column added successfully');
        } else {
            log.info('Migration: vehicles.is_archived column already exists');
        }
    } catch (error) {
        log.error('Auto-migration error:', error.message);
    }
}

module.exports = { getPrismaClient, runAutoMigrations };

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

module.exports = { getPrismaClient };

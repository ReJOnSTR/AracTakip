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
    log.info('Running auto-migrations for missing tables and columns...');

    // 1. Add `is_archived` to all relevant tables if missing
    try {
        const archivableTables = [
            'assignments', 'customers', 'employee_assignments', 'employees',
            'inspections', 'insurances', 'maintenances', 'meal_tickets',
            'services', 'transactions', 'vehicles', 'works'
        ];

        for (const tableName of archivableTables) {
            const cols = await p.$queryRawUnsafe(`PRAGMA table_info('${tableName}')`);
            if (cols.length > 0 && !cols.some(c => c.name === 'is_archived')) {
                await p.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN is_archived INTEGER DEFAULT 0`);
                log.info(`Migration: Added is_archived to ${tableName}`);
            }
        }
    } catch (error) {
        log.error('Migration step 1 (is_archived) error:', error.message);
    }

    // 2. Transactions: category, payment_method (missing in older versions)
    try {
        const tCols = await p.$queryRawUnsafe("PRAGMA table_info('transactions')");
        if (tCols.length > 0) {
            if (!tCols.some(c => c.name === 'category')) {
                await p.$executeRawUnsafe('ALTER TABLE transactions ADD COLUMN category TEXT');
                log.info('Migration: Added category to transactions');
            }
            if (!tCols.some(c => c.name === 'payment_method')) {
                await p.$executeRawUnsafe('ALTER TABLE transactions ADD COLUMN payment_method TEXT');
                log.info('Migration: Added payment_method to transactions');
            }
        }
    } catch (error) {
        log.error('Migration step 2 (transactions) error:', error.message);
    }

    // 3. Create ALL tables IF NOT EXISTS (Fresh Database Bootstrap & Missing tables support)
    try {
        const { allTablesSQL } = require('./schema_script');
        for (const sql of allTablesSQL) {
            try {
                await p.$executeRawUnsafe(sql);
            } catch (sqlErr) {
                // Ignore individual SQL errors (e.g. sqlite_autoindex conflicts)
            }
        }
    } catch (error) {
        log.error('Migration step 3 (create tables) error:', error.message);
    }

    // 4. Add customer_id to works (for existing DBs that already have works table)
    try {
        const wCols = await p.$queryRawUnsafe("PRAGMA table_info('works')");
        if (wCols.length > 0 && !wCols.some(c => c.name === 'customer_id')) {
            await p.$executeRawUnsafe('ALTER TABLE works ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL');
            log.info('Migration: Added customer_id to works');
        }
    } catch (error) {
        log.error('Migration step 4 (customer_id) error:', error.message);
    }

    // 5. Add receipt_no to work_items (for existing DBs)
    try {
        const wiCols = await p.$queryRawUnsafe("PRAGMA table_info('work_items')");
        if (wiCols.length > 0 && !wiCols.some(c => c.name === 'receipt_no')) {
            await p.$executeRawUnsafe('ALTER TABLE work_items ADD COLUMN receipt_no TEXT');
            log.info('Migration: Added receipt_no to work_items');
        }
    } catch (error) {
        log.error('Migration step 5 (receipt_no) error:', error.message);
    }

    // 6. Add travel_price to work_items (for existing DBs)
    try {
        const wiCols2 = await p.$queryRawUnsafe("PRAGMA table_info('work_items')");
        if (wiCols2.length > 0 && !wiCols2.some(c => c.name === 'travel_price')) {
            await p.$executeRawUnsafe('ALTER TABLE work_items ADD COLUMN travel_price REAL DEFAULT 0');
            log.info('Migration: Added travel_price to work_items');
        }
    } catch (error) {
        log.error('Migration step 6 (travel_price) error:', error.message);
    }

    // 7. Add payment_method to salaries
    try {
        const salCols = await p.$queryRawUnsafe("PRAGMA table_info('salaries')");
        if (salCols.length > 0 && !salCols.some(c => c.name === 'payment_method')) {
            await p.$executeRawUnsafe("ALTER TABLE salaries ADD COLUMN payment_method TEXT DEFAULT 'cash'");
            log.info('Migration: Added payment_method to salaries');
        }
    } catch (error) {
        log.error('Migration step 7 (payment_method) error:', error.message);
    }

    // 8. Add salary_month to salaries (for tracking which month a payment belongs to)
    try {
        const salCols2 = await p.$queryRawUnsafe("PRAGMA table_info('salaries')");
        if (salCols2.length > 0 && !salCols2.some(c => c.name === 'salary_month')) {
            await p.$executeRawUnsafe("ALTER TABLE salaries ADD COLUMN salary_month TEXT");
            log.info('Migration: Added salary_month to salaries');
        }
    } catch (error) {
        log.error('Migration step 8 (salary_month) error:', error.message);
    }

    // 9. Add expiry_date to employee_documents
    try {
        const edCols = await p.$queryRawUnsafe("PRAGMA table_info('employee_documents')");
        if (edCols.length > 0 && !edCols.some(c => c.name === 'expiry_date')) {
            await p.$executeRawUnsafe("ALTER TABLE employee_documents ADD COLUMN expiry_date DATETIME");
            log.info('Migration: Added expiry_date to employee_documents');
        }
    } catch (error) {
        log.error('Migration step 9 (expiry_date) error:', error.message);
    }

    log.info('Auto-migrations loop completed.');
}

module.exports = { getPrismaClient, runAutoMigrations };

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
        log.info('Running auto-migrations for missing tables and columns...');

        // 1. Vehicles: is_archived
        const vCols = await p.$queryRawUnsafe("PRAGMA table_info('vehicles')");
        if (vCols.length > 0 && !vCols.some(c => c.name === 'is_archived')) {
            await p.$executeRawUnsafe('ALTER TABLE vehicles ADD COLUMN is_archived INTEGER DEFAULT 0');
            log.info('Migration: Added is_archived to vehicles');
        }

        // 2. Transactions: category, payment_method (missing in 1.0.26)
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

        // 3. Create newly introduced tables (Personnel & Works modules) IF NOT EXISTS
        const newTablesSQL = [
            `CREATE TABLE IF NOT EXISTS "employees" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "company_id" INTEGER NOT NULL,
                "first_name" TEXT NOT NULL,
                "last_name" TEXT NOT NULL,
                "tc_no" TEXT,
                "phone" TEXT,
                "email" TEXT,
                "position" TEXT,
                "department" TEXT,
                "start_date" DATETIME,
                "end_date" DATETIME,
                "salary" REAL DEFAULT 0,
                "status" TEXT DEFAULT 'active',
                "notes" TEXT,
                "image" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "past_used_leaves" INTEGER DEFAULT 0,
                "birth_date" DATETIME,
                CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "employee_assignments" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "item_name" TEXT NOT NULL,
                "quantity" INTEGER DEFAULT 1,
                "assigned_date" DATETIME,
                "return_date" DATETIME,
                "status" TEXT DEFAULT 'active',
                "notes" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "employee_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "employee_attendance" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "date" DATETIME NOT NULL,
                "status" TEXT NOT NULL,
                "description" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "employee_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "employee_documents" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "file_name" TEXT NOT NULL,
                "file_path" TEXT NOT NULL,
                "file_type" TEXT,
                "category" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "employee_movements" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "type" TEXT NOT NULL,
                "amount" REAL DEFAULT 0,
                "date" DATETIME NOT NULL,
                "description" TEXT,
                "is_paid" INTEGER DEFAULT 0,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "payment_method" TEXT DEFAULT 'cash',
                CONSTRAINT "employee_movements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "employee_salary_history" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "amount" REAL DEFAULT 0,
                "start_date" DATETIME NOT NULL,
                "end_date" DATETIME,
                "type" TEXT DEFAULT 'initial',
                "description" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "employee_salary_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "leaves" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "type" TEXT NOT NULL DEFAULT 'annual',
                "start_date" DATETIME NOT NULL,
                "end_date" DATETIME NOT NULL,
                "days" INTEGER DEFAULT 1,
                "status" TEXT DEFAULT 'approved',
                "notes" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "leaves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "overtimes" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "date" DATETIME NOT NULL,
                "hours" REAL DEFAULT 0,
                "rate" REAL DEFAULT 1.5,
                "amount" REAL DEFAULT 0,
                "notes" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "overtimes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "recurring_transactions" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "company_id" INTEGER NOT NULL,
                "type" TEXT NOT NULL,
                "method" TEXT DEFAULT 'CASH',
                "amount" REAL NOT NULL,
                "category" TEXT DEFAULT 'Diğer',
                "description" TEXT,
                "frequency" TEXT DEFAULT 'MONTHLY',
                "next_run_date" DATETIME NOT NULL,
                "is_active" INTEGER DEFAULT 1,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "recurring_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "salaries" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "employee_id" INTEGER NOT NULL,
                "period" TEXT NOT NULL,
                "base_salary" REAL DEFAULT 0,
                "bonus" REAL DEFAULT 0,
                "deduction" REAL DEFAULT 0,
                "net_salary" REAL DEFAULT 0,
                "payment_date" DATETIME,
                "status" TEXT DEFAULT 'pending',
                "notes" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "salaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "works" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "company_id" INTEGER NOT NULL,
                "vehicle_id" INTEGER,
                "employee_id" INTEGER,
                "customer" TEXT,
                "title" TEXT NOT NULL,
                "description" TEXT,
                "status" TEXT DEFAULT 'pending',
                "price" REAL DEFAULT 0,
                "location" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "start_date" DATETIME,
                "end_date" DATETIME,
                CONSTRAINT "works_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "works_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "works_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "work_items" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "work_id" INTEGER NOT NULL,
                "date" DATETIME NOT NULL,
                "receipt_no" TEXT,
                "vehicle_id" INTEGER,
                "employee_id" INTEGER,
                "start_time" TEXT,
                "end_time" TEXT,
                "hours" REAL DEFAULT 0,
                "overtime_hours" REAL DEFAULT 0,
                "unit_price" REAL DEFAULT 0,
                "total_price" REAL DEFAULT 0,
                "description" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "work_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "work_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "work_items_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`,
            `CREATE TABLE IF NOT EXISTS "customers" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "company_id" INTEGER NOT NULL,
                "name" TEXT NOT NULL,
                "phone" TEXT,
                "email" TEXT,
                "address" TEXT,
                "tax_number" TEXT,
                "tax_office" TEXT,
                "notes" TEXT,
                "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )`
        ];

        for (const sql of newTablesSQL) {
            await p.$executeRawUnsafe(sql);
        }

        // 4. Add customer_id to works (for existing DBs that already have works table)
        const wCols = await p.$queryRawUnsafe("PRAGMA table_info('works')");
        if (wCols.length > 0 && !wCols.some(c => c.name === 'customer_id')) {
            await p.$executeRawUnsafe('ALTER TABLE works ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL');
            log.info('Migration: Added customer_id to works');
        }

        // 5. Add receipt_no to work_items (for existing DBs)
        const wiCols = await p.$queryRawUnsafe("PRAGMA table_info('work_items')");
        if (wiCols.length > 0 && !wiCols.some(c => c.name === 'receipt_no')) {
            await p.$executeRawUnsafe('ALTER TABLE work_items ADD COLUMN receipt_no TEXT');
            log.info('Migration: Added receipt_no to work_items');
        }

        log.info('Auto-migrations loop completed.');
    } catch (error) {
        log.error('Auto-migration error:', error.message);
    }
}

module.exports = { getPrismaClient, runAutoMigrations };

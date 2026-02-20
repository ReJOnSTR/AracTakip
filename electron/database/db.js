
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null

function getDbPath() {
    const userDataPath = app.getPath('userData')
    const dataDir = path.join(userDataPath, 'data')

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
    }

    return path.join(dataDir, 'aractakip.db')
}

// ============ HELPERS ============

function checkDb() {
    if (!db) throw new Error('Database not initialized')
}

function runQuery(query, params = []) {
    checkDb()
    return db.prepare(query).all(params)
}

function runQueryOne(query, params = []) {
    checkDb()
    return db.prepare(query).get(params)
}

function runExec(query, params = []) {
    checkDb()
    return db.prepare(query).run(params)
}

function getDb() {
    checkDb()
    return db
}

const helpers = { runQuery, runQueryOne, runExec, getDb }

// ============ SCHEMA ============

const createTables = [
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        must_change_password INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        km INTEGER,
        cost REAL DEFAULT 0,
        file_path TEXT,
        tax_number TEXT,
        address TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        plate TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        year INTEGER,
        color TEXT,
        status TEXT DEFAULT 'active',
        km INTEGER DEFAULT 0,
        image TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS maintenances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        cost REAL DEFAULT 0,
        next_km INTEGER,
        next_date DATE,
        notes TEXT,
        file_path TEXT,
        is_archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        type TEXT DEFAULT 'traffic',
        inspection_date DATE NOT NULL,
        next_inspection DATE,
        result TEXT,
        cost REAL DEFAULT 0,
        notes TEXT,
        file_path TEXT,
        is_archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS insurances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        company TEXT NOT NULL,
        policy_no TEXT,
        type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        premium REAL DEFAULT 0,
        notes TEXT,
        file_path TEXT,
        is_archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        assigned_to TEXT,
        department TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        notes TEXT,
        is_archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        service_name TEXT,
        description TEXT,
        date DATE NOT NULL,
        km INTEGER,
        cost REAL DEFAULT 0,
        notes TEXT,
        file_path TEXT,
        is_archived INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        related_type TEXT,
        related_id INTEGER,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
]

// ============ MIGRATION VERSIONING ============

function getAppliedMigrations() {
    try {
        return runQuery('SELECT version FROM schema_migrations ORDER BY version').map(r => r.version)
    } catch (e) {
        return []
    }
}

function markMigrationApplied(version) {
    runExec('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)', [version])
}

const addColumn = (table, column, definition) => {
    try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run()
    } catch (e) {
        // Column already exists — fine
    }
}

const migrations = [
    {
        version: 1,
        description: 'Add is_archived to operation tables',
        run: () => {
            const tables = ['maintenances', 'inspections', 'insurances', 'assignments', 'services']
            tables.forEach(table => addColumn(table, 'is_archived', 'INTEGER DEFAULT 0'))
        }
    },
    {
        version: 2,
        description: 'Assignments: add item_name, quantity',
        run: () => {
            addColumn('assignments', 'item_name', 'TEXT')
            try {
                db.prepare("UPDATE assignments SET item_name = 'Bilinmeyen Demirbaş' WHERE item_name IS NULL").run()
            } catch (e) { }
            addColumn('assignments', 'quantity', 'INTEGER DEFAULT 1')
        }
    },
    {
        version: 3,
        description: 'Services: add service_name, description, km, cost, file_path',
        run: () => {
            addColumn('services', 'service_name', 'TEXT')
            addColumn('services', 'description', 'TEXT')
            addColumn('services', 'km', 'INTEGER')
            addColumn('services', 'cost', 'REAL DEFAULT 0')
            addColumn('services', 'file_path', 'TEXT')
        }
    },
    {
        version: 4,
        description: 'Document management: add file_path columns',
        run: () => {
            addColumn('maintenances', 'file_path', 'TEXT')
            addColumn('insurances', 'file_path', 'TEXT')
            addColumn('inspections', 'file_path', 'TEXT')
        }
    },
    {
        version: 5,
        description: 'Vehicles: add km, image',
        run: () => {
            addColumn('vehicles', 'km', 'INTEGER DEFAULT 0')
            addColumn('vehicles', 'image', 'TEXT')
        }
    },
    {
        version: 6,
        description: 'KM backfill from services/maintenances',
        run: () => {
            try {
                db.prepare(`
                    UPDATE vehicles 
                    SET km = (
                        SELECT MAX(mx) FROM (
                            SELECT MAX(km) as mx FROM services WHERE vehicle_id = vehicles.id
                            UNION
                            SELECT MAX(next_km - 10000) as mx FROM maintenances WHERE vehicle_id = vehicles.id
                        )
                    )
                    WHERE km = 0 OR km IS NULL
                `).run()
            } catch (e) { }
        }
    },
    {
        version: 7,
        description: 'Inspections: add type column',
        run: () => {
            addColumn('inspections', 'type', "TEXT DEFAULT 'traffic'")
        }
    },
    {
        version: 8,
        description: 'Users: add must_change_password column',
        run: () => {
            addColumn('users', 'must_change_password', 'INTEGER DEFAULT 0')
        }
    }
]

function migrateDatabase() {
    const applied = getAppliedMigrations()

    for (const migration of migrations) {
        if (!applied.includes(migration.version)) {
            console.log(`Running migration v${migration.version}: ${migration.description}`)
            migration.run()
            markMigrationApplied(migration.version)
        }
    }
}

// ============ INITIALIZATION ============

function initializeDatabase() {
    const dbPath = getDbPath()
    console.log('Initializing database at:', dbPath)

    try {
        db = new Database(dbPath)
        db.pragma('journal_mode = WAL')

        createTables.forEach(sql => db.exec(sql))

        // Run versioned migrations
        migrateDatabase()

        // Create indexes
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id)`,
            `CREATE INDEX IF NOT EXISTS idx_maintenances_vehicle ON maintenances(vehicle_id)`,
            `CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id)`,
            `CREATE INDEX IF NOT EXISTS idx_insurances_vehicle ON insurances(vehicle_id)`,
            `CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON assignments(vehicle_id)`,
            `CREATE INDEX IF NOT EXISTS idx_services_vehicle ON services(vehicle_id)`
        ]
        indexes.forEach(sql => db.exec(sql))

        // Default admin user
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
        if (userCount.count === 0) {
            console.log('Creates default admin user...')
            const passwordHash = bcrypt.hashSync('123456', 10)
            const info = db.prepare('INSERT INTO users (username, email, password_hash, must_change_password) VALUES (?, ?, ?, ?)').run('admin', 'admin@muayen.com', passwordHash, 1)

            db.prepare('INSERT INTO companies (user_id, name, address) VALUES (?, ?, ?)').run(info.lastInsertRowid, 'Muayen Demo Şirketi', 'İstanbul, Türkiye')
            console.log('Default admin user created: admin / 123456 (must change password on first login)')
        }

        console.log('Database initialized successfully.')
        return db
    } catch (error) {
        console.error('Database initialization failed:', error)
        throw error
    }
}

// ============ LOAD MODULES ============

const authMod = require('./auth')(helpers)
const companiesMod = require('./companies')(helpers)
const vehiclesMod = require('./vehicles')(helpers)
const maintenancesMod = require('./maintenances')(helpers)
const inspectionsMod = require('./inspections')(helpers)
const insurancesMod = require('./insurances')(helpers)
const assignmentsMod = require('./assignments')(helpers)
const servicesMod = require('./services')(helpers)
const dashboardMod = require('./dashboard')(helpers)
const documentsMod = require('./documents')(helpers)

const entityModules = {
    vehicles: vehiclesMod,
    maintenances: maintenancesMod,
    inspections: inspectionsMod,
    insurances: insurancesMod,
    assignments: assignmentsMod,
    services: servicesMod,
    documents: documentsMod
}

const importExportMod = require('./import-export')(helpers, entityModules)

// ============ EXPORT ============

module.exports = {
    initializeDatabase,
    ...authMod,
    ...companiesMod,
    ...vehiclesMod,
    ...maintenancesMod,
    ...inspectionsMod,
    ...insurancesMod,
    ...assignmentsMod,
    ...servicesMod,
    ...dashboardMod,
    ...documentsMod,
    ...importExportMod
}


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

function initializeDatabase() {
    const dbPath = getDbPath()
    console.log('Initializing database at:', dbPath)

    try {
        db = new Database(dbPath, {
            // verbose: console.log // Uncomment for debugging
        })

        // Performance optimization
        db.pragma('journal_mode = WAL');

        // Create tables
        const createTables = [
            `CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
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
            );`
        ]

        createTables.forEach(sql => db.exec(sql))

        // Migrations
        migrateDatabase()

        // Indexes
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

        // Check if users exist, if not create default admin
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
        if (userCount.count === 0) {
            console.log('Creates default admin user...')
            const passwordHash = bcrypt.hashSync('123456', 10)
            const info = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('admin', 'admin@muayen.com', passwordHash)

            // Create default company
            db.prepare('INSERT INTO companies (user_id, name, address) VALUES (?, ?, ?)').run(info.lastInsertRowid, 'Muayen Demo Şirketi', 'İstanbul, Türkiye')
            console.log('Default admin user created: admin / 123456')
        }

        console.log('Database initialized successfully.')
        return db
    } catch (error) {
        console.error('Database initialization failed:', error)
        throw error
    }
}

function migrateDatabase() {
    // Migration helpers
    const addColumn = (table, column, definition) => {
        try {
            db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run()
        } catch (e) {
            // Better-sqlite3 throws if column exists, which is fine
        }
    }

    // Add is_archived column to operation tables
    const tables = ['maintenances', 'inspections', 'insurances', 'assignments', 'services']
    tables.forEach(table => {
        addColumn(table, 'is_archived', 'INTEGER DEFAULT 0')
    })

    // Other migrations...

    // Assignments Migrations
    addColumn('assignments', 'item_name', 'TEXT')
    // Update old records if any
    try {
        db.prepare("UPDATE assignments SET item_name = 'Bilinmeyen Demirbaş' WHERE item_name IS NULL").run()
    } catch (e) { }

    addColumn('assignments', 'quantity', 'INTEGER DEFAULT 1')

    // Services Migrations
    addColumn('services', 'service_name', 'TEXT')
    addColumn('services', 'description', 'TEXT')
    addColumn('services', 'km', 'INTEGER')
    addColumn('services', 'cost', 'REAL DEFAULT 0')
    addColumn('services', 'file_path', 'TEXT')

    // Document Management Migrations
    addColumn('maintenances', 'file_path', 'TEXT')
    addColumn('insurances', 'file_path', 'TEXT')
    addColumn('inspections', 'file_path', 'TEXT')

    // Vehicles Migrations
    addColumn('vehicles', 'km', 'INTEGER DEFAULT 0')
    addColumn('vehicles', 'image', 'TEXT')

    // KM Backfill
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

    // Inspections Migrations
    addColumn('inspections', 'type', "TEXT DEFAULT 'traffic'")
}

// Helpers
function runQuery(query, params = []) {
    return db.prepare(query).all(params)
}

function runQueryOne(query, params = []) {
    return db.prepare(query).get(params)
}

function runExec(query, params = []) {
    return db.prepare(query).run(params)
}

function getLastInsertId() {
    // In better-sqlite3, run() returns { lastInsertRowid }
    // But since our runExec returns the whole info object or we should adapt helpers.
    // Let's adapt runExec to return the info object instead of a wrapper.
    // However, existing code relies on runExec calling saveDatabase (no longer needed for WAL)
    // and potentially returning changed rows.

    // Better-Sqlite3 .run() returns: { changes: number, lastInsertRowid: number | bigint }
    // We don't need a separate query for ID.
    throw new Error("getLastInsertId is deprecated with better-sqlite3. Use returned info.lastInsertRowid from runExec")
}

// Refactored Executors that match better-sqlite3 patterns
// Updating all functions to use the new pattern

// ============ AUTH ============

function registerUser({ username, email, password }) {
    try {
        const existingUser = runQueryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username])
        if (existingUser) {
            return { success: false, error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor' }
        }

        const passwordHash = bcrypt.hashSync(password, 10)
        const info = runExec('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash])

        return {
            success: true,
            user: { id: info.lastInsertRowid, username, email }
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function loginUser({ email, password }) {
    try {
        const user = runQueryOne('SELECT * FROM users WHERE email = ?', [email])
        if (!user) {
            return { success: false, error: 'E-posta veya şifre hatalı' }
        }

        const isValid = bcrypt.compareSync(password, user.password_hash)
        if (!isValid) {
            return { success: false, error: 'E-posta veya şifre hatalı' }
        }

        return {
            success: true,
            user: { id: user.id, username: user.username, email: user.email }
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ COMPANIES ============

function getCompanies(userId) {
    try {
        const companies = runQuery('SELECT * FROM companies WHERE user_id = ? ORDER BY name', [userId])
        return { success: true, data: companies }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function createCompany({ userId, name, taxNumber, address, phone }) {
    try {
        const info = runExec(
            'INSERT INTO companies (user_id, name, tax_number, address, phone) VALUES (?, ?, ?, ?, ?)',
            [userId, name, taxNumber, address, phone]
        )
        return { success: true, id: info.lastInsertRowid }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function updateCompany({ id, name, taxNumber, address, phone }) {
    try {
        runExec(
            'UPDATE companies SET name = ?, tax_number = ?, address = ?, phone = ? WHERE id = ?',
            [name, taxNumber, address, phone, id]
        )
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteCompany(id) {
    try {
        runExec('DELETE FROM companies WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ VEHICLES ============

function getVehicles(companyId) {
    try {
        const vehicles = runQuery('SELECT * FROM vehicles WHERE company_id = ? ORDER BY plate', [companyId])
        return { success: true, data: vehicles }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getVehicleById(vehicleId) {
    try {
        const vehicle = runQueryOne('SELECT * FROM vehicles WHERE id = ?', [vehicleId])
        return { success: true, data: vehicle }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function createVehicle({ companyId, type, plate, brand, model, year, color, status, notes, image }) {
    try {
        // Check for duplicate plate in the same company
        const existing = runQueryOne(
            'SELECT id FROM vehicles WHERE company_id = ? AND plate = ?',
            [companyId, plate]
        )

        if (existing) {
            return { success: false, error: 'Bu plaka ile kayıtlı bir araç zaten mevcut.' }
        }

        const info = runExec(
            'INSERT INTO vehicles (company_id, type, plate, brand, model, year, color, status, notes, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [companyId, type, plate, brand, model, year, color, status || 'active', notes, image]
        )
        return { success: true, id: info.lastInsertRowid }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function updateVehicle({ id, type, plate, brand, model, year, color, status, notes }) {
    try {
        runExec(
            'UPDATE vehicles SET type = ?, plate = ?, brand = ?, model = ?, year = ?, color = ?, status = ?, notes = ? WHERE id = ?',
            [type, plate, brand, model, year, color, status, notes, id]
        )
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteVehicle(id) {
    try {
        runExec('DELETE FROM vehicles WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ MAINTENANCES ============

function getMaintenances(vehicleId) {
    try {
        const data = runQuery(`
      SELECT m.*, v.plate as vehicle_plate 
      FROM maintenances m 
      JOIN vehicles v ON m.vehicle_id = v.id 
      WHERE m.vehicle_id = ? 
      ORDER BY m.date DESC
    `, [vehicleId])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getAllMaintenances(companyId, isArchived = 0) {
    try {
        const data = runQuery(`
      SELECT m.*, v.plate as vehicle_plate, v.brand, v.model
      FROM maintenances m 
      JOIN vehicles v ON m.vehicle_id = v.id 
      WHERE v.company_id = ? AND (m.is_archived = ? OR m.is_archived IS NULL)
      ORDER BY m.date DESC
    `, [companyId, isArchived])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function createMaintenance({ vehicleId, type, description, date, cost, nextKm, nextDate, notes, filePath, isArchived = 0 }) {
    try {
        const info = runExec(
            'INSERT INTO maintenances (vehicle_id, type, description, date, cost, next_km, next_date, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [vehicleId, type, description, date, cost, nextKm, nextDate, notes, filePath, isArchived]
        )
        return { success: true, id: info.lastInsertRowid }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function updateMaintenance({ id, type, description, date, cost, nextKm, nextDate, notes, filePath }) {
    try {
        runExec(
            'UPDATE maintenances SET type = ?, description = ?, date = ?, cost = ?, next_km = ?, next_date = ?, notes = ?, file_path = ? WHERE id = ?',
            [type, description, date, cost, nextKm, nextDate, notes, filePath, id]
        )
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteMaintenance(id) {
    try {
        runExec('DELETE FROM maintenances WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ INSPECTIONS ============

function getInspectionsByVehicle(vehicleId) {
    try {
        const data = runQuery('SELECT * FROM inspections WHERE vehicle_id = ? ORDER BY inspection_date DESC', [vehicleId])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getAllInspections(companyId, type = 'traffic', isArchived = 0) {
    try {
        const data = runQuery(`
            SELECT i.*, v.plate as vehicle_plate, v.brand, v.model
            FROM inspections i
            JOIN vehicles v ON i.vehicle_id = v.id
            WHERE v.company_id = ? AND (i.type = ? OR i.type IS NULL) AND COALESCE(i.is_archived, 0) = ?
            ORDER BY i.inspection_date DESC
        `, [companyId, type, isArchived])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function createInspection(data) {
    try {
        const type = data.type || 'traffic';

        // 1. Check if there is an active inspection and if it's too early to renew
        // Skip validation for imports or overrides
        if (!data.skipValidation) {
            const activeInspection = runQueryOne(
                'SELECT next_inspection FROM inspections WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0 ORDER BY inspection_date DESC LIMIT 1',
                [data.vehicleId, type]
            );

            if (activeInspection && activeInspection.next_inspection) {
                const today = new Date();
                const nextDate = new Date(activeInspection.next_inspection);
                const diffTime = nextDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 15) {
                    return {
                        success: false,
                        error: `Mevcut muayenenin süresi henüz dolmadı. Bitime 15 gün kala (Kalan süre: ${diffDays} gün) yenileme yapabilirsiniz.`
                    };
                }
            }
        }

        // 2. Archive existing active inspections
        // Only if new record is active (isArchived === 0)
        if (!data.isArchived) {
            runExec(
                'UPDATE inspections SET is_archived = 1 WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0',
                [data.vehicleId, type]
            );
        }

        // 3. Insert new record
        const info = runExec(
            'INSERT INTO inspections (vehicle_id, type, inspection_date, next_inspection, result, cost, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [data.vehicleId, type, data.inspectionDate, data.nextInspection, data.result, data.cost, data.notes, data.filePath, data.isArchived !== undefined ? data.isArchived : 0]
        )
        return { success: true, id: info.lastInsertRowid }
    } catch (error) {
        console.error('createInspection error:', error);
        return { success: false, error: error.message }
    }
}

function updateInspection({ id, inspectionDate, nextInspection, result, cost, notes, filePath }) {
    try {
        runExec(
            'UPDATE inspections SET inspection_date = ?, next_inspection = ?, result = ?, cost = ?, notes = ?, file_path = ? WHERE id = ?',
            [inspectionDate, nextInspection, result, cost, notes, filePath, id]
        )
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteInspection(id) {
    try {
        runExec('DELETE FROM inspections WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ INSURANCES ============

function getInsurances(vehicleId) {
    try {
        const data = runQuery(`
      SELECT ins.*, v.plate as vehicle_plate 
      FROM insurances ins 
      JOIN vehicles v ON ins.vehicle_id = v.id 
      WHERE ins.vehicle_id = ?
            ORDER BY ins.end_date DESC
            `, [vehicleId])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getAllInsurances(companyId, isArchived = 0) {
    try {
        const data = runQuery(`
      SELECT ins.*, v.plate as vehicle_plate, v.brand, v.model
      FROM insurances ins 
      JOIN vehicles v ON ins.vehicle_id = v.id 
      WHERE v.company_id = ? AND (ins.is_archived = ? OR ins.is_archived IS NULL)
            ORDER BY ins.end_date ASC
            `, [companyId, isArchived])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function createInsurance({ vehicleId, company, policyNo, type, startDate, endDate, premium, notes, filePath, isArchived = 0, skipValidation = false }) {
    try {
        // 1. Check if there is an active insurance and if it's too early to renew
        // Skip validation for imports
        if (!skipValidation) {
            const activeInsurance = runQueryOne(
                'SELECT end_date FROM insurances WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0 ORDER BY end_date DESC LIMIT 1',
                [vehicleId, type]
            );

            if (activeInsurance && activeInsurance.end_date) {
                const today = new Date();
                const endDateObj = new Date(activeInsurance.end_date);
                const diffTime = endDateObj - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 15) {
                    return {
                        success: false,
                        error: `Mevcut sigortanın süresi henüz dolmadı. Bitime 15 gün kala (Kalan süre: ${diffDays} gün) yenileme yapabilirsiniz.`
                    };
                }
            }
        }

        // 2. Archive existing active insurances (Only if not already archived and validation not skipped? No, business rule is about creating NEW active one archives OLD active one.)
        // If we are Importing an Archived item, we shouldn't archive others?
        // If we are Importing an Active item, we SHOULD archive others?
        // Logic: active archive update should happen if new item is Active.
        // If `isArchived` is 1, it's just history, don't touch others.
        if (isArchived === 0) {
            runExec(
                'UPDATE insurances SET is_archived = 1 WHERE vehicle_id = ? AND type = ? AND COALESCE(is_archived, 0) = 0',
                [vehicleId, type]
            )
        }

        // 3. Insert new record
        const info = runExec(
            'INSERT INTO insurances (vehicle_id, company, policy_no, type, start_date, end_date, premium, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [vehicleId, company, policyNo, type, startDate, endDate, premium, notes, filePath, isArchived]
        )
        return { success: true, id: info.lastInsertRowid }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function updateInsurance({ id, company, policyNo, type, startDate, endDate, premium, notes, filePath }) {
    try {
        runExec(
            'UPDATE insurances SET company = ?, policy_no = ?, type = ?, start_date = ?, end_date = ?, premium = ?, notes = ?, file_path = ? WHERE id = ?',
            [company, policyNo, type, startDate, endDate, premium, notes, filePath, id]
        )
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteInsurance(id) {
    try {
        runExec('DELETE FROM insurances WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ ASSIGNMENTS ============

function getAssignments(vehicleId) {
    try {
        const data = runQuery(`
      SELECT a.*, v.plate as vehicle_plate 
      FROM assignments a 
      JOIN vehicles v ON a.vehicle_id = v.id 
      WHERE a.vehicle_id = ?
            ORDER BY a.start_date DESC
            `, [vehicleId])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getAllAssignments(companyId, isArchived = 0) {
    try {
        const data = runQuery(`
      SELECT a.*, v.plate as vehicle_plate, v.brand, v.model
      FROM assignments a 
      JOIN vehicles v ON a.vehicle_id = v.id 
      WHERE v.company_id = ? AND (a.is_archived = ? OR a.is_archived IS NULL)
            ORDER BY a.start_date DESC
            `, [companyId, isArchived])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function createAssignment({ vehicleId, itemName, quantity, assignedTo, department, startDate, endDate, notes, isArchived = 0 }) {
    try {
        const info = runExec(
            'INSERT INTO assignments (vehicle_id, item_name, quantity, assigned_to, department, start_date, end_date, notes, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [vehicleId, itemName, quantity || 1, assignedTo || '', department, startDate, endDate, notes, isArchived]
        )
        return { success: true, id: info.lastInsertRowid }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function updateAssignment({ id, itemName, quantity, assignedTo, department, startDate, endDate, notes }) {
    try {
        runExec(
            'UPDATE assignments SET item_name = ?, quantity = ?, assigned_to = ?, department = ?, start_date = ?, end_date = ?, notes = ? WHERE id = ?',
            [itemName, quantity, assignedTo, department, startDate, endDate, notes, id]
        )
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteAssignment(id) {
    try {
        runExec('DELETE FROM assignments WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ SERVICES ============

function getServices(vehicleId) {
    try {
        const data = runQuery(`
      SELECT s.*, v.plate as vehicle_plate 
      FROM services s 
      JOIN vehicles v ON s.vehicle_id = v.id 
      WHERE s.vehicle_id = ?
            ORDER BY s.date DESC
            `, [vehicleId])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getAllServices(companyId, isArchived = 0) {
    try {
        const data = runQuery(`
      SELECT s.*, v.plate as vehicle_plate, v.brand, v.model
      FROM services s 
      JOIN vehicles v ON s.vehicle_id = v.id 
      WHERE v.company_id = ? AND (s.is_archived = ? OR s.is_archived IS NULL)
            ORDER BY s.date DESC
            `, [companyId, isArchived])
        return { success: true, data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function createService({ vehicleId, type, serviceName, description, date, km, cost, notes, filePath, isArchived = 0 }) {
    try {
        const info = runExec(
            'INSERT INTO services (vehicle_id, type, service_name, description, date, km, cost, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                vehicleId,
                type,
                serviceName || null,
                description || null,
                date,
                km || null,
                cost || 0,
                notes || null,
                filePath,
                isArchived
            ]
        )
        return { success: true, id: info.lastInsertRowid }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function updateService({ id, type, serviceName, description, date, km, cost, notes, filePath }) {
    try {
        runExec(
            'UPDATE services SET type = ?, service_name = ?, description = ?, date = ?, km = ?, cost = ?, notes = ?, file_path = ? WHERE id = ?',
            [
                type,
                serviceName || null,
                description || null,
                date,
                km || null,
                cost || 0,
                notes || null,
                filePath,
                id
            ]
        )
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteService(id) {
    try {
        runExec('DELETE FROM services WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ============ DASHBOARD ============

function getDashboardStats(companyId) {
    try {
        const vehicleCount = runQueryOne('SELECT COUNT(*) as count FROM vehicles WHERE company_id = ?', [companyId])
        const activeVehicles = runQueryOne("SELECT COUNT(*) as count FROM vehicles WHERE company_id = ? AND status = 'active'", [companyId])

        const today = new Date().toISOString().split('T')[0]
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const upcomingInspections = runQueryOne(`
      SELECT COUNT(*) as count FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      WHERE v.company_id = ? 
      AND i.next_inspection BETWEEN ? AND ?
      AND COALESCE(i.is_archived, 0) = 0
            `, [companyId, today, thirtyDaysLater])

        const expiringInsurances = runQueryOne(`
      SELECT COUNT(*) as count FROM insurances ins
      JOIN vehicles v ON ins.vehicle_id = v.id
      WHERE v.company_id = ? 
      AND ins.end_date BETWEEN ? AND ?
      AND COALESCE(ins.is_archived, 0) = 0
            `, [companyId, today, thirtyDaysLater])

        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
        const monthPattern = `${currentMonth} % `

        // Detailed Monthly Cost Breakdown
        // Using LIKE is safer for text dates in SQLite than strftime
        const costDistribution = runQueryOne(`
            SELECT
                (SELECT COALESCE(SUM(cost), 0) FROM services s JOIN vehicles v ON s.vehicle_id = v.id WHERE v.company_id = ? AND s.date LIKE ?) as service,
            (SELECT COALESCE(SUM(cost), 0) FROM maintenances m JOIN vehicles v ON m.vehicle_id = v.id WHERE v.company_id = ? AND m.date LIKE ?) as maintenance,
        (SELECT COALESCE(SUM(cost), 0) FROM inspections i JOIN vehicles v ON i.vehicle_id = v.id WHERE v.company_id = ? AND i.inspection_date LIKE ?) as inspection,
            (SELECT COALESCE(SUM(premium), 0) FROM insurances ins JOIN vehicles v ON ins.vehicle_id = v.id WHERE v.company_id = ? AND ins.start_date LIKE ?) as insurance
                `, [companyId, monthPattern, companyId, monthPattern, companyId, monthPattern, companyId, monthPattern])

        const monthlyCost = (costDistribution?.service || 0) + (costDistribution?.maintenance || 0) + (costDistribution?.inspection || 0) + (costDistribution?.insurance || 0)

        // Vehicle Status Distribution
        const statusStats = runQueryOne(`
        SELECT
        COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'passive' THEN 1 ELSE 0 END) as passive,
            SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
            FROM vehicles WHERE company_id = ?
            `, [companyId])

        // Top 5 High Mileage Vehicles
        const topVehicles = runQuery(`
            SELECT plate, brand, model, km, image 
            FROM vehicles 
            WHERE company_id = ?
            ORDER BY km DESC 
            LIMIT 5
            `, [companyId])

        return {
            success: true,
            data: {
                totalVehicles: statusStats?.total || 0,
                activeVehicles: statusStats?.active || 0,
                statusBreakdown: {
                    active: statusStats?.active || 0,
                    passive: statusStats?.passive || 0,
                    maintenance: statusStats?.maintenance || 0
                },
                upcomingInspections: upcomingInspections?.count || 0,
                expiringInsurances: expiringInsurances?.count || 0,
                monthlyCost,
                costDistribution: {
                    service: costDistribution?.service || 0,
                    maintenance: costDistribution?.maintenance || 0,
                    inspection: costDistribution?.inspection || 0,
                    insurance: costDistribution?.insurance || 0
                },
                topVehicles: Array.isArray(topVehicles) ? topVehicles : []
            }
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getUpcomingEvents(companyId) {
    try {
        const today = new Date().toISOString().split('T')[0]
        const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 60 days lookahead

        // 1. Upcoming Inspections
        const inspections = runQuery(`
        SELECT
        CASE 
                    WHEN i.type = 'periodic' THEN 'Periyodik Kontrol'
                    ELSE 'Muayene'
        END as type,
            v.plate,
            v.brand,
            v.model,
            i.next_inspection as date
            FROM inspections i
            JOIN vehicles v ON i.vehicle_id = v.id
            WHERE v.company_id = ? 
            AND i.next_inspection IS NOT NULL 
            AND i.next_inspection <= ?
            AND COALESCE(i.is_archived, 0) = 0
            ORDER BY i.next_inspection ASC
            LIMIT 20
            `, [companyId, maxDate])

        // 2. Expiring Insurances
        const insurances = runQuery(`
        SELECT
        'Sigorta' as type,
            v.plate,
            v.brand,
            v.model,
            ins.end_date as date
            FROM insurances ins
            JOIN vehicles v ON ins.vehicle_id = v.id
            WHERE v.company_id = ? 
            AND ins.end_date IS NOT NULL 
            AND ins.end_date <= ?
            AND COALESCE(ins.is_archived, 0) = 0
            ORDER BY ins.end_date ASC
            LIMIT 20
            `, [companyId, maxDate])

        // 3. Maintenance Due (Based on Date)
        const maintenances = runQuery(`
        SELECT
        'Bakım' as type,
            v.plate,
            v.brand,
            v.model,
            m.next_date as date
            FROM maintenances m
            JOIN vehicles v ON m.vehicle_id = v.id
            WHERE v.company_id = ? AND m.next_date IS NOT NULL AND m.next_date <= ?
            ORDER BY m.next_date ASC
            LIMIT 20
            `, [companyId, maxDate])

        // Combine and Sort
        let allEvents = [...inspections, ...insurances, ...maintenances]

        // Filter invalid dates and calculate days left
        let calculatedEvents = []
        for (const event of allEvents) {
            if (!event.date) continue

            const evtDate = new Date(event.date)
            const todayDate = new Date(today)

            if (isNaN(evtDate.getTime())) continue

            const daysLeft = Math.ceil((evtDate - todayDate) / (1000 * 60 * 60 * 24))

            // Explicitly exclude events further than 60 days
            if (daysLeft > 60) continue

            calculatedEvents.push({ ...event, days_left: daysLeft })
        }

        // Sort by days left
        calculatedEvents.sort((a, b) => a.days_left - b.days_left)

        return { success: true, data: calculatedEvents.slice(0, 50) }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getRecentActivity(companyId) {
    try {
        // Collect latest activities from all tables
        // Since we don't have a centralized activity log, we'll query latest entries from each table

        // Services
        const services = runQuery(`
            SELECT 'Service' as type, s.date as date, v.plate, 'Servis Kaydı' as description, s.cost
            FROM services s JOIN vehicles v ON s.vehicle_id = v.id
            WHERE v.company_id = ? ORDER BY s.created_at DESC LIMIT 5
            `, [companyId])

        // Maintenances
        const maintenances = runQuery(`
            SELECT 'Maintenance' as type, m.date as date, v.plate, 'Bakım Kaydı' as description, m.cost
            FROM maintenances m JOIN vehicles v ON m.vehicle_id = v.id
            WHERE v.company_id = ? ORDER BY m.created_at DESC LIMIT 5
            `, [companyId])

        // Assignments
        const assignments = runQuery(`
            SELECT 'Assignment' as type, a.start_date as date, v.plate, 'Zimmet Ataması' as description, 0 as cost
            FROM assignments a JOIN vehicles v ON a.vehicle_id = v.id
            WHERE v.company_id = ? ORDER BY a.created_at DESC LIMIT 5
        `, [companyId])

        let activities = [...services, ...maintenances, ...assignments]

        // Sort by date/created_at roughly (using date field here simplistically)
        // Sort by date/created_at roughly (using date field here simplistically)
        activities.sort((a, b) => {
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)
            if (isNaN(dateA.getTime())) return 1
            if (isNaN(dateB.getTime())) return -1
            return dateB - dateA
        })

        return { success: true, data: activities.slice(0, 5) }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Data Management
function getCompanyCompleteData(companyId) {
    try {
        const company = runQueryOne('SELECT * FROM companies WHERE id = ?', [companyId])
        if (!company) return { success: false, error: 'Company not found' }

        const vehicles = getVehicles(companyId).data || []

        // Get ALL documents for file collection
        const allDocuments = getDocumentsByCompany(companyId).data || []

        // Helper to filter docs from memory (avoid N+1 queries if possible, or just use queries)
        // Since we have allDocuments, let's filter!
        const getDocs = (type, id) => allDocuments.filter(d => d.related_type === type && d.related_id === id)

        // Enhance vehicles with their sub-data
        const detailedVehicles = vehicles.map(v => {
            const maintenances = (getMaintenances(v.id).data || []).map(m => ({ ...m, documents: getDocs('maintenance', m.id) }))
            const inspections = (getInspectionsByVehicle(v.id).data || []).map(i => ({ ...i, documents: getDocs('periodic_inspection', i.id) }))
            const insurances = (getInsurances(v.id).data || []).map(ins => ({ ...ins, documents: getDocs('insurance', ins.id) }))
            const assignments = (getAssignments(v.id).data || []).map(a => ({ ...a, documents: getDocs('assignment', a.id) }))
            const services = (getServices(v.id).data || []).map(s => ({ ...s, documents: getDocs('service', s.id) }))
            const vehicleDocs = getDocs('vehicle', v.id) || []

            return {
                ...v,
                documents: vehicleDocs,
                maintenances,
                inspections,
                insurances,
                assignments,
                services
            }
        })

        return {
            success: true,
            data: {
                company,
                vehicles: detailedVehicles,
                allDocuments, // For Main.js to find files
                exportedAt: new Date().toISOString(),
                version: '1.1' // Version bump for zip support
            }
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function importCompanyData(userId, backupData) {
    try {
        if (!backupData.company || !backupData.vehicles) {
            return { success: false, error: 'Invalid backup format' }
        }

        // Helper to insert document
        const insertDoc = (vId, type, rId, d) => {
            runExec(
                'INSERT INTO documents (vehicle_id, related_type, related_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)',
                [vId, type, rId, d.file_name, d.file_path, d.file_type]
            )
        }

        // 1. Create Company
        // Append (Import) to name to distinguish
        const compInfo = runExec(
            'INSERT INTO companies (user_id, name, tax_number, address, phone) VALUES (?, ?, ?, ?, ?)',
            [userId, `${backupData.company.name} (Imported)`, backupData.company.tax_number, backupData.company.address, backupData.company.phone]
        )
        const newCompanyId = compInfo.lastInsertRowid

        // 2. Import Vehicles
        db.transaction(() => {
            for (const v of backupData.vehicles) {
                const vInfo = runExec(
                    'INSERT INTO vehicles (company_id, type, plate, brand, model, year, color, status, notes, km, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newCompanyId, v.type, v.plate, v.brand, v.model, v.year, v.color, v.status, v.notes, v.km, v.image]
                )
                const newVehicleId = vInfo.lastInsertRowid

                // Vehicle Documents
                if (v.documents) {
                    for (const d of v.documents) insertDoc(newVehicleId, 'vehicle', newVehicleId, d)
                }

                // Sub-tables
                // IMPORTANT: Map snake_case (DB/Export) to camelCase (Function Arguments)
                if (v.maintenances) {
                    for (const m of v.maintenances) {
                        const mInfo = createMaintenance({
                            vehicleId: newVehicleId,
                            type: m.type,
                            description: m.description,
                            date: m.date,
                            cost: m.cost,
                            nextKm: m.next_km,
                            nextDate: m.next_date,
                            notes: m.notes,
                            isArchived: m.is_archived // Pass archived status
                        })
                        // Insert docs using new ID (mInfo.id? createMaintenance returns {success, id}?)
                        // Need to verify createMaintenance return value. Assuming it returns {success:true, id: ...}
                        // Looking at Step 8784: createMaintenance is exported.
                        // I will assume it returns ID. If not, I should check createMaintenance implementation.
                        // Wait, previous code loop (Step 8750) called `createMaintenance` but ignored result?
                        // "createMaintenance({...})". Yes.
                        // I need the ID to link documents!
                        // I must modify createMaintenance to return ID if it doesn't.
                        // Wait, Step 8750 shows:
                        /*
                        createMaintenance({ ... })
                        */
                        // It didn't capture return.
                        // Let's check `createMaintenance` implementation in db.js if I can see it.
                        // It is in older context. Assuming it follows pattern: returns {success, id}.

                        if (mInfo.success && m.documents) {
                            for (const d of m.documents) insertDoc(newVehicleId, 'maintenance', mInfo.id, d)
                        }
                    }
                }
                if (v.inspections) {
                    for (const i of v.inspections) {
                        const iInfo = createInspection({
                            vehicleId: newVehicleId,
                            type: i.type,
                            inspectionDate: i.inspection_date,
                            nextInspection: i.next_inspection,
                            result: i.result,
                            cost: i.cost,
                            notes: i.notes,
                            skipValidation: true, // Force import
                            isArchived: i.is_archived // Pass archived status
                        })
                        if (iInfo.success && i.documents) {
                            for (const d of i.documents) insertDoc(newVehicleId, 'periodic_inspection', iInfo.id, d)
                        }
                    }
                }
                if (v.insurances) {
                    for (const ins of v.insurances) {
                        const insInfo = createInsurance({
                            vehicleId: newVehicleId,
                            company: ins.company,
                            policyNo: ins.policy_no,
                            type: ins.type,
                            startDate: ins.start_date,
                            endDate: ins.end_date,
                            premium: ins.premium,
                            notes: ins.notes,
                            skipValidation: true, // Force import
                            isArchived: ins.is_archived // Pass archived status
                        })
                        if (insInfo.success && ins.documents) {
                            for (const d of ins.documents) insertDoc(newVehicleId, 'insurance', insInfo.id, d)
                        }
                    }
                }
                if (v.assignments) {
                    for (const a of v.assignments) {
                        const aInfo = createAssignment({
                            vehicleId: newVehicleId,
                            itemName: a.item_name,
                            quantity: a.quantity,
                            assignedTo: a.assigned_to,
                            department: a.department,
                            startDate: a.start_date,
                            endDate: a.end_date,
                            notes: a.notes,
                            isArchived: a.is_archived // Pass archived status
                        })
                        if (aInfo.success && a.documents) {
                            for (const d of a.documents) insertDoc(newVehicleId, 'assignment', aInfo.id, d)
                        }
                    }
                }
                if (v.services) {
                    for (const s of v.services) {
                        const sInfo = createService({
                            vehicleId: newVehicleId,
                            type: s.type,
                            serviceName: s.service_name,
                            description: s.description,
                            date: s.date,
                            km: s.km,
                            cost: s.cost,
                            notes: s.notes,
                            isArchived: s.is_archived // Pass archived status
                        })
                        if (sInfo.success && s.documents) {
                            for (const d of s.documents) insertDoc(newVehicleId, 'service', sInfo.id, d)
                        }
                    }
                }
            }
        })()

        return { success: true, companyId: newCompanyId }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Archive Management
function archiveItem(table, id, isArchived = 1) {
    try {
        runExec(`UPDATE ${table} SET is_archived = ? WHERE id = ?`, [isArchived, id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Document Management
function addDocument(data) {
    try {
        const result = runExec(
            'INSERT INTO documents (vehicle_id, related_type, related_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)',
            [data.vehicleId, data.relatedType, data.relatedId, data.fileName, data.filePath, data.fileType]
        )
        return { success: true, id: result.lastInsertRowid }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getDocument(id) {
    try {
        const doc = runQuery('SELECT * FROM documents WHERE id = ?', [id])
        return { success: true, data: doc[0] }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getDocumentsByVehicle(vehicleId) {
    try {
        const docs = runQuery(
            'SELECT * FROM documents WHERE vehicle_id = ? ORDER BY created_at DESC',
            [vehicleId]
        )
        return { success: true, data: docs }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getDocumentsByCompany(companyId) {
    try {
        const docs = runQuery(
            'SELECT d.* FROM documents d JOIN vehicles v ON d.vehicle_id = v.id WHERE v.company_id = ? ORDER BY d.created_at DESC',
            [companyId]
        )
        return { success: true, data: docs }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function deleteDocument(id) {
    try {
        runExec('DELETE FROM documents WHERE id = ?', [id])
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function getDocumentsByRelatedId(type, id) {
    try {
        const docs = runQuery(
            'SELECT * FROM documents WHERE related_type = ? AND related_id = ? ORDER BY created_at DESC',
            [type, id]
        )
        return { success: true, data: docs }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

module.exports = {
    initializeDatabase,
    registerUser,
    loginUser,
    getCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getMaintenances,
    getAllMaintenances,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    getInspections: getInspectionsByVehicle,
    getAllInspections,
    createInspection,
    updateInspection,
    deleteInspection,
    getInsurances,
    getAllInsurances,
    createInsurance,
    updateInsurance,
    deleteInsurance,
    getAssignments,
    getAllAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    getServices,
    getAllServices,
    createService,
    updateService,
    deleteService,
    getDashboardStats,
    getUpcomingEvents,
    getRecentActivity,
    getCompanyCompleteData,
    importCompanyData,
    archiveItem,
    addDocument,
    getDocument,
    getDocumentsByVehicle,
    getDocumentsByCompany,
    deleteDocument,
    getDocumentsByRelatedId
}

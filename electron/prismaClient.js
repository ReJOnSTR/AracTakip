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
            'services', 'transactions', 'vehicles', 'works', 'employee_documents'
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

    // 2b. Users: role, must_change_password (missing in older versions)
    try {
        const uCols = await p.$queryRawUnsafe("PRAGMA table_info('users')");
        if (uCols.length > 0) {
            if (!uCols.some(c => c.name === 'role')) {
                await p.$executeRawUnsafe("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
                log.info('Migration: Added role to users');
            }
            if (!uCols.some(c => c.name === 'must_change_password')) {
                await p.$executeRawUnsafe("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
                log.info('Migration: Added must_change_password to users');
            }
        }
    } catch (error) {
        log.error('Migration step 2b (users) error:', error.message);
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

    // 10. Employee Assignments: serial_number, assign_date (sync with schema)
    try {
        const eaCols = await p.$queryRawUnsafe("PRAGMA table_info('employee_assignments')");
        if (eaCols.length > 0) {
            if (!eaCols.some(c => c.name === 'serial_number')) {
                await p.$executeRawUnsafe('ALTER TABLE employee_assignments ADD COLUMN serial_number TEXT');
                log.info('Migration: Added serial_number to employee_assignments');
            }
            if (!eaCols.some(c => c.name === 'assign_date')) {
                // If assigned_date exists but assign_date does not, we should ideally rename or add it.
                // SQLite doesn't support easy renames on older versions, so we just add assign_date.
                await p.$executeRawUnsafe('ALTER TABLE employee_assignments ADD COLUMN assign_date DATETIME');
                log.info('Migration: Added assign_date to employee_assignments');
                
                // Copy data if assigned_date exists
                if (eaCols.some(c => c.name === 'assigned_date')) {
                    await p.$executeRawUnsafe('UPDATE employee_assignments SET assign_date = assigned_date');
                    log.info('Migration: Copied assigned_date to assign_date');
                }
            }
        }
    } catch (error) {
        log.error('Migration step 10 (employee_assignments) error:', error.message);
    }

    // 11. Employee Documents: issue_date, expiry_date
    try {
        const edCols = await p.$queryRawUnsafe("PRAGMA table_info('employee_documents')");
        if (edCols.length > 0) {
            if (!edCols.some(c => c.name === 'issue_date')) {
                await p.$executeRawUnsafe('ALTER TABLE employee_documents ADD COLUMN issue_date DATETIME');
                log.info('Migration: Added issue_date to employee_documents');
            }
            if (!edCols.some(c => c.name === 'expiry_date')) {
                await p.$executeRawUnsafe('ALTER TABLE employee_documents ADD COLUMN expiry_date DATETIME');
                log.info('Migration: Added expiry_date to employee_documents');
            }
            if (!edCols.some(c => c.name === 'start_date')) {
                await p.$executeRawUnsafe('ALTER TABLE employee_documents ADD COLUMN start_date DATETIME');
                log.info('Migration: Added start_date to employee_documents');
            }
        }
    } catch (error) {
        log.error('Migration step 11 (employee_documents) error:', error.message);
    }

    // 11b. Companies: signature_path, stamp_path (for existing DBs) - must run before Step 12
    try {
        const cCols = await p.$queryRawUnsafe("PRAGMA table_info('companies')");
        if (cCols.length > 0) {
            if (!cCols.some(c => c.name === 'signature_path')) {
                await p.$executeRawUnsafe('ALTER TABLE companies ADD COLUMN signature_path TEXT');
                log.info('Migration: Added signature_path to companies');
            }
            if (!cCols.some(c => c.name === 'stamp_path')) {
                await p.$executeRawUnsafe('ALTER TABLE companies ADD COLUMN stamp_path TEXT');
                log.info('Migration: Added stamp_path to companies');
            }
        }
    } catch (error) {
        log.error('Migration step 11b (signature/stamp columns) error:', error.message);
    }

    // 12. Seed Default Personnel Settings for all companies
    try {
        const companies = await p.companies.findMany();
        const defaultDepts = ['Yönetim', 'Operasyon', 'Muhasebe', 'İnsan Kaynakları', 'Lojistik', 'Teknik', 'Satış', 'Diğer'];
        const defaultLeaveTypes = [
            'Yıllık Ücretli İzin', 
            'Ücretsiz İzin', 
            'Hastalık / Rapor (İstirahat)', 
            'Mazeret İzni', 
            'Evlilik İzni', 
            'Ölüm İzni', 
            'Doğum / Analık İzni', 
            'Babalık İzni', 
            'Süt İzni', 
            'İdari İzin', 
            'Mesai İzni (Mahsup)', 
            'Diğer'
        ];
        const defaultDocCats = ['Ehliyet', 'SRC Belgesi', 'Psikoteknik', 'İş Sözleşmesi', 'Kimlik Fotokopisi', 'Adli Sicil Kaydı', 'Sağlık Raporu', 'İkametgah', 'Diploma', 'Sertifika / Belge', 'Diğer'];

        for (const company of companies) {
            if (p.departments) {
                const existingDepts = await p.departments.findMany({ where: { company_id: company.id } });
                const existingDeptNames = existingDepts.map(d => d.name.toLowerCase());
                
                for (const name of defaultDepts) {
                    if (!existingDeptNames.includes(name.toLowerCase())) {
                        await p.departments.create({ data: { company_id: company.id, name } });
                        log.info(`Seeding: Added default department "${name}" for company ${company.id}`);
                    }
                }
            }

            if (p.leave_types) {
                const existingTypes = await p.leave_types.findMany({ where: { company_id: company.id } });
                const existingNames = existingTypes.map(t => t.name.toLowerCase());
                
                for (const name of defaultLeaveTypes) {
                    if (!existingNames.includes(name.toLowerCase())) {
                        await p.leave_types.create({ data: { company_id: company.id, name } });
                        log.info(`Seeding: Added official leave type "${name}" for company ${company.id}`);
                    }
                }
            }

            if (p.document_categories) {
                const docCount = await p.document_categories.count({ where: { company_id: company.id } });
                if (docCount === 0) {
                    for (const name of defaultDocCats) {
                        await p.document_categories.create({ data: { company_id: company.id, name } });
                    }
                    log.info(`Seeding: Added default document categories for company ${company.id}`);
                }
            }

            if (p.vehicle_types) {
                // 1. Get existing types in the settings table
                const existingTypes = await p.vehicle_types.findMany({ where: { company_id: company.id } });
                const existingNames = existingTypes.map(t => t.name.toLowerCase());
                
                // 2. Define defaults
                const defaultVehicleTypes = ['Otomobil', 'Vinç', 'Kamyon', 'Minibüs', 'Pikap', 'Forklift', 'Ekskavatör', 'Diğer'];
                
                // 3. Collect types currently used by actual vehicles in this company
                const usedTypesRes = await p.vehicles.groupBy({
                    by: ['type'],
                    where: { company_id: company.id }
                });
                const usedTypes = usedTypesRes.map(ut => {
                    // Try to map English keys back to Turkish labels for the settings table
                    const mapping = {
                        'automobile': 'Otomobil',
                        'crane': 'Vinç',
                        'truck': 'Kamyon',
                        'van': 'Minibüs',
                        'pickup': 'Pikap',
                        'forklift': 'Forklift',
                        'excavator': 'Ekskavatör',
                        'other': 'Diğer'
                    };
                    return mapping[ut.type] || ut.type;
                });

                // Combine defaults and used types
                const allToSeed = [...new Set([...defaultVehicleTypes, ...usedTypes])];

                for (const name of allToSeed) {
                    if (name && !existingNames.includes(name.toLowerCase())) {
                        await p.vehicle_types.create({ data: { company_id: company.id, name } });
                        log.info(`Seeding: Added vehicle type "${name}" for company ${company.id}`);
                    }
                }
            }
        }
    } catch (error) {
        log.error('Migration step 12 (seeding settings) error:', error.message);
    }

    // 13. Migrate legacy data labels to new Turkish names
    try {
        log.info('Migrating legacy data labels...');
        // Leaves
        await p.$executeRawUnsafe("UPDATE leaves SET type = 'Yıllık İzin' WHERE type = 'annual'");
        await p.$executeRawUnsafe("UPDATE leaves SET type = 'Hastalık / Rapor' WHERE type = 'sick'");
        await p.$executeRawUnsafe("UPDATE leaves SET type = 'Ücretsiz İzin' WHERE type = 'unpaid'");
        await p.$executeRawUnsafe("UPDATE leaves SET type = 'Mazeret İzni' WHERE type = 'excuse'");
        await p.$executeRawUnsafe("UPDATE leaves SET type = 'Mesai İzni' WHERE type = 'overtime_leave'");
        await p.$executeRawUnsafe("UPDATE leaves SET type = 'Mahsup' WHERE type = 'offset'");
        await p.$executeRawUnsafe("UPDATE leaves SET type = 'Diğer' WHERE type = 'other'");

        // Document Categories
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Ehliyet' WHERE category = 'ehliyet'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'SRC Belgesi' WHERE category = 'src'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Psikoteknik' WHERE category = 'psikoteknik'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'İş Sözleşmesi' WHERE category = 'sozlesme'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Kimlik Fotokopisi' WHERE category = 'kimlik'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Adli Sicil Kaydı' WHERE category = 'sabika'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Sağlık Raporu' WHERE category = 'saglik'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'İkametgah' WHERE category = 'ikametgah'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Diploma' WHERE category = 'diploma'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Sertifika / Belge' WHERE category = 'certificate'");
        await p.$executeRawUnsafe("UPDATE employee_documents SET category = 'Diğer' WHERE category = 'other'");
        
        log.info('Data label migration completed.');
    } catch (error) {
        log.error('Migration step 13 (data labels) error:', error.message);
    }

    // 14. Add work_start_time and work_end_time to works
    try {
        const wCols2 = await p.$queryRawUnsafe("PRAGMA table_info('works')");
        if (wCols2.length > 0) {
            if (!wCols2.some(c => c.name === 'work_start_time')) {
                await p.$executeRawUnsafe("ALTER TABLE works ADD COLUMN work_start_time TEXT DEFAULT '08:00'");
                log.info('Migration: Added work_start_time to works');
            }
            if (!wCols2.some(c => c.name === 'work_end_time')) {
                await p.$executeRawUnsafe("ALTER TABLE works ADD COLUMN work_end_time TEXT DEFAULT '17:00'");
                log.info('Migration: Added work_end_time to works');
            }
        }
    } catch (error) {
        log.error('Migration step 14 (work_start/end_time) error:', error.message);
    }

    // 15. Companies & Customers: tax_office, sgk_no, tax_number (Sync with schema)
    try {
        // Companies
        const cCols = await p.$queryRawUnsafe("PRAGMA table_info('companies')");
        if (cCols.length > 0) {
            if (!cCols.some(c => c.name === 'tax_office')) {
                await p.$executeRawUnsafe('ALTER TABLE companies ADD COLUMN tax_office TEXT');
                log.info('Migration: Added tax_office to companies');
            }
            if (!cCols.some(c => c.name === 'sgk_no')) {
                await p.$executeRawUnsafe('ALTER TABLE companies ADD COLUMN sgk_no TEXT');
                log.info('Migration: Added sgk_no to companies');
            }
        }

        // Customers
        const custCols = await p.$queryRawUnsafe("PRAGMA table_info('customers')");
        if (custCols.length > 0) {
            if (!custCols.some(c => c.name === 'tax_office')) {
                await p.$executeRawUnsafe('ALTER TABLE customers ADD COLUMN tax_office TEXT');
                log.info('Migration: Added tax_office to customers');
            }
            if (!custCols.some(c => c.name === 'tax_number')) {
                await p.$executeRawUnsafe('ALTER TABLE customers ADD COLUMN tax_number TEXT');
                log.info('Migration: Added tax_number to customers');
            }
        }
    } catch (error) {
        log.error('Migration step 15 (tax/sgk columns) error:', error.message);
    }

    // 16. Migrate existing vehicles to use Turkish type labels (for consistency with new dynamic types)
    try {
        log.info('Migrating vehicle types to Turkish labels...');
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Otomobil' WHERE type = 'automobile'");
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Vinç' WHERE type = 'crane'");
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Kamyon' WHERE type = 'truck'");
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Minibüs' WHERE type = 'van'");
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Pikap' WHERE type = 'pickup'");
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Forklift' WHERE type = 'forklift'");
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Ekskavatör' WHERE type = 'excavator'");
        await p.$executeRawUnsafe("UPDATE vehicles SET type = 'Diğer' WHERE type = 'other'");
        log.info('Vehicle type migration completed.');
    } catch (error) {
        log.error('Migration step 16 (vehicle types) error:', error.message);
    }

    // 17. Add iban and devir fields to employees (v1.0.163)
    try {
        const empCols = await p.$queryRawUnsafe("PRAGMA table_info('employees')");
        if (empCols.length > 0) {
            if (!empCols.some(c => c.name === 'iban')) {
                await p.$executeRawUnsafe('ALTER TABLE employees ADD COLUMN iban TEXT');
                log.info('Migration: Added iban to employees');
            }
            if (!empCols.some(c => c.name === 'devir_izin_bakiyesi')) {
                await p.$executeRawUnsafe('ALTER TABLE employees ADD COLUMN devir_izin_bakiyesi INTEGER DEFAULT 0');
                log.info('Migration: Added devir_izin_bakiyesi to employees');
            }
            if (!empCols.some(c => c.name === 'devir_maas_bakiyesi')) {
                await p.$executeRawUnsafe('ALTER TABLE employees ADD COLUMN devir_maas_bakiyesi REAL DEFAULT 0');
                log.info('Migration: Added devir_maas_bakiyesi to employees');
            }
            if (!empCols.some(c => c.name === 'devir_tarihi')) {
                await p.$executeRawUnsafe('ALTER TABLE employees ADD COLUMN devir_tarihi DATETIME');
                log.info('Migration: Added devir_tarihi to employees');
            }
        }
    } catch (error) {
        log.error('Migration step 17 (employee new fields) error:', error.message);
    }

    // 18. Fix plate numbers in arvento_history for devices with hyphenated plates
    try {
        log.info('Fixing plate numbers in arvento_history for devices with hyphenated plates...');
        await p.$executeRawUnsafe("UPDATE arvento_history SET plate = '55-09-13' WHERE device_no = 'K1200246883' AND plate = '55'");
        await p.$executeRawUnsafe("UPDATE arvento_history SET plate = '55-09-27' WHERE device_no = 'K1200246889' AND plate = '55'");
        log.info('Plate number fix completed.');
    } catch (error) {
        log.error('Migration step 18 (arvento_history plate fix) error:', error.message);
    }

    // 19. Add price_per_person to meal_tickets and backfill from meal_settings
    try {
        const mtCols = await p.$queryRawUnsafe("PRAGMA table_info('meal_tickets')");
        if (mtCols.length > 0) {
            if (!mtCols.some(c => c.name === 'price_per_person')) {
                await p.$executeRawUnsafe('ALTER TABLE meal_tickets ADD COLUMN price_per_person REAL DEFAULT 0');
                log.info('Migration: Added price_per_person to meal_tickets');
                
                // Backfill existing meal_tickets with the price_per_person from meal_settings
                const settings = await p.meal_settings.findMany();
                for (const setting of settings) {
                    await p.$executeRawUnsafe(`UPDATE meal_tickets SET price_per_person = ${setting.price_per_person} WHERE company_id = ${setting.company_id} AND price_per_person IS NULL`);
                }
                // Set default 0 for any remaining nulls
                await p.$executeRawUnsafe('UPDATE meal_tickets SET price_per_person = 0 WHERE price_per_person IS NULL');
                log.info('Migration: Backfilled price_per_person in meal_tickets');
            }
        }
    } catch (error) {
        log.error('Migration step 19 (meal_tickets price_per_person) error:', error.message);
    }

    // 20. Add pazar_multiplier and mesai_multiplier to works
    try {
        const wCols3 = await p.$queryRawUnsafe("PRAGMA table_info('works')");
        if (wCols3.length > 0) {
            if (!wCols3.some(c => c.name === 'pazar_multiplier')) {
                await p.$executeRawUnsafe('ALTER TABLE works ADD COLUMN pazar_multiplier REAL DEFAULT 1.5');
                log.info('Migration: Added pazar_multiplier to works');
            }
            if (!wCols3.some(c => c.name === 'mesai_multiplier')) {
                await p.$executeRawUnsafe('ALTER TABLE works ADD COLUMN mesai_multiplier REAL DEFAULT 1.5');
                log.info('Migration: Added mesai_multiplier to works');
            }
        }
    } catch (error) {
        log.error('Migration step 20 (works multipliers) error:', error.message);
    }

    log.info('Auto-migrations loop completed.');
}

module.exports = { getPrismaClient, runAutoMigrations };

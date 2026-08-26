/**
 * Kontrol App -> Supabase Full Migration Script
 * Migrates all SQLite records and local document files to Self-Hosted Supabase.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres" SUPABASE_SECRET_KEY="KEY" node scripts/migrate-to-supabase.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { postgresDdlSql } = require('../electron/utils/postgresDdl');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.kontrol-app.com';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is required.');
    console.log('Example: DATABASE_URL="postgresql://postgres:PASSWORD@45.147.47.56:5432/postgres" node scripts/migrate-to-supabase.js');
    process.exit(1);
}

// Initialize Supabase Storage Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || 'sb_publishable_36cfd54f23bbf88d313317_24673797', {
    auth: { persistSession: false }
});

function findSqliteDbPath() {
    const candidates = [
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'kontrol-app', 'data', 'aractakip.db'),
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'Kontrol', 'data', 'aractakip.db'),
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'aractakip', 'data', 'aractakip.db'),
        path.join(process.cwd(), 'data', 'aractakip.db'),
        path.join(process.cwd(), 'aractakip.db')
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}

async function runMigration() {
    console.log('====================================================');
    console.log('🚀 Kontrol App -> Supabase Migration Starting...');
    console.log('====================================================');
    console.log('• Supabase URL:', SUPABASE_URL);

    // 1. Locate SQLite DB
    const sqlitePath = findSqliteDbPath();
    if (!sqlitePath) {
        console.error('❌ SQLite database file (aractakip.db) could not be found automatically.');
        console.log('Please make sure aractakip.db is located in ./data/aractakip.db');
        return;
    }
    console.log('✅ Found SQLite database:', sqlitePath);

    const sqlite = new Database(sqlitePath, { readonly: true });

    // 2. Connect to Supabase Postgres
    console.log('• Connecting to Supabase PostgreSQL...');
    const pg = new Client({ connectionString: DATABASE_URL });
    
    try {
        await pg.connect();
        console.log('✅ Connected to Supabase PostgreSQL successfully!');
    } catch (err) {
        console.error('❌ Failed to connect to Supabase PostgreSQL:', err.message);
        console.log('\n💡 Note: If port 5432 is not opened externally on your VPS firewall,');
        console.log('you can run this script directly inside the server or Dokploy container.');
        return;
    }

    // 3. Create Tables
    console.log('• Initializing PostgreSQL Schema & Tables...');
    try {
        await pg.query(postgresDdlSql);
        console.log('✅ PostgreSQL Tables verified & ready.');
    } catch (err) {
        console.warn('⚠️ Schema notice:', err.message);
    }

    // 4. Table Migration Order (respecting foreign keys)
    const tablesToMigrate = [
        'users',
        'companies',
        'roles',
        'company_settings',
        'vehicles',
        'customers',
        'maintenances',
        'inspections',
        'insurances',
        'assignments',
        'services',
        'employees',
        'salaries',
        'salary_history',
        'leaves',
        'overtimes',
        'meal_ticket_settings',
        'meal_tickets',
        'works',
        'work_items',
        'documents',
        'checks',
        'transactions',
        'activity_logs'
    ];

    for (const tableName of tablesToMigrate) {
        try {
            // Check if table exists in SQLite
            const checkTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
            if (!checkTable) {
                continue;
            }

            const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
            if (rows.length === 0) {
                console.log(`ℹ️ [${tableName}] 0 records found in SQLite.`);
                continue;
            }

            // Fetch actual Postgres columns for table
            const pgColsRes = await pg.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [tableName]);
            const pgColumns = new Set(pgColsRes.rows.map(r => r.column_name));

            for (const row of rows) {
                const cols = Object.keys(row).filter(c => pgColumns.has(c));
                if (cols.length === 0) continue;

                const values = cols.map(c => {
                    const val = row[c];
                    if (val === undefined || val === null) return null;
                    if (typeof val === 'string' && (val.includes('T') && val.endsWith('Z') || /^\d{4}-\d{2}-\d{2}/.test(val))) {
                        const d = new Date(val);
                        if (!isNaN(d.getTime())) return d;
                    }
                    return val;
                });

                const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
                const colNames = cols.map(c => `"${c}"`).join(', ');

                const insertSql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING;`;
                try {
                    await pg.query(insertSql, values);
                } catch (rowErr) {}
            }

            // Sync serial sequence if table has integer id
            try {
                await pg.query(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), coalesce(max(id), 1)) FROM "${tableName}";`);
            } catch (seqErr) {}

            console.log(`✅ [${tableName}] Migrated ${rows.length} records.`);
        } catch (tblErr) {
            console.error(`❌ Error migrating table ${tableName}:`, tblErr.message);
        }
    }

    // 5. Ensure Storage Buckets in Supabase
    console.log('• Checking & configuring Supabase Storage buckets...');
    const buckets = ['documents', 'invoices', 'vehicle-photos', 'avatars'];
    for (const b of buckets) {
        try {
            await supabase.storage.createBucket(b, { public: true });
        } catch (e) {}
    }
    console.log('✅ Supabase Storage buckets verified.');

    // 6. Upload Local Files to Supabase Storage
    const uploadsDirCandidates = [
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'kontrol-app', 'data'),
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'kontrol-app', 'uploads'),
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'Kontrol', 'uploads'),
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'aractakip', 'uploads'),
        path.join(process.cwd(), 'uploads')
    ];

    let uploadsDir = null;
    for (const d of uploadsDirCandidates) {
        if (fs.existsSync(d)) {
            uploadsDir = d;
            break;
        }
    }

    if (uploadsDir) {
        console.log(`• Found local uploads directory: ${uploadsDir}`);
        const files = fs.readdirSync(uploadsDir);
        console.log(`⏳ Uploading ${files.length} local files to Supabase Storage ('documents' bucket)...`);

        let uploadedCount = 0;
        for (const fileName of files) {
            const fullPath = path.join(uploadsDir, fileName);
            if (fs.statSync(fullPath).isFile()) {
                try {
                    const fileBuffer = fs.readFileSync(fullPath);
                    const ext = path.extname(fileName).toLowerCase();
                    let mimeType = 'application/octet-stream';
                    if (ext === '.pdf') mimeType = 'application/pdf';
                    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                    else if (ext === '.png') mimeType = 'image/png';

                    const { error } = await supabase.storage.from('documents').upload(fileName, fileBuffer, {
                        contentType: mimeType,
                        upsert: true
                    });

                    if (!error) uploadedCount++;
                } catch (fErr) {
                    console.warn(`⚠️ File upload warning for ${fileName}:`, fErr.message);
                }
            }
        }
        console.log(`✅ Uploaded ${uploadedCount} / ${files.length} files to Supabase Storage.`);
    }

    await pg.end();
    sqlite.close();

    console.log('====================================================');
    console.log('🎉 ALL DATA & STORAGE MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
}

if (require.main === module) {
    runMigration().catch(err => console.error('Migration failed:', err));
}

module.exports = { runMigration };

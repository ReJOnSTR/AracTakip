const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'Library/Application Support/muayen/data/aractakip.db');
console.log('Opening DB:', dbPath);
const db = new Database(dbPath);

function runQuery(sql, params = []) {
    return db.prepare(sql).all(...params);
}

try {
    const users = runQuery('SELECT id, username, email, role FROM users');
    console.log('--- Users ---');
    console.log(users);

    const companies = runQuery('SELECT id, user_id, name FROM companies');
    console.log('\n--- Companies ---');
    console.log(companies);

    const tables = ['transactions', 'works', 'customers', 'meal_tickets'];
    for (const t of tables) {
        console.log(`\n--- ${t} counts by company_id ---`);
        try {
            const counts = runQuery(`SELECT company_id, COUNT(*) as count FROM ${t} GROUP BY company_id`);
            console.log(counts);
        } catch (e) {
            console.log(`Error reading table ${t}:`, e.message);
        }
    }

    // Also look at some sample records
    for (const t of tables) {
        console.log(`\n--- Sample ${t} ---`);
        try {
            const samples = runQuery(`SELECT * FROM ${t} LIMIT 2`);
            console.log(samples);
        } catch (e) {
            console.log(`Error reading sample ${t}:`, e.message);
        }
    }
} catch (error) {
    console.error('Diagnostic error:', error);
} finally {
    db.close();
}

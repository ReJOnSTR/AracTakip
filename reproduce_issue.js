const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Path to DB
const dbPath = path.join(os.homedir(), 'Library/Application Support/muayen/data/aractakip.db');
console.log('Opening DB:', dbPath);
const db = new Database(dbPath);

// Helper to run query
function runQuery(sql, params = []) {
    return db.prepare(sql).all(...params);
}

// Helper to run exec
function runExec(sql, params = []) {
    return db.prepare(sql).run(...params);
}

// 1. Create a dummy vehicle if not exists
let vehicleId = 9999;
try {
    const info = runExec('INSERT INTO vehicles (company_id, plate, brand, model, type) VALUES (1, "TEST-999", "TestBrand", "TestModel", "truck")');
    vehicleId = info.lastInsertRowid;
    console.log('Created test vehicle:', vehicleId);
} catch (e) {
    console.log('Using existing test vehicle or error:', e.message);
}

// 2. Clear inspections for this vehicle
runExec('DELETE FROM inspections WHERE vehicle_id = ?', [vehicleId]);
console.log('Cleared inspections for vehicle.');

// 3. Create FIRST inspection (should be Active)
const type = 'periodic';
console.log(' Creating 1st inspection...');
runExec(
    'INSERT INTO inspections (vehicle_id, type, inspection_date, next_inspection, result, cost, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [vehicleId, type, '2024-01-01', '2025-01-01', 'Pass', 100, 'First', '', 0] // Explicit 0, like createInspection uses BEFORE update
);

// Verify 1st
let rows = runQuery('SELECT id, type, is_archived FROM inspections WHERE vehicle_id = ?', [vehicleId]);
console.log('After 1st insert:', rows);

// 4. Simulate createInspection logic for SECOND inspection
console.log(' Creating 2nd inspection (simulation)...');

// A. Update existing
console.log('Running UPDATE...');
const updateInfo = runExec(
    'UPDATE inspections SET is_archived = 1 WHERE vehicle_id = ? AND type = ? AND (is_archived = 0 OR is_archived IS NULL)',
    [vehicleId, type]
);
console.log('Update info:', updateInfo);

// B. Insert new
console.log('Running INSERT...');
const insertInfo = runExec(
    'INSERT INTO inspections (vehicle_id, type, inspection_date, next_inspection, result, cost, notes, file_path, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [vehicleId, type, '2024-06-01', '2025-06-01', 'Pass', 200, 'Second', '', 0]
);
console.log('Insert info:', insertInfo);

// 5. Verify Final State
rows = runQuery('SELECT id, type, is_archived, notes FROM inspections WHERE vehicle_id = ? ORDER BY id', [vehicleId]);
console.log('FINAL STATE:', rows);

// Cleanup
// runExec('DELETE FROM vehicles WHERE id = ?', [vehicleId]);

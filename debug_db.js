const { app } = require('electron')
const path = require('path')
// Mocking app.getPath for the db script to work standalone if possible, 
// strictly speaking we need to run this via electron.
// But we can just use the db directly if we know the path.
const Database = require('better-sqlite3')
const dbPath = path.join(process.env.HOME, 'Library/Application Support/muayen/data/aractakip.db')

try {
    const db = new Database(dbPath)
    const vehicles = db.prepare('SELECT * FROM vehicles LIMIT 1').all()
    console.log('Vehicles:', vehicles)
} catch (e) {
    console.error(e)
}
process.exit(0)

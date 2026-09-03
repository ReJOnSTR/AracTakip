const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
db.exec('INSERT INTO test (name) VALUES ("Ahmet")');
db.exec('ALTER TABLE test ADD COLUMN is_archived INTEGER DEFAULT 0');
const rows = db.prepare('SELECT * FROM test').all();
console.log(rows);
